import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const toMinutes = (t: string) => {
  const [h, m] = t.trim().split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

// GET /api/student/dashboard — aggregates the student's day at a glance.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    const [attendance, subs, schedule] = await Promise.all([
      prisma.attendance.findMany({ where: { studentId: student.id } }),
      prisma.assignmentSubmission.findMany({
        where: { studentId: student.id },
        include: { assignment: { include: { course: true } } },
      }),
      student.departmentId
        ? prisma.schedule.findFirst({
            where: { departmentId: student.departmentId },
            orderBy: { createdAt: 'desc' },
            include: { lectures: true },
          })
        : Promise.resolve(null),
    ]);

    // Attendance %
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === 'present').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    // Assignment progress
    const completedAssignments = subs.filter((s) => s.status === 'submitted' || s.status === 'graded').length;
    const totalAssignments = subs.length;

    // Today's schedule with live status
    const now = new Date();
    const todayName = DAY_NAMES[now.getDay()];
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const todaySchedule = (schedule?.lectures ?? [])
      .filter((l) => l.day === todayName)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
      .map((l, i) => {
        const start = toMinutes(l.startTime);
        const end = toMinutes(l.endTime);
        const status = nowMin > end ? 'completed' : nowMin >= start ? 'current' : 'upcoming';
        return {
          id: i + 1,
          subject: l.course,
          time: `${l.startTime} - ${l.endTime}`,
          teacher: l.instructor,
          room: l.room,
          status,
        };
      });

    // Upcoming assignments (pending, due soonest)
    const upcomingAssignments = subs
      .filter((s) => s.status === 'pending')
      .sort((a, b) => a.assignment.dueDate.getTime() - b.assignment.dueDate.getTime())
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        subject: s.assignment.course.nameAr,
        title: s.assignment.title,
        dueDate: s.assignment.dueDate.toISOString().slice(0, 10),
        status: s.status,
      }));

    // Recent grades (most recently graded submissions)
    const recentGrades = subs
      .filter((s) => s.grade != null)
      .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        subject: s.assignment.course.nameAr,
        exam: s.assignment.title,
        grade: s.grade,
        total: s.assignment.maxGrade,
        date: (s.submittedAt ?? s.assignment.dueDate).toISOString().slice(0, 10),
      }));

    // Notifications derived from recent activity (no separate table needed)
    const notifications = [
      ...subs
        .filter((s) => s.grade != null)
        .slice(0, 2)
        .map((s) => ({ id: `grade-${s.id}`, type: 'grade', message: `تم رصد درجة ${s.assignment.title}`, time: '' })),
      ...upcomingAssignments.slice(0, 2).map((a) => ({
        id: `assign-${a.id}`,
        type: 'assignment',
        message: `واجب قادم في ${a.subject}: ${a.title}`,
        time: '',
      })),
    ].slice(0, 4);

    return NextResponse.json({
      student: { id: student.id, studentCode: student.studentCode, name: student.nameAr },
      stats: { attendance: attendancePct, gpa: student.gpa, completedAssignments, totalAssignments },
      todaySchedule,
      upcomingAssignments,
      recentGrades,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب لوحة التحكم' }, { status: 500 });
  }
}
