import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/student';
import { requireFeature } from '@/lib/authz';

// GET /api/lms/forums — categories + topics (with reply counts) + stats.
export async function GET() {
  try {
    const feat = await requireFeature('lms.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requireSession();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [cats, topics] = await Promise.all([
      prisma.forumCategory.findMany({
        include: { _count: { select: { topics: true } } },
        orderBy: { order: 'asc' },
      }),
      prisma.forumTopic.findMany({
        include: { category: true, _count: { select: { posts: true } } },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      categories: cats.map((c) => ({ id: c.id, name: c.name, description: c.description ?? '', topics: c._count.topics })),
      topics: topics.map((t) => ({
        id: t.id,
        category: t.category.name,
        title: t.title,
        author: t.authorName,
        authorRole: t.authorRole,
        replies: t._count.posts,
        views: t.views,
        pinned: t.pinned,
        locked: t.locked,
        answered: t.answered,
        date: t.createdAt.toISOString().slice(0, 10),
      })),
      stats: {
        categories: cats.length,
        topics: topics.length,
        posts: topics.reduce((s, t) => s + t._count.posts, 0),
        answered: topics.filter((t) => t.answered).length,
      },
    });
  } catch (error) {
    console.error('Error listing forums:', error);
    return NextResponse.json({ error: 'فشل في جلب المنتديات' }, { status: 500 });
  }
}
