import prisma from '@/lib/prisma';

// Institute bylaw parameters. Configurable: an admin can override any of these by
// saving a JSON blob under the Setting key "institute.regulations"; unset keys fall
// back to these documented defaults.
export const DEFAULT_REGULATIONS = {
  probationGpa: 2.0, // CGPA below this → academic probation
  probationHourCap: 12, // max registered hours while on probation
  minRegHours: 12, // minimum hours a regular-term registration must total
  maxRegHours: 18, // maximum hours in a regular term
  summerMaxHours: 9, // maximum hours in a summer term
  maxCourseAttempts: 3, // a course failed this many times blocks re-registration (repeated failure)
  maxConsecutiveProbation: 3, // consecutive probation terms → forced track change / dismissal
  maxSeparateProbation: 4, // separate (non-consecutive) probation terms → same (excl. summer)
  honorCgpa: 3.33, // honor roll: CGPA ≥ this …
  honorTermGpa: 3.0, // … or term GPA ≥ this (with all mandatory passed, no fail)
  absenceBanPercent: 25, // absence above this % → forced withdrawal / denied (محروم)
  attendanceWarnThreshold: 75, // attendance at/below this % → warning report
  withdrawWeek: 12, // last week a student may withdraw (W)
  writtenMinPercent: 30, // min % on the written exam; below → board fail (BL) even if total passes
  incompleteCourseworkPercent: 60, // min coursework % to qualify for Incomplete (I/INC)
  // Components a REPEATING student (attemptNo > 1) is exempt from by default, as a CSV of
  // midterm|final|practical|homework. Many bylaws bar a repeater from أعمال السنة and grade them on
  // التحريري + العملي alone, rescaling the course total accordingly. Empty = no exemption, i.e. the
  // behaviour before this setting existed; the control desk can still exempt any single enrolment.
  repeatExemptComponents: '',
  // Does a subject only COUNT towards the annual year result once its result was approved & locked
  // (اعتماد وغلق)? true = the registrar's rule «النتيجة بتظهر بعد الاعتماد» — a subject with marks but
  // no approval leaves the student «قيد الرصد». false = today's behaviour, a subject counts as soon as
  // it has marks, for an institute that publishes before the formal approval step.
  // A subject is JUDGED only after اعتماد وغلق (the registrar's own rule). Ships OFF so the release
  // stays additive: turning it on before every existing enrolment has been approved would silently
  // park whole cohorts at «قيد الرصد», which in turn makes ClientR7 رأفة and promotion return empty
  // candidate lists with no explanation. The institute enables it from the bylaw screen once its
  // recorded results have been approved.
  requireApprovedResult: false,
  makeupDeadlineWeeks: 2, // INC/AB makeup must be completed within N weeks of the next term (الأسبوع الأول/الثاني)
  graduationHours: 132, // total credit hours required to graduate (per program bylaw)
  // minimum EARNED credit hours to be promoted INTO each level
  levelMinHours: { 1: 0, 2: 30, 3: 66, 4: 99 } as Record<string, number>,
  // ---- Traditional/annual system (النظام السنوي) — used only by ANNUAL programs (lib/annual.ts) ----
  annualPassPercent: 50, // per-subject pass threshold (%) = مقبول floor; below → راسب
  maxCarryOverSubjects: 2, // failed subjects ≤ this → له دور ثانٍ (makeup); more → باقٍ للإعادة
  annualExcellentMin: 85, // تقدير ممتاز ≥ this %
  annualVeryGoodMin: 75, // تقدير جيد جداً ≥ this %
  annualGoodMin: 65, // تقدير جيد ≥ this % (جيد جداً/ممتاز above; مقبول down to annualPassPercent)
};
export type Regulations = typeof DEFAULT_REGULATIONS;
export const REGULATIONS_KEY = 'institute.regulations';

export async function getRegulations(): Promise<Regulations> {
  const row = await prisma.setting.findFirst({ where: { key: REGULATIONS_KEY } });
  if (!row) return DEFAULT_REGULATIONS;
  try {
    const parsed = JSON.parse(row.value);
    const merged = { ...DEFAULT_REGULATIONS, ...parsed, levelMinHours: { ...DEFAULT_REGULATIONS.levelMinHours, ...(parsed.levelMinHours || {}) } };
    // A saved bylaw that exempts EVERY component would leave a repeater with a denominator of zero —
    // scored 0% and stored as a fail on the credit path, stuck at «قيد الرصد» on the annual one. The
    // per-enrolment path is guarded at its API; this guards the bylaw path, wherever it was saved from.
    const exempt = String(merged.repeatExemptComponents ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    if (exempt.length >= 4) merged.repeatExemptComponents = DEFAULT_REGULATIONS.repeatExemptComponents;
    return merged;
  } catch {
    return DEFAULT_REGULATIONS;
  }
}
