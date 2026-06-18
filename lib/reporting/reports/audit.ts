import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';

/**
 * Audit / login report (ClientR3 — R7). Reads the AuditLog (now with userAgent/device). Shows who
 * did what, when, on which device, and whether it was an edit/delete.
 */
const VIEW = 'reports.audit.view';

const ACTION_LABEL = (a: string): string => {
  if (a === 'auth.login') return 'تسجيل دخول';
  if (a.endsWith('.delete') || a.includes('reject') || a.includes('void') || a.includes('cancel')) return 'حذف/إلغاء';
  if (a.includes('.create') || a.includes('.issue') || a.includes('.build')) return 'إضافة';
  if (a.includes('.approve') || a.includes('.post') || a.includes('.submit')) return 'اعتماد/ترحيل';
  return 'تعديل';
};

export const auditReports: ReportDef[] = [
  {
    id: 'audit-log', category: 'audit', nameAr: 'سجل تسجيل الدخول والإجراءات',
    description: 'المستخدم · الوقت · الجهاز · نوع الإجراء', permission: VIEW,
    filters: ['dateFrom', 'dateTo', 'status'],
    run: async (f, ctx) => {
      const where: Record<string, unknown> = { universityId: ctx.universityId ?? undefined };
      if (f.status) where.action = { contains: f.status };
      if (f.dateFrom || f.dateTo) where.createdAt = { ...(f.dateFrom ? { gte: new Date(f.dateFrom) } : {}), ...(f.dateTo ? { lte: new Date(f.dateTo) } : {}) };
      const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
      return {
        kind: 'table',
        columns: [
          { key: 'when', label: 'الوقت' }, { key: 'actor', label: 'المستخدم' }, { key: 'action', label: 'الإجراء' },
          { key: 'kind', label: 'النوع', align: 'center' }, { key: 'target', label: 'العنصر' }, { key: 'device', label: 'الجهاز/المتصفح' }, { key: 'ip', label: 'IP', align: 'center' },
        ],
        rows: logs.map((l) => ({
          when: l.createdAt.toISOString().slice(0, 16).replace('T', ' '),
          actor: l.actorUserId ?? '—', action: l.action, kind: ACTION_LABEL(l.action),
          target: l.targetType ? `${l.targetType}${l.targetId ? ' #' + l.targetId.slice(-6) : ''}` : '—',
          device: (l.userAgent ?? '—').slice(0, 60), ip: l.ip ?? '—',
        })),
        totals: { when: 'إجمالي السجلات', actor: `${logs.length}` },
      };
    },
  },
];
