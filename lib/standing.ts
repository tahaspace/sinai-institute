import prisma from '@/lib/prisma';
import { getRegulations, type Regulations } from '@/lib/regulations';

// Academic-standing engine — the bylaw layer on top of the GPA engine. It walks a
// student's terms in chronological order, tracks the *running* CGPA after each regular
// term, and derives probation/warning escalation, honor roll, level promotion and
// graduation eligibility. Every threshold comes from the configurable regulations.

const SEM_RANK: Record<string, number> = { first: 1, second: 2, summer: 3 };
const isSummer = (sem: string) => sem.toLowerCase().includes('summer') || sem === 'صيفي';

// Fallback "last level" when a student has no program attached (Program.years is the
// source of truth). The bylaw caps the undergraduate track at 4 academic years.
const FALLBACK_MAX_LEVEL = 4;

function termSortKey(academicYear: string, semester: string): number {
  const startYear = parseInt(academicYear.split('-')[0], 10) || 0;
  return startYear * 10 + (SEM_RANK[semester] ?? 9);
}

export type AcademicStanding = {
  studentId: string;
  cgpa: number;
  gpaHours: number;
  earnedHours: number;
  // probation / warnings
  onProbation: boolean;
  hourCap: number | null; // registration cap while on probation
  probationTermsTotal: number; // separate regular terms spent on probation
  probationConsecutive: number; // longest consecutive run of probation terms
  escalation: 'none' | 'warning' | 'track-change-or-dismissal';
  // honor roll
  termHonor: boolean;
  cumulativeHonor: boolean;
  // level promotion
  currentLevel: number;
  qualifiedLevel: number;
  canPromote: boolean;
  // graduation
  graduationEligible: boolean;
  graduationHours: number; // per-program requirement (or reg default) used for this student
  remainingHours: number;
  passedGraduationProject: boolean; // مشروع التخرج passed?
  atLastLevel: boolean; // reached the program's final academic year?
  failedMandatory: { code: string; name: string }[];
  // ClientR2: courses failed ≥ maxCourseAttempts times — the bylaw's repeated-failure
  // trigger (إنذار/حرمان من التسجيل/فصل). Surfaced for the standing UI + control reports.
  repeatedFailure: { code: string; name: string; fails: number }[];
  // human-readable Arabic flags (UI badges / report lines)
  flags: string[];
};

type Loaded = {
  student: {
    id: string;
    level: number;
    // Program context — drives the per-program graduation hour requirement and the
    // "last level" gate. Both null when the student has no Program attached.
    programYears: number | null;
    programTotalCreditHours: number | null;
  };
  enrollments: {
    courseId: string;
    academicYear: string;
    semester: string;
    creditHours: number;
    countsInGpa: boolean;
    requirementType: string;
    code: string;
    nameAr: string;
    isGraduationProject: boolean;
    points: number | null;
    affectsGpa: boolean;
    isPass: boolean;
  }[];
};

async function load(studentId: string): Promise<Loaded | null> {
  const [student, rows, statuses] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, level: true, program: { select: { years: true, totalCreditHours: true } } },
    }),
    prisma.enrollment.findMany({ where: { studentId }, include: { course: true } }),
    prisma.gradeStatus.findMany(),
  ]);
  if (!student) return null;
  const byCode = new Map(statuses.map((s) => [s.code, s]));
  return {
    student: {
      id: student.id,
      level: student.level,
      programYears: student.program?.years ?? null,
      // Program.totalCreditHours defaults to 0 in schema; treat 0 as "unset" so we
      // fall back to the regulation default rather than letting everyone graduate.
      programTotalCreditHours: student.program && student.program.totalCreditHours > 0
        ? student.program.totalCreditHours
        : null,
    },
    enrollments: rows.map((e) => {
      const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : undefined;
      return {
        courseId: e.courseId,
        academicYear: e.academicYear,
        semester: e.semester,
        creditHours: e.course.creditHours,
        countsInGpa: e.course.countsInGpa,
        requirementType: e.course.requirementType,
        code: e.course.code,
        nameAr: e.course.nameAr,
        isGraduationProject: e.course.isGraduationProject,
        points: st?.points ?? null,
        affectsGpa: st?.affectsGpa ?? false,
        isPass: st?.isPass ?? false,
      };
    }),
  };
}

export function deriveStanding(data: Loaded, reg: Regulations): AcademicStanding {
  const { student, enrollments } = data;

  // ---- term aggregation (GPA-affecting components only) ----
  const terms = new Map<number, { qp: number; hours: number; summer: boolean; hasFail: boolean; gpaHours: number }>();
  let cgpaQp = 0;
  let cgpaHours = 0;
  let earnedHours = 0;

  for (const e of enrollments) {
    if (e.isPass) earnedHours += e.creditHours;
    const counts = e.affectsGpa && e.countsInGpa && e.points != null;
    const key = termSortKey(e.academicYear, e.semester);
    const t = terms.get(key) ?? { qp: 0, hours: 0, summer: isSummer(e.semester), hasFail: false, gpaHours: 0 };
    if (counts) {
      t.qp += (e.points as number) * e.creditHours;
      t.hours += e.creditHours;
      cgpaQp += (e.points as number) * e.creditHours;
      cgpaHours += e.creditHours;
      if (e.points === 0) t.hasFail = true;
    }
    terms.set(key, t);
  }

  const cgpa = cgpaHours > 0 ? Math.round((cgpaQp / cgpaHours) * 100) / 100 : 0;

  // ---- running CGPA per regular term → probation sequence ----
  const orderedKeys = [...terms.keys()].sort((a, b) => a - b);
  let runQp = 0;
  let runHours = 0;
  let probationTotal = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  for (const k of orderedKeys) {
    const t = terms.get(k)!;
    runQp += t.qp;
    runHours += t.hours;
    if (t.summer) continue; // summer terms do not count toward the probation sequence
    const runningCgpa = runHours > 0 ? runQp / runHours : 0;
    if (runHours > 0 && runningCgpa < reg.probationGpa) {
      probationTotal += 1;
      consecutive += 1;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }

  const onProbation = cgpaHours > 0 && cgpa < reg.probationGpa;
  let escalation: AcademicStanding['escalation'] = 'none';
  if (maxConsecutive >= reg.maxConsecutiveProbation || probationTotal >= reg.maxSeparateProbation) {
    escalation = 'track-change-or-dismissal';
  } else if (onProbation) {
    escalation = 'warning';
  }

  // ---- honor roll ----
  // latest regular term
  const latestRegularKey = [...orderedKeys].reverse().find((k) => !terms.get(k)!.summer);
  const latestTerm = latestRegularKey != null ? terms.get(latestRegularKey)! : null;
  const latestTermGpa = latestTerm && latestTerm.hours > 0 ? latestTerm.qp / latestTerm.hours : 0;

  // per-course best outcome: passed if any attempt passed; track failed mandatory
  const passedCourse = new Set<string>();
  const mandatoryCourses = new Map<string, { code: string; name: string }>();
  // مشروع التخرج — graduation is gated on a PASSED graduation-project course, so we
  // only need to know whether at least one such course was actually passed.
  let passedGraduationProject = false;
  for (const e of enrollments) {
    if (e.requirementType === 'mandatory') mandatoryCourses.set(e.courseId, { code: e.code, name: e.nameAr });
    if (e.isPass) {
      passedCourse.add(e.courseId);
      if (e.isGraduationProject) passedGraduationProject = true;
    }
  }
  const failedMandatory = [...mandatoryCourses.entries()]
    .filter(([id]) => !passedCourse.has(id))
    .map(([, v]) => v);

  // ---- repeated failure (attempt rule) ----
  // Count graded, non-pass, GPA-affecting outcomes per course (same "fail" definition as
  // lib/registration.ts) and flag any course at/over the bylaw attempt ceiling. A course
  // later passed is cleared (the retake succeeded), matching the registration block.
  const failCountByCourse = new Map<string, { code: string; name: string; fails: number }>();
  for (const e of enrollments) {
    const isFail = !e.isPass && e.affectsGpa && e.points != null;
    if (!isFail) continue;
    const row = failCountByCourse.get(e.courseId) ?? { code: e.code, name: e.nameAr, fails: 0 };
    row.fails += 1;
    failCountByCourse.set(e.courseId, row);
  }
  const repeatedFailure = [...failCountByCourse.entries()]
    .filter(([id, v]) => !passedCourse.has(id) && v.fails >= reg.maxCourseAttempts)
    .map(([, v]) => v);

  const allMandatoryPassed = failedMandatory.length === 0 && mandatoryCourses.size > 0;
  const termHonor = !!latestTerm && !latestTerm.hasFail && latestTermGpa >= reg.honorTermGpa;
  const cumulativeHonor = cgpaHours > 0 && cgpa >= reg.honorCgpa && allMandatoryPassed;

  // ---- level promotion (by earned hours) ----
  const levelEntries = Object.entries(reg.levelMinHours)
    .map(([lvl, min]) => ({ lvl: parseInt(lvl, 10), min }))
    .sort((a, b) => a.lvl - b.lvl);
  let qualifiedLevel = student.level;
  for (const { lvl, min } of levelEntries) {
    if (earnedHours >= min) qualifiedLevel = Math.max(qualifiedLevel, lvl);
  }
  const canPromote = qualifiedLevel > student.level;

  // ---- graduation ----
  // Per-program credit-hour requirement wins over the institute-wide default
  // (e.g. a 130 CH program vs a 160 CH program); fall back to reg.graduationHours.
  const graduationHours = student.programTotalCreditHours ?? reg.graduationHours;
  // "Last level": the student must have reached the final academic year of the
  // program (Program.years) — fall back to the bylaw max when there's no program.
  const lastLevel = student.programYears ?? FALLBACK_MAX_LEVEL;
  const atLastLevel = student.level >= lastLevel;
  const remainingHours = Math.max(0, graduationHours - earnedHours);
  const graduationEligible =
    earnedHours >= graduationHours &&
    failedMandatory.length === 0 &&
    passedGraduationProject && // مشروع التخرج must be passed
    atLastLevel;

  // ---- Arabic flags ----
  const flags: string[] = [];
  if (escalation === 'track-change-or-dismissal') flags.push('إنذار نهائي: تحويل مسار أو فصل');
  else if (escalation === 'warning') flags.push(`إنذار أكاديمي (المعدل ${cgpa.toFixed(2)} < ${reg.probationGpa})`);
  if (repeatedFailure.length) flags.push(`رسوب متكرر (${reg.maxCourseAttempts}+ مرات): ${repeatedFailure.map((r) => r.code).join('، ')}`);
  if (onProbation) flags.push(`تحت الملاحظة — الحد الأقصى للتسجيل ${reg.probationHourCap} ساعة`);
  if (cumulativeHonor) flags.push('قائمة الشرف (تراكمي)');
  if (termHonor) flags.push('قائمة الشرف (فصلي)');
  if (canPromote) flags.push(`مؤهل للترقية إلى المستوى ${qualifiedLevel}`);
  if (graduationEligible) flags.push('مستوفٍ لشروط التخرج');
  else if (earnedHours > 0) {
    if (remainingHours > 0) flags.push(`متبقٍ للتخرج ${remainingHours} ساعة`);
    // Surface the non-hour graduation blockers so the gate is auditable in the UI.
    if (remainingHours === 0 && !passedGraduationProject) flags.push('متبقٍ: مشروع التخرج');
    if (remainingHours === 0 && passedGraduationProject && !atLastLevel)
      flags.push(`متبقٍ: بلوغ المستوى الأخير (${lastLevel})`);
  }

  return {
    studentId: student.id,
    cgpa,
    gpaHours: cgpaHours,
    earnedHours,
    onProbation,
    hourCap: onProbation ? reg.probationHourCap : null,
    probationTermsTotal: probationTotal,
    probationConsecutive: maxConsecutive,
    escalation,
    termHonor,
    cumulativeHonor,
    currentLevel: student.level,
    qualifiedLevel,
    canPromote,
    graduationEligible,
    graduationHours,
    remainingHours,
    passedGraduationProject,
    atLastLevel,
    failedMandatory,
    repeatedFailure,
    flags,
  };
}

export async function computeAcademicStanding(studentId: string): Promise<AcademicStanding | null> {
  const data = await load(studentId);
  if (!data) return null;
  const reg = await getRegulations();
  return deriveStanding(data, reg);
}

// Batch variant for the institute dashboard — one regulations read, N student computations.
export async function computeStandingForStudents(studentIds: string[]): Promise<Map<string, AcademicStanding>> {
  const reg = await getRegulations();
  const out = new Map<string, AcademicStanding>();
  for (const id of studentIds) {
    const data = await load(id);
    if (data) out.set(id, deriveStanding(data, reg));
  }
  return out;
}
