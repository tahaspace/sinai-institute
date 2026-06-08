import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const toMinutes = (t: string) => {
  const [h, m] = t.trim().split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

// GET /api/assistant/dashboard — at-a-glance for the logged-in teaching
// assistant (معيد). A معيد is modelled as an Instructor (no dedicated role/model),
// so we resolve and derive exactly like /api/faculty/dashboard.
export async function GET() {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'المعيد غير موجود' }, { status: 404 });

    const courses = await prisma.course.findMany({
      where: { instructorId: instructor.id },
      include: { enrollments: true },
    });
    const courseIds = courses.map((c) => c.id);
    const courseNames = courses.map((c) => c.nameAr);

    // Distinct students across the assistant's courses
    const studentIds = new Set<string>();
    for (const c of courses) {
      for (const e of c.enrollments) studentIds.add(e.studentId);
    }

    // Assignment submissions handed in but not yet graded ("submitted").
    const needsGrading = courseIds.length
      ? await prisma.assignmentSubmission.count({
          where: { status: 'submitted', assignment: { courseId: { in: courseIds } } },
        })
      : 0;

    // Weekly lecture (section) template for this assistant. Lecture has no per-date
    // field — these are recurring weekly slots, hence "السكاشن الأسبوعية".
    const lectures = await prisma.lecture.findMany({
      where: { OR: [{ instructor: instructor.name }, { course: { in: courseNames } }] },
    });
    const weeklySchedule = lectures
      .sort((a, b) => {
        const d = DAY_NAMES.indexOf(a.day) - DAY_NAMES.indexOf(b.day);
        return d !== 0 ? d : toMinutes(a.startTime) - toMinutes(b.startTime);
      })
      .map((l, i) => ({
        id: i + 1,
        subject: l.course,
        time: `${l.startTime} - ${l.endTime}`,
        room: l.room,
        day: l.day,
      }));

    return NextResponse.json({
      instructor: { id: instructor.id, name: instructor.name, title: instructor.title ?? '' },
      stats: {
        courses: courses.length,
        students: studentIds.size,
        needsGrading,
        weeklySections: lectures.length,
      },
      weeklySchedule,
    });
  } catch (error) {
    console.error('Error fetching assistant dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب لوحة التحكم' }, { status: 500 });
  }
}
