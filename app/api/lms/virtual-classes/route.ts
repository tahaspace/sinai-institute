import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/student';

// GET /api/lms/virtual-classes — scheduled live classes + recordings + stats.
export async function GET() {
  try {
    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const classes = await prisma.virtualClass.findMany({ orderBy: { date: 'desc' } });

    const virtualClasses = classes.map((c) => ({
      id: c.id,
      title: c.title,
      date: c.date.toISOString().slice(0, 10),
      time: c.startTime,
      durationMins: c.durationMins,
      platform: c.platform,
      status: c.status,
      recordingUrl: c.recordingUrl ?? null,
    }));

    const recordings = virtualClasses.filter((c) => c.recordingUrl);
    return NextResponse.json({
      virtualClasses,
      recordings,
      stats: {
        total: virtualClasses.length,
        live: virtualClasses.filter((c) => c.status === 'live').length,
        upcoming: virtualClasses.filter((c) => c.status === 'upcoming' || c.status === 'scheduled').length,
        ended: virtualClasses.filter((c) => c.status === 'ended').length,
      },
    });
  } catch (error) {
    console.error('Error listing virtual classes:', error);
    return NextResponse.json({ error: 'فشل في جلب الفصول الافتراضية' }, { status: 500 });
  }
}
