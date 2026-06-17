import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { approvePayRun, payPayRun } from '@/lib/finance/payroll';

// POST { action: 'approve' | 'pay' } — maker-checker on a pay run (payroll.approve).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('payroll.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    try {
      const res = body?.action === 'pay' ? await payPayRun(id, { paidById: uid, bankCode: body.bankCode }) : await approvePayRun(id, uid);
      return NextResponse.json({ ok: true, ...res });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error on pay run action:', e);
    return NextResponse.json({ error: 'فشل تنفيذ الإجراء' }, { status: 500 });
  }
}
