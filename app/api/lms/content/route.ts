import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/student';

// GET /api/lms/content — content library grouped by unit + stats.
export async function GET() {
  try {
    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const items = await prisma.lMSContent.findMany({ orderBy: { createdAt: 'desc' } });

    const contentItems = items.map((c) => ({
      id: c.id,
      title: c.title,
      unit: c.unit ?? 'عام',
      type: c.type,
      url: c.url ?? '',
      sizeMb: c.sizeMb ?? 0,
      views: c.views,
    }));

    // distinct units for the sidebar
    const units = [...new Set(contentItems.map((c) => c.unit))].map((name) => ({
      name,
      count: contentItems.filter((c) => c.unit === name).length,
    }));

    return NextResponse.json({
      contentItems,
      units,
      stats: {
        total: contentItems.length,
        videos: contentItems.filter((c) => c.type === 'video').length,
        pdfs: contentItems.filter((c) => c.type === 'pdf').length,
        totalViews: contentItems.reduce((s, c) => s + c.views, 0),
      },
    });
  } catch (error) {
    console.error('Error listing LMS content:', error);
    return NextResponse.json({ error: 'فشل في جلب المحتوى' }, { status: 500 });
  }
}
