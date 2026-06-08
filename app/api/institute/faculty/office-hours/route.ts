import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/faculty/office-hours — all instructors' office-hours slots.
export async function GET() {
  try {
    const guard = await requirePermission('hr.staff.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const slots = await prisma.officeHoursSlot.findMany({
      include: { instructor: { include: { department: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      officeHours: slots.map((s) => ({
        id: s.id,
        name: s.instructor.name,
        department: s.instructor.department?.nameAr ?? '',
        days: s.day,
        time: `${s.startTime} - ${s.endTime}`,
        office: s.location ?? '',
        type: s.type,
        available: s.active,
      })),
      stats: { total: slots.length, active: slots.filter((s) => s.active).length },
    });
  } catch (error) {
    console.error('Error listing office hours:', error);
    return NextResponse.json({ error: 'فشل في جلب الساعات المكتبية' }, { status: 500 });
  }
}
