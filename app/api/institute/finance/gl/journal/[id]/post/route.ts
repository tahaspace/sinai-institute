import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { postEntry } from '@/lib/finance/ledger';

// Post a DRAFT journal entry → POSTED (maker-checker: finance.gl.journal.post = CFO-level).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('finance.gl.journal.post');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    try {
      const res = await postEntry(id, userId);
      return NextResponse.json({ ok: true, ...res });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error posting journal entry:', e);
    return NextResponse.json({ error: 'فشل في ترحيل القيد' }, { status: 500 });
  }
}
