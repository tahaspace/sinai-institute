import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { money, sumMoney, add, sub, percentOf, round2, isZero, cmp } from '@/lib/finance/money';
import { accountIdByCode } from '@/lib/finance/coa';
import { postEvent } from '@/lib/finance/ledger';
import { getFinanceConfig } from '@/lib/finance/settings';

/**
 * Payroll engine (Finance v2 — Phase 6). Compute monthly payslips from each employee's base +
 * salary components, apply (simplified) social insurance + income tax, and post the run to the GL:
 *   Dr 5100 (Salaries) gross / Cr 2400 (net payable) / Cr 2300 (tax+insurance+deductions).
 * Pay posts Dr 2400 / Cr 1210 (bank). Money is Decimal throughout. Tax is a configurable flat rate
 * for now (finance.config.payroll) — refine to Egyptian brackets later.
 */
type Computed = {
  employeeId: string;
  gross: Prisma.Decimal;
  deductions: Prisma.Decimal;
  tax: Prisma.Decimal;
  insurance: Prisma.Decimal;
  net: Prisma.Decimal;
  lines: { label: string; kind: string; amount: Prisma.Decimal }[];
};

async function computeFor(employeeId: string, cfg: Awaited<ReturnType<typeof getFinanceConfig>>): Promise<Computed> {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, include: { components: { include: { component: true } } } });
  if (!emp) throw new Error('موظف غير موجود');
  const lines: { label: string; kind: string; amount: Prisma.Decimal }[] = [{ label: 'الراتب الأساسي', kind: 'EARNING', amount: money(emp.baseSalary) }];
  let earnings = money(emp.baseSalary);
  let taxableEarnings = money(emp.baseSalary);
  let deductions = money(0);
  for (const ec of emp.components) {
    const c = ec.component;
    const val = c.isPercentage ? percentOf(emp.baseSalary, Number(ec.value)) : money(ec.value);
    if (c.kind === 'EARNING') {
      earnings = add(earnings, val);
      if (c.isTaxable) taxableEarnings = add(taxableEarnings, val);
      lines.push({ label: c.nameAr, kind: 'EARNING', amount: val });
    } else {
      deductions = add(deductions, val);
      lines.push({ label: c.nameAr, kind: 'DEDUCTION', amount: val });
    }
  }
  const gross = earnings;
  const insurance = round2(percentOf(taxableEarnings, cfg.payroll.insuranceRate));
  const taxableBase = sub(sub(taxableEarnings, insurance), money(cfg.payroll.monthlyExemption));
  const tax = cmp(taxableBase, 0) > 0 ? round2(percentOf(taxableBase, cfg.payroll.taxRate)) : money(0);
  if (!isZero(insurance)) lines.push({ label: 'التأمينات الاجتماعية', kind: 'INSURANCE', amount: insurance });
  if (!isZero(tax)) lines.push({ label: 'ضريبة الدخل', kind: 'TAX', amount: tax });
  const net = sub(sub(sub(gross, deductions), tax), insurance);
  return { employeeId, gross, deductions, tax, insurance, net, lines };
}

/** Create a DRAFT pay run for `month` with a payslip per active employee. */
export async function createPayRun(args: { universityId: string | null; month: string; createdById?: string | null }): Promise<{ id: string; month: string; employees: number; net: number }> {
  if (await prisma.payRun.findFirst({ where: { universityId: args.universityId ?? null, month: args.month } })) {
    throw new Error(`يوجد مسير رواتب للشهر ${args.month}`);
  }
  const cfg = await getFinanceConfig(args.universityId);
  const employees = await prisma.employee.findMany({ where: { universityId: args.universityId ?? null, isActive: true } });
  if (!employees.length) throw new Error('لا يوجد موظفون نشطون');
  const computed = await Promise.all(employees.map((e) => computeFor(e.id, cfg)));

  const grossTotal = sumMoney(computed.map((c) => c.gross));
  const deductionTotal = sumMoney(computed.map((c) => c.deductions));
  const taxTotal = sumMoney(computed.map((c) => c.tax));
  const insuranceTotal = sumMoney(computed.map((c) => c.insurance));
  const netTotal = sumMoney(computed.map((c) => c.net));

  const run = await prisma.payRun.create({
    data: {
      universityId: args.universityId ?? null, month: args.month, status: 'DRAFT', grossTotal, deductionTotal, taxTotal, insuranceTotal, netTotal, createdById: args.createdById ?? null,
      payslips: { create: computed.map((c) => ({ employeeId: c.employeeId, gross: c.gross, deductions: c.deductions, tax: c.tax, insurance: c.insurance, net: c.net, lines: { create: c.lines.map((l) => ({ label: l.label, kind: l.kind, amount: l.amount })) } })) },
    },
  });
  await writeAudit('finance.payroll.run', { targetType: 'PayRun', targetId: run.id, metadata: { month: args.month, net: netTotal.toFixed(2) }, universityId: args.universityId });
  return { id: run.id, month: args.month, employees: employees.length, net: Number(netTotal.toFixed(2)) };
}

/** Approve a DRAFT run → post Dr 5100 (gross) / Cr 2400 (net) / Cr 2300 (withholdings). */
export async function approvePayRun(payRunId: string, approverId?: string | null): Promise<{ id: string; status: string }> {
  const run = await prisma.payRun.findUnique({ where: { id: payRunId } });
  if (!run) throw new Error('مسير الرواتب غير موجود');
  if (run.status !== 'DRAFT') throw new Error('لا يمكن اعتماد إلا مسير في حالة مسودة');
  const withholdings = sub(run.grossTotal, run.netTotal); // tax + insurance + deductions
  const lines: { accountId: string; debit?: Prisma.Decimal; credit?: Prisma.Decimal }[] = [
    { accountId: await accountIdByCode(run.universityId, '5100'), debit: run.grossTotal },
    { accountId: await accountIdByCode(run.universityId, '2400'), credit: run.netTotal },
  ];
  if (!isZero(withholdings)) lines.push({ accountId: await accountIdByCode(run.universityId, '2300'), credit: withholdings });

  await postEvent({ universityId: run.universityId, entryDate: run.runDate, lines, sourceType: 'PAYROLL', sourceId: run.id, memo: `مسير رواتب ${run.month}`, postedById: approverId });
  await prisma.payRun.update({ where: { id: payRunId }, data: { status: 'APPROVED', approvedById: approverId ?? null, approvedAt: new Date() } });
  await writeAudit('finance.payroll.approve', { targetType: 'PayRun', targetId: payRunId, metadata: { month: run.month }, universityId: run.universityId });
  return { id: payRunId, status: 'APPROVED' };
}

/** Pay an APPROVED run → Dr 2400 (net) / Cr 1210 (bank). */
export async function payPayRun(payRunId: string, opts?: { bankCode?: string; paidById?: string | null }): Promise<{ id: string; status: string }> {
  const run = await prisma.payRun.findUnique({ where: { id: payRunId } });
  if (!run) throw new Error('مسير الرواتب غير موجود');
  if (run.status !== 'APPROVED') throw new Error('يجب اعتماد المسير قبل الصرف');
  await postEvent({
    universityId: run.universityId, entryDate: new Date(), sourceType: 'PAYROLL', sourceId: `PAY-${run.id}`, memo: `صرف رواتب ${run.month}`, postedById: opts?.paidById,
    lines: [
      { accountId: await accountIdByCode(run.universityId, '2400'), debit: run.netTotal },
      { accountId: await accountIdByCode(run.universityId, opts?.bankCode ?? '1210'), credit: run.netTotal },
    ],
  });
  await prisma.payRun.update({ where: { id: payRunId }, data: { status: 'PAID' } });
  await writeAudit('finance.payroll.pay', { targetType: 'PayRun', targetId: payRunId, metadata: { month: run.month }, universityId: run.universityId });
  return { id: payRunId, status: 'PAID' };
}
