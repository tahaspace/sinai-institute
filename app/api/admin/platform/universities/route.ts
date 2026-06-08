import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// GET /api/admin/platform/universities — list all universities with faculty counts.
export async function GET() {
  const guard = await requirePermission('platform.tenant.view');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const universities = await prisma.university.findMany({
      orderBy: { nameAr: 'asc' },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        domain: true,
        isActive: true,
        _count: { select: { faculties: true } },
      },
    });
    return NextResponse.json({ universities });
  } catch (e) {
    console.error('GET universities failed:', e);
    return NextResponse.json({ error: 'فشل في جلب الجامعات' }, { status: 500 });
  }
}

// POST /api/admin/platform/universities — create a university (slug must be unique).
export async function POST(request: Request) {
  const guard = await requirePermission('platform.tenant.create');
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const body = await request.json().catch(() => ({}));
    const nameAr = typeof body.nameAr === 'string' ? body.nameAr.trim() : '';
    const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const domain = typeof body.domain === 'string' && body.domain.trim() ? body.domain.trim() : null;

    if (!nameAr || !nameEn || !slug) {
      return NextResponse.json({ error: 'الاسم بالعربية والإنجليزية والمعرّف (slug) حقول مطلوبة' }, { status: 400 });
    }

    const existing = await prisma.university.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'المعرّف (slug) مستخدم بالفعل' }, { status: 409 });
    }
    if (domain) {
      const dup = await prisma.university.findUnique({ where: { domain } });
      if (dup) return NextResponse.json({ error: 'النطاق (domain) مستخدم بالفعل' }, { status: 409 });
    }

    const university = await prisma.university.create({
      data: { nameAr, nameEn, slug, domain },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        domain: true,
        isActive: true,
        _count: { select: { faculties: true } },
      },
    });

    await writeAudit('platform.university.create', {
      targetType: 'University',
      targetId: university.id,
      universityId: university.id,
      metadata: { nameAr, slug },
    });

    return NextResponse.json({ university }, { status: 201 });
  } catch (e) {
    console.error('POST university failed:', e);
    return NextResponse.json({ error: 'فشل في إنشاء الجامعة' }, { status: 500 });
  }
}
