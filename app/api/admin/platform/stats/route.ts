import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

export async function GET() {
  const guard = await requirePermission('platform.audit.view');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const [universities, faculties, users, roles, recentAudit] = await Promise.all([
      prisma.university.count(),
      prisma.faculty.count(),
      prisma.user.count(),
      prisma.role.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          action: true,
          targetType: true,
          actorUserId: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      counts: { universities, faculties, users, roles },
      recentAudit,
    });
  } catch (e) {
    console.error('platform stats failed:', e);
    return NextResponse.json({ error: 'فشل في جلب إحصائيات المنصة' }, { status: 500 });
  }
}
