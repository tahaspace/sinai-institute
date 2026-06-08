import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveParentStudents } from '@/lib/student';

// GET /api/parent/fees — per-child fee detail for the logged-in parent.
export async function GET() {
  try {
    const students = await resolveParentStudents();

    const childrenFees = await Promise.all(
      students.map(async (s) => {
        const account = await prisma.feeAccount.findFirst({
          where: { studentId: s.id },
          include: { items: true, payments: { orderBy: { dueDate: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        });
        const paid = account?.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0) ?? 0;
        const total = account?.totalFees ?? 0;
        const nextDue = account?.payments
          .filter((p) => p.status !== 'paid' && p.dueDate)
          .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0];
        return {
          id: s.id,
          name: s.nameAr,
          studentCode: s.studentCode,
          total,
          paid,
          remaining: total - paid,
          nextDueDate: nextDue?.dueDate ? nextDue.dueDate.toISOString().slice(0, 10) : null,
          items: account?.items.map((i) => ({ label: i.label, amount: i.amount })) ?? [],
          payments:
            account?.payments.map((p) => ({
              date: (p.paidAt ?? p.dueDate)?.toISOString().slice(0, 10) ?? null,
              amount: p.amount,
              method: p.method ?? '-',
              status: p.status,
            })) ?? [],
        };
      })
    );

    return NextResponse.json({ childrenFees });
  } catch (error) {
    console.error('Error fetching parent fees:', error);
    return NextResponse.json({ error: 'فشل في جلب المصروفات' }, { status: 500 });
  }
}
