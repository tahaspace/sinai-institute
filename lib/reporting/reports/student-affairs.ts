import prisma from '@/lib/prisma';
import type { ReportDef, TableResult } from '@/lib/reporting/types';
import { studentWhere, termWhere } from '@/lib/reporting/filters';
import { computeStandingForStudents } from '@/lib/standing';

/**
 * Student-affairs rosters (ClientR3 — R1). Most reuse the Student model + the standing engine.
 * Each returns a normalized table the hub renders and the export serializes.
 */
const STUDENT_COLS = [
  { key: 'studentCode', label: 'الرقم الجامعي' },
  { key: 'name', label: 'الاسم' },
  { key: 'department', label: 'القسم' },
  { key: 'program', label: 'البرنامج' },
  { key: 'level', label: 'المستوى', align: 'center' as const, numeric: true },
  { key: 'status', label: 'الحالة', align: 'center' as const },
];

async function studentRoster(where: Record<string, unknown>, label?: string): Promise<TableResult> {
  const students = await prisma.student.findMany({
    where,
    select: { studentCode: true, nameAr: true, level: true, status: true, department: { select: { nameAr: true } }, program: { select: { nameAr: true } } },
    orderBy: { studentCode: 'asc' },
  });
  return {
    kind: 'table',
    columns: STUDENT_COLS,
    rows: students.map((s) => ({ studentCode: s.studentCode, name: s.nameAr, department: s.department?.nameAr ?? '—', program: s.program?.nameAr ?? '—', level: s.level, status: s.status })),
    totals: { studentCode: label ?? 'الإجمالي', name: `${students.length} طالب` },
    meta: { count: students.length },
  };
}

const VIEW = 'student.view';

export const studentAffairsReports: ReportDef[] = [
  {
    id: 'enrolled-students', category: 'student-affairs', nameAr: 'كشف الطلاب المقيدين',
    description: 'الطلاب المقيدون — فلتر السنة/القسم/البرنامج/المستوى', permission: VIEW,
    filters: ['academicYear', 'facultyId', 'departmentId', 'programId', 'level', 'qualification'],
    run: (f, ctx) => studentRoster({ ...studentWhere(f, ctx.universityId), status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] } }),
  },
  {
    id: 'new-students', category: 'student-affairs', nameAr: 'كشف الطلاب المستجدين',
    description: 'طلاب المستوى الأول / حديثو القيد', permission: VIEW,
    filters: ['academicYear', 'departmentId', 'programId'],
    run: (f, ctx) => studentRoster({ ...studentWhere(f, ctx.universityId), level: 1 }),
  },
  {
    id: 'withdrawn-students', category: 'student-affairs', nameAr: 'كشف المنسحبين',
    permission: VIEW, filters: ['departmentId', 'programId'],
    run: (f, ctx) => studentRoster({ ...studentWhere(f, ctx.universityId), status: 'WITHDRAWN' }),
  },
  {
    id: 'dismissed-students', category: 'student-affairs', nameAr: 'كشف المفصولين',
    permission: VIEW, filters: ['departmentId', 'programId'],
    run: (f, ctx) => studentRoster({ ...studentWhere(f, ctx.universityId), status: 'DISMISSED' }),
  },
  {
    id: 'hold-students', category: 'student-affairs', nameAr: 'الطلاب الذين لديهم Hold',
    description: 'طلاب عليهم إيقاف تسجيل (مالي/أكاديمي)', permission: VIEW,
    filters: ['departmentId', 'programId'],
    run: async (f, ctx) => {
      const students = await prisma.student.findMany({
        where: { ...studentWhere(f, ctx.universityId), holdStatus: true },
        select: { studentCode: true, nameAr: true, level: true, holdReason: true, department: { select: { nameAr: true } } },
        orderBy: { studentCode: 'asc' },
      });
      return {
        kind: 'table',
        columns: [...STUDENT_COLS.slice(0, 3), { key: 'level', label: 'المستوى', align: 'center', numeric: true }, { key: 'holdReason', label: 'سبب الإيقاف' }],
        rows: students.map((s) => ({ studentCode: s.studentCode, name: s.nameAr, department: s.department?.nameAr ?? '—', level: s.level, holdReason: s.holdReason ?? '—' })),
        totals: { studentCode: 'الإجمالي', name: `${students.length} طالب` },
      };
    },
  },
  {
    id: 'not-registered', category: 'student-affairs', nameAr: 'الطلاب غير المسجلين',
    description: 'مقيدون لم يسجلوا مقررات في الفصل المحدد', permission: VIEW,
    filters: ['academicYear', 'semester', 'departmentId', 'programId'], requires: ['academicYear'],
    run: async (f, ctx) => {
      const term = termWhere(f);
      const registered = await prisma.enrollment.findMany({ where: term, select: { studentId: true }, distinct: ['studentId'] });
      const regIds = new Set(registered.map((r) => r.studentId));
      const students = await prisma.student.findMany({
        where: { ...studentWhere(f, ctx.universityId), status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] } },
        select: { id: true, studentCode: true, nameAr: true, level: true, department: { select: { nameAr: true } }, program: { select: { nameAr: true } } },
        orderBy: { studentCode: 'asc' },
      });
      const rows = students.filter((s) => !regIds.has(s.id)).map((s) => ({ studentCode: s.studentCode, name: s.nameAr, department: s.department?.nameAr ?? '—', program: s.program?.nameAr ?? '—', level: s.level, status: 'غير مسجل' }));
      return { kind: 'table', columns: STUDENT_COLS, rows, totals: { studentCode: 'الإجمالي', name: `${rows.length} طالب` } };
    },
  },
  {
    id: 'transferred-students', category: 'student-affairs', nameAr: 'كشف المحولين',
    permission: 'transfer.view', filters: ['departmentId', 'status'],
    run: async (f, ctx) => {
      const reqs = await prisma.transferRequest.findMany({
        where: { universityId: ctx.universityId ?? undefined, direction: 'OUTGOING', ...(f.status ? { status: f.status } : {}) },
        select: { studentName: true, institution: true, department: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return {
        kind: 'table',
        columns: [{ key: 'studentName', label: 'الطالب' }, { key: 'department', label: 'القسم' }, { key: 'institution', label: 'الجهة المحوَّل إليها' }, { key: 'status', label: 'الحالة', align: 'center' }],
        rows: reqs.map((r) => ({ studentName: r.studentName, department: r.department ?? '—', institution: r.institution, status: r.status })),
        totals: { studentName: 'الإجمالي', department: `${reqs.length}` },
      };
    },
  },
  {
    id: 'incoming-students', category: 'student-affairs', nameAr: 'كشف الطلاب الوافدين',
    description: 'طلاب محوَّلون من جهات أخرى', permission: 'transfer.view', filters: ['departmentId', 'status'],
    run: async (f, ctx) => {
      const reqs = await prisma.transferRequest.findMany({
        where: { universityId: ctx.universityId ?? undefined, direction: 'INCOMING', ...(f.status ? { status: f.status } : {}) },
        select: { studentName: true, institution: true, department: true, status: true },
        orderBy: { createdAt: 'desc' },
      });
      return {
        kind: 'table',
        columns: [{ key: 'studentName', label: 'الطالب' }, { key: 'department', label: 'القسم' }, { key: 'institution', label: 'الجهة الوافد منها' }, { key: 'status', label: 'الحالة', align: 'center' }],
        rows: reqs.map((r) => ({ studentName: r.studentName, department: r.department ?? '—', institution: r.institution, status: r.status })),
        totals: { studentName: 'الإجمالي', department: `${reqs.length}` },
      };
    },
  },
  {
    id: 'guardians-data', category: 'student-affairs', nameAr: 'بيانات أولياء الأمور',
    description: 'الاسم والهاتف والحساب البنكي لولي الأمر', permission: VIEW,
    filters: ['departmentId', 'programId', 'level'],
    run: async (f, ctx) => {
      const students = await prisma.student.findMany({
        where: studentWhere(f, ctx.universityId),
        select: { studentCode: true, nameAr: true, guardians: { select: { name: true, relation: true, phone: true, bankAccount: true } } },
        orderBy: { studentCode: 'asc' },
      });
      const rows = students.flatMap((s) => s.guardians.map((g) => ({ studentCode: s.studentCode, student: s.nameAr, guardian: g.name, relation: g.relation, phone: g.phone ?? '—', bankAccount: g.bankAccount ?? '—' })));
      return {
        kind: 'table',
        columns: [{ key: 'studentCode', label: 'الرقم الجامعي' }, { key: 'student', label: 'الطالب' }, { key: 'guardian', label: 'ولي الأمر' }, { key: 'relation', label: 'الصلة', align: 'center' }, { key: 'phone', label: 'الهاتف', align: 'center' }, { key: 'bankAccount', label: 'الحساب البنكي', align: 'center' }],
        rows,
        totals: { studentCode: 'الإجمالي', student: `${rows.length}` },
      };
    },
  },
  {
    id: 'graduates', category: 'student-affairs', nameAr: 'كشف الخريجين (المستوفون لشروط التخرج)',
    permission: 'graduation.view', filters: ['academicYear', 'departmentId', 'programId'],
    run: async (f, ctx) => {
      const students = await prisma.student.findMany({
        where: { ...studentWhere(f, ctx.universityId), status: { notIn: ['WITHDRAWN', 'DISMISSED'] } },
        select: { id: true, studentCode: true, nameAr: true, department: { select: { nameAr: true } } },
        orderBy: { studentCode: 'asc' },
      });
      const standings = await computeStandingForStudents(students.map((s) => s.id));
      const rows = students
        .map((s) => ({ s, st: standings.get(s.id) }))
        .filter(({ st }) => st?.graduationEligible)
        .map(({ s, st }) => ({ studentCode: s.studentCode, name: s.nameAr, department: s.department?.nameAr ?? '—', cgpa: st!.cgpa.toFixed(2), earnedHours: st!.earnedHours }));
      return {
        kind: 'table',
        columns: [{ key: 'studentCode', label: 'الرقم الجامعي' }, { key: 'name', label: 'الاسم' }, { key: 'department', label: 'القسم' }, { key: 'cgpa', label: 'المعدل التراكمي', align: 'center', numeric: true }, { key: 'earnedHours', label: 'الساعات المجتازة', align: 'center', numeric: true }],
        rows,
        totals: { studentCode: 'إجمالي الخريجين', name: `${rows.length}` },
      };
    },
  },
];
