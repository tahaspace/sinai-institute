import prisma from '@/lib/prisma';

/**
 * Fiscal period helpers (Finance v2 — Phase 0). The posting engine asserts that the target
 * AccountingPeriod is OPEN before any journal entry is written — period close is what makes the
 * ledger trustworthy. Periods are tenant-scoped and live under a FiscalYear.
 */

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export type PeriodRef = { id: string; code: string; status: string };

/** The AccountingPeriod whose [startDate, endDate] contains `date` for this tenant (or null). */
export async function resolvePeriod(universityId: string | null, date: Date): Promise<PeriodRef | null> {
  const p = await prisma.accountingPeriod.findFirst({
    where: { universityId: universityId ?? null, startDate: { lte: date }, endDate: { gte: date } },
  });
  return p ? { id: p.id, code: p.code, status: p.status } : null;
}

/** Returns the open period id for `date`, or throws if missing/closed. Call before posting. */
export async function assertPeriodOpen(universityId: string | null, date: Date): Promise<string> {
  const p = await resolvePeriod(universityId, date);
  if (!p) throw new Error('لا توجد فترة محاسبية تغطي هذا التاريخ — أنشئ السنة المالية أولاً');
  if (p.status === 'CLOSED') throw new Error(`الفترة المحاسبية ${p.code} مغلقة — لا يمكن الترحيل إليها`);
  return p.id;
}

/**
 * Build the monthly AccountingPeriod definitions for a fiscal year that starts on `startMonth`
 * (1–12) of `startYear`. Returns 12 contiguous months. Used by scripts/seed-fiscal-periods.ts.
 */
export function buildMonthlyPeriods(
  startYear: number,
  startMonth: number,
): { code: string; nameAr: string; startDate: Date; endDate: Date }[] {
  const out: { code: string; nameAr: string; startDate: Date; endDate: Date }[] = [];
  for (let i = 0; i < 12; i++) {
    const m0 = startMonth - 1 + i; // 0-based month offset from start
    const year = startYear + Math.floor(m0 / 12);
    const month = m0 % 12; // 0-based
    const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)); // last day of month
    out.push({
      code: `${year}-${String(month + 1).padStart(2, '0')}`,
      nameAr: `${MONTHS_AR[month]} ${year}`,
      startDate,
      endDate,
    });
  }
  return out;
}

/** Fiscal-year span for a year starting on startMonth. */
export function fiscalYearSpan(startYear: number, startMonth: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(Date.UTC(startYear, startMonth - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(startYear + 1, startMonth - 1, 0, 23, 59, 59));
  return { startDate, endDate };
}
