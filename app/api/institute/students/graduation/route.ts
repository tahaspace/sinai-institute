import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeSystem } from '@/lib/academic-system';
import { requirePermission } from '@/lib/authz';

const statusLabel = (s: string) =>
  ({ PENDING: 'قيد المراجعة', APPROVED: 'مقبول', REJECTED: 'مرفوض' } as Record<string, string>)[s] ?? s;

// GET /api/institute/students/graduation
export async function GET() {
  try {
    const guard = await requirePermission('graduation.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const reqs = await prisma.graduationRequest.findMany({
      include: { student: { include: { department: true, program: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      graduationRequests: reqs.map((r) => ({
        id: r.id,
        student: r.student.nameAr,
        studentCode: r.student.studentCode,
        department: r.student.department?.nameAr ?? '',
        program: r.student.program?.nameAr ?? '',
        // Program-driven and resolved server-side, under the platform-wide field name, so the
        // screen filters and renders on it instead of guessing the system in the browser.
        system: normalizeSystem(r.student.program?.academicSystem),
        // Deploy-skew alias, removable after the next deploy: a tab still running the PREVIOUS
        // bundle keys its annual branch off `academicSystem`, and without it the stored 0 CGPA of
        // an annual student would render as a real «0.00».
        academicSystem: normalizeSystem(r.student.program?.academicSystem),
        completedHours: r.completedHours,
        requiredHours: r.requiredHours,
        gpa: r.gpa,
        status: r.status,
        statusLabel: statusLabel(r.status),
        date: r.createdAt.toISOString().slice(0, 10),
      })),
      stats: {
        total: reqs.length,
        pending: reqs.filter((r) => r.status === 'PENDING').length,
        approved: reqs.filter((r) => r.status === 'APPROVED').length,
        rejected: reqs.filter((r) => r.status === 'REJECTED').length,
      },
    });
  } catch (error) {
    console.error('Error listing graduation requests:', error);
    return NextResponse.json({ error: 'فشل في جلب طلبات التخرج' }, { status: 500 });
  }
}

// PATCH /api/institute/students/graduation — approve/reject a request.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('graduation.approve');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, status } = body ?? {};
    if (!id || !status) return NextResponse.json({ error: 'المعرف والحالة مطلوبان' }, { status: 400 });

    const next = String(status).toUpperCase();
    const req = await prisma.graduationRequest.update({
      where: { id },
      data: { status: next, reviewedAt: new Date() },
    });
    // If approved, mark the student graduated (shared status the other portals read).
    if (next === 'APPROVED') {
      await prisma.student.update({ where: { id: req.studentId }, data: { status: 'GRADUATED' } });
    }
    return NextResponse.json(req);
  } catch (error) {
    console.error('Error updating graduation request:', error);
    return NextResponse.json({ error: 'فشل في تحديث طلب التخرج' }, { status: 500 });
  }
}
