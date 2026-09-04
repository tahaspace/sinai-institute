import prisma from '@/lib/prisma';
import { getTenantCtx } from '@/lib/tenant-context';

// Institute bylaw parameters. Configurable: an admin can override any of these by
// saving a JSON blob under the Setting key "institute.regulations"; unset keys fall
// back to these documented defaults.
export const DEFAULT_REGULATIONS = {
  probationGpa: 2.0, // CGPA below this → academic probation
  probationHourCap: 12, // max registered hours while on probation
  // bylaw: «الفصل الدراسي مكون من 16 ساعة الحد الادني للدراسة لو طالب تحت المراقبة الاكاديمية يتم
  // تقليص الي 12 ساعة» — 16 is the normal floor; the 12 is the PENALTY, held separately in
  // probationHourCap. The platform had the penalty as the floor, so a 12-hour term looked legal.
  minRegHours: 16,
  maxRegHours: 21, // maximum hours in a regular term — bylaw: «يجوز زيادة عن 21 ساعة» for CGPA ≥ 3 / graduating
  summerMaxHours: 8, // maximum hours in a summer term — bylaw: «الفصل الصيفي … بحد اقصي 8 ساعات»
  // How many LEVELS a programme runs. Not derivable from Program.years: that is a count of YEARS,
  // and the bylaw needs a level the year count does not reach — «التخصص الفرعي الثاني … ويكون في
  // المستوي الخامس» on a four-year programme. «130 ساعة مقمسمه علي 8 فصول» is the term count.
  planLevelCount: 8,

  // ── Registration exceptions the bylaw grants, previously unexpressible ──────────────────────────
  // «العبء الدراسي يجوز زياده عن 21 ساعه ادا كان للطالب معدل تراكميا عاليا من 3 نقاط فاكثر او في
  // حالات التخرج» — an allowance above maxRegHours, not a replacement for it.
  overloadMinCgpa: 3.0, // the CGPA from which the extra load is permitted
  overloadMaxHours: 24, // the ceiling once the allowance applies
  overloadForGraduating: true, // «او في حالات التخرج» — a graduating student qualifies regardless of CGPA
  // «طلاب اللي عندهم تقدير اقل من 2 … يجوز لهم اعادة المواد الحاصلين فيهم علي تقدير راسب او مقبول
  // بشرط الا تتجاوز عدد ساعات معتمدة في الاعادة 17 ساعة معتمدة». A TOTAL allowance, not per term.
  repeatHoursCap: 17,
  repeatHoursCapCgpa: 2.0, // the CGPA below which the repeat allowance applies
  // «لا يجوز للطالب حصل علي تقدير C او اكثر اعاده دراسة المقرر» — the ceiling above which a course
  // may not be repeated at all. A GradeStatus code, so an institute with another ladder can set its own.
  repeatMaxGradeCode: 'C',
  // A student in one of these states may not register at all. Kept as a list so an institute can
  // decide whether, say, a suspended registration blocks or merely warns.
  blockedRegistrationStatuses: 'WITHDRAWN,DISMISSED,SUSPENDED',
  maxCourseAttempts: 3, // a course failed this many times blocks re-registration (repeated failure)
  maxConsecutiveProbation: 4, // bylaw: «اقل من 2 لمدة اربع فصول متتالية يتم فصله» (summer excluded)
  maxSeparateProbation: 4, // separate (non-consecutive) probation terms → same (excl. summer)
  // ---- مرتبة الشرف — the bylaw states FOUR conditions joined by «و», all of them required:
  // «لم يقل تقدير الفصلي عن 3.00 GPA وان يكون معدل تراكمي علي الاقل 3.33 والا يكون طالب رسب في اي
  //  مقرر دراسي خلال تسجيله في المعهد او المعهد المحول منه و ان يكون حاصل … خلال المدة الاعتادية
  //  للدراسة من ( 7-9 فصول دراسية اعتيادية )». They are ANDed in lib/standing.ts, never ORed.
  honorCgpa: 3.33, // … معدل تراكمي علي الاقل 3.33
  honorTermGpa: 3.0, // … لم يقل تقدير الفصلي عن 3.00 — required of EVERY regular term, not just the last
  // «خلال المدة الاعتادية للدراسة من ( 7-9 فصول دراسية اعتيادية )» — «خلال» is WITHIN, so the range
  // is a maximum duration; nothing in the sentence asks a student to SPEND seven terms. Shipping 7 as
  // a floor stripped the honour from the fastest graduate (6 regular terms + 2 summers can reach 130
  // hours at maxRegHours 21 / summerMaxHours 8). The floor key stays for an institute whose bylaw
  // really imposes a minimum residency — 0 = off, which is what this bylaw says.
  honorMinTerms: 0,
  honorMaxTerms: 9, // … ceiling on regular (non-summer) terms; 0 on either key disables that half
  // ---- الغياب والمواظبة — the bylaw names three EXPLICIT points, it does not derive them:
  // «اذا غاب بدون عذر مقبول هو 15% من مجموع ساعات مقررة يوجه له الانذار الاول ، الانذار الثاني عند
  //  نسبه 20% ، اما اذا وصل 25% غياب بدون عذر فيعتبر منسحب اجباري».
  absenceWarn1Percent: 15, // إنذار أول
  absenceWarn2Percent: 20, // إنذار ثانٍ
  absenceBanPercent: 25, // الحرمان / الانسحاب الإجباري
  // The bylaw contradicts itself on the operator: the prose says «وصل 25%» (reaching it is enough)
  // while جدول 3's FW row says «ازا زادت نسبه الغياب عن 25%». We ship the table's reading (strictly
  // greater — today's behaviour) and let the institute switch to «وصل» by turning this on.
  absenceBanInclusive: false,
  // Which result status the deprivation applies. جدول 3 gives the SAME trigger two outcomes:
  // FW «منسحب اجباري … ولا يدخل في معدل التراكمي» and DN «محروم … تتساوي مع راسب وتضاف الي معدل
  // تراكمي». Only FW is tied to the 25% number by the bylaw text, so FW is the default; an institute
  // whose bylaw deprives (محروم) instead sets 'DN'. Must match a GradeStatus.code.
  absenceBanStatusCode: 'FW',
  attendanceWarnThreshold: 85, // bylaw's FIRST intervention is at 15% absence = 85% attendance
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
  graduationHours: 130, // bylaw: «اجتياز عدد ساعات 130 ساعة مقسمة علي 8 فصول» (جدول 1 repeats it per specialisation)
  graduationMinCgpa: 2.0, // bylaw: «الحد الادني للتخرج نقطتين حتي يصل الي تقدير تراكمي 2 ويصبح مقبول ويتم التخرج» — 0 disables the gate
  // ---- جدول 4 «تقدير عام»: the OVERALL degree classification printed from the CGPA. One table for
  // the whole platform (transcript, graduates sheet, promotion/graduation batch) so two official
  // documents can never disagree about the same student. Bylaw rows, highest floor first:
  // ممتاز 3.40–4.00 · جيد جدا 3.00–3.39 · جيد 2.40–2.99 · مقبول 2.00–2.39 · ضعيف <2.00.
  // An institute types its OWN rows here — any number of bands, any Arabic names.
  cgpaGradeBands: [
    { minCgpa: 3.4, nameAr: 'ممتاز' },
    { minCgpa: 3.0, nameAr: 'جيد جداً' },
    { minCgpa: 2.4, nameAr: 'جيد' },
    { minCgpa: 2.0, nameAr: 'مقبول' },
    { minCgpa: 0, nameAr: 'ضعيف' },
  ] as { minCgpa: number; nameAr: string }[],
  // minimum EARNED credit hours to be promoted INTO each level
  levelMinHours: { 1: 0, 2: 26, 3: 58, 4: 92 } as Record<string, number>, // bylaw: 26 / 58 / 92 earned hours
  // ---- Traditional/annual system (النظام السنوي) — used only by ANNUAL programs (lib/annual.ts) ----
  annualPassPercent: 50, // per-subject pass threshold (%) = مقبول floor; below → راسب
  maxCarryOverSubjects: 2, // failed subjects ≤ this → له دور ثانٍ (makeup); more → باقٍ للإعادة
  annualExcellentMin: 85, // تقدير ممتاز ≥ this %
  annualVeryGoodMin: 75, // تقدير جيد جداً ≥ this %
  annualGoodMin: 60, // bylaw جدول 4: «جيد | اقل من 75% الي 60%»
};
export type Regulations = typeof DEFAULT_REGULATIONS;
export const REGULATIONS_KEY = 'institute.regulations';

/**
 * Who the bylaw is being read FOR. Every institute on a deployment types its own regulation
 * («كل معهد يدخل لائحته بيده»), so the Setting row is per-tenant: pass the AuthContext a route
 * already holds (`guard.ctx`), a bare universityId, `null` for the shared/platform row, or nothing
 * at all — in which case the tenant is taken from the current request (see resolveTenantId).
 */
export type RegulationsTenant = string | null | { universityId?: string | null };

/**
 * The tenant whose bylaw to read. A caller that already knows it passes it — cheapest, and the only
 * form that works outside a request. Otherwise it is taken from the ambient request: the tenant
 * context if a route opened one (lib/tenant-context), else the signed-in user's university. That
 * keeps the ~20 existing `getRegulations()` call sites tenant-correct without rewriting each one.
 */
async function resolveTenantId(tenant?: RegulationsTenant): Promise<string | null> {
  if (tenant === null) return null; // explicit: the shared row
  if (typeof tenant === 'string') return tenant || null;
  if (typeof tenant === 'object') return tenant.universityId ?? null;
  const ambient = getTenantCtx();
  if (ambient?.universityId) return ambient.universityId;
  const fromSession = await sessionUniversityId();
  if (fromSession) return fromSession;
  // Falling straight through to the shared row would SPLIT the platform the moment one institute
  // saves: student, parent and faculty accounts are created without a universityId, so their reads
  // would land on the untenanted row while staff reads landed on the tenant's — two different
  // bylaws for the same institute. On a single-tenant deployment (the normal case) there is exactly
  // one university, so resolve to it; only a genuinely multi-tenant deployment falls back to shared.
  return soleUniversityId();
}

/**
 * The only university on this deployment, or null when there are none or more than one.
 * Cached for the process: the answer changes only when a university is created, and this sits on
 * the read path of every bylaw lookup.
 */
let soleUniversityCache: { value: string | null } | null = null;
async function soleUniversityId(): Promise<string | null> {
  if (soleUniversityCache) return soleUniversityCache.value;
  try {
    const unis = await prisma.university.findMany({ select: { id: true }, take: 2 });
    soleUniversityCache = { value: unis.length === 1 ? unis[0].id : null };
  } catch {
    soleUniversityCache = { value: null }; // no DB (build/script) — the shared row is correct there
  }
  return soleUniversityCache.value;
}

/** The signed-in user's university, or null outside a request (a script, a seed, the build). */
async function sessionUniversityId(): Promise<string | null> {
  if (!process.env.NEXT_RUNTIME) return null; // not inside the Next server: no session to read
  try {
    // Imported lazily so a script/seed that only wants the defaults never pulls NextAuth in.
    const [{ getServerSession }, { authOptions }] = await Promise.all([import('next-auth'), import('@/lib/auth')]);
    const session = await getServerSession(authOptions);
    return (session?.user as { universityId?: string | null } | undefined)?.universityId ?? null;
  } catch {
    return null; // no request scope (prerender, background job) — fall back to the shared row
  }
}

/**
 * The Setting row holding this tenant's bylaw. EXPORTED so the settings API writes exactly the row
 * the engines read — one resolution rule, never two copies that drift apart.
 *
 * Resolution: the institute's OWN row wins; failing that the untenanted row every deployment
 * written before multi-tenancy has, so an institute that never saved keeps working. Another
 * tenant's row is never returned — that sharing was the bug this scoping exists to end.
 */
export async function findRegulationsRow(
  tenant?: RegulationsTenant,
): Promise<{ id: string; universityId: string | null; value: string } | null> {
  const universityId = await resolveTenantId(tenant);
  const rows = await prisma.setting.findMany({
    where: universityId
      ? { key: REGULATIONS_KEY, OR: [{ universityId }, { universityId: null }] }
      : { key: REGULATIONS_KEY },
    select: { id: true, universityId: true, value: true },
  });
  if (universityId) return rows.find((r) => r.universityId === universityId) ?? rows.find((r) => r.universityId === null) ?? null;
  // No tenant at all: the shared row, else the single row a pre-multi-tenant deployment has —
  // exactly the previous behaviour, so scripts and seeds keep reading the bylaw they read before.
  return rows.find((r) => r.universityId === null) ?? rows[0] ?? null;
}

export async function getRegulations(tenant?: RegulationsTenant): Promise<Regulations> {
  const row = await findRegulationsRow(tenant);
  if (!row) return DEFAULT_REGULATIONS;
  try {
    const parsed = JSON.parse(row.value);
    const merged = { ...DEFAULT_REGULATIONS, ...parsed, levelMinHours: { ...DEFAULT_REGULATIONS.levelMinHours, ...(parsed.levelMinHours || {}) } };
    // A saved bylaw that exempts EVERY component would leave a repeater with a denominator of zero —
    // scored 0% and stored as a fail on the credit path, stuck at «قيد الرصد» on the annual one. The
    // per-enrolment path is guarded at its API; this guards the bylaw path, wherever it was saved from.
    const exempt = String(merged.repeatExemptComponents ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    if (exempt.length >= 4) merged.repeatExemptComponents = DEFAULT_REGULATIONS.repeatExemptComponents;
    merged.cgpaGradeBands = normalizeGradeBands(parsed.cgpaGradeBands);
    return merged;
  } catch {
    return DEFAULT_REGULATIONS;
  }
}

/**
 * جدول 4 — the overall تقدير table, saved as free-form rows by the institute. A hand-typed table
 * arrives unsorted, with string numbers, and sometimes with blank rows the admin left behind, so it
 * is normalised into "highest floor first" before anyone reads it. An unusable table (nothing valid
 * left) falls back to the bylaw default rather than leaving every certificate blank.
 */
function normalizeGradeBands(raw: unknown): { minCgpa: number; nameAr: string }[] {
  if (!Array.isArray(raw)) return DEFAULT_REGULATIONS.cgpaGradeBands;
  const bands = raw
    .map((b) => ({ minCgpa: Number((b as { minCgpa?: unknown })?.minCgpa), nameAr: String((b as { nameAr?: unknown })?.nameAr ?? '').trim() }))
    .filter((b) => Number.isFinite(b.minCgpa) && b.nameAr.length > 0)
    .sort((a, b) => b.minCgpa - a.minCgpa);
  return bands.length ? bands : DEFAULT_REGULATIONS.cgpaGradeBands;
}

/** Printed where a CGPA matches no band in the institute's جدول 4 — «no تقدير», never a guessed one. */
export const NO_CGPA_GRADE = '—';

/**
 * The ONE overall-تقدير lookup for the platform (جدول 4). Every official document — بيان الحالة,
 * كشف الخريجين, كشف نتيجة المستوى, دفعة الترحيل/التخرج — must call this, so a graduate can never be
 * «ممتاز» on one sheet and «جيد جداً» on another. Bands are floors: the first whose floor the CGPA
 * reaches wins.
 *
 * Below EVERY floor there is no تقدير, so we print NO_CGPA_GRADE. We used to return the lowest band's
 * name, which promotes a failing graduate the moment an institute retypes the table: drop the «ضعيف»
 * row («ضعيف مش تقدير تخرج») and a CGPA of 1.20 matched nothing and came back «مقبول» — certified on
 * the ministry matrix, كشف الخريجين and بيان الحالة with no way to notice. A dash is auditable; a
 * wrong word is not. The shipped default keeps a 0-floor row, so nothing changes for this institute.
 */
export function cgpaGrade(cgpa: number, reg: Regulations): string {
  const bands = reg.cgpaGradeBands?.length ? reg.cgpaGradeBands : DEFAULT_REGULATIONS.cgpaGradeBands;
  for (const b of bands) if (cgpa >= b.minCgpa) return b.nameAr;
  return NO_CGPA_GRADE;
}

/**
 * Credit hours this student must earn to graduate. A per-programme total (Program.totalCreditHours,
 * 0 = unset) beats the institute-wide bylaw value — a 130 CH programme and a 160 CH programme can
 * live in one institute. Anything that stores or shows the requirement (standing, a graduation
 * request, a report) resolves it here instead of repeating a literal.
 */
export function resolveGraduationHours(programTotalCreditHours: number | null | undefined, reg: Regulations): number {
  return programTotalCreditHours && programTotalCreditHours > 0 ? programTotalCreditHours : reg.graduationHours;
}
