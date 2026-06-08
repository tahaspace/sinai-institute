import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/finance — institute-wide financial summary over FeeAccount/Payment.
export async function GET() {
  try {
    const guard = await requirePermission('finance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const accounts = await prisma.feeAccount.findMany({
      include: { payments: true, student: { include: { department: true } } },
    });

    const totalDues = accounts.reduce((s, a) => s + a.totalFees, 0);
    const collected = accounts.reduce(
      (s, a) => s + a.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0),
      0
    );
    const remaining = totalDues - collected;
    const collectionRate = totalDues > 0 ? Math.round((collected / totalDues) * 100) : 0;

    // Department collection breakdown
    const byDept = new Map<string, { name: string; collected: number; total: number }>();
    for (const a of accounts) {
      const name = a.student.department?.nameAr ?? 'غير محدد';
      const b = byDept.get(name) ?? { name, collected: 0, total: 0 };
      b.total += a.totalFees;
      b.collected += a.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0);
      byDept.set(name, b);
    }

    // Recent transactions (latest paid payments across all accounts)
    const txns = accounts
      .flatMap((a) =>
        a.payments
          .filter((p) => p.status === 'paid')
          .map((p) => ({
            id: p.id,
            student: a.student.nameAr,
            type: 'دفع',
            amount: p.amount,
            date: (p.paidAt ?? p.createdAt).toISOString().slice(0, 10),
            method: p.method ?? '-',
          }))
      )
      .sort((x, y) => y.date.localeCompare(x.date))
      .slice(0, 10);

    const scholarships = await prisma.scholarship.findMany({ where: { status: 'ACTIVE' } });

    return NextResponse.json({
      stats: {
        totalDues,
        collected,
        remaining,
        collectionRate,
        scholarshipsCount: scholarships.length,
        scholarshipsTotal: scholarships.reduce((s, x) => s + x.amount, 0),
      },
      recentTransactions: txns,
      departmentCollection: [...byDept.values()].sort((a, b) => b.total - a.total),
    });
  } catch (error) {
    console.error('Error building finance summary:', error);
    return NextResponse.json({ error: 'فشل في جلب البيانات المالية' }, { status: 500 });
  }
}
