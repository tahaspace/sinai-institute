import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission, requireFeature, hasPermission } from '@/lib/authz';
import { normalizeSystem, type AcademicSystem } from '@/lib/academic-system';
import { tenantWhere, tenantOrGlobalWhere } from '@/lib/tenant';

// Shape the page renders for each table row. Status is lowercased here so the
// page's getStatusBadge() switch ('pending'|'approved'|'rejected') works as-is.
interface TransferRow {
  id: string;
  name: string;
  // INCOMING rows carry `from` (source institution), OUTGOING rows carry `to`.
  from?: string;
  to?: string;
  department: string;
  date: string;
  status: string;
  // Server-resolved academic system for the row: the linked student's programme when there is one,
  // else the request's own `programId` — the programme this request is attributed to: transferred
  // INTO for INCOMING, LEFT for OUTGOING — else null. NEVER a defaulted CREDIT_HOURS —
  // an unattributable request must render as «—» rather than assert a system nobody recorded.
  system: AcademicSystem | null;
}

// Option lists that feed the «طلب تحويل جديد» dialog. Fetched only on demand (`?options=1`, when the
// dialog opens) and only for a registrar who may actually create a request (same `transfer.approve`
// gate as POST), mirroring how /api/institute/admissions ships its programme catalogue only to
// reviewers holding `admission.application.decide`.
interface StudentOption {
  id: string;
  studentCode: string;
  nameAr: string;
  department: string;
  program: string;
  system: AcademicSystem | null;
}
interface ProgramOption {
  id: string;
  nameAr: string;
  academicSystem: AcademicSystem;
}

interface TransferStats {
  incoming: number;
  outgoing: number;
  pending: number;
  completed: number;
}

// Option-list loaders for the «طلب تحويل جديد» dialog. Declared as functions so the callers can
// await them conditionally without a `T[] | never[]` union at the call site.
function loadStudentOptions(universityId: string | null | undefined) {
  return prisma.student.findMany({
    // Tenant-scoped exactly like the programme list below — a registrar must never be shipped
    // another university's student codes and names.
    where: { status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] }, ...tenantOrGlobalWhere(universityId) },
    select: { id: true, studentCode: true, nameAr: true, department: { select: { nameAr: true } }, program: { select: { nameAr: true, academicSystem: true } } },
    orderBy: { studentCode: 'asc' },
  });
}
function loadProgramOptions(universityId: string | null | undefined) {
  return prisma.program.findMany({
    where: { isActive: true, ...tenantOrGlobalWhere(universityId) },
    select: { id: true, nameAr: true, academicSystem: true },
    orderBy: { nameAr: 'asc' },
  });
}

// GET /api/institute/admission/transfers[?options=1]
// Returns { incoming, outgoing, stats }. All four stat values are real COUNTs
// on TransferRequest — none is a hardcoded placeholder.
// `?options=1` additionally returns the dialog's pickers; the routine list load does NOT pay for
// them (two joins over the whole live roster) because the dialog is opened rarely.
export async function GET(request: NextRequest) {
  try {
    const feat = await requireFeature('admission.transfers');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('transfer.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const incomingRows = await prisma.transferRequest.findMany({
      where: tenantWhere(guard.ctx, { direction: 'INCOMING' }),
      orderBy: { createdAt: 'desc' },
      // `student` is included for INCOMING too: the direction does not forbid a link (a returning
      // student can be recorded against their existing file), and without it such a row would be
      // attributed to a system by its programme while the student's own programme says otherwise.
      include: { departmentRel: true, program: { select: { academicSystem: true } }, student: { include: { program: { select: { academicSystem: true } } } } },
    });

    const outgoingRows = await prisma.transferRequest.findMany({
      where: tenantWhere(guard.ctx, { direction: 'OUTGOING' }),
      orderBy: { createdAt: 'desc' },
      include: { student: { include: { department: true, program: { select: { academicSystem: true } } } }, departmentRel: true, program: { select: { academicSystem: true } } },
    });

    // One resolution order for both directions: the student's own programme wins (it is the record
    // that actually grades them), then the request's own programme — the one this request is
    // attributed to: transferred INTO for INCOMING, LEFT for OUTGOING — then nothing.
    const rowSystem = (t: {
      student?: { program?: { academicSystem: string } | null } | null;
      program?: { academicSystem: string } | null;
    }): AcademicSystem | null =>
      t.student?.program ? normalizeSystem(t.student.program.academicSystem)
        : t.program ? normalizeSystem(t.program.academicSystem)
        : null;

    const incoming: TransferRow[] = incomingRows.map((t) => ({
      id: t.id,
      name: t.studentName,
      from: t.institution,
      // requested department: prefer the related department's Arabic name
      department: t.departmentRel?.nameAr ?? t.department ?? '—',
      date: t.createdAt.toISOString().slice(0, 10),
      status: t.status.toLowerCase(),
      system: rowSystem(t),
    }));

    const outgoing: TransferRow[] = outgoingRows.map((t) => ({
      id: t.id,
      // for existing students prefer their canonical name over the snapshot
      name: t.student?.nameAr ?? t.studentName,
      to: t.institution,
      // current department: the student's own dept first, then the request's
      department: t.student?.department?.nameAr ?? t.departmentRel?.nameAr ?? t.department ?? '—',
      date: t.createdAt.toISOString().slice(0, 10),
      status: t.status.toLowerCase(),
      system: rowSystem(t),
    }));

    // Pending/completed counts span both directions, so aggregate independently
    // of the two lists above rather than re-filtering them.
    const [incomingCount, outgoingCount, pendingCount, completedCount] = await Promise.all([
      prisma.transferRequest.count({ where: tenantWhere(guard.ctx, { direction: 'INCOMING' }) }),
      prisma.transferRequest.count({ where: tenantWhere(guard.ctx, { direction: 'OUTGOING' }) }),
      prisma.transferRequest.count({ where: tenantWhere(guard.ctx, { status: 'PENDING' }) }),
      prisma.transferRequest.count({ where: tenantWhere(guard.ctx, { status: { in: ['APPROVED', 'COMPLETED'] } }) }),
    ]);

    const stats: TransferStats = {
      incoming: incomingCount,
      outgoing: outgoingCount,
      pending: pendingCount,
      completed: completedCount,
    };

    // Pickers for the create dialog — an OUTGOING request needs a real student, an INCOMING one a
    // programme. Fetched only when the dialog asks for them (`?options=1`) and only for a registrar
    // who may actually create a request (same `transfer.approve` gate as POST).
    const canCreate = hasPermission(guard.ctx, 'transfer.approve');
    const wantOptions = canCreate && request.nextUrl.searchParams.get('options') === '1';
    // Annotated so the empty fallback is the SAME array type, not a `never[]` union `.map` cannot
    // be called on.
    const studentRows: Awaited<ReturnType<typeof loadStudentOptions>> =
      wantOptions ? await loadStudentOptions(guard.ctx.universityId) : [];
    const programRows: Awaited<ReturnType<typeof loadProgramOptions>> =
      wantOptions ? await loadProgramOptions(guard.ctx.universityId) : [];

    const students: StudentOption[] = studentRows.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      nameAr: s.nameAr,
      department: s.department?.nameAr ?? '—',
      program: s.program?.nameAr ?? '—',
      // null, not a default: a student with no programme cannot be attributed either.
      system: s.program ? normalizeSystem(s.program.academicSystem) : null,
    }));
    const programs: ProgramOption[] = programRows.map((p) => ({
      id: p.id,
      nameAr: p.nameAr,
      academicSystem: normalizeSystem(p.academicSystem),
    }));

    return NextResponse.json({ incoming, outgoing, stats, students, programs, canCreate });
  } catch (error) {
    console.error('Error listing transfers:', error);
    return NextResponse.json({ error: 'فشل في جلب طلبات التحويل' }, { status: 500 });
  }
}

// PATCH /api/institute/admission/transfers — update a single request's status,
// wiring the per-row action buttons. Mirrors the admissions PATCH guard/shape.
export async function PATCH(request: NextRequest) {
  try {
    const feat = await requireFeature('admission.transfers');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('transfer.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, status } = body ?? {};
    if (!id || !status) return NextResponse.json({ error: 'المعرف والحالة مطلوبان' }, { status: 400 });

    const next = String(status).toUpperCase();
    const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
    if (!allowed.includes(next)) return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });

    const existing = await prisma.transferRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const updated = await prisma.transferRequest.update({ where: { id }, data: { status: next } });
    return NextResponse.json({ transfer: updated });
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json({ error: 'فشل في تحديث طلب التحويل' }, { status: 500 });
  }
}

// POST /api/institute/admission/transfers — create a request. This is the module's missing half:
// until now the only rows in TransferRequest came from a seed script, so nothing in the app could
// ever attribute an INCOMING request to an academic system.
//
// The two directions are modelled differently on purpose:
// `programId` on the row is the programme this request is attributed to: transferred INTO for
// INCOMING, LEFT for OUTGOING. Either way it must end up set, so no direction can create a row that
// is attributable to no academic system at all:
//   · OUTGOING — the person IS a student here, so `studentId` is mandatory and the programme left
//     defaults to their own; when their file carries none, an explicit `programId` is required.
//   · INCOMING — there is no Student row yet, so `programId` (the programme being transferred INTO)
//     is mandatory: it is the ONLY link that can attribute the request to a system.
// Guarded with `transfer.approve`, the same write-side key the status PATCH uses — the transfer
// family has exactly two keys (view/approve) and creating a request is a write, not a read.
export async function POST(request: NextRequest) {
  try {
    const feat = await requireFeature('admission.transfers');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('transfer.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const direction = String(body?.direction ?? '').toUpperCase();
    const institution = String(body?.institution ?? '').trim();
    const notes = typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    const studentId = body?.studentId ? String(body.studentId) : null;
    const programId = body?.programId ? String(body.programId) : null;

    // Validated here, not only in the dialog: the dialog is one caller of this endpoint, not its gate.
    if (direction !== 'INCOMING' && direction !== 'OUTGOING') {
      return NextResponse.json({ error: 'اتجاه التحويل مطلوب (وارد أو صادر)' }, { status: 400 });
    }
    if (!institution) {
      return NextResponse.json({ error: 'اسم الجهة الأخرى مطلوب' }, { status: 400 });
    }

    let studentName = String(body?.studentName ?? '').trim();
    let departmentId: string | null = body?.departmentId ? String(body.departmentId) : null;
    let resolvedProgramId = programId;

    if (direction === 'OUTGOING') {
      if (!studentId) {
        return NextResponse.json({ error: 'اختيار الطالب إلزامي في التحويل الصادر' }, { status: 400 });
      }
      // Tenant-scoped like the programme lookup below: without it a registrar could attach another
      // university's student and stamp the row with their own universityId.
      const student = await prisma.student.findFirst({
        where: { id: studentId, ...tenantOrGlobalWhere(guard.ctx.universityId) },
        select: { id: true, nameAr: true, departmentId: true, programId: true },
      });
      if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
      // Snapshot the canonical name/department/programme off the student rather than trusting the
      // client's copy — the linked row is the source of truth, and programId is what later makes the
      // request attributable even if the student's own file is edited afterwards.
      studentName = student.nameAr;
      departmentId = departmentId ?? student.departmentId;
      resolvedProgramId = programId ?? student.programId;
      // Refuse a row no report or badge could ever attribute to a system. The dialog offers an
      // explicit programme picker for exactly this case (a student whose file carries none).
      if (!resolvedProgramId) {
        return NextResponse.json(
          { error: 'الطالب غير مرتبط ببرنامج — يجب تحديد البرنامج ليُنسب الطلب لنظام أكاديمي' },
          { status: 400 },
        );
      }
    } else {
      if (!resolvedProgramId) {
        return NextResponse.json(
          { error: 'اختيار البرنامج إلزامي في التحويل الوارد — منه يُحدَّد النظام الأكاديمي للطلب' },
          { status: 400 },
        );
      }
      if (!studentName) {
        return NextResponse.json({ error: 'اسم الطالب الوافد مطلوب' }, { status: 400 });
      }
    }

    if (resolvedProgramId) {
      const program = await prisma.program.findFirst({
        where: { id: resolvedProgramId, ...tenantOrGlobalWhere(guard.ctx.universityId) },
        select: { id: true, departmentId: true },
      });
      if (!program) return NextResponse.json({ error: 'البرنامج غير موجود' }, { status: 404 });
      // An incoming applicant has no department of their own; fall back to the programme's so the
      // «القسم المطلوب» column is not a permanent «—».
      departmentId = departmentId ?? program.departmentId ?? null;
    }

    const created = await prisma.transferRequest.create({
      data: {
        direction,
        studentName,
        studentId: direction === 'OUTGOING' ? studentId : null,
        institution,
        departmentId,
        programId: resolvedProgramId,
        notes,
        // status is left to the schema default (PENDING) so a new request enters the SAME status
        // flow the PATCH already drives — creation never skips a step of it.
        universityId: guard.ctx.universityId,
      },
    });

    return NextResponse.json({ transfer: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json({ error: 'فشل في إنشاء طلب التحويل' }, { status: 500 });
  }
}
