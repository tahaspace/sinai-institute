import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

const typeLabel = (t: string) =>
  ({ FIRST: 'إنذار أول', SECOND: 'إنذار ثاني', ACADEMIC: 'إنذار أكاديمي', BEHAVIORAL: 'إنذار سلوكي' } as Record<string, string>)[t] ?? t;

// GET /api/institute/students/warnings
export async function GET() {
  try {
    const guard = await requirePermission('warning.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const warnings = await prisma.studentWarning.findMany({
      include: { student: { include: { department: true } } },
      orderBy: { issuedAt: 'desc' },
    });

    return NextResponse.json({
      warnings: warnings.map((w) => ({
        id: w.id,
        student: w.student.nameAr,
        studentCode: w.student.studentCode,
        department: w.student.department?.nameAr ?? '',
        type: w.type,
        typeLabel: typeLabel(w.type),
        reason: w.reason,
        gpa: w.gpa,
        status: w.status,
        date: w.issuedAt.toISOString().slice(0, 10),
      })),
      stats: {
        total: warnings.length,
        active: warnings.filter((w) => w.status === 'ACTIVE').length,
        resolved: warnings.filter((w) => w.status === 'RESOLVED').length,
      },
    });
  } catch (error) {
    console.error('Error listing warnings:', error);
    return NextResponse.json({ error: 'فشل في جلب الإنذارات' }, { status: 500 });
  }
}

// POST /api/institute/students/warnings — issue a warning.
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission('warning.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { studentCode, studentId, type, reason } = body ?? {};
    let sid = studentId;
    if (!sid && studentCode) sid = (await prisma.student.findUnique({ where: { studentCode } }))?.id;
    if (!sid || !reason) return NextResponse.json({ error: 'الطالب والسبب مطلوبان' }, { status: 400 });

    const student = await prisma.student.findUnique({ where: { id: sid } });
    const warning = await prisma.studentWarning.create({
      data: { studentId: sid, type: type || 'ACADEMIC', reason, gpa: student?.gpa ?? null, status: 'ACTIVE' },
    });
    return NextResponse.json(warning, { status: 201 });
  } catch (error) {
    console.error('Error creating warning:', error);
    return NextResponse.json({ error: 'فشل في إصدار الإنذار' }, { status: 500 });
  }
}

// PATCH /api/institute/students/warnings — resolve a warning.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('warning.create');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, status } = body ?? {};
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const warning = await prisma.studentWarning.update({
      where: { id },
      data: { status: status || 'RESOLVED', resolvedAt: new Date() },
    });
    return NextResponse.json(warning);
  } catch (error) {
    console.error('Error updating warning:', error);
    return NextResponse.json({ error: 'فشل في تحديث الإنذار' }, { status: 500 });
  }
}
