import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { getProvider } from '@/lib/finance/payments/provider';

// Initiate a hosted-checkout for an invoice balance. Returns the gateway URL, or 503 when no
// gateway is configured (online payments unavailable → use manual receipts).
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.payment.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uni = guard.ctx.universityId ?? null;
    const provider = await getProvider(uni);
    if (!provider) return NextResponse.json({ error: 'الدفع الإلكتروني غير مُفعّل — لم تتم تهيئة بوابة الدفع' }, { status: 503 });

    const body = await request.json();
    const invoice = await prisma.invoice.findUnique({ where: { id: body?.invoiceId }, include: { student: true } });
    if (!invoice) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    if (Number(invoice.balance) <= 0) return NextResponse.json({ error: 'الفاتورة مسددة' }, { status: 422 });

    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;

    const intent = await prisma.paymentIntent.create({
      data: { universityId: uni, studentId: invoice.studentId, invoiceId: invoice.id, provider: provider.name, amount: invoice.balance, currency: 'EGP', status: 'CREATED', idempotencyKey: randomUUID(), createdById: uid },
    });
    try {
      const co = await provider.createCheckout({ intentId: intent.id, amount: invoice.balance.toFixed(2), currency: 'EGP', customer: { name: invoice.student.nameAr, email: invoice.student.email ?? undefined, phone: invoice.student.phone ?? undefined } });
      await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'PENDING', providerRef: co.providerRef, checkoutUrl: co.checkoutUrl } });
      return NextResponse.json({ ok: true, checkoutUrl: co.checkoutUrl, intentId: intent.id });
    } catch (err) {
      await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'FAILED' } });
      return NextResponse.json({ error: `تعذّر بدء الدفع: ${(err as Error).message}` }, { status: 502 });
    }
  } catch (e) {
    console.error('Error creating checkout:', e);
    return NextResponse.json({ error: 'فشل في بدء الدفع' }, { status: 500 });
  }
}
