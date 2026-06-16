import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { getFinanceConfig } from '@/lib/finance/settings';
import { buildMonthlyPeriods, fiscalYearSpan } from '@/lib/finance/periods';

// Fiscal years + accounting periods (Finance v2 — Phase 1).
export async function GET() {
  try {
    const guard = await requirePermission('finance.period.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const years = await prisma.fiscalYear.findMany({
      where: { universityId: guard.ctx.universityId ?? null },
      include: { periods: { orderBy: { code: 'asc' } } },
      orderBy: { code: 'desc' },
    });
    return NextResponse.json({
      fiscalYears: years.map((y) => ({
        id: y.id, code: y.code, startDate: y.startDate, endDate: y.endDate, status: y.status,
        periods: y.periods.map((p) => ({ id: p.id, code: p.code, startDate: p.startDate, endDate: p.endDate, status: p.status })),
      })),
    });
  } catch (e) {
    console.error('Error listing periods:', e);
    return NextResponse.json({ error: 'فشل في جلب الفترات المحاسبية' }, { status: 500 });
  }
}

// POST { year } — create a fiscal year + its 12 monthly periods (idempotent).
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.period.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    const year = parseInt(body?.year, 10) || new Date().getUTCFullYear();
    const uni = guard.ctx.universityId ?? null;
    const code = `${year}`;
    if (await prisma.fiscalYear.findFirst({ where: { universityId: uni, code } })) {
      return NextResponse.json({ error: `السنة المالية ${code} موجودة بالفعل` }, { status: 409 });
    }
    const cfg = await getFinanceConfig(uni);
    const span = fiscalYearSpan(year, cfg.fiscal.startMonth);
    const periods = buildMonthlyPeriods(year, cfg.fiscal.startMonth);
    const fy = await prisma.fiscalYear.create({ data: { universityId: uni, code, startDate: span.startDate, endDate: span.endDate, status: 'OPEN' } });
    await prisma.accountingPeriod.createMany({
      data: periods.map((p) => ({ universityId: uni, fiscalYearId: fy.id, code: p.code, startDate: p.startDate, endDate: p.endDate, status: 'OPEN' })),
    });
    return NextResponse.json({ ok: true, fiscalYear: code, periods: periods.length }, { status: 201 });
  } catch (e) {
    console.error('Error creating fiscal year:', e);
    return NextResponse.json({ error: 'فشل في إنشاء السنة المالية' }, { status: 500 });
  }
}
