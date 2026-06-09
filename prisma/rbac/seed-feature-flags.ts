/**
 * P10 — seed the feature-flag catalog as ENABLED for every University, so the
 * admin grid shows accurate toggle states. Idempotent and NON-destructive: only
 * creates a row when one doesn't already exist (never re-enables an admin-disabled flag).
 *   DATABASE_URL="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public" \
 *     npx tsx prisma/rbac/seed-feature-flags.ts
 */
import { PrismaClient } from '@prisma/client';
import { FEATURE_FLAGS } from './catalog';

const url = process.env.DATABASE_URL || '';
if (!/(@(127\.0\.0\.1|localhost))[:/]/.test(url) && process.env.ALLOW_REMOTE_SEED !== '1') {
  console.error('\nRefusing to run: DATABASE_URL is not a local host. Test-only script.\n');
  process.exit(1);
}
const prisma = new PrismaClient();

async function main() {
  const universities = await prisma.university.findMany();
  let created = 0;
  for (const u of universities) {
    for (const f of FEATURE_FLAGS) {
      const existing = await prisma.featureFlag.findFirst({ where: { universityId: u.id, key: f.key } });
      if (!existing) {
        await prisma.featureFlag.create({ data: { universityId: u.id, key: f.key, enabled: true } });
        created += 1;
      }
    }
  }
  console.log(`seed-feature-flags OK: ${universities.length} universities, ${created} flag rows created (existing left untouched), total=${await prisma.featureFlag.count()}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
