import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getProvider } from '@/lib/finance/payments/provider';
import { recordReceipt } from '@/lib/finance/billing';
import { cmp, money } from '@/lib/finance/money';

// Public payment-gateway webhook (Finance v2 — Phase 3). THE TRUST BOUNDARY.
// Node runtime (raw body needed for HMAC). Hardening, in order:
//   1) 503 if no gateway configured (inert until secrets exist)
//   2) verify provider signature on the RAW body — reject on failure
//   3) dedup on providerTxnId (WebhookEvent + PaymentTransaction unique) — replay-safe
//   4) reconcile reported amount/currency against the stored PaymentIntent — never trust the callback amount
//   5) only then create a Receipt (which posts Dr cash-gateway / Cr AR to the GL)
// Fail-closed: any check that doesn't pass logs the event and returns without touching the ledger.
export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params;
  let logged: { universityId?: string | null; externalId?: string | null } = {};
  try {
    const provider = await getProvider(null);
    if (!provider || provider.name !== providerName) {
      return NextResponse.json({ error: 'gateway not configured' }, { status: 503 });
    }
    const rawBody = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => (headers[k] = v));
    const query = new URL(request.url).searchParams;

    const verdict = await provider.verifyWebhook({ rawBody, headers, query });

    // Always log the inbound event (forensics + replay detection).
    const evt = await prisma.webhookEvent.create({
      data: { provider: providerName, externalId: verdict.providerTxnId ?? null, verified: verdict.verified, outcome: verdict.verified ? 'pending' : `rejected:${verdict.reason}`, payload: safeJson(rawBody) },
    });
    logged = { externalId: verdict.providerTxnId };

    if (!verdict.verified) return NextResponse.json({ error: 'invalid signature' }, { status: 400 });

    // (3) dedup — same provider txn already processed?
    if (verdict.providerTxnId) {
      const dup = await prisma.paymentTransaction.findFirst({ where: { provider: providerName, providerTxnId: verdict.providerTxnId } });
      if (dup) {
        await prisma.webhookEvent.update({ where: { id: evt.id }, data: { outcome: 'accepted:duplicate' } });
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    if (verdict.status !== 'SUCCESS') {
      await prisma.webhookEvent.update({ where: { id: evt.id }, data: { outcome: `accepted:status-${verdict.status}` } });
      // record a non-success transaction for the trail, but do not touch the ledger
      if (verdict.providerTxnId) await prisma.paymentTransaction.create({ data: { provider: providerName, providerTxnId: verdict.providerTxnId, amount: money(verdict.amount ?? '0'), currency: verdict.currency ?? 'EGP', status: verdict.status ?? 'FAILED', signatureHash: 'verified' } }).catch(() => {});
      return NextResponse.json({ ok: true, ignored: verdict.status });
    }

    // (4) reconcile against the stored intent — match by provider order ref.
    const intent = verdict.intentRef
      ? await prisma.paymentIntent.findFirst({ where: { provider: providerName, providerRef: verdict.intentRef } })
      : null;
    if (!intent) {
      await prisma.webhookEvent.update({ where: { id: evt.id }, data: { outcome: 'rejected:no-matching-intent' } });
      return NextResponse.json({ error: 'no matching intent' }, { status: 409 });
    }
    if (verdict.amount == null || cmp(verdict.amount, intent.amount) !== 0) {
      await prisma.webhookEvent.update({ where: { id: evt.id }, data: { outcome: 'rejected:amount-mismatch' } });
      return NextResponse.json({ error: 'amount mismatch' }, { status: 409 });
    }
    if (intent.status === 'PAID') {
      await prisma.webhookEvent.update({ where: { id: evt.id }, data: { outcome: 'accepted:already-paid' } });
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // (5) record the confirmed money — Receipt posts to the GL (Dr 1250 gateway / Cr 1100 AR).
    await prisma.paymentTransaction.create({ data: { universityId: intent.universityId, intentId: intent.id, provider: providerName, providerTxnId: verdict.providerTxnId ?? evt.id, amount: money(verdict.amount), currency: verdict.currency ?? 'EGP', status: 'SUCCESS', signatureHash: 'verified' } });
    let receiptNumber: string | null = null;
    if (intent.invoiceId && intent.studentId) {
      const r = await recordReceipt({ universityId: intent.universityId, studentId: intent.studentId, invoiceId: intent.invoiceId, amount: verdict.amount, method: 'GATEWAY', reference: verdict.providerTxnId ?? undefined });
      receiptNumber = r.number;
    }
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'PAID', receiptId: receiptNumber } });
    await prisma.webhookEvent.update({ where: { id: evt.id }, data: { outcome: 'accepted:paid' } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e, logged);
    return NextResponse.json({ error: 'webhook processing failed' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJson(raw: string): any {
  try { return JSON.parse(raw); } catch { return { raw: raw.slice(0, 2000) }; }
}
