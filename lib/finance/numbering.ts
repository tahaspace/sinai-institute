import prisma from '@/lib/prisma';

/**
 * Gap-free official numbering (Finance v2 — Phase 0). Egyptian/auditor requirement: invoice,
 * receipt, credit-note and journal numbers must be sequential with NO gaps. A DocumentSequence
 * row per (tenant, docType, fiscalCode) holds the next counter; we consume it inside a
 * transaction so concurrent issues don't reuse a number.
 *
 * Note: true high-concurrency gap-free numbering ideally uses a row lock (SELECT … FOR UPDATE);
 * the repo bans raw SQL, so we use a transaction + the unique constraint + a single create-race
 * retry. Adequate for institute volumes; revisit with an advisory lock if contention appears.
 */

export type DocType = 'INVOICE' | 'RECEIPT' | 'CREDIT_NOTE' | 'JOURNAL' | 'EINVOICE' | 'PAYRUN' | 'BILL' | 'TRANSFER';

export async function nextDocNumber(
  universityId: string | null,
  docType: DocType,
  fiscalCode: string,
  opts?: { prefix?: string; padding?: number },
): Promise<string> {
  const consume = async (): Promise<{ prefix: string; padding: number; number: number }> =>
    prisma.$transaction(async (tx) => {
      const seq = await tx.documentSequence.findFirst({ where: { universityId: universityId ?? null, docType, fiscalCode } });
      if (!seq) {
        const created = await tx.documentSequence.create({
          data: {
            universityId: universityId ?? null,
            docType,
            fiscalCode,
            prefix: opts?.prefix ?? '',
            padding: opts?.padding ?? 6,
            nextNumber: 2, // we consume 1 now
          },
        });
        return { prefix: created.prefix, padding: created.padding, number: 1 };
      }
      const number = seq.nextNumber;
      await tx.documentSequence.update({ where: { id: seq.id }, data: { nextNumber: number + 1 } });
      return { prefix: seq.prefix, padding: seq.padding, number };
    });

  let res: { prefix: string; padding: number; number: number };
  try {
    res = await consume();
  } catch {
    // create-race: another caller created the sequence first — retry once (now the update path).
    res = await consume();
  }
  return `${res.prefix}${fiscalCode}-${String(res.number).padStart(res.padding, '0')}`;
}
