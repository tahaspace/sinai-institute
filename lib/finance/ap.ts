import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { money, sumMoney, add, sub, percentOf, round2, isZero } from '@/lib/finance/money';
import { nextDocNumber } from '@/lib/finance/numbering';
import { accountIdByCode } from '@/lib/finance/coa';
import { postEvent } from '@/lib/finance/ledger';

/**
 * Accounts Payable / expenses engine (Finance v2 — Phase 5). Vendor bills and staff expense
 * claims, posting to the GL. Maker-checker: a bill is created DRAFT, APPROVED posts
 * Dr expense / Cr AP(2100), and PAY posts Dr AP / Cr withholding(2300) + Cr bank(1210).
 * VAT is treated as cost here (refined in the Phase 4 tax layer). Money is Decimal throughout.
 */
type BillLineInput = { description: string; accountCode?: string; amount: number | string; vatRate?: number };

async function fiscalCodeFor(date: Date, universityId: string | null): Promise<string> {
  const p = await prisma.accountingPeriod.findFirst({ where: { universityId: universityId ?? null, startDate: { lte: date }, endDate: { gte: date } }, include: { fiscalYear: true } });
  return p?.fiscalYear.code ?? date.getUTCFullYear().toString();
}

/** Create a DRAFT vendor bill (no GL effect until approved). */
export async function createBill(args: {
  universityId: string | null;
  vendorId: string;
  lines: BillLineInput[];
  billDate?: Date;
  dueDate?: Date | null;
  memo?: string | null;
  createdById?: string | null;
}): Promise<{ id: string; number: string; total: number }> {
  if (!args.lines.length) throw new Error('فاتورة مورد بلا بنود');
  const billDate = args.billDate ?? new Date();
  const computed = args.lines.map((l) => {
    const amount = round2(l.amount);
    const vatAmount = l.vatRate ? percentOf(amount, l.vatRate) : money(0);
    return { description: l.description, accountCode: l.accountCode ?? '5900', amount, vatRate: l.vatRate ?? 0, vatAmount };
  });
  const subtotal = sumMoney(computed.map((c) => c.amount));
  const vatTotal = sumMoney(computed.map((c) => c.vatAmount));
  const total = add(subtotal, vatTotal);
  const fiscalCode = await fiscalCodeFor(billDate, args.universityId);
  const number = await nextDocNumber(args.universityId, 'BILL', fiscalCode, { prefix: 'BILL-' });

  const bill = await prisma.bill.create({
    data: {
      universityId: args.universityId ?? null, vendorId: args.vendorId, number, billDate, dueDate: args.dueDate ?? null,
      status: 'DRAFT', subtotal, vatTotal, total, paid: money(0), balance: total, memo: args.memo ?? null, createdById: args.createdById ?? null,
      lines: { create: computed.map((c) => ({ description: c.description, accountCode: c.accountCode, amount: c.amount, vatRate: c.vatRate })) },
    },
  });
  await writeAudit('finance.bill.create', { targetType: 'Bill', targetId: bill.id, metadata: { number, total: total.toFixed(2) }, universityId: args.universityId });
  return { id: bill.id, number, total: Number(total.toFixed(2)) };
}

/** Approve a DRAFT bill (checker) → post Dr expense (per line incl. VAT-as-cost) / Cr 2100 (AP). */
export async function approveBill(billId: string, approverId?: string | null): Promise<{ id: string; status: string }> {
  const bill = await prisma.bill.findUnique({ where: { id: billId }, include: { lines: true } });
  if (!bill) throw new Error('فاتورة المورد غير موجودة');
  if (bill.status !== 'DRAFT') throw new Error('لا يمكن اعتماد إلا فاتورة في حالة مسودة');

  // Group expense debits by account; spread VAT proportionally as cost onto the expense lines.
  const byExpense = new Map<string, Prisma.Decimal>();
  for (const l of bill.lines) {
    const vat = l.vatRate ? percentOf(l.amount, l.vatRate) : money(0);
    byExpense.set(l.accountCode, add(byExpense.get(l.accountCode) ?? money(0), add(l.amount, vat)));
  }
  const lines: { accountId: string; debit?: Prisma.Decimal; credit?: Prisma.Decimal }[] = [];
  for (const [code, amt] of byExpense) lines.push({ accountId: await accountIdByCode(bill.universityId, code), debit: amt });
  lines.push({ accountId: await accountIdByCode(bill.universityId, '2100'), credit: bill.total });

  await postEvent({ universityId: bill.universityId, entryDate: bill.billDate, lines, sourceType: 'EXPENSE', sourceId: bill.id, memo: `فاتورة مورد ${bill.number}`, postedById: approverId });
  await prisma.bill.update({ where: { id: billId }, data: { status: 'APPROVED', approvedById: approverId ?? null, approvedAt: new Date() } });
  await writeAudit('finance.bill.approve', { targetType: 'Bill', targetId: billId, metadata: { number: bill.number }, universityId: bill.universityId });
  return { id: billId, status: 'APPROVED' };
}

/** Pay an APPROVED bill → Dr 2100 (AP) / Cr 2300 (withholding) + Cr 1210 (bank). */
export async function payBill(billId: string, opts?: { bankCode?: string; paidById?: string | null; payDate?: Date }): Promise<{ id: string; status: string; withholding: number; net: number }> {
  const bill = await prisma.bill.findUnique({ where: { id: billId }, include: { vendor: true } });
  if (!bill) throw new Error('فاتورة المورد غير موجودة');
  if (bill.status !== 'APPROVED') throw new Error('يجب اعتماد الفاتورة قبل السداد');
  const payDate = opts?.payDate ?? new Date();
  const withholding = bill.vendor.withholdingRate ? percentOf(bill.balance, bill.vendor.withholdingRate) : money(0);
  const net = sub(bill.balance, withholding);
  const bankCode = opts?.bankCode ?? '1210';

  const lines: { accountId: string; debit?: Prisma.Decimal; credit?: Prisma.Decimal }[] = [
    { accountId: await accountIdByCode(bill.universityId, '2100'), debit: bill.balance },
  ];
  if (!isZero(withholding)) lines.push({ accountId: await accountIdByCode(bill.universityId, '2300'), credit: withholding });
  lines.push({ accountId: await accountIdByCode(bill.universityId, bankCode), credit: net });

  await postEvent({ universityId: bill.universityId, entryDate: payDate, lines, sourceType: 'EXPENSE', sourceId: `PAY-${bill.id}`, memo: `سداد فاتورة مورد ${bill.number}`, postedById: opts?.paidById });
  await prisma.bill.update({ where: { id: billId }, data: { status: 'PAID', paid: bill.total, balance: money(0) } });
  await writeAudit('finance.bill.pay', { targetType: 'Bill', targetId: billId, metadata: { number: bill.number, withholding: withholding.toFixed(2) }, universityId: bill.universityId });
  return { id: billId, status: 'PAID', withholding: Number(withholding.toFixed(2)), net: Number(net.toFixed(2)) };
}

/** Staff expense claim (maker). */
export async function createExpenseClaim(args: { universityId: string | null; claimantName: string; description: string; amount: number | string; accountCode?: string; createdById?: string | null }) {
  const claim = await prisma.expenseClaim.create({
    data: { universityId: args.universityId ?? null, claimantName: args.claimantName, description: args.description, amount: round2(args.amount), accountCode: args.accountCode ?? '5900', status: 'PENDING', createdById: args.createdById ?? null },
  });
  await writeAudit('finance.expense.create', { targetType: 'ExpenseClaim', targetId: claim.id, universityId: args.universityId });
  return { id: claim.id };
}

/** Approve/reject an expense claim; on approve+pay post Dr expense / Cr bank. */
export async function decideExpenseClaim(claimId: string, opts: { approve: boolean; pay?: boolean; bankCode?: string; approverId?: string | null }) {
  const claim = await prisma.expenseClaim.findUnique({ where: { id: claimId } });
  if (!claim) throw new Error('طلب المصروف غير موجود');
  if (claim.status !== 'PENDING') throw new Error('تم البت في الطلب');
  if (!opts.approve) {
    await prisma.expenseClaim.update({ where: { id: claimId }, data: { status: 'REJECTED', approvedById: opts.approverId ?? null, decidedAt: new Date() } });
    return { id: claimId, status: 'REJECTED' };
  }
  const payNow = opts.pay ?? true;
  if (payNow) {
    const date = new Date();
    await postEvent({
      universityId: claim.universityId, entryDate: date, sourceType: 'EXPENSE', sourceId: `CLAIM-${claim.id}`, memo: `صرف مصروف: ${claim.description}`, postedById: opts.approverId,
      lines: [
        { accountId: await accountIdByCode(claim.universityId, claim.accountCode), debit: claim.amount },
        { accountId: await accountIdByCode(claim.universityId, opts.bankCode ?? '1210'), credit: claim.amount },
      ],
    });
  }
  await prisma.expenseClaim.update({ where: { id: claimId }, data: { status: payNow ? 'PAID' : 'APPROVED', approvedById: opts.approverId ?? null, decidedAt: new Date() } });
  await writeAudit('finance.expense.approve', { targetType: 'ExpenseClaim', targetId: claimId, universityId: claim.universityId });
  return { id: claimId, status: payNow ? 'PAID' : 'APPROVED' };
}

/** Open AP summary (approved, unpaid bills). */
export async function apOpen(universityId: string | null) {
  const bills = await prisma.bill.findMany({ where: { universityId: universityId ?? null, status: 'APPROVED' }, include: { vendor: { select: { nameAr: true } } } });
  return { count: bills.length, total: Number(sumMoney(bills.map((b) => b.balance)).toFixed(2)) };
}
