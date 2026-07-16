import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';

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
};

type EnrollmentWithCourse = {
  courseId: string;
  midterm: number | null; final: number | null; practical: number | null; homework: number | null;
  course: { code: string; nameAr: string; midtermMax: number; finalMax: number; practicalMax: number; homeworkMax: number };
};

/** Subject total percentage from recorded components (null when nothing is recorded yet). */
export function courseTotalPct(e: EnrollmentWithCourse): number | null {
  const max = e.course.midtermMax + e.course.finalMax + e.course.practicalMax + e.course.homeworkMax;
  const comps: (number | null)[] = [e.midterm, e.final, e.practical, e.homework];
  if (max <= 0 || !comps.some((v) => v != null)) return null;
  const got = comps.reduce<number>((s, v) => s + (v ?? 0), 0);
  return Math.round(((got / max) * 100) * 10) / 10;
}

type TermFilter = { academicYear?: string; semester?: string };

/** Compute the annual result for a set of students (one academic year / cohort). Batch: one regs read. */
export async function computeAnnualForStudents(studentIds: string[], f: TermFilter = {}): Promise<Map<string, AnnualStudentResult>> {
  const out = new Map<string, AnnualStudentResult>();
  if (!studentIds.length) return out;
  const reg = await getRegulations();
  const passPct = reg.annualPassPercent ?? 50;
  const maxCarry = reg.maxCarryOverSubjects ?? 2;
  const bands = bandsFromRegulations(reg);

  const [students, enrollments] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, studentCode: true, nameAr: true, level: true } }),
    prisma.enrollment.findMany({
      where: { studentId: { in: studentIds }, ...(f.academicYear ? { academicYear: f.academicYear } : {}), ...(f.semester ? { semester: f.semester } : {}) },
      select: { studentId: true, courseId: true, midterm: true, final: true, practical: true, homework: true, course: { select: { code: true, nameAr: true, midtermMax: true, finalMax: true, practicalMax: true, homeworkMax: true } } },
    }),
  ]);

  const byStudent = new Map<string, EnrollmentWithCourse[]>();
  for (const e of enrollments) (byStudent.get(e.studentId) ?? byStudent.set(e.studentId, []).get(e.studentId)!).push(e);

  for (const s of students) {
    const es = byStudent.get(s.id) ?? [];
    const courses: AnnualCourseResult[] = es.map((e) => {
      const total = courseTotalPct(e);
      const graded = total != null;
      const passed = graded && total! >= passPct;
      return {
        courseId: e.courseId, code: e.course.code, name: e.course.nameAr, total, grade: graded ? gradeFromBands(total!, bands) : null, passed, graded,
        midterm: e.midterm, final: e.final, practical: e.practical, homework: e.homework,
        midtermMax: e.course.midtermMax, finalMax: e.course.finalMax, practicalMax: e.course.practicalMax, homeworkMax: e.course.homeworkMax,
      };
    });
    // aggregate percentage over graded subjects (Σ marks% ÷ n) — simple mean of subject percentages
    const gradedCourses = courses.filter((c) => c.graded);
    const overallPct = gradedCourses.length ? Math.round((gradedCourses.reduce((sum, c) => sum + (c.total ?? 0), 0) / gradedCourses.length) * 10) / 10 : null;
    const failed = courses.filter((c) => c.graded && !c.passed);
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
    });
  }
  return out;
}

/** Convenience: annual result for a single student. */
export async function computeAnnualResult(studentId: string, f: TermFilter = {}): Promise<AnnualStudentResult | null> {
  const m = await computeAnnualForStudents([studentId], f);
  return m.get(studentId) ?? null;
}
