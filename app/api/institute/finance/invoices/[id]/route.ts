import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { createInstallmentPlan } from '@/lib/finance/billing';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('finance.invoice.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: { student: { select: { studentCode: true, nameAr: true } }, lines: true, plan: { include: { installments: { orderBy: { seq: 'asc' } } } }, allocations: { include: { receipt: true } }, creditNotes: true },
    });
    if (!inv) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    return NextResponse.json({
      invoice: {
        id: inv.id, number: inv.number, student: inv.student.nameAr, studentCode: inv.student.studentCode,
        issueDate: inv.issueDate, dueDate: inv.dueDate, status: inv.status,
        subtotal: Number(inv.subtotal.toFixed(2)), vatTotal: Number(inv.vatTotal.toFixed(2)), total: Number(inv.total.toFixed(2)), paid: Number(inv.paid.toFixed(2)), balance: Number(inv.balance.toFixed(2)),
        lines: inv.lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: Number(l.unitPrice.toFixed(2)), vatRate: l.vatRate, lineTotal: Number(l.lineTotal.toFixed(2)) })),
        plan: inv.plan ? { count: inv.plan.count, installments: inv.plan.installments.map((p) => ({ seq: p.seq, dueDate: p.dueDate, amount: Number(p.amount.toFixed(2)), paid: Number(p.paid.toFixed(2)), status: p.status })) } : null,
        receipts: inv.allocations.map((a) => ({ number: a.receipt.number, date: a.receipt.receiptDate, amount: Number(a.amount.toFixed(2)), method: a.receipt.method })),
        creditNotes: inv.creditNotes.map((c) => ({ number: c.number, amount: Number(c.amount.toFixed(2)), reason: c.reason })),
      },
    });
  } catch (e) {
    console.error('Error loading invoice:', e);
    return NextResponse.json({ error: 'فشل في جلب الفاتورة' }, { status: 500 });
  }
}

// POST { action:'plan', count, firstDueDate, intervalDays? } — create an installment plan.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('finance.installment.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const body = await request.json();
    if (body?.action !== 'plan') return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
    try {
      const res = await createInstallmentPlan({ invoiceId: id, count: parseInt(body.count, 10), firstDueDate: new Date(body.firstDueDate), intervalDays: body.intervalDays ? parseInt(body.intervalDays, 10) : undefined });
      return NextResponse.json({ ok: true, ...res });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error creating installment plan:', e);
    return NextResponse.json({ error: 'فشل في إنشاء جدول الأقساط' }, { status: 500 });
  }
}
