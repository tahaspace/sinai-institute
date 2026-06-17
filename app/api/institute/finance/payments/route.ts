import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { gatewayConfigured } from '@/lib/finance/payments/provider';

// Payments overview (Finance v2 — Phase 3): gateway status + recent intents/transactions.
export async function GET() {
  try {
    const guard = await requirePermission('finance.payment.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uni = guard.ctx.universityId ?? null;
    const [configured, intents, txns, webhooks] = await Promise.all([
      gatewayConfigured(uni),
      prisma.paymentIntent.findMany({ where: { universityId: uni }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.paymentTransaction.findMany({ where: { universityId: uni }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    return NextResponse.json({
      gateway: { configured, provider: process.env.PAYMENT_PROVIDER || null },
      intents: intents.map((i) => ({ id: i.id, provider: i.provider, amount: Number(i.amount.toFixed(2)), status: i.status, createdAt: i.createdAt })),
      transactions: txns.map((t) => ({ provider: t.provider, providerTxnId: t.providerTxnId, amount: Number(t.amount.toFixed(2)), status: t.status, createdAt: t.createdAt })),
      webhooks: webhooks.map((w) => ({ provider: w.provider, verified: w.verified, outcome: w.outcome, createdAt: w.createdAt })),
    });
  } catch (e) {
    console.error('Error loading payments:', e);
    return NextResponse.json({ error: 'فشل في جلب بيانات المدفوعات' }, { status: 500 });
  }
}
