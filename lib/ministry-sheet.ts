import prisma from '@/lib/prisma';

/**
 * Ministry result-sheet presentation config (ClientR4 — official export). Holds the institute-specific
 * bits of the وزارة sheet that must NOT be hardcoded: the letterhead lines, the control-committee title,
 * the signature/approval roles, and the paper size. Stored under the Setting key `institute.ministrySheet`
 * (same pattern as institute.regulations); unset → the Egyptian-ministry defaults below. Editable later
 * without a redeploy, so the certified sheet can be tuned to the institute's exact wording.
 */
export const DEFAULT_MINISTRY_SHEET = {
  // extra letterhead line under the institute name (e.g. a governing university / كلية); blank = hidden
  faculty: '',
  // committee heading printed above the signature block
  controlTitle: 'لجنة الكنترول',
  // signature/approval roles, printed right→left in this order under the matrix
  signatures: [
    'أمين لجنة الكنترول',
    'أعضاء لجنة الكنترول',
    'رئيس لجنة الكنترول',
    'وكيل المعهد لشؤون التعليم والطلاب',
    'عميد المعهد',
  ] as string[],
  paper: 'A4' as 'A4' | 'A3',
  // per-course cell shows الدرجة over التقدير; set true to also print نقاط الجودة (credit-hour only)
  showQualityPoints: false,
};
export type MinistrySheetConfig = typeof DEFAULT_MINISTRY_SHEET;
export const MINISTRY_SHEET_KEY = 'institute.ministrySheet';

export async function getMinistrySheetConfig(): Promise<MinistrySheetConfig> {
  const row = await prisma.setting.findFirst({ where: { key: MINISTRY_SHEET_KEY } });
  if (!row) return DEFAULT_MINISTRY_SHEET;
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_MINISTRY_SHEET, ...parsed };
  } catch {
    return DEFAULT_MINISTRY_SHEET;
  }
}
