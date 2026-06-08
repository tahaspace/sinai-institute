import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// PATCH /api/admin/platform/faculties/[id] — update nameAr/nameEn/dean/isActive.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('platform.tenant.edit');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { id } = await params;
    const existing = await prisma.faculty.findUnique({ where: { id }, select: { id: true, universityId: true } });
    if (!existing) return NextResponse.json({ error: 'الكلية غير موجودة' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const data: { nameAr?: string; nameEn?: string; dean?: string | null; isActive?: boolean } = {};

    if (typeof body.nameAr === 'string') {
      const v = body.nameAr.trim();
      if (!v) return NextResponse.json({ error: 'الاسم بالعربية لا يمكن أن يكون فارغًا' }, { status: 400 });
      data.nameAr = v;
    }
    if (typeof body.nameEn === 'string') {
      const v = body.nameEn.trim();
      if (!v) return NextResponse.json({ error: 'الاسم بالإنجليزية لا يمكن أن يكون فارغًا' }, { status: 400 });
      data.nameEn = v;
    }
    if (body.dean !== undefined) {
      data.dean = typeof body.dean === 'string' && body.dean.trim() ? body.dean.trim() : null;
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول صالحة للتحديث' }, { status: 400 });
    }

    const faculty = await prisma.faculty.update({
      where: { id },
      data,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        dean: true,
        order: true,
        isActive: true,
        _count: { select: { departments: true } },
      },
    });

    await writeAudit('platform.faculty.update', {
      targetType: 'Faculty',
      targetId: id,
      universityId: existing.universityId,
      metadata: data,
    });

    return NextResponse.json({ faculty });
  } catch (e) {
    console.error('PATCH faculty failed:', e);
    return NextResponse.json({ error: 'فشل في تحديث الكلية' }, { status: 500 });
  }
}

// DELETE /api/admin/platform/faculties/[id] — blocked if it still has departments.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('platform.tenant.delete');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { id } = await params;
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      select: { id: true, universityId: true, nameAr: true, _count: { select: { departments: true } } },
    });
    if (!faculty) return NextResponse.json({ error: 'الكلية غير موجودة' }, { status: 404 });

    if (faculty._count.departments > 0) {
      return NextResponse.json(
        { error: 'لا يمكن حذف الكلية لأنها تحتوي على أقسام. احذف الأقسام أولًا.' },
        { status: 409 },
      );
    }

    await prisma.faculty.delete({ where: { id } });

    await writeAudit('platform.faculty.delete', {
      targetType: 'Faculty',
      targetId: id,
      universityId: faculty.universityId,
      metadata: { nameAr: faculty.nameAr },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE faculty failed:', e);
    return NextResponse.json({ error: 'فشل في حذف الكلية' }, { status: 500 });
  }
}
