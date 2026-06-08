import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';

// GET /api/faculty/office-hours — the instructor's slots + booked appointments.
export async function GET() {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const slots = await prisma.officeHoursSlot.findMany({
      where: { instructorId: instructor.id },
      include: { appointments: { include: { student: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const officeHoursSchedule = slots.map((s) => ({
      id: s.id,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location ?? '',
      type: s.type,
      active: s.active,
      booked: s.appointments.length,
    }));

    const upcomingAppointments = slots
      .flatMap((s) => s.appointments.map((a) => ({
        id: a.id,
        student: a.student.nameAr,
        studentCode: a.student.studentCode,
        topic: a.topic ?? '',
        date: a.date.toISOString().slice(0, 10),
        status: a.status,
      })))
      .sort((x, y) => x.date.localeCompare(y.date));

    return NextResponse.json({ officeHoursSchedule, upcomingAppointments });
  } catch (error) {
    console.error('Error fetching office hours:', error);
    return NextResponse.json({ error: 'فشل في جلب الساعات المكتبية' }, { status: 500 });
  }
}

// POST /api/faculty/office-hours — add a slot.
export async function POST(request: NextRequest) {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const body = await request.json();
    const { day, startTime, endTime, location, type } = body ?? {};
    if (!day || !startTime || !endTime) return NextResponse.json({ error: 'اليوم والوقت مطلوبان' }, { status: 400 });

    const slot = await prisma.officeHoursSlot.create({
      data: { instructorId: instructor.id, day, startTime, endTime, location: location || null, type: type || 'in-person' },
    });
    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    console.error('Error creating office-hours slot:', error);
    return NextResponse.json({ error: 'فشل في إضافة الموعد' }, { status: 500 });
  }
}

// PATCH /api/faculty/office-hours — confirm/cancel an appointment.
export async function PATCH(request: NextRequest) {
  try {
    const instructor = await resolveInstructor();
    if (!instructor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const body = await request.json();
    const { appointmentId, status } = body ?? {};
    if (!appointmentId || !status) return NextResponse.json({ error: 'المعرف والحالة مطلوبان' }, { status: 400 });

    // ensure the appointment belongs to this instructor's slot
    const appt = await prisma.officeHoursAppointment.findUnique({ where: { id: appointmentId }, include: { slot: true } });
    if (!appt || appt.slot.instructorId !== instructor.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    const updated = await prisma.officeHoursAppointment.update({ where: { id: appointmentId }, data: { status } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'فشل في تحديث الموعد' }, { status: 500 });
  }
}
