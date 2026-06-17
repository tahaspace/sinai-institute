import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { canonicalPayload } from '@/lib/finance/eta/document';
import { signPayload, signingConfigured } from '@/lib/finance/eta/sign';

/**
 * ETA (Egyptian Tax Authority) submission client (Finance v2 — Phase 4).
 *
 * INERT WITHOUT CREDENTIALS: etaConfigured() is false unless ETA_CLIENT_ID + ETA_CLIENT_SECRET are
 * set in the environment, AND a signing certificate is configured (sign.ts). submitDocument throws
 * a clear "not configured" error in that case — the system never fabricates an ETA acceptance.
 *
 * When configured: build canonical payload → sign (CAdES) → POST to the ETA submission API →
 * store the returned UUID + status. Confirm the exact ETA endpoints/credentials against the
 * merchant's ETA portal and test on the ETA preprod environment before going live.
 */
export function etaConfigured(): boolean {
  return Boolean(process.env.ETA_CLIENT_ID && process.env.ETA_CLIENT_SECRET) && signingConfigured();
}

const ETA_API = process.env.ETA_API_BASE || 'https://api.invoicing.eta.gov.eg';
const ETA_ID = process.env.ETA_IDENTITY_BASE || 'https://id.eta.gov.eg';

async function etaToken(): Promise<string> {
  const res = await fetch(`${ETA_ID}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.ETA_CLIENT_ID!, client_secret: process.env.ETA_CLIENT_SECRET!, scope: 'InvoicingAPI' }),
  });
  if (!res.ok) throw new Error('eta-auth-failed');
  return (await res.json()).access_token as string;
}

export async function submitDocument(documentId: string): Promise<{ status: string; uuid?: string }> {
  const doc = await prisma.eInvoiceDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error('المستند غير موجود');
  if (doc.status === 'VALID' || doc.status === 'SUBMITTED') return { status: doc.status, uuid: doc.uuid ?? undefined };

  if (!etaConfigured()) {
    throw new Error('منظومة الفاتورة الإلكترونية غير مُهيأة — أضِف بيانات اعتماد ETA وشهادة التوقيع');
  }

  const payload = await canonicalPayload(documentId);
  const signed = await signPayload(payload); // CAdES signature
  const token = await etaToken();
  const res = await fetch(`${ETA_API}/api/v1.0/documentsubmissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ documents: [{ ...payload, signatures: [{ signatureType: 'I', value: signed }] }] }),
  });
  const body = await res.json().catch(() => ({}));
  const accepted = res.ok && body?.acceptedDocuments?.length;
  const uuid = accepted ? body.acceptedDocuments[0].uuid : undefined;
  await prisma.eInvoiceDocument.update({
    where: { id: documentId },
    data: { status: accepted ? 'SUBMITTED' : 'REJECTED', uuid: uuid ?? null, submissionUuid: body?.submissionId ?? null, submittedAt: new Date(), signedHash: signed.slice(0, 64), signedAt: new Date(), etaResponse: body },
  });
  await writeAudit(`finance.einvoice.${accepted ? 'submitted' : 'rejected'}`, { targetType: 'EInvoiceDocument', targetId: documentId, metadata: { internalId: doc.internalId }, universityId: doc.universityId });
  return { status: accepted ? 'SUBMITTED' : 'REJECTED', uuid };
}

export async function cancelDocument(documentId: string): Promise<{ status: string }> {
  const doc = await prisma.eInvoiceDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error('المستند غير موجود');
  if (!etaConfigured()) {
    // No ETA: allow cancelling a not-yet-submitted local document only.
    if (doc.status === 'DRAFT' || doc.status === 'SIGNED') {
      await prisma.eInvoiceDocument.update({ where: { id: documentId }, data: { status: 'CANCELLED' } });
      return { status: 'CANCELLED' };
    }
    throw new Error('منظومة الفاتورة الإلكترونية غير مُهيأة');
  }
  const token = await etaToken();
  const res = await fetch(`${ETA_API}/api/v1.0/documents/${doc.uuid}/state`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: 'cancelled', reason: 'Issuer cancellation' }),
  });
  await prisma.eInvoiceDocument.update({ where: { id: documentId }, data: { status: res.ok ? 'CANCELLED' : doc.status } });
  return { status: res.ok ? 'CANCELLED' : doc.status };
}
