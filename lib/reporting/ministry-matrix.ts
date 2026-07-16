import { getMinistrySheetConfig } from '@/lib/ministry-sheet';

/**
 * Ministry result-sheet matrix payload (ClientR4 official export). This is the *export-only* shape —
 * intentionally decoupled from the on-screen `columns`/`rows` so the screen keeps its clean web look
 * (the client's photo) while «طباعة رسمية» prints the exact وزارة matrix (the client's PDFs). Attached
 * at `meta.ministrySheet.matrix`; rendered by <MinistryResultMatrix/> in the reporting hub. Used by both
 * academic systems: CREDIT_HOURS (level/graduates, with GPA) and ANNUAL (فرقة, with %/تقدير, no GPA).
 */
// One course × one student: the component parts (keyed by component key) + المجموع + التقدير.
export type MinistryCell = { parts: Record<string, string>; total: string; grade: string };
export type MinistryMatrixRow = {
  serial: number; // م
  seat: string; // رقم الجلوس
  name: string; // الاسم
  leading?: Record<string, string>; // keyed by leadingCol.key (columns BEFORE the course block, e.g. prior-year totals)
  cells: Record<string, MinistryCell>; // keyed by course code
  summary: Record<string, string>; // keyed by summaryCol.key (trailing columns)
};
// A course's internal mark distribution (التقسيمة الداخلية) — only the parts with a max > 0 appear.
export type MinistryComponent = { key: string; label: string; max: number };
export type MinistryCourseCol = { code: string; name: string; hours?: number; components: MinistryComponent[]; totalMax: number };
export type MinistrySummaryCol = { key: string; label: string };
export type MinistryScaleRow = { code: string; name: string; range: string; points?: string };

// Canonical component order for the ministry sheet (أعمال السنة · نصفي · عملي · تحريري). Maps the
// Enrollment mark fields + Course *Max fields to their Arabic sheet labels.
export const MARK_COMPONENTS: { key: string; label: string; maxKey: 'homeworkMax' | 'midtermMax' | 'practicalMax' | 'finalMax' }[] = [
  { key: 'homework', label: 'أعمال السنة', maxKey: 'homeworkMax' },
  { key: 'midterm', label: 'نصفي', maxKey: 'midtermMax' },
  { key: 'practical', label: 'عملي', maxKey: 'practicalMax' },
  { key: 'final', label: 'تحريري', maxKey: 'finalMax' },
];

/** Build a course's visible component columns from its *Max fields (drops parts whose max is 0). */
export function courseComponents(maxes: { homeworkMax: number; midtermMax: number; practicalMax: number; finalMax: number }): { components: MinistryComponent[]; totalMax: number } {
  const components = MARK_COMPONENTS.map((c) => ({ key: c.key, label: c.label, max: maxes[c.maxKey] })).filter((c) => c.max > 0);
  return { components, totalMax: components.reduce((s, c) => s + c.max, 0) };
}

export type MinistryMatrix = {
  system: 'CREDIT_HOURS' | 'ANNUAL';
  institute: string;
  faculty: string;
  controlTitle: string;
  letterhead: { label: string; value: string }[]; // القسم / الفرقة/المستوى / العام / الفصل …
  leadingCols: MinistrySummaryCol[]; // columns before the course block (prior-year totals on the graduation sheet)
  courses: MinistryCourseCol[];
  summaryCols: MinistrySummaryCol[];
  rows: MinistryMatrixRow[];
  scale: MinistryScaleRow[]; // grade-scale legend box
  distribution: { label: string; value: string | number }[]; // statistics box
  signatures: string[];
  paper: 'A4' | 'A3';
  showQualityPoints: boolean;
};

/** Assemble the matrix, folding in the institute-editable presentation config (signatures/paper/letterhead extras). */
export async function buildMinistryMatrix(input: {
  system: 'CREDIT_HOURS' | 'ANNUAL';
  institute: string;
  letterhead: { label: string; value: string }[];
  leadingCols?: MinistrySummaryCol[];
  courses: MinistryCourseCol[];
  summaryCols: MinistrySummaryCol[];
  rows: MinistryMatrixRow[];
  scale: MinistryScaleRow[];
  distribution: { label: string; value: string | number }[];
}): Promise<MinistryMatrix> {
  const cfg = await getMinistrySheetConfig();
  const leadingCols = input.leadingCols ?? [];
  // Auto-widen to A3 when the component sub-columns push the sheet past what A4 landscape can hold.
  // Leaf columns = م + جلوس + اسم (3) + leading cols + Σ(course parts + المجموع + التقدير) + trailing summary cols.
  const leafCols = 3 + leadingCols.length + input.summaryCols.length + input.courses.reduce((s, c) => s + c.components.length + 2, 0);
  const paper: 'A4' | 'A3' = leafCols > 18 ? 'A3' : cfg.paper;
  return {
    system: input.system,
    institute: input.institute,
    faculty: cfg.faculty,
    controlTitle: cfg.controlTitle,
    letterhead: input.letterhead,
    leadingCols,
    courses: input.courses,
    summaryCols: input.summaryCols,
    rows: input.rows,
    scale: input.scale,
    distribution: input.distribution,
    signatures: cfg.signatures,
    paper,
    showQualityPoints: cfg.showQualityPoints,
  };
}

/** Dense-rank a cohort by a numeric metric (desc). Returns a map studentId→rank (1-based, ties share). */
export function rankByDesc<T>(items: T[], id: (t: T) => string, metric: (t: T) => number): Map<string, number> {
  const sorted = [...items].sort((a, b) => metric(b) - metric(a));
  const out = new Map<string, number>();
  let rank = 0, prev: number | null = null, seen = 0;
  for (const it of sorted) {
    seen++;
    const m = metric(it);
    if (prev === null || m !== prev) { rank = seen; prev = m; }
    out.set(id(it), rank);
  }
  return out;
}
