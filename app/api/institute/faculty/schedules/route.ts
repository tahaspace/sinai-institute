import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

const DAY_ORDER = ['السبت', 'الأحد', 'الاثنين', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// GET /api/institute/faculty/schedules — lecture grid (day → time slot → class).
export async function GET() {
  try {
    const guard = await requirePermission('workload.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const lectures = await prisma.lecture.findMany();

    // Build days + time slots from the actual lectures (self-consistent grid).
    const days = [...new Set(lectures.map((l) => l.day))].sort(
      (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
    );
    const slotOf = (l: (typeof lectures)[number]) => `${l.startTime}-${l.endTime}`;
    const timeSlots = [...new Set(lectures.map(slotOf))].sort((a, b) => {
      const m = (t: string) => {
        const [h, mm] = t.split('-')[0].split(':').map((n) => parseInt(n, 10));
        return (h || 0) * 60 + (mm || 0);
      };
      return m(a) - m(b);
    });

    const schedule: Record<string, Record<string, { course: string; room: string; instructor: string }>> = {};
    for (const day of days) schedule[day] = {};
    for (const l of lectures) {
      schedule[l.day] ??= {};
      schedule[l.day][slotOf(l)] = { course: l.course, room: l.room, instructor: l.instructor };
    }

    return NextResponse.json({ days, timeSlots, schedule });
  } catch (error) {
    console.error('Error building faculty schedules:', error);
    return NextResponse.json({ error: 'فشل في جلب الجداول' }, { status: 500 });
  }
}
