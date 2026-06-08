import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

// GET /api/student/gamification/badges — all badges with earned flag for the student.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const [badges, earned] = await Promise.all([
      prisma.badge.findMany({ orderBy: { threshold: 'asc' } }),
      prisma.studentBadge.findMany({ where: { studentId: student.id } }),
    ]);
    const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

    const list = badges.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description ?? '',
      icon: b.icon ?? '🏅',
      category: b.category,
      threshold: b.threshold,
      earned: earnedMap.has(b.id),
      earnedAt: earnedMap.get(b.id)?.toISOString().slice(0, 10) ?? null,
    }));

    return NextResponse.json({
      badges: list,
      stats: { total: list.length, earned: list.filter((b) => b.earned).length },
    });
  } catch (error) {
    console.error('Error listing badges:', error);
    return NextResponse.json({ error: 'فشل في جلب الشارات' }, { status: 500 });
  }
}
