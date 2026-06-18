import type { ReportDef, ReportCategory } from '@/lib/reporting/types';
import { CATEGORY_LABELS } from '@/lib/reporting/types';
import { studentAffairsReports } from '@/lib/reporting/reports/student-affairs';
import { admissionsReports } from '@/lib/reporting/reports/admissions';
import { resultsReports } from '@/lib/reporting/reports/results';
import { ministryReports } from '@/lib/reporting/reports/ministry';
import { academicReports } from '@/lib/reporting/reports/academic';
import { attendanceReports } from '@/lib/reporting/reports/attendance';
import { facultyReports } from '@/lib/reporting/reports/faculty';
import { advisorReports } from '@/lib/reporting/reports/advisor';
import { financialReports } from '@/lib/reporting/reports/financial';
import { auditReports } from '@/lib/reporting/reports/audit';

/**
 * Report registry (ClientR3 — R0). The single source of truth: every report is one ReportDef.
 * The hub UI lists the registry by category; the runner API resolves an id → run(). New phases
 * (academic, attendance, faculty, advisor, financial, executive, analytical, predictive, audit)
 * append their definition arrays here.
 */
const ALL: ReportDef[] = [
  ...ministryReports,
  ...studentAffairsReports,
  ...admissionsReports,
  ...resultsReports,
  ...academicReports,
  ...attendanceReports,
  ...facultyReports,
  ...advisorReports,
  ...financialReports,
  ...auditReports,
];

const BY_ID = new Map(ALL.map((r) => [r.id, r]));

export function getReport(id: string): ReportDef | undefined {
  return BY_ID.get(id);
}

/** Catalogue for the hub: categories (in display order) → their reports' metadata. */
export function reportCatalogue(): { category: ReportCategory; label: string; reports: { id: string; nameAr: string; description?: string; filters: string[]; requires?: string[]; permission: string }[] }[] {
  const order: ReportCategory[] = ['ministry', 'student-affairs', 'academic', 'attendance', 'results', 'faculty', 'advisor', 'financial', 'executive', 'analytical', 'predictive', 'audit'];
  return order
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      reports: ALL.filter((r) => r.category === cat).map((r) => ({ id: r.id, nameAr: r.nameAr, description: r.description, filters: r.filters, requires: r.requires, permission: r.permission })),
    }))
    .filter((c) => c.reports.length > 0);
}
