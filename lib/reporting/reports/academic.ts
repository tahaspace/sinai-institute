import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';
import type { ReportDef, TableResult } from '@/lib/reporting/types';
import { termWhere } from '@/lib/reporting/filters';
import { academicSystemWhere, programSystemWhere, studentSystemWhere } from '@/lib/academic-system';
import { classify } from '@/lib/reports';
import { computeStandingForStudents } from '@/lib/standing';

/**
 * Academic reports (ClientR3 — R2): program/course analytics over Enrollment + the result-state
 * engine. Reuses classify() so pass/fail stays consistent with the rest of the platform.
 */
const VIEW = 'reports.academic.view';

export const academicReports: ReportDef[] = [
  {
    id: 'programs-most-registered', category: 'academic', nameAr: 'البرامج الأكثر تسجيلاً',
    permission: VIEW, filters: ['academicYear'], systemAware: true,
    run: async (_f, ctx) => {
      // Optional system narrowing — composed under AND because the CREDIT_HOURS fragment is an `OR`.
      const students = await prisma.student.findMany({ where: { universityId: ctx.universityId ?? undefined, status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] }, ...(ctx.academicSystem ? { AND: [academicSystemWhere(ctx.academicSystem)] } : {}) }, select: { program: { select: { nameAr: true } } } });
      const m = new Map<string, number>();
      for (const s of students) { const k = s.program?.nameAr ?? 'غير محدد'; m.set(k, (m.get(k) ?? 0) + 1); }
      const rows = [...m.entries()].map(([program, count]) => ({ program, count })).sort((a, b) => b.count - a.count);
      return { kind: 'table', columns: [{ key: 'program', label: 'البرنامج' }, { key: 'count', label: 'عدد الطلاب', align: 'center', numeric: true }], rows, totals: { program: 'الإجمالي', count: rows.reduce((s, r) => s + r.count, 0) } };
    },
  },
  {
    id: 'students-per-program', category: 'academic', nameAr: 'عدد الطلاب في البرامج (مع المعدل والساعات)',
    permission: VIEW, filters: ['programId'], systemAware: true,
    run: async (f, ctx) => {
      // Aggregated by program, so the program set itself carries the system narrowing.
      const programs = await prisma.program.findMany({ where: { universityId: ctx.universityId ?? undefined, ...(f.programId ? { id: f.programId } : {}), ...programSystemWhere(ctx.academicSystem) }, select: { id: true, nameAr: true } });
      const rows = await Promise.all(programs.map(async (p) => {
        const studs = await prisma.student.findMany({ where: { programId: p.id, status: { notIn: ['WITHDRAWN', 'DISMISSED'] } }, select: { id: true } });
        const standings = await computeStandingForStudents(studs.map((s) => s.id));
        const cgpas = [...standings.values()].filter((s) => s.gpaHours > 0);
        const avg = cgpas.length ? cgpas.reduce((s, x) => s + x.cgpa, 0) / cgpas.length : 0;
        const hours = [...standings.values()].reduce((s, x) => s + x.earnedHours, 0);
        return { program: p.nameAr, count: studs.length, avgCgpa: avg.toFixed(2), earnedHours: hours };
      }));
      return { kind: 'table', columns: [{ key: 'program', label: 'البرنامج' }, { key: 'count', label: 'عدد الطلاب', align: 'center', numeric: true }, { key: 'avgCgpa', label: 'متوسط المعدل', align: 'center', numeric: true }, { key: 'earnedHours', label: 'إجمالي الساعات المكتسبة', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'course-grades-sheet', category: 'academic', nameAr: 'كشف تقديرات مقرر (مع المحاولات)',
    description: 'الطلاب + التقدير + المستوى + رقم المحاولة', permission: VIEW,
    filters: ['courseId', 'academicYear', 'semester'], requires: ['courseId'], systemAware: true,
    run: async (f, ctx) => {
      const enrollments = await prisma.enrollment.findMany({
        // rows are students, so the student set is narrowed by the optional system filter
        where: { courseId: f.courseId, ...termWhere(f), ...studentSystemWhere(ctx.academicSystem) },
        include: { student: { select: { studentCode: true, nameAr: true, level: true } } },
        orderBy: { student: { studentCode: 'asc' } },
      });
      return {
        kind: 'table',
        columns: [{ key: 'studentCode', label: 'الرقم' }, { key: 'name', label: 'الاسم' }, { key: 'level', label: 'المستوى', align: 'center', numeric: true }, { key: 'grade', label: 'التقدير', align: 'center' }, { key: 'attempt', label: 'المحاولة', align: 'center', numeric: true }],
        rows: enrollments.map((e) => ({ studentCode: e.student.studentCode, name: e.student.nameAr, level: e.student.level, grade: e.gradeStatusCode ?? '—', attempt: e.attemptNo })),
        totals: { studentCode: 'عدد المسجلين', name: `${enrollments.length}` },
      };
    },
  },
  {
    id: 'pass-rate-by-program', category: 'academic', nameAr: 'نسب النجاح حسب البرنامج',
    permission: VIEW, filters: ['academicYear', 'semester'], systemAware: true,
    run: async (f, ctx) => {
      const [enrollments, statuses] = await Promise.all([
        // grouped by the student's program → narrow the student set by the optional system filter
        prisma.enrollment.findMany({ where: { ...termWhere(f), ...studentSystemWhere(ctx.academicSystem) }, include: { student: { select: { program: { select: { nameAr: true } } } } } }),
        prisma.gradeStatus.findMany(),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));
      const agg = new Map<string, { pass: number; fail: number }>();
      for (const e of enrollments) {
        const cls = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null);
        if (cls !== 'pass' && cls !== 'fail') continue;
        const k = e.student.program?.nameAr ?? 'غير محدد';
        const a = agg.get(k) ?? { pass: 0, fail: 0 };
        a[cls]++; agg.set(k, a);
      }
      const rows = [...agg.entries()].map(([program, a]) => ({ program, pass: a.pass, fail: a.fail, rate: a.pass + a.fail ? `${Math.round((a.pass / (a.pass + a.fail)) * 100)}%` : '0%' })).sort((x, y) => (y.pass + y.fail) - (x.pass + x.fail));
      return { kind: 'table', columns: [{ key: 'program', label: 'البرنامج' }, { key: 'pass', label: 'ناجح', align: 'center', numeric: true }, { key: 'fail', label: 'راسب', align: 'center', numeric: true }, { key: 'rate', label: 'نسبة النجاح', align: 'center' }], rows };
    },
  },
  {
    id: 'course-success-ranking', category: 'academic', nameAr: 'المقررات الأعلى/الأقل نجاحاً',
    permission: VIEW, filters: ['academicYear', 'semester', 'departmentId'], systemAware: true,
    run: async (f, ctx) => {
      const [courses, statuses] = await Promise.all([
        // course rows stay as-is; only the enrollments feeding the rate are narrowed by system
        prisma.course.findMany({ where: f.departmentId ? { departmentId: f.departmentId } : {}, include: { enrollments: { where: { ...termWhere(f), ...studentSystemWhere(ctx.academicSystem) } } }, orderBy: { code: 'asc' } }),
        prisma.gradeStatus.findMany(),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));
      const rows = courses.map((c) => {
        let pass = 0, fail = 0;
        for (const e of c.enrollments) { const cls = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null); if (cls === 'pass') pass++; else if (cls === 'fail') fail++; }
        return { code: c.code, course: c.nameAr, graded: pass + fail, rate: pass + fail ? Math.round((pass / (pass + fail)) * 100) : -1 };
      }).filter((r) => r.graded > 0).sort((a, b) => b.rate - a.rate);
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'course', label: 'المقرر' }, { key: 'graded', label: 'مرصود', align: 'center', numeric: true }, { key: 'rate', label: 'نسبة النجاح %', align: 'center', numeric: true }], rows: rows.map((r) => ({ ...r, rate: `${r.rate}%` })) };
    },
  },
  {
    id: 'course-demand-capacity', category: 'academic', nameAr: 'الطاقة الاستيعابية والإقبال لكل مقرر',
    description: 'المسجلون مقابل سعة الشعب', permission: VIEW, filters: ['academicYear', 'semester'],
    run: async (f) => {
      const offerings = await prisma.courseOffering.findMany({ where: { ...(f.academicYear ? { academicYear: f.academicYear } : {}), ...(f.semester ? { semester: f.semester } : {}) }, include: { course: { select: { code: true, nameAr: true } }, sections: { include: { items: true } } } });
      const rows = offerings.map((o) => {
        const capacity = o.sections.reduce((s, sec) => s + sec.capacity, 0);
        const registered = o.sections.reduce((s, sec) => s + sec.items.length, 0);
        return { code: o.course.code, course: o.course.nameAr, capacity, registered, fill: capacity ? `${Math.round((registered / capacity) * 100)}%` : '—' };
      }).sort((a, b) => b.registered - a.registered);
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'course', label: 'المقرر' }, { key: 'capacity', label: 'السعة', align: 'center', numeric: true }, { key: 'registered', label: 'المسجلون', align: 'center', numeric: true }, { key: 'fill', label: 'نسبة الإشغال', align: 'center' }], rows };
    },
  },
  {
    id: 'course-lifecycle', category: 'academic', nameAr: 'تحليل دورة حياة مقرر',
    description: 'الرسوب/السحب/الحرمان/الإعادة + الساعات المكتسبة والمسجلة', permission: VIEW,
    filters: ['courseId'], requires: ['courseId'], systemAware: true,
    run: async (f, ctx): Promise<TableResult> => {
      const [course, enrollments, statuses] = await Promise.all([
        prisma.course.findUnique({ where: { id: f.courseId }, select: { code: true, nameAr: true, creditHours: true } }),
        // counts are over student enrollments → narrow the student set by the optional system filter
        prisma.enrollment.findMany({ where: { courseId: f.courseId, ...studentSystemWhere(ctx.academicSystem) } }),
        prisma.gradeStatus.findMany(),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));
      // The >25%-absence outcome is bylaw-configured (جدول 3 makes it FW «منسحب اجباري»), so the
      // legacy DN set alone would drop those students out of the deprivation count entirely.
      const deprivedSet = new Set(['DN', 'NE', 'ABS', 'DS', (await getRegulations()).absenceBanStatusCode].filter(Boolean) as string[]);
      const c = { fails: 0, withdrawals: 0, excuses: 0, deprivations: 0, deferrals: 0, retakes: 0, earnedHours: 0, registeredHours: 0 };
      const ch = course?.creditHours ?? 0;
      for (const e of enrollments) {
        c.registeredHours += ch;
        if (e.attemptNo > 1) c.retakes++;
        const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null;
        const cls = classify(st);
        if (cls === 'fail') c.fails++; if (cls === 'pass') c.earnedHours += ch;
        if (e.gradeStatusCode === 'W' || e.gradeStatusCode === 'FW') c.withdrawals++;
        if (['AB', 'E'].includes(e.gradeStatusCode ?? '')) c.excuses++;
        // includes the bylaw's configured >25%-absence code, not just the legacy DN set
        if (deprivedSet.has(e.gradeStatusCode ?? '')) c.deprivations++;
        if (['INC', 'I', 'DEFER'].includes(e.gradeStatusCode ?? '')) c.deferrals++;
      }
      const rows = [
        { bayan: 'إجمالي مرات التسجيل', value: enrollments.length }, { bayan: 'مرات الرسوب', value: c.fails },
        { bayan: 'مرات السحب', value: c.withdrawals }, { bayan: 'مرات الاعتذار/الغياب بعذر', value: c.excuses },
        { bayan: 'مرات الحرمان', value: c.deprivations }, { bayan: 'مرات التأجيل/غير مكتمل', value: c.deferrals },
        { bayan: 'مرات إعادة المقرر', value: c.retakes }, { bayan: 'إجمالي الساعات المكتسبة', value: c.earnedHours },
        { bayan: 'إجمالي الساعات المسجلة', value: c.registeredHours },
      ];
      return { kind: 'table', columns: [{ key: 'bayan', label: 'البيان' }, { key: 'value', label: 'العدد', align: 'center', numeric: true }], rows, meta: { course } };
    },
  },
];
