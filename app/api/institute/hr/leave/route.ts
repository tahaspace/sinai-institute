import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Leave management (ClientR4 — R4c-2): leave types, requests, and per-year balances. Approving a
// request rolls the days into the employee's balance. View = hr.leave.view, decide = hr.leave.approve.

const dayOnly = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
const daysBetween = (a: Date, b: Date) => Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.leave.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const sp = new URL(request.url).searchParams;
    const reqWhere: Record<string, unknown> = { universityId: uid };
    if (sp.get('status')) reqWhere.status = sp.get('status');
    if (sp.get('employeeId')) reqWhere.employeeId = sp.get('employeeId');
    const [types, requests, balances] = await Promise.all([
      prisma.leaveType.findMany({ where: { universityId: uid }, orderBy: { nameAr: 'asc' } }),
      prisma.leaveRequest.findMany({ where: reqWhere, orderBy: { createdAt: 'desc' }, take: 500, include: { employee: { select: { code: true, nameAr: true } } } }),
      prisma.leaveBalance.findMany({ where: { universityId: uid, year: new Date().getUTCFullYear() } }),
    ]);
    const typeName = new Map(types.map((t) => [t.id, t.nameAr]));
    return NextResponse.json({
      types,
      requests: requests.map((r) => ({ id: r.id, employeeId: r.employeeId, code: r.employee.code, name: r.employee.nameAr, leaveType: typeName.get(r.leaveTypeId) ?? '—', fromDate: r.fromDate, toDate: r.toDate, days: r.days, reason: r.reason, status: r.status })),
      balances,
    });
  } catch (e) {
    console.error('Error loading leave:', e);
    return NextResponse.json({ error: 'فشل في جلب الإجازات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.leave.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const b = await request.json();
    if (b?.kind === 'type') {
      if (!b.code || !b.nameAr) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });
      const created = await prisma.leaveType.create({ data: { universityId: uid, code: b.code, nameAr: b.nameAr, isPaid: b.isPaid ?? true, annualQuota: b.annualQuota ? Number(b.annualQuota) : null } });
      return NextResponse.json(created, { status: 201 });
    }
    // request
    if (!b?.employeeId || !b?.leaveTypeId || !b?.fromDate || !b?.toDate) return NextResponse.json({ error: 'بيانات الطلب ناقصة' }, { status: 400 });
    const from = dayOnly(b.fromDate); const to = dayOnly(b.toDate);
    const created = await prisma.leaveRequest.create({ data: { universityId: uid, employeeId: b.employeeId, leaveTypeId: b.leaveTypeId, fromDate: from, toDate: to, days: daysBetween(from, to), reason: b.reason ?? null } });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    console.error('Error creating leave:', e);
    return NextResponse.json({ error: 'فشل في الإنشاء' }, { status: 500 });
  }
}

// PATCH { id, status: APPROVED|REJECTED } — decide a request; on approve, add days to the balance.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.leave.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const b = await request.json();
    if (!b?.id || !['APPROVED', 'REJECTED'].includes(b.status)) return NextResponse.json({ error: 'طلب غير صحيح' }, { status: 400 });
    const req = await prisma.leaveRequest.findFirst({ where: { id: b.id, universityId: uid } });
    if (!req) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    if (req.status !== 'PENDING') return NextResponse.json({ error: 'تم البت في الطلب' }, { status: 409 });
    const session = await getServerSession(authOptions);
    const approverId = (session?.user as { id?: string } | undefined)?.id ?? null;

    if (b.status === 'APPROVED') {
      const year = new Date(req.fromDate).getUTCFullYear();
      const lt = await prisma.leaveType.findUnique({ where: { id: req.leaveTypeId } });
      const bal = await prisma.leaveBalance.findFirst({ where: { employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year } });
      if (bal) await prisma.leaveBalance.update({ where: { id: bal.id }, data: { used: bal.used + req.days } });
      else await prisma.leaveBalance.create({ data: { universityId: uid, employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year, entitled: lt?.annualQuota ?? 0, used: req.days } });
    }
    await prisma.leaveRequest.update({ where: { id: req.id }, data: { status: b.status, approverId, decidedAt: new Date() } });
    await writeAudit('hr.leave.decide', { targetType: 'LeaveRequest', targetId: req.id, universityId: uid, metadata: { status: b.status } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error deciding leave:', e);
    return NextResponse.json({ error: 'فشل في اعتماد الطلب' }, { status: 500 });
  }
}
