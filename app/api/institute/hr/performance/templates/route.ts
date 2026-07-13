import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Evaluation templates (ClientR4 — R4c-4): weighted criteria forms for performance reviews.
// View = hr.performance.view, edit = hr.performance.edit.

export async function GET() {
  try {
    const guard = await requirePermission('hr.performance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const templates = await prisma.evaluationTemplate.findMany({
      where: { universityId: guard.ctx.universityId ?? null },
      orderBy: { createdAt: 'desc' },
      include: { criteria: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json({ templates });
  } catch (e) {
    console.error('Error listing templates:', e);
    return NextResponse.json({ error: 'فشل في جلب نماذج التقييم' }, { status: 500 });
  }
}

// POST { nameAr, target, criteria: [{ nameAr, weight }] }
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.performance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const b = await request.json();
    if (!b?.nameAr || !Array.isArray(b?.criteria) || !b.criteria.length) return NextResponse.json({ error: 'الاسم والبنود مطلوبة' }, { status: 400 });
    const created = await prisma.evaluationTemplate.create({
      data: {
        universityId: uid, nameAr: b.nameAr, target: ['ALL', 'ADMIN', 'FACULTY'].includes(b.target) ? b.target : 'ALL',
        criteria: { create: b.criteria.map((c: { nameAr: string; weight?: number }, i: number) => ({ nameAr: c.nameAr, weight: Number(c.weight ?? 0), order: i })) },
      },
    });
    await writeAudit('hr.performance.template', { targetType: 'EvaluationTemplate', targetId: created.id, universityId: uid });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Error creating template:', e);
    return NextResponse.json({ error: 'فشل في إنشاء النموذج' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.performance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const b = await request.json();
    if (!b?.id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    const existing = await prisma.evaluationTemplate.findFirst({ where: { id: b.id, universityId: guard.ctx.universityId ?? null } });
    if (!existing) return NextResponse.json({ error: 'النموذج غير موجود' }, { status: 404 });
    const data: { nameAr?: string; isActive?: boolean } = {};
    if (typeof b.nameAr === 'string') data.nameAr = b.nameAr;
    if (typeof b.isActive === 'boolean') data.isActive = b.isActive;
    const updated = await prisma.evaluationTemplate.update({ where: { id: b.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating template:', e);
    return NextResponse.json({ error: 'فشل في التحديث' }, { status: 500 });
  }
}
