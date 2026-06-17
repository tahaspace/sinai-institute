import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { submitDocument, cancelDocument } from '@/lib/finance/eta/client';
import { canonicalPayload } from '@/lib/finance/eta/document';

// GET — preview the canonical ETA payload. POST { action:'submit'|'cancel' }.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('finance.einvoice.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    try {
      return NextResponse.json({ payload: await canonicalPayload(id) });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 404 });
    }
  } catch (e) {
    console.error('Error previewing e-invoice:', e);
    return NextResponse.json({ error: 'فشل في عرض المستند' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => ({}));
    const isCancel = body?.action === 'cancel';
    const guard = await requirePermission(isCancel ? 'finance.einvoice.cancel' : 'finance.einvoice.submit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    try {
      const res = isCancel ? await cancelDocument(id) : await submitDocument(id);
      return NextResponse.json({ ok: true, ...res });
    } catch (err) {
      // "not configured" → 503 so the UI shows the activation message rather than a hard error.
      const msg = (err as Error).message;
      const status = msg.includes('غير مُهيأة') ? 503 : 422;
      return NextResponse.json({ error: msg }, { status });
    }
  } catch (e) {
    console.error('Error e-invoice action:', e);
    return NextResponse.json({ error: 'فشل تنفيذ الإجراء' }, { status: 500 });
  }
}
