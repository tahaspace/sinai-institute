import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { normalizeSystem } from '@/lib/academic-system';

const statusLabel = (s: string) =>
  ({ PENDING: 'قيد المراجعة', APPROVED: 'مقبول', REJECTED: 'مرفوض' } as Record<string, string>)[s] ?? s;

// GET /api/institute/exams/appeals?status=
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.appeal.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status.toUpperCase();

    const appeals = await prisma.examAppeal.findMany({
      where,
      // `program` only adds the academic system to the row the client already gets — the student
      // scalars (nameAr/studentCode) still come through exactly as before.
      include: { student: { include: { program: { select: { academicSystem: true } } } }, course: true },
      orderBy: { createdAt: 'desc' },
    });

    const byStatus = (s: string) => appeals.filter((a) => a.status === s).length;
    return NextResponse.json({
      appeals: appeals.map((a) => ({
        id: a.id,
        student: a.student.nameAr,
        studentCode: a.student.studentCode,
        system: normalizeSystem(a.student.program?.academicSystem),
        course: a.course.nameAr,
        courseCode: a.course.code,
        reason: a.reason,
        status: a.status,
        statusLabel: statusLabel(a.status),
        response: a.response ?? '',
        date: a.createdAt.toISOString().slice(0, 10),
      })),
      stats: {
        total: appeals.length,
        pending: byStatus('PENDING'),
        approved: byStatus('APPROVED'),
        rejected: byStatus('REJECTED'),
      },
    });
  } catch (error) {
    console.error('Error listing appeals:', error);
    return NextResponse.json({ error: 'فشل في جلب التظلمات' }, { status: 500 });
  }
}

// PATCH /api/institute/exams/appeals — resolve an appeal.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.appeal.resolve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, status, response } = body ?? {};
    if (!id || !status) return NextResponse.json({ error: 'المعرف والحالة مطلوبان' }, { status: 400 });

    const appeal = await prisma.examAppeal.update({
      where: { id },
      data: { status: String(status).toUpperCase(), response: response || null, respondedAt: new Date() },
    });
    return NextResponse.json(appeal);
  } catch (error) {
    console.error('Error updating appeal:', error);
    return NextResponse.json({ error: 'فشل في تحديث التظلم' }, { status: 500 });
  }
}
