import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { planLevelCeiling } from '../study-plan/shared';

/**
 * التخصصات (رئيسي / فرعي) — CRUD.
 *
 * The Specialization model existed but was ORPHANED (zero queries repo-wide), so a student's
 * تخصص lived only in the free-text Student.section. The bylaw hangs specialisations off the
 * programme — «ثلاث تخصصات رئيسه … 1 دراسات سياحية، 2 ادارة الضيافة، 3 الارشاد السياحي» — and
 * gates the minor by level: «ملاحظه التخصص الفرعي يكون في المستوي الرابع فقط، اخر مستوي يليه
 * التخرج», with a second minor allowed as extra load: «يجوز له اختيار التخصص الفرعي الثاني
 * بناءعلي عب ء دراسي اضافي ويكون في المستوي الخامس ويشترط حصوله علي تقدير تراكمي 2.7 فاكثر».
 *
 * Those two numbers (4 and 2.7) are NOT hardcoded here: they are `minLevel` and
 * `minCgpaForSecond`, typed by each institute from its own لائحة.
 *
 * Permissions reuse program.view / program.edit — a specialisation is part of the programme
 * structure, and no new catalogue key is needed.
 */

const KINDS = ['MAIN', 'MINOR'];

/**
 * TENANT SCOPING. `Specialization` carries no universityId and is not auto-scoped, so without this
 * every institute read, renamed and DELETED every other institute's تخصصات. Its PROGRAMME does
 * carry universityId, so the programme is the tenant anchor: resolve the in-scope programme ids
 * once and filter every read and write by them. A specialisation with no programme is treated like
 * any other untenanted row — visible exactly where tenantOrGlobalWhere would show one.
 */
async function scopedProgramIds(universityId: string | null): Promise<string[]> {
  const rows = await prisma.program.findMany({ where: tenantOrGlobalWhere(universityId), select: { id: true } });
  return rows.map((r) => r.id);
}

/** The scope clause for a Specialization row: this tenant's programmes, or no programme at all. */
const specScope = (programIds: string[]) => ({ OR: [{ programId: { in: programIds } }, { programId: null }] });

/** One guarded lookup used by PATCH and DELETE — misses become 404, never a cross-tenant write. */
async function findScopedSpec(id: string, universityId: string | null) {
  const ids = await scopedProgramIds(universityId);
  return prisma.specialization.findFirst({ where: { AND: [{ id }, specScope(ids)] } });
}

// GET /api/institute/specializations?programId=&kind=
export async function GET(request: NextRequest) {
  try {
    // The REGISTRAR — the role that actually assigns تخصص to students — holds student.* but neither
    // program.view nor plan.view (prisma/rbac/catalog.ts), so gating the list on program.view alone
    // left the assign screen with an empty dropdown for its intended user. Either permission reads.
    let guard = await requirePermission('program.view');
    if (!guard.ok) guard = await requirePermission('student.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const kind = searchParams.get('kind');

    const inner: Record<string, unknown> = {};
    if (programId && programId !== 'all') inner.programId = programId;
    if (kind && KINDS.includes(kind)) inner.kind = kind;
    // Composed under AND: specScope owns an OR key, so it must never be spread beside another.
    const where = { AND: [specScope(await scopedProgramIds(guard.ctx.universityId)), inner] };

    const rows = await prisma.specialization.findMany({
      where,
      include: { department: { select: { id: true, nameAr: true } }, program: { select: { id: true, nameAr: true } }, _count: { select: { students: true } } },
      orderBy: [{ order: 'asc' }, { nameAr: 'asc' }],
    });

    return NextResponse.json({
      specializations: rows.map((s) => ({
        id: s.id,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        kind: s.kind ?? 'MAIN', // legacy rows predate `kind`; they read as main tracks
        programId: s.programId,
        programName: s.program?.nameAr ?? '',
        departmentId: s.departmentId,
        departmentName: s.department?.nameAr ?? '',
        minLevel: s.minLevel,
        minCgpaForSecond: s.minCgpaForSecond,
        year: s.year,
        isActive: s.isActive,
        order: s.order,
        students: s._count.students,
      })),
    });
  } catch (e) {
    console.error('GET /api/institute/specializations failed', e);
    return NextResponse.json({ error: 'فشل في جلب التخصصات' }, { status: 500 });
  }
}

type Input = {
  nameAr?: unknown; nameEn?: unknown; kind?: unknown; programId?: unknown; departmentId?: unknown;
  minLevel?: unknown; minCgpaForSecond?: unknown; order?: unknown; isActive?: unknown;
};

async function normalize(body: Input, universityId: string | null) {
  const nameAr = typeof body.nameAr === 'string' ? body.nameAr.trim() : '';
  const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : '';
  if (!nameAr) return { error: 'اسم التخصص بالعربية مطلوب' };

  const kind = typeof body.kind === 'string' && body.kind ? body.kind : 'MAIN';
  if (!KINDS.includes(kind)) return { error: 'نوع التخصص يجب أن يكون رئيسي أو فرعي' };

  const programId = typeof body.programId === 'string' && body.programId ? body.programId : '';
  if (!programId) return { error: 'البرنامج مطلوب' };
  const program = await prisma.program.findFirst({ where: { AND: [tenantOrGlobalWhere(universityId), { id: programId }] } });
  if (!program) return { error: 'البرنامج غير موجود' };

  // Specialization.departmentId is required by the schema and predates programId; default it to the
  // programme's own department so the institute never has to pick the department twice.
  const departmentId = (typeof body.departmentId === 'string' && body.departmentId) || program.departmentId;
  if (!departmentId) return { error: 'القسم مطلوب — البرنامج غير مرتبط بقسم' };

  let minLevel: number | null = null;
  if (body.minLevel !== null && body.minLevel !== undefined && String(body.minLevel) !== '') {
    minLevel = parseInt(String(body.minLevel), 10);
    // NOT program.years (a YEAR count): «التخصص الفرعي الثاني … ويكون في المستوي الخامس» is level 5
    // on a 4-year programme. The ceiling is the institute's own عدد المستويات, or none if unset.
    const ceiling = await planLevelCeiling(universityId);
    if (!Number.isInteger(minLevel) || minLevel < 1 || (ceiling !== null && minLevel > ceiling)) {
      return {
        error: ceiling !== null
          ? `أول مستوى للتخصص يجب أن يكون بين 1 و ${ceiling} حسب عدد المستويات في لائحة المعهد`
          : 'أول مستوى للتخصص يجب أن يكون رقمًا من 1 فأعلى',
      };
    }
  }
  // The bylaw states the minor appears at a single level only («في المستوي الرابع فقط»), so an
  // institute entering a MINOR without that level would lose the rule entirely.
  if (kind === 'MINOR' && minLevel === null) {
    return { error: 'حدد أول مستوى يظهر فيه التخصص الفرعي (اللائحة تحدده بمستوى بعينه)' };
  }

  let minCgpaForSecond: number | null = null;
  if (body.minCgpaForSecond !== null && body.minCgpaForSecond !== undefined && String(body.minCgpaForSecond) !== '') {
    minCgpaForSecond = Number(body.minCgpaForSecond);
    if (!Number.isFinite(minCgpaForSecond) || minCgpaForSecond < 0 || minCgpaForSecond > 4) {
      return { error: 'المعدل التراكمي المطلوب للتخصص الفرعي الثاني يجب أن يكون بين 0 و 4' };
    }
  }
  if (minCgpaForSecond !== null && kind !== 'MINOR') {
    return { error: 'شرط المعدل التراكمي يخص التخصص الفرعي الثاني فقط' };
  }

  const orderRaw = parseInt(String(body.order ?? ''), 10);

  return {
    data: {
      nameAr,
      nameEn: nameEn || nameAr,
      kind,
      programId,
      departmentId,
      minLevel,
      minCgpaForSecond,
      order: Number.isInteger(orderRaw) ? orderRaw : 0,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      // `year` is the legacy required column; mirror minLevel so old readers stay sane.
      year: minLevel ?? 1,
    },
  };
}

// POST /api/institute/specializations
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('program.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const v = await normalize(await request.json().catch(() => ({})), guard.ctx.universityId);
    if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 });

    const created = await prisma.specialization.create({ data: v.data });
    return NextResponse.json({ specialization: created }, { status: 201 });
  } catch (e) {
    console.error('POST /api/institute/specializations failed', e);
    return NextResponse.json({ error: 'فشل في إضافة التخصص' }, { status: 500 });
  }
}

// PATCH /api/institute/specializations — update by id.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('program.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const existing = await findScopedSpec(id, guard.ctx.universityId);
    if (!existing) return NextResponse.json({ error: 'التخصص غير موجود' }, { status: 404 });

    // Merge onto the stored row: a partial edit must not blank a field the institute already typed.
    const v = await normalize(
      {
        nameAr: existing.nameAr, nameEn: existing.nameEn, kind: existing.kind ?? 'MAIN',
        programId: existing.programId, departmentId: existing.departmentId,
        minLevel: existing.minLevel, minCgpaForSecond: existing.minCgpaForSecond,
        order: existing.order, isActive: existing.isActive,
        ...body,
      },
      guard.ctx.universityId,
    );
    if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 });

    const updated = await prisma.specialization.update({ where: { id }, data: v.data });
    return NextResponse.json({ specialization: updated });
  } catch (e) {
    console.error('PATCH /api/institute/specializations failed', e);
    return NextResponse.json({ error: 'فشل في تعديل التخصص' }, { status: 500 });
  }
}

// DELETE /api/institute/specializations?id=
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requirePermission('program.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const existing = await findScopedSpec(id, guard.ctx.universityId);
    if (!existing) return NextResponse.json({ error: 'التخصص غير موجود' }, { status: 404 });

    const [students, planRows] = await Promise.all([
      prisma.student.count({ where: { specializationId: id } }),
      prisma.studyPlanItem.count({ where: { specializationId: id } }),
    ]);
    // Deleting would SetNull on both sides and silently strip the تخصص off students and plan rows.
    if (students > 0) return NextResponse.json({ error: `لا يمكن حذف التخصص: مرتبط بـ ${students} طالب` }, { status: 409 });
    if (planRows > 0) return NextResponse.json({ error: `لا يمكن حذف التخصص: مستخدم في ${planRows} سطر بالخطة الدراسية` }, { status: 409 });

    await prisma.specialization.delete({ where: { id: existing.id } }); // the guarded row, never a raw id
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/institute/specializations failed', e);
    return NextResponse.json({ error: 'فشل في حذف التخصص' }, { status: 500 });
  }
}
