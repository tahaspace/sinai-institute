import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';
import { computeStandingForStudents } from '@/lib/standing';
import { academicSystemWhere } from '@/lib/academic-system';

/**
 * Academic-advisor reports (ClientR3 — R2): advisor load, withdrawals, failing/at-risk, and top
 * students per advisor. Built over Student.advisorId + the standing engine.
 */
const VIEW = 'advising.view';

export const advisorReports: ReportDef[] = [
  {
    id: 'advisor-load', category: 'advisor', nameAr: 'أعداد طلاب كل مرشد',
    permission: VIEW, filters: ['departmentId'], systemAware: true,
    run: async (f, ctx) => {
      const advisors = await prisma.instructor.findMany({
        where: { universityId: ctx.universityId ?? undefined, ...(f.departmentId ? { departmentId: f.departmentId } : {}) },
        // count only advisees in the selected academic system (undefined → all advisees)
        include: { advisees: { where: academicSystemWhere(ctx.academicSystem), select: { status: true } } },
        orderBy: { name: 'asc' },
      });
      const rows = advisors.map((a) => ({
        advisor: a.name, total: a.advisees.length,
        active: a.advisees.filter((s) => !['WITHDRAWN', 'DISMISSED', 'GRADUATED'].includes(s.status)).length,
        withdrawn: a.advisees.filter((s) => s.status === 'WITHDRAWN').length,
      })).filter((r) => r.total > 0);
      return { kind: 'table', columns: [{ key: 'advisor', label: 'المرشد' }, { key: 'total', label: 'إجمالي الطلاب', align: 'center', numeric: true }, { key: 'active', label: 'نشطون', align: 'center', numeric: true }, { key: 'withdrawn', label: 'منسحبون', align: 'center', numeric: true }], rows, totals: { advisor: 'الإجمالي', total: rows.reduce((s, r) => s + r.total, 0) } };
    },
  },
  {
    id: 'advisor-at-risk', category: 'advisor', nameAr: 'الطلاب الراسبون / تحت المراقبة لكل مرشد',
    description: 'طلاب المعدل أقل من 2.00 أو تحت الإنذار', permission: VIEW, filters: ['advisorId'], requires: ['advisorId'], systemAware: true,
    run: async (f, ctx) => {
      // academic-system filter (undefined → no filter)
      const students = await prisma.student.findMany({ where: { advisorId: f.advisorId, ...academicSystemWhere(ctx.academicSystem) }, select: { id: true, studentCode: true, nameAr: true } });
      const standings = await computeStandingForStudents(students.map((s) => s.id));
      const rows = students
        .map((s) => ({ s, st: standings.get(s.id) }))
        .filter(({ st }) => st && (st.onProbation || st.escalation !== 'none'))
        .map(({ s, st }) => ({ studentCode: s.studentCode, name: s.nameAr, cgpa: st!.cgpa.toFixed(2), status: st!.escalation === 'track-change-or-dismissal' ? 'إنذار نهائي' : 'تحت الملاحظة' }));
      return { kind: 'table', columns: [{ key: 'studentCode', label: 'الرقم' }, { key: 'name', label: 'الاسم' }, { key: 'cgpa', label: 'المعدل التراكمي', align: 'center', numeric: true }, { key: 'status', label: 'الحالة', align: 'center' }], rows, totals: { studentCode: 'الإجمالي', name: `${rows.length}` } };
    },
  },
  {
    id: 'advisor-top', category: 'advisor', nameAr: 'الطلاب الأعلى تقديراً لكل مرشد',
    permission: VIEW, filters: ['advisorId'], requires: ['advisorId'], systemAware: true,
    run: async (f, ctx) => {
      // academic-system filter (undefined → no filter)
      const students = await prisma.student.findMany({ where: { advisorId: f.advisorId, ...academicSystemWhere(ctx.academicSystem) }, select: { id: true, studentCode: true, nameAr: true } });
      const standings = await computeStandingForStudents(students.map((s) => s.id));
      const rows = students
        .map((s) => ({ s, st: standings.get(s.id) }))
        .filter(({ st }) => st && st.gpaHours > 0)
        .sort((a, b) => b.st!.cgpa - a.st!.cgpa)
        .slice(0, 20)
        .map(({ s, st }, i) => ({ rank: i + 1, studentCode: s.studentCode, name: s.nameAr, cgpa: st!.cgpa.toFixed(2), honor: st!.cumulativeHonor ? 'قائمة الشرف' : '' }));
      return { kind: 'table', columns: [{ key: 'rank', label: 'الترتيب', align: 'center', numeric: true }, { key: 'studentCode', label: 'الرقم' }, { key: 'name', label: 'الاسم' }, { key: 'cgpa', label: 'المعدل التراكمي', align: 'center', numeric: true }, { key: 'honor', label: 'تميز', align: 'center' }], rows };
    },
  },
];
