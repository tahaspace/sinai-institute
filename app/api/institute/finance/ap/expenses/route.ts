import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { createExpenseClaim, decideExpenseClaim } from '@/lib/finance/ap';

async function uid() {
  const s = await getServerSession(authOptions);
  return (s?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET() {
  try {
    const guard = await requirePermission('finance.expense.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const claims = await prisma.expenseClaim.findMany({ where: { universityId: guard.ctx.universityId ?? null }, orderBy: { createdAt: 'desc' }, take: 300 });
    return NextResponse.json({ claims: claims.map((c) => ({ id: c.id, claimantName: c.claimantName, description: c.description, amount: Number(c.amount.toFixed(2)), status: c.status, claimDate: c.claimDate })) });
  } catch (e) {
    console.error('Error listing expense claims:', e);
    return NextResponse.json({ error: 'فشل في جلب طلبات المصروفات' }, { status: 500 });
  }
}

// POST { claimantName, description, amount, accountCode? } — create a claim (maker).
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.expense.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    if (!body?.claimantName || !body?.description || !body?.amount) return NextResponse.json({ error: 'الاسم والوصف والمبلغ مطلوبة' }, { status: 400 });
    const res = await createExpenseClaim({ universityId: guard.ctx.universityId ?? null, claimantName: body.claimantName, description: body.description, amount: body.amount, accountCode: body.accountCode, createdById: await uid() });
    return NextResponse.json({ ok: true, ...res }, { status: 201 });
  } catch (e) {
    console.error('Error creating expense claim:', e);
    return NextResponse.json({ error: 'فشل في إنشاء طلب المصروف' }, { status: 500 });
  }
}

// PATCH { id, action: 'approve' | 'reject' } (checker → posts Dr expense / Cr bank on approve)
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.expense.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    try {
      const res = await decideExpenseClaim(body.id, { approve: body.action === 'approve', pay: true, approverId: await uid() });
      return NextResponse.json({ ok: true, ...res });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error deciding expense claim:', e);
    return NextResponse.json({ error: 'فشل في اعتماد الطلب' }, { status: 500 });
  }
}
