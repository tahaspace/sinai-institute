import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';
import { requireFeature } from '@/lib/authz';

// GET /api/student/gamification/rewards — rewards catalog + affordability vs the student's points.
export async function GET(request: NextRequest) {
  try {
    const feat = await requireFeature('gamification.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const [rewards, log] = await Promise.all([
      prisma.reward.findMany({ orderBy: { cost: 'asc' } }),
      prisma.pointsLog.findMany({ where: { studentId: student.id } }),
    ]);
    const total = log.reduce((s, p) => s + p.points, 0);

    return NextResponse.json({
      points: total,
      rewards: rewards.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? '',
        icon: r.icon ?? '🎁',
        cost: r.cost,
        stock: r.stock,
        canAfford: total >= r.cost,
      })),
    });
  } catch (error) {
    console.error('Error listing rewards:', error);
    return NextResponse.json({ error: 'فشل في جلب المكافآت' }, { status: 500 });
  }
}
