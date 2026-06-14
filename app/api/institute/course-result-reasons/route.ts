import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// CourseResultReason catalogue — the configurable "why" behind a result state
// (WrittenFail / AttendanceShortage / MedicalExcuse …), used by the reason reports.
// View is allowed to anyone who can see grades; edits require the grade-config permission
// (same gate as the grade-status rules table).

const CATEGORIES = ['FAIL', 'ABSENCE', 'WITHDRAWAL', 'DISCIPLINARY', 'INCOMPLETE', 'OTHER'];

// GET — list reasons (optionally ?category=).
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const category = new URL(request.url).searchParams.get('category') || undefined;
    const reasons = await prisma.courseResultReason.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
    return NextResponse.json({
      reasons: reasons.map((r) => ({
        id: r.id, code: r.code, nameAr: r.nameAr, nameEn: r.nameEn,
        category: r.category, appliesTo: r.appliesTo, order: r.order, isActive: r.isActive,
      })),
      categories: CATEGORIES,
    });
  } catch (error) {
    console.error('Error listing result reasons:', error);
    return NextResponse.json({ error: 'فشل في جلب أسباب النتيجة' }, { status: 500 });
  }
}

// POST — add a reason.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { code, nameAr } = body ?? {};
    if (!code || !nameAr) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });
    const category = CATEGORIES.includes(body.category) ? body.category : 'OTHER';

    const dup = await prisma.courseResultReason.findFirst({ where: { code, universityId: guard.ctx.universityId ?? null } });
    if (dup) return NextResponse.json({ error: 'الكود مستخدم بالفعل' }, { status: 409 });

    const created = await prisma.courseResultReason.create({
      data: {
        universityId: guard.ctx.universityId ?? null,
        code, nameAr, nameEn: body.nameEn ?? null,
        category, appliesTo: body.appliesTo ?? null, order: body.order ?? 50, isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating result reason:', error);
    return NextResponse.json({ error: 'فشل في إضافة سبب النتيجة' }, { status: 500 });
  }
}

// PATCH — edit a reason.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (typeof body.nameAr === 'string') data.nameAr = body.nameAr;
    if (body.nameEn === null || typeof body.nameEn === 'string') data.nameEn = body.nameEn;
    if (typeof body.category === 'string' && CATEGORIES.includes(body.category)) data.category = body.category;
    if (body.appliesTo === null || typeof body.appliesTo === 'string') data.appliesTo = body.appliesTo;
    if (typeof body.order === 'number') data.order = body.order;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    const updated = await prisma.courseResultReason.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating result reason:', error);
    return NextResponse.json({ error: 'فشل في تحديث سبب النتيجة' }, { status: 500 });
  }
}

// DELETE ?id= — remove a reason.
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    await prisma.courseResultReason.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting result reason:', error);
    return NextResponse.json({ error: 'فشل في حذف سبب النتيجة' }, { status: 500 });
  }
}
