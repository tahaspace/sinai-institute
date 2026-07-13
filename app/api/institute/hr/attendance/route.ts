import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';

// Daily attendance (ClientR4 — R4c-2): list by day/range, manual entry, CSV-style bulk import, and
// the review workflow (DRAFT → REVIEWED → APPROVED → LOCKED). Live biometric-device import deferred.

const dayOnly = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
const toMin = (t?: string | null) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };

async function derive(universityId: string | null, checkIn?: string | null, checkOut?: string | null, status?: string) {
  const ci = toMin(checkIn); const co = toMin(checkOut);
  let lateMinutes = 0; let workedMinutes: number | null = null;
  if (ci != null && co != null && co > ci) workedMinutes = co - ci;
  if (ci != null && status !== 'A') {
    const sched = await prisma.workSchedule.findFirst({ where: { universityId: universityId ?? null, isDefault: true } })
      ?? await prisma.workSchedule.findFirst({ where: { universityId: universityId ?? null } });
    const start = toMin(sched?.startTime); const grace = sched?.graceInMin ?? 0;
    if (start != null) lateMinutes = Math.max(0, ci - (start + grace));
  }
  const derivedStatus = status ?? (ci == null ? 'A' : lateMinutes > 0 ? 'L' : 'P');
  return { lateMinutes, workedMinutes, status: derivedStatus };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.attendance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const sp = new URL(request.url).searchParams;
    const where: Record<string, unknown> = { universityId: uid };
    if (sp.get('date')) where.date = dayOnly(sp.get('date')!);
    else if (sp.get('from') || sp.get('to')) where.date = { ...(sp.get('from') ? { gte: dayOnly(sp.get('from')!) } : {}), ...(sp.get('to') ? { lte: dayOnly(sp.get('to')!) } : {}) };
    if (sp.get('employeeId')) where.employeeId = sp.get('employeeId');

    const records = await prisma.employeeAttendance.findMany({ where, orderBy: [{ date: 'desc' }], take: 1000, include: { employee: { select: { code: true, nameAr: true } } } });
    return NextResponse.json({ records: records.map((r) => ({ id: r.id, employeeId: r.employeeId, code: r.employee.code, name: r.employee.nameAr, date: r.date, checkIn: r.checkIn, checkOut: r.checkOut, status: r.status, lateMinutes: r.lateMinutes, workedMinutes: r.workedMinutes, reviewState: r.reviewState, source: r.source })) });
  } catch (e) {
    console.error('Error listing attendance:', e);
    return NextResponse.json({ error: 'فشل في جلب الحضور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.attendance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const b = await request.json();

    // bulk import: rows [{ code, date, checkIn?, checkOut? }]
    if (Array.isArray(b?.rows)) {
      let ok = 0; const errors: string[] = [];
      for (const row of b.rows) {
        const emp = await prisma.employee.findFirst({ where: { universityId: uid, code: String(row.code) } });
        if (!emp || !row.date) { errors.push(`${row.code ?? '?'}`); continue; }
        const d = await derive(uid, row.checkIn, row.checkOut, undefined);
        const date = dayOnly(String(row.date));
        await prisma.employeeAttendance.upsert({
          where: { employeeId_date: { employeeId: emp.id, date } },
          update: { checkIn: row.checkIn ?? null, checkOut: row.checkOut ?? null, ...d, source: 'IMPORT' },
          create: { universityId: uid, employeeId: emp.id, date, checkIn: row.checkIn ?? null, checkOut: row.checkOut ?? null, ...d, source: 'IMPORT' },
        });
        ok++;
      }
      await writeAudit('hr.attendance.import', { universityId: uid, metadata: { ok, failed: errors.length } });
      return NextResponse.json({ ok, failed: errors.length, errors }, { status: 201 });
    }

    // single manual entry
    if (!b?.employeeId || !b?.date) return NextResponse.json({ error: 'الموظف والتاريخ مطلوبان' }, { status: 400 });
    const date = dayOnly(String(b.date));
    const d = await derive(uid, b.checkIn, b.checkOut, b.status);
    const rec = await prisma.employeeAttendance.upsert({
      where: { employeeId_date: { employeeId: b.employeeId, date } },
      update: { checkIn: b.checkIn ?? null, checkOut: b.checkOut ?? null, ...d, note: b.note ?? null, source: 'MANUAL' },
      create: { universityId: uid, employeeId: b.employeeId, date, checkIn: b.checkIn ?? null, checkOut: b.checkOut ?? null, ...d, note: b.note ?? null, source: 'MANUAL' },
    });
    return NextResponse.json({ id: rec.id }, { status: 201 });
  } catch (e) {
    console.error('Error saving attendance:', e);
    return NextResponse.json({ error: 'فشل في تسجيل الحضور' }, { status: 500 });
  }
}

// PATCH { reviewState, ids?[] | date? } — advance the review workflow (approve = hr.attendance.approve).
export async function PATCH(request: NextRequest) {
  try {
    const b = await request.json();
    const state = b?.reviewState as string;
    const needsApprove = state === 'APPROVED' || state === 'LOCKED';
    const guard = await requirePermission(needsApprove ? 'hr.attendance.approve' : 'hr.attendance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    if (!['DRAFT', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(state)) return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
    const where: Record<string, unknown> = { universityId: uid };
    if (Array.isArray(b.ids) && b.ids.length) where.id = { in: b.ids };
    else if (b.date) where.date = dayOnly(String(b.date));
    else return NextResponse.json({ error: 'حدد السجلات أو التاريخ' }, { status: 400 });
    const res = await prisma.employeeAttendance.updateMany({ where, data: { reviewState: state } });
    await writeAudit('hr.attendance.review', { universityId: uid, metadata: { state, count: res.count } });
    return NextResponse.json({ ok: true, count: res.count });
  } catch (e) {
    console.error('Error updating attendance review:', e);
    return NextResponse.json({ error: 'فشل في تحديث حالة المراجعة' }, { status: 500 });
  }
}
