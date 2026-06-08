import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';

// GET /api/faculty/students — distinct students enrolled in the instructor's courses.
export async function GET() {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) {
      return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { course: { instructorId: instructor.id } },
      include: { student: true, course: true },
    });

    // Group enrollments by student → one row per student with their courses.
    const byStudent = new Map<string, { id: string; studentCode: string; name: string; level: number; gpa: number; courses: string[] }>();
    for (const e of enrollments) {
      const s = e.student;
      const row = byStudent.get(s.id) ?? {
        id: s.id,
        studentCode: s.studentCode,
        name: s.nameAr,
        level: s.level,
        gpa: s.gpa,
        courses: [],
      };
      row.courses.push(e.course.nameAr);
      byStudent.set(s.id, row);
    }

    return NextResponse.json({
      instructor: { id: instructor.id, name: instructor.name },
      students: [...byStudent.values()].sort((a, b) => a.studentCode.localeCompare(b.studentCode)),
    });
  } catch (error) {
    console.error('Error fetching faculty students:', error);
    return NextResponse.json({ error: 'فشل في جلب الطلاب' }, { status: 500 });
  }
}
