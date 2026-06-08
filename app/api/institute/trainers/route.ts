import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/trainers — trainer roster with summary stats.
export async function GET() {
  try {
    const guard = await requirePermission('trainers.manage');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const trainers = await prisma.trainer.findMany({ orderBy: { createdAt: 'desc' } });

    const active = trainers.filter((t) => t.status === 'active').length;
    const totalTrainees = trainers.reduce((sum, t) => sum + t.trainees, 0);
    const avgRating = trainers.length
      ? Math.round((trainers.reduce((sum, t) => sum + t.rating, 0) / trainers.length) * 10) / 10
      : 0;

    return NextResponse.json({
      trainers: trainers.map((t) => ({
        id: t.id,
        name: t.name,
        specialty: t.specialty ?? '',
        phone: t.phone ?? '',
        email: t.email ?? '',
        courses: t.courses,
        trainees: t.trainees,
        rating: t.rating,
        status: t.status,
        experience: t.experience ?? '',
        certifications: t.certifications,
      })),
      stats: { total: trainers.length, active, avgRating, totalTrainees, totalCourses: trainers.reduce((s, t) => s + t.courses, 0) },
    });
  } catch (error) {
    console.error('Error listing trainers:', error);
    return NextResponse.json({ error: 'فشل في جلب المدربين' }, { status: 500 });
  }
}
