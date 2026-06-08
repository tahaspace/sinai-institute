import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/exams/question-bank — per-course question counts by type.
export async function GET() {
  try {
    const guard = await requirePermission('exam.questionbank.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const courses = await prisma.course.findMany({
      include: { examQuestions: true },
      orderBy: { code: 'asc' },
    });

    const rows = courses.map((c) => {
      const q = c.examQuestions;
      return {
        id: c.id,
        code: c.code,
        nameAr: c.nameAr,
        total: q.length,
        mcq: q.filter((x) => x.type === 'mcq').length,
        essay: q.filter((x) => x.type === 'essay').length,
        truefalse: q.filter((x) => x.type === 'truefalse').length,
      };
    });

    return NextResponse.json({
      courses: rows,
      stats: {
        totalQuestions: rows.reduce((s, r) => s + r.total, 0),
        courses: rows.length,
        mcq: rows.reduce((s, r) => s + r.mcq, 0),
        essay: rows.reduce((s, r) => s + r.essay, 0),
      },
    });
  } catch (error) {
    console.error('Error listing question bank:', error);
    return NextResponse.json({ error: 'فشل في جلب بنك الأسئلة' }, { status: 500 });
  }
}
