import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { sumMoney, sub, round2, isZero } from '@/lib/finance/money';
import { nextDocNumber } from '@/lib/finance/numbering';
import { accountIdByCode } from '@/lib/finance/coa';
import { postEvent } from '@/lib/finance/ledger';

/**
 * Treasury (Finance v2 — Phase 7). Fund transfers between asset accounts (posting to the GL) and
 * summary bank reconciliation (statement balance vs the GL balance of a bank account as-of a date).
 */

/** GL balance of an account (by code), signed to its normal side, over POSTED entries (≤ asOf). */
export async function accountBalance(universityId: string | null, accountCode: string, asOf?: Date): Promise<Prisma.Decimal> {
  const acc = await prisma.chartOfAccount.findFirst({ where: { universityId: universityId ?? null, code: accountCode } });
  if (!acc) throw new Error(`حساب غير موجود: ${accountCode}`);
  const lines = await prisma.journalLine.findMany({
    where: { accountId: acc.id, entry: { status: 'POSTED', universityId: universityId ?? null, ...(asOf ? { entryDate: { lte: asOf } } : {}) } },
    select: { debit: true, credit: true },
  });
  const debit = sumMoney(lines.map((l) => l.debit));
  const credit = sumMoney(lines.map((l) => l.credit));
  return acc.normalSide === 'DEBIT' ? sub(debit, credit) : sub(credit, debit);
}

/** Transfer money between two asset accounts → Dr to / Cr from. */
export async function fundTransfer(args: {
  universityId: string | null;
  fromAccountCode: string;
  toAccountCode: string;
  amount: number | string;
  transferDate?: Date;
  memo?: string | null;
  createdById?: string | null;
}): Promise<{ id: string; number: string }> {
  if (args.fromAccountCode === args.toAccountCode) throw new Error('لا يمكن التحويل لنفس الحساب');
  const amount = round2(args.amount);
  const date = args.transferDate ?? new Date();
  const period = await prisma.accountingPeriod.findFirst({ where: { universityId: args.universityId ?? null, startDate: { lte: date }, endDate: { gte: date } }, include: { fiscalYear: true } });
  const number = await nextDocNumber(args.universityId, 'TRANSFER', period?.fiscalYear.code ?? `${date.getUTCFullYear()}`, { prefix: 'TR-' });

  const transfer = await prisma.fundTransfer.create({
    data: { universityId: args.universityId ?? null, number, fromAccountCode: args.fromAccountCode, toAccountCode: args.toAccountCode, amount, transferDate: date, memo: args.memo ?? null, createdById: args.createdById ?? null },
  });
  await postEvent({
    universityId: args.universityId, entryDate: date, sourceType: 'FX', sourceId: transfer.id, memo: `تحويل ${number}`, postedById: args.createdById,
    lines: [
      { accountId: await accountIdByCode(args.universityId, args.toAccountCode), debit: amount },
      { accountId: await accountIdByCode(args.universityId, args.fromAccountCode), credit: amount },
    ],
  });
  await writeAudit('finance.transfer', { targetType: 'FundTransfer', targetId: transfer.id, metadata: { number, amount: amount.toFixed(2) }, universityId: args.universityId });
  return { id: transfer.id, number };
}

/** Summary reconciliation of a bank/cash account against a statement balance as-of a date. */
export async function reconcile(args: {
  universityId: string | null;
  accountCode: string;
  statementDate: Date;
  statementBalance: number | string;
  note?: string | null;
  createdById?: string | null;
}): Promise<{ id: string; glBalance: number; difference: number; status: string }> {
  const glBalance = await accountBalance(args.universityId, args.accountCode, args.statementDate);
  const statementBalance = round2(args.statementBalance);
  const difference = sub(statementBalance, glBalance);
  const status = isZero(difference) ? 'RECONCILED' : 'OPEN';
  const rec = await prisma.bankReconciliation.create({
    data: { universityId: args.universityId ?? null, accountCode: args.accountCode, statementDate: args.statementDate, statementBalance, glBalance, difference, status, note: args.note ?? null, createdById: args.createdById ?? null },
  });
  await writeAudit('finance.reconcile', { targetType: 'BankReconciliation', targetId: rec.id, metadata: { account: args.accountCode, difference: difference.toFixed(2) }, universityId: args.universityId });
  return { id: rec.id, glBalance: Number(glBalance.toFixed(2)), difference: Number(difference.toFixed(2)), status };
}
