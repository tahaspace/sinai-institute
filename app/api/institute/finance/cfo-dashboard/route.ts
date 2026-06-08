import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/finance/cfo-dashboard — CFO overview derived entirely from
// existing models (FeeAccount/Payment/Scholarship/Department/Student/Payroll).
// revenue = paid Payments; expenses = completed Payroll; profit = revenue - expenses.
// No budget/target/prior-period models exist, so those KPI fields are intentionally
// not returned (the page drops them rather than fabricate numbers).
export async function GET() {
  try {
    const guard = await requirePermission('finance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const accounts = await prisma.feeAccount.findMany({
      include: { payments: true, student: { include: { department: true } } },
    });

    const paidOf = (a: (typeof accounts)[number]) =>
      a.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0);

    const totalDues = accounts.reduce((s, a) => s + a.totalFees, 0);
    const collected = accounts.reduce((s, a) => s + paidOf(a), 0);
    const remaining = totalDues - collected;
    const collectionRate = totalDues > 0 ? Math.round((collected / totalDues) * 100) : 0;

    // Expenses: only Payroll is modeled as a cost source — label it as salaries.
    const payrolls = await prisma.payroll.findMany({ where: { status: 'completed' } });
    const expenses = payrolls.reduce((s, p) => s + p.netSalary, 0);
    const profit = collected - expenses;

    // Revenue by department: paid amount + distinct student count per department.
    const byDept = new Map<
      string,
      { department: string; amount: number; studentIds: Set<string> }
    >();
    for (const a of accounts) {
      const name = a.student.department?.nameAr ?? 'غير محدد';
      const b = byDept.get(name) ?? { department: name, amount: 0, studentIds: new Set<string>() };
      b.amount += paidOf(a);
      b.studentIds.add(a.studentId);
      byDept.set(name, b);
    }
    const revenueByDepartment = [...byDept.values()]
      .map((b) => ({
        department: b.department,
        amount: b.amount,
        students: b.studentIds.size,
        percentage: collected > 0 ? Math.round((b.amount / collected) * 1000) / 10 : 0,
      }))
      .sort((x, y) => y.amount - x.amount);

    // Semester comparison: paid revenue + distinct students grouped by academicYear.
    const byYear = new Map<
      string,
      { semester: string; revenue: number; studentIds: Set<string> }
    >();
    for (const a of accounts) {
      const key = a.academicYear || 'غير محدد';
      const b = byYear.get(key) ?? { semester: key, revenue: 0, studentIds: new Set<string>() };
      b.revenue += paidOf(a);
      b.studentIds.add(a.studentId);
      byYear.set(key, b);
    }
    const semesterComparison = [...byYear.values()]
      .map((b) => ({ semester: b.semester, revenue: b.revenue, students: b.studentIds.size }))
      .sort((x, y) => x.semester.localeCompare(y.semester));

    // KPIs — only fields with real backing data.
    const kpis = {
      revenue: { value: collected, isPercentage: false },
      expenses: { value: expenses, isPercentage: false },
      profit: { value: profit, isPercentage: false },
      collection: { value: collectionRate, isPercentage: true },
    };

    // Alerts built from real conditions only.
    const alerts: Array<{
      id: string;
      type: 'warning' | 'info' | 'success';
      title: string;
      description: string;
      amount: number | null;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // 1) Outstanding balances (real remaining > 0).
    const unpaidStudents = accounts.filter((a) => a.totalFees - paidOf(a) > 0).length;
    if (unpaidStudents > 0) {
      alerts.push({
        id: 'arrears',
        type: 'warning',
        title: 'متأخرات تحصيل مرتفعة',
        description: `${unpaidStudents} طالب لم يسدد كامل الرسوم المستحقة`,
        amount: remaining,
        priority: 'high',
      });
    }

    // 2) Pending/overdue payments (real Payment.status).
    let pendingTotal = 0;
    let pendingCount = 0;
    for (const a of accounts) {
      for (const p of a.payments) {
        if (p.status === 'pending' || p.status === 'overdue') {
          pendingTotal += p.amount;
          pendingCount += 1;
        }
      }
    }
    if (pendingCount > 0) {
      alerts.push({
        id: 'pending',
        type: 'info',
        title: 'مدفوعات معلقة',
        description: `${pendingCount} دفعة في انتظار التحصيل`,
        amount: pendingTotal,
        priority: 'medium',
      });
    }

    // 3) Best-performing department by collection rate (real per-dept totals).
    const deptRates = new Map<string, { collected: number; total: number }>();
    for (const a of accounts) {
      const name = a.student.department?.nameAr ?? 'غير محدد';
      const r = deptRates.get(name) ?? { collected: 0, total: 0 };
      r.collected += paidOf(a);
      r.total += a.totalFees;
      deptRates.set(name, r);
    }
    let topDept: { name: string; rate: number } | null = null;
    for (const [name, r] of deptRates) {
      if (r.total <= 0) continue;
      const rate = Math.round((r.collected / r.total) * 100);
      if (!topDept || rate > topDept.rate) topDept = { name, rate };
    }
    if (topDept) {
      alerts.push({
        id: 'top-dept',
        type: 'success',
        title: 'أعلى نسبة تحصيل',
        description: `حقق ${topDept.name} نسبة تحصيل ${topDept.rate}%`,
        amount: null,
        priority: 'low',
      });
    }

    return NextResponse.json({
      kpis,
      revenueByDepartment,
      financialAlerts: alerts,
      semesterComparison,
    });
  } catch (error) {
    console.error('Error building CFO dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات لوحة المدير المالي' }, { status: 500 });
  }
}
