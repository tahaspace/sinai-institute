import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/banking — treasury accounts + recent transactions.
export async function GET() {
  try {
    const guard = await requirePermission('banking.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [accounts, txns] = await Promise.all([
      prisma.bankAccount.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.bankTransaction.findMany({ include: { account: true }, orderBy: { date: 'desc' }, take: 20 }),
    ]);

    return NextResponse.json({
      bankAccounts: accounts.map((a) => ({
        id: a.id,
        bankName: a.bankName,
        accountNo: a.accountNo,
        accountType: a.accountType,
        balance: a.balance,
        lastUpdated: a.updatedAt.toISOString().slice(0, 10),
      })),
      recentTransactions: txns.map((t) => ({
        id: t.id,
        date: t.date.toISOString().slice(0, 10),
        description: t.description,
        type: t.type,
        amount: t.amount,
        bank: t.account.bankName,
        reference: t.reference ?? '',
      })),
      stats: {
        totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
        accounts: accounts.length,
        credits: txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
        debits: txns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
      },
    });
  } catch (error) {
    console.error('Error building banking:', error);
    return NextResponse.json({ error: 'فشل في جلب البيانات البنكية' }, { status: 500 });
  }
}
