/**
 * Finance v2 — Phase 0: seed FiscalYear + 12 monthly AccountingPeriods per tenant for the
 * given year. Idempotent (skips a fiscal year that already exists). Calendar comes from the
 * finance settings (fiscal.startMonth; default September). Creates one fiscal year per existing
 * University; if there are no University rows, creates a single global (universityId=null) one
 * so a single-tenant deploy still gets periods.
 *
 * SAFE BY DEFAULT: dry-run unless CONFIRM_PROD=1 (or --apply).
 *   DATABASE_URL="<neon>" npx tsx scripts/seed-fiscal-periods.ts 2025            # preview year 2025
 *   DATABASE_URL="<neon>" CONFIRM_PROD=1 npx tsx scripts/seed-fiscal-periods.ts 2025
 */
import { PrismaClient } from '@prisma/client';
import { buildMonthlyPeriods, fiscalYearSpan } from '../lib/finance/periods';
import { getFinanceConfig } from '../lib/finance/settings';

const prisma = new PrismaClient();
const APPLY = process.env.CONFIRM_PROD === '1' || process.argv.includes('--apply');
const YEAR = parseInt(process.argv.find((a) => /^\d{4}$/.test(a)) || `${new Date().getUTCFullYear()}`, 10);

async function seedForTenant(universityId: string | null, label: string) {
  const cfg = await getFinanceConfig(universityId);
  const startMonth = cfg.fiscal.startMonth;
  const code = `${YEAR}`;

  const existing = await prisma.fiscalYear.findFirst({ where: { universityId: universityId ?? null, code } });
  if (existing) {
    console.log(`  [${label}] FY ${code} already exists — skipping`);
    return;
  }
  const span = fiscalYearSpan(YEAR, startMonth);
  const periods = buildMonthlyPeriods(YEAR, startMonth);
  console.log(`  [${label}] FY ${code} (start month ${startMonth}) → 12 periods ${periods[0].code}…${periods[11].code} ${APPLY ? '' : '(dry-run)'}`);
  if (!APPLY) return;

  const fy = await prisma.fiscalYear.create({
    data: { universityId: universityId ?? null, code, startDate: span.startDate, endDate: span.endDate, status: 'OPEN' },
  });
  for (const p of periods) {
    await prisma.accountingPeriod.create({
      data: { universityId: universityId ?? null, fiscalYearId: fy.id, code: p.code, startDate: p.startDate, endDate: p.endDate, status: 'OPEN' },
    });
  }
}

async function main() {
  console.log(`📅 Seed fiscal year ${YEAR} — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const universities = await prisma.university.findMany({ select: { id: true, slug: true } });
  if (universities.length === 0) {
    await seedForTenant(null, 'global');
  } else {
    for (const u of universities) await seedForTenant(u.id, u.slug);
  }
  if (!APPLY) console.log('\nℹ️  Dry-run — re-run with CONFIRM_PROD=1 to write.');
  else console.log('\n✅ Fiscal periods seeded.');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
