import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { createBill } from '@/lib/finance/ap';

export async function GET() {
  try {
    const guard = await requirePermission('finance.expense.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const bills = await prisma.bill.findMany({
      where: { universityId: guard.ctx.universityId ?? null },
      include: { vendor: { select: { nameAr: true, code: true } } },
      orderBy: { billDate: 'desc' }, take: 300,
    });
    return NextResponse.json({
      bills: bills.map((b) => ({ id: b.id, number: b.number, vendor: b.vendor.nameAr, billDate: b.billDate, status: b.status, total: Number(b.total.toFixed(2)), balance: Number(b.balance.toFixed(2)) })),
    });
  } catch (e) {
    console.error('Error listing bills:', e);
    return NextResponse.json({ error: 'فشل في جلب فواتير الموردين' }, { status: 500 });
  }
}

// POST { vendorId, lines:[{description,amount,accountCode?,vatRate?}], dueDate?, memo? }
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.expense.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    const body = await request.json();
    if (!body?.vendorId || !Array.isArray(body?.lines) || !body.lines.length) return NextResponse.json({ error: 'المورد والبنود مطلوبة' }, { status: 400 });
    try {
      const res = await createBill({ universityId: guard.ctx.universityId ?? null, vendorId: body.vendorId, lines: body.lines, dueDate: body.dueDate ? new Date(body.dueDate) : null, memo: body.memo, costCenterId: body.costCenterId ?? null, branchId: body.branchId ?? null, createdById: uid });
      return NextResponse.json({ ok: true, ...res }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error creating bill:', e);
    return NextResponse.json({ error: 'فشل في إنشاء فاتورة المورد' }, { status: 500 });
  }
}
