import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// POST /api/admin/platform/users/[id]/roles — assign a role (optionally scoped).
// Body: { roleId, facultyId?, departmentId? }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('platform.user.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { id: userId } = await params;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, universityId: true } });
    if (!user) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const roleId = typeof body.roleId === 'string' ? body.roleId : '';
    const facultyId =
      typeof body.facultyId === 'string' && body.facultyId.length > 0 ? body.facultyId : null;
    const departmentId =
      typeof body.departmentId === 'string' && body.departmentId.length > 0 ? body.departmentId : null;

    if (!roleId) return NextResponse.json({ error: 'الدور مطلوب' }, { status: 400 });

    const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, nameAr: true } });
    if (!role) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 400 });

    if (facultyId) {
      const f = await prisma.faculty.findUnique({ where: { id: facultyId }, select: { id: true } });
      if (!f) return NextResponse.json({ error: 'الكلية غير موجودة' }, { status: 400 });
    }
    if (departmentId) {
      const d = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
      if (!d) return NextResponse.json({ error: 'القسم غير موجود' }, { status: 400 });
    }

    // Guard the @@unique([userId,roleId,facultyId,departmentId]) constraint before insert.
    const dup = await prisma.userRole.findFirst({
      where: { userId, roleId, facultyId, departmentId },
      select: { id: true },
    });
    if (dup) return NextResponse.json({ error: 'هذا الدور مسند بالفعل بنفس النطاق' }, { status: 409 });

    const userRole = await prisma.userRole.create({
      data: { userId, roleId, facultyId, departmentId },
      select: {
        id: true,
        facultyId: true,
        departmentId: true,
        role: { select: { id: true, key: true, nameAr: true, nameEn: true } },
      },
    });

    await writeAudit('platform.user.role.assign', {
      targetType: 'User',
      targetId: userId,
      universityId: user.universityId,
      metadata: { userRoleId: userRole.id, roleId, roleName: role.nameAr, facultyId, departmentId },
    });

    return NextResponse.json({ userRole }, { status: 201 });
  } catch (error) {
    console.error('Error assigning role:', error);
    return NextResponse.json({ error: 'فشل في إسناد الدور' }, { status: 500 });
  }
}

// DELETE /api/admin/platform/users/[id]/roles?userRoleId=... — remove a role assignment.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('platform.user.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { id: userId } = await params;
    const userRoleId = new URL(request.url).searchParams.get('userRoleId');
    if (!userRoleId) return NextResponse.json({ error: 'معرّف الإسناد مطلوب' }, { status: 400 });

    // Make sure the assignment actually belongs to this user before deleting.
    const existing = await prisma.userRole.findFirst({
      where: { id: userRoleId, userId },
      select: { id: true, roleId: true, facultyId: true, departmentId: true },
    });
    if (!existing) return NextResponse.json({ error: 'إسناد الدور غير موجود' }, { status: 404 });

    await prisma.userRole.delete({ where: { id: userRoleId } });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { universityId: true } });
    await writeAudit('platform.user.role.remove', {
      targetType: 'User',
      targetId: userId,
      universityId: user?.universityId ?? null,
      metadata: { userRoleId, roleId: existing.roleId, facultyId: existing.facultyId, departmentId: existing.departmentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error removing role:', error);
    return NextResponse.json({ error: 'فشل في إزالة الدور' }, { status: 500 });
  }
}
