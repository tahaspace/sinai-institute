import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// GET /api/admin/platform/universities/[id] — one university + its faculties.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('platform.tenant.view');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { id } = await params;
    const university = await prisma.university.findUnique({
      where: { id },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        domain: true,
        isActive: true,
      },
    });
    if (!university) return NextResponse.json({ error: 'الجامعة غير موجودة' }, { status: 404 });

    const faculties = await prisma.faculty.findMany({
      where: { universityId: id },
      orderBy: [{ order: 'asc' }, { nameAr: 'asc' }],
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

    return NextResponse.json({ university, faculties });
  } catch (e) {
    console.error('GET university failed:', e);
    return NextResponse.json({ error: 'فشل في جلب بيانات الجامعة' }, { status: 500 });
  }
}

// PATCH /api/admin/platform/universities/[id] — update nameAr/nameEn/domain/isActive.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('platform.tenant.edit');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { id } = await params;
    const existing = await prisma.university.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'الجامعة غير موجودة' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const data: { nameAr?: string; nameEn?: string; domain?: string | null; isActive?: boolean } = {};

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
    if (body.domain !== undefined) {
      const v = typeof body.domain === 'string' && body.domain.trim() ? body.domain.trim() : null;
      if (v) {
        const dup = await prisma.university.findUnique({ where: { domain: v }, select: { id: true } });
        if (dup && dup.id !== id) {
          return NextResponse.json({ error: 'النطاق (domain) مستخدم بالفعل' }, { status: 409 });
        }
      }
      data.domain = v;
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول صالحة للتحديث' }, { status: 400 });
    }

    const university = await prisma.university.update({
      where: { id },
      data,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        domain: true,
        isActive: true,
      },
    });

    await writeAudit('platform.university.update', {
      targetType: 'University',
      targetId: id,
      universityId: id,
      metadata: data,
    });

    return NextResponse.json({ university });
  } catch (e) {
    console.error('PATCH university failed:', e);
    return NextResponse.json({ error: 'فشل في تحديث الجامعة' }, { status: 500 });
  }
}
