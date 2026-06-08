import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission, requireFeature } from '@/lib/authz';

// GET /api/institute/quality — quality indicators + aggregate stats.
export async function GET() {
  try {
    const feat = await requireFeature('quality.enabled');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('quality.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const indicators = await prisma.qualityIndicator.findMany({
      orderBy: { order: 'asc' },
    });

    const total = indicators.length;
    const achieved = indicators.filter((i) => i.score >= i.target).length;
    const belowTarget = indicators.filter((i) => i.score < i.target).length;
    const scoreSum = indicators.reduce((sum, i) => sum + i.score, 0);

    return NextResponse.json({
      qualityIndicators: indicators.map((i) => ({
        id: i.id,
        name: i.name,
        score: i.score,
        target: i.target,
      })),
      stats: {
        achievedPct: total > 0 ? Math.round((100 * achieved) / total) : 0,
        belowTarget,
        avgScore: total > 0 ? Math.round(scoreSum / total) : 0,
        total,
      },
    });
  } catch (error) {
    console.error('Error listing quality indicators:', error);
    return NextResponse.json({ error: 'فشل في جلب مؤشرات الجودة' }, { status: 500 });
  }
}
