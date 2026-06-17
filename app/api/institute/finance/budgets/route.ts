import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authz';
import { createBudget, listBudgets } from '@/lib/finance/budget';

export async function GET() {
  try {
    const guard = await requirePermission('finance.budget.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    return NextResponse.json({ budgets: await listBudgets(guard.ctx.universityId ?? null) });
  } catch (e) {
    console.error('Error listing budgets:', e);
    return NextResponse.json({ error: 'فشل في جلب الموازنات' }, { status: 500 });
  }
}

// POST { name, fiscalCode, lines:[{accountCode, amount, costCenterId?}] }
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.budget.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    if (!body?.name || !body?.fiscalCode || !Array.isArray(body?.lines) || !body.lines.length) return NextResponse.json({ error: 'الاسم والسنة والبنود مطلوبة' }, { status: 400 });
    try {
      const res = await createBudget({ universityId: guard.ctx.universityId ?? null, name: body.name, fiscalCode: body.fiscalCode, lines: body.lines });
      return NextResponse.json({ ok: true, ...res }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error creating budget:', e);
    return NextResponse.json({ error: 'فشل في إنشاء الموازنة' }, { status: 500 });
  }
}
