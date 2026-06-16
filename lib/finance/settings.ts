import prisma from '@/lib/prisma';

/**
 * Finance settings (Finance v2 — Phase 0). Per-tenant configuration stored as a JSON blob under
 * the `Setting` table key `finance.config`, mirroring `lib/regulations.ts`. Documented defaults
 * apply when unset — no hardcoded finance numbers in business logic. SECRETS (gateway keys, ETA
 * cert) never live here — those go in Vercel env.
 */
export const FINANCE_CONFIG_KEY = 'finance.config';

export const DEFAULT_FINANCE_SETTINGS = {
  currency: 'EGP',
  decimalScale: 4, // Decimal(18,4)
  displayDp: 2,
  rounding: 'HALF_UP',
  vatPercent: 14, // Egyptian standard VAT
  withholdingPercent: 0, // applied per vendor type at AP time
  taxRegistrationNumber: '', // for ETA e-invoicing
  // Fiscal calendar — configurable. Default: month granularity starting September (academic).
  // Statutory Egyptian tax year is Jan–Dec; an institute may run both — see finance-upgrade-plan §11.
  fiscal: { startMonth: 9, granularity: 'month' as 'month' | 'quarter' },
  numbering: {
    invoice: { prefix: 'INV-', padding: 6 },
    receipt: { prefix: 'REC-', padding: 6 },
    creditNote: { prefix: 'CN-', padding: 6 },
    journal: { prefix: 'JV-', padding: 6 },
  },
  billing: {
    lateFeePercent: 0,
    lateFeeFlat: 0,
    graceDays: 7,
    agingBuckets: [30, 60, 90] as number[],
  },
};
export type FinanceSettings = typeof DEFAULT_FINANCE_SETTINGS;

// Targeted deep-merge for the known nested objects (mirrors regulations.ts' levelMinHours merge).
function mergeConfig(base: FinanceSettings, over: Partial<FinanceSettings>): FinanceSettings {
  return {
    ...base,
    ...over,
    fiscal: { ...base.fiscal, ...(over.fiscal ?? {}) },
    numbering: {
      invoice: { ...base.numbering.invoice, ...(over.numbering?.invoice ?? {}) },
      receipt: { ...base.numbering.receipt, ...(over.numbering?.receipt ?? {}) },
      creditNote: { ...base.numbering.creditNote, ...(over.numbering?.creditNote ?? {}) },
      journal: { ...base.numbering.journal, ...(over.numbering?.journal ?? {}) },
    },
    billing: { ...base.billing, ...(over.billing ?? {}) },
  };
}

/** Load the effective finance settings for a tenant (null = platform/global default row). */
export async function getFinanceConfig(universityId?: string | null): Promise<FinanceSettings> {
  const row = await prisma.setting.findFirst({ where: { key: FINANCE_CONFIG_KEY, universityId: universityId ?? null } });
  if (!row) return DEFAULT_FINANCE_SETTINGS;
  try {
    return mergeConfig(DEFAULT_FINANCE_SETTINGS, JSON.parse(row.value) as Partial<FinanceSettings>);
  } catch {
    return DEFAULT_FINANCE_SETTINGS;
  }
}

/** Upsert the finance config JSON for a tenant. */
export async function saveFinanceConfig(universityId: string | null, patch: Partial<FinanceSettings>): Promise<void> {
  const current = await getFinanceConfig(universityId);
  const merged = mergeConfig(current, patch);
  const existing = await prisma.setting.findFirst({ where: { key: FINANCE_CONFIG_KEY, universityId: universityId ?? null } });
  if (existing) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value: JSON.stringify(merged) } });
  } else {
    await prisma.setting.create({ data: { universityId: universityId ?? null, key: FINANCE_CONFIG_KEY, value: JSON.stringify(merged) } });
  }
}
