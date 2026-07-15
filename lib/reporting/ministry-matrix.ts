import { getMinistrySheetConfig } from '@/lib/ministry-sheet';

/**
 * Ministry result-sheet matrix payload (ClientR4 official export). This is the *export-only* shape —
 * intentionally decoupled from the on-screen `columns`/`rows` so the screen keeps its clean web look
 * (the client's photo) while «طباعة رسمية» prints the exact وزارة matrix (the client's PDFs). Attached
 * at `meta.ministrySheet.matrix`; rendered by <MinistryResultMatrix/> in the reporting hub. Used by both
 * academic systems: CREDIT_HOURS (level/graduates, with GPA) and ANNUAL (فرقة, with %/تقدير, no GPA).
 */
export type MinistryCell = { mark: string; grade: string }; // one course × one student: الدرجة over التقدير
export type MinistryMatrixRow = {
  serial: number; // م
  seat: string; // رقم الجلوس
  name: string; // الاسم
  cells: Record<string, MinistryCell>; // keyed by course code
  summary: Record<string, string>; // keyed by summaryCol.key (trailing columns)
};
export type MinistryCourseCol = { code: string; name: string; hours?: number };
export type MinistrySummaryCol = { key: string; label: string };
export type MinistryScaleRow = { code: string; name: string; range: string; points?: string };

export type MinistryMatrix = {
  system: 'CREDIT_HOURS' | 'ANNUAL';
  institute: string;
  faculty: string;
  controlTitle: string;
  letterhead: { label: string; value: string }[]; // القسم / الفرقة/المستوى / العام / الفصل …
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
  courses: MinistryCourseCol[];
  summaryCols: MinistrySummaryCol[];
  rows: MinistryMatrixRow[];
  scale: MinistryScaleRow[];
  distribution: { label: string; value: string | number }[];
}): Promise<MinistryMatrix> {
  const cfg = await getMinistrySheetConfig();
  return {
    system: input.system,
    institute: input.institute,
    faculty: cfg.faculty,
    controlTitle: cfg.controlTitle,
    letterhead: input.letterhead,
    courses: input.courses,
    summaryCols: input.summaryCols,
    rows: input.rows,
    scale: input.scale,
    distribution: input.distribution,
    signatures: cfg.signatures,
    paper: cfg.paper,
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
