import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import { normalizeSystem } from '@/lib/academic-system';
import { requirePermission } from '@/lib/authz';

const LEVELS = ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'];
const levelLabel = (n: number) => LEVELS[n] ?? String(n);
const statusLabel = (s: string) =>
  ({ ACTIVE: 'منتظم', WARNING1: 'إنذار أول', WARNING2: 'إنذار ثاني', GRADUATED: 'خريج', SUSPENDED: 'موقوف' } as Record<string, string>)[s] ?? s;

// GET /api/institute/students?search=&departmentId=&level=
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('student.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const departmentId = searchParams.get('departmentId');
    const level = searchParams.get('level');

    const where: Record<string, unknown> = {};
    if (departmentId && departmentId !== 'all') where.departmentId = departmentId;
    if (level && level !== 'all') where.level = parseInt(level, 10);
    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: 'insensitive' } },
        { studentCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        department: true,
        program: true,
        enrollments: { where: { status: 'COMPLETED' }, include: { course: true } },
      },
      orderBy: { studentCode: 'asc' },
    });

    const rows = students.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      name: s.nameAr,
      email: s.email ?? '',
      department: s.department?.nameAr ?? '',
      departmentId: s.departmentId,
      program: s.program?.nameAr ?? '',
      programId: s.programId,
      level: levelLabel(s.level),
      levelNum: s.level,
      gpa: s.gpa,
      // Program-driven, resolved server-side — the client filters/renders on this, never guesses it.
      system: normalizeSystem(s.program?.academicSystem),
      creditHours: s.enrollments.reduce((sum, e) => sum + (e.course?.creditHours ?? 0), 0),
      status: statusLabel(s.status),
      statusCode: s.status,
    }));

    // Annual-system students have no CGPA at all (lib/gpa.ts stores raw marks only for them), so
    // their stored 0 must not enter the average — including them silently drags the institute mean down.
    const creditRows = rows.filter((r) => r.system === 'CREDIT_HOURS');
    const avgGpa = creditRows.length ? creditRows.reduce((a, r) => a + r.gpa, 0) / creditRows.length : 0;
    return NextResponse.json({
      students: rows,
      stats: { total: rows.length, avgGpa: Number(avgGpa.toFixed(2)) },
    });
  } catch (error) {
    console.error('Error listing students:', error);
    return NextResponse.json({ error: 'فشل في جلب الطلاب' }, { status: 500 });
  }
}

// POST /api/institute/students — create a student.
//
// No page in this repo calls it (grepped: the only fetch of this path is the students list GET;
// «قبول طالب جديد» links to /institute/admission, and bulk creation goes through
// /api/institute/students/import). It is still a live, deployed HTTP route that anyone holding
// `student.create` — the ADMISSIONS role does — can POST to directly, so it is a real second door
// onto the same silent default and is guarded like the first: `programId` is REQUIRED, because the
// programme is the only carrier of the academic system.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { nameAr, nameEn, email, departmentId, programId, level, enrollYear } = body ?? {};
    if (!nameAr) return NextResponse.json({ error: 'اسم الطالب مطلوب' }, { status: 400 });

    // A student with no programme is a student with no academic system: Program.academicSystem is
    // what decides credit-hours vs annual, and both normalizeSystem() and academicSystemWhere()
    // fall back to CREDIT_HOURS for a null programme. Accepting the field as optional therefore
    // means silently classifying the student — so refuse instead of defaulting.
    const explicitProgramId = typeof programId === 'string' && programId.trim() ? programId.trim() : null;
    if (!explicitProgramId) {
      return NextResponse.json(
        {
          error:
            'البرنامج مطلوب — منه يُحدَّد النظام الأكاديمي للطالب (نظام الساعات المعتمدة أو النظام السنوي).',
        },
        { status: 400 },
      );
    }
    // Verify it resolves, so a bad id fails as a readable 400 rather than a foreign-key 500.
    const program = await prisma.program.findUnique({
      where: { id: explicitProgramId },
      select: { id: true },
    });
    if (!program) return NextResponse.json({ error: 'البرنامج المحدد غير موجود' }, { status: 400 });

    // Generate a sequential-ish student code for the year.
    const year = enrollYear || new Date().getFullYear();
    const count = await prisma.student.count();
    const studentCode = body.studentCode || `${year}-${String(count + 1).padStart(4, '0')}`;

    const student = await prisma.student.create({
      data: {
        studentCode,
        nameAr,
        nameEn: nameEn || null,
        email: email || null,
        departmentId: departmentId || null,
        programId: explicitProgramId,
        level: level ? parseInt(String(level), 10) : 1,
        enrollYear: year,
        status: 'ACTIVE',
      },
    });
    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'فشل في إضافة الطالب' }, { status: 500 });
  }
}

// PATCH /api/institute/students — update a student by id.
//
// Same door as POST, so it owes the same contract on the one field that is not an ordinary column:
// `programId` carries the academic system, so it may be CHANGED but never REMOVED. Without this
// guard a single `{ id, programId: null }` under `student.edit` walks an existing student straight
// back into the silent credit-hours default POST above refuses to create — academicSystemWhere()
// buckets `programId: null` as credit-hours and resolveStudentSystem() returns CREDIT_HOURS for it,
// so the mis-classification is invisible until grading or promotion months later.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('student.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, ...data } = body ?? {};
    if (!id) return NextResponse.json({ error: 'معرف الطالب مطلوب' }, { status: 400 });
    if (typeof data.level !== 'undefined') data.level = parseInt(String(data.level), 10);

    // Only when the caller actually sends the key — an update that omits `programId` leaves the
    // existing link untouched, exactly as before. Trimmed like POST so both doors read one input.
    if ('programId' in data) {
      const pid =
        typeof data.programId === 'string' && data.programId.trim() ? data.programId.trim() : null;
      if (!pid) {
        return NextResponse.json(
          {
            error:
              'لا يمكن إزالة برنامج الطالب — منه يُحدَّد النظام الأكاديمي (نظام الساعات المعتمدة أو النظام السنوي).',
          },
          { status: 400 },
        );
      }
      // Read it back like POST does: a stale or forged id must fail as a readable 400, not as an
      // opaque foreign-key 500 that says nothing about which field was wrong.
      const program = await prisma.program.findFirst({
        where: { id: pid, isActive: true, ...tenantOrGlobalWhere(guard.ctx.universityId) },
        select: { id: true },
      });
      if (!program) return NextResponse.json({ error: 'البرنامج المحدد غير موجود' }, { status: 400 });
      data.programId = pid;
    }

    // `program` is the relation form of the same column: { program: { disconnect: true } } nulls
    // programId without ever naming the scalar, so the guard above would not see it. Refuse the
    // relation form outright rather than trying to interpret every shape Prisma accepts.
    if ('program' in data) {
      return NextResponse.json(
        { error: 'استخدم programId لتغيير برنامج الطالب — لا يمكن فصل البرنامج عن الطالب.' },
        { status: 400 },
      );
    }

    const student = await prisma.student.update({ where: { id }, data });
    return NextResponse.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'فشل في تحديث الطالب' }, { status: 500 });
  }
}
