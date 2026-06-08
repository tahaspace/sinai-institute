import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';

const DAY_ORDER = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const toMinutes = (time: string) => {
  const [h, m] = time.split('-')[0].trim().split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

// GET /api/faculty/schedule — the instructor's teaching timetable (from shared Lecture rows).
export async function GET() {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    // Lectures store the instructor's display name; match the instructor's courses too.
    const courseNames = (
      await prisma.course.findMany({ where: { instructorId: instructor.id }, select: { nameAr: true } })
    ).map((c) => c.nameAr);

    const lectures = await prisma.lecture.findMany({
      where: { OR: [{ instructor: instructor.name }, { course: { in: courseNames } }] },
    });

    const weekSchedule: Record<string, { period: number; subject: string; room: string; time: string }[]> = {};
    for (const day of DAY_ORDER) weekSchedule[day] = [];
    for (const l of lectures) {
      if (!weekSchedule[l.day]) weekSchedule[l.day] = [];
      weekSchedule[l.day].push({ period: 0, subject: l.course, room: l.room, time: `${l.startTime} - ${l.endTime}` });
    }
    for (const day of Object.keys(weekSchedule)) {
      weekSchedule[day].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
      weekSchedule[day].forEach((s, i) => (s.period = i + 1));
    }

    return NextResponse.json({
      instructor: { id: instructor.id, name: instructor.name },
      days: DAY_ORDER,
      weekSchedule,
    });
  } catch (error) {
    console.error('Error fetching faculty schedule:', error);
    return NextResponse.json({ error: 'فشل في جلب الجدول' }, { status: 500 });
  }
}
