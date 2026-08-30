/**
 * Reporting platform types (ClientR3 — R0). A report is a single definition in the registry:
 * id, category, label, the filters it accepts, the permission to run it, its output shape, and a
 * runner that returns a normalized result the hub UI + export engine both understand.
 */
export type ReportCategory =
  | 'ministry'
  | 'student-affairs'
  | 'holds'
  | 'academic'
  | 'attendance'
  | 'results'
  | 'faculty'
  | 'advisor'
  | 'financial'
  | 'executive'
  | 'analytical'
  | 'predictive'
  | 'transcripts'
  | 'annual'
  | 'hr'
  | 'audit';

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  ministry: 'كشوف الوزارة',
  'student-affairs': 'شؤون الطلاب',
  holds: 'حجب الطلاب',
  academic: 'التقارير الأكاديمية',
  attendance: 'الحضور والغياب',
  results: 'النتائج ومتابعة الرصد',
  faculty: 'أعضاء هيئة التدريس',
  advisor: 'الإرشاد الأكاديمي',
  financial: 'التقارير المالية',
  executive: 'اللوحات التنفيذية',
  analytical: 'تحليلات استراتيجية',
  predictive: 'تحليلات تنبؤية',
  transcripts: 'بيانات الحالة وكشوف النتائج',
  annual: 'النتائج السنوية (النظام العادي)',
  hr: 'الموارد البشرية',
  audit: 'سجل التدقيق',
};

// Filter keys a report can request; the hub renders the matching control for each.
export type FilterKey =
  | 'academicYear' | 'semester' | 'facultyId' | 'departmentId' | 'programId'
  | 'level' | 'courseId' | 'advisorId' | 'instructorId' | 'studentCode'
  | 'dateFrom' | 'dateTo' | 'status' | 'qualification';

export type Filters = Partial<Record<FilterKey, string>>;

// Normalized result shapes — the hub renders by `kind`, export serializes `columns`/`rows`.
export type ReportColumn = { key: string; label: string; align?: 'start' | 'center' | 'end'; numeric?: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReportRow = Record<string, any>;

export type TableResult = {
  kind: 'table';
  columns: ReportColumn[];
  rows: ReportRow[];
  totals?: ReportRow;
  meta?: Record<string, unknown>; // header info (institute/program/level/term), grade-scale footer, counts
};
export type KpiResult = { kind: 'kpi'; cards: { key: string; label: string; value: number | string; unit?: string; hint?: string }[] };
// Omit kind from TableResult so the discriminant is a clean 'sheet' (a plain intersection would
// collapse kind to 'table' & 'sheet' = never).
export type SheetResult = Omit<TableResult, 'kind'> & { kind: 'sheet'; title: string; header?: Record<string, string>; footer?: ReportRow[] };

export type ReportResult = TableResult | KpiResult | SheetResult;

export type ReportContext = { universityId: string | null };

export type ReportDef = {
  id: string;
  category: ReportCategory;
  nameAr: string;
  description?: string;
  permission: string;
  filters: FilterKey[]; // ordered; the hub renders these
  requires?: FilterKey[]; // hard-required before running
  run: (filters: Filters, ctx: ReportContext) => Promise<ReportResult>;
};
