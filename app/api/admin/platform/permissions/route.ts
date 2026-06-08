import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/admin/platform/permissions — full permission catalog for the matrix,
// returned both flat and grouped by `resource`.
export async function GET() {
  const guard = await requirePermission('platform.role.manage');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      select: { id: true, key: true, resource: true, action: true, descriptionAr: true },
    });

    // Group by resource so the page can render one row per resource with its
    // action checkboxes.
    const groupMap = new Map<string, typeof permissions>();
    for (const p of permissions) {
      const list = groupMap.get(p.resource) ?? [];
      list.push(p);
      groupMap.set(p.resource, list);
    }
    const groups = [...groupMap.entries()].map(([resource, perms]) => ({ resource, permissions: perms }));

    return NextResponse.json({ permissions, groups });
  } catch (e) {
    console.error('GET permissions failed:', e);
    return NextResponse.json({ error: 'فشل في جلب قائمة الصلاحيات' }, { status: 500 });
  }
}
