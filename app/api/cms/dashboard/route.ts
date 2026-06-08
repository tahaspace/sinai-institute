import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/cms/dashboard — CMS landing overview: quick counts + a merged,
// time-sorted recent-activity feed (applications + complaints + published news).
// Staff-only (institute/CMS). Mirrors the aggregate pattern of /api/lms/dashboard.
export async function GET() {
  try {
    const guard = await requirePermission('cms.page.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [
      newApplications,
      pendingComplaints,
      availableResults,
      recentApplications,
      recentComplaints,
      recentNews,
    ] = await Promise.all([
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.complaint.count({ where: { status: 'PENDING' } }),
      prisma.result.count({ where: { isVisible: true } }),
      prisma.application.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.complaint.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.news.findMany({
        where: { isPublished: true },
        orderBy: { publishDate: 'desc' },
        take: 5,
      }),
    ]);

    type Activity = {
      id: string;
      type: 'application' | 'complaint' | 'news';
      label: string;
      detail: string | null;
      at: string; // ISO timestamp
    };

    const activity: Activity[] = [
      ...recentApplications.map((a) => ({
        id: a.id,
        type: 'application' as const,
        label: `طلب تقديم جديد من ${a.fullName}`,
        detail: a.firstChoice,
        at: a.createdAt.toISOString(),
      })),
      ...recentComplaints.map((c) => ({
        id: c.id,
        type: 'complaint' as const,
        label: `شكوى جديدة من ${c.studentName}`,
        detail: c.type,
        at: c.createdAt.toISOString(),
      })),
      ...recentNews.map((n) => ({
        id: n.id,
        type: 'news' as const,
        label: `تم نشر خبر جديد: ${n.titleAr}`,
        detail: null,
        at: (n.publishDate ?? n.createdAt).toISOString(),
      })),
    ]
      .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
      .slice(0, 6);

    return NextResponse.json({
      stats: {
        newApplications,
        pendingComplaints,
        availableResults,
      },
      recentActivity: activity,
    });
  } catch (error) {
    console.error('Error building CMS dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب لوحة التحكم' }, { status: 500 });
  }
}
