import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { recordReceipt } from '@/lib/finance/billing';

export async function GET() {
  try {
    const guard = await requirePermission('finance.receipt.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const receipts = await prisma.receipt.findMany({
      where: { universityId: guard.ctx.universityId ?? null },
      include: { student: { select: { studentCode: true, nameAr: true } } },
      orderBy: { receiptDate: 'desc' },
      take: 300,
    });
    return NextResponse.json({
      receipts: receipts.map((r) => ({ id: r.id, number: r.number, student: r.student.nameAr, studentCode: r.student.studentCode, date: r.receiptDate, method: r.method, amount: Number(r.amount.toFixed(2)) })),
    });
  } catch (e) {
    console.error('Error listing receipts:', e);
    return NextResponse.json({ error: 'فشل في جلب السندات' }, { status: 500 });
  }
}

// POST { invoiceId, amount, method?, reference? } — record a payment against an invoice.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.receipt.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (!body?.invoiceId || !body?.amount) return NextResponse.json({ error: 'الفاتورة والمبلغ مطلوبان' }, { status: 400 });
    const inv = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });
    if (!inv) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    try {
      const res = await recordReceipt({ universityId: guard.ctx.universityId ?? null, studentId: inv.studentId, invoiceId: inv.id, amount: body.amount, method: body.method, reference: body.reference, createdById: uid });
      return NextResponse.json({ ok: true, ...res }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error recording receipt:', e);
    return NextResponse.json({ error: 'فشل في تسجيل السند' }, { status: 500 });
  }
}
