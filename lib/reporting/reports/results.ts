import prisma from '@/lib/prisma';
import type { ReportDef, TableResult } from '@/lib/reporting/types';
import { studentWhere, termWhere } from '@/lib/reporting/filters';
import { computeStandingForStudents } from '@/lib/standing';
import { passFailRoster, successStats, classify } from '@/lib/reports';

/**
 * Results & ministry result-sheet reports (ClientR3 — R1). Reuses lib/reports + lib/standing so
 * pass/fail/withdrawn classification stays identical to the academic engines.
 */
const VIEW = 'exam.result.view';

// أوائل (toppers) — rank by CGPA, tie-break earned hours then fewer total attempts.
async function toppers(where: Record<string, unknown>, useCgpa: boolean): Promise<TableResult> {
  const students = await prisma.student.findMany({ where, select: { id: true, studentCode: true, nameAr: true } });
  const standings = await computeStandingForStudents(students.map((s) => s.id));
  const ranked = students
    .map((s) => ({ s, st: standings.get(s.id) }))
    .filter(({ st }) => st && st.gpaHours > 0)
    .sort((a, b) => (b.st!.cgpa - a.st!.cgpa) || (b.st!.earnedHours - a.st!.earnedHours))
    .map(({ s, st }, i) => ({ rank: i + 1, studentCode: s.studentCode, name: s.nameAr, gpa: st!.cgpa.toFixed(2), earnedHours: st!.earnedHours }));
  return {
    kind: 'table',
    columns: [{ key: 'rank', label: 'الترتيب', align: 'center', numeric: true }, { key: 'studentCode', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: useCgpa ? 'gpa' : 'gpa', label: useCgpa ? 'المعدل التراكمي CGPA' : 'المعدل GPA', align: 'center', numeric: true }, { key: 'earnedHours', label: 'الساعات', align: 'center', numeric: true }],
    rows: ranked,
    totals: { rank: '', studentCode: 'عدد الطلاب', name: `${ranked.length}` },
  };
}

export const resultsReports: ReportDef[] = [
  {
    id: 'pass-list', category: 'results', nameAr: 'كشف الناجحين (لكل مقرر)',
    permission: VIEW, filters: ['courseId', 'academicYear', 'semester'], requires: ['courseId'],
    run: async (f) => {
      const r = await passFailRoster(f.courseId!, termWhere(f));
      if (!r) return { kind: 'table', columns: [], rows: [] };
      const rows = r.rows.filter((x) => x.outcome === 'pass').map((x) => ({ studentCode: x.studentCode, name: x.name, gpa: x.points ?? '—', grade: x.statusCode ?? '—' }));
      return {
        kind: 'table',
        columns: [{ key: 'studentCode', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'gpa', label: 'النقاط', align: 'center' }, { key: 'grade', label: 'التقدير', align: 'center' }],
        rows, totals: { studentCode: 'عدد الناجحين', name: `${rows.length}` }, meta: { course: r.course },
      };
    },
  },
  {
    id: 'fail-list', category: 'results', nameAr: 'كشف الراسبين (لكل مقرر)',
    permission: VIEW, filters: ['courseId', 'academicYear', 'semester'], requires: ['courseId'],
    run: async (f) => {
      const r = await passFailRoster(f.courseId!, termWhere(f));
      if (!r) return { kind: 'table', columns: [], rows: [] };
      const rows = r.rows.filter((x) => x.outcome === 'fail').map((x) => ({ studentCode: x.studentCode, name: x.name, level: x.level, grade: x.statusCode ?? '—' }));
      return {
        kind: 'table',
        columns: [{ key: 'studentCode', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'level', label: 'المستوى', align: 'center', numeric: true }, { key: 'grade', label: 'الحالة', align: 'center' }],
        rows, totals: { studentCode: 'عدد الراسبين', name: `${rows.length}` }, meta: { course: r.course },
      };
    },
  },
  {
    id: 'toppers-level', category: 'results', nameAr: 'كشف أوائل المستوى',
    permission: VIEW, filters: ['departmentId', 'programId', 'level'], requires: ['level'],
    run: (f, ctx) => toppers(studentWhere(f, ctx.universityId), false),
  },
  {
    id: 'toppers-batch', category: 'results', nameAr: 'كشف أوائل الدفعة',
    permission: VIEW, filters: ['departmentId', 'programId'],
    run: (f, ctx) => toppers(studentWhere(f, ctx.universityId), true),
  },
  {
    id: 'grade-distribution', category: 'results', nameAr: 'كشف توزيع التقديرات',
    permission: VIEW, filters: ['academicYear', 'semester', 'departmentId', 'courseId'],
    run: async (f) => {
      const [enrollments, statuses] = await Promise.all([
        prisma.enrollment.findMany({ where: { ...termWhere(f), ...(f.courseId ? { courseId: f.courseId } : {}) }, select: { gradeStatusCode: true } }),
        prisma.gradeStatus.findMany(),
      ]);
      const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));
      const m = new Map<string, number>();
      for (const e of enrollments) { const c = e.gradeStatusCode ?? '—'; m.set(c, (m.get(c) ?? 0) + 1); }
      const rows = [...m.entries()].map(([code, count]) => ({ grade: code === '—' ? 'غير مرصود' : `${code} ${nameByCode.get(code) ?? ''}`, count })).sort((a, b) => b.count - a.count);
      return {
        kind: 'table',
        columns: [{ key: 'grade', label: 'التقدير' }, { key: 'count', label: 'العدد', align: 'center', numeric: true }],
        rows, totals: { grade: 'الإجمالي', count: rows.reduce((s, r) => s + r.count, 0) },
      };
    },
  },
  {
    id: 'result-statistics', category: 'results', nameAr: 'كشف إحصائي النتائج',
    description: 'إجمالي / ناجح / راسب / منسحب / غير مكتمل / محروم', permission: VIEW,
    filters: ['academicYear', 'semester', 'departmentId'],
    run: async (f) => {
      const [enrollments, statuses] = await Promise.all([
        prisma.enrollment.findMany({ where: termWhere(f), select: { gradeStatusCode: true } }),
        prisma.gradeStatus.findMany(),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));
      const c = { total: enrollments.length, pass: 0, fail: 0, withdrawn: 0, incomplete: 0, deprived: 0 };
      for (const e of enrollments) {
        const cls = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null);
        if (cls === 'pass') c.pass++; else if (cls === 'fail') c.fail++; else if (cls === 'withdrawn') c.withdrawn++; else if (cls === 'incomplete') c.incomplete++;
        if (['DN', 'NE', 'ABS'].includes(e.gradeStatusCode ?? '')) c.deprived++;
      }
      const rows = [
        { bayan: 'إجمالي المقررات المسجلة', count: c.total }, { bayan: 'ناجح', count: c.pass }, { bayan: 'راسب', count: c.fail },
        { bayan: 'منسحب', count: c.withdrawn }, { bayan: 'غير مكتمل', count: c.incomplete }, { bayan: 'محروم/غياب', count: c.deprived },
      ];
      return { kind: 'table', columns: [{ key: 'bayan', label: 'البيان' }, { key: 'count', label: 'العدد', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'success-stats', category: 'results', nameAr: 'إحصائيات النجاح (المعهد/المستوى/القسم)',
    permission: VIEW, filters: ['academicYear', 'semester'],
    run: async (f) => {
      const s = await successStats(termWhere(f));
      const rows = [
        { scope: 'المعهد (إجمالي)', enrolled: s.overall.enrolled, pass: s.overall.pass, fail: s.overall.fail, rate: `${s.overall.passRate}%` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...s.byLevel.map((l: any) => ({ scope: `المستوى ${l.key}`, enrolled: l.enrolled, pass: l.pass, fail: l.fail, rate: `${l.passRate}%` })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...s.byDepartment.map((d: any) => ({ scope: d.key, enrolled: d.enrolled, pass: d.pass, fail: d.fail, rate: `${d.passRate}%` })),
      ];
      return {
        kind: 'table',
        columns: [{ key: 'scope', label: 'النطاق' }, { key: 'enrolled', label: 'مسجل', align: 'center', numeric: true }, { key: 'pass', label: 'ناجح', align: 'center', numeric: true }, { key: 'fail', label: 'راسب', align: 'center', numeric: true }, { key: 'rate', label: 'نسبة النجاح', align: 'center' }],
        rows,
      };
    },
  },
];
