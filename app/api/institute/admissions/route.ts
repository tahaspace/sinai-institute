import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import { resolveApplicationProgramId } from '@/lib/admission-program';
import { normalizeSystem, normalizeSystemFilter } from '@/lib/academic-system';
import { hasPermission, requirePermission } from '@/lib/authz';

type ProgramRow = { id: string; nameAr: string; nameEn: string | null; academicSystem: string };

const statusLabel = (s: string) =>
  ({ PENDING: 'قيد المراجعة', APPROVED: 'مقبول', REJECTED: 'مرفوض', ENROLLED: 'تم التسجيل' } as Record<string, string>)[s] ?? s;

// GET /api/institute/admissions?status=&system=
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('admission.application.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    // Status scope on its own. Kept separate from the system fragment so the "unlinked" count below
    // is measured against the tab the user is looking at, not against the already-narrowed subset.
    const baseWhere: Record<string, unknown> = {};
    if (status && status !== 'all') baseWhere.status = status.toUpperCase();

    // An applicant is not a student yet, so their academic system comes from the programme they
    // applied to (Application.programId). A relation filter on a nullable to-one drops rows whose
    // programme is unresolved, which is what we want: such a row belongs to NEITHER system and must
    // not be silently counted into one. No filter ⇒ no fragment ⇒ byte-identical to the old query.
    const system = normalizeSystemFilter(searchParams.get('system'));
    const where = system ? { ...baseWhere, program: { academicSystem: system } } : baseWhere;

    // Served here rather than from /api/institute/programs so the review screen can stamp a
    // programme at enrolment under the admissions permission alone (no extra program.view grant).
    // The list only feeds the enrolment dialog, which needs `decide` — programme data is otherwise
    // gated behind `program.view`, so a view-only reviewer neither receives the catalogue nor pays
    // for the query that builds it. ADMISSIONS/INSTITUTE_ADMIN still get it via `admission.*`/ALL.
    const canDecide = hasPermission(guard.ctx, 'admission.application.decide');
    const programsQuery: Promise<ProgramRow[]> = canDecide
      ? prisma.program.findMany({
          select: { id: true, nameAr: true, nameEn: true, academicSystem: true },
          orderBy: { nameAr: 'asc' },
        })
      : Promise.resolve([]);

    const [apps, unlinked, programs] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { program: { select: { academicSystem: true } } },
      }),
      // How many applications in this tab carry no programme at all. A system-narrowed view can
      // never show them, so the screen reports the gap instead of implying they do not exist.
      prisma.application.count({ where: { ...baseWhere, programId: null } }),
      programsQuery,
    ]);

    const byStatus = (s: string) => apps.filter((a) => a.status === s).length;
    return NextResponse.json({
      applications: apps.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        nationalId: a.nationalId,
        email: a.email,
        phone: a.phone,
        highSchoolGrade: a.highSchoolGrade,
        firstChoice: a.firstChoice,
        programId: a.programId,
        // null (not a defaulted CREDIT_HOURS) when no programme is resolved — the UI shows "—".
        system: a.program ? normalizeSystem(a.program.academicSystem) : null,
        status: a.status,
        statusLabel: statusLabel(a.status),
        createdAt: a.createdAt.toISOString().slice(0, 10),
      })),
      programs: programs.map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn ?? '',
        academicSystem: normalizeSystem(p.academicSystem),
      })),
      stats: {
        total: apps.length,
        pending: byStatus('PENDING'),
        approved: byStatus('APPROVED'),
        rejected: byStatus('REJECTED'),
        enrolled: byStatus('ENROLLED'),
        unlinked,
      },
    });
  } catch (error) {
    console.error('Error listing admissions:', error);
    return NextResponse.json({ error: 'فشل في جلب طلبات الالتحاق' }, { status: 500 });
  }
}

// PATCH /api/institute/admissions — change status; "ENROLLED" creates a real Student.
// This closes the admission loop: an approved applicant becomes a shared Student
// that the Student/Faculty/Parent portals can then see.
// Enrolling REQUIRES an EXPLICIT `programId`: the programme is what fixes the student's academic
// system, so an enrolment without one is refused with 400 rather than defaulted to credit-hours —
// and rather than guessed from the applicant's free text (see the ENROLLED branch).
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('admission.application.decide');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, status, departmentId, programId } = body ?? {};
    if (!id || !status) return NextResponse.json({ error: 'المعرف والحالة مطلوبان' }, { status: 400 });

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const next = String(status).toUpperCase();
    let createdStudent = null;

    // Resolve the applicant's choice to a real Program. This is what carries the academic system:
    // a Student created without a programId silently defaults to credit-hours, which would be wrong
    // for an annual-programme applicant and would misroute every later result/promotion decision.
    // Normalized once here so the Student created below and the Application row updated at the end
    // can never disagree about which programme the reviewer actually chose.
    // Trimmed exactly like POST /api/institute/students, so the two doors closed in this pass take
    // one input contract: a padded id from an integration resolves instead of 400-ing «غير موجود»,
    // and a whitespace-only string reads as "no programme chosen" rather than "programme not found".
    const explicitProgramId = typeof programId === 'string' && programId.trim() ? programId.trim() : null;
    const resolvedProgramId = await resolveApplicationProgramId(app.firstChoice, explicitProgramId);

    if (next === 'ENROLLED') {
      // The programme is REQUIRED to enrol, and it must be an EXPLICIT pick. It is the only carrier
      // of the academic system, so a Student created without one is silently graded as credit-hours
      // (Program.academicSystem defaults to CREDIT_HOURS and normalizeSystem() coerces "unknown" the
      // same way) — a mis-classification that only surfaces months later, at grading/promotion.
      // `resolvedProgramId` is NOT good enough here: resolveApplicationProgramId() is a fuzzy ladder
      // (exact → single containment → single reverse-containment on free text), so «علوم الحاسب»
      // becomes «بكالوريوس علوم الحاسب» on nothing but a substring. That is the right behaviour for
      // preselecting the dialog and for back-filling an unlinked Application below, and the wrong
      // basis for fixing a real student's academic system for the rest of their degree. The dialog
      // always sends programId; a direct PATCH without one is refused rather than guessed at.
      if (!explicitProgramId) {
        return NextResponse.json(
          {
            error:
              'يجب اختيار البرنامج قبل تسجيل الطالب — البرنامج هو ما يحدد النظام الأكاديمي (نظام الساعات المعتمدة أو النظام السنوي).',
          },
          { status: 400 },
        );
      }
      // Read the programme back instead of trusting the id: an id that matches no programme would
      // otherwise fail on the foreign key and surface as an opaque 500 «فشل في تحديث طلب الالتحاق»,
      // with the reviewer none the wiser about which field was wrong.
      // Enrolling is a one-time write: studentCode is minted from a count, so a second PATCH on an
      // already-enrolled application would create a DUPLICATE student rather than be a no-op.
      if (app.status === 'ENROLLED') {
        return NextResponse.json({ error: 'هذا الطلب مُسجَّل بالفعل — لا يمكن تسجيله مرة أخرى' }, { status: 409 });
      }
      const program = await prisma.program.findFirst({
        where: { id: explicitProgramId, isActive: true, ...tenantOrGlobalWhere(guard.ctx.universityId) },
        select: { departmentId: true },
      });
      if (!program) {
        return NextResponse.json({ error: 'البرنامج المحدد غير موجود' }, { status: 400 });
      }
      // Create the Student from the application if not already created.
      const year = new Date().getFullYear();
      const count = await prisma.student.count();
      createdStudent = await prisma.student.create({
        data: {
          studentCode: `${year}-${String(count + 1).padStart(4, '0')}`,
          nameAr: app.fullName,
          email: app.email,
          phone: app.phone,
          nationalId: app.nationalId,
          departmentId: departmentId || program.departmentId || null,
          programId: explicitProgramId,
          level: 1,
          enrollYear: year,
          status: 'ACTIVE',
        },
      });
    }

    // Persist the resolution too, so admissions reports can be filtered by academic system.
    // The reviewer's explicit pick is authoritative — it is exactly what the created Student
    // inherits, so leaving a stale programme on the Application would split one fact across two
    // rows and file an annual student under credit hours in every system-filtered admissions view.
    // The free-text name match stays a guess: it may fill an empty link, never overwrite a set one.
    const programIdPatch = explicitProgramId
      ? explicitProgramId !== app.programId
        ? { programId: explicitProgramId }
        : {}
      : !app.programId && resolvedProgramId
      ? { programId: resolvedProgramId }
      : {};

    const updated = await prisma.application.update({
      where: { id },
      data: { status: next, ...programIdPatch },
    });
    return NextResponse.json({ application: updated, createdStudent });
  } catch (error) {
    console.error('Error updating admission:', error);
    return NextResponse.json({ error: 'فشل في تحديث طلب الالتحاق' }, { status: 500 });
  }
}
