import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import {
  BUCKETS,
  REQUIREMENT_TYPES,
  buildLegacyTree,
  serializeItem,
  validateItemInput,
  planLevelCeiling,
} from './shared';

// GET /api/institute/study-plan?programId=
//
// Backwards-compatible: with no programId it returns the same { studyPlan: { program, totalHours,
// years } } tree the read-only screen has always consumed, built from the LEGACY free-text
// year/semester/courseCode/courseName columns so seeded rows keep reading exactly as before.
// It additionally returns the structured `items` (and the programme list) the editor needs.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('plan.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');

    // Plan rows, like programmes, mostly predate multi-tenancy: a strict universityId filter would
    // hide every seeded row. tenantOrGlobalWhere accepts our own rows OR untenanted ones.
    const scope = tenantOrGlobalWhere(guard.ctx.universityId);
    const where: Record<string, unknown> = programId ? { AND: [scope, { programId }] } : { ...scope };

    const items = await prisma.studyPlanItem.findMany({
      where,
      orderBy: [{ levelNo: 'asc' }, { termNo: 'asc' }, { order: 'asc' }],
    });

    const programs = await prisma.program.findMany({
      where: tenantOrGlobalWhere(guard.ctx.universityId),
      select: { id: true, nameAr: true, years: true, totalCreditHours: true, academicSystem: true, departmentId: true },
      orderBy: { nameAr: 'asc' },
    });

    const program = programId
      ? programs.find((p) => p.id === programId)?.nameAr ?? items[0]?.programName ?? ''
      : items[0]?.programName ?? '';
    const totalHours = items.reduce((acc, item) => acc + item.hours, 0);

    return NextResponse.json({
      studyPlan: { program, totalHours, years: buildLegacyTree(items) },
      items: items.map(serializeItem),
      programs,
      // maxLevel is the institute's own عدد المستويات (null when it never typed one) — the editor
      // uses it for the level picker instead of Program.years, which counts years, not levels.
      meta: { buckets: BUCKETS, requirementTypes: REQUIREMENT_TYPES, maxLevel: await planLevelCeiling(guard.ctx.universityId) },
    });
  } catch (e) {
    console.error('GET /api/institute/study-plan failed', e);
    return NextResponse.json({ error: 'فشل في جلب الخطة الدراسية' }, { status: 500 });
  }
}

// POST /api/institute/study-plan — add one row to a programme's plan.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('plan.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const v = await validateItemInput(body, guard.ctx.universityId, null);
    if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 });

    const created = await prisma.studyPlanItem.create({
      data: { ...v.data, universityId: guard.ctx.universityId ?? null },
    });
    return NextResponse.json({ item: serializeItem(created) }, { status: 201 });
  } catch (e) {
    console.error('POST /api/institute/study-plan failed', e);
    return NextResponse.json({ error: 'فشل في إضافة المقرر إلى الخطة' }, { status: 500 });
  }
}

// PATCH /api/institute/study-plan — update one row (by id).
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('plan.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const existing = await prisma.studyPlanItem.findFirst({ where: { AND: [tenantOrGlobalWhere(guard.ctx.universityId), { id }] } });
    if (!existing) return NextResponse.json({ error: 'السطر غير موجود' }, { status: 404 });

    // Merge onto the stored row so a partial edit never blanks a legacy column.
    const merged = {
      programId: existing.programId,
      courseId: existing.courseId,
      courseCode: existing.courseCode,
      courseName: existing.courseName,
      hours: existing.hours,
      levelNo: existing.levelNo,
      termNo: existing.termNo,
      requirementType: existing.requirementType,
      bucket: existing.bucket,
      specializationId: existing.specializationId,
      electiveGroup: existing.electiveGroup,
      chooseCount: existing.chooseCount,
      order: existing.order,
      year: existing.year,
      semester: existing.semester,
      ...body,
    };
    // A row seeded without levelNo may be edited without being forced into the new structure.
    const v = await validateItemInput(merged, guard.ctx.universityId, id, existing.levelNo === null);
    if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 });

    const updated = await prisma.studyPlanItem.update({ where: { id }, data: v.data });
    return NextResponse.json({ item: serializeItem(updated) });
  } catch (e) {
    console.error('PATCH /api/institute/study-plan failed', e);
    return NextResponse.json({ error: 'فشل في تعديل سطر الخطة' }, { status: 500 });
  }
}

// DELETE /api/institute/study-plan?id=
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requirePermission('plan.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const existing = await prisma.studyPlanItem.findFirst({ where: { AND: [tenantOrGlobalWhere(guard.ctx.universityId), { id }] } });
    if (!existing) return NextResponse.json({ error: 'السطر غير موجود' }, { status: 404 });

    await prisma.studyPlanItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/institute/study-plan failed', e);
    return NextResponse.json({ error: 'فشل في حذف سطر الخطة' }, { status: 500 });
  }
}

