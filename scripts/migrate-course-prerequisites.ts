/**
 * Phase 1 of the prerequisite migration: copy every pair held in the OLD implicit
 * many-to-many `Course.prerequisites` into the new `CoursePrerequisite` model, which is
 * the only one that can carry the bylaw's «حصول علي تقدير جيد في اللغة الاجنيبيه الاولي
 * المتخصصه» — a MINIMUM GRADE, not a bare pass.
 *
 * The old relation is deliberately NOT deleted: lib/registration.ts still falls back to it
 * for any pair that was not copied, and dropping it is a separate, later step once this copy
 * is verified in production.
 *
 * Idempotent — safe to run twice. Existing rows are left exactly as they are (a minGradeCode
 * typed by the registrar is never overwritten by a blind re-copy).
 *
 *   npx tsx scripts/migrate-course-prerequisites.ts          # copy
 *   npx tsx scripts/migrate-course-prerequisites.ts --dry    # report only
 */
import prisma from '../lib/prisma';

async function main() {
  const dry = process.argv.includes('--dry');

  const courses = await prisma.course.findMany({
    select: { id: true, code: true, universityId: true, prerequisites: { select: { id: true, code: true } } },
  });

  const pairs = courses.flatMap((c) =>
    c.prerequisites.map((p) => ({ courseId: c.id, prerequisiteId: p.id, universityId: c.universityId, label: `${c.code} ← ${p.code}` })),
  );
  console.log(`pairs in the legacy relation: ${pairs.length}`);

  let created = 0;
  let skipped = 0;
  for (const pair of pairs) {
    // The unique key carries universityId: a Course row may be shared, so two institutes each hold
    // their own rule for the same pair. Matching on the pair alone would treat one institute's rule
    // as another's and skip the copy.
    const existing = await prisma.coursePrerequisite.findFirst({
      where: {
        courseId: pair.courseId,
        prerequisiteId: pair.prerequisiteId,
        universityId: pair.universityId ?? null,
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }
    if (dry) {
      console.log(`would create: ${pair.label}`);
      created++;
      continue;
    }
    // minGradeCode stays null = "a pass is enough", i.e. exactly what the legacy relation meant.
    // The registrar raises it per rule (ENG 101 → جيد for الإرشاد السياحي) from the courses screen.
    await prisma.coursePrerequisite.create({
      data: { courseId: pair.courseId, prerequisiteId: pair.prerequisiteId, universityId: pair.universityId ?? null },
    });
    created++;
    console.log(`created: ${pair.label}`);
  }

  console.log(`${dry ? '[dry] ' : ''}created ${created}, already present ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
