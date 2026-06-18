import prisma from '@/lib/prisma';
import type { ReportDef, TableResult } from '@/lib/reporting/types';

/**
 * Admissions reports (ClientR3 — R1). Aggregates over the Application model (extended with
 * rejectionReason / qualificationType / documentsComplete).
 */
function countTable(map: Map<string, number>, keyLabel: string): TableResult {
  const rows = [...map.entries()].map(([k, count]) => ({ key: k || 'غير محدد', count })).sort((a, b) => b.count - a.count);
  return {
    kind: 'table',
    columns: [{ key: 'key', label: keyLabel }, { key: 'count', label: 'العدد', align: 'center', numeric: true }],
    rows,
    totals: { key: 'الإجمالي', count: rows.reduce((s, r) => s + r.count, 0) },
  };
}

const VIEW = 'admission.application.view';

export const admissionsReports: ReportDef[] = [
  {
    id: 'accepted-by-department', category: 'student-affairs', nameAr: 'المقبولون حسب القسم',
    permission: VIEW, filters: ['academicYear'],
    run: async (_f, ctx) => {
      const apps = await prisma.application.findMany({ where: { universityId: ctx.universityId ?? undefined, status: 'ACCEPTED' }, select: { firstChoice: true } });
      const m = new Map<string, number>();
      for (const a of apps) m.set(a.firstChoice, (m.get(a.firstChoice) ?? 0) + 1);
      return countTable(m, 'القسم / الرغبة الأولى');
    },
  },
  {
    id: 'accepted-by-qualification', category: 'student-affairs', nameAr: 'المقبولون حسب المؤهل',
    description: 'ثانوية عامة / مدارس فنية …', permission: VIEW, filters: ['academicYear'],
    run: async (_f, ctx) => {
      const apps = await prisma.application.findMany({ where: { universityId: ctx.universityId ?? undefined, status: 'ACCEPTED' }, select: { qualificationType: true } });
      const m = new Map<string, number>();
      for (const a of apps) m.set(a.qualificationType ?? '', (m.get(a.qualificationType ?? '') ?? 0) + 1);
      return countTable(m, 'المؤهل');
    },
  },
  {
    id: 'rejection-reasons', category: 'student-affairs', nameAr: 'أسباب الرفض الأكثر تكراراً',
    permission: VIEW, filters: ['academicYear'],
    run: async (_f, ctx) => {
      const apps = await prisma.application.findMany({ where: { universityId: ctx.universityId ?? undefined, status: 'REJECTED' }, select: { rejectionReason: true } });
      const m = new Map<string, number>();
      for (const a of apps) m.set(a.rejectionReason ?? '', (m.get(a.rejectionReason ?? '') ?? 0) + 1);
      return countTable(m, 'سبب الرفض');
    },
  },
  {
    id: 'incomplete-files', category: 'student-affairs', nameAr: 'عدد الملفات غير المكتملة',
    permission: VIEW, filters: ['academicYear'],
    run: async (_f, ctx) => {
      const apps = await prisma.application.findMany({ where: { universityId: ctx.universityId ?? undefined, documentsComplete: false }, select: { fullName: true, nationalId: true, status: true } });
      return {
        kind: 'table',
        columns: [{ key: 'fullName', label: 'الاسم' }, { key: 'nationalId', label: 'الرقم القومي', align: 'center' }, { key: 'status', label: 'الحالة', align: 'center' }],
        rows: apps.map((a) => ({ fullName: a.fullName, nationalId: a.nationalId, status: a.status })),
        totals: { fullName: 'إجمالي الملفات غير المكتملة', nationalId: `${apps.length}` },
      };
    },
  },
];
