/**
 * Finance v2 — Phase 1: seed the default Chart of Accounts per tenant (idempotent).
 *   DATABASE_URL="<neon>" npx tsx scripts/seed-coa.ts           # preview
 *   DATABASE_URL="<neon>" CONFIRM_PROD=1 npx tsx scripts/seed-coa.ts
 */
import { PrismaClient } from '@prisma/client';
import { seedChartOfAccounts, DEFAULT_COA } from '../lib/finance/coa';

const prisma = new PrismaClient();
const APPLY = process.env.CONFIRM_PROD === '1' || process.argv.includes('--apply');

async function main() {
  console.log(`📒 Seed default Chart of Accounts (${DEFAULT_COA.length} accounts) — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const universities = await prisma.university.findMany({ select: { id: true, slug: true } });
  const targets = universities.length ? universities : [{ id: null as unknown as string, slug: 'global' }];
  for (const u of targets) {
    if (!APPLY) {
      const existing = await prisma.chartOfAccount.count({ where: { universityId: u.id ?? null } });
      console.log(`  [${u.slug}] existing accounts=${existing} → would ensure ${DEFAULT_COA.length} (dry-run)`);
      continue;
    }
    const created = await seedChartOfAccounts(u.id ?? null);
    console.log(`  [${u.slug}] created ${created} new accounts (idempotent)`);
  }
  if (!APPLY) console.log('\nℹ️  Dry-run — re-run with CONFIRM_PROD=1 to write.');
  else console.log('\n✅ Chart of Accounts seeded.');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
