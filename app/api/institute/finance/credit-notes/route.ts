import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { issueCreditNote } from '@/lib/finance/billing';

// POST { invoiceId, amount, reason? } — issue a credit note (Dr revenue / Cr AR).
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.creditnote.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (!body?.invoiceId || !body?.amount) return NextResponse.json({ error: 'الفاتورة والمبلغ مطلوبان' }, { status: 400 });
    try {
      const res = await issueCreditNote({ universityId: guard.ctx.universityId ?? null, invoiceId: body.invoiceId, amount: body.amount, reason: body.reason, createdById: uid });
      return NextResponse.json({ ok: true, ...res }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error issuing credit note:', e);
    return NextResponse.json({ error: 'فشل في إصدار إشعار الدائن' }, { status: 500 });
  }
}
