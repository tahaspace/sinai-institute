import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// Shape the page renders for each table row. Status is lowercased here so the
// page's getStatusBadge() switch ('pending'|'approved'|'rejected') works as-is.
interface TransferRow {
  id: string;
  name: string;
  // INCOMING rows carry `from` (source institution), OUTGOING rows carry `to`.
  from?: string;
  to?: string;
  department: string;
  date: string;
  status: string;
}

interface TransferStats {
  incoming: number;
  outgoing: number;
  pending: number;
  completed: number;
}

// GET /api/institute/admission/transfers
// Returns { incoming, outgoing, stats }. All four stat values are real COUNTs
// on TransferRequest — none is a hardcoded placeholder.
export async function GET() {
  try {
    const guard = await requirePermission('transfer.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const incomingRows = await prisma.transferRequest.findMany({
      where: { direction: 'INCOMING' },
      orderBy: { createdAt: 'desc' },
      include: { departmentRel: true },
    });

    const outgoingRows = await prisma.transferRequest.findMany({
      where: { direction: 'OUTGOING' },
      orderBy: { createdAt: 'desc' },
      include: { student: { include: { department: true } }, departmentRel: true },
    });

    const incoming: TransferRow[] = incomingRows.map((t) => ({
      id: t.id,
      name: t.studentName,
      from: t.institution,
      // requested department: prefer the related department's Arabic name
      department: t.departmentRel?.nameAr ?? t.department ?? '—',
      date: t.createdAt.toISOString().slice(0, 10),
      status: t.status.toLowerCase(),
    }));

    const outgoing: TransferRow[] = outgoingRows.map((t) => ({
      id: t.id,
      // for existing students prefer their canonical name over the snapshot
      name: t.student?.nameAr ?? t.studentName,
      to: t.institution,
      // current department: the student's own dept first, then the request's
      department: t.student?.department?.nameAr ?? t.departmentRel?.nameAr ?? t.department ?? '—',
      date: t.createdAt.toISOString().slice(0, 10),
      status: t.status.toLowerCase(),
    }));

    // Pending/completed counts span both directions, so aggregate independently
    // of the two lists above rather than re-filtering them.
    const [incomingCount, outgoingCount, pendingCount, completedCount] = await Promise.all([
      prisma.transferRequest.count({ where: { direction: 'INCOMING' } }),
      prisma.transferRequest.count({ where: { direction: 'OUTGOING' } }),
      prisma.transferRequest.count({ where: { status: 'PENDING' } }),
      prisma.transferRequest.count({ where: { status: { in: ['APPROVED', 'COMPLETED'] } } }),
    ]);

    const stats: TransferStats = {
      incoming: incomingCount,
      outgoing: outgoingCount,
      pending: pendingCount,
      completed: completedCount,
    };

    return NextResponse.json({ incoming, outgoing, stats });
  } catch (error) {
    console.error('Error listing transfers:', error);
    return NextResponse.json({ error: 'فشل في جلب طلبات التحويل' }, { status: 500 });
  }
}

// PATCH /api/institute/admission/transfers — update a single request's status,
// wiring the per-row action buttons. Mirrors the admissions PATCH guard/shape.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('transfer.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, status } = body ?? {};
    if (!id || !status) return NextResponse.json({ error: 'المعرف والحالة مطلوبان' }, { status: 400 });

    const next = String(status).toUpperCase();
    const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
    if (!allowed.includes(next)) return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });

    const existing = await prisma.transferRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const updated = await prisma.transferRequest.update({ where: { id }, data: { status: next } });
    return NextResponse.json({ transfer: updated });
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json({ error: 'فشل في تحديث طلب التحويل' }, { status: 500 });
  }
}
