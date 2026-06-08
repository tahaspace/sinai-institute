import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/student';
import { requireFeature } from '@/lib/authz';

// GET /api/lms/exams?courseId= — exam sessions + results for a course.
export async function GET(request: NextRequest) {
  try {
    const feat = await requireFeature('lms.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const sessions = await prisma.examSession.findMany({
      include: { course: { include: { _count: { select: { enrollments: true, examQuestions: true } } } } },
      orderBy: { date: 'asc' },
    });

    const now = Date.now();
    const exams = sessions.map((s) => {
      const start = s.date.getTime();
      const end = start + s.durationMins * 60000;
      const status = now > end ? 'completed' : now >= start ? 'live' : 'scheduled';
      return {
        id: s.id,
        title: s.title ?? `امتحان ${s.course.nameAr}`,
        subject: s.course.nameAr,
        date: s.date.toISOString().slice(0, 10),
        time: s.startTime,
        duration: s.durationMins,
        questions: s.course._count.examQuestions,
        participants: s.course._count.enrollments,
        status,
      };
    });

    // Results for the first course that has graded enrollments
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') ?? sessions[0]?.courseId ?? null;
    let examResults: { id: string; student: string; grade: number; maxGrade: number; status: string }[] = [];
    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      const max = course ? course.midtermMax + course.finalMax + course.practicalMax + course.homeworkMax : 100;
      const enrollments = await prisma.enrollment.findMany({ where: { courseId, final: { not: null } }, include: { student: true } });
      examResults = enrollments.map((e) => ({
        id: e.id,
        student: e.student.nameAr,
        grade: (e.midterm ?? 0) + (e.final ?? 0) + (e.practical ?? 0) + (e.homework ?? 0),
        maxGrade: max,
        status: 'completed',
      }));
    }

    return NextResponse.json({
      exams,
      examResults,
      stats: {
        total: exams.length,
        scheduled: exams.filter((e) => e.status === 'scheduled').length,
        live: exams.filter((e) => e.status === 'live').length,
        completed: exams.filter((e) => e.status === 'completed').length,
      },
    });
  } catch (error) {
    console.error('Error listing lms exams:', error);
    return NextResponse.json({ error: 'فشل في جلب الاختبارات' }, { status: 500 });
  }
}
