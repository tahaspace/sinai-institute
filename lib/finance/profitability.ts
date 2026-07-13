import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { money, sub, sumMoney } from '@/lib/finance/money';

/**
 * Cost-centre profitability (ClientR4). Computed FROM the ledger — POSTED JournalLines on REVENUE /
 * EXPENSE accounts, grouped by their `costCenterId` dimension (tagged at posting time by the AR/AP/
 * payroll engines). Revenue is credit-normal, expense debit-normal; profit = revenue − expense.
 * program/faculty/branch roll-ups map each centre via its programId/facultyId/branchId. Never
 * fabricated; unmapped postings land in "غير موزّع" (unallocated) so nothing is silently dropped.
 */
type TermFilter = { from?: Date; to?: Date };
const fmt = (d: Prisma.Decimal) => Number(d.toFixed(2));
const UNALLOCATED = 'غير موزّع';

type Bucket = { revenue: Prisma.Decimal; expense: Prisma.Decimal };
const emptyBucket = (): Bucket => ({ revenue: money(0), expense: money(0) });

/** Aggregate posted P&L lines into per-costCentre revenue/expense buckets (key = costCenterId | null). */
async function aggregateByCostCentre(universityId: string | null, f: TermFilter): Promise<Map<string | null, Bucket>> {
  const lines = await prisma.journalLine.findMany({
    where: {
      account: { type: { in: ['REVENUE', 'EXPENSE'] } },
      entry: {
        universityId: universityId ?? null,
        status: 'POSTED',
        ...(f.from || f.to ? { entryDate: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } } : {}),
      },
    },
    select: { debit: true, credit: true, costCenterId: true, account: { select: { type: true } } },
  });
  const m = new Map<string | null, Bucket>();
  for (const l of lines) {
    const key = l.costCenterId ?? null;
    const b = m.get(key) ?? emptyBucket();
    if (l.account.type === 'REVENUE') b.revenue = b.revenue.plus(money(l.credit)).minus(money(l.debit));
    else b.expense = b.expense.plus(money(l.debit)).minus(money(l.credit));
    m.set(key, b);
  }
  return m;
}

function toRow(label: string, b: Bucket) {
  const profit = sub(b.revenue, b.expense);
  const margin = b.revenue.isZero() ? null : Number(profit.dividedBy(b.revenue).times(100).toFixed(1));
  return { label, revenue: fmt(b.revenue), expense: fmt(b.expense), profit: fmt(profit), margin: margin == null ? '—' : `${margin}%` };
}

/** ربحية مراكز التكلفة — one row per cost centre. */
export async function profitabilityByCostCentre(universityId: string | null, f: TermFilter = {}) {
  const [buckets, centres] = await Promise.all([
    aggregateByCostCentre(universityId, f),
    prisma.costCenter.findMany({ where: { universityId: universityId ?? null }, select: { id: true, nameAr: true } }),
  ]);
  const nameById = new Map(centres.map((c) => [c.id, c.nameAr]));
  const rows = [...buckets.entries()].map(([id, b]) => toRow(id ? nameById.get(id) ?? id : UNALLOCATED, b));
  return rows.sort((a, b) => b.profit - a.profit);
}

/** Roll cost centres up to a program / faculty / branch dimension via their link fields. */
async function profitabilityByLink(universityId: string | null, dim: 'programId' | 'facultyId' | 'branchId', f: TermFilter) {
  const [buckets, centres] = await Promise.all([
    aggregateByCostCentre(universityId, f),
    prisma.costCenter.findMany({ where: { universityId: universityId ?? null }, select: { id: true, programId: true, facultyId: true, branchId: true } }),
  ]);
  const linkOf = new Map(centres.map((c) => [c.id, c[dim] ?? null]));
  // fold buckets onto the target dimension key
  const grouped = new Map<string | null, Bucket>();
  for (const [ccId, b] of buckets) {
    const key = ccId ? linkOf.get(ccId) ?? null : null;
    const g = grouped.get(key) ?? emptyBucket();
    g.revenue = g.revenue.plus(b.revenue);
    g.expense = g.expense.plus(b.expense);
    grouped.set(key, g);
  }
  // resolve the target-dimension names
  const ids = [...grouped.keys()].filter((k): k is string => !!k);
  const names = new Map<string, string>();
  if (ids.length) {
    if (dim === 'programId') (await prisma.program.findMany({ where: { id: { in: ids } }, select: { id: true, nameAr: true } })).forEach((p) => names.set(p.id, p.nameAr));
    else if (dim === 'facultyId') (await prisma.faculty.findMany({ where: { id: { in: ids } }, select: { id: true, nameAr: true } })).forEach((x) => names.set(x.id, x.nameAr));
    else (await prisma.branch.findMany({ where: { id: { in: ids } }, select: { id: true, nameAr: true } })).forEach((x) => names.set(x.id, x.nameAr));
  }
  const rows = [...grouped.entries()].map(([id, b]) => toRow(id ? names.get(id) ?? id : UNALLOCATED, b));
  return rows.sort((a, b) => b.profit - a.profit);
}

export const profitabilityByProgram = (u: string | null, f: TermFilter = {}) => profitabilityByLink(u, 'programId', f);
export const profitabilityByFaculty = (u: string | null, f: TermFilter = {}) => profitabilityByLink(u, 'facultyId', f);
export const profitabilityByBranch = (u: string | null, f: TermFilter = {}) => profitabilityByLink(u, 'branchId', f);

/** تكلفة الطالب — total posted expense ÷ active-student headcount. */
export async function studentUnitCost(universityId: string | null, f: TermFilter = {}) {
  const [buckets, students] = await Promise.all([
    aggregateByCostCentre(universityId, f),
    prisma.student.count({ where: { universityId: universityId ?? undefined, status: { notIn: ['WITHDRAWN', 'DISMISSED', 'GRADUATED'] } } }),
  ]);
  const totalExpense = sumMoney([...buckets.values()].map((b) => b.expense));
  const totalRevenue = sumMoney([...buckets.values()].map((b) => b.revenue));
  const perStudent = students > 0 ? Number(totalExpense.dividedBy(students).toFixed(2)) : 0;
  return { totalRevenue: fmt(totalRevenue), totalExpense: fmt(totalExpense), students, costPerStudent: perStudent };
}
