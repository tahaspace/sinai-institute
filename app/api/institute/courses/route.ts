import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeSystem } from '@/lib/academic-system';
import { requirePermission } from '@/lib/authz';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import { getRegulations, courseTypeOf, courseSplitMismatch, creditHoursFromContact } from '@/lib/regulations';

// GET /api/institute/courses?search=&departmentId= — course catalog.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('course.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const departmentId = searchParams.get('departmentId');

    const where: Record<string, unknown> = {};
    if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        department: true,
        instructor: true,
        _count: { select: { enrollments: true } },
        // The graded prerequisite rules (CoursePrerequisite). The legacy implicit M2M is returned
        // alongside so a course whose pairs have not been copied yet still shows its prerequisites.
        // Tenant-scoped: a Course row may be SHARED, so an unfiltered include showed institute B's
        // minGradeCode on institute A's screen — which then posted it back under A's id. Own rows OR
        // untenanted ones; an untenanted caller sees the untenanted rows only (tenantOrGlobalWhere
        // returns {} for a null tenant, i.e. every institute's rules).
        prereqRules: {
          where: guard.ctx.universityId ? { OR: [{ universityId: guard.ctx.universityId }, { universityId: null }] } : { universityId: null },
          select: { prerequisiteId: true, minGradeCode: true, universityId: true, prerequisite: { select: { code: true, nameAr: true } } },
        },
        prerequisites: { select: { id: true, code: true, nameAr: true } },
      },
      orderBy: { code: 'asc' },
    });

    // A Course belongs to a DEPARTMENT, not a programme, so its academic system can only be derived
    // from the study plans that include it (Course.code → StudyPlanItem.courseCode → Program). Kept
    // as a derivation rather than a column on Course: the programme stays the single source of truth,
    // and a course shared by a credit-hour and an annual programme honestly reports both.
    // Tenant-scoped: study-plan rows are matched by course CODE, not by id, so without this an
    // ANNUAL programme at another institute whose plan contains the same code (CS101) would tag this
    // institute's course as annual.
    const uid = guard.ctx.universityId ?? null;
    const planItems = await prisma.studyPlanItem.findMany({
      // Tenant OR untenanted: most plan rows predate multi-tenancy and carry NULL, so a strict
      // `universityId: uid` filter blanked the level column for every existing institute.
      where: { AND: [{ programId: { not: null } }, tenantOrGlobalWhere(uid)] },
      select: { courseCode: true, programId: true, levelNo: true },
    });
    // جدول 2 «طبيعة المقرر» + «تعريف الساعة المعتمدة» come from THIS institute's bylaw, never code.
    const reg = await getRegulations(guard.ctx);
    const programSystems = new Map(
      (await prisma.program.findMany({ where: tenantOrGlobalWhere(uid), select: { id: true, academicSystem: true } }))
        .map((p) => [p.id, normalizeSystem(p.academicSystem)] as const),
    );
    const gradeStatuses = await prisma.gradeStatus.findMany({
      // Explicit no-tenant case: tenantOrGlobalWhere(null) is {} — UNFILTERED — which would offer
      // every institute's letters. An untenanted caller sees the untenanted ladder only.
      where: uid ? { OR: [{ universityId: uid }, { universityId: null }] } : { universityId: null },
      select: { code: true, name: true, universityId: true },
      orderBy: { code: 'asc' },
    });
    const systemsByCourseCode = new Map<string, Set<string>>();
    // المستوى الدراسي — the bylaw organises every plan table by level («المستوي الاول … الرابع»).
    // It lives on the STUDY PLAN row (StudyPlanItem.levelNo), so the catalogue reports the earliest
    // level a plan places the course at; a course on no plan yet simply has none.
    const levelByCourseCode = new Map<string, number>();
    for (const it of planItems) {
      if (it.levelNo != null) {
        const prev = levelByCourseCode.get(it.courseCode);
        if (prev == null || it.levelNo < prev) levelByCourseCode.set(it.courseCode, it.levelNo);
      }
      const sys = programSystems.get(it.programId!);
      if (!sys) continue;
      const set = systemsByCourseCode.get(it.courseCode) ?? new Set<string>();
      set.add(sys);
      systemsByCourseCode.set(it.courseCode, set);
    }

    return NextResponse.json({
      courses: courses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.nameAr,
        nameEn: c.nameEn ?? '',
        department: c.department?.nameAr ?? '',
        departmentId: c.departmentId,
        creditHours: c.creditHours,
        // empty = not on any study plan yet, so it is never filtered out
        systems: [...(systemsByCourseCode.get(c.code) ?? [])],
        instructor: c.instructor?.name ?? '',
        students: c._count.enrollments,
        // registrar flags + per-course grade split (Phase A)
        countsInGpa: c.countsInGpa,
        requirementType: c.requirementType,
        availableInSummer: c.availableInSummer,
        isGraduationProject: c.isGraduationProject,
        gradeSplit: { midterm: c.midtermMax, final: c.finalMax, practical: c.practicalMax, homework: c.homeworkMax },
        // طبيعة المقرر (جدول 2). null = the institute never set one, so no split rule applies.
        courseTypeCode: c.courseTypeCode ?? null,
        courseTypeName: courseTypeOf(c.courseTypeCode, reg)?.nameAr ?? null,
        // Reported, not enforced: a course typed before جدول 2 existed keeps its numbers and is
        // merely flagged, so nothing an institute already saved stops working.
        splitMismatch: courseSplitMismatch(
          { homeworkMax: c.homeworkMax, finalMax: c.finalMax, practicalMax: c.practicalMax },
          courseTypeOf(c.courseTypeCode, reg),
        ),
        // ساعات الاتصال الأسبوعية — «ساعة نظريا و(2-3) عملي او تطبيقي». creditHours above stays the
        // stored credit value; this is what those contact hours CONVERT to, for comparison.
        theoryContactHours: c.theoryContactHours ?? null,
        practicalContactHours: c.practicalContactHours ?? null,
        derivedCreditHours: creditHoursFromContact(c.theoryContactHours, c.practicalContactHours, reg),
        // The typed column wins; the study-plan derivation only fills in for a course whose level
        // the institute never set. null = neither, so no level rule applies to it.
        level: c.level ?? levelByCourseCode.get(c.code) ?? null,
        // What the institute actually typed on the course row (null = it never did). The edit
        // dialog binds to THIS, so re-saving a course never freezes a derived plan level into the
        // column behind the registrar's back.
        courseLevel: c.level ?? null,
        // متطلبات سابقة: the typed rules win PER COURSE. The legacy implicit M2M is a fallback for a
        // course that has no visible CoursePrerequisite row at all (never migrated, never saved) —
        // not a per-pair union, which made a removed pair re-appear from the M2M forever.
        prerequisites: (() => {
          const rules = [...c.prereqRules]
            // the institute's OWN row is applied last and therefore wins over an untenanted legacy
            // row for the same pair
            .sort((a, b) => Number(a.universityId === uid) - Number(b.universityId === uid));
          if (rules.length) {
            return [
              ...new Map(
                rules.map((r) => [r.prerequisiteId, { id: r.prerequisiteId, code: r.prerequisite.code, name: r.prerequisite.nameAr, minGradeCode: r.minGradeCode ?? null }] as const),
              ).values(),
            ];
          }
          return c.prerequisites.map((p) => ({ id: p.id, code: p.code, name: p.nameAr, minGradeCode: null as string | null }));
        })(),
      })),
      // سلّم التقديرات as THIS institute sees it — same filter validatePrerequisites uses, so
      // «أدنى تقدير» can be a picker instead of free text that only fails on save. The page is
      // "use client" and must receive these from here; it may not import lib/regulations.ts.
      gradeStatuses: [...new Map(
        // own row last so it wins over an untenanted legacy row carrying the same code
        [...gradeStatuses].sort((a, b) => Number(a.universityId === uid) - Number(b.universityId === uid))
          .map((g) => [g.code, { code: g.code, name: g.name }] as const),
      ).values()],
      // The bylaw tables the screen needs to render — it is a client component and may not import
      // lib/regulations.ts (Prisma in the browser breaks the production build).
      courseTypes: reg.courseTypes,
      contactHoursPerCredit: {
        theory: reg.contactHoursPerCreditTheory,
        practical: reg.contactHoursPerCreditPractical,
      },
      stats: {
        total: courses.length,
        totalCreditHours: courses.reduce((s, c) => s + c.creditHours, 0),
      },
    });
  } catch (error) {
    console.error('Error listing courses:', error);
    return NextResponse.json({ error: 'فشل في جلب المقررات' }, { status: 500 });
  }
}

/**
 * متطلبات سابقة — validate the institute's typed rules for the NEW CoursePrerequisite model, the
 * only one that can hold the bylaw's minimum grade («حصول علي تقدير جيد في اللغة الاجنيبيه الاولي
 * المتخصصه»). The legacy implicit M2M is deliberately left untouched: lib/registration.ts still
 * reads it alongside these rows, and dropping it is a separate step once the copy is verified.
 *
 * VALIDATION ONLY — nothing is written here. The rows are handed back so the caller can write them
 * inside the SAME transaction as the course itself: writing them first left a created course with
 * no rules (and a retry that collided on the unique `code`) whenever the course write failed, and
 * replaced a course's rules on a PATCH whose update then threw.
 *
 * `undefined` = the caller said nothing about prerequisites, so nothing is changed.
 */
type PrereqRow = { prerequisiteId: string; minGradeCode: string | null };

async function validatePrerequisites(
  courseId: string | null,
  universityId: string | null,
  input: unknown,
): Promise<{ error: string } | { rows: PrereqRow[] | null }> {
  if (typeof input === 'undefined') return { rows: null };
  if (!Array.isArray(input)) return { error: 'قائمة المتطلبات السابقة غير صالحة' };
  // Dedupe by prerequisiteId (last one wins): the same id twice would otherwise hit
  // @@unique([courseId, prerequisiteId]) inside the transaction as an opaque 500.
  const byId = new Map<string, PrereqRow>();
  for (const raw of input) {
    const item = (typeof raw === 'string' ? { id: raw } : raw) as { id?: string; minGradeCode?: string | null };
    const prerequisiteId = String(item?.id ?? '').trim();
    if (!prerequisiteId) continue;
    if (courseId && prerequisiteId === courseId) return { error: 'لا يمكن أن يكون المقرر متطلباً سابقاً لنفسه' };
    const minGradeCode = item.minGradeCode ? String(item.minGradeCode).trim() : null;
    byId.set(prerequisiteId, { prerequisiteId, minGradeCode: minGradeCode || null });
  }
  const rows = [...byId.values()];
  if (!rows.length) return { rows };

  // Verify the ids: a stale id would otherwise surface as an opaque FK 500 instead of a message
  // the registrar can act on.
  const found = await prisma.course.findMany({ where: { id: { in: rows.map((r) => r.prerequisiteId) } }, select: { id: true } });
  if (found.length !== rows.length) return { error: 'أحد المقررات المختارة كمتطلب سابق غير موجود' };

  // Verify every minimum grade against THIS institute's ladder. An unknown code (a typo, or a
  // letter this tenant never defined) is skipped silently at registration time, so the rule would
  // look enforced on screen and never fire — precisely the bylaw rule the owner named.
  const codes = [...new Set(rows.map((r) => r.minGradeCode).filter((c): c is string => !!c))];
  if (codes.length) {
    const statuses = await prisma.gradeStatus.findMany({
      // Explicit no-tenant case: tenantOrGlobalWhere(null) is {} — UNFILTERED — so a legacy admin's
      // code was validated against EVERY institute's ladder, i.e. not validated at all.
      where: {
        AND: [
          { code: { in: codes } },
          universityId ? { OR: [{ universityId }, { universityId: null }] } : { universityId: null },
        ],
      },
      select: { code: true },
    });
    const known = new Set(statuses.map((x) => x.code));
    const missing = codes.filter((c) => !known.has(c));
    if (missing.length) return { error: `كود التقدير غير موجود في سلّم التقديرات: ${missing.join('، ')}` };
  }
  return { rows };
}

/**
 * The delete+recreate of a course's rules, scoped to the caller's own rows. Course rows may be
 * shared (Course.universityId is nullable and legacy rows are NULL), so an unscoped delete let one
 * institute wipe another institute's typed rules — with no undo.
 */
function prereqOps(tx: typeof prisma, courseId: string, universityId: string | null, rows: PrereqRow[], ownsCourse: boolean) {
  // WHICH ROWS MAY THIS INSTITUTE REMOVE: STRICTLY ITS OWN. The key is now
  // @@unique([universityId, courseId, prerequisiteId]), so each institute holds its own rule for the
  // same pair and the delete no longer has to "adopt" the untenanted row to avoid a collision.
  // Deleting the null-tenant arm used to wipe — with no undo — exactly the legacy rows that
  // lib/registration.ts serves to every OTHER institute's students.
  //
  // What a tenanted institute sees for an untenanted legacy rule: it READS it (GET and the engine
  // both union own + untenanted rows) but never rewrites or deletes it. Saving the dialog copies
  // the union it was shown into this institute's OWN rows, which then win per pair — so editing or
  // dropping a legacy rule is expressed as this institute's own row, and the shared row stays
  // intact for everyone else.
  const scope = { courseId, universityId };
  return [
    tx.coursePrerequisite.deleteMany({ where: scope }),
    ...rows.map((r) =>
      tx.coursePrerequisite.create({
        data: { courseId, prerequisiteId: r.prerequisiteId, minGradeCode: r.minGradeCode, universityId },
      }),
    ),
    // The LEGACY implicit M2M has no tenant column at all, so writing it is inherently global. It is
    // mirrored ONLY when this caller owns the course outright (its own course, or an untenanted
    // caller — the single-tenant legacy reality), never by one tenant on a shared course. Removal
    // still works because the READER now falls back to the M2M only for a course with zero visible
    // CoursePrerequisite rows (see GET and lib/registration.ts): a course becomes authoritative on
    // its first save. Known gap: a tenanted institute clearing ALL prerequisites of a course it does
    // not own leaves the shared M2M pairs in force for itself — dropping the M2M column entirely is
    // the real fix (reported in schemaNeeds).
    ...(ownsCourse
      ? [tx.course.update({ where: { id: courseId }, data: { prerequisites: { set: rows.map((r) => ({ id: r.prerequisiteId })) } } })]
      : []),
  ];
}

/**
 * طبيعة المقرر — must match a code in THIS institute's جدول 2 (Regulations.courseTypes). '' / null
 * clears it; undefined leaves it untouched (returned as undefined so the caller can skip the field).
 */
async function parseCourseType(v: unknown, tenant: { universityId?: string | null }): Promise<string | null | 'invalid' | undefined> {
  if (typeof v === 'undefined') return undefined;
  if (v === null || v === '') return null;
  const code = String(v).trim().toUpperCase();
  const reg = await getRegulations(tenant);
  return courseTypeOf(code, reg) ? code : 'invalid';
}

/** ساعات اتصال أسبوعية — a non-negative number, or null to clear it. */
function parseContactHours(v: unknown): number | null | 'invalid' | undefined {
  if (typeof v === 'undefined') return undefined;
  if (v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 0) return 'invalid';
  return n;
}

/** المستوى — a positive plan level, or null to clear it. Anything else is rejected by the caller. */
function parseLevel(v: unknown): number | null | 'invalid' {
  if (v === null || v === '' || typeof v === 'undefined') return null;
  const n = parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 1) return 'invalid';
  return n;
}

// POST /api/institute/courses — add a course.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('course.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const {
      code,
      nameAr,
      nameEn,
      creditHours,
      departmentId,
      instructorId,
      countsInGpa,
      requirementType,
      availableInSummer,
      isGraduationProject,
      midtermMax,
      finalMax,
      practicalMax,
      homeworkMax,
      courseTypeCode,
      theoryContactHours,
      practicalContactHours,
      level,
      prerequisites,
    } = body ?? {};
    if (!code || !nameAr) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });

    // requirementType is a closed set (إجباري/اختياري) — reject anything else early.
    if (typeof requirementType !== 'undefined' && !['mandatory', 'elective'].includes(requirementType)) {
      return NextResponse.json({ error: 'نوع المقرر غير صالح' }, { status: 400 });
    }

    // grade-component caps (midterm/final/practical/homework) — coerce to int and default per schema.
    const cap = (v: unknown, fallback: number) => {
      if (typeof v === 'undefined' || v === null || v === '') return fallback;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) ? n : fallback;
    };

    const levelValue = parseLevel(level);
    if (levelValue === 'invalid') return NextResponse.json({ error: 'المستوى غير صالح' }, { status: 400 });

    // طبيعة المقرر must be one of the rows the institute typed in جدول 2 — an unknown code would
    // silently disable the split check instead of flagging it.
    const typeCode = await parseCourseType(courseTypeCode, guard.ctx);
    if (typeCode === 'invalid') return NextResponse.json({ error: 'طبيعة المقرر غير موجودة في جدول توزيع الدرجات' }, { status: 400 });
    const theory = parseContactHours(theoryContactHours);
    const practical = parseContactHours(practicalContactHours);
    if (theory === 'invalid' || practical === 'invalid') return NextResponse.json({ error: 'ساعات الاتصال غير صالحة' }, { status: 400 });

    const uid = guard.ctx.universityId ?? null;
    const prereq = await validatePrerequisites(null, uid, prerequisites);
    if ('error' in prereq) return NextResponse.json({ error: prereq.error }, { status: 400 });

    // One transaction: the course and its prerequisite rules stand or fall together. Writing the
    // rules first left a created course with no rules whenever the rules were rejected.
    const course = await prisma.$transaction(async (tx) => {
      const created = await tx.course.create({
        data: {
          code,
          nameAr,
          nameEn: nameEn || null,
          creditHours: creditHours ? parseInt(String(creditHours), 10) : 3,
          departmentId: departmentId || null,
          instructorId: instructorId || null,
          countsInGpa: typeof countsInGpa === 'boolean' ? countsInGpa : true,
          requirementType: requirementType || 'mandatory',
          availableInSummer: typeof availableInSummer === 'boolean' ? availableInSummer : true,
          isGraduationProject: typeof isGraduationProject === 'boolean' ? isGraduationProject : false,
          midtermMax: cap(midtermMax, 50),
          finalMax: cap(finalMax, 100),
          practicalMax: cap(practicalMax, 0),
          homeworkMax: cap(homeworkMax, 20),
          // المستوى الدراسي — «المستوي الاول … الرابع» in the bylaw's plan tables. Typed by the
          // institute; the study-plan derivation in GET only fills in when this is null.
          level: levelValue,
          // طبيعة المقرر + ساعات الاتصال. All nullable: a course that says nothing about them reads
          // exactly as it did before these columns existed.
          courseTypeCode: typeCode,
          theoryContactHours: theory,
          practicalContactHours: practical,
        },
      });
      if (prereq.rows) {
        for (const op of prereqOps(tx as unknown as typeof prisma, created.id, uid, prereq.rows, true)) await op;
      }
      return created;
    });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'تعذّر الحفظ: يوجد سجل مطابق بالفعل (الكود أو أحد المتطلبات السابقة)' }, { status: 409 });
    }
    return NextResponse.json({ error: 'فشل في إضافة المقرر' }, { status: 500 });
  }
}

// PATCH /api/institute/courses — update by id.

/**
 * The ONLY course columns the edit dialog may write. A spread of the request body let any key
 * through — including ownership columns and anything a future model adds — so the payload is
 * whitelisted here instead of subtracted key by key.
 */
const EDITABLE_COURSE_FIELDS = [
  'code', 'nameAr', 'nameEn', 'creditHours', 'departmentId', 'instructorId',
  'countsInGpa', 'requirementType', 'availableInSummer', 'isGraduationProject',
  'midtermMax', 'finalMax', 'practicalMax', 'homeworkMax',
  'level', 'courseTypeCode', 'theoryContactHours', 'practicalContactHours',
] as const;

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('course.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const id = body?.id;
    const prerequisites = body?.prerequisites;
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    // universityId/facultyId are ownership columns and are simply not on the whitelist, so a body
    // that carries them can neither move a course to another institute nor smuggle in a new column.
    const data: Record<string, unknown> = {};
    for (const k of EDITABLE_COURSE_FIELDS) if (k in (body ?? {})) data[k] = body[k];

    if (typeof data.requirementType !== 'undefined' && !['mandatory', 'elective'].includes(data.requirementType as string)) {
      return NextResponse.json({ error: 'نوع المقرر غير صالح' }, { status: 400 });
    }

    // طبيعة المقرر + ساعات الاتصال — coerced separately from the caps below because null/'' means
    // "clear it" here, while an empty cap means "don't touch".
    if ('courseTypeCode' in data) {
      const typeCode = await parseCourseType(data.courseTypeCode, guard.ctx);
      if (typeCode === 'invalid') return NextResponse.json({ error: 'طبيعة المقرر غير موجودة في جدول توزيع الدرجات' }, { status: 400 });
      data.courseTypeCode = typeCode;
    }
    for (const k of ['theoryContactHours', 'practicalContactHours']) {
      if (k in data) {
        const h = parseContactHours(data[k]);
        if (h === 'invalid') return NextResponse.json({ error: 'ساعات الاتصال غير صالحة' }, { status: 400 });
        data[k] = h;
      }
    }

    // coerce numeric fields (credit hours + grade-component caps) to Int when present.
    for (const k of ['creditHours', 'midtermMax', 'finalMax', 'practicalMax', 'homeworkMax']) {
      if (typeof data[k] !== 'undefined' && data[k] !== null && data[k] !== '') {
        data[k] = parseInt(String(data[k]), 10);
      } else if (k in data) {
        delete data[k]; // don't blank out a column with an empty string
      }
    }
    // normalize empty relation ids to null
    if (data.departmentId === '') data.departmentId = null;
    if (data.instructorId === '') data.instructorId = null;
    // المستوى — sent as null/'' to clear it, so it is coerced separately from the caps above.
    if ('level' in data) {
      const levelValue = parseLevel(data.level);
      if (levelValue === 'invalid') return NextResponse.json({ error: 'المستوى غير صالح' }, { status: 400 });
      data.level = levelValue;
    }

    const uid = guard.ctx.universityId ?? null;
    const prereq = await validatePrerequisites(id, uid, prerequisites);
    if ('error' in prereq) return NextResponse.json({ error: prereq.error }, { status: 400 });

    // One transaction: rules were previously replaced BEFORE the course update, so a failing update
    // left the course unchanged with its prerequisite rules already rewritten and no rollback.
    const course = await prisma.$transaction(async (tx) => {
      // Tenant-scoped pre-read: `where: { id }` alone let a course.edit holder at institute A write
      // any course id belonging to institute B. A tenanted caller may edit its own rows and the
      // shared untenanted ones; an untenanted caller keeps today's unrestricted reach (that is the
      // legacy single-tenant admin, and narrowing it would hide every tenanted course from him).
      const existing = await tx.course.findFirst({
        where: { AND: [{ id }, uid ? { OR: [{ universityId: uid }, { universityId: null }] } : {}] },
        select: { id: true, universityId: true },
      });
      if (!existing) return null;
      const updated = await tx.course.update({ where: { id }, data });
      if (prereq.rows) {
        // The global M2M mirror is written only for a course this caller owns outright.
        const ownsCourse = uid === null || existing.universityId === uid;
        for (const op of prereqOps(tx as unknown as typeof prisma, id, uid, prereq.rows, ownsCourse)) await op;
      }
      return updated;
    });
    if (!course) return NextResponse.json({ error: 'المقرر غير موجود' }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'تعذّر الحفظ: يوجد سجل مطابق بالفعل (الكود أو أحد المتطلبات السابقة)' }, { status: 409 });
    }
    return NextResponse.json({ error: 'فشل في تحديث المقرر' }, { status: 500 });
  }
}
