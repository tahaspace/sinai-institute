import prisma from '@/lib/prisma';
import type { ReportDef, ReportColumn, ReportRow } from '@/lib/reporting/types';
import { SEMESTERS, studentWhere, academicSystemWhere } from '@/lib/reporting/filters';
import { computeStandingForStudents, academicStateOf, ACADEMIC_STATE_LABELS } from '@/lib/standing';
import { resolveApplicableComponents } from '@/lib/grade-components';
import { getRegulations, cgpaGrade, NO_CGPA_GRADE } from '@/lib/regulations';
import { classify } from '@/lib/reports';
import { buildMinistryMatrix, rankByDesc, courseComponents, MARK_COMPONENTS, type MinistryScaleRow, type MinistryComponent } from '@/lib/reporting/ministry-matrix';

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
// NOTE: the academic-state vocabulary is NOT defined here. The bylaw names it exactly
// («انتظام ، وقف قيد ، المراقبة الاكاديمية»), and lib/standing.ts owns those labels — one field,
// one vocabulary, so the official statement can never print «موقوف» where the bylaw says «وقف قيد».
// Signature/approval roles printed on the official ministry export sheet.
const MINISTRY_SIGNATURES = ['رئيس الكنترول', 'وكيل المعهد لشؤون التعليم والطلاب', 'عميد المعهد'];

const semLabel = (s: string) => SEMESTERS.find((x) => x.value === s)?.label ?? s;
const termLabelOf = (academicYear: string, semester: string) => `${semLabel(semester)} ${academicYear}`;

/**
 * تقدير عام from the CGPA (جدول 4). This used to be a literal ladder here (3.4/2.8/2.4/2.0) that
 * matched neither the bylaw nor the copy in lib/promotion.ts, so the transcript and the graduation
 * batch printed different classifications for the same graduate. The table now lives in the bylaw
 * settings; each report run resolves it once and closes over it (the call sites are inside `.map`s,
 * so they must stay synchronous).
 */
async function cgpaGrader(): Promise<(cgpa: number) => string> {
  const reg = await getRegulations();
  return (cgpa: number) => cgpaGrade(cgpa, reg);
}

/**
 * A CGPA below every band in the institute's جدول 4 has NO تقدير — the cell prints «—». In a
 * توزيع التقديرات a bare dash reads as a missing count rather than a bucket, so name it there.
 * Each sheet keeps its own wording for the real bands (`prefix`).
 */
const gradeDistLabel = (grade: string, prefix = '') => (grade === NO_CGPA_GRADE ? 'بدون تقدير' : `${prefix}${grade}`);

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

async function departmentName(id?: string): Promise<string | null> {
  if (!id) return null;
  const d = await prisma.department.findUnique({ where: { id }, select: { nameAr: true } });
  return d?.nameAr ?? null;
}

/** Grade-scale legend mapped into the ministry-matrix scale shape (code · name · min% · points). */
async function ministryScale(universityId: string | null): Promise<MinistryScaleRow[]> {
  return (await gradeScaleFooter(universityId)).map((g) => ({
    code: String(g.code), name: String(g.name),
    range: g.minPercent && g.minPercent !== '—' ? `${g.minPercent}+` : '—',
    points: String(g.points),
  }));
}

export const transcriptsReports: ReportDef[] = [
  {
    id: 'student-transcript', category: 'transcripts', nameAr: 'بيان حالة الطالب (كشف الدرجات)',
    description: 'كشف تفصيلي بالمقررات لكل فصل مع المعدل الفصلي والتراكمي والساعات المكتسبة',
    permission: VIEW, filters: ['studentCode'], requires: ['studentCode'],
    run: async (f, ctx) => {
      const cgpaToGrade = await cgpaGrader();
      const student = await prisma.student.findFirst({
        where: { studentCode: f.studentCode, universityId: ctx.universityId ?? undefined },
        include: { program: { select: { nameAr: true, academicSystem: true } }, department: { select: { nameAr: true } } },
      });
      if (!student) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'الطالب غير موجود' } };
      // Dual-system guard: this is a credit-hours GPA بيان حالة. An annual student's document is the
      // annual transcript (نسبة/تقدير, لا يوجد معدل تراكمي) — send the operator there instead of a wrong sheet.
      if (student.program?.academicSystem === 'ANNUAL') {
        return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'هذا الطالب بالنظام السنوي — استخدم «كشف الطالب السنوي» ضمن فئة «النتائج السنوية»' } };
      }

      const [enrollments, statuses, standings, reg] = await Promise.all([
        // midterm/final/practical/homework maxes come along so the bylaw's «النسبه المئويه التراكمية»
        // can be computed from the marks actually recorded, rather than converted out of the GPA
        // (جدول 3 and جدول 4 disagree on that conversion, so deriving it would print a contested number).
        prisma.enrollment.findMany({ where: { studentId: student.id }, include: { course: { select: { code: true, nameAr: true, creditHours: true, countsInGpa: true, midtermMax: true, finalMax: true, practicalMax: true, homeworkMax: true } } } }),
        prisma.gradeStatus.findMany({ where: ctx.universityId ? { universityId: ctx.universityId } : {} }),
        // «الحاله االاكاديمه ( انتظام ، مراقبه ، وقف قيد )» — المراقبة الأكاديمية is not a Student.status
        // value, it is derived by the standing engine, so the official statement has to ask it.
        computeStandingForStudents([student.id]),
        // «مقررات معفى من مكوّناتها» — the bylaw's repeat exemption, needed so the percentage
        // denominator is the one this enrolment could actually score against.
        getRegulations(ctx.universityId),
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
      // Cumulative percentage accumulators + the two bylaw hour groupings (داخل/خارج المعدل).
      let pctWeighted = 0, pctHours = 0, inGpaHours = 0, outGpaHours = 0;
      for (const tk of orderedTerms) {
        const [ay, sem] = tk.split('|');
        const label = termLabelOf(ay, sem);
        const courses: ReportRow[] = [];
        let regHours = 0, earnedHours = 0, quality = 0, termPoints = 0, gpaHours = 0;
        for (const e of groups.get(tk)!) {
          const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null;
          const ch = e.course.creditHours;
          // «الدرجة» stays the raw recorded total — what the control desk actually entered.
          const comps = [e.midterm, e.final, e.practical, e.homework].filter((v): v is number => v != null);
          const total = comps.length ? comps.reduce((s, v) => s + v, 0) : null;
          const score = total != null ? total.toFixed(0) : '—';
          const grade = e.letterGrade ?? e.gradeStatusCode ?? '—';
          const pts = e.points;
          regHours += ch;
          if (st?.isPass) earnedHours += ch;
          // «مقررات يدخل تقدير في حساب التقدير التراكمي ، مقررات لايدخل تقديرها» — the bylaw makes this
          // split a required grouping on the statement. It was already computed here and never shown.
          const inGpa = !!st?.affectsGpa && e.course.countsInGpa && pts != null;
          if (inGpa) { quality += pts! * ch; termPoints += pts!; gpaHours += ch; }
          // «النسبه المئويه التراكمية» — weighted by credit hours over the courses that carry the
          // cumulative average. Numerator and denominator MUST come from the same component set:
          // summing every recorded mark over a denominator that drops zero-max (or bylaw-exempt)
          // components could print above 100% on an official بيان حالة — a stray `practical` on a
          // نظري course was enough. resolveApplicableComponents is the platform-wide rule, so a
          // student exempt from a component is measured against the denominator he could score.
          const applicability = resolveApplicableComponents(
            { excludedComponents: e.excludedComponents, attemptNo: e.attemptNo, academicSystem: student.program?.academicSystem },
            e.course,
            reg,
          );
          const applicableMarks = applicability.applicableKeys
            .map((k) => (e as unknown as Record<string, number | null>)[k])
            .filter((v): v is number => v != null);
          // A half-recorded course contributes NOTHING rather than a depressed percentage: a missing
          // component is "not marked yet", not a zero.
          const percent =
            applicability.maxTotal > 0 && applicableMarks.length === applicability.applicableKeys.length && applicableMarks.length > 0
              ? (applicableMarks.reduce((a, v) => a + v, 0) / applicability.maxTotal) * 100
              : null;
          if (inGpa && percent != null) { pctWeighted += percent * ch; pctHours += ch; }
          // Only a course with a RECORDED result is placed in one of the bylaw's two groups. An
          // un-graded registration belongs to neither: filing it under «لا يدخل تقديرها» would
          // assert an exclusion nobody decided.
          if (st) { if (inGpa) inGpaHours += ch; else outGpaHours += ch; }
          const row = {
            code: e.course.code, name: e.course.nameAr, hours: ch, score,
            percent: percent != null ? `${percent.toFixed(1)}%` : '—',
            points: pts != null ? pts.toFixed(2) : '—', grade,
            inGpa: inGpa ? 'نعم' : 'لا',
          };
          courses.push(row);
          rows.push({ term: label, ...row });
        }
        cumQuality += quality; cumGpaHours += gpaHours; cumEarned += earnedHours;
        const termGpa = gpaHours ? quality / gpaHours : 0;
        const cumGpa = cumGpaHours ? cumQuality / cumGpaHours : 0;
        terms.push({ label, courses, footer: { termGpa: termGpa.toFixed(2), cumulativeGpa: cumGpa.toFixed(2), registeredHours: regHours, earnedHours, qualityPoints: quality.toFixed(2), termPoints: termPoints.toFixed(2) } });
        rows.push({ term: label, code: '', name: '— معدل الفصل —', hours: regHours, score: '', percent: '', points: termGpa.toFixed(2), grade: '', inGpa: '' });
      }
      const cgpa = cumGpaHours ? cumQuality / cumGpaHours : 0;
      // null (printed «—») when no course on the file carries recorded marks over a configured
      // maximum — an unmeasured percentage must not read as 0%.
      const cumPercent = pctHours > 0 ? pctWeighted / pctHours : null;
      const cumPercentLabel = cumPercent != null ? `${cumPercent.toFixed(2)}%` : '—';
      const standing = standings.get(student.id);

      // بيان حالة bio block (matches the client's screen photo) — only shows fields that are set.
      const bio: Record<string, string> = {};
      // «اسم ، جنسيه ، تاريخ الميلاد ، المعهد ، القسم ، المستوي الاكاديمي» — nationality is on the
      // Student row and was simply never printed on the document that names it.
      if (student.nationality) bio['الجنسية'] = student.nationality;
      if (student.birthPlace) bio['محل الميلاد'] = student.birthPlace;
      if (student.birthDate) bio['تاريخ الميلاد'] = student.birthDate.toISOString().slice(0, 10);
      if (student.address) bio['العنوان'] = student.address;
      if (student.entryQualification) bio['مؤهل القبول'] = student.entryQualification;
      if (student.priorSchool) bio['المدرسة'] = student.priorSchool;
      if (student.priorQualTotal) bio['المجموع'] = student.priorQualTotal;
      if (student.priorQualYear) bio['سنة المؤهل'] = student.priorQualYear;
      if (student.admissionType) bio['نوع القبول'] = student.admissionType;

      return {
        kind: 'sheet',
        title: `بيان حالة — ${student.nameAr}`,
        header: {
          المعهد: await instituteName(ctx.universityId),
          الطالب: student.nameAr,
          'رقم الجلوس': student.seatNumber ?? student.studentCode,
          البرنامج: student.program?.nameAr ?? '—',
          القسم: student.department?.nameAr ?? '—',
          المستوى: String(student.level),
          // The bylaw's own three-valued academic state. المراقبة الأكاديمية is derived, not stored, so
          // it is appended to the registration status instead of replacing it — a student can be
          // مقيّد AND under المراقبة at once, and the document must not hide either half.
          // The bylaw names the three states exactly — «انتظام ، وقف قيد ، المراقبة الاكاديمية» — so
          // the official document uses that vocabulary, not this file's «مقيّد»/«موقوف». Both halves
          // are sourced from ACADEMIC_STATE_LABELS: a مقيّد student on probation is «انتظام —
          // المراقبة الأكاديمية», and a وقف قيد is never printed as «موقوف».
          الحالة: (() => {
            const state = academicStateOf(student.status, standing);
            const label = ACADEMIC_STATE_LABELS[state];
            return state !== 'MONITORING' && standing?.onProbation
              ? `${label} — ${ACADEMIC_STATE_LABELS.MONITORING}`
              : label;
          })(),
          ...bio,
          'نظام الدراسة': 'نظام الساعات المعتمدة',
          'متوسط التقدير (المعدل التراكمي)': cgpa.toFixed(2),
          'النسبة المئوية التراكمية': cumPercentLabel,
          التقدير: cgpaToGrade(cgpa),
          'ساعات تدخل في المعدل': String(inGpaHours),
          'ساعات لا تدخل في المعدل': String(outGpaHours),
        },
        footer: await gradeScaleFooter(ctx.universityId),
        meta: { transcript: { terms, summary: { cgpa: cgpa.toFixed(2), earnedHours: cumEarned, grade: cgpaToGrade(cgpa), cumulativePercent: cumPercentLabel, inGpaHours, outGpaHours } } },
        columns: [
          { key: 'term', label: 'الفصل' }, { key: 'code', label: 'كود المقرر' }, { key: 'name', label: 'اسم المقرر' },
          { key: 'hours', label: 'س.م', align: 'center', numeric: true }, { key: 'score', label: 'الدرجة', align: 'center' },
          { key: 'percent', label: 'النسبة', align: 'center' },
          { key: 'points', label: 'النقاط', align: 'center' }, { key: 'grade', label: 'التقدير', align: 'center' },
          { key: 'inGpa', label: 'يدخل في المعدل', align: 'center' },
        ],
        rows,
        totals: { term: 'الإجمالي', name: `المعدل التراكمي: ${cgpa.toFixed(2)}`, hours: cumEarned, percent: cumPercentLabel, points: cgpa.toFixed(2), grade: cgpaToGrade(cgpa), inGpa: `${inGpaHours} / ${outGpaHours}` },
      };
    },
  },
  {
    id: 'graduates-batch', category: 'transcripts', nameAr: 'كشف الخريجين',
    description: 'قائمة الخريجين مع المعدل التراكمي والساعات والتقدير وتوزيع التقديرات',
    permission: VIEW, filters: ['departmentId', 'programId'],
    run: async (f, ctx) => {
      const cgpaToGrade = await cgpaGrader();
      const students = await prisma.student.findMany({
        where: { AND: [{ universityId: ctx.universityId ?? undefined, status: 'GRADUATED', ...(f.departmentId ? { departmentId: f.departmentId } : {}), ...(f.programId ? { programId: f.programId } : {}) }, academicSystemWhere('CREDIT_HOURS')] },
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
      const stats = [{ label: 'إجمالي الخريجين', value: rows.length }, ...[...dist.entries()].map(([label, value]) => ({ label: gradeDistLabel(label), value }))];
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
      const cgpaToGrade = await cgpaGrader();
      const students = await prisma.student.findMany({
        where: { AND: [studentWhere(f, ctx.universityId ?? null), academicSystemWhere('CREDIT_HOURS')] },
        select: { id: true, studentCode: true, nameAr: true, seatNumber: true },
        orderBy: { studentCode: 'asc' },
      });
      if (!students.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد طلاب في هذا المستوى' } };
      const ids = students.map((s) => s.id);
      const [enrollments, statuses, standings] = await Promise.all([
        prisma.enrollment.findMany({
          where: { studentId: { in: ids }, academicYear: f.academicYear, semester: f.semester },
          include: { course: { select: { id: true, code: true, nameAr: true, creditHours: true, countsInGpa: true, midtermMax: true, finalMax: true, practicalMax: true, homeworkMax: true } } },
        }),
        prisma.gradeStatus.findMany({ where: ctx.universityId ? { universityId: ctx.universityId } : {} }),
        computeStandingForStudents(ids),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));

      // distinct courses in this term → dynamic columns, each carrying its internal mark split
      const courses = new Map<string, { code: string; name: string; components: MinistryComponent[]; totalMax: number }>();
      for (const e of enrollments) if (!courses.has(e.course.id)) { const cc = courseComponents(e.course); courses.set(e.course.id, { code: e.course.code, name: e.course.nameAr, components: cc.components, totalMax: cc.totalMax }); }
      const courseCols = [...courses.entries()].sort((a, b) => a[1].code.localeCompare(b[1].code));

      // per-student: course grade map + term GPA + result
      const byStudent = new Map<string, typeof enrollments>();
      for (const e of enrollments) (byStudent.get(e.studentId) ?? byStudent.set(e.studentId, []).get(e.studentId)!).push(e);

      let passed = 0, failed = 0, incomplete = 0;
      // Per-student aggregate feeding BOTH the screen row and the ministry-matrix row.
      type MCell = { parts: Record<string, string>; total: string; grade: string };
      type MRec = { id: string; seat: string; name: string; cells: Record<string, MCell>; regHours: number; earnedHours: number; quality: number; termGpa: number; cgpa: number; result: string };
      const mrecs: MRec[] = [];
      const rows: ReportRow[] = students.map((s) => {
        const es = byStudent.get(s.id) ?? [];
        const row: ReportRow = { code: s.studentCode, name: s.nameAr };
        const cells: Record<string, MCell> = {};
        let qp = 0, gpaHours = 0, regHours = 0, earnedHours = 0, hasFail = false, hasPending = false;
        for (const e of es) {
          const grade = e.letterGrade ?? e.gradeStatusCode ?? '—';
          row[e.course.id] = grade;
          const comps = [e.midterm, e.final, e.practical, e.homework].filter((v): v is number => v != null);
          const mark = comps.length ? comps.reduce((a, v) => a + v, 0).toFixed(0) : '—';
          // per-component marks (only the parts the course actually has)
          const partVals: Record<string, number | null> = { homework: e.homework, midterm: e.midterm, practical: e.practical, final: e.final };
          const partMax: Record<string, number> = { homework: e.course.homeworkMax, midterm: e.course.midtermMax, practical: e.course.practicalMax, final: e.course.finalMax };
          const parts: Record<string, string> = {};
          for (const comp of MARK_COMPONENTS) if (partMax[comp.key] > 0) parts[comp.key] = partVals[comp.key] != null ? String(partVals[comp.key]) : '—';
          cells[e.course.code] = { parts, total: mark, grade };
          const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null;
          const cls = classify(st);
          if (cls === 'fail') hasFail = true;
          if (cls === 'incomplete' || e.resultPending) hasPending = true;
          regHours += e.course.creditHours;
          if (st?.isPass) earnedHours += e.course.creditHours;
          if (e.points != null && e.course.countsInGpa) { qp += e.points * e.course.creditHours; gpaHours += e.course.creditHours; }
        }
        const termGpa = gpaHours > 0 ? qp / gpaHours : 0;
        const cgpa = standings.get(s.id)?.cgpa ?? 0;
        row.gpa = gpaHours > 0 ? termGpa.toFixed(2) : '—';
        row.cgpa = cgpa.toFixed(2);
        const result = hasFail ? 'راسب' : hasPending ? 'غير مكتمل' : es.length ? 'ناجح' : '—';
        row.result = result;
        if (result === 'ناجح') passed++; else if (result === 'راسب') failed++; else if (result === 'غير مكتمل') incomplete++;
        mrecs.push({ id: s.id, seat: s.seatNumber ?? s.studentCode, name: s.nameAr, cells, regHours, earnedHours, quality: qp, termGpa, cgpa, result });
        return row;
      });

      const columns: ReportColumn[] = [
        { key: 'code', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' },
        ...courseCols.map(([id, c]) => ({ key: id, label: c.code, align: 'center' as const })),
        { key: 'gpa', label: 'المعدل الفصلي', align: 'center', numeric: true }, { key: 'cgpa', label: 'التراكمي', align: 'center', numeric: true }, { key: 'result', label: 'النتيجة', align: 'center' },
      ];
      // grade-bracket distribution (count per letter grade across all course results) — matches the
      // statistics box in the client's «نتيجة المستوى» sample.
      const gradeDist = new Map<string, number>();
      for (const e of enrollments) {
        const code = e.letterGrade ?? e.gradeStatusCode;
        if (!code) continue;
        const st = byCode.get(code);
        if (st && !st.isLetter) continue; // distribution counts letter grades only
        gradeDist.set(code, (gradeDist.get(code) ?? 0) + 1);
      }
      const gradeOrder = [...gradeDist.keys()].sort((a, b) => (byCode.get(b)?.minPercent ?? -1) - (byCode.get(a)?.minPercent ?? -1));
      const stats = [
        { label: 'إجمالي الطلاب', value: students.length }, { label: 'ناجح', value: passed },
        { label: 'راسب', value: failed }, { label: 'غير مكتمل', value: incomplete },
        { label: 'نسبة النجاح', value: students.length ? `${Math.round((passed / students.length) * 100)}%` : '—' },
        ...gradeOrder.map((code) => ({ label: `تقدير ${code}`, value: gradeDist.get(code)! })),
      ];
      // ---- Official ministry export matrix (درجة/تقدير per course + trailing summary cols) ----
      const [institute, dept, scale] = await Promise.all([instituteName(ctx.universityId), departmentName(f.departmentId), ministryScale(ctx.universityId)]);
      const rankMap = rankByDesc(mrecs, (r) => r.id, (r) => r.cgpa);
      const summaryCols = [
        { key: 'reg', label: 'س.مسجلة' }, { key: 'earned', label: 'س.مكتسبة' }, { key: 'quality', label: 'نقاط الجودة' },
        { key: 'gpa', label: 'المعدل الفصلي' }, { key: 'cgpa', label: 'المعدل التراكمي' }, { key: 'grade', label: 'التقدير العام' },
        { key: 'result', label: 'الحالة' }, { key: 'rank', label: 'الترتيب' },
      ];
      const matrix = await buildMinistryMatrix({
        system: 'CREDIT_HOURS', institute,
        letterhead: [
          ...(dept ? [{ label: 'القسم', value: dept }] : []),
          { label: 'المستوى', value: String(f.level) },
          { label: 'العام الجامعي', value: f.academicYear ?? '—' },
          { label: 'الفصل الدراسي', value: semLabel(f.semester ?? '') },
        ],
        courses: courseCols.map(([, c]) => ({ code: c.code, name: c.name, components: c.components, totalMax: c.totalMax })),
        summaryCols,
        rows: mrecs.map((r, i) => ({
          serial: i + 1, seat: r.seat, name: r.name, cells: r.cells,
          summary: { reg: String(r.regHours), earned: String(r.earnedHours), quality: r.quality.toFixed(1), gpa: r.termGpa.toFixed(2), cgpa: r.cgpa.toFixed(2), grade: cgpaToGrade(r.cgpa), result: r.result, rank: String(rankMap.get(r.id) ?? '—') },
        })),
        scale, distribution: stats,
      });
      return {
        kind: 'sheet',
        title: `كشف نتيجة المستوى ${f.level} — ${termLabelOf(f.academicYear ?? '', f.semester ?? '')}`,
        header: { المعهد: institute, المستوى: String(f.level), 'العام الجامعي': f.academicYear ?? '—', 'الفصل الدراسي': semLabel(f.semester ?? '') },
        footer: await gradeScaleFooter(ctx.universityId),
        meta: { stats, courses: courseCols.map(([, c]) => `${c.code}: ${c.name}`), ministrySheet: { signatures: MINISTRY_SIGNATURES, matrix } },
        columns,
        rows,
        totals: { code: 'الإجمالي', name: `${students.length} طالب` },
      };
    },
  },
  {
    id: 'graduates-result-sheet', category: 'transcripts', nameAr: 'كشف نتيجة الخريجين (مصفوفة)',
    description: 'كشف التخرج: الفرقة النهائية بتقسيمة كل مادة بالكامل، والسنوات السابقة كمعدل إجمالي لكل فرقة، مع المعدل التراكمي وتقدير التخرج — تُصدَّر بصيغة الوزارة للتوقيع',
    permission: VIEW, filters: ['academicYear', 'departmentId', 'programId'],
    run: async (f, ctx) => {
      const cgpaToGrade = await cgpaGrader();
      const uid = ctx.universityId ?? null;
      const students = await prisma.student.findMany({ where: { AND: [studentWhere(f, uid), academicSystemWhere('CREDIT_HOURS'), { status: 'GRADUATED' }] }, select: { id: true, studentCode: true, nameAr: true, seatNumber: true }, orderBy: { studentCode: 'asc' } });
      if (!students.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد خريجون بهذه المعايير' } };
      const ids = students.map((s) => s.id);
      const [enrollments, standings] = await Promise.all([
        prisma.enrollment.findMany({ where: { studentId: { in: ids } }, include: { course: { select: { id: true, code: true, nameAr: true, creditHours: true, countsInGpa: true, midtermMax: true, finalMax: true, practicalMax: true, homeworkMax: true } } } }),
        computeStandingForStudents(ids),
      ]);
      // graduation (final) year = the filter year if given, else the latest recorded year
      const allYears = [...new Set(enrollments.map((e) => e.academicYear))].sort();
      const finalYear = f.academicYear && allYears.includes(f.academicYear) ? f.academicYear : allYears[allYears.length - 1];
      if (!finalYear) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا توجد نتائج مسجلة للخريجين' } };
      const byStudent = new Map<string, typeof enrollments>();
      for (const e of enrollments) (byStudent.get(e.studentId) ?? byStudent.set(e.studentId, []).get(e.studentId)!).push(e);
      const grads = students.filter((s) => (byStudent.get(s.id) ?? []).some((e) => e.academicYear === finalYear));
      if (!grads.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد خريجون في هذا العام' } };
      // prior years across the cohort (oldest→newest) → الفرقة 1..n; final year = الفرقة (n+1)
      const priorYears = [...new Set(grads.flatMap((s) => (byStudent.get(s.id) ?? []).map((e) => e.academicYear)))].filter((y) => y < finalYear).sort();
      const finalFirqa = priorYears.length + 1;

      // total mark (sum of recorded components — درجات، not %) for one enrollment, or null if nothing recorded
      const totalMark = (e: (typeof enrollments)[number]): number | null => {
        const comps = [e.midterm, e.final, e.practical, e.homework].filter((v): v is number => v != null);
        return comps.length ? comps.reduce((a, v) => a + v, 0) : null;
      };

      // prior-year groups: one group per فرقة with TWO columns — المجموع (whole year's total marks) + التقدير
      const priorGroups = priorYears.map((yr, i) => {
        let yearMax = 0; const seen = new Set<string>();
        for (const s of grads) for (const e of byStudent.get(s.id) ?? []) if (e.academicYear === yr && !seen.has(e.course.code)) { seen.add(e.course.code); yearMax += e.course.midtermMax + e.course.finalMax + e.course.practicalMax + e.course.homeworkMax; }
        return { i, yr, firqa: `الفرقة ${i + 1}`, yearMax };
      });
      // a whole year's total marks (Σ course totals) and its GPA (→ تقدير) for one student
      const yearTotal = (es: typeof enrollments, yr: string): number | null => {
        let sum = 0, any = false;
        for (const e of es) if (e.academicYear === yr) { const t = totalMark(e); if (t != null) { sum += t; any = true; } }
        return any ? sum : null;
      };
      const yearGpa = (es: typeof enrollments, yr: string): number | null => {
        let qp = 0, h = 0;
        for (const e of es) if (e.academicYear === yr && e.points != null && e.course.countsInGpa) { qp += e.points * e.course.creditHours; h += e.course.creditHours; }
        return h > 0 ? qp / h : null;
      };

      // final-year course columns (with the internal mark split)
      const courses = new Map<string, { code: string; name: string; components: MinistryComponent[]; totalMax: number }>();
      for (const s of grads) for (const e of byStudent.get(s.id) ?? []) if (e.academicYear === finalYear && !courses.has(e.course.id)) { const cc = courseComponents(e.course); courses.set(e.course.id, { code: e.course.code, name: e.course.nameAr, components: cc.components, totalMax: cc.totalMax }); }
      const courseCols = [...courses.entries()].sort((a, b) => a[1].code.localeCompare(b[1].code));

      type GCell = { parts: Record<string, string>; total: string; grade: string };
      type GRec = { id: string; seat: string; name: string; leading: Record<string, string>; cells: Record<string, GCell>; cgpa: number; gtotal: number; gavg: number; gpct: number };
      const gradeDist = new Map<string, number>();
      const grecs: GRec[] = grads.map((s) => {
        const es = byStudent.get(s.id) ?? [];
        // prior years: one cell = the whole year's total marks + the year's تقدير (no per-course breakdown)
        const leading: Record<string, string> = {};
        for (const g of priorGroups) {
          const tot = yearTotal(es, g.yr);
          const gp = yearGpa(es, g.yr);
          leading[`y${g.i}_total`] = tot != null ? String(tot) : '—';
          leading[`y${g.i}_grade`] = gp != null ? cgpaToGrade(gp) : '—';
        }
        const cells: Record<string, GCell> = {};
        for (const e of es) if (e.academicYear === finalYear) {
          const g = e.letterGrade ?? e.gradeStatusCode ?? '—';
          const comps = [e.midterm, e.final, e.practical, e.homework].filter((v): v is number => v != null);
          const partVals: Record<string, number | null> = { homework: e.homework, midterm: e.midterm, practical: e.practical, final: e.final };
          const partMax: Record<string, number> = { homework: e.course.homeworkMax, midterm: e.course.midtermMax, practical: e.course.practicalMax, final: e.course.finalMax };
          const parts: Record<string, string> = {};
          for (const comp of MARK_COMPONENTS) if (partMax[comp.key] > 0) parts[comp.key] = partVals[comp.key] != null ? String(partVals[comp.key]) : '—';
          cells[e.course.code] = { parts, total: comps.length ? comps.reduce((a, v) => a + v, 0).toFixed(0) : '—', grade: g };
        }
        const cgpa = standings.get(s.id)?.cgpa ?? 0;
        const gr = cgpaToGrade(cgpa);
        gradeDist.set(gr, (gradeDist.get(gr) ?? 0) + 1);
        // cumulative over ALL years: grand total of marks, its average per year, and its percentage
        let grandTotal = 0, grandMax = 0;
        for (const e of es) { const t = totalMark(e); if (t != null) { grandTotal += t; grandMax += e.course.midtermMax + e.course.finalMax + e.course.practicalMax + e.course.homeworkMax; } }
        const nY = new Set(es.filter((e) => totalMark(e) != null).map((e) => e.academicYear)).size || 1;
        const gavg = grandTotal / nY;
        const gpct = grandMax > 0 ? (grandTotal / grandMax) * 100 : 0;
        return { id: s.id, seat: s.seatNumber ?? s.studentCode, name: s.nameAr, leading, cells, cgpa, gtotal: grandTotal, gavg, gpct };
      });
      const rankMap = rankByDesc(grecs, (r) => r.id, (r) => r.gpct);
      const stats = [{ label: 'إجمالي الخريجين', value: grecs.length }, ...[...gradeDist.entries()].map(([label, value]) => ({ label: gradeDistLabel(label, 'تقدير '), value }))];

      // screen (photo) columns/rows: prior-year per-course totals + final-year course grades + cumulative
      const columns: ReportColumn[] = [
        { key: 'code', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' },
        ...priorGroups.flatMap((g) => [
          { key: `y${g.i}_total`, label: `ف${g.i + 1} مجموع`, align: 'center' as const, numeric: true },
          { key: `y${g.i}_grade`, label: `ف${g.i + 1} تقدير`, align: 'center' as const },
        ]),
        ...courseCols.map(([, c]) => ({ key: `c_${c.code}`, label: c.code, align: 'center' as const })),
        { key: 'gtotal', label: 'المجموع التراكمي', align: 'center', numeric: true }, { key: 'gavg', label: 'المعدل التراكمي', align: 'center', numeric: true }, { key: 'gpct', label: 'النسبة المئوية', align: 'center', numeric: true }, { key: 'grade', label: 'تقدير التخرج', align: 'center' }, { key: 'rank', label: 'الترتيب', align: 'center', numeric: true },
      ];
      const rows: ReportRow[] = grecs.map((r) => {
        const row: ReportRow = { code: r.seat, name: r.name, ...r.leading };
        for (const [, c] of courseCols) row[`c_${c.code}`] = r.cells[c.code]?.grade ?? '—';
        row.gtotal = String(r.gtotal); row.gavg = r.gavg.toFixed(1); row.gpct = `${r.gpct.toFixed(1)}%`; row.grade = cgpaToGrade(r.cgpa); row.rank = String(rankMap.get(r.id) ?? '—');
        return row;
      });

      const [institute, dept, scale] = await Promise.all([instituteName(uid), departmentName(f.departmentId), ministryScale(uid)]);
      const matrix = await buildMinistryMatrix({
        system: 'CREDIT_HOURS', institute,
        letterhead: [
          ...(dept ? [{ label: 'القسم', value: dept }] : []),
          { label: 'دفعة التخرج', value: finalYear },
          { label: 'الفرقة النهائية', value: String(finalFirqa) },
        ],
        leadingGroups: priorGroups.map((g) => ({ title: `${g.firqa} — ${g.yr}`, cols: [{ key: `y${g.i}_total`, label: `المجموع /${g.yearMax}` }, { key: `y${g.i}_grade`, label: 'التقدير' }] })),
        courses: courseCols.map(([, c]) => ({ code: c.code, name: c.name, components: c.components, totalMax: c.totalMax })),
        summaryCols: [
          { key: 'gtotal', label: 'المجموع التراكمي' }, { key: 'gavg', label: 'المعدل التراكمي' }, { key: 'gpct', label: 'النسبة المئوية' }, { key: 'grade', label: 'تقدير التخرج' }, { key: 'rank', label: 'الترتيب' },
        ],
        rows: grecs.map((r, i) => ({
          serial: i + 1, seat: r.seat, name: r.name, leading: r.leading, cells: r.cells,
          summary: { gtotal: String(r.gtotal), gavg: r.gavg.toFixed(1), gpct: `${r.gpct.toFixed(1)}%`, grade: cgpaToGrade(r.cgpa), rank: String(rankMap.get(r.id) ?? '—') },
        })),
        scale, distribution: stats,
      });
      return {
        kind: 'sheet',
        title: `كشف نتيجة الخريجين — دفعة ${finalYear}`,
        header: { المعهد: institute, 'دفعة التخرج': finalYear, 'الفرقة النهائية': String(finalFirqa), 'عدد الخريجين': String(grecs.length) },
        footer: await gradeScaleFooter(uid),
        meta: { stats, courses: courseCols.map(([, c]) => `${c.code}: ${c.name}`), ministrySheet: { signatures: MINISTRY_SIGNATURES, matrix } },
        columns, rows,
        totals: { code: 'الإجمالي', name: `${grecs.length} خريج` },
      };
    },
  },
];
