import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission, requireFeature } from '@/lib/authz';

interface EquivalenceRow {
  id: string;
  student: string;
  originalCourse: string;
  originalInstitute: string;
  requestedCourse: string;
  creditHours: number;
  date: string;
  status: string; // lowercase for the page's getStatusBadge switch
}

// GET /api/institute/admission/equivalence
// Lists course-equivalence (transfer-credit) requests + derived stats.
export async function GET() {
  try {
    const feat = await requireFeature('admission.transfers');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('equivalence.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const rows = await prisma.courseEquivalenceRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { nameAr: true } },
        course: { select: { code: true, nameAr: true, creditHours: true } },
      },
    });

    const requests: EquivalenceRow[] = rows.map((r) => ({
      id: r.id,
      // prefer the linked Student name, fall back to the denormalized studentName
      student: r.student?.nameAr ?? r.studentName,
      originalCourse: r.originalCourse,
      originalInstitute: r.originalInstitute,
      // prefer the live Course label, fall back to the denormalized requestedCourse
      requestedCourse: r.course ? `${r.course.code} - ${r.course.nameAr}` : r.requestedCourse,
      creditHours: r.course?.creditHours ?? r.creditHours,
      date: r.createdAt.toISOString().slice(0, 10),
      status: r.status.toLowerCase(),
    }));

    // All four tiles are aggregations over CourseEquivalenceRequest — none are stored.
    const total = rows.length;
    const approved = rows.filter((r) => r.status === 'APPROVED').length;
    const pending = rows.filter((r) => r.status === 'PENDING').length;
    // "ساعات معادلة" = sum of credited hours for APPROVED requests only (honest derivation)
    const approvedHours = rows
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (r.course?.creditHours ?? r.creditHours), 0);

    return NextResponse.json({
      requests,
      stats: { total, approved, pending, approvedHours },
    });
  } catch (error) {
    console.error('Error listing equivalence requests:', error);
    return NextResponse.json({ error: 'فشل في جلب طلبات المعادلة' }, { status: 500 });
  }
}

// PATCH /api/institute/admission/equivalence — approve/reject a request.
export async function PATCH(request: NextRequest) {
  try {
    const feat = await requireFeature('admission.transfers');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('equivalence.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, status } = body ?? {};
    if (!id || !status) return NextResponse.json({ error: 'المعرف والحالة مطلوبان' }, { status: 400 });

    const next = String(status).toUpperCase();
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(next)) {
      return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });
    }

    const existing = await prisma.courseEquivalenceRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const updated = await prisma.courseEquivalenceRequest.update({
      where: { id },
      data: { status: next, reviewedAt: new Date() },
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error('Error updating equivalence request:', error);
    return NextResponse.json({ error: 'فشل في تحديث طلب المعادلة' }, { status: 500 });
  }
}
