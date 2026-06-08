import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

// GET /api/student/elearning — courses w/ lesson progress, lessons, virtual classes, online exams.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const [enrollments, content, progress, vclasses, examSessions] = await Promise.all([
      prisma.enrollment.findMany({ where: { studentId: student.id }, include: { course: { include: { instructor: true } } } }),
      prisma.lMSContent.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.lessonProgress.findMany({ where: { studentId: student.id } }),
      prisma.virtualClass.findMany({ orderBy: { date: 'desc' } }),
      prisma.examSession.findMany({ include: { course: true }, orderBy: { date: 'desc' } }),
    ]);

    const progressOf = new Map(progress.map((p) => [p.contentId, p.status]));

    const courses = enrollments.map((e) => {
      const lessons = content.filter((c) => c.courseId === e.courseId);
      const completed = lessons.filter((l) => progressOf.get(l.id) === 'completed').length;
      return {
        id: e.courseId,
        name: e.course.nameAr,
        teacher: e.course.instructor?.name ?? '',
        lessons: lessons.length,
        completed,
      };
    });

    const lessons = content.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      status: progressOf.get(c.id) ?? 'locked',
    }));

    const now = Date.now();
    const virtualClasses = vclasses.map((v) => ({
      id: v.id,
      subject: v.title,
      date: v.date.toISOString().slice(0, 10),
      time: v.startTime,
      status: v.status,
    }));

    // online exams with this student's grade (via their enrollment in the course)
    const onlineExams = examSessions.map((s) => {
      const enr = enrollments.find((e) => e.courseId === s.courseId);
      const max = s.course.midtermMax + s.course.finalMax + s.course.practicalMax + s.course.homeworkMax;
      const graded = enr && enr.final != null;
      return {
        id: s.id,
        subject: s.course.nameAr,
        title: s.title ?? `امتحان ${s.course.nameAr}`,
        date: s.date.toISOString().slice(0, 10),
        status: s.date.getTime() > now ? 'upcoming' : 'completed',
        grade: graded ? (enr!.midterm ?? 0) + (enr!.final ?? 0) + (enr!.practical ?? 0) + (enr!.homework ?? 0) : null,
        maxGrade: graded ? max : null,
      };
    });

    return NextResponse.json({ courses, lessons, virtualClasses, onlineExams });
  } catch (error) {
    console.error('Error building elearning:', error);
    return NextResponse.json({ error: 'فشل في جلب التعلم الإلكتروني' }, { status: 500 });
  }
}
