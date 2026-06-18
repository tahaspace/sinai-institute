import prisma from '@/lib/prisma';
import { classify } from '@/lib/reports';
import { computeStandingForStudents } from '@/lib/standing';

/**
 * KPI engine (ClientR3 — R4). Computes institutional KPIs from the existing data. Anything with no
 * backing data (satisfaction, research productivity, strategic objectives) returns the sentinel
 * NO_DATA — surfaced as "يتطلب مصدر بيانات", never fabricated.
 */
export const NO_DATA = 'يتطلب مصدر بيانات';

export async function academicKpis(universityId: string | null) {
  const [students, enrollments, statuses] = await Promise.all([
    prisma.student.findMany({ where: { universityId: universityId ?? undefined }, select: { id: true, status: true } }),
    prisma.enrollment.findMany({ select: { gradeStatusCode: true } }),
    prisma.gradeStatus.findMany(),
  ]);
  const byCode = new Map(statuses.map((s) => [s.code, s]));
  let pass = 0, fail = 0;
  for (const e of enrollments) { const c = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null); if (c === 'pass') pass++; else if (c === 'fail') fail++; }
  const active = students.filter((s) => !['WITHDRAWN', 'DISMISSED', 'GRADUATED'].includes(s.status));
  const standings = await computeStandingForStudents(active.map((s) => s.id));
  const cgpas = [...standings.values()].filter((s) => s.gpaHours > 0);
  const avgCgpa = cgpas.length ? cgpas.reduce((s, x) => s + x.cgpa, 0) / cgpas.length : 0;
  const graded = pass + fail;
  return {
    totalStudents: students.length,
    passRate: graded ? Math.round((pass / graded) * 100) : 0,
    failRate: graded ? Math.round((fail / graded) * 100) : 0,
    avgCgpa: avgCgpa.toFixed(2),
    honorRate: cgpas.length ? Math.round(([...standings.values()].filter((s) => s.cumulativeHonor).length / cgpas.length) * 100) : 0,
  };
}

export async function studentKpis(universityId: string | null) {
  const students = await prisma.student.findMany({ where: { universityId: universityId ?? undefined }, select: { status: true } });
  const total = students.length || 1;
  const dropout = students.filter((s) => ['WITHDRAWN', 'DISMISSED'].includes(s.status)).length;
  const graduated = students.filter((s) => s.status === 'GRADUATED').length;
  const active = students.filter((s) => !['WITHDRAWN', 'DISMISSED', 'GRADUATED'].includes(s.status)).length;
  return {
    retentionRate: Math.round((active / total) * 100),
    dropoutRate: Math.round((dropout / total) * 100),
    graduationRate: Math.round((graduated / total) * 100),
  };
}

export async function financialKpis(universityId: string | null) {
  const [receipts, bills, payroll] = await Promise.all([
    prisma.receipt.findMany({ where: { universityId: universityId ?? undefined }, select: { amount: true } }),
    prisma.bill.findMany({ where: { universityId: universityId ?? undefined, status: { in: ['APPROVED', 'PAID'] } }, select: { total: true } }),
    prisma.payRun.findMany({ where: { universityId: universityId ?? undefined, status: { in: ['APPROVED', 'PAID'] } }, select: { netTotal: true } }),
  ]);
  const revenue = receipts.reduce((s, r) => s + Number(r.amount), 0);
  const expense = bills.reduce((s, b) => s + Number(b.total), 0) + payroll.reduce((s, p) => s + Number(p.netTotal), 0);
  const invoices = await prisma.invoice.aggregate({ where: { universityId: universityId ?? undefined }, _sum: { total: true, paid: true } });
  const billed = Number(invoices._sum.total ?? 0); const collected = Number(invoices._sum.paid ?? 0);
  return {
    revenue: revenue.toFixed(2),
    expense: expense.toFixed(2),
    profitability: (revenue - expense).toFixed(2),
    collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
  };
}

export async function hrKpis(universityId: string | null) {
  const employees = await prisma.employee.count({ where: { universityId: universityId ?? undefined, isActive: true } });
  return { employees, turnoverRate: NO_DATA }; // turnover needs hire/leave history
}
