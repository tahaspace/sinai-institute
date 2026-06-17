import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { buildFromInvoice } from '@/lib/finance/eta/document';
import { etaConfigured } from '@/lib/finance/eta/client';

export async function GET() {
  try {
    const guard = await requirePermission('finance.einvoice.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uni = guard.ctx.universityId ?? null;
    const [docs, invoices] = await Promise.all([
      prisma.eInvoiceDocument.findMany({ where: { universityId: uni }, orderBy: { createdAt: 'desc' }, take: 100 }),
      // issued invoices not yet turned into an e-invoice document
      prisma.invoice.findMany({ where: { universityId: uni, status: { in: ['ISSUED', 'PARTIAL', 'PAID'] } }, include: { student: { select: { nameAr: true } } }, orderBy: { issueDate: 'desc' }, take: 100 }),
    ]);
    const built = new Set(docs.map((d) => d.sourceId));
    return NextResponse.json({
      eta: { configured: etaConfigured() },
      documents: docs.map((d) => ({ id: d.id, internalId: d.internalId, sourceType: d.sourceType, status: d.status, uuid: d.uuid, net: Number(d.netAmount.toFixed(2)), vat: Number(d.vatAmount.toFixed(2)), total: Number(d.totalAmount.toFixed(2)), createdAt: d.createdAt })),
      buildable: invoices.filter((i) => !built.has(i.id)).map((i) => ({ id: i.id, number: i.number, student: i.student.nameAr, total: Number(i.total.toFixed(2)) })),
    });
  } catch (e) {
    console.error('Error listing e-invoices:', e);
    return NextResponse.json({ error: 'فشل في جلب المستندات الضريبية' }, { status: 500 });
  }
}

// POST { invoiceId } — build an e-invoice document from an issued invoice.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.einvoice.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id ?? null;
    const body = await request.json();
    if (!body?.invoiceId) return NextResponse.json({ error: 'الفاتورة مطلوبة' }, { status: 400 });
    try {
      const res = await buildFromInvoice({ universityId: guard.ctx.universityId ?? null, invoiceId: body.invoiceId, createdById: uid });
      return NextResponse.json({ ok: true, ...res }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error building e-invoice:', e);
    return NextResponse.json({ error: 'فشل في بناء المستند الضريبي' }, { status: 500 });
  }
}
