import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { budgetVsActual } from '@/lib/finance/budget';

// GET — budget-vs-actual for one budget (planned vs GL actuals).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('finance.budget.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    try {
      const report = await budgetVsActual(guard.ctx.universityId ?? null, id);
      return NextResponse.json({ report });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 404 });
    }
  } catch (e) {
    console.error('Error budget vs actual:', e);
    return NextResponse.json({ error: 'فشل في تقرير الموازنة' }, { status: 500 });
  }
}
