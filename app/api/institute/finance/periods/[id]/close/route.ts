import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Close / reopen an accounting period (finance.period.close = CFO). A CLOSED period blocks posting.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission('finance.period.close');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reopen = body?.action === 'reopen';
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    const period = await prisma.accountingPeriod.findUnique({ where: { id } });
    if (!period) return NextResponse.json({ error: 'الفترة غير موجودة' }, { status: 404 });

    const updated = await prisma.accountingPeriod.update({
      where: { id },
      data: reopen
        ? { status: 'OPEN', closedById: null, closedAt: null }
        : { status: 'CLOSED', closedById: userId, closedAt: new Date() },
    });
    await writeAudit(`finance.period.${reopen ? 'reopen' : 'close'}`, { targetType: 'AccountingPeriod', targetId: id, metadata: { code: period.code }, universityId: guard.ctx.universityId });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (e) {
    console.error('Error closing period:', e);
    return NextResponse.json({ error: 'فشل في إغلاق الفترة' }, { status: 500 });
  }
}
