import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { money, sumMoney, add, percentOf, round2 } from '@/lib/finance/money';
import { nextDocNumber } from '@/lib/finance/numbering';

/**
 * ETA e-invoice document builder (Finance v2 — Phase 4). Builds an EInvoiceDocument (+ snapshot
 * lines, VAT computed) from an issued Invoice. This part works WITHOUT external credentials — it
 * is the canonical legal document; signing + submission to the ETA (sign.ts/client.ts) are the
 * parts that need ETA creds. Lines are snapshotted so the legal document is immutable.
 */
export async function buildFromInvoice(args: { universityId: string | null; invoiceId: string; createdById?: string | null }): Promise<{ id: string; internalId: string; total: number }> {
  const invoice = await prisma.invoice.findUnique({ where: { id: args.invoiceId }, include: { lines: true } });
  if (!invoice) throw new Error('الفاتورة غير موجودة');
  const existing = await prisma.eInvoiceDocument.findFirst({ where: { universityId: args.universityId ?? null, sourceType: 'INVOICE', sourceId: invoice.id } });
  if (existing) throw new Error('تم بناء مستند ضريبي لهذه الفاتورة بالفعل');

  const date = new Date();
  const period = await prisma.accountingPeriod.findFirst({ where: { universityId: args.universityId ?? null, startDate: { lte: date }, endDate: { gte: date } }, include: { fiscalYear: true } });
  const internalId = await nextDocNumber(args.universityId, 'EINVOICE', period?.fiscalYear.code ?? `${date.getUTCFullYear()}`, { prefix: 'ETA-' });

  const lines = invoice.lines.map((l) => {
    const netTotal = round2(l.lineTotal);
    const vatAmount = l.vatRate ? percentOf(netTotal, l.vatRate) : money(0);
    return { description: l.description, quantity: l.qty, unitPrice: money(l.unitPrice), vatRate: new Prisma.Decimal(l.vatRate), netTotal, vatAmount, total: add(netTotal, vatAmount) };
  });
  const netAmount = sumMoney(lines.map((l) => l.netTotal));
  const vatAmount = sumMoney(lines.map((l) => l.vatAmount));
  const totalAmount = add(netAmount, vatAmount);

  const doc = await prisma.eInvoiceDocument.create({
    data: {
      universityId: args.universityId ?? null, sourceType: 'INVOICE', sourceId: invoice.id, internalId, documentType: 'I', status: 'DRAFT',
      netAmount, vatAmount, totalAmount, createdById: args.createdById ?? null,
      lines: { create: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, netTotal: l.netTotal, vatRate: l.vatRate, vatAmount: l.vatAmount, total: l.total })) },
    },
  });
  await writeAudit('finance.einvoice.build', { targetType: 'EInvoiceDocument', targetId: doc.id, metadata: { internalId, total: totalAmount.toFixed(2) }, universityId: args.universityId });
  return { id: doc.id, internalId, total: Number(totalAmount.toFixed(2)) };
}

/** Canonical JSON payload an ETA submission would carry (built from the snapshot). */
export async function canonicalPayload(documentId: string) {
  const doc = await prisma.eInvoiceDocument.findUnique({ where: { id: documentId }, include: { lines: true } });
  if (!doc) throw new Error('المستند غير موجود');
  return {
    internalId: doc.internalId,
    documentType: doc.documentType,
    dateTimeIssued: doc.createdAt.toISOString(),
    totalSalesAmount: Number(doc.netAmount.toFixed(2)),
    totalAmount: Number(doc.totalAmount.toFixed(2)),
    taxTotals: [{ taxType: 'T1', amount: Number(doc.vatAmount.toFixed(2)) }],
    invoiceLines: doc.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitValue: Number(l.unitPrice.toFixed(2)), salesTotal: Number(l.netTotal.toFixed(2)), total: Number(l.total.toFixed(2)), taxableItems: [{ taxType: 'T1', rate: Number(l.vatRate), amount: Number(l.vatAmount.toFixed(2)) }] })),
  };
}
