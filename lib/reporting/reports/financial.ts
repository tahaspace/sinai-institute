import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';
import { trialBalance, incomeStatement, balanceSheet, cashFlow } from '@/lib/finance/statements';
import { arAging } from '@/lib/finance/billing';
import { listBudgets, budgetVsActual } from '@/lib/finance/budget';

/**
 * Financial reports (ClientR3 — R3). Thin registry wrappers over the finance engines we already
 * built (statements, AR aging, budgets, revenue), so the reporting hub surfaces them alongside the
 * academic reports with the same filters/export/print.
 */
const FIN = 'finance.report.view';

function statementTable(rows: { label: string; amount: number }[], totalLabel: string, total: number) {
  return { kind: 'table' as const, columns: [{ key: 'label', label: 'البند' }, { key: 'amount', label: 'القيمة', align: 'center' as const, numeric: true }], rows: rows.map((r) => ({ label: r.label, amount: r.amount.toFixed(2) })), totals: { label: totalLabel, amount: total.toFixed(2) } };
}

export const financialReports: ReportDef[] = [
  {
    id: 'fin-trial-balance', category: 'financial', nameAr: 'ميزان المراجعة', permission: FIN, filters: [],
    run: async (_f, ctx) => {
      const r = await trialBalance(ctx.universityId);
      return {
        kind: 'table',
        columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الحساب' }, { key: 'debit', label: 'مدين', align: 'center', numeric: true }, { key: 'credit', label: 'دائن', align: 'center', numeric: true }],
        rows: r.rows.map((x) => ({ code: x.code, name: x.name, debit: x.debit.toFixed(2), credit: x.credit.toFixed(2) })),
        totals: { code: '', name: 'الإجمالي', debit: r.totals.debit.toFixed(2), credit: r.totals.credit.toFixed(2) },
      };
    },
  },
  {
    id: 'fin-income-statement', category: 'financial', nameAr: 'قائمة الدخل', permission: FIN, filters: ['dateFrom', 'dateTo'],
    run: async (f, ctx) => {
      const r = await incomeStatement(ctx.universityId, { from: f.dateFrom ? new Date(f.dateFrom) : undefined, to: f.dateTo ? new Date(f.dateTo) : undefined });
      return statementTable([...r.revenue.map((x) => ({ label: `إيراد: ${x.name}`, amount: x.amount })), ...r.expense.map((x) => ({ label: `مصروف: ${x.name}`, amount: -x.amount }))], 'صافي الدخل', r.totals.netIncome);
    },
  },
  {
    id: 'fin-balance-sheet', category: 'financial', nameAr: 'الميزانية العمومية', permission: FIN, filters: [],
    run: async (_f, ctx) => {
      const r = await balanceSheet(ctx.universityId);
      return statementTable([...r.assets.map((x) => ({ label: `أصل: ${x.name}`, amount: x.amount })), ...r.liabilities.map((x) => ({ label: `خصم: ${x.name}`, amount: x.amount })), ...r.equity.map((x) => ({ label: `حقوق ملكية: ${x.name}`, amount: x.amount }))], 'إجمالي الأصول', r.totals.assets);
    },
  },
  {
    id: 'fin-cash-flow', category: 'financial', nameAr: 'التدفقات النقدية', permission: FIN, filters: ['dateFrom', 'dateTo'],
    run: async (f, ctx) => {
      const r = await cashFlow(ctx.universityId, { from: f.dateFrom ? new Date(f.dateFrom) : undefined, to: f.dateTo ? new Date(f.dateTo) : undefined });
      return {
        kind: 'table',
        columns: [{ key: 'name', label: 'الحساب' }, { key: 'inflow', label: 'داخل', align: 'center', numeric: true }, { key: 'outflow', label: 'خارج', align: 'center', numeric: true }, { key: 'net', label: 'الصافي', align: 'center', numeric: true }],
        rows: r.rows.map((x) => ({ name: x.name, inflow: x.inflow.toFixed(2), outflow: x.outflow.toFixed(2), net: x.net.toFixed(2) })),
        totals: { name: 'صافي الحركة النقدية', net: r.totals.netCashMovement.toFixed(2) },
      };
    },
  },
  {
    id: 'fin-ar-aging', category: 'financial', nameAr: 'أعمار الديون (Receivables Aging)', permission: FIN, filters: [],
    run: async (_f, ctx) => {
      const r = await arAging(ctx.universityId);
      return {
        kind: 'table',
        columns: [{ key: 'number', label: 'الفاتورة' }, { key: 'student', label: 'الطالب' }, { key: 'balance', label: 'الرصيد', align: 'center', numeric: true }, { key: 'daysOverdue', label: 'أيام التأخير', align: 'center', numeric: true }, { key: 'bucket', label: 'الفئة', align: 'center' }],
        rows: r.rows.map((x) => ({ number: x.number, student: x.student, balance: x.balance.toFixed(2), daysOverdue: x.daysOverdue, bucket: x.bucket })),
        totals: { number: 'إجمالي المتأخرات', student: '', balance: r.grandTotal.toFixed(2) },
      };
    },
  },
  {
    id: 'fin-defaulters', category: 'financial', nameAr: 'الطلاب المتعثرون (المستحق عليهم أقساط)', permission: FIN, filters: ['departmentId'],
    run: async (_f, ctx) => {
      const invoices = await prisma.invoice.findMany({
        where: { universityId: ctx.universityId ?? undefined, status: { in: ['ISSUED', 'PARTIAL'] } },
        include: { student: { select: { studentCode: true, nameAr: true, department: { select: { nameAr: true } } } } },
        orderBy: { balance: 'desc' },
      });
      const byStudent = new Map<string, { code: string; name: string; dept: string; balance: number }>();
      for (const inv of invoices) {
        const k = inv.studentId; const g = byStudent.get(k) ?? { code: inv.student.studentCode, name: inv.student.nameAr, dept: inv.student.department?.nameAr ?? '—', balance: 0 };
        g.balance += Number(inv.balance); byStudent.set(k, g);
      }
      const rows = [...byStudent.values()].sort((a, b) => b.balance - a.balance).map((r) => ({ studentCode: r.code, name: r.name, department: r.dept, balance: r.balance.toFixed(2) }));
      return { kind: 'table', columns: [{ key: 'studentCode', label: 'الرقم' }, { key: 'name', label: 'الاسم' }, { key: 'department', label: 'القسم' }, { key: 'balance', label: 'المبلغ المستحق', align: 'center', numeric: true }], rows, totals: { studentCode: 'الإجمالي', name: `${rows.length} طالب` } };
    },
  },
  {
    id: 'fin-revenue-by-program', category: 'financial', nameAr: 'الإيرادات حسب البرنامج', permission: FIN, filters: [],
    run: async (_f, ctx) => {
      const receipts = await prisma.receipt.findMany({ where: { universityId: ctx.universityId ?? undefined }, include: { student: { select: { program: { select: { nameAr: true } } } } } });
      const m = new Map<string, number>();
      for (const r of receipts) { const k = r.student.program?.nameAr ?? 'غير محدد'; m.set(k, (m.get(k) ?? 0) + Number(r.amount)); }
      const rows = [...m.entries()].map(([program, amount]) => ({ program, amount: amount.toFixed(2) })).sort((a, b) => Number(b.amount) - Number(a.amount));
      return { kind: 'table', columns: [{ key: 'program', label: 'البرنامج' }, { key: 'amount', label: 'الإيراد المحصّل', align: 'center', numeric: true }], rows, totals: { program: 'الإجمالي', amount: receipts.reduce((s, r) => s + Number(r.amount), 0).toFixed(2) } };
    },
  },
  {
    id: 'fin-budget-vs-actual', category: 'financial', nameAr: 'الموازنة مقابل الفعلي', permission: FIN, filters: [],
    run: async (_f, ctx) => {
      const budgets = await listBudgets(ctx.universityId);
      if (!budgets.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا توجد موازنات معتمدة' } };
      const r = await budgetVsActual(ctx.universityId, budgets[0].id);
      return {
        kind: 'table',
        columns: [{ key: 'accountName', label: 'الحساب' }, { key: 'budget', label: 'الموازنة', align: 'center', numeric: true }, { key: 'actual', label: 'الفعلي', align: 'center', numeric: true }, { key: 'variance', label: 'الفرق', align: 'center', numeric: true }, { key: 'usedPct', label: 'المنفذ %', align: 'center' }],
        rows: r.rows.map((x) => ({ accountName: `${x.accountCode} ${x.accountName}`, budget: x.budget.toFixed(2), actual: x.actual.toFixed(2), variance: x.variance.toFixed(2), usedPct: `${x.usedPct}%` })),
        totals: { accountName: `الموازنة: ${r.name}`, budget: r.totals.budget.toFixed(2), actual: r.totals.actual.toFixed(2), variance: r.totals.variance.toFixed(2) },
      };
    },
  },
];
