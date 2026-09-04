import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';
import { computeAcademicStanding } from '@/lib/standing';
import { tenantOrGlobalWhere } from '@/lib/tenant';

// Course-registration validation engine. Encodes the bylaw's registration rules:
// min/max hours, prerequisites (incl. a MINIMUM GRADE), time conflict, probation hour cap,
// the overload exception, the repeat-hours budget, repeated failure and the student's own
// academic status. Returns structured issues so the UI can show each rule.
//
// NEW bylaw parameters, all read from the typed Regulations object (DEFAULT_REGULATIONS carries
// the bylaw sentence behind each one) — never a literal here:
//   overloadMinCgpa      (3.0)  «يجوز زياده عن 21 ساعه ادا كان للطالب معدل تراكميا عاليا من 3 نقاط فاكثر»
//   overloadMaxHours     (24)   the ceiling that replaces maxRegHours once the exception applies
//   overloadForGraduating(true) «... او في حالات التخرج»
//   repeatHoursCap       (17)   «بشرط الا تتجاوز عدد ساعات معتمدة في الاعادة 17 ساعة معتمدة»
//   repeatHoursCapCgpa   (2.0)  «طلاب اللي عندهم تقدير اقل من 2 ... يجوز لهم اعادة المواد»
//   repeatMaxGradeCode   ('C')  «لا يجوز للطالب حصل علي تقدير C او اكثر اعاده دراسة المقرر»
//   blockedRegistrationStatuses ('SUSPENDED,WITHDRAWN,DISMISSED,GRADUATED') — Student.status values
//                               that may not register at all («ايقاف قيد الطالب» / الفصل).

export type ValidationIssue = { rule: string; message: string; severity: 'error' | 'warning' };

export type RegistrationValidation = {
  ok: boolean; // no errors (warnings are allowed)
  issues: ValidationIssue[];
  totalHours: number;
  maxHours: number;
  minHours: number;
  repeatHours: number; // hours in this basket that repeat a course the student already took
  repeatHoursUsed: number; // hours the student already consumed on repeats in earlier terms
  repeatHoursCap: number | null; // the 17-hour TOTAL budget when it applies to this student, else null
  // التقويم الأكاديمي — present only when the institute has entered the term's dates.
  calendar?: {
    termId: string;
    label: string;
    registrationStart: string | null;
    registrationEnd: string | null;
    addDropDeadline: string | null;
    withdrawDeadline: string | null;
    isLate: boolean;
    lateRegistrationFee: number | null;
  };
};

/** Student.status values that may not register, as typed on the bylaw screen (CSV). */
function blockedStatusList(csv: string): string[] {
  return String(csv ?? '')
    .split(',')
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

type LadderRow = { minPercent: number | null; points: number | null; order: number | null };

/**
 * Compare two rungs of the institute's letter ladder — the bylaw's «تقدير» comparison.
 *
 * The two sides MUST be read on ONE scale. minPercent (جدول 3 gives each letter its lower bound),
 * GPA points and the display `order` are three different scales, and a required 60 (percent) beside
 * an earned 3.0 (points) compares nonsense: it refuses the best student in the institute. So a
 * scale is used only when BOTH rows carry it, and when no scale is shared we return null —
 * "cannot judge" — and the caller warns instead of guessing.
 *
 * Returns a positive number when `a` is above `b`, 0 when equal, negative when below, null when
 * the two are not comparable.
 */
function compareLadder(a: LadderRow | undefined, b: LadderRow | undefined): number | null {
  if (!a || !b) return null;
  if (a.minPercent != null && b.minPercent != null) return a.minPercent - b.minPercent;
  if (a.points != null && b.points != null) return a.points - b.points;
  // `order` is a non-null column with a default of 0, so it only separates a ladder the institute
  // actually ordered; an all-zero ladder yields 0 (equal) rather than a false verdict.
  if (a.order != null && b.order != null && (a.order !== 0 || b.order !== 0)) return a.order - b.order;
  return null;
}

/* -------------------------------------------------------------------------------------------- *
 * التقويم الأكاديمي — the dated windows behind the bylaw's week counts.
 *
 *   «تقسيمه الفصل الدراسي: فصل التسجيل____ اسبوع واحد ( لو تاخر الطالب علي تسجيل يتحمل الطالب رسوم
 *    التسجيل وغرامه تاخير خلال هذا الاسبوع ) . الدراسه______ 12 اسبوع . الامتحانات_____ اسبوعان»
 *   «✡الفصل الصيفي 8 اسابيع مكثف …»
 *   «يجوز للطالب الحق في ان يكون خلال الاسبوع الثاني من الدراسة او الاسبوع الاول من الفصل الصيفي
 *    المكثف .» — حق الإضافة والحذف
 *   «يجوز طالب الانسحاب من المادة حتي نهايه الاسبوع الثاني عشر من بدء التسجيل ، بشرط الا يكون تجاوز
 *    نسبه الغياب .» — جدول 3، الحالة W
 *
 * Regulations.withdrawWeek could never be enforced because "week 12" has no meaning without a term
 * start. The institute now types the DATES on /institute/settings/academic-terms and the deadlines
 * below are read from that row — no week number is hardcoded here.
 *
 * SAFETY RULE FOR EVERY CHECK BELOW: no configured term (or a term with that date left blank) means
 * NO new restriction. An institute that never opens the calendar screen keeps today's behaviour
 * exactly; a missing calendar must never become a blanket refusal.
 * -------------------------------------------------------------------------------------------- */

export type TermCalendar = {
  id: string;
  academicYear: string;
  termType: string;
  nameAr: string | null;
  registrationStart: Date | null;
  registrationEnd: Date | null;
  teachingStart: Date | null;
  teachingEnd: Date | null;
  addDropDeadline: Date | null;
  withdrawDeadline: Date | null;
  lateRegistrationFee: number | null;
};

const TERM_LABEL: Record<string, string> = {
  first: 'الفصل الدراسي الأول',
  second: 'الفصل الدراسي الثاني',
  summer: 'الفصل الصيفي',
};

const fmt = (d: Date) => d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Every stored deadline is the LAST INCLUSIVE DAY, never the first refused one: the registrar types
 * «آخر موعد للانسحاب» and the bylaw grants the whole day — «يجوز طالب الانسحاب من المادة حتي نهايه
 * الاسبوع الثاني عشر». The screen posts a bare `<input type="date">` value ("2026-11-20") which
 * parses as UTC MIDNIGHT, so comparing `now <= deadline` excluded the deadline day itself and locked
 * students out a full day early. Stretch every inclusive bound to the end of its day before
 * comparing. (Timezone assumption: the boundary is anchored to the stored instant, i.e. server/UTC.
 * A per-tenant timezone setting would replace this one helper and nothing else.)
 */
const endOfDay = (d: Date) => new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);

/**
 * The calendar row for (academicYear, semester) as seen by this student's tenant.
 * Prefers the student's own university row over an untenanted (legacy/global) one; returns null
 * when the institute has entered nothing — the caller must then impose no calendar rule at all.
 */
export async function getTermCalendar(
  academicYear: string,
  semester: string,
  universityId?: string | null,
): Promise<TermCalendar | null> {
  const rows = await prisma.academicTerm.findMany({
    where: {
      AND: [
        { academicYear, termType: semester },
        // Own rows OR untenanted ones — a strict tenant filter matches nothing today. A student with
        // NO tenant (every legacy student) must be restricted to untenanted rows explicitly: an empty
        // clause here would return EVERY tenant's term and bind him to another institute's calendar.
        universityId ? { OR: [{ universityId }, { universityId: null }] } : { universityId: null },
      ],
    },
    orderBy: { updatedAt: 'desc' }, // deterministic rows[0] when several rows still qualify
  });
  if (!rows.length) return null;
  const preferred = rows.find((r) => universityId && r.universityId === universityId) ?? rows[0];
  return preferred as unknown as TermCalendar;
}

/** Convenience: the calendar for a student's term, resolving the tenant off the student row. */
export async function getStudentTermCalendar(studentId: string, academicYear: string, semester: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { universityId: true } });
  return getTermCalendar(academicYear, semester, student?.universityId ?? null);
}

/**
 * الفصل الحالي — the term the registrar marked «الفصل الحالي» on /institute/settings/academic-terms.
 * Same tenant preference as getTermCalendar. Returns null when no institute marked one, and every
 * caller must then keep its own previous default — an unmarked calendar imposes nothing.
 */
export async function getCurrentTerm(universityId?: string | null): Promise<TermCalendar | null> {
  const rows = await prisma.academicTerm.findMany({
    where: {
      AND: [
        { isCurrent: true },
        universityId ? { OR: [{ universityId }, { universityId: null }] } : { universityId: null },
      ],
    },
    orderBy: [{ academicYear: 'desc' }, { updatedAt: 'desc' }],
  });
  if (!rows.length) return null;
  const preferred = rows.find((r) => universityId && r.universityId === universityId) ?? rows[0];
  return preferred as unknown as TermCalendar;
}

/** الفصل الحالي for a student, resolving the tenant off the student row. */
export async function getCurrentTermForStudent(studentId: string): Promise<TermCalendar | null> {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { universityId: true } });
  return getCurrentTerm(student?.universityId ?? null);
}

/**
 * حق الحذف والإضافة — allowed until addDropDeadline. Unconfigured deadline ⇒ allowed (today's
 * behaviour), so this can be called from any screen without changing legacy institutes.
 */
export async function checkAddDropWindow(
  studentId: string,
  academicYear: string,
  semester: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; message?: string }> {
  const term = await getStudentTermCalendar(studentId, academicYear, semester);
  if (!term?.addDropDeadline) return { allowed: true };
  if (now <= endOfDay(term.addDropDeadline)) return { allowed: true };
  return { allowed: false, message: `انتهى موعد الحذف والإضافة في ${fmt(term.addDropDeadline)}` };
}

/**
 * حق الانسحاب من المادة — what Regulations.withdrawWeek always meant. Allowed until
 * withdrawDeadline; unconfigured ⇒ allowed. (The bylaw's second condition, «بشرط الا يكون تجاوز
 * نسبه الغياب», is an attendance check owned by lib/attendance.ts and is NOT decided here.)
 */
export async function checkWithdrawWindow(
  studentId: string,
  academicYear: string,
  semester: string,
  now: Date = new Date(),
): Promise<{ allowed: boolean; message?: string }> {
  const term = await getStudentTermCalendar(studentId, academicYear, semester);
  if (!term?.withdrawDeadline) return { allowed: true };
  if (now <= endOfDay(term.withdrawDeadline)) return { allowed: true };
  return { allowed: false, message: `انتهى موعد الانسحاب من المقررات في ${fmt(term.withdrawDeadline)}` };
}

type SectionFull = {
  id: string;
  day: string | null;
  startMin: number | null;
  endMin: number | null;
  offering: { academicYear: string; semester: string; status: string; course: { id: string; code: string; nameAr: string; creditHours: number; availableInSummer: boolean; prerequisites: { id: string; code: string }[] } };
};

function overlaps(a: SectionFull, b: SectionFull): boolean {
  if (!a.day || !b.day || a.day !== b.day) return false;
  if (a.startMin == null || a.endMin == null || b.startMin == null || b.endMin == null) return false;
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/**
 * Options for validateRegistration.
 *
 * enforceCalendar — the registration WINDOW binds SUBMISSION only, so it defaults to OFF. Every
 *   other caller (the student's read/preview, the advisor's pending list, and above all the advisor
 *   APPROVAL that happens a day or more after the student submitted) must keep validating without
 *   it: otherwise the moment `registrationEnd` passes, a request submitted legitimately inside the
 *   window can never be approved — the calendar would silently lock out the registrar too.
 *   The `calendar` payload is returned either way, so the UI still shows the dates.
 * at — the instant to judge the window against; the approval path may pass the submission time.
 */
export type ValidateOptions = { enforceCalendar?: boolean; at?: Date };

export async function validateRegistration(
  studentId: string,
  academicYear: string,
  semester: string,
  sectionIds: string[],
  opts: ValidateOptions = {},
): Promise<RegistrationValidation> {
  const reg = await getRegulations();
  const issues: ValidationIssue[] = [];
  const isSummer = semester === 'summer';
  const now = opts.at ?? new Date();

  const sections = (await prisma.section.findMany({
    where: { id: { in: sectionIds } },
    include: { offering: { include: { course: { include: { prerequisites: { select: { id: true, code: true } } } } } } },
  })) as unknown as SectionFull[];

  const totalHours = sections.reduce((s, x) => s + x.offering.course.creditHours, 0);

  const standing = await computeAcademicStanding(studentId);

  // prior enrollments (prerequisites, repeats, repeated failure), the student's own record,
  // the letter ladder, and the graded prerequisite rules for exactly the courses being taken.
  const courseIds = [...new Set(sections.map((x) => x.offering.course.id))];
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { status: true, universityId: true },
  });
  const uid = student?.universityId ?? null;
  const [priorEnrollments, statuses, prereqRules] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId },
      select: {
        courseId: true, gradeStatusCode: true, academicYear: true, semester: true, createdAt: true,
        course: { select: { id: true, code: true, creditHours: true } },
      },
    }),
    // GradeStatus is per-tenant (@@unique([universityId, code])): loading every institute's ladder
    // and keying it on the bare code let another institute's 'B' decide whether this student is
    // blocked. Own rows OR untenanted ones, with the tenant's row preferred below.
    prisma.gradeStatus.findMany({ where: tenantOrGlobalWhere(uid) }),
    // Phase 2 of the prerequisite migration: the NEW model is the reader. Anything not yet copied
    // by scripts/migrate-course-prerequisites.ts still resolves through the legacy M2M below.
    prisma.coursePrerequisite.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, prerequisiteId: true, minGradeCode: true, prerequisite: { select: { code: true } } },
    }),
  ]);
  type StatusRow = (typeof statuses)[number];
  const byCode = new Map<string, StatusRow>();
  for (const st of statuses) {
    const seen = byCode.get(st.code);
    // the tenant's own row always wins over the legacy untenanted one
    if (!seen || (uid && st.universityId === uid)) byCode.set(st.code, st);
  }
  const passedCourseIds = new Set<string>();
  const attemptedCourseIds = new Set<string>();
  // consecutive fails per course — «اذا رسب الطالب في مقرر اكثر من 3 مرات علي التوالي»: a run that a
  // passing attempt resets, not a lifetime total.
  const failStreak = new Map<string, number>();
  // hours already spent on repeats: every second-or-later attempt at the same course. The bylaw's
  // 17 hours is a TOTAL allowance («عدد ساعات معتمدة في الاعادة»), so a per-basket count could be
  // spent again every term forever.
  const attemptCount = new Map<string, number>();
  let repeatHoursUsed = 0;
  // best PASSING status the student reached in a course — the bylaw's «تقدير» both in the
  // prerequisite rule and in the repeat ceiling.
  const bestStatus = new Map<string, StatusRow>();
  // term order so «علي التوالي» means what it says; createdAt breaks a tie inside one term.
  const SEM_ORDER: Record<string, number> = { first: 0, second: 1, summer: 2 };
  const ordered = [...priorEnrollments].sort((a, b) =>
    a.academicYear === b.academicYear
      ? (SEM_ORDER[a.semester] ?? 9) - (SEM_ORDER[b.semester] ?? 9) || a.createdAt.getTime() - b.createdAt.getTime()
      : a.academicYear < b.academicYear ? -1 : 1,
  );
  for (const e of ordered) {
    const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : undefined;
    attemptedCourseIds.add(e.courseId);
    const n = (attemptCount.get(e.courseId) ?? 0) + 1;
    attemptCount.set(e.courseId, n);
    if (n > 1) repeatHoursUsed += e.course.creditHours;
    if (st?.isPass) {
      passedCourseIds.add(e.courseId);
      // only a PASSING attempt can satisfy a minimum grade
      const prev = bestStatus.get(e.courseId);
      const cmp = compareLadder(st, prev);
      if (!prev || cmp == null || cmp > 0) bestStatus.set(e.courseId, st);
      failStreak.set(e.courseId, 0); // «علي التوالي» — a pass breaks the run
    } else if (st && st.affectsGpa && st.points != null) {
      // a "fail" = a graded, non-pass, GPA-affecting status (F/NE/BL/DN/DS)
      failStreak.set(e.courseId, (failStreak.get(e.courseId) ?? 0) + 1);
    }
  }
  const rulesByCourse = new Map<string, typeof prereqRules>();
  for (const r of prereqRules) {
    const list = rulesByCourse.get(r.courseId) ?? [];
    list.push(r);
    rulesByCourse.set(r.courseId, list);
  }

  // --- (5) the student's own academic status ---
  // «ايقاف قيد الطالب» / الفصل الاكاديمي: a suspended, withdrawn, dismissed or graduated record may
  // not register at all. The engine never read Student.status before, so it registered them happily.
  const blockedStatuses = blockedStatusList(reg.blockedRegistrationStatuses);
  const studentStatus = (student?.status ?? '').toUpperCase();
  if (studentStatus && blockedStatuses.includes(studentStatus)) {
    const label: Record<string, string> = {
      SUSPENDED: 'موقوف القيد', WITHDRAWN: 'منسحب', DISMISSED: 'مفصول', GRADUATED: 'متخرج', DEFERRED: 'مؤجل',
    };
    issues.push({
      rule: 'student-status',
      message: `لا يجوز التسجيل: حالة الطالب «${label[studentStatus] ?? studentStatus}»`,
      severity: 'error',
    });
  }

  // --- (2) the max-load exception ---
  // «العبء الدراسي يجوز زياده عن 21 ساعه ادا كان للطالب معدل تراكميا عاليا من 3 نقاط فاكثر او في
  //  حالات التخرج». Both the CGPA threshold and the raised ceiling are bylaw parameters, never
  //  literals. Probation still wins: the exception is a reward, it cannot lift a penalty.
  const overloadMinCgpa = Number(reg.overloadMinCgpa) || 0;
  const overloadMaxHours = Number(reg.overloadMaxHours) || 0;
  const overloadForGraduating = reg.overloadForGraduating !== false;
  const regularMax = isSummer ? reg.summerMaxHours : reg.maxRegHours;
  // «في حالات التخرج» = the student is in his final level and this basket covers whatever hours are
  // left (remainingHours 0 included — a finishing student whose only remaining requirement is
  // مشروع التخرج or a raised CGPA is exactly the one the exception was written for).
  const isGraduating = !!standing && standing.atLastLevel && totalHours >= standing.remainingHours;
  const overloadReason =
    standing?.onProbation ? null
      : standing && standing.gpaHours > 0 && overloadMinCgpa > 0 && standing.cgpa >= overloadMinCgpa
        ? `معدل تراكمي ${standing.cgpa.toFixed(2)} ≥ ${overloadMinCgpa}`
        : overloadForGraduating && isGraduating
          ? 'حالة تخرج'
          : null;
  const maxHours = standing?.onProbation
    ? Math.min(regularMax, reg.probationHourCap)
    : overloadReason && overloadMaxHours > regularMax
      ? overloadMaxHours
      : regularMax;
  const minHours = isSummer ? 0 : reg.minRegHours;

  // --- registration window (التقويم الأكاديمي) ---
  // Only ever narrows behaviour when the institute has entered dates; otherwise nothing is added.
  // The student row was already read above, so resolve the tenant from it instead of re-reading it.
  const term = await getTermCalendar(academicYear, semester, student?.universityId ?? null);
  let calendar: RegistrationValidation['calendar'];
  if (term) {
    let isLate = false;
    // Window issues are raised ONLY on the submission path; the payload below is always returned.
    if (opts.enforceCalendar && term.registrationStart && now < term.registrationStart) {
      issues.push({ rule: 'registration-window', message: `لم يبدأ التسجيل بعد — يبدأ في ${fmt(term.registrationStart)}`, severity: 'error' });
    } else if (term.registrationEnd && now > endOfDay(term.registrationEnd)) {
      // «لو تاخر الطالب علي تسجيل يتحمل الطالب رسوم التسجيل وغرامه تاخير خلال هذا الاسبوع» —
      // late registration stays POSSIBLE inside the add/drop window and is flagged as a warning
      // carrying the institute's own fee. The fee is never charged here; finance applies it.
      const lateLimit = term.addDropDeadline ?? term.teachingStart ?? null;
      if (!lateLimit || now <= endOfDay(lateLimit)) {
        isLate = true;
        const feeText = term.lateRegistrationFee ? ` — تُستحق غرامة تأخير قدرها ${term.lateRegistrationFee}` : '';
        issues.push({ rule: 'late-registration', message: `تسجيل متأخر بعد ${fmt(term.registrationEnd)}${feeText}`, severity: 'warning' });
      } else if (opts.enforceCalendar) {
        issues.push({ rule: 'registration-window', message: `انتهى موعد التسجيل في ${fmt(term.registrationEnd)}`, severity: 'error' });
      }
    }
    calendar = {
      termId: term.id,
      label: term.nameAr || TERM_LABEL[term.termType] || term.termType,
      registrationStart: term.registrationStart?.toISOString() ?? null,
      registrationEnd: term.registrationEnd?.toISOString() ?? null,
      addDropDeadline: term.addDropDeadline?.toISOString() ?? null,
      withdrawDeadline: term.withdrawDeadline?.toISOString() ?? null,
      isLate,
      lateRegistrationFee: term.lateRegistrationFee ?? null,
    };
  }

  // --- hours bounds ---
  if (totalHours > maxHours) {
    issues.push({ rule: 'max-hours', message: `إجمالي الساعات ${totalHours} يتجاوز الحد الأقصى ${maxHours}${standing?.onProbation ? ' (تحت الملاحظة)' : ''}`, severity: 'error' });
  } else if (overloadReason && totalHours > regularMax) {
    issues.push({ rule: 'overload', message: `تجاوز الحد الأقصى ${regularMax} ساعة بموجب استثناء اللائحة (${overloadReason}) — يتطلب موافقة`, severity: 'warning' });
  }
  if (sectionIds.length > 0 && totalHours < minHours) {
    issues.push({ rule: 'min-hours', message: `إجمالي الساعات ${totalHours} أقل من الحد الأدنى ${minHours}`, severity: 'error' });
  }

  // --- (3) the repeat allowance: which courses, and the 17-hour TOTAL budget ---
  // «طلاب اللي عندهم تقدير اقل من 2 بتقدير مقبول علي الاقل يجوز لهم اعادة المواد الحاصلين فيهم علي
  //  تقدير راسب او مقبول بشرط الا تتجاوز عدد ساعات معتمدة في الاعادة 17 ساعة معتمدة» — and
  // «لا يجوز للطالب حصل علي تقدير C او اكثر اعاده دراسة المقرر».
  //
  // Two separate rules therefore: an ELIGIBILITY ceiling (a course already passed at or above
  // repeatMaxGradeCode may not be retaken at all) and a total-hours BUDGET that only counts the
  // repeats the bylaw actually allows — a course retaken for improvement above the ceiling is
  // refused outright, so it never consumes the budget.
  const repeatCeiling = reg.repeatMaxGradeCode ? byCode.get(String(reg.repeatMaxGradeCode)) : undefined;
  const ceilingName = repeatCeiling?.name ?? String(reg.repeatMaxGradeCode ?? '');
  /** A course whose best passing grade is at or above the ceiling may not be repeated. */
  const aboveRepeatCeiling = (courseId: string): boolean => {
    if (!repeatCeiling) return false; // the institute never defined the ceiling code → no new restriction
    const best = bestStatus.get(courseId);
    if (!best) return false;
    const cmp = compareLadder(best, repeatCeiling);
    return cmp != null && cmp >= 0;
  };
  const repeatSections = sections.filter(
    (x) => attemptedCourseIds.has(x.offering.course.id) && !aboveRepeatCeiling(x.offering.course.id),
  );
  const repeatHours = repeatSections.reduce((sum, x) => sum + x.offering.course.creditHours, 0);
  const repeatCapHours = Number(reg.repeatHoursCap) || 0;
  const repeatCapCgpa = Number(reg.repeatHoursCapCgpa) || 0;
  const repeatCapApplies =
    repeatCapHours > 0 && !!standing && standing.gpaHours > 0 && standing.cgpa < repeatCapCgpa;
  const repeatHoursCap = repeatCapApplies ? repeatCapHours : null;
  // the allowance is a TOTAL, so what earlier terms already consumed counts against it
  const repeatHoursTotal = repeatHoursUsed + repeatHours;
  if (repeatHoursCap != null && repeatHoursTotal > repeatHoursCap) {
    issues.push({
      rule: 'repeat-hours-cap',
      message: `ساعات الإعادة ${repeatHoursTotal} (المستهلك سابقاً ${repeatHoursUsed} + ${repeatHours} في هذا الفصل) تتجاوز سقف ${repeatHoursCap} ساعة المقرر لرفع المعدل التراكمي إلى ${repeatCapCgpa.toFixed(2)}`,
      severity: 'error',
    });
  }
  // --- (4) repeated failure — the bylaw's direction ---
  // «اذا رسب الطالب في مقرر اكثر من 3 مرات علي التوالي لا يجوز التسجيل في مقرر جديد قبل نجاح في
  //  مقرر الذي رسب به ثلاث مرات». The block falls on NEW courses, not on the failed one: the failed
  //  course is precisely what he must retake. The engine used to bar the retake itself — backwards.
  // «اكثر من 3 مرات» is strictly MORE than maxCourseAttempts — the block falls on the FOURTH
  // consecutive failure, and failStreak already resets on a passing attempt.
  const blockingCourses = [...failStreak.entries()]
    .filter(([id, n]) => n > reg.maxCourseAttempts && !passedCourseIds.has(id))
    .map(([id]) => id);
  const blockingCourseIds = new Set(blockingCourses);
  const blockingCodes = blockingCourses.length
    ? (await prisma.course.findMany({ where: { id: { in: blockingCourses } }, select: { code: true } })).map((c) => c.code)
    : [];
  // The bylaw orders the student to retake the failed course first — which he cannot do if nobody
  // is offering it this term. When no open offering exists the block would leave him unable to
  // register ANYTHING, so it degrades to a warning instead of a dead end.
  const blockingOfferable = blockingCourses.length
    ? (await prisma.courseOffering.findMany({
        where: { courseId: { in: blockingCourses }, academicYear, semester, status: 'open' },
        select: { courseId: true },
      })).length > 0
    : false;
  const blockingSeverity: 'error' | 'warning' = blockingOfferable ? 'error' : 'warning';

  for (const sec of sections) {
    const c = sec.offering.course;

    // --- offering belongs to the requested term and is open ---
    if (sec.offering.academicYear !== academicYear || sec.offering.semester !== semester) {
      issues.push({ rule: 'wrong-term', message: `${c.code}: الشعبة ليست ضمن الفصل المطلوب`, severity: 'error' });
    }
    if (sec.offering.status !== 'open') {
      issues.push({ rule: 'offering-closed', message: `${c.code}: التسجيل مغلق لهذا المقرر`, severity: 'error' });
    }

    // --- summer availability ---
    if (isSummer && !c.availableInSummer) {
      issues.push({ rule: 'summer-only', message: `${c.code}: غير متاح في الفصل الصيفي`, severity: 'error' });
    }

    // --- already passed ---
    if (passedCourseIds.has(c.id)) {
      issues.push({ rule: 'already-passed', message: `${c.code}: سبق اجتيازه`, severity: 'warning' });
    }

    // --- the repeat ceiling: «لا يجوز للطالب حصل علي تقدير C او اكثر اعاده دراسة المقرر» ---
    if (aboveRepeatCeiling(c.id)) {
      issues.push({
        rule: 'repeat-not-allowed',
        message: `${c.code}: لا يجوز إعادة دراسة مقرر حصل فيه الطالب على تقدير «${ceilingName}» أو أعلى`,
        severity: 'error',
      });
    }

    // --- (1) prerequisites: passed, and at the minimum grade the bylaw asks for ---
    // «حصول علي تقدير جيد في اللغة الاجنيبيه الاولي المتخصصه» (متطلبات الالتحاق بقسم الارشاد
    //  السياحي) — a MINIMUM GRADE, which the old bare M2M could not express. Rules come from
    //  CoursePrerequisite; a course with no row there yet still reads the legacy relation, so
    //  nothing changes for an institute before the copy script has run.
    // Union of the two sources, keyed by prerequisiteId: a PARTIALLY migrated course (some pairs
    // copied into CoursePrerequisite, some still only in the legacy M2M) would otherwise silently
    // lose the pairs that were not copied. The new row wins where both exist — it is the only one
    // that can carry a minimum grade.
    const byPrereq = new Map<string, { prerequisiteId: string; minGradeCode: string | null; prerequisite: { code: string } }>();
    for (const p of c.prerequisites) byPrereq.set(p.id, { prerequisiteId: p.id, minGradeCode: null, prerequisite: { code: p.code } });
    for (const r of rulesByCourse.get(c.id) ?? []) byPrereq.set(r.prerequisiteId, r);
    const rules = [...byPrereq.values()];
    if (rules.length) {
      const notPassed: string[] = [];
      const belowGrade: string[] = [];
      const unjudged: string[] = [];
      for (const r of rules) {
        if (!passedCourseIds.has(r.prerequisiteId)) {
          notPassed.push(r.prerequisite.code);
          continue;
        }
        if (!r.minGradeCode) continue; // null = a pass is enough
        const required = byCode.get(r.minGradeCode);
        const earned = bestStatus.get(r.prerequisiteId);
        // An unknown required code (a letter this institute never defined) must not silently
        // block a student — the pass check above already stands.
        if (!required) continue;
        const cmp = compareLadder(earned, required);
        if (cmp == null) {
          // The two rungs share no scale (e.g. a transfer status TR with neither percent nor
          // points). Judging that would be a coin toss, so the registrar is told instead.
          unjudged.push(`${r.prerequisite.code} ≥ ${required.name ?? r.minGradeCode}`);
        } else if (cmp < 0) {
          belowGrade.push(`${r.prerequisite.code} ≥ ${required.name ?? r.minGradeCode}`);
        }
      }
      if (notPassed.length) {
        issues.push({ rule: 'prerequisite', message: `${c.code}: متطلب سابق غير مجتاز (${notPassed.join('، ')})`, severity: 'error' });
      }
      if (belowGrade.length) {
        issues.push({ rule: 'prerequisite-grade', message: `${c.code}: تقدير المتطلب السابق أقل من الحد الأدنى (${belowGrade.join('، ')})`, severity: 'error' });
      }
      if (unjudged.length) {
        issues.push({ rule: 'prerequisite-grade', message: `${c.code}: تعذّر التحقق من أدنى تقدير — سلّم التقديرات غير مكتمل (${unjudged.join('، ')})`, severity: 'warning' });
      }
    }

    // --- (4) repeated failure blocks NEW courses, never the retake itself ---
    if (blockingCourses.length && !blockingCourseIds.has(c.id) && !attemptedCourseIds.has(c.id)) {
      issues.push({
        rule: 'repeated-failure',
        message: `${c.code}: مقرر جديد — لا يجوز التسجيل قبل النجاح في (${blockingCodes.join('، ')}) بعد الرسوب أكثر من ${reg.maxCourseAttempts} مرات${blockingOfferable ? '' : ' — المقرر غير مطروح هذا الفصل'}`,
        severity: blockingSeverity,
      });
    }
  }

  // A student under the repeated-failure block who did NOT put the failed course in his basket is
  // warned once: the bylaw wants that course retaken first.
  if (blockingCourses.length && sections.length && !sections.some((x) => blockingCourseIds.has(x.offering.course.id))) {
    issues.push({
      rule: 'repeated-failure-missing',
      message: `يجب تسجيل المقرر المرسوب فيه أكثر من ${reg.maxCourseAttempts} مرات (${blockingCodes.join('، ')}) قبل غيره`,
      severity: 'warning',
    });
  }

  // --- time conflicts (pairwise) ---
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      if (overlaps(sections[i], sections[j])) {
        issues.push({ rule: 'time-conflict', message: `تعارض في المواعيد: ${sections[i].offering.course.code} و ${sections[j].offering.course.code}`, severity: 'error' });
      }
    }
  }

  return { ok: !issues.some((x) => x.severity === 'error'), issues, totalHours, maxHours, minHours, repeatHours, repeatHoursUsed, repeatHoursCap, ...(calendar ? { calendar } : {}) };
}
