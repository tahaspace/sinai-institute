import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

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
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({
      courses: courses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.nameAr,
        nameEn: c.nameEn ?? '',
        department: c.department?.nameAr ?? '',
        departmentId: c.departmentId,
        creditHours: c.creditHours,
        instructor: c.instructor?.name ?? '',
        students: c._count.enrollments,
        // registrar flags + per-course grade split (Phase A)
        countsInGpa: c.countsInGpa,
        requirementType: c.requirementType,
        availableInSummer: c.availableInSummer,
        gradeSplit: { midterm: c.midtermMax, final: c.finalMax, practical: c.practicalMax, homework: c.homeworkMax },
      })),
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

// POST /api/institute/courses — add a course.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('course.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { code, nameAr, nameEn, creditHours, departmentId, instructorId } = body ?? {};
    if (!code || !nameAr) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });

    const course = await prisma.course.create({
      data: {
        code,
        nameAr,
        nameEn: nameEn || null,
        creditHours: creditHours ? parseInt(String(creditHours), 10) : 3,
        departmentId: departmentId || null,
        instructorId: instructorId || null,
      },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'فشل في إضافة المقرر' }, { status: 500 });
  }
}

// PATCH /api/institute/courses — update by id.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('course.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, ...data } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    if (typeof data.creditHours !== 'undefined') data.creditHours = parseInt(String(data.creditHours), 10);

    const course = await prisma.course.update({ where: { id }, data });
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'فشل في تحديث المقرر' }, { status: 500 });
  }
}
