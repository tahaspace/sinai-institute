import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/finance/reports — financial reporting view.
// Reuses the FeeAccount/Payment reduce logic from /api/institute/finance for the
// summary cards, plus a real monthly paid-Payment time series, plus a code-defined
// list of available report types (definitions, not stored rows).

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// Report definitions are navigation/config, not DB rows: link each to the real
// registrar report suite rather than a fabricated downloadable file.
const REPORT_TYPES = [
  { name: 'تقرير التحصيل الشهري', type: 'شهري', href: '/api/institute/reports?type=collection' },
  { name: 'تقرير المتأخرات', type: 'أسبوعي', href: '/api/institute/reports?type=overdue' },
  { name: 'تقرير المنح والإعفاءات', type: 'فصلي', href: '/api/institute/reports?type=scholarships' },
  { name: 'التقرير المالي الشامل', type: 'سنوي', href: '/api/institute/reports?type=finance' },
];

export async function GET() {
  try {
    const guard = await requirePermission('finance.report.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const accounts = await prisma.feeAccount.findMany({ include: { payments: true } });

    const totalDues = accounts.reduce((s, a) => s + a.totalFees, 0);
    const collected = accounts.reduce(
      (s, a) => s + a.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0),
      0
    );
    const remaining = totalDues - collected;
    const collectionRate = totalDues > 0 ? Math.round((collected / totalDues) * 100) : 0;

    // Monthly collection: bucket paid payments by the month they were paid in
    // (fall back to createdAt when paidAt is null). Build the last 6 calendar
    // months in chronological order so the chart is stable even for empty months.
    const paidPayments = accounts.flatMap((a) =>
      a.payments
        .filter((p) => p.status === 'paid')
        .map((p) => ({ when: p.paidAt ?? p.createdAt, amount: p.amount }))
    );

    const MONTHS_BACK = 6;
    const now = new Date();
    const monthly: { month: string; collected: number }[] = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const sum = paidPayments
        .filter((p) => p.when.getFullYear() === d.getFullYear() && p.when.getMonth() === d.getMonth())
        .reduce((x, p) => x + p.amount, 0);
      monthly.push({ month: AR_MONTHS[d.getMonth()], collected: sum });
    }

    // A real "data current as of" timestamp instead of fabricated lastGenerated.
    const latestPaidAt = paidPayments.reduce<Date | null>(
      (acc, p) => (acc === null || p.when > acc ? p.when : acc),
      null
    );
    const latestScholarship = await prisma.scholarship.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    const candidates = [latestPaidAt, latestScholarship?.updatedAt ?? null].filter(
      (x): x is Date => x !== null
    );
    const dataAsOf =
      candidates.length > 0
        ? new Date(Math.max(...candidates.map((d) => d.getTime()))).toISOString().slice(0, 10)
        : null;

    return NextResponse.json({
      stats: { totalDues, collected, remaining, collectionRate },
      monthly,
      reportTypes: REPORT_TYPES.map((r) => ({ ...r, dataAsOf })),
    });
  } catch (error) {
    console.error('Error building finance reports:', error);
    return NextResponse.json({ error: 'فشل في جلب التقارير المالية' }, { status: 500 });
  }
}
