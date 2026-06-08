import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';

const CATEGORY_LABEL: Record<string, string> = {
  grade: 'الدرجات', attendance: 'الحضور', assignment: 'الواجبات', bonus: 'مكافآت', general: 'عام',
};

// GET /api/student/gamification/points — breakdown by category + recent activity + rules.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student = await resolveStudent(searchParams.get('studentCode'));
    if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });

    const log = await prisma.pointsLog.findMany({ where: { studentId: student.id }, orderBy: { createdAt: 'desc' } });
    const total = log.reduce((s, p) => s + p.points, 0);

    const byCat = new Map<string, number>();
    for (const p of log) byCat.set(p.category, (byCat.get(p.category) ?? 0) + p.points);
    const pointsBreakdown = [...byCat.entries()].map(([category, points]) => ({
      category,
      label: CATEGORY_LABEL[category] ?? category,
      points,
    }));

    return NextResponse.json({
      total,
      pointsBreakdown,
      recentActivity: log.slice(0, 10).map((p) => ({ id: p.id, reason: p.reason, points: p.points, category: p.category, date: p.createdAt.toISOString().slice(0, 10) })),
      pointsRules: [
        { action: 'تسليم واجب', points: 'حسب الدرجة' },
        { action: 'الحضور', points: '+5 (متأخر +2)' },
        { action: 'اجتياز مقرر', points: 'نصف النسبة المئوية' },
      ],
    });
  } catch (error) {
    console.error('Error building points:', error);
    return NextResponse.json({ error: 'فشل في جلب النقاط' }, { status: 500 });
  }
}
