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
        isGraduationProject: c.isGraduationProject,
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

    const course = await prisma.course.create({
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

    if (typeof data.requirementType !== 'undefined' && !['mandatory', 'elective'].includes(data.requirementType)) {
      return NextResponse.json({ error: 'نوع المقرر غير صالح' }, { status: 400 });
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

    const course = await prisma.course.update({ where: { id }, data });
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'فشل في تحديث المقرر' }, { status: 500 });
  }
}
