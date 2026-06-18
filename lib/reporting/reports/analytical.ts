import prisma from '@/lib/prisma';
import type { ReportDef } from '@/lib/reporting/types';

/**
 * Strategic / multi-year analytics (ClientR3 — R5). Aggregates over academicYear-stamped data +
 * cohort years. (Snapshot-backed trends arrive once the nightly KpiSnapshot cron runs.)
 */
const VIEW = 'reports.analytical.view';

export const analyticalReports: ReportDef[] = [
  {
    id: 'student-growth', category: 'analytical', nameAr: 'معدل نمو الطلاب عبر السنوات',
    description: 'أعداد المستجدين حسب سنة الالتحاق', permission: VIEW, filters: [],
    run: async (_f, ctx) => {
      const students = await prisma.student.findMany({ where: { universityId: ctx.universityId ?? undefined }, select: { enrollYear: true } });
      const m = new Map<number, number>();
      for (const s of students) { if (s.enrollYear) m.set(s.enrollYear, (m.get(s.enrollYear) ?? 0) + 1); }
      const years = [...m.keys()].sort();
      const rows = years.map((y, i) => { const cur = m.get(y)!; const prev = i > 0 ? m.get(years[i - 1])! : 0; return { year: y, count: cur, growth: prev ? `${Math.round(((cur - prev) / prev) * 100)}%` : '—' }; });
      return { kind: 'table', columns: [{ key: 'year', label: 'سنة الالتحاق', align: 'center' }, { key: 'count', label: 'عدد المستجدين', align: 'center', numeric: true }, { key: 'growth', label: 'نسبة النمو', align: 'center' }], rows, totals: { year: 'الإجمالي', count: students.filter((s) => s.enrollYear).length } };
    },
  },
  {
    id: 'enrollment-volume-by-year', category: 'analytical', nameAr: 'حجم التسجيل عبر السنوات الدراسية',
    permission: VIEW, filters: [],
    run: async () => {
      const grouped = await prisma.enrollment.groupBy({ by: ['academicYear'], _count: { _all: true }, orderBy: { academicYear: 'asc' } });
      const rows = grouped.map((g) => ({ year: g.academicYear, count: g._count._all }));
      return { kind: 'table', columns: [{ key: 'year', label: 'السنة الدراسية', align: 'center' }, { key: 'count', label: 'عدد التسجيلات', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'retake-trend', category: 'analytical', nameAr: 'تكرار إعادة المقررات عبر السنوات',
    description: 'عدد التسجيلات بمحاولة أكثر من الأولى', permission: VIEW, filters: [],
    run: async () => {
      const grouped = await prisma.enrollment.groupBy({ by: ['academicYear'], where: { attemptNo: { gt: 1 } }, _count: { _all: true }, orderBy: { academicYear: 'asc' } });
      const rows = grouped.map((g) => ({ year: g.academicYear, retakes: g._count._all }));
      return { kind: 'table', columns: [{ key: 'year', label: 'السنة الدراسية', align: 'center' }, { key: 'retakes', label: 'عدد الإعادات', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'library-most-borrowed', category: 'analytical', nameAr: 'الكتب الأكثر استعارة',
    permission: VIEW, filters: [],
    run: async () => {
      const borrowings = await prisma.borrowing.findMany({ include: { book: { select: { title: true, author: true } } } });
      const m = new Map<string, { title: string; author: string; count: number }>();
      for (const b of borrowings) { const g = m.get(b.bookId) ?? { title: b.book.title, author: b.book.author ?? '—', count: 0 }; g.count++; m.set(b.bookId, g); }
      const rows = [...m.values()].sort((a, b) => b.count - a.count).slice(0, 50);
      return { kind: 'table', columns: [{ key: 'title', label: 'الكتاب' }, { key: 'author', label: 'المؤلف' }, { key: 'count', label: 'مرات الاستعارة', align: 'center', numeric: true }], rows };
    },
  },
  {
    id: 'marketing-efficiency', category: 'analytical', nameAr: 'كفاءة حملات التسويق',
    permission: VIEW, filters: [],
    run: async () => {
      const campaigns = await prisma.marketingCampaign.findMany({ orderBy: { startDate: 'desc' } });
      const rows = campaigns.map((c) => ({ name: c.name, spent: c.spent.toFixed(2), leads: c.leads, conversions: c.conversions, cpl: c.leads ? (c.spent / c.leads).toFixed(2) : '—', convRate: c.leads ? `${Math.round((c.conversions / c.leads) * 100)}%` : '—' }));
      return { kind: 'table', columns: [{ key: 'name', label: 'الحملة' }, { key: 'spent', label: 'المنصرف', align: 'center', numeric: true }, { key: 'leads', label: 'عملاء محتملون', align: 'center', numeric: true }, { key: 'conversions', label: 'تحويلات', align: 'center', numeric: true }, { key: 'cpl', label: 'تكلفة العميل', align: 'center' }, { key: 'convRate', label: 'نسبة التحويل', align: 'center' }], rows };
    },
  },
];
