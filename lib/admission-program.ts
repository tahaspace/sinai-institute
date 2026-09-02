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
 * Matching is deliberately conservative. An exact (trimmed) name wins outright; failing that, a
 * containment match is accepted ONLY when exactly one programme matches — real applications say
 * «علوم الحاسب» where the programme is «بكالوريوس علوم الحاسب», and refusing that leaves every
 * historic row unlinked. The moment two programmes could match, it returns null: an application
 * filed under a programme nobody chose is worse than one left unlinked, and staff can always set it
 * explicitly at review.
 */
export async function resolveApplicationProgramId(
  choice: string | null | undefined,
  explicitProgramId?: string | null,
): Promise<string | null> {
  if (explicitProgramId) return explicitProgramId; // staff picked it — always wins
  const name = (choice ?? '').trim();
  if (!name) return null;
  const exact = await prisma.program.findMany({
    where: { OR: [{ nameAr: name }, { nameEn: name }] },
    select: { id: true },
    take: 2,
  });
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null; // two programmes share the name — refuse to pick

  // Containment, both directions: the choice may be shorter than the programme name («علوم الحاسب»
  // vs «بكالوريوس علوم الحاسب») or longer. Case-insensitive for the Latin names.
  const loose = await prisma.program.findMany({
    where: {
      OR: [
        { nameAr: { contains: name, mode: 'insensitive' } },
        { nameEn: { contains: name, mode: 'insensitive' } },
      ],
    },
    select: { id: true, nameAr: true, nameEn: true },
    take: 3,
  });
  if (loose.length === 1) return loose[0].id;
  if (loose.length > 1) return null;

  const all = await prisma.program.findMany({ select: { id: true, nameAr: true, nameEn: true } });
  const reverse = all.filter(
    (p) => name.includes(p.nameAr) || (p.nameEn ? name.toLowerCase().includes(p.nameEn.toLowerCase()) : false),
  );
  return reverse.length === 1 ? reverse[0].id : null;
}
