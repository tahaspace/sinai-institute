import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/exams — exam schedule (ExamSession) + stats.
export async function GET() {
  try {
    const guard = await requirePermission('exam.schedule.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const sessions = await prisma.examSession.findMany({
      include: { course: { include: { department: true, _count: { select: { enrollments: true } } } } },
      orderBy: { date: 'asc' },
    });

    const schedules = sessions.map((s) => ({
      id: s.id,
      course: s.course.nameAr,
      code: s.course.code,
      department: s.course.department?.nameAr ?? '',
      date: s.date.toISOString().slice(0, 10),
      time: s.startTime,
      durationMins: s.durationMins,
      duration: `${Math.round((s.durationMins / 60) * 10) / 10} ساعات`,
      hall: s.hall ?? '-',
      students: s.course._count.enrollments,
      examType: s.examType,
    }));

    const totalStudents = sessions.reduce((sum, s) => sum + s.course._count.enrollments, 0);
    return NextResponse.json({
      schedules,
      stats: {
        total: schedules.length,
        thisWeek: schedules.length, // all seeded in the exam window
        studentsRegistered: totalStudents,
        published: 0,
      },
    });
  } catch (error) {
    console.error('Error listing exams:', error);
    return NextResponse.json({ error: 'فشل في جلب جداول الامتحانات' }, { status: 500 });
  }
}

// POST /api/institute/exams — schedule a new exam.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.schedule.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { courseId, title, examType, date, startTime, durationMins, hall } = body ?? {};
    if (!courseId || !date) return NextResponse.json({ error: 'المقرر والتاريخ مطلوبان' }, { status: 400 });

    const session = await prisma.examSession.create({
      data: {
        courseId,
        title: title || null,
        examType: examType || 'final',
        date: new Date(date),
        startTime: startTime || '9:00 AM',
        durationMins: durationMins ? parseInt(String(durationMins), 10) : 120,
        hall: hall || null,
      },
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'فشل في إضافة الامتحان' }, { status: 500 });
  }
}
