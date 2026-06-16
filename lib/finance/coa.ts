import prisma from '@/lib/prisma';

/**
 * Chart of Accounts (Finance v2 — Phase 1). A configurable default COA for an Egyptian higher-ed
 * institute (IFRS-lite education template). Header accounts (1/2/3/4/5) aggregate; leaf accounts
 * post. Tenant-scoped, code-unique. The posting map (lib/finance/posting-rules.ts) references
 * these codes, so keep the canonical codes stable.
 */
export type CoaSeed = {
  code: string;
  nameAr: string;
  nameEn: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalSide: 'DEBIT' | 'CREDIT';
  parent?: string;
  isPostable?: boolean;
};

export const DEFAULT_COA: CoaSeed[] = [
  // 1 — Assets (debit normal)
  { code: '1', nameAr: 'الأصول', nameEn: 'Assets', type: 'ASSET', normalSide: 'DEBIT', isPostable: false },
  { code: '1100', nameAr: 'مدينون - طلاب (ذمم مدينة)', nameEn: 'Accounts Receivable — Students', type: 'ASSET', normalSide: 'DEBIT', parent: '1' },
  { code: '1200', nameAr: 'النقدية بالخزينة', nameEn: 'Cash on Hand', type: 'ASSET', normalSide: 'DEBIT', parent: '1' },
  { code: '1210', nameAr: 'البنك', nameEn: 'Bank', type: 'ASSET', normalSide: 'DEBIT', parent: '1' },
  { code: '1250', nameAr: 'حساب وسيط - بوابة الدفع', nameEn: 'Payment Gateway Clearing', type: 'ASSET', normalSide: 'DEBIT', parent: '1' },
  { code: '1300', nameAr: 'مصروفات مدفوعة مقدمًا', nameEn: 'Prepaid Expenses', type: 'ASSET', normalSide: 'DEBIT', parent: '1' },
  { code: '1900', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: 'ASSET', normalSide: 'DEBIT', parent: '1' },
  // 2 — Liabilities (credit normal)
  { code: '2', nameAr: 'الخصوم', nameEn: 'Liabilities', type: 'LIABILITY', normalSide: 'CREDIT', isPostable: false },
  { code: '2100', nameAr: 'دائنون - موردون (ذمم دائنة)', nameEn: 'Accounts Payable — Vendors', type: 'LIABILITY', normalSide: 'CREDIT', parent: '2' },
  { code: '2200', nameAr: 'ضريبة القيمة المضافة المستحقة', nameEn: 'VAT Payable', type: 'LIABILITY', normalSide: 'CREDIT', parent: '2' },
  { code: '2300', nameAr: 'ضريبة الخصم والإضافة المستحقة', nameEn: 'Withholding Tax Payable', type: 'LIABILITY', normalSide: 'CREDIT', parent: '2' },
  { code: '2400', nameAr: 'رواتب مستحقة', nameEn: 'Salaries Payable', type: 'LIABILITY', normalSide: 'CREDIT', parent: '2' },
  { code: '2500', nameAr: 'إيرادات مقدمة (مصروفات دراسية)', nameEn: 'Deferred Tuition', type: 'LIABILITY', normalSide: 'CREDIT', parent: '2' },
  // 3 — Equity (credit normal)
  { code: '3', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: 'EQUITY', normalSide: 'CREDIT', isPostable: false },
  { code: '3100', nameAr: 'رأس المال', nameEn: 'Capital', type: 'EQUITY', normalSide: 'CREDIT', parent: '3' },
  { code: '3900', nameAr: 'الفائض المُرحّل', nameEn: 'Retained Surplus', type: 'EQUITY', normalSide: 'CREDIT', parent: '3' },
  // 4 — Revenue (credit normal)
  { code: '4', nameAr: 'الإيرادات', nameEn: 'Revenue', type: 'REVENUE', normalSide: 'CREDIT', isPostable: false },
  { code: '4100', nameAr: 'إيرادات المصروفات الدراسية', nameEn: 'Tuition Revenue', type: 'REVENUE', normalSide: 'CREDIT', parent: '4' },
  { code: '4200', nameAr: 'إيرادات رسوم الخدمات', nameEn: 'Service Fees Revenue', type: 'REVENUE', normalSide: 'CREDIT', parent: '4' },
  { code: '4300', nameAr: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'REVENUE', normalSide: 'CREDIT', parent: '4' },
  { code: '4900', nameAr: 'منح وخصومات (إيراد مقابل)', nameEn: 'Scholarships & Discounts (contra)', type: 'REVENUE', normalSide: 'DEBIT', parent: '4' },
  // 5 — Expenses (debit normal)
  { code: '5', nameAr: 'المصروفات', nameEn: 'Expenses', type: 'EXPENSE', normalSide: 'DEBIT', isPostable: false },
  { code: '5100', nameAr: 'الرواتب والأجور', nameEn: 'Salaries & Wages', type: 'EXPENSE', normalSide: 'DEBIT', parent: '5' },
  { code: '5200', nameAr: 'المرافق', nameEn: 'Utilities', type: 'EXPENSE', normalSide: 'DEBIT', parent: '5' },
  { code: '5300', nameAr: 'الصيانة', nameEn: 'Maintenance', type: 'EXPENSE', normalSide: 'DEBIT', parent: '5' },
  { code: '5400', nameAr: 'المستلزمات', nameEn: 'Supplies', type: 'EXPENSE', normalSide: 'DEBIT', parent: '5' },
  { code: '5900', nameAr: 'مصروفات أخرى', nameEn: 'Other Expenses', type: 'EXPENSE', normalSide: 'DEBIT', parent: '5' },
];

/** Idempotently seed the default COA for a tenant (resolves parentId by code). Returns count created. */
export async function seedChartOfAccounts(universityId: string | null, template: CoaSeed[] = DEFAULT_COA): Promise<number> {
  let created = 0;
  // Two passes: create rows first (no parent), then wire parentId by code.
  for (const a of template) {
    const exists = await prisma.chartOfAccount.findFirst({ where: { universityId: universityId ?? null, code: a.code } });
    if (exists) continue;
    await prisma.chartOfAccount.create({
      data: {
        universityId: universityId ?? null,
        code: a.code,
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        type: a.type,
        normalSide: a.normalSide,
        isPostable: a.isPostable ?? true,
      },
    });
    created++;
  }
  // wire parents
  for (const a of template) {
    if (!a.parent) continue;
    const [child, parent] = await Promise.all([
      prisma.chartOfAccount.findFirst({ where: { universityId: universityId ?? null, code: a.code } }),
      prisma.chartOfAccount.findFirst({ where: { universityId: universityId ?? null, code: a.parent } }),
    ]);
    if (child && parent && child.parentId !== parent.id) {
      await prisma.chartOfAccount.update({ where: { id: child.id }, data: { parentId: parent.id } });
    }
  }
  return created;
}

/** Look up a postable account id by code (throws if missing/non-postable) — used by the posting engine. */
export async function accountIdByCode(universityId: string | null, code: string): Promise<string> {
  const a = await prisma.chartOfAccount.findFirst({ where: { universityId: universityId ?? null, code } });
  if (!a) throw new Error(`حساب غير موجود في دليل الحسابات: ${code}`);
  if (!a.isPostable) throw new Error(`الحساب ${code} حساب تجميعي ولا يقبل الترحيل المباشر`);
  return a.id;
}
