/**
 * Finance v2 — Phase 2: seed a couple of demo fee-structure templates per tenant (idempotent).
 *   DATABASE_URL="<neon>" CONFIRM_PROD=1 npx tsx scripts/seed-fee-structures.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.env.CONFIRM_PROD === '1' || process.argv.includes('--apply');

const STRUCTURES = [
  {
    code: 'TUITION-L1', nameAr: 'مصروفات الفرقة الأولى', nameEn: 'Year 1 Tuition', level: 1,
    items: [
      { label: 'مصروفات دراسية', accountCode: '4100', amount: 20000, vatRate: 0 },
      { label: 'رسوم خدمات وأنشطة', accountCode: '4200', amount: 1500, vatRate: 0 },
      { label: 'تأمين', accountCode: '4200', amount: 500, vatRate: 0 },
    ],
  },
  {
    code: 'TUITION-L2', nameAr: 'مصروفات الفرقة الثانية', nameEn: 'Year 2 Tuition', level: 2,
    items: [
      { label: 'مصروفات دراسية', accountCode: '4100', amount: 22000, vatRate: 0 },
      { label: 'رسوم خدمات وأنشطة', accountCode: '4200', amount: 1500, vatRate: 0 },
    ],
  },
];

async function main() {
  console.log(`📦 Seed demo fee structures — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const unis = await prisma.university.findMany({ select: { id: true, slug: true } });
  const targets = unis.length ? unis : [{ id: null as unknown as string, slug: 'global' }];
  for (const u of targets) {
    for (const s of STRUCTURES) {
      const exists = await prisma.feeStructure.findFirst({ where: { universityId: u.id ?? null, code: s.code } });
      if (exists) { console.log(`  [${u.slug}] ${s.code} exists — skip`); continue; }
      if (!APPLY) { console.log(`  [${u.slug}] would create ${s.code} (${s.items.length} items)`); continue; }
      await prisma.feeStructure.create({
        data: {
          universityId: u.id ?? null, code: s.code, nameAr: s.nameAr, nameEn: s.nameEn, level: s.level, isActive: true,
          items: { create: s.items.map((it, i) => ({ ...it, order: i })) },
        },
      });
      console.log(`  [${u.slug}] created ${s.code}`);
    }
  }
  if (!APPLY) console.log('\nℹ️  Dry-run — re-run with CONFIRM_PROD=1 to write.');
}

main().catch((e) => { console.error('❌', e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
