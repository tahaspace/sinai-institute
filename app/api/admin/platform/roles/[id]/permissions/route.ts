import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// GET /api/admin/platform/roles/[id]/permissions — current granted keys for a role.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('platform.role.manage');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: { select: { key: true } } } } },
    });
    if (!role) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 404 });

    return NextResponse.json({
      keys: role.permissions.map((rp) => rp.permission.key),
      role: { id: role.id, key: role.key, nameAr: role.nameAr, nameEn: role.nameEn, isSystem: role.isSystem },
    });
  } catch (e) {
    console.error('GET role permissions failed:', e);
    return NextResponse.json({ error: 'فشل في جلب صلاحيات الدور' }, { status: 500 });
  }
}

// PUT /api/admin/platform/roles/[id]/permissions — replace the full permission set.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('platform.role.manage');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const rawKeys: unknown = body.keys;
    if (!Array.isArray(rawKeys)) {
      return NextResponse.json({ error: 'قائمة الصلاحيات غير صالحة' }, { status: 400 });
    }
    const requestedKeys = [...new Set(rawKeys.filter((k): k is string => typeof k === 'string'))];

    // Resolve keys -> permission ids; silently drop any unknown key.
    const matched = await prisma.permission.findMany({
      where: { key: { in: requestedKeys } },
      select: { id: true, key: true },
    });
    const permissionIds = matched.map((p) => p.id);

    // Replace: clear existing rows, then bulk-insert the new set.
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        skipDuplicates: true,
      });
    }

    await writeAudit('platform.role.permissions.update', {
      targetType: 'Role',
      targetId: id,
      universityId: role.universityId,
      metadata: { key: role.key, count: permissionIds.length, keys: matched.map((m) => m.key) },
    });

    return NextResponse.json({ keys: matched.map((m) => m.key) });
  } catch (e) {
    console.error('PUT role permissions failed:', e);
    return NextResponse.json({ error: 'فشل في حفظ صلاحيات الدور' }, { status: 500 });
  }
}
