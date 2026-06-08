import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/admin/accountant — read-only financial summary for the accountant dashboard.
export async function GET() {
  try {
    const guard = await requirePermission('finance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const accounts = await prisma.feeAccount.findMany({ include: { payments: true } });
    const totalDues = accounts.reduce((s, a) => s + a.totalFees, 0);
    const collected = accounts.reduce(
      (s, a) => s + a.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0),
      0
    );
    const pendingPayments = await prisma.payment.count({ where: { status: { not: 'paid' } } });

    return NextResponse.json({
      totalDues,
      collected,
      remaining: totalDues - collected,
      collectionRate: totalDues > 0 ? Math.round((collected / totalDues) * 100) : 0,
      pendingPayments,
    });
  } catch (error) {
    console.error('Error building accountant summary:', error);
    return NextResponse.json({ error: 'فشل في جلب البيانات المالية' }, { status: 500 });
  }
}
