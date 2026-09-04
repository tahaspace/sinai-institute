import prisma from '@/lib/prisma';
import { getRegulations, resolveGraduationHours, type Regulations } from '@/lib/regulations';

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
  // honor roll — مرتبة الشرف. The bylaw joins its conditions with «و», so there is ONE verdict:
  // `honorRoll`. `termHonor`/`cumulativeHonor` are kept as aliases of that same verdict because
  // several screens and reports still read them (some as `cumulativeHonor || termHonor`); splitting
  // them again would resurrect the OR the bylaw forbids.
  honorRoll: boolean;
  termHonor: boolean;
  cumulativeHonor: boolean;
  honorBlockers: string[]; // which bylaw honour conditions this student misses (Arabic, for the UI)
  // level promotion
  currentLevel: number;
  qualifiedLevel: number;
  canPromote: boolean;
  // graduation
  graduationEligible: boolean;
  graduationHours: number; // per-program requirement (or reg default) used for this student
  graduationMinCgpa: number; // bylaw floor applied to this student (0 = the institute disabled it)
  meetsGraduationCgpa: boolean; // «الحد الادني للتخرج … تقدير تراكمي 2»
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
    // Is this enrolment's result settled? false while it is un-graded or parked in a non-terminal
    // status (GradeStatus.isFinal === false → INC/DEFER). Used to tell a term that is STILL BEING
    // RECORDED from one the bylaw can actually judge.
    resolved: boolean;
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
        // No status at all = the registrar has not recorded this course yet. A status the institute
        // marked non-final (INC/DEFER) is likewise unsettled. A code with no matching GradeStatus row
        // counts as settled: something WAS recorded, and treating it as pending would freeze the
        // term's verdict forever.
        resolved: e.gradeStatusCode != null && (st ? st.isFinal : true),
      };
    }),
  };
}

export function deriveStanding(data: Loaded, reg: Regulations): AcademicStanding {
  const { student, enrollments } = data;

  // ---- term aggregation (GPA-affecting components only) ----
  const terms = new Map<number, { qp: number; hours: number; summer: boolean; hasFail: boolean; gpaHours: number; pending: boolean }>();
  let cgpaQp = 0;
  let cgpaHours = 0;
  let earnedHours = 0;

  for (const e of enrollments) {
    if (e.isPass) earnedHours += e.creditHours;
    const counts = e.affectsGpa && e.countsInGpa && e.points != null;
    const key = termSortKey(e.academicYear, e.semester);
    const t = terms.get(key) ?? { qp: 0, hours: 0, summer: isSummer(e.semester), hasFail: false, gpaHours: 0, pending: false };
    // A GPA-bearing course with no settled result yet leaves the whole term half-recorded.
    if (e.countsInGpa && !e.resolved) t.pending = true;
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

  // ---- honor roll (مرتبة الشرف) — bylaw conditions, measured here, joined below ----
  // «لم يقل تقدير الفصلي عن 3.00 GPA» reads on EVERY regular term the student has a GPA in, not on
  // the last one only: a level-2 term of 1.90 disqualifies him however strong his final term is.
  // Summer terms are excluded, as they are from the probation sequence («ولا يحتسب الفصل الصيفي»).
  const regularTerms = orderedKeys.map((k) => terms.get(k)!).filter((t) => !t.summer && t.hours > 0);
  // …but only over terms whose results are IN. A term's GPA here is `qp / hours` over graded hours
  // only, so a 15-hour term with its first 2-hour course posted as C reads 2.00 and used to drop the
  // student off the honour list mid-grading, then put him back when the rest was posted. A
  // half-recorded term is not yet a «تقدير فصلي» the bylaw can measure, so it is not measured.
  const judgedTerms = regularTerms.filter((t) => !t.pending);
  const everyTermMeetsHonorGpa =
    judgedTerms.length > 0 && judgedTerms.every((t) => t.qp / t.hours >= reg.honorTermGpa);

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

  // «والا يكون طالب رسب في اي مقرر دراسي خلال تسجيله» — ANY graded fail, ever, even one later
  // repaired by a successful retake. (The old test was allMandatoryPassed, which forgives a repaired
  // fail and also punishes a student merely still enrolled in a mandatory course.)
  const everFailedAnyCourse = failCountByCourse.size > 0;

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
  // (e.g. a 130 CH program vs a 160 CH program); fall back to reg.graduationHours. Shared with
  // every other place that must quote the requirement (a graduation request, a report).
  const graduationHours = resolveGraduationHours(student.programTotalCreditHours, reg);
  // "Last level": the student must have reached the final academic year of the
  // program (Program.years) — fall back to the bylaw max when there's no program.
  const lastLevel = student.programYears ?? FALLBACK_MAX_LEVEL;
  const atLastLevel = student.level >= lastLevel;
  const remainingHours = Math.max(0, graduationHours - earnedHours);
  // «الحد الادني للتخرج نقطتين حتي يصل الي تقدير تراكمي 2 ويصبح مقبول ويتم التخرج» — the bylaw's CGPA
  // floor. Without it a student on 1.40 who merely accumulated the hours was auto-graduated by the
  // promotion engine. Configured (0 disables the gate for an institute whose bylaw has no floor).
  // Number() because a hand-saved bylaw can store "2" as a string; every read of it below formats.
  const graduationMinCgpa = Number(reg.graduationMinCgpa) || 0;
  const meetsGraduationCgpa = cgpa >= graduationMinCgpa;
  const graduationEligible =
    earnedHours >= graduationHours &&
    failedMandatory.length === 0 &&
    passedGraduationProject && // مشروع التخرج must be passed
    meetsGraduationCgpa &&
    atLastLevel;

  // ---- the honour verdict: every bylaw condition, ANDed ----
  // «و ان يكون حاصل في خلال المدة الاعتادية للدراسة من ( 7-9 فصول دراسية اعتيادية )» — «خلال» is
  // WITHIN, so the bylaw sets a CEILING: the honour must be earned inside the normal span. It never
  // asks the student to spend seven terms, so the floor ships disabled (Regulations.honorMinTerms 0)
  // and stays available for an institute whose own bylaw imposes a residency. Duration counts every
  // regular term the student actually studied — a term still being graded is time spent even though
  // its GPA is not yet judged above.
  const regularTermCount = regularTerms.length;
  const withinHonorCeiling = reg.honorMaxTerms > 0 ? regularTermCount <= reg.honorMaxTerms : true;
  const withinHonorFloor = !graduationEligible || reg.honorMinTerms <= 0 || regularTermCount >= reg.honorMinTerms;
  const honorBlockers: string[] = [];
  if (!(cgpaHours > 0 && cgpa >= reg.honorCgpa)) honorBlockers.push(`المعدل التراكمي أقل من ${reg.honorCgpa}`);
  if (!everyTermMeetsHonorGpa) honorBlockers.push(`معدل أحد الفصول أقل من ${reg.honorTermGpa}`);
  if (everFailedAnyCourse) honorBlockers.push('سبق الرسوب في مقرر');
  if (!withinHonorCeiling) honorBlockers.push(`تجاوز ${reg.honorMaxTerms} فصول اعتيادية`);
  if (!withinHonorFloor) honorBlockers.push(`أقل من ${reg.honorMinTerms} فصول اعتيادية`);
  const honorRoll = honorBlockers.length === 0;

  // ---- Arabic flags ----
  const flags: string[] = [];
  if (escalation === 'track-change-or-dismissal') flags.push('إنذار نهائي: تحويل مسار أو فصل');
  else if (escalation === 'warning') flags.push(`إنذار أكاديمي (المعدل ${cgpa.toFixed(2)} < ${reg.probationGpa})`);
  if (repeatedFailure.length) flags.push(`رسوب متكرر (${reg.maxCourseAttempts}+ مرات): ${repeatedFailure.map((r) => r.code).join('، ')}`);
  if (onProbation) flags.push(`تحت الملاحظة — الحد الأقصى للتسجيل ${reg.probationHourCap} ساعة`);
  if (honorRoll) flags.push('مرتبة الشرف');
  if (canPromote) flags.push(`مؤهل للترقية إلى المستوى ${qualifiedLevel}`);
  if (graduationEligible) flags.push('مستوفٍ لشروط التخرج');
  else if (earnedHours > 0) {
    if (remainingHours > 0) flags.push(`متبقٍ للتخرج ${remainingHours} ساعة`);
    // Surface the non-hour graduation blockers so the gate is auditable in the UI.
    if (remainingHours === 0 && !passedGraduationProject) flags.push('متبقٍ: مشروع التخرج');
    // The CGPA floor must be SAID, not silently applied: without this line a student who has the
    // hours and the project simply never appears in the graduates list with no reason given. Gated
    // like its two neighbours (hours done, project passed) so it names what is ACTUALLY standing
    // between this student and the certificate — ungated it fired on every probation student, adding
    // «متبقٍ للتخرج: رفع المعدل» to someone 118 hours away who already carries the إنذار أكاديمي flag.
    if (remainingHours === 0 && passedGraduationProject && !meetsGraduationCgpa)
      flags.push(`متبقٍ للتخرج: رفع المعدل التراكمي إلى ${graduationMinCgpa.toFixed(2)} (الحالي ${cgpa.toFixed(2)})`);
    if (remainingHours === 0 && passedGraduationProject && meetsGraduationCgpa && !atLastLevel)
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
    honorRoll,
    // Aliases of the single verdict — see the type. Existing consumers that OR the two now get the
    // bylaw's conjunction either way instead of two half-conditions.
    termHonor: honorRoll,
    cumulativeHonor: honorRoll,
    honorBlockers,
    currentLevel: student.level,
    qualifiedLevel,
    canPromote,
    graduationEligible,
    graduationHours,
    graduationMinCgpa,
    meetsGraduationCgpa,
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// الحالة الأكاديمية للطالب — «حاله الاكاديمية للطالب ولابد من ادراجها في عمود بيانات الطالب :
// وتكون ثلاث انواع ( انتظام ، وقف قيد ، المراقبة الاكاديمية )» (اللائحة، سطر 65)، ومكررة في بيان
// حالة الطالب: «الحاله االاكاديمه ( انتظام ، مراقبه ، وقف قيد )» (سطر 93).
//
// It is DERIVED, deliberately, from the two facts the platform already owns — there is no second
// column to drift out of step with Student.status:
//   · وقف قيد        ⇐ Student.status === 'SUSPENDED'  (the same value lib/promotion.ts skips on and
//                      lib/regulations.blockedRegistrationStatuses already refuses registration for)
//   · المراقبة الأكاديمية ⇐ standing.onProbation (CGPA < probationGpa), when the record is otherwise active
//   · انتظام         ⇐ everything else on an active record
// Terminal registrations (خريج / منسحب / مفصول / منتسب) are NOT one of the bylaw's three states, so
// they are reported under their own label rather than being flattened into «انتظام».
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Student.status value carrying الانتساب. A plain value of the existing free-text column — NOT a
 *  new truth: it is deliberately absent from blockedRegistrationStatuses because the bylaw lets a
 *  منتسب keep attending («مع حضور دروس عمليه»), unlike موقوف/مفصول. */
export const AFFILIATE_STATUS = 'AFFILIATE';
export const SUSPENDED_STATUS = 'SUSPENDED';
export const DISMISSED_STATUS = 'DISMISSED';

export type AcademicState = 'REGULAR' | 'SUSPENDED' | 'MONITORING' | 'AFFILIATE' | 'GRADUATED' | 'WITHDRAWN' | 'DISMISSED';

export const ACADEMIC_STATE_LABELS: Record<AcademicState, string> = {
  REGULAR: 'انتظام',
  SUSPENDED: 'وقف قيد',
  MONITORING: 'المراقبة الأكاديمية',
  AFFILIATE: 'انتساب',
  GRADUATED: 'خريج',
  WITHDRAWN: 'منسحب',
  DISMISSED: 'مفصول',
};

/**
 * The bylaw's academic-state column for one student. `standing` may be omitted (a list screen that
 * has not computed standing yet) — the state is then the registration state alone, never a guessed
 * «مراقبة».
 */
export function academicStateOf(
  status: string | null | undefined,
  standing?: Pick<AcademicStanding, 'onProbation'> | null,
): AcademicState {
  const s = (status ?? '').toUpperCase();
  if (s === SUSPENDED_STATUS) return 'SUSPENDED';
  if (s === AFFILIATE_STATUS) return 'AFFILIATE';
  if (s === 'GRADUATED') return 'GRADUATED';
  if (s === 'WITHDRAWN') return 'WITHDRAWN';
  if (s === DISMISSED_STATUS) return 'DISMISSED';
  return standing?.onProbation ? 'MONITORING' : 'REGULAR';
}

/**
 * The CGPA floor that puts a student تحت المراقبة الأكاديمية — «اذا حصل الطالب علي تقدير تراكمي 1.67
 * بعد نهايه الفصل الدراسي الثاني من المستوي الاول بالتحاقه بالمعهد يوضع تحت المراقبه الاكاديميه».
 * Read from the institute's own Regulations (key `monitoringGpa`); never a literal here. Until that
 * key exists in the saved bylaw it falls back to `probationGpa`, which is what every caller used
 * before — so an institute that configured nothing sees no change.
 */
export function monitoringGpaFloor(reg: Regulations): number {
  const configured = Number((reg as unknown as Record<string, unknown>).monitoringGpa ?? 0);
  return configured > 0 ? configured : Number(reg.probationGpa) || 0;
}

export type AnnulmentRecommendation = {
  recommended: boolean;
  /** Which half of the bylaw sentence fired, if any. */
  basis: 'consecutive' | 'separate' | null;
  reason: string; // Arabic, quotes the bylaw and the counts — printed on the screen and the decision
  consecutive: number;
  separate: number;
  consecutiveLimit: number;
  separateLimit: number;
};

/**
 * «يلغي قيد الطالب ويتم ادراجه ضمن الانتساب : اذا كان تحت المراقبه ( ثلاث فصول متصله او اربعه فصول
 *  منفصله )» — evaluated from the counts lib/standing already produced (probationConsecutive /
 *  probationTermsTotal, both computed with الصيفي excluded). Nothing is recounted here, and nothing
 *  is written: this returns a RECOMMENDATION the registrar acts on, because إلغاء القيد is
 *  irreversible and the bylaw hands it to a human.
 */
export function annulmentRecommendation(
  standing: Pick<AcademicStanding, 'probationConsecutive' | 'probationTermsTotal' | 'cgpa'>,
  reg: Regulations,
): AnnulmentRecommendation {
  const consecutiveLimit = Number(reg.annulmentConsecutiveMonitoringTerms) || 0;
  const separateLimit = Number(reg.annulmentSeparateMonitoringTerms) || 0;
  const consecutive = standing.probationConsecutive;
  const separate = standing.probationTermsTotal;
  // ENTRY GATE. The sentence this function quotes speaks of a student «تحت المراقبه», and the bylaw
  // states exactly one way into المراقبة: «اذا حصل الطالب علي تقدير تراكمي 1.67 بعد نهايه الفصل
  // الدراسي الثاني من المستوي الاول بالتحاقه بالمعهد يوضع تحت المراقبه الاكاديميه». The counting loop
  // above uses probationGpa (the الإنذار floor, 2.00), which is LOOSER — so without this gate a
  // student who never entered المراقبة was recommended for the one irreversible action on the screen.
  // Nothing in the counting loop changes; the verdict is simply refused for a record the bylaw never
  // put under monitoring. When the institute has not configured a monitoring floor the threshold
  // falls back to probationGpa, i.e. exactly today's behaviour.
  const underMonitoring = standing.cgpa > 0 && standing.cgpa < monitoringGpaFloor(reg);
  const byConsecutive = underMonitoring && consecutiveLimit > 0 && consecutive >= consecutiveLimit;
  const bySeparate = underMonitoring && separateLimit > 0 && separate >= separateLimit;
  const basis = byConsecutive ? 'consecutive' : bySeparate ? 'separate' : null;
  const reason = byConsecutive
    ? `تحت المراقبة الأكاديمية ${consecutive} فصول متصلة (الحد ${consecutiveLimit}) — «يلغي قيد الطالب ويتم ادراجه ضمن الانتساب : اذا كان تحت المراقبه ( ثلاث فصول متصله او اربعه فصول منفصله )»`
    : bySeparate
      ? `تحت المراقبة الأكاديمية ${separate} فصول منفصلة (الحد ${separateLimit}) — «يلغي قيد الطالب ويتم ادراجه ضمن الانتساب : اذا كان تحت المراقبه ( ثلاث فصول متصله او اربعه فصول منفصله )»`
      : '';
  return { recommended: basis != null, basis, reason, consecutive, separate, consecutiveLimit, separateLimit };
}
