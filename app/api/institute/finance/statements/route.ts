import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { trialBalance, incomeStatement, balanceSheet, cashFlow } from '@/lib/finance/statements';

// Financial statements (Finance v2 — Phase 1). type ∈ trial-balance | income-statement |
// balance-sheet | cash-flow. Optional from/to (ISO dates). Computed from POSTED journal lines.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.report.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const sp = new URL(request.url).searchParams;
    const type = sp.get('type') || 'trial-balance';
    const from = sp.get('from') ? new Date(sp.get('from')!) : undefined;
    const to = sp.get('to') ? new Date(sp.get('to')!) : undefined;
    const uni = guard.ctx.universityId ?? null;

    let report: unknown;
    switch (type) {
      case 'trial-balance': report = await trialBalance(uni, { from, to }); break;
      case 'income-statement': report = await incomeStatement(uni, { from, to }); break;
      case 'balance-sheet': report = await balanceSheet(uni, to); break;
      case 'cash-flow': report = await cashFlow(uni, { from, to }); break;
      default: return NextResponse.json({ error: 'نوع قائمة غير معروف' }, { status: 400 });
    }
    return NextResponse.json({ type, report });
  } catch (e) {
    console.error('Error building statement:', e);
    return NextResponse.json({ error: 'فشل في إنشاء القائمة المالية' }, { status: 500 });
  }
}
