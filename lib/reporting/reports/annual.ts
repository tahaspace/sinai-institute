import prisma from '@/lib/prisma';
import type { ReportDef, ReportColumn, ReportRow } from '@/lib/reporting/types';
import { studentWhere } from '@/lib/reporting/filters';
import { computeAnnualForStudents, computeAnnualResult, getAnnualBands } from '@/lib/annual';

/**
 * Annual (traditional) result reports (Dual-system Phase 3). Surface the `lib/annual.ts` engine as
 * registry reports for ANNUAL programs — percentage marks + تقدير + سنوي result, NO GPA. The matrix
 * sheets carry `meta.ministrySheet` so «طباعة رسمية» prints the landscape ministry copy for signature.
 * Reuses the reports.transcripts.view permission (already granted) — no new RBAC key.
 */
const VIEW = 'reports.transcripts.view';
const INSTITUTE_FALLBACK = 'معهد سيناء العالي للدراسات النوعية';
const MINISTRY_SIGNATURES = ['رئيس الكنترول', 'وكيل المعهد لشؤون التعليم والطلاب', 'عميد المعهد'];

async function instituteName(universityId: string | null): Promise<string> {
  if (!universityId) return INSTITUTE_FALLBACK;
  const u = await prisma.university.findUnique({ where: { id: universityId }, select: { nameAr: true } });
  return u?.nameAr ?? INSTITUTE_FALLBACK;
}
// تقدير-band legend for the sheet footer (from the configured bands; same shape the hub expects).
async function bandFooter(): Promise<ReportRow[]> {
  return (await getAnnualBands()).map((b) => ({ code: b.label, name: `≥ ${b.min}%`, points: '—', minPercent: `${b.min}%` }));
}

export const annualReports: ReportDef[] = [
  {
    id: 'annual-result-sheet', category: 'annual', nameAr: 'كشف النتيجة السنوية',
    description: 'مصفوفة نتائج الفرقة (النظام السنوي): طالب × مادة بالنِّسَب المئوية + التقدير والنتيجة — تُصدَّر بصيغة الوزارة للتوقيع',
    permission: VIEW, filters: ['level', 'academicYear', 'departmentId', 'programId'], requires: ['level', 'academicYear'],
    run: async (f, ctx) => {
      const students = await prisma.student.findMany({ where: studentWhere(f, ctx.universityId ?? null), select: { id: true }, orderBy: { studentCode: 'asc' } });
      if (!students.length) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد طلاب بهذه المعايير' } };
      const results = await computeAnnualForStudents(students.map((s) => s.id), { academicYear: f.academicYear });
      const courseMap = new Map<string, { code: string; name: string }>();
      for (const r of results.values()) for (const c of r.courses) if (!courseMap.has(c.courseId)) courseMap.set(c.courseId, { code: c.code, name: c.name });
      const courseCols = [...courseMap.entries()].sort((a, b) => a[1].code.localeCompare(b[1].code));

      const ordered = students.map((s) => results.get(s.id)).filter((r): r is NonNullable<typeof r> => !!r);
      const rows: ReportRow[] = ordered.map((r) => {
        const row: ReportRow = { code: r.studentCode, name: r.name };
        for (const c of r.courses) row[c.courseId] = c.total != null ? c.total.toFixed(0) : '—';
        row.overall = r.overallPct != null ? r.overallPct.toFixed(1) : '—';
        row.grade = r.overallGrade ?? '—';
        row.result = r.result;
        return row;
      });
      const resultDist = new Map<string, number>(); const gradeDist = new Map<string, number>();
      for (const r of ordered) { resultDist.set(r.result, (resultDist.get(r.result) ?? 0) + 1); if (r.overallGrade) gradeDist.set(r.overallGrade, (gradeDist.get(r.overallGrade) ?? 0) + 1); }
      const stats = [{ label: 'إجمالي الطلاب', value: rows.length }, ...[...resultDist.entries()].map(([label, value]) => ({ label, value })), ...[...gradeDist.entries()].map(([label, value]) => ({ label: `تقدير ${label}`, value }))];
      const columns: ReportColumn[] = [
        { key: 'code', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' },
        ...courseCols.map(([id, c]) => ({ key: id, label: c.code, align: 'center' as const })),
        { key: 'overall', label: 'المجموع %', align: 'center', numeric: true }, { key: 'grade', label: 'التقدير', align: 'center' }, { key: 'result', label: 'النتيجة', align: 'center' },
      ];
      return {
        kind: 'sheet',
        title: `كشف النتيجة السنوية — الفرقة ${f.level} — ${f.academicYear}`,
        header: { المعهد: await instituteName(ctx.universityId), الفرقة: String(f.level), 'العام الجامعي': f.academicYear ?? '—' },
        footer: await bandFooter(),
        meta: { stats, courses: courseCols.map(([, c]) => `${c.code}: ${c.name}`), ministrySheet: { signatures: MINISTRY_SIGNATURES } },
        columns, rows,
        totals: { code: 'الإجمالي', name: `${rows.length} طالب` },
      };
    },
  },
  {
    id: 'annual-second-round', category: 'annual', nameAr: 'كشف طلاب الدور الثاني',
    description: 'الطلاب الذين لهم دور ثانٍ (رسوب في مواد ضمن حد التخلفات) والمواد المطلوبة', permission: VIEW,
    filters: ['level', 'academicYear', 'departmentId', 'programId'], requires: ['level', 'academicYear'],
    run: async (f, ctx) => annualStatusList(f, ctx, 'له دور ثانٍ'),
  },
  {
    id: 'annual-repeaters', category: 'annual', nameAr: 'كشف الباقين للإعادة',
    description: 'الطلاب الباقون للإعادة (تجاوزوا حد مواد التخلفات)', permission: VIEW,
    filters: ['level', 'academicYear', 'departmentId', 'programId'], requires: ['level', 'academicYear'],
    run: async (f, ctx) => annualStatusList(f, ctx, 'باقٍ للإعادة'),
  },
  {
    id: 'annual-transcript', category: 'annual', nameAr: 'بيان حالة سنوي (طالب)',
    description: 'نتائج الطالب في النظام السنوي عبر السنوات: المواد ونسبها والتقدير ونتيجة كل عام', permission: VIEW,
    filters: ['studentCode'], requires: ['studentCode'],
    run: async (f, ctx) => {
      const student = await prisma.student.findFirst({ where: { studentCode: f.studentCode, universityId: ctx.universityId ?? undefined }, include: { program: { select: { nameAr: true } }, department: { select: { nameAr: true } } } });
      if (!student) return { kind: 'table', columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'الطالب غير موجود' } };
      const years = (await prisma.enrollment.findMany({ where: { studentId: student.id }, select: { academicYear: true }, distinct: ['academicYear'], orderBy: { academicYear: 'asc' } })).map((e) => e.academicYear);
      const rows: ReportRow[] = [];
      for (const yr of years) {
        const r = await computeAnnualResult(student.id, { academicYear: yr });
        if (!r) continue;
        for (const c of r.courses) rows.push({ year: yr, code: c.code, name: c.name, mark: c.total != null ? c.total.toFixed(0) : '—', grade: c.grade ?? '—', outcome: c.graded ? (c.passed ? 'ناجح' : 'راسب') : 'قيد الرصد' });
        rows.push({ year: yr, code: '', name: '— نتيجة العام —', mark: r.overallPct != null ? r.overallPct.toFixed(1) : '—', grade: r.overallGrade ?? '—', outcome: r.result });
      }
      return {
        kind: 'sheet',
        title: `بيان حالة سنوي — ${student.nameAr}`,
        header: { المعهد: await instituteName(ctx.universityId), الطالب: student.nameAr, 'رقم الجلوس': student.studentCode, البرنامج: student.program?.nameAr ?? '—', القسم: student.department?.nameAr ?? '—', الفرقة: String(student.level) },
        footer: await bandFooter(),
        columns: [
          { key: 'year', label: 'العام' }, { key: 'code', label: 'كود المادة' }, { key: 'name', label: 'المادة' },
          { key: 'mark', label: 'النسبة %', align: 'center' }, { key: 'grade', label: 'التقدير', align: 'center' }, { key: 'outcome', label: 'النتيجة', align: 'center' },
        ],
        rows,
      };
    },
  },
];

// Shared roster for a سنوي result status (دور ثانٍ / باقٍ للإعادة).
async function annualStatusList(f: Record<string, string | undefined>, ctx: { universityId: string | null }, status: string) {
  const students = await prisma.student.findMany({ where: studentWhere(f, ctx.universityId ?? null), select: { id: true }, orderBy: { studentCode: 'asc' } });
  if (!students.length) return { kind: 'table' as const, columns: [{ key: 'm', label: '' }], rows: [], totals: { m: 'لا يوجد طلاب بهذه المعايير' } };
  const results = await computeAnnualForStudents(students.map((s) => s.id), { academicYear: f.academicYear });
  const rows: ReportRow[] = [...results.values()].filter((r) => r.result === status).map((r) => ({ code: r.studentCode, name: r.name, failedCount: r.failedCount, failed: r.failedCourses.join('، '), overall: r.overallPct != null ? r.overallPct.toFixed(1) : '—' }));
  return {
    kind: 'table' as const,
    columns: [{ key: 'code', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'failedCount', label: 'عدد مواد الرسوب', align: 'center' as const, numeric: true }, { key: 'failed', label: 'المواد' }, { key: 'overall', label: 'المجموع %', align: 'center' as const, numeric: true }],
    rows,
    totals: { code: 'الإجمالي', name: `${rows.length} طالب` },
  };
}
