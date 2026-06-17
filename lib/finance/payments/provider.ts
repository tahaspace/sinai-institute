/**
 * Payment-provider abstraction (Finance v2 — Phase 3).
 *
 * SAFETY: the gateway is INERT until real secrets are present in the environment. `getProvider`
 * returns null when nothing is configured, so checkout refuses and the webhook returns 503 — the
 * system never fabricates a payment. Secrets live ONLY in Vercel env (never in the DB or git).
 */
export type CheckoutInput = {
  intentId: string;
  amount: string; // decimal string (EGP)
  currency: string;
  customer?: { name?: string; email?: string; phone?: string };
  returnUrl?: string;
};

export type CheckoutResult = { providerRef: string; checkoutUrl: string };

export type WebhookVerdict = {
  verified: boolean;
  reason?: string;
  providerTxnId?: string;
  intentRef?: string; // provider order/intention id to match our PaymentIntent.providerRef
  amount?: string; // decimal string the provider reports
  currency?: string;
  status?: 'SUCCESS' | 'FAILED' | 'REFUNDED';
};

export interface PaymentProvider {
  readonly name: string;
  /** Create a hosted-checkout session for an initiated PaymentIntent. */
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /**
   * Verify a webhook from the RAW request. MUST validate the signature before trusting anything.
   * Returns a verdict the route reconciles against the stored PaymentIntent (fail-closed).
   */
  verifyWebhook(req: { rawBody: string; headers: Record<string, string>; query: URLSearchParams }): Promise<WebhookVerdict>;
}

/**
 * Resolve the active provider for a tenant. Currently env-driven (single deployment); extend to
 * read PaymentProviderConfig per tenant when multi-gateway is needed. Returns null when no provider
 * is configured — callers MUST treat null as "online payments unavailable", not as success.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- universityId reserved for per-tenant gateway selection
export async function getProvider(universityId?: string | null): Promise<PaymentProvider | null> {
  const active = (process.env.PAYMENT_PROVIDER || '').toLowerCase();
  if (active === 'paymob') {
    // lazy import so the adapter (and its secret reads) only load when selected
    const { createPaymobProvider } = await import('@/lib/finance/payments/paymob');
    return createPaymobProvider();
  }
  return null;
}

/** True when an online gateway is configured + has its secrets — used to show/hide pay buttons. */
export async function gatewayConfigured(universityId?: string | null): Promise<boolean> {
  return (await getProvider(universityId)) != null;
}
