import prisma from '@/lib/prisma';

/**
 * Server half of the dual-academic-system module: the resolvers that read the database.
 * Types, labels and the pure where-fragment builders live in `lib/academic-system-shared.ts` (no
 * Prisma import, so client components can use them) and are re-exported here, so every existing
 * server-side import of this module keeps working unchanged.
 */
export type { AcademicSystem } from '@/lib/academic-system-shared';
export {
  ACADEMIC_SYSTEM_LABELS,
  normalizeSystem,
  normalizeSystemFilter,
  academicSystemWhere,
  studentSystemWhere,
  programSystemWhere,
} from '@/lib/academic-system-shared';

import { normalizeSystem } from '@/lib/academic-system-shared';
import type { AcademicSystem } from '@/lib/academic-system-shared';

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
