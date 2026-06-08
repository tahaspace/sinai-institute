import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';
import { FEATURE_FLAGS } from '@/prisma/rbac/catalog';

// GET /api/admin/platform/feature-flags
// Returns the universities (rows), the flag catalog (columns), and every stored
// FeatureFlag value so the grid can render the current on/off state per cell.
export async function GET() {
  try {
    const guard = await requirePermission('platform.feature.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [universities, values] = await Promise.all([
      prisma.university.findMany({
        orderBy: { nameAr: 'asc' },
        select: { id: true, nameAr: true },
      }),
      // Only the per-university flags matter for this grid; platform-wide rows
      // (universityId = null) are not represented as columns here, so filter them out.
      prisma.featureFlag.findMany({
        where: { universityId: { not: null } },
        select: { universityId: true, key: true, enabled: true },
      }),
    ]);

    return NextResponse.json({
      universities,
      flags: FEATURE_FLAGS,
      values,
    });
  } catch (error) {
    console.error('Error loading feature flags:', error);
    return NextResponse.json({ error: 'فشل في جلب مفاتيح الميزات' }, { status: 500 });
  }
}

// PUT /api/admin/platform/feature-flags
// Body: { universityId, key, enabled } — toggles a single (university, flag) cell.
// FeatureFlag has @@unique([universityId, key]); since universityId is non-null
// here we still use findFirst-then-create/update (compound upsert is unsafe when
// the unique column is nullable in the schema).
export async function PUT(request: NextRequest) {
  try {
    const guard = await requirePermission('platform.feature.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => null);
    const universityId = body?.universityId;
    const key = body?.key;
    const enabled = body?.enabled;

    if (typeof universityId !== 'string' || !universityId) {
      return NextResponse.json({ error: 'معرّف الجامعة مطلوب' }, { status: 400 });
    }
    if (typeof key !== 'string' || !key) {
      return NextResponse.json({ error: 'مفتاح الميزة مطلوب' }, { status: 400 });
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'قيمة التفعيل غير صالحة' }, { status: 400 });
    }

    // Validate the flag key against the catalog so unknown keys are rejected.
    if (!FEATURE_FLAGS.some((f) => f.key === key)) {
      return NextResponse.json({ error: 'مفتاح الميزة غير معروف' }, { status: 400 });
    }

    // Guard against toggling a flag for a non-existent university.
    const university = await prisma.university.findUnique({ where: { id: universityId }, select: { id: true } });
    if (!university) {
      return NextResponse.json({ error: 'الجامعة غير موجودة' }, { status: 404 });
    }

    const existing = await prisma.featureFlag.findFirst({ where: { universityId, key } });
    if (existing) {
      await prisma.featureFlag.update({ where: { id: existing.id }, data: { enabled } });
    } else {
      await prisma.featureFlag.create({ data: { universityId, key, enabled } });
    }

    await writeAudit('feature.toggle', {
      targetType: 'FeatureFlag',
      metadata: { key, enabled },
      universityId,
    });

    return NextResponse.json({ universityId, key, enabled });
  } catch (error) {
    console.error('Error toggling feature flag:', error);
    return NextResponse.json({ error: 'فشل في تحديث مفتاح الميزة' }, { status: 500 });
  }
}
