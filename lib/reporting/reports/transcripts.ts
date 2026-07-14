import prisma from '@/lib/prisma';
import type { ReportDef, ReportColumn, ReportRow } from '@/lib/reporting/types';
import { SEMESTERS, studentWhere } from '@/lib/reporting/filters';
import { computeStandingForStudents } from '@/lib/standing';
import { classify } from '@/lib/reports';

/**
 * Detailed result sheets (ClientR4 — R4b). Three official documents modelled on the client's samples:
 *  1. student-transcript  — بيان حالة: per-term course tables + term/cumulative GPA + hours.
 *  2. graduates-batch     — كشف الخريجين: one row per graduate with CGPA + تقدير + distribution.
 *  3. level-result-sheet  — كشف نتيجة المستوى: course-pivot roster + term GPA + pass/fail + distribution.
 * Pure reuse of the GPA/standing engines; no result-schema change. Emitted as `sheet` so the hub's
 * ministry print-letterhead (header + grade-scale footer) applies.
 */
const VIEW = 'reports.transcripts.view';
const INSTITUTE_FALLBACK = 'معهد سيناء العالي للدراسات النوعية';
const SEM_ORDER: Record<string, number> = { first: 1, second: 2, summer: 3 };
const STATUS_AR: Record<string, string> = { ACTIVE: 'مقيّد', GRADUATED: 'خرّيج', WITHDRAWN: 'منسحب', DISMISSED: 'مفصول', SUSPENDED: 'موقوف' };

const semLabel = (s: string) => SEMESTERS.find((x) => x.value === s)?.label ?? s;
const termLabelOf = (academicYear: string, semester: string) => `${semLabel(semester)} ${academicYear}`;

/** تقدير from CGPA on the 4.0 scale (derived presentation label, not stored). */
function cgpaToGrade(cgpa: number): string {
  if (cgpa >= 3.4) return 'ممتاز';
  if (cgpa >= 2.8) return 'جيد جداً';
  if (cgpa >= 2.4) return 'جيد';
  if (cgpa >= 2.0) return 'مقبول';
  return 'ضعيف';
}

async function instituteName(universityId: string | null): Promise<string> {
  if (!universityId) return INSTITUTE_FALLBACK;
  const u = await prisma.university.findUnique({ where: { id: universityId }, select: { nameAr: true } });
  return u?.nameAr ?? INSTITUTE_FALLBACK;
}

/** Grade-scale legend from the GradeStatus letters — reused as the sheet footer (ministry letterhead). */
async function gradeScaleFooter(universityId: string | null): Promise<ReportRow[]> {
  const letters = await prisma.gradeStatus.findMany({
    where: { isLetter: true, ...(universityId ? { universityId } : {}) },
    orderBy: [{ minPercent: 'desc' }, { order: 'asc' }],
  });
  const seen = new Set<string>();
  const out: ReportRow[] = [];
  for (const g of letters) {
    if (seen.has(g.code)) continue;
    seen.add(g.code);
    out.push({ code: g.code, name: g.name, points: g.points != null ? g.points.toFixed(2) : '—', minPercent: g.minPercent != null ? `${g.minPercent}%` : '—' });
  }
  return out;
}

export const transcriptsReports: ReportDef[] = [
  {
    id: 'student-transcript', category: 'transcripts', nameAr: 'بيان حالة الطالب (كشف الدرجات)',
    description: 'كشف تفصيلي بالمقررات لكل فصل مع المعدل الفصلي والتراكمي والساعات المكتسبة',
    permission: VIEW, filters: ['studentCode'], requires: ['studentCode'],
    run: async (f, ctx) => {
      const student = await prisma.student.findFirst({
        where: { studentCode: f.studentCode, universityId: ctx.universityId ?? undefined },
        include: { program: { select: { nameAr: true } }, department: { select: { nameAr: true } } },
      });
      if (!student) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'الطالب غير موجود' } };

      const [enrollments, statuses] = await Promise.all([
        prisma.enrollment.findMany({ where: { studentId: student.id }, include: { course: { select: { code: true, nameAr: true, creditHours: true, countsInGpa: true } } } }),
        prisma.gradeStatus.findMany({ where: ctx.universityId ? { universityId: ctx.universityId } : {} }),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));
      const groups = new Map<string, typeof enrollments>();
      for (const e of enrollments) {
        const k = `${e.academicYear}|${e.semester}`;
        (groups.get(k) ?? groups.set(k, []).get(k)!).push(e);
      }
      const orderedTerms = [...groups.keys()].sort((a, b) => {
        const [ay1, s1] = a.split('|'); const [ay2, s2] = b.split('|');
        return ay1 === ay2 ? (SEM_ORDER[s1] ?? 9) - (SEM_ORDER[s2] ?? 9) : ay1.localeCompare(ay2);
      });

      // Flat rows feed CSV/Excel; `terms` feeds the rich per-term transcript layout in the hub.
      const rows: ReportRow[] = [];
      type TermBlock = { label: string; courses: ReportRow[]; footer: Record<string, string | number> };
      const terms: TermBlock[] = [];
      let cumQuality = 0, cumGpaHours = 0, cumEarned = 0;
      for (const tk of orderedTerms) {
        const [ay, sem] = tk.split('|');
        const label = termLabelOf(ay, sem);
        const courses: ReportRow[] = [];
        let regHours = 0, earnedHours = 0, quality = 0, termPoints = 0, gpaHours = 0;
        for (const e of groups.get(tk)!) {
          const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null;
          const ch = e.course.creditHours;
          const comps = [e.midterm, e.final, e.practical, e.homework].filter((v): v is number => v != null);
          const score = comps.length ? comps.reduce((s, v) => s + v, 0).toFixed(0) : '—';
          const grade = e.letterGrade ?? e.gradeStatusCode ?? '—';
          const pts = e.points;
          regHours += ch;
          if (st?.isPass) earnedHours += ch;
          if (st?.affectsGpa && e.course.countsInGpa && pts != null) { quality += pts * ch; termPoints += pts; gpaHours += ch; }
          const row = { code: e.course.code, name: e.course.nameAr, hours: ch, score, points: pts != null ? pts.toFixed(2) : '—', grade };
          courses.push(row);
          rows.push({ term: label, ...row });
        }
        cumQuality += quality; cumGpaHours += gpaHours; cumEarned += earnedHours;
        const termGpa = gpaHours ? quality / gpaHours : 0;
        const cumGpa = cumGpaHours ? cumQuality / cumGpaHours : 0;
        terms.push({ label, courses, footer: { termGpa: termGpa.toFixed(2), cumulativeGpa: cumGpa.toFixed(2), registeredHours: regHours, earnedHours, qualityPoints: quality.toFixed(2), termPoints: termPoints.toFixed(2) } });
        rows.push({ term: label, code: '', name: '— معدل الفصل —', hours: regHours, score: '', points: termGpa.toFixed(2), grade: '' });
      }
      const cgpa = cumGpaHours ? cumQuality / cumGpaHours : 0;

      return {
        kind: 'sheet',
        title: `بيان حالة — ${student.nameAr}`,
        header: {
          المعهد: await instituteName(ctx.universityId),
          الطالب: student.nameAr,
          'رقم الجلوس': student.studentCode,
          البرنامج: student.program?.nameAr ?? '—',
          القسم: student.department?.nameAr ?? '—',
          المستوى: String(student.level),
          الحالة: STATUS_AR[student.status] ?? student.status,
        },
        footer: await gradeScaleFooter(ctx.universityId),
        meta: { transcript: { terms, summary: { cgpa: cgpa.toFixed(2), earnedHours: cumEarned, grade: cgpaToGrade(cgpa) } } },
        columns: [
          { key: 'term', label: 'الفصل' }, { key: 'code', label: 'كود المقرر' }, { key: 'name', label: 'اسم المقرر' },
          { key: 'hours', label: 'س.م', align: 'center', numeric: true }, { key: 'score', label: 'الدرجة', align: 'center' },
          { key: 'points', label: 'النقاط', align: 'center' }, { key: 'grade', label: 'التقدير', align: 'center' },
        ],
        rows,
        totals: { term: 'الإجمالي', name: `المعدل التراكمي: ${cgpa.toFixed(2)}`, hours: cumEarned, points: cgpa.toFixed(2), grade: cgpaToGrade(cgpa) },
      };
    },
  },
  {
    id: 'graduates-batch', category: 'transcripts', nameAr: 'كشف الخريجين',
    description: 'قائمة الخريجين مع المعدل التراكمي والساعات والتقدير وتوزيع التقديرات',
    permission: VIEW, filters: ['departmentId', 'programId'],
    run: async (f, ctx) => {
      const students = await prisma.student.findMany({
        where: { universityId: ctx.universityId ?? undefined, status: 'GRADUATED', ...(f.departmentId ? { departmentId: f.departmentId } : {}), ...(f.programId ? { programId: f.programId } : {}) },
        include: { program: { select: { nameAr: true } } },
        orderBy: { studentCode: 'asc' },
      });
      const standings = await computeStandingForStudents(students.map((s) => s.id));
      const rows: ReportRow[] = students.map((s) => {
        const st = standings.get(s.id);
        const cgpa = st?.cgpa ?? s.gpa;
        return { code: s.studentCode, name: s.nameAr, program: s.program?.nameAr ?? '—', level: s.level, cgpa: cgpa.toFixed(2), earned: st?.earnedHours ?? '—', grade: cgpaToGrade(cgpa) };
      });
      const dist = new Map<string, number>();
      for (const r of rows) dist.set(r.grade, (dist.get(r.grade) ?? 0) + 1);
      const stats = [{ label: 'إجمالي الخريجين', value: rows.length }, ...[...dist.entries()].map(([label, value]) => ({ label, value }))];
      return {
        kind: 'sheet',
        title: 'كشف الخريجين',
        header: { المعهد: await instituteName(ctx.universityId), 'عدد الخريجين': String(rows.length) },
        footer: await gradeScaleFooter(ctx.universityId),
        meta: { stats },
        columns: [
          { key: 'code', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'program', label: 'البرنامج' },
          { key: 'level', label: 'المستوى', align: 'center', numeric: true }, { key: 'cgpa', label: 'المعدل التراكمي', align: 'center', numeric: true },
          { key: 'earned', label: 'الساعات المكتسبة', align: 'center', numeric: true }, { key: 'grade', label: 'التقدير', align: 'center' },
        ],
        rows,
        totals: { code: 'الإجمالي', name: `${rows.length} خريج` },
      };
    },
  },
  {
    id: 'level-result-sheet', category: 'transcripts', nameAr: 'كشف نتيجة المستوى الدراسي',
    description: 'كل طالب في المستوى، عمود لكل مقرر، مع المعدل الفصلي والنتيجة وتوزيع النتائج',
    permission: VIEW, filters: ['level', 'academicYear', 'semester', 'departmentId', 'programId'], requires: ['level', 'academicYear', 'semester'],
    run: async (f, ctx) => {
      const students = await prisma.student.findMany({
        where: studentWhere(f, ctx.universityId ?? null),
        select: { id: true, studentCode: true, nameAr: true },
        orderBy: { studentCode: 'asc' },
      });
      if (!students.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد طلاب في هذا المستوى' } };
      const ids = students.map((s) => s.id);
      const [enrollments, statuses] = await Promise.all([
        prisma.enrollment.findMany({
          where: { studentId: { in: ids }, academicYear: f.academicYear, semester: f.semester },
          include: { course: { select: { id: true, code: true, nameAr: true, creditHours: true, countsInGpa: true } } },
        }),
        prisma.gradeStatus.findMany({ where: ctx.universityId ? { universityId: ctx.universityId } : {} }),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));

      // distinct courses in this term → dynamic columns
      const courses = new Map<string, { code: string; name: string }>();
      for (const e of enrollments) if (!courses.has(e.course.id)) courses.set(e.course.id, { code: e.course.code, name: e.course.nameAr });
      const courseCols = [...courses.entries()].sort((a, b) => a[1].code.localeCompare(b[1].code));

      // per-student: course grade map + term GPA + result
      const byStudent = new Map<string, typeof enrollments>();
      for (const e of enrollments) (byStudent.get(e.studentId) ?? byStudent.set(e.studentId, []).get(e.studentId)!).push(e);

      let passed = 0, failed = 0, incomplete = 0;
      const rows: ReportRow[] = students.map((s) => {
        const es = byStudent.get(s.id) ?? [];
        const row: ReportRow = { code: s.studentCode, name: s.nameAr };
        let qp = 0, gpaHours = 0, hasFail = false, hasPending = false;
        for (const e of es) {
          row[e.course.id] = e.letterGrade ?? e.gradeStatusCode ?? '—';
          const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null;
          const cls = classify(st);
          if (cls === 'fail') hasFail = true;
          if (cls === 'incomplete' || e.resultPending) hasPending = true;
          if (e.points != null && e.course.countsInGpa) { qp += e.points * e.course.creditHours; gpaHours += e.course.creditHours; }
        }
        row.gpa = gpaHours > 0 ? (qp / gpaHours).toFixed(2) : '—';
        const result = hasFail ? 'راسب' : hasPending ? 'غير مكتمل' : es.length ? 'ناجح' : '—';
        row.result = result;
        if (result === 'ناجح') passed++; else if (result === 'راسب') failed++; else if (result === 'غير مكتمل') incomplete++;
        return row;
      });

      const columns: ReportColumn[] = [
        { key: 'code', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' },
        ...courseCols.map(([id, c]) => ({ key: id, label: c.code, align: 'center' as const })),
        { key: 'gpa', label: 'المعدل', align: 'center', numeric: true }, { key: 'result', label: 'النتيجة', align: 'center' },
      ];
      const stats = [
        { label: 'إجمالي الطلاب', value: students.length }, { label: 'ناجح', value: passed },
        { label: 'راسب', value: failed }, { label: 'غير مكتمل', value: incomplete },
        { label: 'نسبة النجاح', value: students.length ? `${Math.round((passed / students.length) * 100)}%` : '—' },
      ];
      return {
        kind: 'sheet',
        title: `كشف نتيجة المستوى ${f.level} — ${termLabelOf(f.academicYear ?? '', f.semester ?? '')}`,
        header: { المعهد: await instituteName(ctx.universityId), المستوى: String(f.level), 'العام الجامعي': f.academicYear ?? '—', 'الفصل الدراسي': semLabel(f.semester ?? '') },
        footer: await gradeScaleFooter(ctx.universityId),
        meta: { stats, courses: courseCols.map(([, c]) => `${c.code}: ${c.name}`) },
        columns,
        rows,
        totals: { code: 'الإجمالي', name: `${students.length} طالب` },
      };
    },
  },
];
