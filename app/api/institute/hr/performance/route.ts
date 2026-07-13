import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Performance reviews (ClientR4 — R4c-4). Weighted score = Σ(score×weight)/Σ(weight); grade band per
// the bylaw. View = hr.performance.view, create = hr.performance.edit.

function gradeFor(total: number): string {
  if (total >= 90) return 'ممتاز';
  if (total >= 80) return 'جيد جداً';
  if (total >= 70) return 'جيد';
  if (total >= 60) return 'مقبول';
  return 'يحتاج تطوير';
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.performance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const sp = new URL(request.url).searchParams;
    if (sp.get('id')) {
      const r = await prisma.performanceReview.findFirst({ where: { id: sp.get('id')!, universityId: uid }, include: { scores: true, employee: { select: { code: true, nameAr: true } } } });
      if (!r) return NextResponse.json({ error: 'التقييم غير موجود' }, { status: 404 });
      return NextResponse.json({ review: r });
    }
    const where: Record<string, unknown> = { universityId: uid };
    if (sp.get('employeeId')) where.employeeId = sp.get('employeeId');
    const reviews = await prisma.performanceReview.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500, include: { employee: { select: { code: true, nameAr: true } } } });
    return NextResponse.json({ reviews: reviews.map((r) => ({ id: r.id, code: r.employee.code, name: r.employee.nameAr, period: r.period, evaluatorType: r.evaluatorType, totalScore: r.totalScore, grade: r.grade, recommendation: r.recommendation })) });
  } catch (e) {
    console.error('Error listing reviews:', e);
    return NextResponse.json({ error: 'فشل في جلب التقييمات' }, { status: 500 });
  }
}

// POST { employeeId, templateId, period, periodType?, evaluatorType?, recommendation?, note?, scores:[{criterionId,score}] }
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.performance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const b = await request.json();
    if (!b?.employeeId || !b?.templateId || !b?.period) return NextResponse.json({ error: 'الموظف والنموذج والفترة مطلوبة' }, { status: 400 });
    const template = await prisma.evaluationTemplate.findFirst({ where: { id: b.templateId, universityId: uid }, include: { criteria: true } });
    if (!template) return NextResponse.json({ error: 'النموذج غير موجود' }, { status: 404 });

    const scoreMap = new Map<string, number>((Array.isArray(b.scores) ? b.scores : []).map((s: { criterionId: string; score: number }) => [s.criterionId, Number(s.score) || 0]));
    let weighted = 0, totalWeight = 0;
    const scoreRows = template.criteria.map((c) => { const sc = Math.max(0, Math.min(100, scoreMap.get(c.id) ?? 0)); weighted += sc * c.weight; totalWeight += c.weight; return { criterionId: c.id, criterionAr: c.nameAr, weight: c.weight, score: sc }; });
    const total = totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) / 10 : 0;
    const session = await getServerSession(authOptions);
    const evaluatorId = (session?.user as { id?: string } | undefined)?.id ?? null;

    const created = await prisma.performanceReview.create({
      data: {
        universityId: uid, employeeId: b.employeeId, templateId: b.templateId, period: b.period,
        periodType: b.periodType ?? 'ANNUAL', evaluatorType: b.evaluatorType ?? 'MANAGER', evaluatorId,
        totalScore: total, grade: gradeFor(total), recommendation: b.recommendation ?? null, note: b.note ?? null,
        scores: { create: scoreRows },
      },
    });
    await writeAudit('hr.performance.review', { targetType: 'PerformanceReview', targetId: created.id, universityId: uid, metadata: { total, grade: gradeFor(total) } });
    return NextResponse.json({ id: created.id, totalScore: total, grade: gradeFor(total) }, { status: 201 });
  } catch (e) {
    console.error('Error creating review:', e);
    return NextResponse.json({ error: 'فشل في حفظ التقييم' }, { status: 500 });
  }
}
