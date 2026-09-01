import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';
import { studentWhere } from '@/lib/reporting/filters';
import { HOLD_TYPE_LABELS } from '@/lib/holds';
import { academicSystemWhere } from '@/lib/academic-system';

/**
 * ClientR5 — Student Holds & Blocks reports. All read the hold engine's records
 * (StudentHold + HoldEvent); a hold is a visibility/access control, never a grade change.
 *
 * Academic-system narrowing: the student-scoped reports go through `studentWhere`, which already
 * composes the system fragment under AND (absent/'all' → no narrowing). ctx.academicSystem is the
 * same value the hub sends as the `academicSystem` filter.
 */
const VIEW = 'reports.holds.view';

export const holdsReports: ReportDef[] = [
  {
    id: 'held-results', category: 'holds', nameAr: 'تقرير الطلاب المحجوبة نتائجهم',
    description: 'طلاب نتائجهم محجوبة حاليًا (حجب نشط على ظهور النتيجة) — بالنوع والسبب',
    permission: VIEW, filters: ['departmentId', 'programId', 'level'], systemAware: true,
    run: async (f, ctx) => {
      const holds = await prisma.studentHold.findMany({
        where: { status: 'ACTIVE', blockResult: true, student: { ...studentWhere(f, ctx.universityId) } },
        select: {
          type: true, reasonText: true, startDate: true,
          reason: { select: { nameAr: true } },
          student: { select: { studentCode: true, nameAr: true, level: true, department: { select: { nameAr: true } }, program: { select: { nameAr: true } } } },
        },
        orderBy: { startDate: 'desc' },
      });
      return {
        kind: 'table',
        columns: [
          { key: 'studentCode', label: 'الرقم الجامعي' },
          { key: 'name', label: 'الاسم' },
          { key: 'department', label: 'القسم' },
          { key: 'program', label: 'البرنامج' },
          { key: 'level', label: 'المستوى', align: 'center', numeric: true },
          { key: 'type', label: 'نوع الحجب' },
          { key: 'reason', label: 'السبب' },
          { key: 'date', label: 'تاريخ الحجب', align: 'center' },
        ],
        rows: holds.map((h) => ({
          studentCode: h.student.studentCode, name: h.student.nameAr,
          department: h.student.department?.nameAr ?? '—', program: h.student.program?.nameAr ?? '—',
          level: h.student.level, type: HOLD_TYPE_LABELS[h.type] ?? h.type,
          reason: h.reason?.nameAr ?? h.reasonText ?? '—', date: h.startDate.toISOString().slice(0, 10),
        })),
        totals: { studentCode: 'الإجمالي', name: `${holds.length} طالب` },
        meta: { count: holds.length },
      };
    },
  },
  {
    id: 'holds-by-reason', category: 'holds', nameAr: 'تقرير الحجب حسب النوع/السبب',
    description: 'توزيع الحجب النشط حسب النوع مع النسبة المئوية', permission: VIEW,
    filters: ['departmentId', 'programId'], systemAware: true,
    run: async (f, ctx) => {
      const holds = await prisma.studentHold.findMany({
        where: { status: 'ACTIVE', student: { ...studentWhere(f, ctx.universityId) } },
        select: { type: true },
      });
      const total = holds.length;
      const byType = new Map<string, number>();
      for (const h of holds) byType.set(h.type, (byType.get(h.type) ?? 0) + 1);
      const rows = [...byType.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type: HOLD_TYPE_LABELS[type] ?? type, count, pct: total ? Math.round((count / total) * 100) : 0 }));
      return {
        kind: 'table',
        columns: [
          { key: 'type', label: 'نوع الحجب' },
          { key: 'count', label: 'عدد الطلاب', align: 'center', numeric: true },
          { key: 'pct', label: 'النسبة %', align: 'center', numeric: true },
        ],
        rows,
        totals: { type: 'الإجمالي', count: total },
        meta: { count: total },
      };
    },
  },
  {
    id: 'released-holds', category: 'holds', nameAr: 'تقرير الحجب المرفوع (تفعيل الطلاب)',
    description: 'الطلاب الذين رُفع عنهم الحجب — النوع، من رفعه، ومتى', permission: VIEW,
    filters: ['departmentId', 'programId', 'dateFrom', 'dateTo'], systemAware: true,
    run: async (f, ctx) => {
      const where: Prisma.StudentHoldWhereInput = { status: 'RELEASED', student: { ...studentWhere(f, ctx.universityId) } };
      if (f.dateFrom || f.dateTo) {
        where.releasedAt = { gte: f.dateFrom ? new Date(f.dateFrom) : undefined, lte: f.dateTo ? new Date(f.dateTo) : undefined };
      }
      const holds = await prisma.studentHold.findMany({
        where,
        select: {
          type: true, source: true, releasedAt: true, releaseReason: true,
          student: { select: { studentCode: true, nameAr: true, department: { select: { nameAr: true } } } },
        },
        orderBy: { releasedAt: 'desc' },
      });
      return {
        kind: 'table',
        columns: [
          { key: 'studentCode', label: 'الرقم الجامعي' },
          { key: 'name', label: 'الاسم' },
          { key: 'department', label: 'القسم' },
          { key: 'type', label: 'نوع الحجب' },
          { key: 'source', label: 'المصدر', align: 'center' },
          { key: 'releasedAt', label: 'تاريخ الرفع', align: 'center' },
          { key: 'releaseReason', label: 'سبب الرفع' },
        ],
        rows: holds.map((h) => ({
          studentCode: h.student.studentCode, name: h.student.nameAr, department: h.student.department?.nameAr ?? '—',
          type: HOLD_TYPE_LABELS[h.type] ?? h.type, source: h.source === 'AUTOMATIC' ? 'تلقائي' : 'يدوي',
          releasedAt: h.releasedAt ? h.releasedAt.toISOString().slice(0, 10) : '—', releaseReason: h.releaseReason ?? '—',
        })),
        totals: { studentCode: 'الإجمالي', name: `${holds.length} طالب` },
        meta: { count: holds.length },
      };
    },
  },
  {
    id: 'automatic-holds', category: 'holds', nameAr: 'تقرير الحجب التلقائي',
    description: 'العمليات التي طبّقها/رفعها النظام تلقائيًا (ربط الحسابات ↔ ظهور النتيجة)',
    permission: VIEW, filters: ['dateFrom', 'dateTo'], systemAware: true,
    run: async (f, ctx) => {
      const where: Prisma.HoldEventWhereInput = { source: 'AUTOMATIC', action: { in: ['APPLY', 'RELEASE'] } };
      if (ctx.universityId) where.universityId = ctx.universityId;
      // HoldEvent has no `student` relation — reach the student through its hold. Only set when a
      // system is selected, so the unfiltered run keeps its exact current where-shape.
      if (ctx.academicSystem) where.hold = { student: academicSystemWhere(ctx.academicSystem) as Prisma.StudentWhereInput };
      if (f.dateFrom || f.dateTo) {
        where.at = { gte: f.dateFrom ? new Date(f.dateFrom) : undefined, lte: f.dateTo ? new Date(f.dateTo) : undefined };
      }
      const events = await prisma.holdEvent.findMany({ where, orderBy: { at: 'desc' }, take: 1000 });
      const ids = [...new Set(events.map((e) => e.studentId))];
      const studs = ids.length
        ? await prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, studentCode: true, nameAr: true } })
        : [];
      const smap = new Map(studs.map((s) => [s.id, s]));
      return {
        kind: 'table',
        columns: [
          { key: 'studentCode', label: 'الرقم الجامعي' },
          { key: 'name', label: 'الاسم' },
          { key: 'action', label: 'الإجراء', align: 'center' },
          { key: 'at', label: 'التاريخ', align: 'center' },
        ],
        rows: events.map((e) => ({
          studentCode: smap.get(e.studentId)?.studentCode ?? '—',
          name: smap.get(e.studentId)?.nameAr ?? '—',
          action: e.action === 'APPLY' ? 'حجب تلقائي' : 'رفع تلقائي',
          at: e.at.toISOString().slice(0, 10),
        })),
        totals: { studentCode: 'الإجمالي', name: `${events.length} عملية` },
        meta: { count: events.length },
      };
    },
  },
];
