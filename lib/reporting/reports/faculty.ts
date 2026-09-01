import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';
import { termWhere } from '@/lib/reporting/filters';
import { classify } from '@/lib/reports';
import { studentSystemWhere } from '@/lib/academic-system';

/**
 * Faculty reports (ClientR3 — R2): teaching load + per-doctor pass/fail. Satisfaction/evaluation
 * KPIs have no backing data and are surfaced elsewhere as "awaiting data source" (no fabrication).
 */
const VIEW = 'reports.academic.view';

export const facultyReports: ReportDef[] = [
  {
    id: 'teaching-load', category: 'faculty', nameAr: 'العبء التدريسي لأعضاء هيئة التدريس',
    permission: VIEW, filters: ['departmentId'],
    run: async (f, ctx) => {
      const instructors = await prisma.instructor.findMany({
        where: { universityId: ctx.universityId ?? undefined, ...(f.departmentId ? { departmentId: f.departmentId } : {}) },
        include: { courses: { select: { code: true, nameAr: true, creditHours: true } } },
        orderBy: { name: 'asc' },
      });
      const rows = instructors.map((i) => ({
        instructor: i.name, courses: i.courses.length,
        hours: i.courses.reduce((s, c) => s + c.creditHours, 0),
        list: i.courses.map((c) => c.code).join('، ') || '—',
      }));
      return { kind: 'table', columns: [{ key: 'instructor', label: 'عضو هيئة التدريس' }, { key: 'courses', label: 'عدد المقررات', align: 'center', numeric: true }, { key: 'hours', label: 'ساعات العبء', align: 'center', numeric: true }, { key: 'list', label: 'المقررات' }], rows };
    },
  },
  {
    id: 'doctor-success', category: 'faculty', nameAr: 'نجاح ورسوب الطلاب لكل دكتور',
    permission: VIEW, filters: ['academicYear', 'semester', 'departmentId'], systemAware: true,
    run: async (f, ctx) => {
      const [instructors, statuses] = await Promise.all([
        prisma.instructor.findMany({ where: { universityId: ctx.universityId ?? undefined, ...(f.departmentId ? { departmentId: f.departmentId } : {}) }, include: { courses: { select: { id: true } } } }),
        prisma.gradeStatus.findMany(),
      ]);
      const byCode = new Map(statuses.map((s) => [s.code, s]));
      const rows = await Promise.all(instructors.map(async (i) => {
        const courseIds = i.courses.map((c) => c.id);
        // narrow the counted enrollments to the selected academic system (undefined → no filter)
        const enrollments = courseIds.length ? await prisma.enrollment.findMany({ where: { courseId: { in: courseIds }, ...termWhere(f), ...studentSystemWhere(ctx.academicSystem) }, select: { gradeStatusCode: true } }) : [];
        let pass = 0, fail = 0;
        for (const e of enrollments) { const cls = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null); if (cls === 'pass') pass++; else if (cls === 'fail') fail++; }
        return { instructor: i.name, pass, fail, rate: pass + fail ? `${Math.round((pass / (pass + fail)) * 100)}%` : '—' };
      }));
      return { kind: 'table', columns: [{ key: 'instructor', label: 'الدكتور' }, { key: 'pass', label: 'ناجحون', align: 'center', numeric: true }, { key: 'fail', label: 'راسبون', align: 'center', numeric: true }, { key: 'rate', label: 'نسبة النجاح', align: 'center' }], rows: rows.filter((r) => r.pass + r.fail > 0).sort((a, b) => b.pass - a.pass) };
    },
  },
];
