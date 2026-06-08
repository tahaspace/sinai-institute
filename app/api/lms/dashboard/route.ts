import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/student';
import { requireFeature } from '@/lib/authz';

// GET /api/lms/dashboard — LMS overview aggregated across content/classes/forums/assignments.
export async function GET() {
  try {
    const feat = await requireFeature('lms.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [contentCount, classes, topicCount, assignments, recentContent] = await Promise.all([
      prisma.lMSContent.count(),
      prisma.virtualClass.findMany({ orderBy: { date: 'asc' } }),
      prisma.forumTopic.count(),
      prisma.assignment.findMany({ include: { course: true }, orderBy: { dueDate: 'asc' } }),
      prisma.lMSContent.findMany({ orderBy: { createdAt: 'desc' }, take: 4 }),
    ]);

    const upcomingClasses = classes
      .filter((c) => c.status === 'upcoming' || c.status === 'scheduled' || c.status === 'live')
      .slice(0, 4)
      .map((c) => ({ id: c.id, title: c.title, date: c.date.toISOString().slice(0, 10), time: c.startTime, platform: c.platform, status: c.status }));

    const pendingAssignments = assignments.slice(0, 4).map((a) => ({
      id: a.id,
      title: a.title,
      course: a.course.nameAr,
      dueDate: a.dueDate.toISOString().slice(0, 10),
    }));

    return NextResponse.json({
      stats: {
        content: contentCount,
        classes: classes.length,
        topics: topicCount,
        assignments: assignments.length,
      },
      upcomingClasses,
      recentContent: recentContent.map((c) => ({ id: c.id, title: c.title, type: c.type, unit: c.unit ?? 'عام', views: c.views })),
      pendingAssignments,
    });
  } catch (error) {
    console.error('Error building LMS dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب لوحة التعلم' }, { status: 500 });
  }
}
