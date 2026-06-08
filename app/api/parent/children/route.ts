import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveParentStudents } from '@/lib/student';

// GET /api/parent/children — the children linked to the logged-in parent,
// each with a summary (GPA, attendance %, fee balance) drawn from shared data.
export async function GET() {
  try {
    const students = await resolveParentStudents();

    const children = await Promise.all(
      students.map(async (s) => {
        const [attendance, account] = await Promise.all([
          prisma.attendance.findMany({ where: { studentId: s.id } }),
          prisma.feeAccount.findFirst({
            where: { studentId: s.id },
            include: { payments: true },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        const total = attendance.length;
        const present = attendance.filter((a) => a.status === 'present').length;
        const late = attendance.filter((a) => a.status === 'late').length;
        const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        const paid = account?.payments.filter((p) => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0) ?? 0;
        const totalFees = account?.totalFees ?? 0;

        return {
          id: s.id,
          studentCode: s.studentCode,
          name: s.nameAr,
          level: s.level,
          gpa: s.gpa,
          attendance: attendancePct,
          fees: { total: totalFees, paid, remaining: totalFees - paid },
        };
      })
    );

    return NextResponse.json({ children });
  } catch (error) {
    console.error('Error fetching parent children:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الأبناء' }, { status: 500 });
  }
}
