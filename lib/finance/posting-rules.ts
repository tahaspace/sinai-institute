import prisma from '@/lib/prisma';

/**
 * Posting map (Finance v2 — Phase 1). How each business event maps to debit/credit ACCOUNT CODES.
 * Configurable per tenant via Setting key `finance.posting.map` (regulations.ts pattern); the
 * default below is for the default Chart of Accounts (lib/finance/coa.ts). The automatic event
 * posting in later phases (AR invoice/receipt, expense, payroll) resolves codes through here and
 * hands concrete lines to lib/finance/ledger.ts `postEvent`. VAT/withholding legs are added by the
 * tax layer (Phase 4) when an amount is present.
 */
export const POSTING_MAP_KEY = 'finance.posting.map';

export type PostingRule = { debit: string; credit: string };

export const DEFAULT_POSTING_MAP: Record<string, PostingRule> = {
  // AR
  INVOICE_ISSUE: { debit: '1100', credit: '4100' }, // Dr AR-students, Cr Tuition revenue
  SERVICE_FEE: { debit: '1100', credit: '4200' },
  SCHOLARSHIP_DISCOUNT: { debit: '4900', credit: '1100' }, // contra-revenue against AR
  RECEIPT_CASH: { debit: '1200', credit: '1100' }, // Dr cash, Cr AR
  RECEIPT_BANK: { debit: '1210', credit: '1100' },
  RECEIPT_GATEWAY: { debit: '1250', credit: '1100' }, // Dr gateway clearing, Cr AR
  GATEWAY_SETTLEMENT: { debit: '1210', credit: '1250' }, // clearing → bank on payout
  REFUND: { debit: '1100', credit: '1200' }, // reverse AR / pay cash back
  // AP / expense
  EXPENSE_BILL: { debit: '5900', credit: '2100' }, // Dr expense, Cr AP
  BILL_PAYMENT: { debit: '2100', credit: '1210' }, // Dr AP, Cr bank
  // Payroll
  PAYROLL_ACCRUE: { debit: '5100', credit: '2400' }, // Dr salaries, Cr salaries payable
  PAYROLL_PAY: { debit: '2400', credit: '1210' },
  // VAT
  VAT_OUTPUT: { debit: '1100', credit: '2200' }, // VAT charged on a sale (added to AR)
};

export async function getPostingMap(universityId?: string | null): Promise<Record<string, PostingRule>> {
  const row = await prisma.setting.findFirst({ where: { key: POSTING_MAP_KEY, universityId: universityId ?? null } });
  if (!row) return DEFAULT_POSTING_MAP;
  try {
    return { ...DEFAULT_POSTING_MAP, ...(JSON.parse(row.value) as Record<string, PostingRule>) };
  } catch {
    return DEFAULT_POSTING_MAP;
  }
}

/** Resolve the {debit, credit} account CODES for an event (throws if the event is unmapped). */
export async function resolveRule(universityId: string | null, event: string): Promise<PostingRule> {
  const map = await getPostingMap(universityId);
  const rule = map[event];
  if (!rule) throw new Error(`لا توجد قاعدة ترحيل للحدث: ${event}`);
  return rule;
}
