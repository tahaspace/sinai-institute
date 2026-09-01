import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('student.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { nameAr, nameEn, email, departmentId, programId, level, enrollYear } = body ?? {};
    if (!nameAr) return NextResponse.json({ error: 'اسم الطالب مطلوب' }, { status: 400 });

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
        programId: programId || null,
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
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('student.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, ...data } = body ?? {};
    if (!id) return NextResponse.json({ error: 'معرف الطالب مطلوب' }, { status: 400 });
    if (typeof data.level !== 'undefined') data.level = parseInt(String(data.level), 10);

    const student = await prisma.student.update({ where: { id }, data });
    return NextResponse.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'فشل في تحديث الطالب' }, { status: 500 });
  }
}
