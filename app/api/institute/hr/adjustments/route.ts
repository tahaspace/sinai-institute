import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Attendance adjustments (ClientR4 — R4c-2): penalties (disciplinary), overtime, and permissions/
// missions. Consolidated by `kind`. View = hr.attendance.view, edit = hr.attendance.edit,
// status decisions = hr.attendance.approve. All feed the R4c-3 payroll integration.

const dayOnly = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.attendance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const empId = new URL(request.url).searchParams.get('employeeId') || undefined;
    const scope = { universityId: uid, ...(empId ? { employeeId: empId } : {}) };
    const sel = { employee: { select: { code: true, nameAr: true } } };
    const [penalties, overtime, permissions] = await Promise.all([
      prisma.penalty.findMany({ where: scope, orderBy: { date: 'desc' }, take: 300, include: sel }),
      prisma.overtime.findMany({ where: scope, orderBy: { date: 'desc' }, take: 300, include: sel }),
      prisma.attendancePermission.findMany({ where: scope, orderBy: { date: 'desc' }, take: 300, include: sel }),
    ]);
    const map = (r: { employee: { code: string; nameAr: string } }) => ({ code: r.employee.code, name: r.employee.nameAr });
    return NextResponse.json({
      penalties: penalties.map((r) => ({ id: r.id, ...map(r), type: r.type, reason: r.reason, date: r.date, deductDays: r.deductDays, note: r.note })),
      overtime: overtime.map((r) => ({ id: r.id, ...map(r), date: r.date, hours: r.hours, reason: r.reason, status: r.status })),
      permissions: permissions.map((r) => ({ id: r.id, ...map(r), type: r.type, date: r.date, fromTime: r.fromTime, toTime: r.toTime, reason: r.reason, status: r.status })),
    });
  } catch (e) {
    console.error('Error loading adjustments:', e);
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.attendance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const b = await request.json();
    if (!b?.employeeId) return NextResponse.json({ error: 'الموظف مطلوب' }, { status: 400 });
    switch (b.kind) {
      case 'penalty':
        await prisma.penalty.create({ data: { universityId: uid, employeeId: b.employeeId, type: b.type ?? 'WARNING', reason: b.reason ?? null, deductDays: Number(b.deductDays ?? 0), note: b.note ?? null, date: b.date ? dayOnly(b.date) : new Date() } });
        break;
      case 'overtime':
        await prisma.overtime.create({ data: { universityId: uid, employeeId: b.employeeId, date: b.date ? dayOnly(b.date) : new Date(), hours: Number(b.hours ?? 0), reason: b.reason ?? null } });
        break;
      case 'permission':
        await prisma.attendancePermission.create({ data: { universityId: uid, employeeId: b.employeeId, type: b.type ?? 'PERMISSION', date: b.date ? dayOnly(b.date) : new Date(), fromTime: b.fromTime ?? null, toTime: b.toTime ?? null, reason: b.reason ?? null } });
        break;
      default:
        return NextResponse.json({ error: 'نوع غير معروف' }, { status: 400 });
    }
    await writeAudit('hr.adjustment.create', { universityId: uid, metadata: { kind: b.kind } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('Error creating adjustment:', e);
    return NextResponse.json({ error: 'فشل في الإضافة' }, { status: 500 });
  }
}

// PATCH { kind: overtime|permission, id, status } — approve/reject.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.attendance.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const b = await request.json();
    if (!b?.id || !b?.status) return NextResponse.json({ error: 'المعطيات ناقصة' }, { status: 400 });
    if (b.kind === 'overtime') {
      const r = await prisma.overtime.findFirst({ where: { id: b.id, universityId: uid } });
      if (!r) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
      await prisma.overtime.update({ where: { id: b.id }, data: { status: b.status } });
    } else if (b.kind === 'permission') {
      const r = await prisma.attendancePermission.findFirst({ where: { id: b.id, universityId: uid } });
      if (!r) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
      await prisma.attendancePermission.update({ where: { id: b.id }, data: { status: b.status } });
    } else return NextResponse.json({ error: 'نوع غير مدعوم' }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error updating adjustment:', e);
    return NextResponse.json({ error: 'فشل في التحديث' }, { status: 500 });
  }
}
