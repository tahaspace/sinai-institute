import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// GET /api/admin/platform/roles — list all roles with permission counts.
export async function GET() {
  const guard = await requirePermission('platform.role.manage');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const roles = await prisma.role.findMany({
      orderBy: [{ universityId: 'asc' }, { key: 'asc' }],
      include: {
        _count: { select: { permissions: true } },
        university: { select: { id: true, nameAr: true } },
      },
    });

    const data = roles.map((r) => ({
      id: r.id,
      key: r.key,
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      description: r.description,
      isSystem: r.isSystem,
      universityId: r.universityId,
      universityName: r.university?.nameAr ?? null,
      permissionCount: r._count.permissions,
    }));

    return NextResponse.json({ roles: data });
  } catch (e) {
    console.error('GET roles failed:', e);
    return NextResponse.json({ error: 'فشل في جلب الأدوار' }, { status: 500 });
  }
}

// POST /api/admin/platform/roles — create a new (non-system) role.
export async function POST(request: Request) {
  const guard = await requirePermission('platform.role.manage');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const body = await request.json().catch(() => ({}));
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    const nameAr = typeof body.nameAr === 'string' ? body.nameAr.trim() : '';
    const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : '';
    // empty string from the Select means "platform" (universityId = null)
    const universityId =
      typeof body.universityId === 'string' && body.universityId.length > 0
        ? body.universityId
        : null;

    if (!key || !nameAr || !nameEn) {
      return NextResponse.json({ error: 'المفتاح والاسم بالعربية والإنجليزية مطلوبة' }, { status: 400 });
    }

    // Role has a compound unique [universityId, key]; null can't go through
    // findUnique on the compound, so check with findFirst first.
    const existing = await prisma.role.findFirst({ where: { universityId, key } });
    if (existing) {
      return NextResponse.json({ error: 'يوجد دور بنفس المفتاح في هذا النطاق' }, { status: 409 });
    }

    if (universityId) {
      const uni = await prisma.university.findUnique({ where: { id: universityId }, select: { id: true } });
      if (!uni) return NextResponse.json({ error: 'الجامعة غير موجودة' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: { key, nameAr, nameEn, universityId, isSystem: false },
    });

    await writeAudit('platform.role.create', {
      targetType: 'Role',
      targetId: role.id,
      universityId,
      metadata: { key, nameAr, nameEn },
    });

    return NextResponse.json({ role: { id: role.id, key: role.key } }, { status: 201 });
  } catch (e) {
    console.error('POST role failed:', e);
    return NextResponse.json({ error: 'فشل في إنشاء الدور' }, { status: 500 });
  }
}
