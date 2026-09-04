import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';
import { resolveApplicableComponents, COMPONENT_LABELS_AR, type ComponentKey } from '@/lib/grade-components';

/**
 * Traditional/annual grading engine (Dual-system Phase 2) — the parallel to lib/gpa.ts + lib/standing.ts
 * for ANNUAL programs (النظام السنوي/العادي). Computes results from the SAME Enrollment mark fields
 * (midterm/final/practical/homework) as the credit-hour system, but with **percentage تقدير and NO
 * GPA/points**, and **year-based** progression:
 *   - per subject: total% = Σ(components) ÷ Σ(maxes) × 100 → pass if ≥ annualPassPercent, تقدير by band.
 *   - per year (فرقة): منقول (0 fails) · له دور ثانٍ (fails ≤ maxCarryOverSubjects) · باقٍ للإعادة (more).
 *   - overall year تقدير from the aggregate percentage.
 * Credit-hour programs never call this. `Student.level` IS the فرقة number.
 */
export type AnnualGrade = 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'راسب';

export type AnnualBand = { min: number; label: AnnualGrade };

// Default Egyptian bands (used when the bylaw values are unset).
export const DEFAULT_ANNUAL_BANDS: AnnualBand[] = [
  { min: 85, label: 'ممتاز' },
  { min: 75, label: 'جيد جداً' },
  { min: 65, label: 'جيد' },
  { min: 50, label: 'مقبول' },
  { min: 0, label: 'راسب' },
];

// Build the تقدير band table from the (configurable) bylaw thresholds. مقبول floor = pass threshold.
export function bandsFromRegulations(reg: { annualExcellentMin?: number; annualVeryGoodMin?: number; annualGoodMin?: number; annualPassPercent?: number }): AnnualBand[] {
  return [
    { min: reg.annualExcellentMin ?? 85, label: 'ممتاز' },
    { min: reg.annualVeryGoodMin ?? 75, label: 'جيد جداً' },
    { min: reg.annualGoodMin ?? 65, label: 'جيد' },
    { min: reg.annualPassPercent ?? 50, label: 'مقبول' },
    { min: 0, label: 'راسب' },
  ];
}

export function gradeFromBands(pct: number, bands: AnnualBand[]): AnnualGrade {
  for (const b of bands) if (pct >= b.min) return b.label;
  return 'راسب';
}

/** Grade using default bands (callers with regulations loaded should use bandsFromRegulations). */
export function annualGrade(pct: number): AnnualGrade {
  return gradeFromBands(pct, DEFAULT_ANNUAL_BANDS);
}

/** The configured تقدير band table (reads regulations) — used by the annual report legends. */
export async function getAnnualBands(): Promise<AnnualBand[]> {
  return bandsFromRegulations(await getRegulations());
}

export type AnnualCourseResult = {
  courseId: string; code: string; name: string; total: number | null; grade: AnnualGrade | null; passed: boolean; graded: boolean;
  graceMarks: number; // ClientR7 — رأفة grace applied to this course (0 if none)
  maxTotal: number; // effective denominator = Σ maxes of the components that apply to THIS student
  excludedComponents: ComponentKey[]; // components this student was exempt from (usually طالب عايد)
  resultLocked: boolean; // approved & locked (اعتماد وغلق) — a subject is only judged once true
  // raw component marks + their maxes — drive the ministry sheet's per-course sub-columns (التقسيمة الداخلية)
  midterm: number | null; final: number | null; practical: number | null; homework: number | null;
  midtermMax: number; finalMax: number; practicalMax: number; homeworkMax: number;
};
export type AnnualResultStatus = 'منقول' | 'له دور ثانٍ' | 'باقٍ للإعادة' | 'قيد الرصد';
export type AnnualStudentResult = {
  studentId: string;
  studentCode: string;
  name: string;
  yearGroup: number; // فرقة (= Student.level)
  courses: AnnualCourseResult[];
  overallPct: number | null;
  overallGrade: AnnualGrade | null;
  failedCount: number;
  failedCourses: string[]; // course codes
  result: AnnualResultStatus;
  // How many of the student's subjects HAVE marks but are still awaiting اعتماد وغلق. This is the
  // reason «قيد الرصد» is showing when the approval gate is on, and every surface that prints the
  // status should print the reason with it — otherwise a whole un-approved cohort looks like a bug.
  pendingApprovalCount: number;
  // true when the approval gate (Regulations.requireApprovedResult) was in force for this run.
  approvalGateOn: boolean;
};

/**
 * «قيد الرصد» with its reason attached — «قيد الرصد (بانتظار اعتماد ٤ مواد)». Any other status is
 * returned unchanged, so a caller can render this in place of `result` unconditionally.
 */
export function annualStatusLabel(r: { result: AnnualResultStatus; pendingApprovalCount?: number }): string {
  if (r.result !== 'قيد الرصد' || !r.pendingApprovalCount) return r.result;
  return `قيد الرصد (بانتظار اعتماد ${r.pendingApprovalCount} ${r.pendingApprovalCount === 1 ? 'مادة' : r.pendingApprovalCount === 2 ? 'مادتين' : 'مواد'})`;
}

type EnrollmentWithCourse = {
  courseId: string;
  midterm: number | null; final: number | null; practical: number | null; homework: number | null;
  graceMarks?: number | null; // ClientR7 — رأفة grace
  // Components this student is exempt from in this course (CSV) + which attempt this is; both
  // optional, so a caller that doesn't select them gets the pre-exemption behaviour unchanged.
  excludedComponents?: string | null;
  attemptNo?: number | null;
  // true once the result was approved & locked (اعتماد وغلق) — a subject is only JUDGED after that.
  resultLocked?: boolean | null;
  course: { code: string; nameAr: string; midtermMax: number; finalMax: number; practicalMax: number; homeworkMax: number };
};

/**
 * Subject total percentage from recorded components (null when nothing recorded). Adds رأفة grace
 * unless ignoreGrace. Both the numerator AND the denominator cover only the components that apply
 * to this student (a repeater barred from أعمال السنة is measured out of 70, not 100 — otherwise
 * مقبول is unreachable for him). `reg` carries the bylaw default; omit it and only an explicit
 * per-enrolment exemption applies.
 */
export function courseTotalPct(
  e: EnrollmentWithCourse,
  opts?: { ignoreGrace?: boolean; reg?: { repeatExemptComponents?: string | null } | null },
): number | null {
  // This engine only ever runs for ANNUAL students, so the bylaw's repeat exemption — which is an
  // annual-system rule — is in force here by construction.
  const app = resolveApplicableComponents({ ...e, academicSystem: 'ANNUAL' }, e.course, opts?.reg);
  const max = app.maxTotal;
  const comps: (number | null)[] = app.countedKeys.map((k) => e[k]);
  if (max <= 0 || !comps.some((v) => v != null)) return null;
  const grace = opts?.ignoreGrace ? 0 : (e.graceMarks ?? 0);
  const got = comps.reduce<number>((s, v) => s + (v ?? 0), 0) + grace;
  return Math.round(((got / max) * 100) * 10) / 10;
}

/** The applicable components + effective denominator for one enrolment (UI/report helper). */
export function courseApplicable(e: EnrollmentWithCourse, reg?: { repeatExemptComponents?: string | null } | null) {
  return resolveApplicableComponents({ ...e, academicSystem: 'ANNUAL' }, e.course, reg);
}

export { COMPONENT_LABELS_AR, type ComponentKey };

type TermFilter = { academicYear?: string; semester?: string };

/** Compute the annual result for a set of students (one academic year / cohort). Batch: one regs read. */
export async function computeAnnualForStudents(studentIds: string[], f: TermFilter = {}, opts: { ignoreGrace?: boolean; applyApprovedImprovement?: boolean } = {}): Promise<Map<string, AnnualStudentResult>> {
  const out = new Map<string, AnnualStudentResult>();
  if (!studentIds.length) return out;
  const reg = await getRegulations();
  const passPct = reg.annualPassPercent ?? 50;
  const maxCarry = reg.maxCarryOverSubjects ?? 2;
  const bands = bandsFromRegulations(reg);
  // Bylaw-configurable, and ships OFF: a subject is JUDGED only after اعتماد وغلق when the institute
  // turns it on. Defaulting it ON would park every un-approved cohort at «قيد الرصد» the moment this
  // deploys, and رأفة/promotion read that state as "nothing to do" — an empty screen with no reason.
  const requireApproved = reg.requireApprovedResult === true;

  const [students, enrollments] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, studentCode: true, nameAr: true, level: true } }),
    prisma.enrollment.findMany({
      where: { studentId: { in: studentIds }, ...(f.academicYear ? { academicYear: f.academicYear } : {}), ...(f.semester ? { semester: f.semester } : {}) },
      select: { studentId: true, courseId: true, midterm: true, final: true, practical: true, homework: true, graceMarks: true, excludedComponents: true, attemptNo: true, resultLocked: true, course: { select: { code: true, nameAr: true, midtermMax: true, finalMax: true, practicalMax: true, homeworkMax: true } } },
    }),
  ]);

  const byStudent = new Map<string, EnrollmentWithCourse[]>();
  for (const e of enrollments) (byStudent.get(e.studentId) ?? byStudent.set(e.studentId, []).get(e.studentId)!).push(e);

  for (const s of students) {
    const es = byStudent.get(s.id) ?? [];
    const courses: AnnualCourseResult[] = es.map((e) => {
      const app = resolveApplicableComponents({ ...e, academicSystem: 'ANNUAL' }, e.course, reg);
      const total = courseTotalPct(e, { ignoreGrace: opts.ignoreGrace, reg });
      // The registrar's own rule: «نتيجة المادة فعلا بتظهر بعد الاعتماد وغلق المادة». A subject is
      // JUDGED only once its result is approved and locked; half-entered marks must leave the
      // student «قيد الرصد» rather than flip a whole cohort into «باقٍ للإعادة» mid-year. Bylaw-
      // configurable (requireApprovedResult) for an institute that publishes before the approval
      // step; pendingApprovalCount below carries the REASON out so no screen shows a bare «قيد الرصد».
      const graded = total != null && (!requireApproved || e.resultLocked === true);
      const passed = graded && total! >= passPct;
      return {
        courseId: e.courseId, code: e.course.code, name: e.course.nameAr, total, grade: graded ? gradeFromBands(total!, bands) : null, passed, graded,
        graceMarks: opts.ignoreGrace ? 0 : (e.graceMarks ?? 0),
        maxTotal: app.maxTotal,
        excludedComponents: app.excludedKeys,
        resultLocked: e.resultLocked === true,
        midterm: e.midterm, final: e.final, practical: e.practical, homework: e.homework,
        midtermMax: e.course.midtermMax, finalMax: e.course.finalMax, practicalMax: e.course.practicalMax, homeworkMax: e.course.homeworkMax,
      };
    });
    // aggregate percentage over graded subjects (Σ marks% ÷ n) — simple mean of subject percentages
    const gradedCourses = courses.filter((c) => c.graded);
    const overallPct = gradedCourses.length ? Math.round((gradedCourses.reduce((sum, c) => sum + (c.total ?? 0), 0) / gradedCourses.length) * 10) / 10 : null;
    const failed = courses.filter((c) => c.graded && !c.passed);
    // subjects that WOULD be judged but are held back by the approval gate — the reason for قيد الرصد
    const pendingApprovalCount = requireApproved ? courses.filter((c) => c.total != null && !c.resultLocked).length : 0;
    const allGraded = courses.length > 0 && courses.every((c) => c.graded);
    let result: AnnualResultStatus;
    if (!allGraded) result = 'قيد الرصد';
    else if (failed.length === 0) result = 'منقول';
    else if (failed.length <= maxCarry) result = 'له دور ثانٍ';
    else result = 'باقٍ للإعادة';
    out.set(s.id, {
      studentId: s.id, studentCode: s.studentCode, name: s.nameAr, yearGroup: s.level,
      courses, overallPct, overallGrade: overallPct != null ? gradeFromBands(overallPct, bands) : null,
      failedCount: failed.length, failedCourses: failed.map((c) => c.code), result,
      pendingApprovalCount, approvalGateOn: requireApproved,
    });
  }
  // ClientR7 — overlay an approved رفع التقدير (band override) onto the final grade.
  if (opts.applyApprovedImprovement && f.academicYear) {
    const items = await prisma.gradeAdjustmentItem.findMany({
      where: { studentId: { in: studentIds }, toGrade: { not: null }, batch: { status: 'APPROVED', academicYear: f.academicYear } },
      select: { studentId: true, toGrade: true },
    });
    for (const it of items) {
      const r = out.get(it.studentId);
      if (r && it.toGrade) r.overallGrade = it.toGrade as AnnualGrade;
    }
  }
  return out;
}

/** Convenience: annual result for a single student. */
export async function computeAnnualResult(studentId: string, f: TermFilter = {}): Promise<AnnualStudentResult | null> {
  const m = await computeAnnualForStudents([studentId], f);
  return m.get(studentId) ?? null;
}
