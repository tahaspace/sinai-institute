import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { money, sub, sumMoney } from '@/lib/finance/money';

/**
 * Financial statements (Finance v2 — Phase 1) — computed FROM the ledger (POSTED JournalLines),
 * never fabricated. Institute volumes are small, so we aggregate in JS via the Money helper
 * (exact Decimal arithmetic). All reads are tenant-scoped and limited to POSTED entries.
 */
type TermFilter = { from?: Date; to?: Date };

type AccountAgg = {
  code: string;
  nameAr: string;
  type: string;
  normalSide: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  balance: Prisma.Decimal; // signed to the account's normal side
};

async function aggregate(universityId: string | null, f: TermFilter): Promise<AccountAgg[]> {
  const entries = await prisma.journalEntry.findMany({
    where: {
      universityId: universityId ?? null,
      status: 'POSTED',
      ...(f.from || f.to ? { entryDate: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } } : {}),
    },
    include: { lines: { include: { account: true } } },
  });

  const byAccount = new Map<string, AccountAgg>();
  for (const e of entries) {
    for (const l of e.lines) {
      const a = l.account;
      const row =
        byAccount.get(a.id) ??
        ({ code: a.code, nameAr: a.nameAr, type: a.type, normalSide: a.normalSide, debit: money(0), credit: money(0), balance: money(0) } as AccountAgg);
      row.debit = row.debit.plus(money(l.debit));
      row.credit = row.credit.plus(money(l.credit));
      byAccount.set(a.id, row);
    }
  }
  for (const row of byAccount.values()) {
    // balance positive in the account's normal direction
    row.balance = row.normalSide === 'DEBIT' ? sub(row.debit, row.credit) : sub(row.credit, row.debit);
  }
  return [...byAccount.values()].sort((a, b) => a.code.localeCompare(b.code));
}

const fmt = (d: Prisma.Decimal) => Number(d.toFixed(2));

/** ميزان المراجعة — every postable account's debit/credit totals; totals must equal. */
export async function trialBalance(universityId: string | null, f: TermFilter = {}) {
  const rows = await aggregate(universityId, f);
  const totalDebit = sumMoney(rows.map((r) => r.debit));
  const totalCredit = sumMoney(rows.map((r) => r.credit));
  return {
    rows: rows.map((r) => ({ code: r.code, name: r.nameAr, type: r.type, debit: fmt(r.debit), credit: fmt(r.credit) })),
    totals: { debit: fmt(totalDebit), credit: fmt(totalCredit), balanced: totalDebit.comparedTo(totalCredit) === 0 },
  };
}

/** قائمة الدخل — Revenue − Expenses = Net result for the period. */
export async function incomeStatement(universityId: string | null, f: TermFilter = {}) {
  const rows = await aggregate(universityId, f);
  const revenue = rows.filter((r) => r.type === 'REVENUE');
  const expense = rows.filter((r) => r.type === 'EXPENSE');
  const totalRevenue = sumMoney(revenue.map((r) => r.balance));
  const totalExpense = sumMoney(expense.map((r) => r.balance));
  const net = sub(totalRevenue, totalExpense);
  return {
    revenue: revenue.map((r) => ({ code: r.code, name: r.nameAr, amount: fmt(r.balance) })),
    expense: expense.map((r) => ({ code: r.code, name: r.nameAr, amount: fmt(r.balance) })),
    totals: { revenue: fmt(totalRevenue), expense: fmt(totalExpense), netIncome: fmt(net) },
  };
}

/** الميزانية العمومية — Assets = Liabilities + Equity + retained net income (as-of `to`). */
export async function balanceSheet(universityId: string | null, asOf?: Date) {
  const f: TermFilter = asOf ? { to: asOf } : {};
  const rows = await aggregate(universityId, f);
  const assets = rows.filter((r) => r.type === 'ASSET');
  const liabilities = rows.filter((r) => r.type === 'LIABILITY');
  const equity = rows.filter((r) => r.type === 'EQUITY');
  const revenue = sumMoney(rows.filter((r) => r.type === 'REVENUE').map((r) => r.balance));
  const expense = sumMoney(rows.filter((r) => r.type === 'EXPENSE').map((r) => r.balance));
  const netIncome = sub(revenue, expense); // current-period result rolls into equity until close

  const totalAssets = sumMoney(assets.map((r) => r.balance));
  const totalLiab = sumMoney(liabilities.map((r) => r.balance));
  const totalEquity = sumMoney(equity.map((r) => r.balance)).plus(netIncome);
  return {
    assets: assets.map((r) => ({ code: r.code, name: r.nameAr, amount: fmt(r.balance) })),
    liabilities: liabilities.map((r) => ({ code: r.code, name: r.nameAr, amount: fmt(r.balance) })),
    equity: [
      ...equity.map((r) => ({ code: r.code, name: r.nameAr, amount: fmt(r.balance) })),
      { code: '—', name: 'صافي ربح/خسارة الفترة', amount: fmt(netIncome) },
    ],
    totals: {
      assets: fmt(totalAssets),
      liabilitiesPlusEquity: fmt(totalLiab.plus(totalEquity)),
      balanced: totalAssets.comparedTo(totalLiab.plus(totalEquity)) === 0,
    },
  };
}

/** التدفق النقدي (مبسّط) — net movement on cash/bank accounts (codes 12xx) over the period. */
export async function cashFlow(universityId: string | null, f: TermFilter = {}) {
  const rows = (await aggregate(universityId, f)).filter((r) => r.code.startsWith('12'));
  const net = sumMoney(rows.map((r) => r.balance));
  return {
    rows: rows.map((r) => ({ code: r.code, name: r.nameAr, inflow: fmt(r.debit), outflow: fmt(r.credit), net: fmt(r.balance) })),
    totals: { netCashMovement: fmt(net) },
  };
}
