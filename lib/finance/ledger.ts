import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { money, sumMoney, cmp, isZero } from '@/lib/finance/money';
import { assertPeriodOpen } from '@/lib/finance/periods';
import { nextDocNumber } from '@/lib/finance/numbering';

/**
 * Double-entry posting engine (Finance v2 — Phase 1). The single chokepoint through which every
 * business event reaches the General Ledger. Invariants enforced here:
 *  - SUM(debit) === SUM(credit) per entry, and the entry is non-empty/non-zero
 *  - the target AccountingPeriod is OPEN (assertPeriodOpen)
 *  - POSTED entries are immutable — corrections are reversing entries only
 *  - idempotent on (universityId, sourceType, sourceId): a retried event never double-posts
 */
export type PostLine = {
  accountId: string;
  debit?: number | string | Prisma.Decimal;
  credit?: number | string | Prisma.Decimal;
  memo?: string | null;
  costCenterId?: string | null;
};

/** Throws unless debits == credits and the entry carries a non-zero amount. */
export function assertBalanced(lines: PostLine[]): { debit: Prisma.Decimal; credit: Prisma.Decimal } {
  if (!lines.length) throw new Error('قيد يومية بلا سطور');
  const debit = sumMoney(lines.map((l) => l.debit ?? 0));
  const credit = sumMoney(lines.map((l) => l.credit ?? 0));
  if (cmp(debit, credit) !== 0) {
    throw new Error(`القيد غير متوازن: مدين ${debit.toFixed(2)} ≠ دائن ${credit.toFixed(2)}`);
  }
  if (isZero(debit)) throw new Error('قيمة القيد صفر');
  // each line must be debit XOR credit (not both, not neither)
  for (const l of lines) {
    const d = !isZero(l.debit ?? 0);
    const c = !isZero(l.credit ?? 0);
    if (d === c) throw new Error('كل سطر يجب أن يكون مدينًا أو دائنًا (وليس كليهما)');
  }
  return { debit, credit };
}

async function fiscalCodeForPeriod(periodId: string): Promise<string> {
  const p = await prisma.accountingPeriod.findUnique({ where: { id: periodId }, include: { fiscalYear: true } });
  return p?.fiscalYear.code ?? new Date().getUTCFullYear().toString();
}

/** Create a DRAFT journal entry (balanced-checked). No GL effect until posted. */
export async function createDraftEntry(args: {
  universityId: string | null;
  entryDate: Date;
  lines: PostLine[];
  memo?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  createdById?: string | null;
}): Promise<{ id: string }> {
  assertBalanced(args.lines);
  const periodId = await assertPeriodOpen(args.universityId, args.entryDate);
  const fiscalCode = await fiscalCodeForPeriod(periodId);
  const entryNo = await nextDocNumber(args.universityId, 'JOURNAL', fiscalCode, { prefix: 'JV-' });

  const entry = await prisma.journalEntry.create({
    data: {
      universityId: args.universityId ?? null,
      periodId,
      entryNo,
      entryDate: args.entryDate,
      memo: args.memo ?? null,
      sourceType: args.sourceType ?? 'MANUAL',
      sourceId: args.sourceId ?? null,
      status: 'DRAFT',
      createdById: args.createdById ?? null,
      lines: {
        create: args.lines.map((l) => ({
          accountId: l.accountId,
          debit: money(l.debit ?? 0),
          credit: money(l.credit ?? 0),
          memo: l.memo ?? null,
          costCenterId: l.costCenterId ?? null,
        })),
      },
    },
  });
  await writeAudit('finance.journal.create', { targetType: 'JournalEntry', targetId: entry.id, metadata: { entryNo }, universityId: args.universityId });
  return { id: entry.id };
}

/** Post a DRAFT entry → POSTED. Re-asserts balance + open period. */
export async function postEntry(entryId: string, postedById?: string | null): Promise<{ id: string; status: string }> {
  const e = await prisma.journalEntry.findUnique({ where: { id: entryId }, include: { lines: true } });
  if (!e) throw new Error('قيد غير موجود');
  if (e.status === 'POSTED') return { id: e.id, status: 'POSTED' };
  if (e.status === 'REVERSED') throw new Error('لا يمكن ترحيل قيد معكوس');
  assertBalanced(e.lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })));
  await assertPeriodOpen(e.universityId, e.entryDate);
  const updated = await prisma.journalEntry.update({ where: { id: entryId }, data: { status: 'POSTED', postedById: postedById ?? null, postedAt: new Date() } });
  await writeAudit('finance.journal.post', { targetType: 'JournalEntry', targetId: entryId, metadata: { entryNo: e.entryNo }, universityId: e.universityId });
  return { id: updated.id, status: updated.status };
}

/**
 * Create + post in one shot, idempotent on (universityId, sourceType, sourceId). The path used by
 * automatic event posting (AR invoice/receipt, expense, payroll …) in later phases.
 */
export async function postEvent(args: {
  universityId: string | null;
  entryDate: Date;
  lines: PostLine[];
  sourceType: string;
  sourceId: string;
  memo?: string | null;
  postedById?: string | null;
}): Promise<{ id: string; status: string; idempotent: boolean }> {
  const existing = await prisma.journalEntry.findFirst({
    where: { universityId: args.universityId ?? null, sourceType: args.sourceType, sourceId: args.sourceId, status: { in: ['DRAFT', 'POSTED'] } },
  });
  if (existing) {
    if (existing.status === 'DRAFT') {
      const p = await postEntry(existing.id, args.postedById);
      return { ...p, idempotent: true };
    }
    return { id: existing.id, status: existing.status, idempotent: true };
  }
  const draft = await createDraftEntry({ ...args, createdById: args.postedById });
  const posted = await postEntry(draft.id, args.postedById);
  return { ...posted, idempotent: false };
}

/**
 * Reverse a POSTED entry: create a new POSTED entry with debit/credit swapped (into the open
 * period for `reverseDate`, default today), and mark the original REVERSED. The audit trail keeps
 * both — corrections never mutate a posted entry.
 */
export async function reverseEntry(entryId: string, opts?: { reversedById?: string | null; reverseDate?: Date }): Promise<{ id: string; reversalId: string }> {
  const e = await prisma.journalEntry.findUnique({ where: { id: entryId }, include: { lines: true } });
  if (!e) throw new Error('قيد غير موجود');
  if (e.status !== 'POSTED') throw new Error('يمكن عكس القيود المُرحّلة فقط');

  const reverseDate = opts?.reverseDate ?? new Date();
  const periodId = await assertPeriodOpen(e.universityId, reverseDate);
  const fiscalCode = await fiscalCodeForPeriod(periodId);
  const entryNo = await nextDocNumber(e.universityId, 'JOURNAL', fiscalCode, { prefix: 'JV-' });

  const reversal = await prisma.$transaction(async (tx) => {
    const rev = await tx.journalEntry.create({
      data: {
        universityId: e.universityId,
        periodId,
        entryNo,
        entryDate: reverseDate,
        memo: `عكس القيد ${e.entryNo}`,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        status: 'POSTED',
        postedById: opts?.reversedById ?? null,
        postedAt: new Date(),
        reversesEntryId: e.id,
        lines: { create: e.lines.map((l) => ({ accountId: l.accountId, debit: l.credit, credit: l.debit, memo: l.memo, costCenterId: l.costCenterId })) },
      },
    });
    await tx.journalEntry.update({ where: { id: e.id }, data: { status: 'REVERSED' } });
    return rev;
  });
  await writeAudit('finance.journal.reverse', { targetType: 'JournalEntry', targetId: entryId, metadata: { reversalId: reversal.id, entryNo: reversal.entryNo }, universityId: e.universityId });
  return { id: entryId, reversalId: reversal.id };
}
