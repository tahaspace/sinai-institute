import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';
import { courseAttendance } from '@/lib/attendance';
import { academicSystemWhere, studentSystemWhere } from '@/lib/academic-system';

/**
 * Attendance reports (ClientR3 — R2). Daily attendance, absence aggregation, deprivation
 * (reuse courseAttendance), retention level→level, and the rate indicators.
 */
const VIEW = 'reports.attendance.view';

export const attendanceReports: ReportDef[] = [
  {
    id: 'attendance-day', category: 'attendance', nameAr: 'حضور / غياب / تأخر اليوم',
    permission: VIEW, filters: ['dateFrom', 'dateTo', 'courseId'], systemAware: true,
    run: async (f, ctx) => {
      const where: Record<string, unknown> = { ...studentSystemWhere(ctx.academicSystem) };
      if (f.courseId) where.courseId = f.courseId;
      if (f.dateFrom || f.dateTo) where.date = { ...(f.dateFrom ? { gte: new Date(f.dateFrom) } : {}), ...(f.dateTo ? { lte: new Date(f.dateTo) } : {}) };
      const recs = await prisma.attendance.groupBy({ by: ['status'], where, _count: { _all: true } });
      const m = new Map(recs.map((r) => [r.status, r._count._all]));
      const rows = [
        { status: 'حاضر', count: m.get('present') ?? 0 }, { status: 'غائب', count: m.get('absent') ?? 0 }, { status: 'متأخر', count: m.get('late') ?? 0 },
      ];
      return { kind: 'table', columns: [{ key: 'status', label: 'الحالة' }, { key: 'count', label: 'العدد', align: 'center', numeric: true }], rows, totals: { status: 'الإجمالي', count: rows.reduce((s, r) => s + r.count, 0) } };
    },
  },
  {
    id: 'deprivation-list', category: 'attendance', nameAr: 'الطلاب المستحقون للحرمان (>25% غياب)',
    permission: VIEW, filters: ['courseId', 'academicYear', 'semester'], requires: ['courseId', 'academicYear', 'semester'], systemAware: true,
    run: async (f, ctx) => {
      // courseAttendance narrows its own roster; the bylaw thresholds it applies stay untouched.
      const r = await courseAttendance(f.courseId!, f.academicYear!, f.semester!, { academicSystem: ctx.academicSystem });
      if (!r) return { kind: 'table', columns: [], rows: [] };
      const rows = r.rows.filter((x) => x.banned).map((x) => ({ studentCode: x.studentCode, name: x.name, absencePct: `${x.absencePct}%`, sessions: x.sessions, absent: x.absent }));
      return { kind: 'table', columns: [{ key: 'studentCode', label: 'الرقم' }, { key: 'name', label: 'الاسم' }, { key: 'absencePct', label: 'نسبة الغياب', align: 'center' }, { key: 'absent', label: 'مرات الغياب', align: 'center', numeric: true }, { key: 'sessions', label: 'المحاضرات', align: 'center', numeric: true }], rows, totals: { studentCode: 'الإجمالي', name: `${rows.length}` }, meta: { course: r.course } };
    },
  },
  {
    id: 'near-deprivation', category: 'attendance', nameAr: 'الطلاب المقتربون من الحرمان',
    permission: VIEW, filters: ['courseId', 'academicYear', 'semester'], requires: ['courseId', 'academicYear', 'semester'], systemAware: true,
    run: async (f, ctx) => {
      const r = await courseAttendance(f.courseId!, f.academicYear!, f.semester!, { academicSystem: ctx.academicSystem });
      if (!r) return { kind: 'table', columns: [], rows: [] };
      const rows = r.rows.filter((x) => !x.banned && x.warningStage >= 2).map((x) => ({ studentCode: x.studentCode, name: x.name, absencePct: `${x.absencePct}%`, stage: x.warningStage }));
      return { kind: 'table', columns: [{ key: 'studentCode', label: 'الرقم' }, { key: 'name', label: 'الاسم' }, { key: 'absencePct', label: 'نسبة الغياب', align: 'center' }, { key: 'stage', label: 'درجة الإنذار', align: 'center', numeric: true }], rows, totals: { studentCode: 'الإجمالي', name: `${rows.length}` } };
    },
  },
  {
    id: 'most-absent-courses', category: 'attendance', nameAr: 'أكثر المقررات غياباً',
    description: 'المقررات الأعلى نسبة غياب (مؤشر مبكر للرسوب)', permission: VIEW, filters: ['academicYear', 'semester'], systemAware: true,
    run: async (f, ctx) => {
      // narrow the attendance records to the students of the selected system
      const where: Record<string, unknown> = { ...studentSystemWhere(ctx.academicSystem) };
      if (f.academicYear) where.academicYear = f.academicYear;
      if (f.semester) where.semester = f.semester;
      const [att, courses] = await Promise.all([
        prisma.attendance.findMany({ where: { ...where, courseId: { not: null } }, select: { courseId: true, status: true } }),
        prisma.course.findMany({ select: { id: true, code: true, nameAr: true } }),
      ]);
      const nameById = new Map(courses.map((c) => [c.id, `${c.code} — ${c.nameAr}`]));
      const m = new Map<string, { total: number; absent: number }>();
      for (const a of att) { const k = a.courseId!; const g = m.get(k) ?? { total: 0, absent: 0 }; g.total++; if (a.status === 'absent') g.absent++; m.set(k, g); }
      const rows = [...m.entries()].map(([id, g]) => ({ course: nameById.get(id) ?? id, absencePct: g.total ? Math.round((g.absent / g.total) * 100) : 0, sessions: g.total })).sort((a, b) => b.absencePct - a.absencePct).map((r) => ({ ...r, absencePct: `${r.absencePct}%` }));
      return { kind: 'table', columns: [{ key: 'course', label: 'المقرر' }, { key: 'absencePct', label: 'نسبة الغياب', align: 'center' }, { key: 'sessions', label: 'الجلسات', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'retention-level', category: 'attendance', nameAr: 'احتفاظ الطلاب من مستوى لمستوى',
    description: 'نسبة الانتقال 1→2، 2→3، 3→4', permission: VIEW, filters: ['programId'], systemAware: true,
    run: async (_f, ctx) => {
      // Optional system narrowing — composed under AND because the CREDIT_HOURS fragment is an `OR`.
      const students = await prisma.student.findMany({ where: { universityId: ctx.universityId ?? undefined, ...(ctx.academicSystem ? { AND: [academicSystemWhere(ctx.academicSystem)] } : {}) }, select: { level: true, status: true } });
      const byLevel = new Map<number, { total: number; active: number }>();
      for (const s of students) { const g = byLevel.get(s.level) ?? { total: 0, active: 0 }; g.total++; if (!['WITHDRAWN', 'DISMISSED'].includes(s.status)) g.active++; byLevel.set(s.level, g); }
      const rows = [1, 2, 3].map((l) => {
        const from = byLevel.get(l)?.total ?? 0; const to = byLevel.get(l + 1)?.total ?? 0;
        return { transition: `${l} → ${l + 1}`, from, to, rate: from ? `${Math.round((to / from) * 100)}%` : '—' };
      });
      return { kind: 'table', columns: [{ key: 'transition', label: 'الانتقال' }, { key: 'from', label: 'عدد المستوى', align: 'center', numeric: true }, { key: 'to', label: 'المستوى التالي', align: 'center', numeric: true }, { key: 'rate', label: 'نسبة الاحتفاظ', align: 'center' }], rows };
    },
  },
  {
    id: 'attendance-indicators', category: 'attendance', nameAr: 'مؤشرات الحضور (Attendance/Absence/Warning/Deprivation Rate)',
    permission: VIEW, filters: ['academicYear', 'semester'], systemAware: true,
    run: async (f, ctx) => {
      const where: Record<string, unknown> = { ...studentSystemWhere(ctx.academicSystem) };
      if (f.academicYear) where.academicYear = f.academicYear;
      if (f.semester) where.semester = f.semester;
      const recs = await prisma.attendance.groupBy({ by: ['status'], where, _count: { _all: true } });
      const m = new Map(recs.map((r) => [r.status, r._count._all]));
      const present = (m.get('present') ?? 0) + (m.get('late') ?? 0); const absent = m.get('absent') ?? 0; const total = present + absent;
      return {
        kind: 'kpi',
        cards: [
          { key: 'attendance', label: 'Attendance Rate', value: total ? `${Math.round((present / total) * 100)}%` : '—' },
          { key: 'absence', label: 'Absence Rate', value: total ? `${Math.round((absent / total) * 100)}%` : '—' },
          { key: 'sessions', label: 'إجمالي الجلسات', value: total },
        ],
      };
    },
  },
];
