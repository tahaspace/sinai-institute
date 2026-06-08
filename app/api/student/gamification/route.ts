import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';
import { requireFeature } from '@/lib/authz';

const LEVEL_SIZE = 500;

// GET /api/student/gamification — points totals, level, rank, badges, history.
export async function GET(request: NextRequest) {
  try {
    const feat = await requireFeature('gamification.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const log = await prisma.pointsLog.findMany({ where: { studentId: student.id }, orderBy: { createdAt: 'desc' } });
    const total = log.reduce((s, p) => s + p.points, 0);
    const now = Date.now();
    const within = (days: number) => log.filter((p) => now - p.createdAt.getTime() <= days * 86400000).reduce((s, p) => s + p.points, 0);

    const level = Math.floor(total / LEVEL_SIZE) + 1;
    const badgesCount = await prisma.studentBadge.count({ where: { studentId: student.id } });

    // Rank among all students by total points
    const allLogs = await prisma.pointsLog.groupBy({ by: ['studentId'], _sum: { points: true } });
    const ranked = allLogs.map((r) => r._sum.points ?? 0).sort((a, b) => b - a);
    const rank = ranked.findIndex((p) => p <= total) >= 0 ? ranked.filter((p) => p > total).length + 1 : ranked.length;

    return NextResponse.json({
      student: { id: student.id, name: student.nameAr },
      totalPoints: total,
      weeklyPoints: within(7),
      monthlyPoints: within(30),
      level,
      currentXP: total,
      requiredXP: level * LEVEL_SIZE,
      rank,
      badgesCount,
      pointsHistory: log.slice(0, 10).map((p) => ({ id: p.id, points: p.points, reason: p.reason, category: p.category, date: p.createdAt.toISOString().slice(0, 10) })),
    });
  } catch (error) {
    console.error('Error building gamification:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات التحفيز' }, { status: 500 });
  }
}
