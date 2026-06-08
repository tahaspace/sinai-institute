import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/trainees — list trainees + roll-up stats.
export async function GET() {
  try {
    const guard = await requirePermission('trainees.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const trainees = await prisma.trainee.findMany({ orderBy: { createdAt: 'desc' } });

    const total = trainees.length;
    const active = trainees.filter((t) => t.status === 'active').length;
    const avgProgress = total
      ? Math.round(trainees.reduce((sum, t) => sum + t.progress, 0) / total)
      : 0;
    const avgAttendance = total
      ? Math.round(trainees.reduce((sum, t) => sum + t.attendance, 0) / total)
      : 0;

    return NextResponse.json({
      trainees: trainees.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone ?? '',
        email: t.email ?? '',
        program: t.program ?? '',
        batch: t.batch ?? '',
        progress: t.progress,
        attendance: t.attendance,
        status: t.status,
        joinDate: t.joinDate ? t.joinDate.toISOString().slice(0, 10) : '',
        certificates: t.certificates,
      })),
      stats: { total, active, avgProgress, avgAttendance },
    });
  } catch (error) {
    console.error('Error listing trainees:', error);
    return NextResponse.json({ error: 'فشل في جلب المتدربين' }, { status: 500 });
  }
}
