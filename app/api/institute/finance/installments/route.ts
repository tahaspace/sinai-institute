import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/finance/installments — installment plans derived from FeeAccount/Payment.
export async function GET() {
  try {
    const guard = await requirePermission('finance.installment.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const accounts = await prisma.feeAccount.findMany({
      include: { payments: true, student: true },
      orderBy: { createdAt: 'desc' },
    });

    const plans = accounts.map((a) => {
      const paidPayments = a.payments.filter((p) => p.status === 'paid');
      const paid = paidPayments.reduce((s, p) => s + p.amount, 0);
      const nextDue = a.payments
        .filter((p) => p.status !== 'paid' && p.dueDate)
        .sort((x, y) => x.dueDate!.getTime() - y.dueDate!.getTime())[0];
      return {
        id: a.id,
        student: a.student.nameAr,
        studentCode: a.student.studentCode,
        totalFees: a.totalFees,
        installments: a.installments,
        paidInstallments: paidPayments.length,
        paid,
        remaining: a.totalFees - paid,
        nextDueDate: nextDue?.dueDate ? nextDue.dueDate.toISOString().slice(0, 10) : null,
        status: a.totalFees - paid <= 0 ? 'مكتمل' : 'جاري',
      };
    });

    const stats = {
      total: plans.length,
      completed: plans.filter((p) => p.remaining <= 0).length,
      active: plans.filter((p) => p.remaining > 0).length,
      outstanding: plans.reduce((s, p) => s + p.remaining, 0),
    };

    return NextResponse.json({ plans, stats });
  } catch (error) {
    console.error('Error building installments:', error);
    return NextResponse.json({ error: 'فشل في جلب الأقساط' }, { status: 500 });
  }
}
