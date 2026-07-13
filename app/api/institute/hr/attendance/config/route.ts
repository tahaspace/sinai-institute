import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// Attendance config (ClientR4 — R4c-2): work schedules, shifts, holidays, and the grace/overtime
// policy. View = hr.attendance.view, edit = hr.attendance.edit.

export async function GET() {
  try {
    const guard = await requirePermission('hr.attendance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const [schedules, shifts, holidays, policy] = await Promise.all([
      prisma.workSchedule.findMany({ where: { universityId: uid }, orderBy: { name: 'asc' } }),
      prisma.shift.findMany({ where: { universityId: uid }, orderBy: { name: 'asc' } }),
      prisma.holiday.findMany({ where: { universityId: uid }, orderBy: { date: 'asc' } }),
      prisma.attendancePolicy.findFirst({ where: { universityId: uid } }),
    ]);
    return NextResponse.json({ schedules, shifts, holidays, policy });
  } catch (e) {
    console.error('Error loading attendance config:', e);
    return NextResponse.json({ error: 'فشل في جلب إعدادات الحضور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('hr.attendance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const uid = guard.ctx.universityId ?? null;
    const b = await request.json();
    switch (b?.entity) {
      case 'schedule':
        return NextResponse.json(await prisma.workSchedule.create({ data: { universityId: uid, name: b.name, mode: b.mode ?? 'FIXED', startTime: b.startTime ?? null, endTime: b.endTime ?? null, workHours: b.workHours ? Number(b.workHours) : null, graceInMin: Number(b.graceInMin ?? 0), graceOutMin: Number(b.graceOutMin ?? 0), isDefault: !!b.isDefault } }), { status: 201 });
      case 'shift':
        return NextResponse.json(await prisma.shift.create({ data: { universityId: uid, name: b.name, type: b.type ?? 'MORNING', startTime: b.startTime ?? null, endTime: b.endTime ?? null } }), { status: 201 });
      case 'holiday':
        if (!b.date) return NextResponse.json({ error: 'التاريخ مطلوب' }, { status: 400 });
        return NextResponse.json(await prisma.holiday.create({ data: { universityId: uid, name: b.name, date: new Date(b.date), isPaid: b.isPaid ?? true, notes: b.notes ?? null } }), { status: 201 });
      case 'policy': {
        const existing = await prisma.attendancePolicy.findFirst({ where: { universityId: uid } });
        const data = { name: b.name ?? 'السياسة الافتراضية', graceInMin: Number(b.graceInMin ?? 15), graceOutMin: Number(b.graceOutMin ?? 10), lateToDeductMin: Number(b.lateToDeductMin ?? 60), minOvertimeMin: Number(b.minOvertimeMin ?? 30), overtimeMethod: b.overtimeMethod ?? 'HOURLY' };
        const saved = existing ? await prisma.attendancePolicy.update({ where: { id: existing.id }, data }) : await prisma.attendancePolicy.create({ data: { universityId: uid, ...data } });
        return NextResponse.json(saved, { status: 201 });
      }
      default:
        return NextResponse.json({ error: 'نوع غير معروف' }, { status: 400 });
    }
  } catch (e) {
    console.error('Error saving attendance config:', e);
    return NextResponse.json({ error: 'فشل في الحفظ' }, { status: 500 });
  }
}
