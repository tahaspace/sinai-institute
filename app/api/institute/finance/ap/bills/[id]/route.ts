import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { approveBill, payBill } from '@/lib/finance/ap';

// POST { action: 'approve' | 'pay' } — maker-checker on a vendor bill (finance.expense.approve).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('finance.expense.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    try {
      const res = body?.action === 'pay' ? await payBill(id, { paidById: uid, bankCode: body.bankCode }) : await approveBill(id, uid);
      return NextResponse.json({ ok: true, ...res });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error on bill action:', e);
    return NextResponse.json({ error: 'فشل تنفيذ الإجراء' }, { status: 500 });
  }
}
