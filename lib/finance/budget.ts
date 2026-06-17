import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { money, sumMoney, sub } from '@/lib/finance/money';
import { accountBalance } from '@/lib/finance/treasury';

/**
 * Budgeting (Finance v2 — Phase 7). A budget is a set of {account, amount} lines for a fiscal
 * period; budget-vs-actual compares each line's planned amount to the GL actual on that account.
 */
export async function createBudget(args: {
  universityId: string | null;
  name: string;
  fiscalCode: string;
  lines: { accountCode: string; amount: number | string; costCenterId?: string | null }[];
}): Promise<{ id: string; lines: number }> {
  if (await prisma.budget.findFirst({ where: { universityId: args.universityId ?? null, name: args.name } })) {
    throw new Error('يوجد موازنة بنفس الاسم');
  }
  const budget = await prisma.budget.create({
    data: {
      universityId: args.universityId ?? null, name: args.name, fiscalCode: args.fiscalCode, status: 'ACTIVE',
      lines: { create: args.lines.map((l) => ({ accountCode: l.accountCode, amount: money(l.amount) as Prisma.Decimal, costCenterId: l.costCenterId ?? null })) },
    },
  });
  return { id: budget.id, lines: args.lines.length };
}

/** Budget vs actual: planned line amount vs the GL actual balance on each account. */
export async function budgetVsActual(universityId: string | null, budgetId: string) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId }, include: { lines: true } });
  if (!budget) throw new Error('الموازنة غير موجودة');
  const rows = await Promise.all(
    budget.lines.map(async (l) => {
      const acc = await prisma.chartOfAccount.findFirst({ where: { universityId: universityId ?? null, code: l.accountCode } });
      const actual = acc ? await accountBalance(universityId, l.accountCode) : money(0);
      const variance = sub(l.amount, actual);
      return {
        accountCode: l.accountCode,
        accountName: acc?.nameAr ?? l.accountCode,
        budget: Number(Number(l.amount).toFixed(2)),
        actual: Number(actual.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        usedPct: Number(l.amount) > 0 ? Math.round((Number(actual) / Number(l.amount)) * 100) : 0,
      };
    }),
  );
  const totalBudget = sumMoney(budget.lines.map((l) => l.amount));
  const totalActual = sumMoney(rows.map((r) => r.actual));
  return {
    name: budget.name, fiscalCode: budget.fiscalCode,
    rows,
    totals: { budget: Number(totalBudget.toFixed(2)), actual: Number(totalActual.toFixed(2)), variance: Number(sub(totalBudget, totalActual).toFixed(2)) },
  };
}

export async function listBudgets(universityId: string | null) {
  const budgets = await prisma.budget.findMany({ where: { universityId: universityId ?? null }, include: { lines: true }, orderBy: { createdAt: 'desc' } });
  return budgets.map((b) => ({ id: b.id, name: b.name, fiscalCode: b.fiscalCode, status: b.status, lineCount: b.lines.length, total: Number(sumMoney(b.lines.map((l) => l.amount)).toFixed(2)) }));
}
