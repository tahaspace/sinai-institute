import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/payroll — payroll summary + monthly status.
export async function GET() {
  try {
    const guard = await requirePermission('payroll.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const all = await prisma.payroll.findMany({ orderBy: { createdAt: 'desc' } });

    // Monthly status (group by month)
    const monthMap = new Map<string, { month: string; amount: number; pending: boolean }>();
    for (const p of all) {
      const m = monthMap.get(p.month) ?? { month: p.month, amount: 0, pending: false };
      m.amount += p.baseSalary;
      if (p.status === 'pending') m.pending = true;
      monthMap.set(p.month, m);
    }
    const payrollStatus = [...monthMap.values()].map((m) => ({
      month: m.month,
      amount: m.amount,
      status: m.pending ? 'pending' : 'completed',
    }));

    // Stats over the most-recent completed month
    const completed = all.filter((p) => p.status === 'completed');
    const faculty = completed.filter((p) => p.role === 'faculty');
    const staff = completed.filter((p) => p.role === 'staff');
    const sum = (rows: typeof completed, key: 'baseSalary' | 'netSalary' | 'deductions') =>
      rows.reduce((s, r) => s + r[key], 0);

    return NextResponse.json({
      payrollStats: {
        totalEmployees: new Set(completed.map((p) => p.employeeName)).size,
        totalPayroll: sum(completed, 'baseSalary'),
        netPayroll: sum(completed, 'netSalary'),
        deductions: sum(completed, 'deductions'),
        facultyCount: new Set(faculty.map((p) => p.employeeName)).size,
        facultySalary: sum(faculty, 'netSalary'),
        staffCount: new Set(staff.map((p) => p.employeeName)).size,
        staffSalary: sum(staff, 'netSalary'),
      },
      payrollStatus,
      // Per-type deduction breakdown isn't modeled; report the total only.
      deductionsSummary: [
        { type: 'إجمالي الخصومات', amount: sum(completed, 'deductions'), percentage: 100 },
      ],
    });
  } catch (error) {
    console.error('Error building payroll:', error);
    return NextResponse.json({ error: 'فشل في جلب مسير الرواتب' }, { status: 500 });
  }
}
