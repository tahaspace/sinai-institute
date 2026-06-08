import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

const DAY_ORDER = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// GET /api/student/schedule — weekly timetable for the student's department.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }
    if (!student.departmentId) {
      return NextResponse.json({ days: DAY_ORDER, weekSchedule: {} });
    }

    const schedule = await prisma.schedule.findFirst({
      where: { departmentId: student.departmentId },
      orderBy: { createdAt: 'desc' },
      include: { lectures: true },
    });

    const weekSchedule: Record<string, { period: number; subject: string; teacher: string; room: string; time: string }[]> = {};
    for (const day of DAY_ORDER) weekSchedule[day] = [];
    if (schedule) {
      for (const l of schedule.lectures) {
        if (!weekSchedule[l.day]) weekSchedule[l.day] = [];
        weekSchedule[l.day].push({
          period: 0, // assigned after sorting
          subject: l.course,
          teacher: l.instructor,
          room: l.room,
          time: `${l.startTime} - ${l.endTime}`,
        });
      }
      // sort each day by start time and number the periods
      for (const day of Object.keys(weekSchedule)) {
        weekSchedule[day].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
        weekSchedule[day].forEach((slot, i) => (slot.period = i + 1));
      }
    }

    return NextResponse.json({
      student: { id: student.id, studentCode: student.studentCode, name: student.nameAr },
      days: DAY_ORDER,
      weekSchedule,
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'فشل في جلب الجدول الدراسي' }, { status: 500 });
  }
}

// "8:00 - 8:45" -> minutes of start time
function toMinutes(time: string): number {
  const start = time.split('-')[0].trim();
  const [h, m] = start.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}
