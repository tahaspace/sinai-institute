import prisma from '@/lib/prisma';
import type { ReportDef, ReportContext, TableResult } from '@/lib/reporting/types';
import { studentWhere, termWhere, academicSystemWhere } from '@/lib/reporting/filters';
import { normalizeSystem, studentSystemWhere } from '@/lib/academic-system';
import { computeStandingForStudents } from '@/lib/standing';
import { passFailRoster, successStats, classify } from '@/lib/reports';
import { bandsFromRegulations, courseTotalPct, gradeFromBands, type AnnualGrade } from '@/lib/annual';
import { getRegulations } from '@/lib/regulations';

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

/**
 * Optional academic-system narrowing for the roster reports. passFailRoster() scopes its own query
 * only on the ANNUAL branch (the credit-hours query is deliberately left untouched), so we still
 * resolve the student codes of the selected system and keep only those rows.
 * No system selected → null → zero queries, zero filtering (output identical to before).
 */
async function systemCodes(ctx: ReportContext): Promise<Set<string> | null> {
  if (!ctx.academicSystem) return null;
  const rows = await prisma.student.findMany({ where: academicSystemWhere(ctx.academicSystem), select: { studentCode: true } });
  return new Set(rows.map((s) => s.studentCode));
}

type OutcomeRow = { gradeStatusCode: string | null; annualGrade: AnnualGrade | null; annualPass: boolean | null };

/**
 * Each enrollment's outcome, classified by ITS OWN student's academic system — not by whatever the
 * viewer has selected. That is the platform rule: the system is a property of the student, resolved
 * server-side, and the filter only changes which rows you see.
 *
 * It matters most in the DEFAULT «كل الأنظمة» view. Annual students carry no gradeStatusCode
 * (lib/gpa.ts stores raw marks only for them), so classifying the whole mixed set by code alone
 * reported every annual attempt as «غير مرصود» — the institute-wide pass count silently excluded
 * every annual student. A credit row is still classified exactly as before.
 */
async function outcomeRows(where: Record<string, unknown>): Promise<OutcomeRow[]> {
  const [rows, reg] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      select: {
        gradeStatusCode: true, courseId: true, midterm: true, final: true, practical: true, homework: true, graceMarks: true,
        // The exemption + attempt decide the DENOMINATOR (lib/grade-components). Without them this
        // report divides an exempt repeater's marks by the FULL course total and prints راسب where
        // the grade sheet prints ناجح — the same student, two answers.
        excludedComponents: true, attemptNo: true,
        course: { select: { code: true, nameAr: true, midtermMax: true, finalMax: true, practicalMax: true, homeworkMax: true } },
        student: { select: { program: { select: { academicSystem: true } } } },
      },
    }),
    getRegulations(),
  ]);
  const bands = bandsFromRegulations(reg);
  // annualPass comes from the bylaw threshold, never from the band LABEL: gradeFromBands scans a
  // fixed band order, so a bylaw whose band floors are not monotonic with annualPassPercent would
  // make label and threshold disagree. passFailRoster and successStats use the threshold too, so
  // this keeps the three of them from drifting apart.
  const passPct = reg.annualPassPercent;
  return rows.map((e) => {
    if (normalizeSystem(e.student?.program?.academicSystem) !== 'ANNUAL') {
      return { gradeStatusCode: e.gradeStatusCode, annualGrade: null, annualPass: null };
    }
    // pct === null → nothing recorded yet for that subject, which stays غير مرصود (not a zero-mark راسب).
    const pct = courseTotalPct(e, { reg });
    return {
      gradeStatusCode: e.gradeStatusCode,
      annualGrade: pct == null ? null : gradeFromBands(pct, bands),
      annualPass: pct == null ? null : pct >= passPct,
    };
  });
}

export const resultsReports: ReportDef[] = [
  {
    id: 'pass-list', category: 'results', nameAr: 'كشف الناجحين (لكل مقرر)',
    permission: VIEW, filters: ['courseId', 'academicYear', 'semester'], requires: ['courseId'], systemAware: true,
    run: async (f, ctx) => {
      // ANNUAL students carry no gradeStatusCode, so the system must reach passFailRoster itself —
      // without it every annual row classifies as "ungraded" and this sheet publishes empty.
      const [r, codes] = await Promise.all([passFailRoster(f.courseId!, termWhere(f), ctx.academicSystem), (ctx.academicSystem === 'ANNUAL' ? null : systemCodes(ctx))]);
      if (!r) return { kind: 'table', columns: [], rows: [] };
      const rows = r.rows.filter((x) => x.outcome === 'pass' && (!codes || codes.has(x.studentCode))).map((x) => ({ studentCode: x.studentCode, name: x.name, gpa: x.points ?? '—', grade: x.statusCode ?? '—' }));
      return {
        kind: 'table',
        columns: [{ key: 'studentCode', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'gpa', label: 'النقاط', align: 'center' }, { key: 'grade', label: 'التقدير', align: 'center' }],
        rows, totals: { studentCode: 'عدد الناجحين', name: `${rows.length}` }, meta: { course: r.course },
      };
    },
  },
  {
    id: 'fail-list', category: 'results', nameAr: 'كشف الراسبين (لكل مقرر)',
    permission: VIEW, filters: ['courseId', 'academicYear', 'semester'], requires: ['courseId'], systemAware: true,
    run: async (f, ctx) => {
      // same as pass-list: the annual outcome only exists once passFailRoster knows the system.
      const [r, codes] = await Promise.all([passFailRoster(f.courseId!, termWhere(f), ctx.academicSystem), (ctx.academicSystem === 'ANNUAL' ? null : systemCodes(ctx))]);
      if (!r) return { kind: 'table', columns: [], rows: [] };
      const rows = r.rows.filter((x) => x.outcome === 'fail' && (!codes || codes.has(x.studentCode))).map((x) => ({ studentCode: x.studentCode, name: x.name, level: x.level, grade: x.statusCode ?? '—' }));
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
    run: (f, ctx) => toppers({ ...studentWhere(f, ctx.universityId), ...academicSystemWhere('CREDIT_HOURS') }, false),
  },
  {
    id: 'toppers-batch', category: 'results', nameAr: 'كشف أوائل الدفعة',
    permission: VIEW, filters: ['departmentId', 'programId'],
    run: (f, ctx) => toppers({ ...studentWhere(f, ctx.universityId), ...academicSystemWhere('CREDIT_HOURS') }, true),
  },
  {
    id: 'grade-distribution', category: 'results', nameAr: 'كشف توزيع التقديرات',
    permission: VIEW, filters: ['academicYear', 'semester', 'departmentId', 'courseId'], systemAware: true,
    run: async (f, ctx) => {
      const [enrollments, statuses] = await Promise.all([
        // studentSystemWhere → `{}` when no system is selected, so the term/course scope is unchanged.
        outcomeRows(
          {
            ...termWhere(f),
            ...(f.courseId ? { courseId: f.courseId } : {}),
            ...studentSystemWhere(ctx.academicSystem),
            // declared in `filters`, so it has to be honoured — under AND, since the system fragment
            // above already owns the `student` key and a second one would overwrite it.
            ...(f.departmentId ? { AND: [{ student: { departmentId: f.departmentId } }] } : {}),
          },
        ),
        prisma.gradeStatus.findMany(),
      ]);
      const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));
      const m = new Map<string, number>();
      // Bucket by the printed label instead of the raw code: a coded row still reads «code name» in
      // its original first-seen order, while an ANNUAL row with no code falls into its derived تقدير
      // bucket. annualGrade is null on the credit-hours/no-filter paths, so those still read غير مرصود.
      for (const e of enrollments) {
        const code = e.gradeStatusCode ?? '—';
        // An annual تقدير is a band NAME, and the seeded GradeStatus names are those same band names —
        // so labelling a coded annual row «F راسب» while a marks-derived one reads «راسب» would split
        // one تقدير across two buckets. Keyed off the ROW's own system, not the viewer's selection,
        // so it holds in the mixed «كل الأنظمة» view too.
        const g =
          code === '—'
            ? e.annualGrade ?? 'غير مرصود'
            : e.annualGrade != null
              ? nameByCode.get(code) ?? e.annualGrade
              : `${code} ${nameByCode.get(code) ?? ''}`;
        m.set(g, (m.get(g) ?? 0) + 1);
      }
      const rows = [...m.entries()].map(([grade, count]) => ({ grade, count })).sort((a, b) => b.count - a.count);
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
    filters: ['academicYear', 'semester', 'departmentId'], systemAware: true,
    run: async (f, ctx) => {
      const [enrollments, statuses] = await Promise.all([
        // studentSystemWhere → `{}` when no system is selected; outcomeRows() issues that exact same
        // single-column query unless ANNUAL is selected (see its docblock).
        outcomeRows(
          {
            ...termWhere(f),
            ...studentSystemWhere(ctx.academicSystem),
            ...(f.departmentId ? { AND: [{ student: { departmentId: f.departmentId } }] } : {}),
          },
        ),
        prisma.gradeStatus.findMany(),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));
      const c = { total: enrollments.length, pass: 0, fail: 0, withdrawn: 0, incomplete: 0, deprived: 0 };
      for (const e of enrollments) {
        let cls = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null);
        // An explicit code (منسحب/محروم/غير مكتمل) is a registrar decision and still wins; an ANNUAL
        // row reaches the marks-derived تقدير only when no code was recorded — the normal case there.
        // Pass/fail comes from the bylaw threshold (annualPass), not from the band label.
        if (cls === 'ungraded' && !e.gradeStatusCode && e.annualPass != null) cls = e.annualPass ? 'pass' : 'fail';
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
    permission: VIEW, filters: ['academicYear', 'semester'], systemAware: true,
    run: async (f, ctx) => {
      // successStats() narrows its own aggregation, so overall/level/department all follow the system —
      // and it classifies ANNUAL attempts from the raw marks, which is the only outcome those rows carry.
      const s = await successStats(termWhere(f), ctx.academicSystem);
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
