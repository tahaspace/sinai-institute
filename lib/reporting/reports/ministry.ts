import prisma from '@/lib/prisma';
import type { ReportDef, Filters, ReportContext, ReportRow } from '@/lib/reporting/types';
import { termWhere, SEMESTERS } from '@/lib/reporting/filters';
import { ministrySheet } from '@/lib/reports';

/**
 * Ministry exam-board sheets (ClientR3 — R1 + polish). Reuse lib/reports.ministrySheet (transitional
 * / final / deprived) — the rosters the ministry accepts — and wrap each in the official print
 * letterhead: header (institute / sheet / academic year / term) + grade-scale footer read live from
 * the GradeStatus config table (not hardcoded, so it always matches the institute's bylaw).
 */
const VIEW = 'reports.view';
const INSTITUTE_FALLBACK = 'معهد سيناء العالي للدراسات النوعية';

// Build the print letterhead: header lines + the grade-scale legend the ministry sheet must carry.
async function letterhead(stageLabel: string, f: Filters, ctx: ReportContext): Promise<{ header: Record<string, string>; footer: ReportRow[] }> {
  const [uni, letters] = await Promise.all([
    ctx.universityId ? prisma.university.findUnique({ where: { id: ctx.universityId }, select: { nameAr: true } }) : Promise.resolve(null),
    prisma.gradeStatus.findMany({
      where: { isLetter: true, ...(ctx.universityId ? { universityId: ctx.universityId } : {}) },
      orderBy: [{ minPercent: 'desc' }, { order: 'asc' }],
    }),
  ]);
  const semLabel = SEMESTERS.find((s) => s.value === f.semester)?.label;
  const header: Record<string, string> = {
    المعهد: uni?.nameAr ?? INSTITUTE_FALLBACK,
    الكشف: stageLabel,
    'العام الجامعي': f.academicYear ?? '—',
    'الفصل الدراسي': semLabel ?? 'كل الفصول',
    'تاريخ الطباعة': new Date().toLocaleDateString('ar-EG'),
  };
  // Dedupe by code (guards the single-tenant / null-universityId case where letters could repeat).
  const seen = new Set<string>();
  const footer: ReportRow[] = [];
  for (const g of letters) {
    if (seen.has(g.code)) continue;
    seen.add(g.code);
    footer.push({ code: g.code, name: g.name, points: g.points != null ? g.points.toFixed(2) : '—', minPercent: g.minPercent != null ? `${g.minPercent}%` : '—' });
  }
  return { header, footer };
}

function sheet(id: string, nameAr: string, stage: 'transitional' | 'final' | 'deprived'): ReportDef {
  return {
    id, category: 'ministry', nameAr, permission: VIEW, filters: ['academicYear', 'semester'],
    run: async (f, ctx) => {
      const [r, lh] = await Promise.all([ministrySheet(stage, termWhere(f)), letterhead(nameAr, f, ctx)]);
      if (stage === 'deprived') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (r.rows as any[]).map((x) => ({ studentCode: x.studentCode, name: x.name, department: x.department, level: x.level, courses: x.courses.map((c: { code: string; statusCode: string }) => `${c.code}(${c.statusCode})`).join('، ') }));
        return { kind: 'sheet', title: nameAr, header: lh.header, footer: lh.footer, columns: [{ key: 'studentCode', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'department', label: 'القسم' }, { key: 'level', label: 'المستوى', align: 'center', numeric: true }, { key: 'courses', label: 'المقررات' }], rows, totals: { studentCode: 'الإجمالي', name: `${rows.length}` } };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (r.rows as any[]).map((x) => ({ studentCode: x.studentCode, name: x.name, department: x.department, level: x.level, cgpa: x.cgpa.toFixed(2), earnedHours: x.earnedHours }));
      return { kind: 'sheet', title: nameAr, header: lh.header, footer: lh.footer, columns: [{ key: 'studentCode', label: 'رقم الجلوس' }, { key: 'name', label: 'الاسم' }, { key: 'department', label: 'القسم' }, { key: 'level', label: 'المستوى', align: 'center', numeric: true }, { key: 'cgpa', label: 'المعدل التراكمي', align: 'center', numeric: true }, { key: 'earnedHours', label: 'الساعات', align: 'center', numeric: true }], rows, totals: { studentCode: 'الإجمالي', name: `${rows.length}` } };
    },
  };
}

export const ministryReports: ReportDef[] = [
  sheet('ministry-transitional', 'كشف الوزارة — الفرق الانتقالية', 'transitional'),
  sheet('ministry-final', 'كشف الوزارة — فرقة التخرج', 'final'),
  sheet('ministry-deprived', 'كشف الوزارة — المحرومون / الغائبون', 'deprived'),
];
