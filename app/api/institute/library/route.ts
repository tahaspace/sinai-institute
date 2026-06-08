import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission, requireFeature } from '@/lib/authz';

// GET /api/institute/library — books + stats.
export async function GET() {
  try {
    const feat = await requireFeature('library.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('library.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [books, borrowed] = await Promise.all([
      prisma.book.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.borrowing.count({ where: { status: { in: ['borrowed', 'overdue'] } } }),
    ]);

    return NextResponse.json({
      recentBooks: books.slice(0, 8).map((b) => ({
        title: b.title,
        author: b.author ?? '',
        category: b.category ?? '',
        available: b.available,
      })),
      stats: {
        titles: books.length,
        totalCopies: books.reduce((s, b) => s + b.copies, 0),
        available: books.reduce((s, b) => s + b.available, 0),
        activeBorrowings: borrowed,
      },
    });
  } catch (error) {
    console.error('Error building library:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات المكتبة' }, { status: 500 });
  }
}
