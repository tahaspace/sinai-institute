import prisma from '@/lib/prisma';
import type { ReportDef, TableResult } from '@/lib/reporting/types';
import { studentWhere, termWhere, academicSystemWhere } from '@/lib/reporting/filters';
import { studentSystemWhere } from '@/lib/academic-system';
import { computeStandingForStudents } from '@/lib/standing';
import { getRegulations } from '@/lib/regulations';

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

// Two narrowing shapes live below. The Student rosters scope through `studentWhere`, which composes
// the academic-system fragment under AND. The transfer sheets have no Student row of their own, so
// both narrow through the SAME two-branch precedence the transfers screen badges a row with: the
// linked student's programme (`studentSystemWhere` on the optional `student` relation) where the
// student has one, else the request's own `programId`. Both are no-ops when the filter is
// absent/'all', so the unfiltered result is unchanged.
// ctx.academicSystem is the same value the hub sends as the `academicSystem` filter.
const VIEW = 'student.view';

export const studentAffairsReports: ReportDef[] = [
  {
    id: 'enrolled-students', category: 'student-affairs', nameAr: 'كشف الطلاب المقيدين',
    description: 'الطلاب المقيدون — فلتر السنة/القسم/البرنامج/المستوى', permission: VIEW,
    filters: ['academicYear', 'facultyId', 'departmentId', 'programId', 'level', 'qualification'], systemAware: true,
    run: (f, ctx) => studentRoster({ ...studentWhere(f, ctx.universityId), status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] } }),
  },
  {
    id: 'new-students', category: 'student-affairs', nameAr: 'كشف الطلاب المستجدين',
    description: 'طلاب المستوى الأول / حديثو القيد', permission: VIEW,
    filters: ['academicYear', 'departmentId', 'programId'], systemAware: true,
    run: (f, ctx) => studentRoster({ ...studentWhere(f, ctx.universityId), level: 1 }),
  },
  {
    id: 'withdrawn-students', category: 'student-affairs', nameAr: 'كشف المنسحبين',
    permission: VIEW, filters: ['departmentId', 'programId'], systemAware: true,
    run: (f, ctx) => studentRoster({ ...studentWhere(f, ctx.universityId), status: 'WITHDRAWN' }),
  },
  {
    id: 'dismissed-students', category: 'student-affairs', nameAr: 'كشف المفصولين',
    permission: VIEW, filters: ['departmentId', 'programId'], systemAware: true,
    run: (f, ctx) => studentRoster({ ...studentWhere(f, ctx.universityId), status: 'DISMISSED' }),
  },
  {
    id: 'hold-students', category: 'student-affairs', nameAr: 'الطلاب الذين لديهم Hold',
    description: 'طلاب عليهم إيقاف تسجيل (مالي/أكاديمي)', permission: VIEW,
    filters: ['departmentId', 'programId'], systemAware: true,
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
    filters: ['academicYear', 'semester', 'departmentId', 'programId'], requires: ['academicYear'], systemAware: true,
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
    permission: 'transfer.view', filters: ['departmentId', 'status'], systemAware: true,
    run: async (f, ctx) => {
      // Same precedence the transfers screen badges a row with: the linked student's own programme
      // first, then the request's own `programId` — the programme this request is attributed to:
      // transferred INTO for INCOMING, LEFT for OUTGOING. A row whose student carries NO programme
      // is therefore judged by the request's programme, not silently bucketed under credit-hours,
      // so the report can never contradict the badge. Legacy rows attributable through neither link
      // stay excluded from BOTH systems — listing them under a picked system would assert one
      // nobody recorded. With no system selected this is `{}` and the list is unchanged.
      const outSystem = ctx.academicSystem;
      const systemWhere = outSystem
        ? {
            OR: [
              // the student's own programme wins wherever the student has one …
              { AND: [{ student: { programId: { not: null } } }, studentSystemWhere(outSystem)] },
              // … otherwise the programme the request itself is attributed to.
              {
                AND: [
                  { OR: [{ studentId: null }, { student: { programId: null } }] },
                  { program: { academicSystem: outSystem } },
                ],
              },
            ],
          }
        : {};
      const reqs = await prisma.transferRequest.findMany({
        // Spreading is safe: `systemWhere` is `{}` unless a system is picked, and the base where
        // below carries no OR of its own for its single OR key to collide with.
        where: {
          universityId: ctx.universityId ?? undefined,
          direction: 'OUTGOING',
          ...(f.status ? { status: f.status } : {}),
          // departmentId is declared in `filters`, so it has to be honoured — the hub rendering a
          // control the query ignores is the silent lie this whole rollout exists to remove.
          // Under AND because systemWhere already contributes a top-level OR.
          ...(f.departmentId ? { AND: [{ departmentId: f.departmentId }] } : {}),
          ...systemWhere,
        },
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
    description: 'طلاب محوَّلون من جهات أخرى', permission: 'transfer.view', filters: ['departmentId', 'status'], systemAware: true,
    run: async (f, ctx) => {
      // An incoming applicant is not a student here yet, so — exactly like an admission application —
      // the request's own `programId` is what attributes it to a system. That field is the programme
      // the request is attributed to: transferred INTO for INCOMING, LEFT for OUTGOING. The create
      // path now refuses a request in EITHER direction that would end up with no programme, so this
      // report genuinely narrows and declares `systemAware`; it did not before, when every incoming
      // row was unlinked and a system pick could only blank the table.
      //
      // Precedence is identical to كشف المحولين and to the screen's own badge: the linked student's
      // programme where the student has one (a returning student recorded against their existing
      // file), the request's programme otherwise. Legacy rows attributable through neither link stay
      // excluded from both systems.
      const system = ctx.academicSystem;
      const systemWhere = system
        ? {
            OR: [
              // the student's own programme wins wherever the student has one …
              { AND: [{ student: { programId: { not: null } } }, studentSystemWhere(system)] },
              // … otherwise the programme the request itself is attributed to.
              {
                AND: [
                  { OR: [{ studentId: null }, { student: { programId: null } }] },
                  { program: { academicSystem: system } },
                ],
              },
            ],
          }
        : {};
      const reqs = await prisma.transferRequest.findMany({
        // Spreading is safe: `systemWhere` is `{}` unless a system is picked, and the base where
        // below carries no OR of its own for its single OR key to collide with.
        where: {
          universityId: ctx.universityId ?? undefined,
          direction: 'INCOMING',
          ...(f.status ? { status: f.status } : {}),
          // departmentId is declared in `filters`, so it has to be honoured — the hub rendering a
          // control the query ignores is the silent lie this whole rollout exists to remove.
          // Under AND because systemWhere already contributes a top-level OR.
          ...(f.departmentId ? { AND: [{ departmentId: f.departmentId }] } : {}),
          ...systemWhere,
        },
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
    filters: ['departmentId', 'programId', 'level'], systemAware: true,
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
    // «مرتبه الشرف علي حسب شروط لائحة بعمل بيها تقرير وسيستم بيرتبلي الطلاب اللي حصلوا علي شروط دي
    //  اللي موضحة في اللائحة» — the ranked institute-wide honour list the bylaw asks the system to
    // produce. The four conditions themselves live in lib/standing.ts (ANDed there, with the
    // thresholds read from Regulations); this report only selects and ranks, so the list can never
    // drift from the standing screen's verdict.
    id: 'honor-roll', category: 'academic', nameAr: 'قائمة مرتبة الشرف (مرتَّبة)',
    description: 'الطلاب المستوفون لشروط مرتبة الشرف مرتَّبين بالمعدل التراكمي',
    permission: VIEW, filters: ['academicYear', 'departmentId', 'programId', 'level'],
    run: async (f, ctx) => {
      // مرتبة الشرف is a GPA/CGPA verdict, so it exists only under نظام الساعات المعتمدة — scoped
      // like كشف الخريجين, and therefore NOT declared systemAware: the pick would not narrow, it
      // would only be able to empty the sheet.
      const reg = await getRegulations();
      const students = await prisma.student.findMany({
        where: { ...studentWhere(f, ctx.universityId), status: { notIn: ['WITHDRAWN', 'DISMISSED'] }, ...academicSystemWhere('CREDIT_HOURS') },
        select: { id: true, studentCode: true, nameAr: true, level: true, department: { select: { nameAr: true } }, program: { select: { nameAr: true } } },
        orderBy: { studentCode: 'asc' },
      });
      const standings = await computeStandingForStudents(students.map((s) => s.id));
      const rows = students
        .map((s) => ({ s, st: standings.get(s.id) }))
        .filter(({ st }) => st?.honorRoll)
        // «وسيستم بيرتبلي الطلاب» — the ranking IS the deliverable. Ties keep the student-code order
        // the query already imposed, so a re-run of the same term prints the same sheet.
        .sort((a, b) => (b.st!.cgpa - a.st!.cgpa))
        .map(({ s, st }, i) => ({
          rank: i + 1,
          studentCode: s.studentCode,
          name: s.nameAr,
          department: s.department?.nameAr ?? '—',
          program: s.program?.nameAr ?? '—',
          level: s.level,
          cgpa: st!.cgpa.toFixed(2),
          earnedHours: st!.earnedHours,
        }));
      return {
        kind: 'table',
        columns: [
          { key: 'rank', label: 'الترتيب', align: 'center', numeric: true },
          { key: 'studentCode', label: 'الرقم الجامعي' }, { key: 'name', label: 'الاسم' },
          { key: 'department', label: 'القسم' }, { key: 'program', label: 'البرنامج' },
          { key: 'level', label: 'المستوى', align: 'center', numeric: true },
          { key: 'cgpa', label: 'المعدل التراكمي', align: 'center', numeric: true },
          { key: 'earnedHours', label: 'الساعات المكتسبة', align: 'center', numeric: true },
        ],
        rows,
        // The thresholds are quoted from the institute's own bylaw settings, never from a literal,
        // so a sheet printed today says which rule produced it.
        totals: { rank: 'الإجمالي', name: `${rows.length} طالب`, cgpa: `الشروط: تراكمي ≥ ${reg.honorCgpa} · كل فصل ≥ ${reg.honorTermGpa} · بدون رسوب` },
        meta: { count: rows.length },
      };
    },
  },
  {
    id: 'graduates', category: 'student-affairs', nameAr: 'كشف الخريجين (المستوفون لشروط التخرج)',
    permission: 'graduation.view', filters: ['academicYear', 'departmentId', 'programId'],
    run: async (f, ctx) => {
      // Credit-hours graduation (earned hours + CGPA). Annual graduates come from the annual
      // result family (اجتياز الفرقة النهائية), so scope this sheet to credit students only.
      const students = await prisma.student.findMany({
        where: { ...studentWhere(f, ctx.universityId), status: { notIn: ['WITHDRAWN', 'DISMISSED'] }, ...academicSystemWhere('CREDIT_HOURS') },
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
