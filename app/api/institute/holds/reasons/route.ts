import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// Configurable hold reasons (إعدادات الحجب — سبب الحجب). View = hold.view; edits = hold.config.

export async function GET() {
  try {
    const guard = await requirePermission('hold.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const reasons = await prisma.holdReason.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json({ reasons });
  } catch (error) {
    console.error('Error listing hold reasons:', error);
    return NextResponse.json({ error: 'فشل في جلب أسباب الحجب' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hold.config');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json().catch(() => ({}));
    if (!body.nameAr) return NextResponse.json({ error: 'اسم السبب مطلوب' }, { status: 400 });
    const code = String(body.code || body.nameAr).trim();
    const reason = await prisma.holdReason.create({
      data: {
        code, nameAr: body.nameAr, nameEn: body.nameEn ?? null,
        defaultType: body.defaultType ?? 'ADMINISTRATIVE',
        active: body.active ?? true, order: body.order ?? 0,
        universityId: guard.ctx.universityId,
      },
    });
    return NextResponse.json(reason, { status: 201 });
  } catch (error) {
    console.error('Error creating hold reason:', error);
    return NextResponse.json({ error: 'فشل في إضافة سبب الحجب' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('hold.config');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json().catch(() => ({}));
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    const reason = await prisma.holdReason.update({ where: { id }, data });
    return NextResponse.json(reason);
  } catch (error) {
    console.error('Error updating hold reason:', error);
    return NextResponse.json({ error: 'فشل في تحديث سبب الحجب' }, { status: 500 });
  }
}

// Soft-delete: deactivate (holds may still reference the reason for reporting).
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requirePermission('hold.config');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    await prisma.holdReason.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting hold reason:', error);
    return NextResponse.json({ error: 'فشل في حذف سبب الحجب' }, { status: 500 });
  }
}
