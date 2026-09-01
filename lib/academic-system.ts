import prisma from '@/lib/prisma';

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

/** The academic system of a program (CREDIT_HOURS when unknown/unset). */
export async function getProgramSystem(programId: string | null | undefined): Promise<AcademicSystem> {
  if (!programId) return 'CREDIT_HOURS';
  const p = await prisma.program.findUnique({ where: { id: programId }, select: { academicSystem: true } });
  return normalizeSystem(p?.academicSystem);
}

/** The academic system a student falls under, via their program. */
export async function resolveStudentSystem(studentId: string): Promise<AcademicSystem> {
  const s = await prisma.student.findUnique({ where: { id: studentId }, select: { programId: true } });
  return getProgramSystem(s?.programId ?? null);
}

/**
 * Batch resolver — the system for MANY students at once (one query, no N+1).
 * Bulk engines (standing, promotion, reports) call this, then branch each student
 * with the map. Students with no program default to CREDIT_HOURS (normalizeSystem).
 */
export async function resolveStudentSystems(studentIds: string[]): Promise<Map<string, AcademicSystem>> {
  if (!studentIds.length) return new Map();
  const rows = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, program: { select: { academicSystem: true } } },
  });
  return new Map(rows.map((s) => [s.id, normalizeSystem(s.program?.academicSystem)]));
}

/** Split a set of student ids into the two systems — convenience for callers that route each half. */
export async function partitionStudentsBySystem(studentIds: string[]): Promise<{ credit: string[]; annual: string[] }> {
  const map = await resolveStudentSystems(studentIds);
  const credit: string[] = [];
  const annual: string[] = [];
  for (const id of studentIds) (map.get(id) === 'ANNUAL' ? annual : credit).push(id);
  return { credit, annual };
}
