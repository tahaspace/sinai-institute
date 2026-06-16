/**
 * Finance v2 — Phase 0: backfill Float money → Decimal(18,4) SHADOW columns.
 *
 * SAFE BY DEFAULT: dry-run unless CONFIRM_PROD=1 (or --apply). Idempotent (only fills rows whose
 * Decimal col is still null). Prints Expected (Float sum) vs Actual (Decimal sum) vs Δ per model
 * and HALTS if any Δ exceeds tolerance. Never drops the Float columns — that is a later phase
 * after a reconcile window. Run against the deploy DB (Neon) only AFTER a backup.
 *
 *   # preview only:
 *   DATABASE_URL="<neon>" npx tsx scripts/backfill-money-decimal.ts
 *   # apply:
 *   DATABASE_URL="<neon>" CONFIRM_PROD=1 npx tsx scripts/backfill-money-decimal.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.env.CONFIRM_PROD === '1' || process.argv.includes('--apply');
const TOLERANCE = 0.01; // per-model rounding tolerance (EGP)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Delegate = any;

// Map each model to (Float field → Decimal shadow field) pairs.
const MODELS: { name: string; delegate: () => Delegate; pairs: [string, string][] }[] = [
  { name: 'FeeAccount', delegate: () => prisma.feeAccount, pairs: [['totalFees', 'totalFeesDec']] },
  { name: 'FeeItem', delegate: () => prisma.feeItem, pairs: [['amount', 'amountDec']] },
  { name: 'Payment', delegate: () => prisma.payment, pairs: [['amount', 'amountDec']] },
  { name: 'Scholarship', delegate: () => prisma.scholarship, pairs: [['amount', 'amountDec']] },
  { name: 'Payroll', delegate: () => prisma.payroll, pairs: [['baseSalary', 'baseSalaryDec'], ['deductions', 'deductionsDec'], ['netSalary', 'netSalaryDec']] },
  { name: 'BankAccount', delegate: () => prisma.bankAccount, pairs: [['balance', 'balanceDec']] },
  { name: 'BankTransaction', delegate: () => prisma.bankTransaction, pairs: [['amount', 'amountDec']] },
];

async function backfill(model: (typeof MODELS)[number]): Promise<{ ok: boolean; rows: number; floatSum: number; decSum: number }> {
  const d = model.delegate();
  const rows = await d.findMany();
  let updated = 0;
  let floatSum = 0;
  let decSum = 0;

  for (const row of rows) {
    const data: Record<string, Prisma.Decimal> = {};
    for (const [f, dec] of model.pairs) {
      const fv = Number(row[f] ?? 0);
      floatSum += fv;
      if (row[dec] == null) {
        data[dec] = new Prisma.Decimal(fv);
      }
    }
    if (APPLY && Object.keys(data).length) {
      await d.update({ where: { id: row.id }, data });
      updated++;
    }
  }

  // Recompute decimal sum from the (now or already) populated decimal columns.
  const after = APPLY ? await d.findMany() : rows;
  for (const row of after) {
    for (const [f, dec] of model.pairs) {
      const dv = row[dec] != null ? Number(row[dec]) : Number(row[f] ?? 0); // dry-run: project from float
      decSum += dv;
    }
  }

  const delta = Math.abs(floatSum - decSum);
  const ok = delta <= TOLERANCE;
  console.log(
    `  ${model.name.padEnd(16)} rows=${rows.length} ${APPLY ? `updated=${updated}` : '(dry-run)'} ` +
      `| Float Σ=${floatSum.toFixed(2)} Decimal Σ=${decSum.toFixed(2)} Δ=${delta.toFixed(4)} ${ok ? '✅' : '❌ MISMATCH'}`,
  );
  return { ok, rows: rows.length, floatSum, decSum };
}

async function main() {
  console.log(`💱 Money Float→Decimal backfill — mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}`);
  console.log(`   DB host: ${(process.env.DATABASE_URL || '').replace(/:\/\/[^:]+:[^@]+@/, '://****@').slice(0, 80)}`);
  let allOk = true;
  for (const m of MODELS) {
    const r = await backfill(m);
    if (!r.ok) allOk = false;
  }
  if (!allOk) {
    console.error('\n❌ Reconciliation MISMATCH on at least one model — investigate before dropping Float columns.');
    process.exit(1);
  }
  console.log(`\n${APPLY ? '✅ Backfill applied' : 'ℹ️  Dry-run complete'} — all models reconcile within ${TOLERANCE} EGP.`);
  if (!APPLY) console.log('   Re-run with CONFIRM_PROD=1 to write (after a Neon backup).');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
