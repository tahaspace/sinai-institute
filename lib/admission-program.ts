import prisma from '@/lib/prisma';

/**
 * Resolving an application to a real Program.
 *
 * An applicant types their choices as free text (Application.firstChoice…), but the academic system
 * — credit-hours vs annual — lives on Program.academicSystem. Without a resolved programId an
 * application can't be reported on by system, and worse, the Student created at enrolment inherits
 * no program and silently defaults to credit-hours. This is the single place that resolution
 * happens, so both the applicant-facing create and the staff review use identical matching.
 *
 * Matching is deliberately conservative: an exact (trimmed) name match only. An ambiguous or
 * unrecognised choice returns null and the application simply keeps its free text, rather than
 * being filed under a program nobody chose.
 */
export async function resolveApplicationProgramId(
  choice: string | null | undefined,
  explicitProgramId?: string | null,
): Promise<string | null> {
  if (explicitProgramId) return explicitProgramId; // staff picked it — always wins
  const name = (choice ?? '').trim();
  if (!name) return null;
  const matches = await prisma.program.findMany({
    where: { OR: [{ nameAr: name }, { nameEn: name }] },
    select: { id: true },
    take: 2,
  });
  return matches.length === 1 ? matches[0].id : null; // ambiguous → leave unresolved
}
