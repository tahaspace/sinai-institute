import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission, requireFeature } from '@/lib/authz';

// GET /api/admin/library — read-only summary for the library-admin dashboard.
export async function GET() {
  try {
    const feat = await requireFeature('library.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('library.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [books, borrowedCount, overdueCount] = await Promise.all([
      prisma.book.findMany(),
      prisma.borrowing.count({ where: { status: 'borrowed' } }),
      prisma.borrowing.count({ where: { status: 'overdue' } }),
    ]);

    const totalCopies = books.reduce((s, b) => s + b.copies, 0);
    const available = books.reduce((s, b) => s + b.available, 0);

    return NextResponse.json({
      titles: books.length,
      totalCopies,
      available,
      borrowed: borrowedCount,
      overdue: overdueCount,
    });
  } catch (error) {
    console.error('Error building library summary:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات المكتبة' }, { status: 500 });
  }
}
