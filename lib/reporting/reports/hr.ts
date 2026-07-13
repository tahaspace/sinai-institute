import prisma from '@/lib/prisma';
import type { ReportDef, ReportRow } from '@/lib/reporting/types';
import { NO_DATA } from '@/lib/reporting/kpi';

/**
 * HR reports (ClientR4 — R4c-3). Operational + management sheets over the HR module (employees,
 * attendance, leave, payroll) plus a workforce KPI centre. Anything without a data source shows
 * NO_DATA — never fabricated. Reports gate on the hr and payroll permissions the HR role holds.
 */
const EMP = 'hr.employee.view';
const ATT = 'hr.attendance.view';
const LEAVE = 'hr.leave.view';
const PAY = 'payroll.view';

async function nameMaps(universityId: string | null) {
  const [types, titles, depts] = await Promise.all([
    prisma.employeeType.findMany({ where: { universityId }, select: { id: true, code: true, nameAr: true } }),
    prisma.jobTitle.findMany({ where: { universityId }, select: { id: true, nameAr: true } }),
    prisma.adminDepartment.findMany({ where: { universityId }, select: { id: true, nameAr: true } }),
  ]);
  return {
    type: new Map(types.map((t) => [t.id, t.nameAr])),
    typeByCode: new Map(types.map((t) => [t.code, t.id])),
    title: new Map(titles.map((t) => [t.id, t.nameAr])),
    dept: new Map(depts.map((d) => [d.id, d.nameAr])),
  };
}

const monthRange = () => { const n = new Date(); const s = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)); const e = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0, 23, 59, 59)); return { s, e }; };

export const hrReports: ReportDef[] = [
  {
    id: 'hr-staff-list', category: 'hr', nameAr: 'كشف العاملين', description: 'جميع العاملين ببياناتهم الأساسية', permission: EMP, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const [emps, maps] = await Promise.all([prisma.employee.findMany({ where: { universityId: uid }, orderBy: { code: 'asc' } }), nameMaps(uid)]);
      const rows: ReportRow[] = emps.map((e) => ({ code: e.code, name: e.nameAr, type: e.employeeTypeId ? maps.type.get(e.employeeTypeId) ?? '—' : '—', dept: e.adminDepartmentId ? maps.dept.get(e.adminDepartmentId) ?? '—' : e.department ?? '—', jobTitle: e.jobTitleId ? maps.title.get(e.jobTitleId) ?? '—' : e.jobTitle ?? '—', phone: e.phone ?? '—', salary: Number(e.baseSalary).toFixed(2), status: e.hrStatus }));
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'type', label: 'النوع' }, { key: 'dept', label: 'الإدارة' }, { key: 'jobTitle', label: 'الوظيفة' }, { key: 'phone', label: 'الهاتف' }, { key: 'salary', label: 'الأساسي', align: 'center', numeric: true }, { key: 'status', label: 'الحالة', align: 'center' }], rows, totals: { code: 'الإجمالي', name: `${rows.length} موظف` } };
    },
  },
  {
    id: 'hr-staff-by-department', category: 'hr', nameAr: 'عدد العاملين حسب الإدارة', permission: EMP, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const [emps, maps] = await Promise.all([prisma.employee.findMany({ where: { universityId: uid }, select: { adminDepartmentId: true } }), nameMaps(uid)]);
      const m = new Map<string, number>();
      for (const e of emps) { const k = e.adminDepartmentId ? maps.dept.get(e.adminDepartmentId) ?? 'غير محدد' : 'غير محدد'; m.set(k, (m.get(k) ?? 0) + 1); }
      const rows = [...m.entries()].map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count);
      return { kind: 'table', columns: [{ key: 'dept', label: 'الإدارة' }, { key: 'count', label: 'العدد', align: 'center', numeric: true }], rows, totals: { dept: 'الإجمالي', count: emps.length } };
    },
  },
  {
    id: 'hr-new-hires', category: 'hr', nameAr: 'كشف التعيينات الجديدة', description: 'حسب تاريخ التعيين', permission: EMP, filters: ['dateFrom', 'dateTo'],
    run: async (f, ctx) => {
      const uid = ctx.universityId ?? null;
      const where: Record<string, unknown> = { universityId: uid, hireDate: { not: null } };
      if (f.dateFrom || f.dateTo) where.hireDate = { ...(f.dateFrom ? { gte: new Date(f.dateFrom) } : {}), ...(f.dateTo ? { lte: new Date(f.dateTo) } : {}) };
      const [emps, maps] = await Promise.all([prisma.employee.findMany({ where, orderBy: { hireDate: 'desc' } }), nameMaps(uid)]);
      const rows: ReportRow[] = emps.map((e) => ({ code: e.code, name: e.nameAr, dept: e.adminDepartmentId ? maps.dept.get(e.adminDepartmentId) ?? '—' : '—', hireDate: e.hireDate ? String(e.hireDate).slice(0, 10) : '—' }));
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'dept', label: 'الإدارة' }, { key: 'hireDate', label: 'تاريخ التعيين', align: 'center' }], rows, totals: { code: 'الإجمالي', name: `${rows.length}` } };
    },
  },
  {
    id: 'hr-attendance-summary', category: 'hr', nameAr: 'ملخص الحضور والغياب', description: 'حضور/غياب/تأخير لكل موظف خلال الفترة', permission: ATT, filters: ['dateFrom', 'dateTo'],
    run: async (f, ctx) => {
      const uid = ctx.universityId ?? null;
      const range = monthRange();
      const from = f.dateFrom ? new Date(f.dateFrom) : range.s; const to = f.dateTo ? new Date(f.dateTo) : range.e;
      const recs = await prisma.employeeAttendance.findMany({ where: { universityId: uid, date: { gte: from, lte: to } }, include: { employee: { select: { code: true, nameAr: true } } } });
      const m = new Map<string, { code: string; name: string; present: number; absent: number; late: number; lateMin: number }>();
      for (const r of recs) { const g = m.get(r.employeeId) ?? { code: r.employee.code, name: r.employee.nameAr, present: 0, absent: 0, late: 0, lateMin: 0 }; if (r.status === 'A') g.absent++; else g.present++; if (r.lateMinutes > 0) { g.late++; g.lateMin += r.lateMinutes; } m.set(r.employeeId, g); }
      const rows = [...m.values()].map((g) => ({ code: g.code, name: g.name, present: g.present, absent: g.absent, late: g.late, lateMin: g.lateMin }));
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'present', label: 'حضور', align: 'center', numeric: true }, { key: 'absent', label: 'غياب', align: 'center', numeric: true }, { key: 'late', label: 'مرات التأخير', align: 'center', numeric: true }, { key: 'lateMin', label: 'دقائق التأخير', align: 'center', numeric: true }], rows, totals: { code: 'الإجمالي', name: `${rows.length} موظف` } };
    },
  },
  {
    id: 'hr-leave-balances', category: 'hr', nameAr: 'أرصدة الإجازات', permission: LEAVE, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const [balances, types, emps] = await Promise.all([
        prisma.leaveBalance.findMany({ where: { universityId: uid, year: new Date().getUTCFullYear() } }),
        prisma.leaveType.findMany({ where: { universityId: uid }, select: { id: true, nameAr: true } }),
        prisma.employee.findMany({ where: { universityId: uid }, select: { id: true, nameAr: true } }),
      ]);
      const tName = new Map(types.map((t) => [t.id, t.nameAr])); const eName = new Map(emps.map((e) => [e.id, e.nameAr]));
      const rows: ReportRow[] = balances.map((b) => ({ name: eName.get(b.employeeId) ?? '—', type: tName.get(b.leaveTypeId) ?? '—', entitled: b.entitled, used: b.used, remaining: b.entitled - b.used }));
      return { kind: 'table', columns: [{ key: 'name', label: 'الموظف' }, { key: 'type', label: 'نوع الإجازة' }, { key: 'entitled', label: 'المستحق', align: 'center', numeric: true }, { key: 'used', label: 'المستهلك', align: 'center', numeric: true }, { key: 'remaining', label: 'المتبقي', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'hr-payroll-latest', category: 'hr', nameAr: 'كشف المرتبات (آخر مسير)', permission: PAY, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const run = await prisma.payRun.findFirst({ where: { universityId: uid }, orderBy: { month: 'desc' }, include: { payslips: { include: { employee: { select: { code: true, nameAr: true } } } } } });
      if (!run) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد مسير رواتب' } };
      const rows: ReportRow[] = run.payslips.map((p) => ({ code: p.employee.code, name: p.employee.nameAr, gross: Number(p.gross).toFixed(2), deductions: Number(p.deductions).toFixed(2), tax: Number(p.tax).toFixed(2), insurance: Number(p.insurance).toFixed(2), net: Number(p.net).toFixed(2) }));
      return { kind: 'table', columns: [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'gross', label: 'الإجمالي', align: 'center', numeric: true }, { key: 'deductions', label: 'الخصومات', align: 'center', numeric: true }, { key: 'tax', label: 'الضريبة', align: 'center', numeric: true }, { key: 'insurance', label: 'التأمين', align: 'center', numeric: true }, { key: 'net', label: 'الصافي', align: 'center', numeric: true }], rows, totals: { code: `مسير ${run.month}`, name: `${rows.length}`, net: Number(run.netTotal).toFixed(2) } };
    },
  },
  {
    id: 'hr-payroll-by-department', category: 'hr', nameAr: 'تكلفة الرواتب حسب الإدارة', permission: PAY, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const run = await prisma.payRun.findFirst({ where: { universityId: uid }, orderBy: { month: 'desc' }, include: { payslips: true } });
      if (!run) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد مسير رواتب' } };
      const [emps, maps] = await Promise.all([prisma.employee.findMany({ where: { universityId: uid }, select: { id: true, adminDepartmentId: true } }), nameMaps(uid)]);
      const deptOf = new Map(emps.map((e) => [e.id, e.adminDepartmentId]));
      const m = new Map<string, number>();
      for (const p of run.payslips) { const d = deptOf.get(p.employeeId); const k = d ? maps.dept.get(d) ?? 'غير محدد' : 'غير محدد'; m.set(k, (m.get(k) ?? 0) + Number(p.net)); }
      const rows = [...m.entries()].map(([dept, net]) => ({ dept, net: net.toFixed(2) })).sort((a, b) => Number(b.net) - Number(a.net));
      return { kind: 'table', columns: [{ key: 'dept', label: 'الإدارة' }, { key: 'net', label: 'صافي الرواتب', align: 'center', numeric: true }], rows, totals: { dept: `مسير ${run.month}`, net: Number(run.netTotal).toFixed(2) } };
    },
  },
  {
    id: 'hr-kpi-center', category: 'hr', nameAr: 'مركز مؤشرات الموارد البشرية', permission: EMP, filters: [],
    run: async (_f, ctx) => {
      const uid = ctx.universityId ?? null;
      const maps = await nameMaps(uid);
      const facultyTypeId = maps.typeByCode.get('FACULTY');
      const year = new Date().getUTCFullYear();
      const range = monthRange();
      const [total, active, faculty, newHires, run, att, loans] = await Promise.all([
        prisma.employee.count({ where: { universityId: uid } }),
        prisma.employee.count({ where: { universityId: uid, isActive: true } }),
        facultyTypeId ? prisma.employee.count({ where: { universityId: uid, employeeTypeId: facultyTypeId } }) : Promise.resolve(0),
        prisma.employee.count({ where: { universityId: uid, hireDate: { gte: new Date(Date.UTC(year, 0, 1)) } } }),
        prisma.payRun.findFirst({ where: { universityId: uid }, orderBy: { month: 'desc' } }),
        prisma.employeeAttendance.findMany({ where: { universityId: uid, date: { gte: range.s, lte: range.e } }, select: { status: true } }),
        prisma.loan.aggregate({ where: { universityId: uid, status: 'ACTIVE' }, _sum: { remaining: true } }),
      ]);
      const attRate = att.length ? `${Math.round((att.filter((a) => a.status !== 'A').length / att.length) * 100)}%` : NO_DATA;
      return {
        kind: 'kpi',
        cards: [
          { key: 'total', label: 'إجمالي العاملين', value: total },
          { key: 'active', label: 'على رأس العمل', value: active },
          { key: 'faculty', label: 'أعضاء هيئة التدريس', value: facultyTypeId ? faculty : NO_DATA },
          { key: 'new', label: `تعيينات ${year}`, value: newHires },
          { key: 'attRate', label: 'معدل الحضور (هذا الشهر)', value: attRate },
          { key: 'payroll', label: 'إجمالي الرواتب (آخر مسير)', value: run ? Number(run.netTotal).toFixed(2) : NO_DATA, unit: run ? 'ج.م' : undefined },
          { key: 'avg', label: 'متوسط تكلفة الموظف', value: run && active ? (Number(run.netTotal) / active).toFixed(2) : NO_DATA, unit: 'ج.م' },
          { key: 'loans', label: 'رصيد السلف القائمة', value: Number(loans._sum.remaining ?? 0).toFixed(2), unit: 'ج.م' },
        ],
      };
    },
  },
];
