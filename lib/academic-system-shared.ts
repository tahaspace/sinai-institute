/**
 * Client-safe half of the dual-academic-system module: types, labels and PURE where-fragment
 * builders, with no Prisma import.
 *
 * It is split out because `lib/academic-system.ts` imports the Prisma client for its resolvers, and a
 * client component importing anything from that file drags the server bundle into the browser — which
 * fails the production build outright (Turbopack chunk generation). Client components import from
 * here; server code can keep importing from `lib/academic-system.ts`, which re-exports all of this.
 */
/**
 * Dual academic system (Phase 1). A program is either the credit-hour system (نظام الساعات المعتمدة)
 * or the traditional/annual system (النظام السنوي/العادي). Mode is stored per Program
 * (`Program.academicSystem`); everything academic resolves the mode from the program. Defaults to
 * CREDIT_HOURS so existing programs are unaffected. Later phases branch grading/reports on this.
 */
export type AcademicSystem = 'CREDIT_HOURS' | 'ANNUAL';

export const ACADEMIC_SYSTEM_LABELS: Record<AcademicSystem, string> = {
  CREDIT_HOURS: 'نظام الساعات المعتمدة',
  ANNUAL: 'النظام السنوي (العادي)',
};

/** Coerce any stored/incoming value to a valid AcademicSystem (defaults to credit-hours). */
export function normalizeSystem(v: string | null | undefined): AcademicSystem {
  return v === 'ANNUAL' ? 'ANNUAL' : 'CREDIT_HOURS';
}

/**
 * Coerce a *filter* value. Unlike normalizeSystem this keeps "all"/empty as undefined so a
 * missing or 'all' filter means EVERYTHING — the display filter must never auto-hide rows.
 */
export function normalizeSystemFilter(v: string | null | undefined): AcademicSystem | undefined {
  if (v === 'ANNUAL' || v === 'CREDIT_HOURS') return v;
  return undefined; // '', 'all', null, anything else → no filtering
}

// ───────────────────────── Shared where-fragments (the ONE filter primitive) ─────────────────────────
// Three shapes cover every list in the platform. Pass `undefined` for "الكل" and you get `{}` —
// i.e. no filtering at all, which is the required default everywhere (Finance included).

/** STUDENT-scoped: use on any `prisma.student` query. */
export function academicSystemWhere(system?: AcademicSystem | null): Record<string, unknown> {
  if (!system) return {};
  return system === 'ANNUAL'
    ? { program: { academicSystem: 'ANNUAL' } }
    // credit-hours is the default, so students with no program count as credit-hours
    : { OR: [{ program: { academicSystem: 'CREDIT_HOURS' } }, { programId: null }] };
}

/** ENROLLMENT-scoped: use on any model that has a `student` relation (Enrollment, Invoice, Hold…). */
export function studentSystemWhere(system?: AcademicSystem | null): Record<string, unknown> {
  return system ? { student: academicSystemWhere(system) } : {};
}

/** PROGRAM-scoped: use on `prisma.program` queries. */
export function programSystemWhere(system?: AcademicSystem | null): Record<string, unknown> {
  return system ? { academicSystem: system } : {};
}

