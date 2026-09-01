/**
 * One-off backfill: resolve Application.programId for rows created before the FK existed.
 *
 * Applications stored the applicant's choice as free text only, so historical rows have no link to
 * Program.academicSystem and fall outside the admissions system filter. This matches each unresolved
 * row's firstChoice to a program by exact name and fills the FK. Rows whose choice is ambiguous or
 * unrecognised are left alone and reported — guessing would file an applicant under a programme
 * nobody selected.
 *
 * Read-only unless --apply is passed.
 *
 *   npx tsx scripts/backfill-application-program.ts            # dry run
 *   npx tsx scripts/backfill-application-program.ts --apply    # write
 */
import prisma from '@/lib/prisma';
import { resolveApplicationProgramId } from '@/lib/admission-program';

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = await prisma.application.findMany({
    where: { programId: null },
    select: { id: true, fullName: true, firstChoice: true },
  });

  const resolved: { id: string; programId: string }[] = [];
  const unresolved: string[] = [];
  for (const r of rows) {
    const programId = await resolveApplicationProgramId(r.firstChoice);
    if (programId) resolved.push({ id: r.id, programId });
    else unresolved.push(`${r.fullName} → "${r.firstChoice}"`);
  }

  console.log(`unlinked applications: ${rows.length}`);
  console.log(`  resolvable:   ${resolved.length}`);
  console.log(`  unresolvable: ${unresolved.length}`);
  for (const u of unresolved.slice(0, 20)) console.log(`    · ${u}`);
  if (unresolved.length > 20) console.log(`    … and ${unresolved.length - 20} more`);

  if (!apply) {
    console.log('\ndry run — pass --apply to write');
  } else {
    for (const r of resolved) await prisma.application.update({ where: { id: r.id }, data: { programId: r.programId } });
    console.log(`\napplied: ${resolved.length} updated`);
  }
  await prisma.$disconnect();
}

main();
