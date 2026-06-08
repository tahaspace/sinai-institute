import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/online-exams — exam sessions presented as the online-exam list.
export async function GET() {
  try {
    const guard = await requirePermission('onlineexam.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const sessions = await prisma.examSession.findMany({
      include: {
        course: {
          include: { _count: { select: { enrollments: true, examQuestions: true } } },
        },
      },
      orderBy: { date: 'asc' },
    });

    const now = Date.now();
    const exams = sessions.map((s) => {
      const start = s.date.getTime();
      const end = start + s.durationMins * 60000;
      const status = now > end ? 'completed' : now >= start ? 'active' : 'scheduled';
      return {
        id: s.id,
        title: s.title ?? `امتحان ${s.course.nameAr}`,
        course: s.course.nameAr,
        code: s.course.code,
        date: s.date.toISOString().slice(0, 10),
        time: s.startTime,
        durationMins: s.durationMins,
        questions: s.course._count.examQuestions,
        participants: s.course._count.enrollments,
        status,
      };
    });

    return NextResponse.json({
      exams,
      stats: {
        total: exams.length,
        active: exams.filter((e) => e.status === 'active').length,
        scheduled: exams.filter((e) => e.status === 'scheduled').length,
        completed: exams.filter((e) => e.status === 'completed').length,
        totalQuestions: exams.reduce((s, e) => s + e.questions, 0),
      },
    });
  } catch (error) {
    console.error('Error listing online exams:', error);
    return NextResponse.json({ error: 'فشل في جلب الامتحانات الإلكترونية' }, { status: 500 });
  }
}
