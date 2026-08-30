import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { approveAdjustmentBatch, cancelAdjustmentBatch } from '@/lib/rafaa';

// GET /api/institute/grade-adjustments/[id] — batch detail (review / print).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('gradeadjust.view');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { id } = await params;
  const batch = await prisma.gradeAdjustmentBatch.findUnique({ where: { id }, include: { items: { orderBy: { studentCode: 'asc' } } } });
  if (!batch) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
  return NextResponse.json({ batch });
}

// PATCH /api/institute/grade-adjustments/[id] — { action: 'approve' | 'cancel' }.
//   approve = اعتماد الكنترول (gradeadjust.approve, persists grace); cancel rolls back.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const uid = await currentUserId();

    if (action === 'approve') {
      const guard = await requirePermission('gradeadjust.approve');
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
      const r = await approveAdjustmentBatch(id, uid);
      if (!r) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
      return NextResponse.json({ ok: true, status: r.status });
    }
    if (action === 'cancel') {
      const guard = await requirePermission('gradeadjust.apply');
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
      const r = await cancelAdjustmentBatch(id);
      if (!r) return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
      return NextResponse.json({ ok: true, status: r.status });
    }
    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 422 });
  }
}
