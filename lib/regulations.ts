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
  makeupDeadlineWeeks: 2, // INC/AB makeup must be completed within N weeks of the next term (الأسبوع الأول/الثاني)
  graduationHours: 132, // total credit hours required to graduate (per program bylaw)
  // minimum EARNED credit hours to be promoted INTO each level
  levelMinHours: { 1: 0, 2: 30, 3: 66, 4: 99 } as Record<string, number>,
};
export type Regulations = typeof DEFAULT_REGULATIONS;
export const REGULATIONS_KEY = 'institute.regulations';

export async function getRegulations(): Promise<Regulations> {
  const row = await prisma.setting.findFirst({ where: { key: REGULATIONS_KEY } });
  if (!row) return DEFAULT_REGULATIONS;
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_REGULATIONS, ...parsed, levelMinHours: { ...DEFAULT_REGULATIONS.levelMinHours, ...(parsed.levelMinHours || {}) } };
  } catch {
    return DEFAULT_REGULATIONS;
  }
}
