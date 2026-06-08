import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveParentStudents } from '@/lib/student';

// GET /api/parent/dashboard — overview of the parent's children + fee summary + notifications.
export async function GET() {
  try {
    const students = await resolveParentStudents();

    const children = await Promise.all(
      students.map(async (s) => {
        const [attendance, account, warnings] = await Promise.all([
          prisma.attendance.findMany({ where: { studentId: s.id } }),
          prisma.feeAccount.findFirst({ where: { studentId: s.id }, include: { payments: true }, orderBy: { createdAt: 'desc' } }),
          prisma.studentWarning.count({ where: { studentId: s.id, status: 'ACTIVE' } }),
        ]);
        const total = attendance.length;
        const present = attendance.filter((a) => a.status === 'present').length;
        const late = attendance.filter((a) => a.status === 'late').length;
        const paid = account?.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0) ?? 0;
        const totalFees = account?.totalFees ?? 0;
        return {
          id: s.id,
          name: s.nameAr,
          studentCode: s.studentCode,
          gpa: s.gpa,
          attendance: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
          activeWarnings: warnings,
          fees: { total: totalFees, paid, remaining: totalFees - paid },
        };
      })
    );

    const feesSummary = {
      totalDue: children.reduce((s, c) => s + c.fees.total, 0),
      totalPaid: children.reduce((s, c) => s + c.fees.paid, 0),
      remaining: children.reduce((s, c) => s + c.fees.remaining, 0),
    };

    // Notifications derived from the children's shared data (no separate table).
    const notifications = [
      ...children
        .filter((c) => c.fees.remaining > 0)
        .map((c) => ({ id: `fee-${c.id}`, type: 'fee', message: `مستحقات مالية على ${c.name}: ${c.fees.remaining.toLocaleString()} ج.م`, time: '' })),
      ...children
        .filter((c) => c.activeWarnings > 0)
        .map((c) => ({ id: `warn-${c.id}`, type: 'warning', message: `إنذار أكاديمي على ${c.name}`, time: '' })),
    ].slice(0, 5);

    return NextResponse.json({ children, feesSummary, notifications });
  } catch (error) {
    console.error('Error fetching parent dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب لوحة التحكم' }, { status: 500 });
  }
}
