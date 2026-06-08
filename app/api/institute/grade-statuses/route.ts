import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/grade-statuses — the configurable result-state table.
export async function GET() {
  try {
    const guard = await requirePermission('exam.grade.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const statuses = await prisma.gradeStatus.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json({
      gradeStatuses: statuses.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        points: s.points,
        affectsGpa: s.affectsGpa,
        isPass: s.isPass,
        isLetter: s.isLetter,
        minPercent: s.minPercent,
      })),
      stats: {
        total: statuses.length,
        letters: statuses.filter((s) => s.isLetter).length,
        special: statuses.filter((s) => !s.isLetter).length,
      },
    });
  } catch (error) {
    console.error('Error listing grade statuses:', error);
    return NextResponse.json({ error: 'فشل في جلب حالات النتيجة' }, { status: 500 });
  }
}

// PATCH /api/institute/grade-statuses — edit a status (points / affectsGpa / isPass / name).
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, name, points, affectsGpa, isPass, minPercent } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (typeof name === 'string') data.name = name;
    if (points === null || typeof points === 'number') data.points = points;
    if (typeof affectsGpa === 'boolean') data.affectsGpa = affectsGpa;
    if (typeof isPass === 'boolean') data.isPass = isPass;
    if (minPercent === null || typeof minPercent === 'number') data.minPercent = minPercent;

    const updated = await prisma.gradeStatus.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating grade status:', error);
    return NextResponse.json({ error: 'فشل في تحديث حالة النتيجة' }, { status: 500 });
  }
}

// POST /api/institute/grade-statuses — add a new custom status (per-institute policy).
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.grade.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { code, name } = body ?? {};
    if (!code || !name) return NextResponse.json({ error: 'الكود والاسم مطلوبان' }, { status: 400 });

    const created = await prisma.gradeStatus.create({
      data: {
        code,
        name,
        points: body.points ?? null,
        affectsGpa: body.affectsGpa ?? false,
        isPass: body.isPass ?? false,
        isLetter: body.isLetter ?? false,
        minPercent: body.minPercent ?? null,
        order: body.order ?? 50,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating grade status:', error);
    return NextResponse.json({ error: 'فشل في إضافة حالة النتيجة' }, { status: 500 });
  }
}
