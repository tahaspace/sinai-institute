/**
 * ETA document signing (Finance v2 — Phase 4).
 *
 * The ETA requires a CAdES-BES signature over the canonicalized document, produced with the
 * issuer's signing certificate (HSM / USB token / cloud-signing service). That certificate is NOT
 * something this app can self-provision, so signing is INERT until a signer is configured via env.
 *
 * signingConfigured() is false unless ETA_SIGNING_MODE is set (e.g. 'remote' with an external
 * signing-service URL+token). Wire the concrete signer to the merchant's chosen signing solution.
 */
export function signingConfigured(): boolean {
  return Boolean(process.env.ETA_SIGNING_MODE && (process.env.ETA_SIGNING_URL || process.env.ETA_SIGNING_KEY));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function signPayload(payload: any): Promise<string> {
  if (!signingConfigured()) throw new Error('شهادة توقيع الفاتورة الإلكترونية غير مُهيأة');
  // Remote signing service (recommended for serverless — the cert lives in an HSM/signing host).
  if (process.env.ETA_SIGNING_MODE === 'remote' && process.env.ETA_SIGNING_URL) {
    const res = await fetch(process.env.ETA_SIGNING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.ETA_SIGNING_TOKEN ? { Authorization: `Bearer ${process.env.ETA_SIGNING_TOKEN}` } : {}) },
      body: JSON.stringify({ payload }),
    });
    if (!res.ok) throw new Error('eta-signing-failed');
    return (await res.json()).signature as string;
  }
  throw new Error('وضع التوقيع غير مدعوم — اضبط ETA_SIGNING_MODE');
}
