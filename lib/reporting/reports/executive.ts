import type { ReportDef } from '@/lib/reporting/types';
import { academicKpis, studentKpis, financialKpis, hrKpis, NO_DATA } from '@/lib/reporting/kpi';

/**
 * Executive Dashboard + KPI Center (ClientR3 — R4). KPI-card reports computed from the engines.
 * Satisfaction / research / strategic KPIs have no data → shown as "يتطلب مصدر بيانات".
 */
const EXEC = 'reports.executive.view';

export const executiveReports: ReportDef[] = [
  {
    id: 'executive-dashboard', category: 'executive', nameAr: 'لوحة رئيس مجلس الإدارة',
    description: 'مؤشرات أكاديمية ومالية وطلابية رئيسية', permission: EXEC, filters: [],
    run: async (_f, ctx) => {
      const [a, s, fin, hr] = await Promise.all([academicKpis(ctx.universityId), studentKpis(ctx.universityId), financialKpis(ctx.universityId), hrKpis(ctx.universityId)]);
      return {
        kind: 'kpi',
        cards: [
          { key: 'students', label: 'عدد الطلاب', value: a.totalStudents },
          { key: 'pass', label: 'نسبة النجاح', value: `${a.passRate}%` },
          { key: 'fail', label: 'نسبة الرسوب', value: `${a.failRate}%` },
          { key: 'cgpa', label: 'متوسط المعدل التراكمي', value: a.avgCgpa },
          { key: 'revenue', label: 'الإيرادات', value: fin.revenue, unit: 'ج.م' },
          { key: 'expense', label: 'المصروفات', value: fin.expense, unit: 'ج.م' },
          { key: 'profit', label: 'الربحية', value: fin.profitability, unit: 'ج.م' },
          { key: 'collection', label: 'نسبة التحصيل', value: `${fin.collectionRate}%` },
          { key: 'retention', label: 'معدل الاحتفاظ', value: `${s.retentionRate}%` },
          { key: 'dropout', label: 'معدل التسرب', value: `${s.dropoutRate}%` },
          { key: 'graduation', label: 'معدل التخرج', value: `${s.graduationRate}%` },
          { key: 'employees', label: 'عدد الموظفين', value: hr.employees },
        ],
      };
    },
  },
  {
    id: 'kpi-academic', category: 'executive', nameAr: 'مركز المؤشرات — الأكاديمية', permission: EXEC, filters: [],
    run: async (_f, ctx) => {
      const a = await academicKpis(ctx.universityId); const s = await studentKpis(ctx.universityId);
      return {
        kind: 'kpi',
        cards: [
          { key: 'success', label: 'Student Success Rate', value: `${a.passRate}%` },
          { key: 'graduation', label: 'Graduation Rate', value: `${s.graduationRate}%` },
          { key: 'retention', label: 'Retention Rate', value: `${s.retentionRate}%` },
          { key: 'dropout', label: 'Dropout Rate', value: `${s.dropoutRate}%` },
          { key: 'gpa', label: 'Average GPA', value: a.avgCgpa },
          { key: 'honor', label: 'Honor Students Rate', value: `${a.honorRate}%` },
        ],
      };
    },
  },
  {
    id: 'kpi-financial', category: 'executive', nameAr: 'مركز المؤشرات — المالية', permission: EXEC, filters: [],
    run: async (_f, ctx) => {
      const fin = await financialKpis(ctx.universityId);
      return {
        kind: 'kpi',
        cards: [
          { key: 'revenue', label: 'Revenue', value: fin.revenue, unit: 'ج.م' },
          { key: 'collection', label: 'Collection Rate', value: `${fin.collectionRate}%` },
          { key: 'profit', label: 'Profitability', value: fin.profitability, unit: 'ج.م' },
          { key: 'expense', label: 'Total Expense', value: fin.expense, unit: 'ج.م' },
        ],
      };
    },
  },
  {
    id: 'kpi-quality', category: 'executive', nameAr: 'مركز المؤشرات — الجودة والرضا',
    description: 'مؤشرات تتطلب مصدر بيانات (استبيانات/تقييم)', permission: EXEC, filters: [],
    run: async () => ({
      kind: 'kpi',
      cards: [
        { key: 'fac-sat', label: 'رضا أعضاء هيئة التدريس', value: NO_DATA },
        { key: 'stu-sat', label: 'رضا الطلاب', value: NO_DATA },
        { key: 'teaching', label: 'كفاءة التدريس', value: NO_DATA },
        { key: 'research', label: 'الإنتاج البحثي', value: NO_DATA },
      ],
    }),
  },
];
