/**
 * Applicable grade components — the single shared answer to "which of the four marks actually
 * count for THIS student in THIS course, and out of how much?".
 *
 * Both grading engines need it and neither may duplicate it:
 *   · lib/annual.ts  — courseTotalPct's numerator AND denominator (النسبة/التقدير السنوي)
 *   · lib/gpa.ts     — the credit letter's denominator (deriveGradeCode)
 *
 * WHY: a repeating student (طالب عايد) is barred from أعمال السنة and is examined on التحريري +
 * العملي only. Measuring the 70 marks he can earn against a 100-mark denominator makes مقبول
 * arithmetically unreachable. A course legitimately split practical + written with NO coursework
 * needs nothing extra here: its midtermMax/homeworkMax are already 0, and a max of 0 has never
 * been part of the denominator.
 *
 * Precedence (deliberate):
 *   1. Enrollment.excludedComponents — a NON-NULL value wins, including the empty string, which
 *      is how the control desk says "this repeater is NOT exempt after all".
 *   2. null/undefined → the bylaw default (Regulations.repeatExemptComponents) but only from the
 *      SECOND attempt onward (attemptNo > 1).
 *   3. Otherwise: nothing excluded — exactly the behaviour before this module existed.
 */

export type ComponentKey = 'midterm' | 'final' | 'practical' | 'homework';

export const COMPONENT_KEYS: ComponentKey[] = ['midterm', 'final', 'practical', 'homework'];

// Arabic labels, matching the column headers already shipped on the grade-entry screen.
export const COMPONENT_LABELS_AR: Record<ComponentKey, string> = {
  midterm: 'أعمال الفصل',
  final: 'التحريري',
  practical: 'العملي',
  homework: 'أعمال السنة',
};

export type CourseComponentMaxes = {
  midtermMax: number;
  finalMax: number;
  practicalMax: number;
  homeworkMax: number;
};

export type ComponentApplicabilityInput = {
  // CSV of midterm|final|practical|homework; null/undefined = "not decided for this enrolment"
  excludedComponents?: string | null;
  attemptNo?: number | null;
  // The student's academic system. The BYLAW default only ever applies to the traditional term system:
  // barring a repeater from أعمال السنة is a يعيد-السنة rule. Under credit hours the student simply
  // re-registers the course — and may take one from an earlier level entirely — so there is nothing to
  // bar him from. Undefined behaves as credit-hours, matching normalizeSystem everywhere else.
  academicSystem?: string | null;
};

export type ComponentApplicability = {
  applicable: Record<ComponentKey, boolean>;
  applicableKeys: ComponentKey[];
  // Keys whose recorded mark still counts in the NUMERATOR: everything not deliberately excluded.
  // A component with max = 0 stays here so that, with no exclusions, the sum is byte-for-byte the
  // "add all four marks" the engines did before this module existed.
  countedKeys: ComponentKey[];
  excludedKeys: ComponentKey[]; // excluded by decision (not merely max = 0)
  maxTotal: number; // denominator: Σ max over the applicable components
  source: 'enrollment' | 'bylaw' | 'none'; // where the exclusions came from
};

export function maxOf(course: CourseComponentMaxes, k: ComponentKey): number {
  switch (k) {
    case 'midterm': return course.midtermMax;
    case 'final': return course.finalMax;
    case 'practical': return course.practicalMax;
    case 'homework': return course.homeworkMax;
  }
}

/** Parse a components CSV into a de-duplicated, validated key list. Unknown tokens are ignored. */
export function parseComponentCsv(csv: string | null | undefined): ComponentKey[] {
  if (!csv) return [];
  const out: ComponentKey[] = [];
  for (const raw of csv.split(',')) {
    const t = raw.trim() as ComponentKey;
    if (COMPONENT_KEYS.includes(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

export function toComponentCsv(keys: ComponentKey[]): string {
  return COMPONENT_KEYS.filter((k) => keys.includes(k)).join(',');
}

/**
 * Which components apply, and the denominator they add up to.
 * With no per-enrolment CSV and an empty `repeatExemptComponents` bylaw (the default) this
 * returns every component whose max > 0 — i.e. today's denominator, unchanged.
 *
 * The per-enrolment CSV is available under BOTH systems — it is the control desk's case-by-case
 * decision. The bylaw default is annual-only; see ComponentApplicabilityInput.academicSystem.
 */
export function resolveApplicableComponents(
  e: ComponentApplicabilityInput | null | undefined,
  course: CourseComponentMaxes,
  reg?: { repeatExemptComponents?: string | null } | null,
): ComponentApplicability {
  let excluded: ComponentKey[] = [];
  let source: ComponentApplicability['source'] = 'none';
  if (e?.excludedComponents != null) {
    excluded = parseComponentCsv(e.excludedComponents);
    source = 'enrollment';
  } else if ((e?.attemptNo ?? 1) > 1 && e?.academicSystem === 'ANNUAL') {
    const byLaw = parseComponentCsv(reg?.repeatExemptComponents);
    if (byLaw.length) {
      excluded = byLaw;
      source = 'bylaw';
    }
  }

  const applicable = { midterm: false, final: false, practical: false, homework: false } as Record<ComponentKey, boolean>;
  let maxTotal = 0;
  for (const k of COMPONENT_KEYS) {
    const m = maxOf(course, k);
    const ok = m > 0 && !excluded.includes(k);
    applicable[k] = ok;
    if (ok) maxTotal += m;
  }
  return {
    applicable,
    applicableKeys: COMPONENT_KEYS.filter((k) => applicable[k]),
    countedKeys: COMPONENT_KEYS.filter((k) => !excluded.includes(k)),
    // report only exclusions that actually removed marks from the denominator
    excludedKeys: excluded.filter((k) => maxOf(course, k) > 0),
    maxTotal,
    source,
  };
}
