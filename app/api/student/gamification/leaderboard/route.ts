import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';
import { requireFeature } from '@/lib/authz';

// GET /api/student/gamification/leaderboard — students ranked by total points.
export async function GET(request: NextRequest) {
  try {
    const feat = await requireFeature('gamification.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));

    const grouped = await prisma.pointsLog.groupBy({ by: ['studentId'], _sum: { points: true } });
    const ids = grouped.map((g) => g.studentId);
    const students = await prisma.student.findMany({ where: { id: { in: ids } } });
    const nameOf = new Map(students.map((s) => [s.id, s]));

    const leaderboard = grouped
      .map((g) => ({ studentId: g.studentId, points: g._sum.points ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .map((row, i) => ({
        rank: i + 1,
        name: nameOf.get(row.studentId)?.nameAr ?? 'طالب',
        studentCode: nameOf.get(row.studentId)?.studentCode ?? '',
        points: row.points,
        isCurrent: student ? row.studentId === student.id : false,
      }));

    return NextResponse.json({
      leaderboard,
      currentRank: leaderboard.find((r) => r.isCurrent)?.rank ?? null,
    });
  } catch (error) {
    console.error('Error building leaderboard:', error);
    return NextResponse.json({ error: 'فشل في جلب لوحة المتصدرين' }, { status: 500 });
  }
}
