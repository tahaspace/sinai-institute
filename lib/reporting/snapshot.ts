import prisma from '@/lib/prisma';
import { academicKpis, studentKpis, financialKpis } from '@/lib/reporting/kpi';

/**
 * KPI snapshot capture (ClientR3 — polish). A nightly cron upserts the headline KPIs into
 * KpiSnapshot keyed by (metric, period=YYYY-MM-DD) so multi-year/trend reports and dashboards have
 * point-in-time history that can't be reconstructed live (headcount, balances). Idempotent per day.
 */
export async function captureSnapshots(universityId: string | null, when: Date = new Date()): Promise<number> {
  const period = when.toISOString().slice(0, 10); // daily granularity
  const [a, s, f] = await Promise.all([academicKpis(universityId), studentKpis(universityId), financialKpis(universityId)]);
  const metrics: { metric: string; value: number }[] = [
    { metric: 'students.total', value: a.totalStudents },
    { metric: 'pass.rate', value: a.passRate },
    { metric: 'fail.rate', value: a.failRate },
    { metric: 'cgpa.avg', value: Number(a.avgCgpa) },
    { metric: 'retention.rate', value: s.retentionRate },
    { metric: 'dropout.rate', value: s.dropoutRate },
    { metric: 'graduation.rate', value: s.graduationRate },
    { metric: 'revenue.total', value: Number(f.revenue) },
    { metric: 'expense.total', value: Number(f.expense) },
    { metric: 'collection.rate', value: f.collectionRate },
  ];
  // findFirst + update/create (not upsert) — the compound unique includes a nullable universityId,
  // which Prisma's unique-where can't target cleanly; this stays idempotent per (metric, period).
  let n = 0;
  for (const m of metrics) {
    const existing = await prisma.kpiSnapshot.findFirst({ where: { universityId: universityId ?? null, metric: m.metric, dimension: '', period } });
    if (existing) await prisma.kpiSnapshot.update({ where: { id: existing.id }, data: { value: m.value, capturedAt: when } });
    else await prisma.kpiSnapshot.create({ data: { universityId: universityId ?? null, metric: m.metric, dimension: '', period, value: m.value, capturedAt: when } });
    n++;
  }
  return n;
}

/** Capture for every tenant (or a single global row when there are no University rows). */
export async function captureAllTenants(): Promise<{ tenants: number; metrics: number }> {
  const unis = await prisma.university.findMany({ select: { id: true } });
  const targets = unis.length ? unis.map((u) => u.id) : [null];
  let metrics = 0;
  for (const id of targets) metrics += await captureSnapshots(id);
  return { tenants: targets.length, metrics };
}

/** Trend series for one metric (ascending by period) — feeds the trend report. */
export async function metricTrend(universityId: string | null, metric: string) {
  const rows = await prisma.kpiSnapshot.findMany({ where: { universityId: universityId ?? null, metric, dimension: '' }, orderBy: { period: 'asc' } });
  return rows.map((r) => ({ period: r.period, value: r.value }));
}
