import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { approveBatch, executeBatch } from '@/lib/promotion';

// GET /api/institute/promotion/[id] — batch detail (approval summary + print/export source).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('student.promote');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const batch = await prisma.promotionBatch.findUnique({ where: { id }, include: { items: { orderBy: { studentCode: 'asc' } } } });
  if (!batch) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
  return NextResponse.json({
    batch,
    summary: {
      eligible: batch.items.filter((i) => i.action === 'PROMOTE' || i.action === 'GRADUATE').length,
      ineligible: batch.items.filter((i) => i.action === 'STAY' || i.action === 'SKIP').map((i) => ({ studentCode: i.studentCode, name: i.studentName, reason: i.reason })),
    },
  });
}

// PATCH /api/institute/promotion/[id] — { action: 'approve' | 'execute' }.
//   approve → promotion.approve (manager); execute → student.promote (requires APPROVED, then locks).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const uid = await currentUserId();

    if (action === 'approve') {
      const guard = await requirePermission('promotion.approve');
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
      const r = await approveBatch(id, uid);
      if (!r) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
      return NextResponse.json({ ok: true, status: r.status });
    }
    if (action === 'execute') {
      const guard = await requirePermission('student.promote');
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
      const r = await executeBatch(id, uid);
      if (!r) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
      return NextResponse.json({ ok: true, status: r.batch.status, promoted: r.promoted });
    }
    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}
