import prisma from '@/lib/prisma';
import { computeStandingForStudents, computeAcademicStanding } from '@/lib/standing';
import { DEFAULT_REGULATIONS, getRegulations } from '@/lib/regulations';
import { bandsFromRegulations, courseTotalPct, gradeFromBands } from '@/lib/annual';
import { resolveApplicableComponents } from '@/lib/grade-components';
import { studentSystemWhere, type AcademicSystem } from '@/lib/academic-system';

// Registrar reports engine. All reports are aggregations over Enrollment + the
// configurable GradeStatus table, so pass/fail/withdrawn classification stays
// consistent with the GPA and standing engines.

export type StatusClass = 'pass' | 'fail' | 'withdrawn' | 'incomplete' | 'ungraded';

type GS = { code: string; isPass: boolean; affectsGpa: boolean; points: number | null };

export function classify(st: GS | undefined | null): StatusClass {
  if (!st) return 'ungraded';
  if (st.isPass) return 'pass';
  if (st.code === 'W' || st.code === 'FW') return 'withdrawn';
  // held/excused states (legacy I/E + ClientR2 canonical INC/AB/DEFER) — not yet a final outcome
  if (['I', 'E', 'INC', 'AB', 'DEFER'].includes(st.code)) return 'incomplete';
  // graded, non-pass, counts as 0 toward GPA → fail (F/NE/ABS/BL/DN/DS)
  if (st.affectsGpa && st.points != null) return 'fail';
  return 'ungraded';
}

type TermFilter = { academicYear?: string; semester?: string };

function termWhere(f: TermFilter) {
  const w: Record<string, string> = {};
  if (f.academicYear) w.academicYear = f.academicYear;
  if (f.semester) w.semester = f.semester;
  return w;
}

// Per-course outcome counts + pass rate (covers: pass-rate, #failing, #withdrawn).
export async function courseResults(f: TermFilter) {
  const [courses, statuses] = await Promise.all([
    prisma.course.findMany({
      include: { enrollments: { where: termWhere(f) }, department: { select: { nameAr: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.gradeStatus.findMany(),
  ]);
  const byCode = new Map(statuses.map((s) => [s.code, s]));

  const rows = courses
    .map((c) => {
      let pass = 0, fail = 0, withdrawn = 0, incomplete = 0, ungraded = 0;
      for (const e of c.enrollments) {
        const cls = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null);
        if (cls === 'pass') pass++;
        else if (cls === 'fail') fail++;
        else if (cls === 'withdrawn') withdrawn++;
        else if (cls === 'incomplete') incomplete++;
        else ungraded++;
      }
      const graded = pass + fail;
      return {
        code: c.code,
        name: c.nameAr,
        department: c.department?.nameAr ?? '',
        enrolled: c.enrollments.length,
        graded,
        pass,
        fail,
        withdrawn,
        incomplete,
        ungraded,
        passRate: graded ? Math.round((pass / graded) * 100) : 0,
      };
    })
    .filter((r) => r.enrolled > 0);

  const totGraded = rows.reduce((s, r) => s + r.graded, 0);
  const totPass = rows.reduce((s, r) => s + r.pass, 0);
  return {
    rows,
    totals: {
      courses: rows.length,
      enrolled: rows.reduce((s, r) => s + r.enrolled, 0),
      pass: totPass,
      fail: rows.reduce((s, r) => s + r.fail, 0),
      withdrawn: rows.reduce((s, r) => s + r.withdrawn, 0),
      passRate: totGraded ? Math.round((totPass / totGraded) * 100) : 0,
    },
  };
}

// Grade recording sheet (كشف رصد) for one course: roster with components + status.
export async function gradeSheet(courseId: string, f: TermFilter) {
  const [course, enrollments, statuses, reg] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.enrollment.findMany({ where: { courseId, ...termWhere(f) }, include: { student: true }, orderBy: { student: { studentCode: 'asc' } } }),
    prisma.gradeStatus.findMany(),
    getRegulations(),
  ]);
  if (!course) return null;
  const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));
  const byCode = new Map(statuses.map((s) => [s.code, s]));
  const max = course.midtermMax + course.finalMax + course.practicalMax + course.homeworkMax;

  return {
    course: { code: course.code, name: course.nameAr, max, midtermMax: course.midtermMax, finalMax: course.finalMax, practicalMax: course.practicalMax, homeworkMax: course.homeworkMax },
    rows: enrollments.map((e) => {
      // Same denominator as the grade-entry screen and the annual engine: an exempt repeater must not
      // read 48/100 راسب on the sheet the control desk signs while the screen beside it says 48/60.
      const app = resolveApplicableComponents(e, course, reg);
      const total = app.countedKeys.reduce((sum, k) => sum + (e[k] ?? 0), 0);
      return {
        maxTotal: app.maxTotal,
        excludedComponents: app.excludedKeys,
        studentCode: e.student.studentCode,
        name: e.student.nameAr,
        midterm: e.midterm,
        final: e.final,
        practical: e.practical,
        homework: e.homework,
        total,
        statusCode: e.gradeStatusCode,
        statusName: e.gradeStatusCode ? nameByCode.get(e.gradeStatusCode) ?? null : null,
        outcome: classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null),
      };
    }),
  };
}

// Warned students + expected graduates, derived from the standing engine.
export async function standingReport(kind: 'warned' | 'expected-graduates') {
  const students = await prisma.student.findMany({
    where: { status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] } },
    select: { id: true, studentCode: true, nameAr: true, level: true, department: { select: { nameAr: true } } },
    orderBy: { studentCode: 'asc' },
  });
  const standings = await computeStandingForStudents(students.map((s) => s.id));
  const rows = students
    .map((s) => ({ s, st: standings.get(s.id)! }))
    .filter(({ st }) => (kind === 'warned' ? st.escalation !== 'none' : st.graduationEligible))
    .map(({ s, st }) => ({
      studentCode: s.studentCode,
      name: s.nameAr,
      department: s.department?.nameAr ?? '',
      level: st.currentLevel,
      cgpa: st.cgpa,
      earnedHours: st.earnedHours,
      escalation: st.escalation,
      remainingHours: st.remainingHours,
      flags: st.flags,
    }));
  return { rows, count: rows.length };
}

// Ministry exam-prep candidate sheet: students enrolled in a course who are at/near
// graduation (final-level or graduation-eligible) — the registrar's exam-board roster.
export async function ministryPrep(courseId: string, f: TermFilter) {
  const [course, enrollments] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.enrollment.findMany({ where: { courseId, ...termWhere(f) }, include: { student: { select: { id: true, studentCode: true, nameAr: true, level: true } } } }),
  ]);
  if (!course) return null;
  const standings = await computeStandingForStudents(enrollments.map((e) => e.student.id));
  const rows = enrollments
    .map((e) => ({ e, st: standings.get(e.student.id)! }))
    .filter(({ st }) => st.graduationEligible || st.qualifiedLevel >= 4)
    .map(({ e, st }) => ({
      studentCode: e.student.studentCode,
      name: e.student.nameAr,
      level: st.currentLevel,
      cgpa: st.cgpa,
      earnedHours: st.earnedHours,
      graduationEligible: st.graduationEligible,
    }));
  return { course: { code: course.code, name: course.nameAr }, rows, count: rows.length };
}

// (1) كشف نجاح ورسوب — NAMED roster of a single course's students with their
// pass/fail/withdrawn/incomplete outcome (not aggregate counts). Same classify() rule as
// courseResults on the credit-hours path, so the headline counts and the named rows agree there;
// under ANNUAL the outcome is marks-derived and courseResults is NOT system-aware, so its counts
// will differ — read them as two different questions, not as a disagreement.
// `system` is optional so every existing caller is byte-identical; ANNUAL additionally
// scopes the roster and classifies each attempt from the raw marks — see the branch below.
export async function passFailRoster(courseId: string, f: TermFilter, system?: AcademicSystem) {
  const [course, enrollments, statuses] = await Promise.all([
    // `include` (not `select`) already returns every Course scalar, so the four component
    // maxes the ANNUAL branch needs are on this row — no extra query for them.
    prisma.course.findUnique({ where: { id: courseId }, include: { department: { select: { nameAr: true } } } }),
    prisma.enrollment.findMany({
      // Scoped to annual students ONLY on the ANNUAL branch, so the marks rule below can never be
      // applied to a credit-hours attempt and counts/passRate stay honest. The credit-hours and
      // no-filter paths keep the exact original where. Its narrowing sits under `student`, never
      // beside courseId/termWhere's keys, so spreading is safe.
      where: { courseId, ...termWhere(f), ...(system === 'ANNUAL' ? studentSystemWhere('ANNUAL') : {}) },
      include: { student: { select: { studentCode: true, nameAr: true, level: true, program: { select: { academicSystem: true } } } } },
      orderBy: { student: { studentCode: 'asc' } },
    }),
    prisma.gradeStatus.findMany(),
  ]);
  if (!course) return null;
  const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));
  const byCode = new Map(statuses.map((s) => [s.code, s]));

  // ── Dual-system: ANNUAL rows carry no grade code ──────────────────────────
  // lib/gpa.ts stores raw marks only for ANNUAL students (gradeStatusCode/letterGrade/points stay
  // null by design), so classify() alone buckets every annual attempt as "ungraded" — كشف الناجحين
  // and كشف الراسبين published an empty sheet under «النظام السنوي», and in the mixed «كل الأنظمة»
  // view the annual half silently vanished from the counts. The outcome is therefore derived per row
  // from the STUDENT'S OWN system, not from the viewer's selection, with the very rule lib/annual.ts
  // applies (courseTotalPct ≥ annualPassPercent, رأفة grace included) and التقدير labelled from the
  // same bylaw bands. A credit-hours row never enters that branch and is classified exactly as before.
  const anyAnnual = enrollments.some((e) => e.student?.program?.academicSystem === 'ANNUAL');
  const reg = anyAnnual ? await getRegulations() : null;
  const bands = reg ? bandsFromRegulations(reg) : null;
  const annualPassPct = reg ? reg.annualPassPercent ?? DEFAULT_REGULATIONS.annualPassPercent : 0;

  const counts = { pass: 0, fail: 0, withdrawn: 0, incomplete: 0, ungraded: 0 };
  const rows = enrollments.map((e) => {
    let outcome = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null);
    let statusCode = e.gradeStatusCode;
    let statusName = e.gradeStatusCode ? nameByCode.get(e.gradeStatusCode) ?? null : null;
    // an explicit exceptional code (منسحب/محروم/غياب) is a deliberate registrar decision and still
    // wins; annual rows reach the marks rule only when no code was recorded (the normal case).
    // !e.gradeStatusCode is what makes the sentence above true: classify() also returns 'ungraded'
    // for codes that WERE deliberately recorded (NP, or a code whose GradeStatus row is missing),
    // and a registrar's explicit decision must never be overwritten by the marks rule.
    if (bands && outcome === 'ungraded' && !e.gradeStatusCode && e.student?.program?.academicSystem === 'ANNUAL') {
      const pct = courseTotalPct({ courseId: e.courseId, midterm: e.midterm, final: e.final, practical: e.practical, homework: e.homework, graceMarks: e.graceMarks, excludedComponents: e.excludedComponents, attemptNo: e.attemptNo, course }, { reg });
      if (pct != null) {
        outcome = pct >= annualPassPct ? 'pass' : 'fail';
        // annual has no GradeStatus row, so the تقدير band is the only grade these columns can show.
        statusCode = gradeFromBands(pct, bands);
        statusName = statusCode;
      }
    }
    counts[outcome] += 1;
    return {
      studentCode: e.student.studentCode,
      name: e.student.nameAr,
      level: e.student.level,
      statusCode,
      statusName,
      points: e.points,
      outcome,
    };
  });

  const graded = counts.pass + counts.fail;
  return {
    course: { code: course.code, name: course.nameAr, department: course.department?.nameAr ?? '' },
    rows,
    counts,
    enrolled: rows.length,
    passRate: graded ? Math.round((counts.pass / graded) * 100) : 0,
  };
}

// (2) بيان حالة طالب — a single-student status statement: identity, CGPA, earned vs
// required hours, the standing flags (probation/honor/escalation), the latest-term
// registration status, and any active warnings. Reuses computeAcademicStanding so the
// numbers match the dashboard exactly.
export async function studentStatus(studentCode: string) {
  const student = await prisma.student.findUnique({
    where: { studentCode },
    select: {
      id: true,
      studentCode: true,
      nameAr: true,
      level: true,
      status: true,
      department: { select: { nameAr: true } },
      program: { select: { nameAr: true, years: true, totalCreditHours: true } },
    },
  });
  if (!student) return { error: 'الطالب غير موجود' };

  const [standing, reg, warnings, lastReg] = await Promise.all([
    computeAcademicStanding(student.id),
    getRegulations(),
    prisma.studentWarning.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      orderBy: { issuedAt: 'desc' },
      select: { type: true, reason: true, gpa: true, issuedAt: true },
    }),
    prisma.registrationRequest.findFirst({
      where: { studentId: student.id },
      orderBy: [{ academicYear: 'desc' }, { semester: 'desc' }],
      select: { academicYear: true, semester: true, status: true },
    }),
  ]);

  // required hours: prefer the program's own total, else the bylaw graduation hours
  const requiredHours = student.program?.totalCreditHours && student.program.totalCreditHours > 0
    ? student.program.totalCreditHours
    : reg.graduationHours;

  return {
    student: {
      studentCode: student.studentCode,
      name: student.nameAr,
      level: student.level,
      status: student.status,
      department: student.department?.nameAr ?? '',
      program: student.program?.nameAr ?? '',
    },
    standing: standing
      ? {
          cgpa: standing.cgpa,
          earnedHours: standing.earnedHours,
          requiredHours,
          remainingHours: Math.max(0, requiredHours - standing.earnedHours),
          onProbation: standing.onProbation,
          escalation: standing.escalation,
          termHonor: standing.termHonor,
          cumulativeHonor: standing.cumulativeHonor,
          graduationEligible: standing.graduationEligible,
          flags: standing.flags,
        }
      : null,
    registration: lastReg ? { academicYear: lastReg.academicYear, semester: lastReg.semester, status: lastReg.status } : null,
    warnings: warnings.map((w) => ({ type: w.type, reason: w.reason, gpa: w.gpa, issuedAt: w.issuedAt })),
  };
}

// (3) كشوف الوزارة — three distinct exam-board sheets, selected by `stage`:
//   transitional → students NOT in the final level (currentLevel < program years)
//   final        → final-level / graduation-eligible candidates
//   deprived      → المحرومون/الغائبون: students whose term enrollments carry a
//                   deprivation/absence status (DN/NE/E/ABS/AB). These are independent of
//                   level — a student denied entry to the exam is listed regardless.
export type MinistryStage = 'transitional' | 'final' | 'deprived';
// DN/NE/E (legacy) + ABS/AB (ClientR2 canonical synonyms) — the deprived/absent exam-board set.
const DEPRIVED_CODES = new Set(['DN', 'NE', 'E', 'ABS', 'AB']);
const PROGRAM_YEARS_FALLBACK = 4;

export async function ministrySheet(stage: MinistryStage, f: TermFilter) {
  const students = await prisma.student.findMany({
    where: { status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] } },
    select: {
      id: true,
      studentCode: true,
      nameAr: true,
      level: true,
      department: { select: { nameAr: true } },
      program: { select: { years: true } },
    },
    orderBy: { studentCode: 'asc' },
  });

  if (stage === 'deprived') {
    // students with any DN/NE/E enrollment in the selected term — list the courses
    const deprivedEnr = await prisma.enrollment.findMany({
      where: { ...termWhere(f), gradeStatusCode: { in: [...DEPRIVED_CODES] } },
      include: { course: { select: { code: true, nameAr: true } }, student: { select: { id: true, studentCode: true, nameAr: true, level: true, department: { select: { nameAr: true } } } } },
      orderBy: { student: { studentCode: 'asc' } },
    });
    const byStudent = new Map<string, { studentCode: string; name: string; level: number; department: string; courses: { code: string; name: string; statusCode: string }[] }>();
    for (const e of deprivedEnr) {
      const row = byStudent.get(e.student.id) ?? {
        studentCode: e.student.studentCode,
        name: e.student.nameAr,
        level: e.student.level,
        department: e.student.department?.nameAr ?? '',
        courses: [],
      };
      row.courses.push({ code: e.course.code, name: e.course.nameAr, statusCode: e.gradeStatusCode as string });
      byStudent.set(e.student.id, row);
    }
    const rows = [...byStudent.values()];
    return { stage, rows, count: rows.length };
  }

  // transitional / final → driven by the standing engine (level + graduation)
  const standings = await computeStandingForStudents(students.map((s) => s.id));
  const rows = students
    .map((s) => ({ s, st: standings.get(s.id)! }))
    .filter(({ s, st }) => {
      if (!st) return false;
      const finalLevel = s.program?.years ?? PROGRAM_YEARS_FALLBACK;
      const isFinal = st.currentLevel >= finalLevel || st.graduationEligible;
      return stage === 'final' ? isFinal : !isFinal;
    })
    .map(({ s, st }) => ({
      studentCode: s.studentCode,
      name: s.nameAr,
      department: s.department?.nameAr ?? '',
      level: st.currentLevel,
      cgpa: st.cgpa,
      earnedHours: st.earnedHours,
      graduationEligible: st.graduationEligible,
    }));
  return { stage, rows, count: rows.length };
}

// (4) إحصائيات النجاح — institute-wide pass-rate summary for the term, plus a
// breakdown by level and by department. Pass/fail are course-attempt outcomes
// (same classify() rule), so a student appears once per registered course.
// `system` is optional so every existing caller keeps the institute-wide numbers;
// when supplied the whole aggregation (overall + level + department) narrows with it.
// ANNUAL is additionally classified from the raw marks — see the branch below.
export async function successStats(f: TermFilter, system?: AcademicSystem) {
  const [enrollments, statuses] = await Promise.all([
    prisma.enrollment.findMany({
      // studentSystemWhere → `{}` with no system, so the term scope stays byte-identical.
      // Its OR sits under `student`, never beside termWhere's keys, so spreading is safe.
      where: { ...termWhere(f), ...studentSystemWhere(system) },
      include: {
        student: { select: { level: true, department: { select: { nameAr: true } }, program: { select: { academicSystem: true } } } },
      },
    }),
    prisma.gradeStatus.findMany(),
  ]);
  const byCode = new Map(statuses.map((s) => [s.code, s]));

  // ── Dual-system: ANNUAL rows carry no grade code ──────────────────────────
  // lib/gpa.ts stores raw marks only for ANNUAL students (gradeStatusCode/letterGrade/points stay
  // null by design), so classify() alone buckets every annual attempt as "ungraded": the report
  // stated a confident 0% under «النظام السنوي», and in the mixed «كل الأنظمة» view the annual half
  // silently vanished from the pass rate. The outcome is therefore resolved per row from the
  // STUDENT'S OWN system — never from the viewer's selection — with the very rule lib/annual.ts
  // applies (courseTotalPct ≥ annualPassPercent, رأفة grace included). A credit-hours row never
  // enters that branch, so its classification is unchanged.
  let annualOutcome: ((e: (typeof enrollments)[number]) => StatusClass) | null = null;
  if (enrollments.some((e) => e.student?.program?.academicSystem === 'ANNUAL')) {
    const [courses, reg] = await Promise.all([
      prisma.course.findMany({
        where: { id: { in: [...new Set(enrollments.map((e) => e.courseId))] } },
        select: { id: true, code: true, nameAr: true, midtermMax: true, finalMax: true, practicalMax: true, homeworkMax: true },
      }),
      getRegulations(),
    ]);
    const courseById = new Map(courses.map((c) => [c.id, c]));
    const passPct = reg.annualPassPercent ?? DEFAULT_REGULATIONS.annualPassPercent;
    annualOutcome = (e) => {
      // an explicit exceptional code (منسحب/محروم/غياب) is a deliberate registrar decision and still
      // wins; annual rows reach the marks rule only when no code at all was recorded — classify()
      // also returns 'ungraded' for codes that WERE recorded (NP, or a code missing from the table).
      const coded = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null);
      if (coded !== 'ungraded' || e.gradeStatusCode) return coded;
      if (e.student?.program?.academicSystem !== 'ANNUAL') return coded;
      const course = courseById.get(e.courseId);
      if (!course) return 'ungraded';
      const pct = courseTotalPct({ courseId: e.courseId, midterm: e.midterm, final: e.final, practical: e.practical, homework: e.homework, graceMarks: e.graceMarks, excludedComponents: e.excludedComponents, attemptNo: e.attemptNo, course }, { reg });
      return pct == null ? 'ungraded' : pct >= passPct ? 'pass' : 'fail';
    };
  }

  type Bucket = { enrolled: number; pass: number; fail: number; withdrawn: number; incomplete: number };
  const fresh = (): Bucket => ({ enrolled: 0, pass: 0, fail: 0, withdrawn: 0, incomplete: 0 });
  const overall = fresh();
  const byLevel = new Map<number, Bucket>();
  const byDept = new Map<string, Bucket>();

  const tally = (b: Bucket, cls: StatusClass) => {
    b.enrolled += 1;
    if (cls === 'pass') b.pass += 1;
    else if (cls === 'fail') b.fail += 1;
    else if (cls === 'withdrawn') b.withdrawn += 1;
    else if (cls === 'incomplete') b.incomplete += 1;
  };

  for (const e of enrollments) {
    const cls = annualOutcome ? annualOutcome(e) : classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null);
    tally(overall, cls);
    const lvl = e.student.level;
    const lb = byLevel.get(lvl) ?? fresh();
    tally(lb, cls);
    byLevel.set(lvl, lb);
    const dept = e.student.department?.nameAr ?? 'غير محدد';
    const db = byDept.get(dept) ?? fresh();
    tally(db, cls);
    byDept.set(dept, db);
  }

  const rate = (b: Bucket) => (b.pass + b.fail ? Math.round((b.pass / (b.pass + b.fail)) * 100) : 0);
  const decorate = <K,>(entries: [K, Bucket][]) => entries.map(([key, b]) => ({ key, ...b, passRate: rate(b) }));

  return {
    overall: { ...overall, passRate: rate(overall) },
    byLevel: decorate([...byLevel.entries()].sort((a, b) => a[0] - b[0])),
    byDepartment: decorate([...byDept.entries()].sort((a, b) => b[1].enrolled - a[1].enrolled)),
  };
}

// ---- ClientR2: reason & action analytics ---------------------------------
// The bylaw wants the control/registrar to slice outcomes by their *reason*
// (Enrollment.reasonCode → CourseResultReason) and to track open follow-ups, e.g.
// "عدد الراسبين بسبب التحريري" vs "بسبب الغياب", or "الإجراءات المفتوحة: Makeup 35".

// Absence/excuse status codes (system + legacy synonyms) for the absence-reasons sheet.
const ABSENCE_CODES = new Set(['AB', 'E', 'ABS', 'NE']);

async function reasonLabels(): Promise<Map<string, { nameAr: string; category: string }>> {
  const reasons = await prisma.courseResultReason.findMany();
  return new Map(reasons.map((r) => [r.code, { nameAr: r.nameAr, category: r.category }]));
}

type ReasonBucket = { code: string; nameAr: string; category: string; count: number };

function tallyReasons(
  enrollments: { reasonCode: string | null }[],
  labels: Map<string, { nameAr: string; category: string }>,
): ReasonBucket[] {
  const counts = new Map<string, number>();
  for (const e of enrollments) {
    const key = e.reasonCode ?? '__none__';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => {
      if (code === '__none__') return { code, nameAr: 'غير محدد', category: 'OTHER', count };
      const meta = labels.get(code);
      return { code, nameAr: meta?.nameAr ?? code, category: meta?.category ?? 'OTHER', count };
    })
    .sort((a, b) => b.count - a.count);
}

// أسباب الرسوب — fail outcomes grouped by their recorded reason (Written/Attendance/Cheating…).
export async function failReasons(f: TermFilter) {
  const [enrollments, statuses, labels] = await Promise.all([
    prisma.enrollment.findMany({ where: termWhere(f), select: { reasonCode: true, gradeStatusCode: true } }),
    prisma.gradeStatus.findMany(),
    reasonLabels(),
  ]);
  const byCode = new Map(statuses.map((s) => [s.code, s]));
  const fails = enrollments.filter((e) => classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null) === 'fail');
  const rows = tallyReasons(fails, labels);
  return { rows, total: fails.length };
}

// أسباب الغياب — excused/unexcused absence statuses grouped by their reason (مرض/حادث/قهري…).
export async function absenceReasons(f: TermFilter) {
  const [enrollments, labels] = await Promise.all([
    prisma.enrollment.findMany({
      where: { ...termWhere(f), gradeStatusCode: { in: [...ABSENCE_CODES] } },
      select: { reasonCode: true, gradeStatusCode: true },
    }),
    reasonLabels(),
  ]);
  const rows = tallyReasons(enrollments, labels);
  return { rows, total: enrollments.length };
}

// الإجراءات المفتوحة — held results awaiting a follow-up (makeup exam / complete assessment),
// grouped by action type, plus the named roster with the bylaw deadline + approval state.
export async function openActions(f: TermFilter) {
  const enrollments = await prisma.enrollment.findMany({
    where: { ...termWhere(f), resultPending: true },
    include: {
      student: { select: { studentCode: true, nameAr: true, department: { select: { nameAr: true } } } },
      course: { select: { code: true, nameAr: true } },
    },
    orderBy: [{ actionDueDate: 'asc' }, { student: { studentCode: 'asc' } }],
  });

  const byAction = new Map<string, number>();
  const rows = enrollments.map((e) => {
    const action = e.actionType ?? 'NONE';
    byAction.set(action, (byAction.get(action) ?? 0) + 1);
    return {
      studentCode: e.student.studentCode,
      name: e.student.nameAr,
      department: e.student.department?.nameAr ?? '',
      course: e.course.nameAr,
      courseCode: e.course.code,
      statusCode: e.gradeStatusCode,
      reasonCode: e.reasonCode,
      actionType: action,
      dueDate: e.actionDueDate,
      approvalState: e.statusApprovalState,
    };
  });

  const summary = [...byAction.entries()].map(([actionType, count]) => ({ actionType, count })).sort((a, b) => b.count - a.count);
  return { rows, summary, total: rows.length };
}
