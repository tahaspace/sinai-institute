import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// GET /api/admin/platform/faculties?universityId=... — faculties of a university.
export async function GET(request: Request) {
  const guard = await requirePermission('platform.tenant.view');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const universityId = new URL(request.url).searchParams.get('universityId');
    if (!universityId) return NextResponse.json({ error: 'معرّف الجامعة مطلوب' }, { status: 400 });

    const faculties = await prisma.faculty.findMany({
      where: { universityId },
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
    return NextResponse.json({ faculties });
  } catch (e) {
    console.error('GET faculties failed:', e);
    return NextResponse.json({ error: 'فشل في جلب الكليات' }, { status: 500 });
  }
}

// POST /api/admin/platform/faculties — create a faculty under a university.
export async function POST(request: Request) {
  const guard = await requirePermission('platform.tenant.edit');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const body = await request.json().catch(() => ({}));
    const universityId = typeof body.universityId === 'string' ? body.universityId.trim() : '';
    const nameAr = typeof body.nameAr === 'string' ? body.nameAr.trim() : '';
    const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : '';
    const dean = typeof body.dean === 'string' && body.dean.trim() ? body.dean.trim() : null;

    if (!universityId || !nameAr || !nameEn) {
      return NextResponse.json({ error: 'الجامعة والاسم بالعربية والإنجليزية حقول مطلوبة' }, { status: 400 });
    }

    const university = await prisma.university.findUnique({ where: { id: universityId }, select: { id: true } });
    if (!university) return NextResponse.json({ error: 'الجامعة غير موجودة' }, { status: 404 });

    const faculty = await prisma.faculty.create({
      data: { universityId, nameAr, nameEn, dean },
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

    await writeAudit('platform.faculty.create', {
      targetType: 'Faculty',
      targetId: faculty.id,
      universityId,
      metadata: { nameAr },
    });

    return NextResponse.json({ faculty }, { status: 201 });
  } catch (e) {
    console.error('POST faculty failed:', e);
    return NextResponse.json({ error: 'فشل في إنشاء الكلية' }, { status: 500 });
  }
}
