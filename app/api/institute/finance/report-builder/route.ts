import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/finance/report-builder
// Returns the report-builder's dynamic data:
//   - previewData: flat per-student tuition rows (FeeAccount + Payment + Student + Department)
//                  with a status derived from paid vs. remaining (مكتمل/جزئي/متأخر).
//   - savedReports: report definitions persisted in the Setting key 'finance.savedReports'.
// Optional filters: ?source= (only 'tuition' yields rows today) and ?departmentId=.

interface PreviewRow {
  student_id: string;
  student_name: string;
  department: string;
  level: number;
  total_fees: number;
  paid_amount: number;
  remaining: number;
  status: string;
}

interface SavedReport {
  id: string;
  name: string;
  description: string;
  source: string;
  lastRun: string;
  schedule: string;
  createdBy: string;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.report.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') ?? 'tuition';
    const departmentId = searchParams.get('departmentId');

    // ---- previewData: flat per-student tuition rows -----------------------
    // Only the 'tuition' source maps to a per-student rowset today; other
    // sources (installments/scholarships/payroll) have no field-picker yet,
    // so return an empty preview for them rather than fabricating rows.
    let previewData: PreviewRow[] = [];
    if (source === 'tuition') {
      const accounts = await prisma.feeAccount.findMany({
        where: departmentId ? { student: { departmentId } } : undefined,
        include: { student: { include: { department: true } } ,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      previewData = accounts.map((account) => {
        const paid = account.payments
          .filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);
        const remaining = account.totalFees - paid;
        // No status column on FeeAccount — derive the badge from amounts.
        const status = remaining <= 0 ? 'مكتمل' : paid > 0 ? 'جزئي' : 'متأخر';
        return {
          student_id: account.student.studentCode,
          student_name: account.student.nameAr,
          department: account.student.department?.nameAr ?? 'غير محدد',
          level: account.student.level,
          total_fees: account.totalFees,
          paid_amount: paid,
          remaining,
          status,
        };
      });
    }

    // ---- savedReports: JSON blob in the Setting table ---------------------
    let savedReports: SavedReport[] = [];
    const row = await prisma.setting.findFirst({ where: { key: 'finance.savedReports' } });
    if (row) {
      try {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) savedReports = parsed as SavedReport[];
      } catch {
        savedReports = [];
      }
    }

    return NextResponse.json({ previewData, savedReports });
  } catch (error) {
    console.error('Error building report data:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات التقارير' }, { status: 500 });
  }
}
