import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// PATCH /api/admin/platform/roles/[id] — update display fields only (never the key).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('platform.role.manage');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const data: { nameAr?: string; nameEn?: string; description?: string | null } = {};
    if (typeof body.nameAr === 'string' && body.nameAr.trim()) data.nameAr = body.nameAr.trim();
    if (typeof body.nameEn === 'string' && body.nameEn.trim()) data.nameEn = body.nameEn.trim();
    if (typeof body.description === 'string') data.description = body.description.trim() || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول صالحة للتحديث' }, { status: 400 });
    }

    const updated = await prisma.role.update({ where: { id }, data });

    await writeAudit('platform.role.update', {
      targetType: 'Role',
      targetId: id,
      universityId: role.universityId,
      metadata: data,
    });

    return NextResponse.json({
      role: { id: updated.id, nameAr: updated.nameAr, nameEn: updated.nameEn, description: updated.description },
    });
  } catch (e) {
    console.error('PATCH role failed:', e);
    return NextResponse.json({ error: 'فشل في تحديث الدور' }, { status: 500 });
  }
}

// DELETE /api/admin/platform/roles/[id] — blocked for system roles.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('platform.role.manage');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 404 });

    if (role.isSystem) {
      return NextResponse.json({ error: 'لا يمكن حذف دور نظامي' }, { status: 409 });
    }

    // Remove permission links + user assignments first to avoid FK errors.
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.userRole.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    await writeAudit('platform.role.delete', {
      targetType: 'Role',
      targetId: id,
      universityId: role.universityId,
      metadata: { key: role.key, nameAr: role.nameAr },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE role failed:', e);
    return NextResponse.json({ error: 'فشل في حذف الدور' }, { status: 500 });
  }
}
