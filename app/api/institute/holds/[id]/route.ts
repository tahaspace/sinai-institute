import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { releaseHold, cancelHold, approveHold } from '@/lib/holds';

// PATCH /api/institute/holds/[id] — body { action: 'release' | 'cancel' | 'approve', reason? }
//   release  → obligation met (تفعيل الطالب)   [hold.release]
//   cancel   → placed in error                 [hold.cancel]
//   approve  → PENDING → ACTIVE (Override)      [hold.override]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const uid = await currentUserId();

    if (action === 'release') {
      const guard = await requirePermission('hold.release');
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
      const r = await releaseHold(id, { releasedById: uid, reason: body.reason ?? null, source: 'MANUAL' });
      if (!r) return NextResponse.json({ error: 'الحجب غير موجود' }, { status: 404 });
      return NextResponse.json({ ok: true, status: r.status });
    }
    if (action === 'cancel') {
      const guard = await requirePermission('hold.cancel');
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
      const r = await cancelHold(id, { actorUserId: uid, reason: body.reason ?? null });
      if (!r) return NextResponse.json({ error: 'الحجب غير موجود' }, { status: 404 });
      return NextResponse.json({ ok: true, status: r.status });
    }
    if (action === 'approve') {
      const guard = await requirePermission('hold.override');
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
      const r = await approveHold(id, uid);
      if (!r) return NextResponse.json({ error: 'الحجب غير موجود' }, { status: 404 });
      return NextResponse.json({ ok: true, status: r.status });
    }
    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Error updating hold:', error);
    return NextResponse.json({ error: 'فشل في تحديث الحجب' }, { status: 500 });
  }
}
