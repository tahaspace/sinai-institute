import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { createDraftEntry } from '@/lib/finance/ledger';

// Journal entries (Finance v2 — Phase 1). GET lists recent entries; POST creates a balanced DRAFT.

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.gl.journal.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const status = new URL(request.url).searchParams.get('status') || undefined;
    const entries = await prisma.journalEntry.findMany({
      where: { universityId: guard.ctx.universityId ?? null, ...(status ? { status } : {}) },
      include: { lines: { include: { account: true } }, period: true },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id, entryNo: e.entryNo, entryDate: e.entryDate, memo: e.memo,
        sourceType: e.sourceType, status: e.status, period: e.period.code,
        debit: Number(e.lines.reduce((s, l) => s + Number(l.debit), 0).toFixed(2)),
        lines: e.lines.map((l) => ({ account: `${l.account.code} ${l.account.nameAr}`, debit: Number(Number(l.debit).toFixed(2)), credit: Number(Number(l.credit).toFixed(2)), memo: l.memo })),
      })),
    });
  } catch (e) {
    console.error('Error listing journal:', e);
    return NextResponse.json({ error: 'فشل في جلب القيود' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.gl.journal.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    const body = await request.json();
    const { entryDate, memo, lines } = body ?? {};
    if (!Array.isArray(lines) || lines.length < 2) return NextResponse.json({ error: 'القيد يحتاج سطرين على الأقل' }, { status: 400 });

    // resolve account ids (accept accountId or accountCode)
    const resolved: { accountId: string; debit: number; credit: number; memo?: string }[] = [];
    for (const l of lines) {
      let accountId: string | undefined = l.accountId;
      if (!accountId && l.accountCode) {
        const acc = await prisma.chartOfAccount.findFirst({ where: { universityId: guard.ctx.universityId ?? null, code: l.accountCode } });
        if (!acc) return NextResponse.json({ error: `حساب غير موجود: ${l.accountCode}` }, { status: 400 });
        if (!acc.isPostable) return NextResponse.json({ error: `الحساب ${l.accountCode} تجميعي ولا يقبل الترحيل` }, { status: 422 });
        accountId = acc.id;
      }
      if (!accountId) return NextResponse.json({ error: 'سطر بلا حساب' }, { status: 400 });
      resolved.push({ accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: l.memo });
    }

    try {
      const res = await createDraftEntry({
        universityId: guard.ctx.universityId ?? null,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        memo: memo ?? null,
        lines: resolved,
        createdById: userId,
      });
      return NextResponse.json({ ok: true, id: res.id }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error creating journal entry:', e);
    return NextResponse.json({ error: 'فشل في إنشاء القيد' }, { status: 500 });
  }
}
