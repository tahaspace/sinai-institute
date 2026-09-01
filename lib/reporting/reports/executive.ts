import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';
import { academicKpis, studentKpis, financialKpis, hrKpis, surveyKpis } from '@/lib/reporting/kpi';
import { classify } from '@/lib/reports';
import { computeStandingForStudents } from '@/lib/standing';
import type { AcademicSystem } from '@/lib/academic-system';
import { academicSystemWhere, studentSystemWhere } from '@/lib/academic-system';

/**
 * Executive Dashboard + KPI Center (ClientR3 — R4). KPI-card reports computed from the engines.
 * Satisfaction / research / strategic KPIs have no data → shown as "يتطلب مصدر بيانات".
 */
const EXEC = 'reports.executive.view';

/**
 * System-scoped academic KPIs. Mirrors `academicKpis` but narrows students/enrollments to the
 * selected system; with no selection we delegate to the shared engine so the unfiltered numbers
 * stay byte-identical. avgCgpa/honorRate keep the `gpaHours > 0` denominator — annual students
 * store no grade points, so they are excluded from the CGPA average rather than counted as zero.
 */
async function academicKpisFor(universityId: string | null, system?: AcademicSystem) {
  if (!system) return academicKpis(universityId);
  const [students, enrollments, statuses] = await Promise.all([
    prisma.student.findMany({ where: { universityId: universityId ?? undefined, ...academicSystemWhere(system) }, select: { id: true, status: true } }),
    prisma.enrollment.findMany({ where: studentSystemWhere(system), select: { gradeStatusCode: true } }),
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

/** System-scoped retention/dropout/graduation — pure head-counts, safe to narrow. */
async function studentKpisFor(universityId: string | null, system?: AcademicSystem) {
  if (!system) return studentKpis(universityId);
  const students = await prisma.student.findMany({ where: { universityId: universityId ?? undefined, ...academicSystemWhere(system) }, select: { status: true } });
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

export const executiveReports: ReportDef[] = [
  {
    id: 'executive-dashboard', category: 'executive', nameAr: 'لوحة رئيس مجلس الإدارة',
    description: 'مؤشرات أكاديمية ومالية وطلابية رئيسية', permission: EXEC, filters: [], systemAware: true,
    run: async (_f, ctx) => {
      // Academic + student cards follow the selected system; ledger revenue/expense and head-count
      // of employees have no academic-system dimension and stay institution-wide.
      const [a, s, fin, hr] = await Promise.all([academicKpisFor(ctx.universityId, ctx.academicSystem), studentKpisFor(ctx.universityId, ctx.academicSystem), financialKpis(ctx.universityId), hrKpis(ctx.universityId)]);
      return {
        kind: 'kpi',
        cards: [
          { key: 'students', label: 'عدد الطلاب', value: a.totalStudents },
          { key: 'pass', label: 'نسبة النجاح', value: `${a.passRate}%` },
          { key: 'fail', label: 'نسبة الرسوب', value: `${a.failRate}%` },
          { key: 'cgpa', label: 'متوسط المعدل التراكمي', value: a.avgCgpa },
          { key: 'revenue', label: 'الإيرادات', value: fin.revenue, unit: 'ج.م' },
          { key: 'expense', label: 'المصروفات', value: fin.expense, unit: 'ج.م' },
          { key: 'profit', label: 'الربحية', value: fin.profitability, unit: 'ج.م' },
          { key: 'collection', label: 'نسبة التحصيل', value: `${fin.collectionRate}%` },
          { key: 'retention', label: 'معدل الاحتفاظ', value: `${s.retentionRate}%` },
          { key: 'dropout', label: 'معدل التسرب', value: `${s.dropoutRate}%` },
          { key: 'graduation', label: 'معدل التخرج', value: `${s.graduationRate}%` },
          { key: 'employees', label: 'عدد الموظفين', value: hr.employees },
        ],
      };
    },
  },
  {
    id: 'kpi-academic', category: 'executive', nameAr: 'مركز المؤشرات — الأكاديمية', permission: EXEC, filters: [], systemAware: true,
    run: async (_f, ctx) => {
      // Average GPA / Honor Rate are credit-hour concepts; their denominator counts only students
      // with graded hours, so annual students are excluded rather than averaged in as zero.
      const a = await academicKpisFor(ctx.universityId, ctx.academicSystem); const s = await studentKpisFor(ctx.universityId, ctx.academicSystem);
      return {
        kind: 'kpi',
        cards: [
          { key: 'success', label: 'Student Success Rate', value: `${a.passRate}%` },
          { key: 'graduation', label: 'Graduation Rate', value: `${s.graduationRate}%` },
          { key: 'retention', label: 'Retention Rate', value: `${s.retentionRate}%` },
          { key: 'dropout', label: 'Dropout Rate', value: `${s.dropoutRate}%` },
          { key: 'gpa', label: 'Average GPA', value: a.avgCgpa },
          { key: 'honor', label: 'Honor Students Rate', value: `${a.honorRate}%` },
        ],
      };
    },
  },
  {
    id: 'kpi-financial', category: 'executive', nameAr: 'مركز المؤشرات — المالية', permission: EXEC, filters: [],
    run: async (_f, ctx) => {
      const fin = await financialKpis(ctx.universityId);
      return {
        kind: 'kpi',
        cards: [
          { key: 'revenue', label: 'Revenue', value: fin.revenue, unit: 'ج.م' },
          { key: 'collection', label: 'Collection Rate', value: `${fin.collectionRate}%` },
          { key: 'profit', label: 'Profitability', value: fin.profitability, unit: 'ج.م' },
          { key: 'expense', label: 'Total Expense', value: fin.expense, unit: 'ج.م' },
        ],
      };
    },
  },
  {
    id: 'kpi-quality', category: 'executive', nameAr: 'مركز المؤشرات — الجودة والرضا',
    description: 'محسوبة من الاستبيانات وتقييم المقررات والإنتاج البحثي (تظهر "يتطلب مصدر بيانات" عند غياب الردود)', permission: EXEC, filters: [],
    run: async (_f, ctx) => {
      const q = await surveyKpis(ctx.universityId ?? null);
      return {
        kind: 'kpi',
        cards: [
          { key: 'fac-sat', label: 'رضا أعضاء هيئة التدريس', value: q.facultySatisfaction },
          { key: 'stu-sat', label: 'رضا الطلاب', value: q.studentSatisfaction },
          { key: 'teaching', label: 'كفاءة التدريس', value: q.teachingEffectiveness },
          { key: 'research', label: 'الإنتاج البحثي (لكل عضو هيئة تدريس)', value: q.researchProductivity },
        ],
      };
    },
  },
];
