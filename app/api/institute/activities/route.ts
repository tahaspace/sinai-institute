import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/activities — student activities/clubs with summary stats.
export async function GET() {
  try {
    const guard = await requirePermission('activities.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const activities = await prisma.activity.findMany({ orderBy: { createdAt: 'desc' } });

    const active = activities.filter((a) => a.status === 'active').length;
    const totalMembers = activities.reduce((sum, a) => sum + a.members, 0);

    return NextResponse.json({
      activities: activities.map((a) => ({
        id: a.id,
        name: a.name,
        members: a.members,
        type: a.type ?? '',
        nextEvent: a.nextEvent ?? '',
        date: a.date ? a.date.toISOString().slice(0, 10) : '',
      })),
      stats: { active, totalMembers, total: activities.length },
    });
  } catch (error) {
    console.error('Error listing activities:', error);
    return NextResponse.json({ error: 'فشل في جلب الأنشطة' }, { status: 500 });
  }
}
