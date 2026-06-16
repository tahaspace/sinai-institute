/**
 * Finance v2 — Phase 0: backfill universityId on the AR tables (FeeAccount/FeeItem/Payment),
 * which are the only finance models lacking tenant scoping. Resolution order per FeeAccount:
 *   student.universityId → student.department.universityId → (fallback) DEFAULT_UNIVERSITY_ID env → null.
 * FeeItem/Payment inherit from their FeeAccount. Idempotent (skips already-scoped rows). Rows that
 * cannot resolve a tenant are LEFT NULL and reported (do not flip to NOT NULL until they are fixed).
 *
 * SAFE BY DEFAULT: dry-run unless CONFIRM_PROD=1 (or --apply).
 *   DATABASE_URL="<neon>" npx tsx scripts/backfill-finance-tenant.ts            # preview
 *   DATABASE_URL="<neon>" CONFIRM_PROD=1 npx tsx scripts/backfill-finance-tenant.ts   # apply
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.env.CONFIRM_PROD === '1' || process.argv.includes('--apply');
const DEFAULT_UNIVERSITY_ID = process.env.DEFAULT_UNIVERSITY_ID || null; // single-tenant fallback

async function main() {
  console.log(`🏛️  Finance tenant backfill — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  const accounts = await prisma.feeAccount.findMany({
    include: { student: { include: { department: true } } },
  });

  let resolved = 0;
  let unresolved = 0;
  const accountTenant = new Map<string, string | null>();

  for (const a of accounts) {
    if (a.universityId) {
      accountTenant.set(a.id, a.universityId);
      continue;
    }
    const uni = a.student?.universityId ?? a.student?.department?.universityId ?? DEFAULT_UNIVERSITY_ID ?? null;
    accountTenant.set(a.id, uni);
    if (uni) resolved++;
    else unresolved++;
    if (APPLY && uni) {
      await prisma.feeAccount.update({ where: { id: a.id }, data: { universityId: uni } });
    }
  }

  // Inherit onto FeeItem + Payment from their account.
  let items = 0;
  let payments = 0;
  for (const [accountId, uni] of accountTenant) {
    if (!uni) continue;
    if (APPLY) {
      const ri = await prisma.feeItem.updateMany({ where: { accountId, universityId: null }, data: { universityId: uni } });
      const rp = await prisma.payment.updateMany({ where: { accountId, universityId: null }, data: { universityId: uni } });
      items += ri.count;
      payments += rp.count;
    } else {
      items += await prisma.feeItem.count({ where: { accountId, universityId: null } });
      payments += await prisma.payment.count({ where: { accountId, universityId: null } });
    }
  }

  console.log(`  FeeAccount: resolved=${resolved} unresolved=${unresolved} (left null)`);
  console.log(`  FeeItem ${APPLY ? 'scoped' : 'to-scope'}=${items} | Payment ${APPLY ? 'scoped' : 'to-scope'}=${payments}`);
  if (unresolved > 0) {
    console.log(`\n⚠️  ${unresolved} fee accounts have no resolvable tenant (student/department has no universityId).`);
    console.log('   Set DEFAULT_UNIVERSITY_ID for a single-tenant deployment, or fix those students, then re-run.');
  }
  if (!APPLY) console.log('\nℹ️  Dry-run — re-run with CONFIRM_PROD=1 to write.');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
