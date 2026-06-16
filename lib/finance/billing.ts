import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { money, sumMoney, add, sub, mul, percentOf, round2, allocate, cmp, isZero } from '@/lib/finance/money';
import { nextDocNumber } from '@/lib/finance/numbering';
import { accountIdByCode } from '@/lib/finance/coa';
import { postEvent } from '@/lib/finance/ledger';
import { getFinanceConfig } from '@/lib/finance/settings';

/**
 * AR / student-billing engine (Finance v2 — Phase 2). Invoices, installment plans, receipts and
 * credit notes — each posting a balanced journal entry to the GL so the AR sub-ledger always
 * reconciles to the AR control account (1100). Money is Decimal throughout.
 */

type LineInput = { description: string; accountCode?: string; qty?: number; unitPrice: number | string; vatRate?: number };
const CASH_ACCOUNT: Record<string, string> = { CASH: '1200', BANK: '1210', GATEWAY: '1250', SCHOLARSHIP: '4900' };

async function fiscalCodeFor(date: Date, universityId: string | null): Promise<string> {
  const p = await prisma.accountingPeriod.findFirst({ where: { universityId: universityId ?? null, startDate: { lte: date }, endDate: { gte: date } }, include: { fiscalYear: true } });
  return p?.fiscalYear.code ?? date.getUTCFullYear().toString();
}

/** Issue an invoice from explicit lines: compute totals, assign a number, post Dr 1100 / Cr revenue (+ VAT). */
export async function issueInvoice(args: {
  universityId: string | null;
  studentId: string;
  lines: LineInput[];
  dueDate?: Date | null;
  academicYear?: string | null;
  semester?: string | null;
  memo?: string | null;
  feeAccountId?: string | null;
  structureId?: string | null;
  createdById?: string | null;
}): Promise<{ id: string; number: string; total: number }> {
  if (!args.lines.length) throw new Error('فاتورة بلا بنود');
  const issueDate = new Date();
  const computed = args.lines.map((l) => {
    const qty = l.qty ?? 1;
    const lineTotal = round2(mul(l.unitPrice, qty));
    const vatAmount = l.vatRate ? percentOf(lineTotal, l.vatRate) : money(0);
    return { description: l.description, accountCode: l.accountCode ?? '4100', qty, unitPrice: money(l.unitPrice), vatRate: l.vatRate ?? 0, lineTotal, vatAmount };
  });
  const subtotal = sumMoney(computed.map((c) => c.lineTotal));
  const vatTotal = sumMoney(computed.map((c) => c.vatAmount));
  const total = add(subtotal, vatTotal);

  const fiscalCode = await fiscalCodeFor(issueDate, args.universityId);
  const number = await nextDocNumber(args.universityId, 'INVOICE', fiscalCode, { prefix: 'INV-' });

  const invoice = await prisma.invoice.create({
    data: {
      universityId: args.universityId ?? null,
      studentId: args.studentId,
      feeAccountId: args.feeAccountId ?? null,
      structureId: args.structureId ?? null,
      number,
      academicYear: args.academicYear ?? null,
      semester: args.semester ?? null,
      issueDate,
      dueDate: args.dueDate ?? null,
      status: 'ISSUED',
      subtotal,
      vatTotal,
      total,
      paid: money(0),
      balance: total,
      memo: args.memo ?? null,
      createdById: args.createdById ?? null,
      lines: { create: computed.map((c) => ({ description: c.description, accountCode: c.accountCode, qty: c.qty, unitPrice: c.unitPrice, vatRate: c.vatRate, lineTotal: c.lineTotal, vatAmount: c.vatAmount })) },
    },
  });

  // GL: Dr 1100 (AR) total; Cr each revenue account its net; Cr 2200 (VAT) vatTotal.
  const byRevenue = new Map<string, Prisma.Decimal>();
  for (const c of computed) byRevenue.set(c.accountCode, add(byRevenue.get(c.accountCode) ?? money(0), c.lineTotal));
  const arId = await accountIdByCode(args.universityId, '1100');
  const glLines: { accountId: string; debit?: Prisma.Decimal; credit?: Prisma.Decimal }[] = [{ accountId: arId, debit: total }];
  for (const [code, amt] of byRevenue) glLines.push({ accountId: await accountIdByCode(args.universityId, code), credit: amt });
  if (!isZero(vatTotal)) glLines.push({ accountId: await accountIdByCode(args.universityId, '2200'), credit: vatTotal });

  await postEvent({ universityId: args.universityId, entryDate: issueDate, lines: glLines, sourceType: 'INVOICE', sourceId: invoice.id, memo: `فاتورة ${number}`, postedById: args.createdById });
  await writeAudit('finance.invoice.issue', { targetType: 'Invoice', targetId: invoice.id, metadata: { number, total: total.toFixed(2) }, universityId: args.universityId });
  return { id: invoice.id, number, total: Number(total.toFixed(2)) };
}

/** Build invoice lines from a fee-structure template and issue. */
export async function issueInvoiceFromStructure(args: { universityId: string | null; studentId: string; structureId: string; dueDate?: Date | null; academicYear?: string | null; semester?: string | null; createdById?: string | null }) {
  const structure = await prisma.feeStructure.findUnique({ where: { id: args.structureId }, include: { items: { orderBy: { order: 'asc' } } } });
  if (!structure) throw new Error('هيكل الرسوم غير موجود');
  const lines: LineInput[] = structure.items.map((it) => ({ description: it.label, accountCode: it.accountCode, unitPrice: it.amount.toString(), vatRate: it.vatRate }));
  return issueInvoice({ ...args, lines, structureId: structure.id, academicYear: args.academicYear ?? structure.academicYear, memo: `وفق هيكل ${structure.code}` });
}

/** Split an issued invoice's balance into N dated installments (rounding remainder on the last). */
export async function createInstallmentPlan(args: { invoiceId: string; count: number; firstDueDate: Date; intervalDays?: number }): Promise<{ id: string; installments: number }> {
  const invoice = await prisma.invoice.findUnique({ where: { id: args.invoiceId }, include: { plan: true } });
  if (!invoice) throw new Error('الفاتورة غير موجودة');
  if (invoice.plan) throw new Error('يوجد جدول أقساط لهذه الفاتورة');
  if (args.count < 1) throw new Error('عدد الأقساط غير صحيح');
  const amounts = allocate(invoice.balance, args.count);
  const interval = args.intervalDays ?? 30;
  const plan = await prisma.installmentPlan.create({
    data: {
      universityId: invoice.universityId,
      invoiceId: invoice.id,
      count: args.count,
      installments: {
        create: amounts.map((amt, i) => {
          const due = new Date(args.firstDueDate);
          due.setDate(due.getDate() + i * interval);
          return { seq: i + 1, dueDate: due, amount: amt, status: 'PENDING' };
        }),
      },
    },
  });
  return { id: plan.id, installments: amounts.length };
}

/** Record a receipt against one invoice; post Dr cash/bank/gateway / Cr 1100; update paid/balance/status. */
export async function recordReceipt(args: {
  universityId: string | null;
  studentId: string;
  invoiceId: string;
  amount: number | string;
  method?: string;
  reference?: string | null;
  installmentId?: string | null;
  receiptDate?: Date;
  createdById?: string | null;
}): Promise<{ id: string; number: string; invoiceStatus: string; invoiceBalance: number }> {
  const invoice = await prisma.invoice.findUnique({ where: { id: args.invoiceId }, include: { plan: { include: { installments: { orderBy: { seq: 'asc' } } } } } });
  if (!invoice) throw new Error('الفاتورة غير موجودة');
  if (invoice.status === 'VOID') throw new Error('فاتورة ملغاة');
  const amount = round2(args.amount);
  if (cmp(amount, 0) <= 0) throw new Error('قيمة غير صحيحة');
  if (cmp(amount, invoice.balance) > 0) throw new Error(`المبلغ ${amount.toFixed(2)} يتجاوز رصيد الفاتورة ${invoice.balance.toFixed(2)}`);

  const method = (args.method ?? 'CASH').toUpperCase();
  const cashCode = CASH_ACCOUNT[method] ?? '1200';
  const receiptDate = args.receiptDate ?? new Date();
  const fiscalCode = await fiscalCodeFor(receiptDate, args.universityId);
  const number = await nextDocNumber(args.universityId, 'RECEIPT', fiscalCode, { prefix: 'REC-' });

  const newPaid = add(invoice.paid, amount);
  const newBalance = sub(invoice.total, newPaid);
  const status = isZero(newBalance) ? 'PAID' : 'PARTIAL';

  await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({
      data: { universityId: args.universityId ?? null, studentId: args.studentId, number, receiptDate, method, amount, reference: args.reference ?? null, createdById: args.createdById ?? null },
    });
    await tx.receiptAllocation.create({ data: { receiptId: receipt.id, invoiceId: invoice.id, installmentId: args.installmentId ?? null, amount } });
    await tx.invoice.update({ where: { id: invoice.id }, data: { paid: newPaid, balance: newBalance, status } });
    // apply to installments in seq order if a plan exists
    if (invoice.plan) {
      let remaining = amount;
      for (const inst of invoice.plan.installments) {
        if (cmp(remaining, 0) <= 0) break;
        const due = sub(inst.amount, inst.paid);
        if (cmp(due, 0) <= 0) continue;
        const applied = cmp(remaining, due) >= 0 ? due : remaining;
        const instPaid = add(inst.paid, applied);
        await tx.installment.update({ where: { id: inst.id }, data: { paid: instPaid, status: isZero(sub(inst.amount, instPaid)) ? 'PAID' : 'PARTIAL' } });
        remaining = sub(remaining, applied);
      }
    }
    return receipt;
  });

  // GL: Dr cash/bank/gateway, Cr 1100 (AR)
  await postEvent({
    universityId: args.universityId,
    entryDate: receiptDate,
    lines: [
      { accountId: await accountIdByCode(args.universityId, cashCode), debit: amount },
      { accountId: await accountIdByCode(args.universityId, '1100'), credit: amount },
    ],
    sourceType: 'RECEIPT',
    sourceId: number, // receipt number is unique per tenant; keeps idempotency stable
    memo: `سند قبض ${number}`,
    postedById: args.createdById,
  });
  await writeAudit('finance.receipt.create', { targetType: 'Receipt', targetId: number, metadata: { amount: amount.toFixed(2), invoice: invoice.number }, universityId: args.universityId });
  return { id: number, number, invoiceStatus: status, invoiceBalance: Number(newBalance.toFixed(2)) };
}

/** Issue a credit note against an invoice; post Dr revenue(4900) / Cr 1100; reduce balance. */
export async function issueCreditNote(args: { universityId: string | null; invoiceId: string; amount: number | string; reason?: string | null; createdById?: string | null }) {
  const invoice = await prisma.invoice.findUnique({ where: { id: args.invoiceId } });
  if (!invoice) throw new Error('الفاتورة غير موجودة');
  const amount = round2(args.amount);
  if (cmp(amount, 0) <= 0 || cmp(amount, invoice.balance) > 0) throw new Error('قيمة إشعار الدائن غير صحيحة');
  const date = new Date();
  const fiscalCode = await fiscalCodeFor(date, args.universityId);
  const number = await nextDocNumber(args.universityId, 'CREDIT_NOTE', fiscalCode, { prefix: 'CN-' });

  const newBalance = sub(invoice.balance, amount);
  await prisma.creditNote.create({ data: { universityId: args.universityId ?? null, invoiceId: invoice.id, number, amount, reason: args.reason ?? null, createdById: args.createdById ?? null } });
  await prisma.invoice.update({ where: { id: invoice.id }, data: { balance: newBalance, total: sub(invoice.total, amount), status: isZero(newBalance) ? 'PAID' : invoice.status } });

  await postEvent({
    universityId: args.universityId,
    entryDate: date,
    lines: [
      { accountId: await accountIdByCode(args.universityId, '4900'), debit: amount },
      { accountId: await accountIdByCode(args.universityId, '1100'), credit: amount },
    ],
    sourceType: 'CREDIT_NOTE',
    sourceId: number,
    memo: `إشعار دائن ${number} على ${invoice.number}`,
    postedById: args.createdById,
  });
  await writeAudit('finance.creditnote.create', { targetType: 'CreditNote', targetId: number, metadata: { amount: amount.toFixed(2), invoice: invoice.number }, universityId: args.universityId });
  return { number, invoiceBalance: Number(newBalance.toFixed(2)) };
}

/** AR aging — open invoice balances bucketed by days overdue (buckets from finance.billing config). */
export async function arAging(universityId: string | null, asOf: Date = new Date()) {
  const cfg = await getFinanceConfig(universityId);
  const buckets = cfg.billing.agingBuckets; // e.g. [30,60,90]
  const invoices = await prisma.invoice.findMany({
    where: { universityId: universityId ?? null, status: { in: ['ISSUED', 'PARTIAL'] } },
    include: { student: { select: { studentCode: true, nameAr: true } } },
  });
  const labels = ['current', ...buckets.map((b, i) => (i === 0 ? `1-${b}` : `${buckets[i - 1] + 1}-${b}`)), `${buckets[buckets.length - 1] + 1}+`];
  const totals: Record<string, Prisma.Decimal> = Object.fromEntries(labels.map((l) => [l, money(0)]));
  const rows = invoices.map((inv) => {
    const ref = inv.dueDate ?? inv.issueDate;
    const days = Math.floor((asOf.getTime() - new Date(ref).getTime()) / 86400000);
    let bucket = 'current';
    if (days > 0) {
      bucket = `${buckets[buckets.length - 1] + 1}+`;
      for (let i = 0; i < buckets.length; i++) {
        if (days <= buckets[i]) { bucket = i === 0 ? `1-${buckets[0]}` : `${buckets[i - 1] + 1}-${buckets[i]}`; break; }
      }
    }
    totals[bucket] = add(totals[bucket], inv.balance);
    return { number: inv.number, student: inv.student.nameAr, studentCode: inv.student.studentCode, balance: Number(inv.balance.toFixed(2)), daysOverdue: Math.max(0, days), bucket };
  });
  return { labels, rows, totals: Object.fromEntries(labels.map((l) => [l, Number(totals[l].toFixed(2))])), grandTotal: Number(sumMoney(invoices.map((i) => i.balance)).toFixed(2)) };
}

/** Statement of account for one student: invoices, receipts, running balance. */
export async function statementOfAccount(universityId: string | null, studentId: string) {
  const [invoices, receipts] = await Promise.all([
    prisma.invoice.findMany({ where: { universityId: universityId ?? null, studentId }, orderBy: { issueDate: 'asc' } }),
    prisma.receipt.findMany({ where: { universityId: universityId ?? null, studentId }, orderBy: { receiptDate: 'asc' } }),
  ]);
  const charged = sumMoney(invoices.map((i) => i.total));
  const paid = sumMoney(receipts.map((r) => r.amount));
  return {
    invoices: invoices.map((i) => ({ number: i.number, date: i.issueDate, dueDate: i.dueDate, total: Number(i.total.toFixed(2)), paid: Number(i.paid.toFixed(2)), balance: Number(i.balance.toFixed(2)), status: i.status })),
    receipts: receipts.map((r) => ({ number: r.number, date: r.receiptDate, method: r.method, amount: Number(r.amount.toFixed(2)) })),
    totals: { charged: Number(charged.toFixed(2)), paid: Number(paid.toFixed(2)), balance: Number(sub(charged, paid).toFixed(2)) },
  };
}
