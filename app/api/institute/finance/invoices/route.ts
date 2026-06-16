import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { issueInvoice, issueInvoiceFromStructure } from '@/lib/finance/billing';

async function userId() {
  const s = await getServerSession(authOptions);
  return (s?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.invoice.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const sp = new URL(request.url).searchParams;
    const status = sp.get('status') || undefined;
    const invoices = await prisma.invoice.findMany({
      where: { universityId: guard.ctx.universityId ?? null, ...(status ? { status } : {}) },
      include: { student: { select: { studentCode: true, nameAr: true } } },
      orderBy: { issueDate: 'desc' },
      take: 300,
    });
    return NextResponse.json({
      invoices: invoices.map((i) => ({
        id: i.id, number: i.number, studentCode: i.student.studentCode, student: i.student.nameAr,
        issueDate: i.issueDate, dueDate: i.dueDate, status: i.status,
        total: Number(i.total.toFixed(2)), paid: Number(i.paid.toFixed(2)), balance: Number(i.balance.toFixed(2)),
      })),
    });
  } catch (e) {
    console.error('Error listing invoices:', e);
    return NextResponse.json({ error: 'فشل في جلب الفواتير' }, { status: 500 });
  }
}

// POST: issue an invoice. Body either { studentCode, structureId } or { studentCode, lines:[{description,unitPrice,qty?,vatRate?,accountCode?}] }.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('finance.invoice.issue');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const body = await request.json();
    const uid = await userId();
    const uni = guard.ctx.universityId ?? null;

    const student = await prisma.student.findFirst({ where: { studentCode: body?.studentCode, ...(uni ? { universityId: uni } : {}) } });
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    try {
      const res = body.structureId
        ? await issueInvoiceFromStructure({ universityId: uni, studentId: student.id, structureId: body.structureId, dueDate, academicYear: body.academicYear, semester: body.semester, createdById: uid })
        : await issueInvoice({ universityId: uni, studentId: student.id, lines: body.lines, dueDate, academicYear: body.academicYear, semester: body.semester, memo: body.memo, createdById: uid });
      return NextResponse.json({ ok: true, ...res }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  } catch (e) {
    console.error('Error issuing invoice:', e);
    return NextResponse.json({ error: 'فشل في إصدار الفاتورة' }, { status: 500 });
  }
}
