import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const toMinutes = (t: string) => {
  const [h, m] = t.trim().split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

// GET /api/faculty/dashboard — at-a-glance for the logged-in instructor.
export async function GET() {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const courses = await prisma.course.findMany({
      where: { instructorId: instructor.id },
      include: { enrollments: { include: { student: true } } },
    });
    const courseNames = courses.map((c) => c.nameAr);

    // Distinct students across the instructor's courses
    const studentMap = new Map<string, { name: string; studentCode: string }>();
    let ungraded = 0;
    for (const c of courses) {
      for (const e of c.enrollments) {
        studentMap.set(e.studentId, { name: e.student.nameAr, studentCode: e.student.studentCode });
        if (e.final == null) ungraded++;
      }
    }

    // Today's lectures for this instructor
    const todayName = DAY_NAMES[new Date().getDay()];
    const lectures = await prisma.lecture.findMany({
      where: { day: todayName, OR: [{ instructor: instructor.name }, { course: { in: courseNames } }] },
    });
    const todaySchedule = lectures
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
      .map((l, i) => ({ id: i + 1, subject: l.course, time: `${l.startTime} - ${l.endTime}`, room: l.room }));

    const recentStudents = [...studentMap.values()].slice(0, 5);

    return NextResponse.json({
      instructor: { id: instructor.id, name: instructor.name, title: instructor.title ?? '' },
      stats: {
        courses: courses.length,
        students: studentMap.size,
        ungraded,
        publications: await prisma.publication.count({ where: { instructorId: instructor.id } }),
      },
      todaySchedule,
      recentStudents,
    });
  } catch (error) {
    console.error('Error fetching faculty dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب لوحة التحكم' }, { status: 500 });
  }
}
