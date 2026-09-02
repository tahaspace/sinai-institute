import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { currentUserId } from '@/lib/student';
import { normalizeSystem } from '@/lib/academic-system';
import { parseImportBuffer, validateImportRows, commitImport, programTenantWhere } from '@/lib/student-import';

// GET /api/institute/students/import — the programme picker for the import screen.
// It deliberately does NOT reuse /api/institute/programs: that route is gated on 'program.view',
// which the REGISTRAR bundle (prisma/rbac/catalog.ts — the role that actually owns 'student.import')
// does not hold. Reading the list through it returned 403, the picker stayed empty and bulk import
// became unusable for its primary user. Same gate as the import itself, minimum fields.
export async function GET() {
  try {
    const guard = await requirePermission('student.import');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const programs = await prisma.program.findMany({
      where: { isActive: true, ...programTenantWhere(guard.ctx.universityId) },
      select: { id: true, nameAr: true, academicSystem: true },
      orderBy: { nameAr: 'asc' },
    });
    return NextResponse.json({
      programs: programs.map((p) => ({ id: p.id, nameAr: p.nameAr, academicSystem: normalizeSystem(p.academicSystem) })),
    });
  } catch (error) {
    console.error('Error listing import programs:', error);
    return NextResponse.json({ error: 'فشل في جلب البرامج' }, { status: 500 });
  }
}

// POST /api/institute/students/import — multipart: file + action=preview|commit + cohort opts.
// `programId` is mandatory on BOTH actions: the academic system is derived from the programme.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.import');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const form = await request.formData();
    const file = form.get('file');
    const action = String(form.get('action') ?? 'preview');
    if (!file || typeof file === 'string' || typeof (file as Blob).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'يرجى رفع ملف Excel/CSV' }, { status: 400 });
    }
    const buf = Buffer.from(await (file as Blob).arrayBuffer());

    let rows: Record<string, string>[];
    try { rows = parseImportBuffer(buf); }
    catch { return NextResponse.json({ error: 'تعذّر قراءة الملف — تأكد أنه Excel/CSV صحيح' }, { status: 400 }); }
    if (!rows.length) return NextResponse.json({ error: 'الملف فارغ أو لا يحتوي على أعمدة معروفة' }, { status: 400 });

    // The academic system is a property of the PROGRAMME, so an import with no programme creates
    // students who silently default to credit-hours. Required for preview too: the preview must
    // show which system each row lands in, and it cannot do that without the cohort programme.
    // A client-side gate is not a gate — this is the enforcing one.
    const programId = String(form.get('programId') ?? '').trim();
    if (!programId) {
      return NextResponse.json(
        { error: 'يجب اختيار البرنامج أولاً — النظام الأكاديمي (ساعات معتمدة / سنوي) يُشتق من البرنامج ولا يُفترض تلقائيًا' },
        { status: 400 },
      );
    }
    // Non-empty is not enough: a stale/deleted/forged id makes getProgramSystem-style defaults report
    // a confident «نظام الساعات المعتمدة» for a whole batch, and the commit then fails per row with an
    // opaque FK message. Fail fast, and only for a programme inside the caller's own institution.
    const cohortProgram = await prisma.program.findFirst({
      where: { id: programId, isActive: true, ...programTenantWhere(guard.ctx.universityId) },
      select: { id: true },
    });
    if (!cohortProgram) {
      return NextResponse.json({ error: 'البرنامج المحدد غير موجود ضمن مؤسستك — أعد اختيار البرنامج' }, { status: 400 });
    }

    if (action === 'preview') {
      const v = await validateImportRows(rows, { programId, universityId: guard.ctx.universityId });
      return NextResponse.json({ preview: v.rows.slice(0, 500), total: rows.length, validCount: v.validCount, errorCount: v.errorCount, systemCounts: v.systemCounts, overrideCount: v.overrideCount });
    }

    const opts = {
      academicYear: String(form.get('academicYear') ?? '').trim(),
      semester: String(form.get('semester') ?? 'first'),
      programId,
      facultyId: (form.get('facultyId') as string) || null,
      departmentId: (form.get('departmentId') as string) || null,
      level: parseInt(String(form.get('level') ?? '1'), 10) || 1,
      universityId: guard.ctx.universityId,
      fileName: (file as File).name ?? null,
    };
    if (!opts.academicYear) return NextResponse.json({ error: 'العام الأكاديمي مطلوب' }, { status: 400 });
    const res = await commitImport(rows, opts, await currentUserId());
    return NextResponse.json({ ok: true, ...res });
  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json({ error: 'فشل في استيراد الطلاب' }, { status: 500 });
  }
}
