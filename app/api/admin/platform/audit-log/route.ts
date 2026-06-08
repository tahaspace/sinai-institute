import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

/**
 * GET /api/admin/platform/audit-log
 * Platform-wide audit trail viewer (read-only).
 * Query: ?action=<contains>&limit=<number, default 100>
 * Returns newest-first rows: { id, createdAt, actorUserId, action, targetType, targetId, universityId }.
 */
export async function GET(request: NextRequest) {
  const guard = await requirePermission('platform.audit.view');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const params = request.nextUrl.searchParams;
    const action = params.get('action')?.trim() || '';

    // Clamp the limit to a sane range so a bad/huge value can't dump the whole table.
    const rawLimit = parseInt(params.get('limit') ?? '', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;

    const rows = await prisma.auditLog.findMany({
      where: action ? { action: { contains: action } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        actorUserId: true,
        action: true,
        targetType: true,
        targetId: true,
        universityId: true,
      },
    });

    return NextResponse.json({ rows });
  } catch (e) {
    console.error('audit-log GET failed:', e);
    return NextResponse.json({ error: 'فشل في جلب سجل التدقيق' }, { status: 500 });
  }
}
