import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { fundTransfer, reconcile, accountBalance } from '@/lib/finance/treasury';

// Treasury (Finance v2 — Phase 7): cash/bank balances, transfers, summary reconciliation.
export async function GET() {
  try {
    const guard = await requirePermission('banking.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uni = guard.ctx.universityId ?? null;
    const accounts = await prisma.chartOfAccount.findMany({ where: { universityId: uni, code: { startsWith: '12' }, isPostable: true }, orderBy: { code: 'asc' } });
    const balances = await Promise.all(accounts.map(async (a) => ({ code: a.code, name: a.nameAr, balance: Number((await accountBalance(uni, a.code)).toFixed(2)) })));
    const [transfers, recs] = await Promise.all([
      prisma.fundTransfer.findMany({ where: { universityId: uni }, orderBy: { transferDate: 'desc' }, take: 50 }),
      prisma.bankReconciliation.findMany({ where: { universityId: uni }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    return NextResponse.json({
      accounts: balances,
      transfers: transfers.map((t) => ({ number: t.number, from: t.fromAccountCode, to: t.toAccountCode, amount: Number(t.amount.toFixed(2)), date: t.transferDate, memo: t.memo })),
      reconciliations: recs.map((r) => ({ account: r.accountCode, statementDate: r.statementDate, statementBalance: Number(r.statementBalance.toFixed(2)), glBalance: Number(r.glBalance.toFixed(2)), difference: Number(r.difference.toFixed(2)), status: r.status })),
    });
  } catch (e) {
    console.error('Error loading treasury:', e);
    return NextResponse.json({ error: 'فشل في جلب بيانات الخزينة' }, { status: 500 });
  }
}

// POST { action:'transfer', fromAccountCode, toAccountCode, amount, memo? } | { action:'reconcile', accountCode, statementDate, statementBalance, note? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const permKey = body?.action === 'reconcile' ? 'banking.reconciliation.edit' : 'banking.edit';
    const guard = await requirePermission(permKey);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    const uni = guard.ctx.universityId ?? null;
    try {
      if (body.action === 'reconcile') {
        if (!body.accountCode || body.statementBalance == null) return NextResponse.json({ error: 'الحساب والرصيد مطلوبان' }, { status: 400 });
        const res = await reconcile({ universityId: uni, accountCode: body.accountCode, statementDate: body.statementDate ? new Date(body.statementDate) : new Date(), statementBalance: body.statementBalance, note: body.note, createdById: uid });
        return NextResponse.json({ ok: true, ...res });
      }
      if (!body.fromAccountCode || !body.toAccountCode || !body.amount) return NextResponse.json({ error: 'الحسابات والمبلغ مطلوبة' }, { status: 400 });
      const res = await fundTransfer({ universityId: uni, fromAccountCode: body.fromAccountCode, toAccountCode: body.toAccountCode, amount: body.amount, memo: body.memo, createdById: uid });
      return NextResponse.json({ ok: true, ...res }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error treasury action:', e);
    return NextResponse.json({ error: 'فشل تنفيذ الإجراء' }, { status: 500 });
  }
}
