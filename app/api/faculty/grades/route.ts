import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';
import { setEnrollmentResult } from '@/lib/gpa';

// Confirms the enrollment's course is taught by this instructor (authorization).
async function assertOwnedEnrollment(enrollmentId: string, instructorId: string) {
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { course: true } });
  if (!e || e.course.instructorId !== instructorId) return null;
  return e;
}

// GET /api/faculty/grades?courseId= — roster + current grades for a course.
export async function GET(request: NextRequest) {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    let courseId = searchParams.get('courseId');
    if (!courseId) {
      const first = await prisma.course.findFirst({ where: { instructorId: instructor.id }, orderBy: { code: 'asc' } });
      courseId = first?.id ?? null;
    }
    if (!courseId) return NextResponse.json({ course: null, roster: [] });

    const course = await prisma.course.findFirst({ where: { id: courseId, instructorId: instructor.id } });
    if (!course) return NextResponse.json({ error: 'غير مصرح بهذا المقرر' }, { status: 403 });

    const [enrollments, statuses] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: course.id },
        include: { student: true },
        orderBy: { student: { studentCode: 'asc' } },
      }),
      prisma.gradeStatus.findMany(),
    ]);
    const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));

    return NextResponse.json({
      course: { id: course.id, code: course.code, nameAr: course.nameAr, midtermMax: course.midtermMax, finalMax: course.finalMax, practicalMax: course.practicalMax, homeworkMax: course.homeworkMax },
      roster: enrollments.map((e) => ({
        enrollmentId: e.id,
        studentId: e.studentId,
        studentCode: e.student.studentCode,
        name: e.student.nameAr,
        midterm: e.midterm,
        final: e.final,
        practical: e.practical,
        homework: e.homework,
        letterGrade: e.letterGrade,
        gradeStatusCode: e.gradeStatusCode,
        statusName: e.gradeStatusCode ? nameByCode.get(e.gradeStatusCode) ?? null : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching faculty grades:', error);
    return NextResponse.json({ error: 'فشل في جلب الدرجات' }, { status: 500 });
  }
}

// PATCH /api/faculty/grades — write grade components for one enrollment.
// This is the cross-portal write: the student then reads it in /api/student/grades.
// All grade resolution (letter, board-fail, points) + CGPA recompute happens in
// the shared write path so faculty and control entry stay consistent.
export async function PATCH(request: NextRequest) {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const body = await request.json();
    const { enrollmentId, midterm, final, practical, homework } = body ?? {};
    if (!enrollmentId) return NextResponse.json({ error: 'معرف التسجيل مطلوب' }, { status: 400 });

    const owned = await assertOwnedEnrollment(enrollmentId, instructor.id);
    if (!owned) return NextResponse.json({ error: 'غير مصرح بتعديل هذه الدرجة' }, { status: 403 });

    const result = await setEnrollmentResult(enrollmentId, {
      components: { midterm, final, practical, homework },
    });

    return NextResponse.json({
      ok: true,
      enrollment: {
        id: result.id,
        letterGrade: result.letterGrade,
        gradeStatusCode: result.gradeStatusCode,
        statusName: result.statusName,
      },
      cgpa: result.cgpa,
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json({ error: 'فشل في حفظ الدرجة' }, { status: 500 });
  }
}
