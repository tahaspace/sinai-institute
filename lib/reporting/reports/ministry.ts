import type { ReportDef } from '@/lib/reporting/types';
import { termWhere } from '@/lib/reporting/filters';
import { ministrySheet } from '@/lib/reports';

/**
 * Ministry exam-board sheets (ClientR3 — R1). Reuse lib/reports.ministrySheet (transitional /
 * final / deprived) — the rosters the ministry accepts.
 */
const VIEW = 'reports.view';

function sheet(id: string, nameAr: string, stage: 'transitional' | 'final' | 'deprived'): ReportDef {
  return {
    id, category: 'ministry', nameAr, permission: VIEW, filters: ['academicYear', 'semester'],
    run: async (f) => {
      const r = await ministrySheet(stage, termWhere(f));
      if (stage === 'deprived') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (r.rows as any[]).map((x) => ({ studentCode: x.studentCode, name: x.name, department: x.department, level: x.level, courses: x.courses.map((c: { code: string; statusCode: string }) => `${c.code}(${c.statusCode})`).join('، ') }));
        return { kind: 'table', columns: [{ key: 'studentCode', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'department', label: 'القسم' }, { key: 'level', label: 'المستوى', align: 'center', numeric: true }, { key: 'courses', label: 'المقررات' }], rows, totals: { studentCode: 'الإجمالي', name: `${rows.length}` } };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (r.rows as any[]).map((x) => ({ studentCode: x.studentCode, name: x.name, department: x.department, level: x.level, cgpa: x.cgpa.toFixed(2), earnedHours: x.earnedHours }));
      return { kind: 'table', columns: [{ key: 'studentCode', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'department', label: 'القسم' }, { key: 'level', label: 'المستوى', align: 'center', numeric: true }, { key: 'cgpa', label: 'المعدل التراكمي', align: 'center', numeric: true }, { key: 'earnedHours', label: 'الساعات', align: 'center', numeric: true }], rows, totals: { studentCode: 'الإجمالي', name: `${rows.length}` } };
    },
  };
}

export const ministryReports: ReportDef[] = [
  sheet('ministry-transitional', 'كشف الوزارة — الفرق الانتقالية', 'transitional'),
  sheet('ministry-final', 'كشف الوزارة — فرقة التخرج', 'final'),
  sheet('ministry-deprived', 'كشف الوزارة — المحرومون / الغائبون', 'deprived'),
];
