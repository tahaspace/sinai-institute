import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/exams/questions?courseId=&type= — list questions (+ course list for pickers).
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.questionbank.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const type = searchParams.get('type');
    const where: Record<string, unknown> = {};
    if (courseId && courseId !== 'all') where.courseId = courseId;
    if (type && type !== 'all') where.type = type;

    const [questions, courses] = await Promise.all([
      prisma.examQuestion.findMany({ where, include: { course: true }, orderBy: { createdAt: 'desc' } }),
      prisma.course.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true } }),
    ]);

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        difficulty: q.difficulty,
        course: q.course.nameAr,
        courseCode: q.course.code,
        courseId: q.courseId,
      })),
      courses,
      stats: {
        total: questions.length,
        mcq: questions.filter((q) => q.type === 'mcq').length,
        essay: questions.filter((q) => q.type === 'essay').length,
        truefalse: questions.filter((q) => q.type === 'truefalse').length,
      },
    });
  } catch (error) {
    console.error('Error listing questions:', error);
    return NextResponse.json({ error: 'فشل في جلب الأسئلة' }, { status: 500 });
  }
}

// POST /api/institute/exams/questions — add a question to the bank.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.questionbank.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { courseId, text, type, difficulty } = body ?? {};
    if (!courseId || !text) return NextResponse.json({ error: 'المقرر ونص السؤال مطلوبان' }, { status: 400 });

    const q = await prisma.examQuestion.create({
      data: { courseId, text, type: type || 'mcq', difficulty: difficulty || 'medium' },
    });
    return NextResponse.json(q, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'فشل في إضافة السؤال' }, { status: 500 });
  }
}

// DELETE /api/institute/exams/questions?id= — remove a question.
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.questionbank.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    await prisma.examQuestion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'فشل في حذف السؤال' }, { status: 500 });
  }
}
