import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';

// GET /api/faculty/courses — courses taught by the logged-in instructor.
export async function GET() {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) {
      return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });
    }

    const courses = await prisma.course.findMany({
      where: { instructorId: instructor.id },
      include: { _count: { select: { enrollments: true, assignments: true } } },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({
      instructor: { id: instructor.id, name: instructor.name, title: instructor.title },
      courses: courses.map((c) => ({
        id: c.id,
        code: c.code,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        creditHours: c.creditHours,
        students: c._count.enrollments,
        assignments: c._count.assignments,
      })),
    });
  } catch (error) {
    console.error('Error fetching faculty courses:', error);
    return NextResponse.json({ error: 'فشل في جلب المقررات' }, { status: 500 });
  }
}
