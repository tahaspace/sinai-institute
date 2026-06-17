import crypto from 'crypto';
import type { PaymentProvider, CheckoutInput, CheckoutResult, WebhookVerdict } from '@/lib/finance/payments/provider';

/**
 * Paymob (Egypt) adapter — Finance v2 — Phase 3.
 *
 * INERT WITHOUT SECRETS: createPaymobProvider() returns null unless PAYMOB_API_KEY +
 * PAYMOB_HMAC_SECRET + PAYMOB_INTEGRATION_ID + PAYMOB_IFRAME_ID are all set in the environment
 * (Vercel env). So with no merchant account configured, the whole gateway is disabled and the
 * system falls back to manual receipts (Phase 2) — it can never fabricate a paid state.
 *
 * SECURITY: verifyWebhook validates the HMAC-SHA512 over Paymob's documented, ordered transaction
 * fields BEFORE the route trusts anything; the route additionally reconciles the reported amount
 * against the stored PaymentIntent and dedups on the transaction id (defense-in-depth, fail-closed).
 *
 * NOTE: confirm INTEGRATION_ID / IFRAME_ID and the live API base against the merchant's current
 * Paymob dashboard before going live; verify in Paymob's sandbox first.
 */
const API = process.env.PAYMOB_API_BASE || 'https://accept.paymob.com/api';

// Paymob's HMAC is computed over these transaction fields in EXACTLY this order (HMAC-SHA512).
const HMAC_FIELDS = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id',
  'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
  'is_voided', 'order.id', 'owner', 'pending', 'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(obj: any, dotted: string): string {
  const v = dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  return v === undefined || v === null ? '' : String(v);
}

export function createPaymobProvider(): PaymentProvider | null {
  const apiKey = process.env.PAYMOB_API_KEY;
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;
  const iframeId = process.env.PAYMOB_IFRAME_ID;
  if (!apiKey || !hmacSecret || !integrationId || !iframeId) return null; // not configured → inert

  return {
    name: 'paymob',

    async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
      const amountCents = Math.round(parseFloat(input.amount) * 100);
      // 1) auth token
      const auth = await fetch(`${API}/auth/tokens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: apiKey }) });
      if (!auth.ok) throw new Error('paymob-auth-failed');
      const { token } = await auth.json();
      // 2) order
      const orderRes = await fetch(`${API}/ecommerce/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auth_token: token, delivery_needed: false, amount_cents: amountCents, currency: input.currency, merchant_order_id: input.intentId, items: [] }) });
      if (!orderRes.ok) throw new Error('paymob-order-failed');
      const order = await orderRes.json();
      // 3) payment key
      const [first, ...rest] = (input.customer?.name || 'Student').split(' ');
      const billing = { first_name: first, last_name: rest.join(' ') || first, email: input.customer?.email || 'NA@NA.com', phone_number: input.customer?.phone || '+200000000000', apartment: 'NA', floor: 'NA', street: 'NA', building: 'NA', shipping_method: 'NA', postal_code: 'NA', city: 'NA', country: 'EG', state: 'NA' };
      const keyRes = await fetch(`${API}/acceptance/payment_keys`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auth_token: token, amount_cents: amountCents, expiration: 3600, order_id: order.id, billing_data: billing, currency: input.currency, integration_id: Number(integrationId) }) });
      if (!keyRes.ok) throw new Error('paymob-paymentkey-failed');
      const { token: paymentKey } = await keyRes.json();
      return { providerRef: String(order.id), checkoutUrl: `${API}/acceptance/iframes/${iframeId}?payment_token=${paymentKey}` };
    },

    async verifyWebhook(req): Promise<WebhookVerdict> {
      let body: { obj?: Record<string, unknown> };
      try {
        body = JSON.parse(req.rawBody);
      } catch {
        return { verified: false, reason: 'bad-json' };
      }
      const obj = body.obj;
      if (!obj) return { verified: false, reason: 'no-obj' };
      const provided = req.query.get('hmac') || req.headers['hmac'] || '';
      const concatenated = HMAC_FIELDS.map((f) => pick(obj, f)).join('');
      const computed = crypto.createHmac('sha512', hmacSecret).update(concatenated).digest('hex');
      // constant-time compare
      const ok = provided.length === computed.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(computed));
      if (!ok) return { verified: false, reason: 'bad-hmac' };
      const amountCents = Number(pick(obj, 'amount_cents')) || 0;
      const success = pick(obj, 'success') === 'true';
      return {
        verified: true,
        providerTxnId: pick(obj, 'id'),
        intentRef: pick(obj, 'order.id'),
        amount: (amountCents / 100).toFixed(2),
        currency: pick(obj, 'currency') || 'EGP',
        status: success ? 'SUCCESS' : 'FAILED',
      };
    },
  };
}
