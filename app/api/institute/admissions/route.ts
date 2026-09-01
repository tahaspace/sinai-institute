import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveApplicationProgramId } from '@/lib/admission-program';
import { requirePermission } from '@/lib/authz';

const statusLabel = (s: string) =>
  ({ PENDING: 'قيد المراجعة', APPROVED: 'مقبول', REJECTED: 'مرفوض', ENROLLED: 'تم التسجيل' } as Record<string, string>)[s] ?? s;

// GET /api/institute/admissions?status=
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('admission.application.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status.toUpperCase();

    const apps = await prisma.application.findMany({ where, orderBy: { createdAt: 'desc' } });

    const byStatus = (s: string) => apps.filter((a) => a.status === s).length;
    return NextResponse.json({
      applications: apps.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        nationalId: a.nationalId,
        email: a.email,
        phone: a.phone,
        highSchoolGrade: a.highSchoolGrade,
        firstChoice: a.firstChoice,
        status: a.status,
        statusLabel: statusLabel(a.status),
        createdAt: a.createdAt.toISOString().slice(0, 10),
      })),
      stats: {
        total: apps.length,
        pending: byStatus('PENDING'),
        approved: byStatus('APPROVED'),
        rejected: byStatus('REJECTED'),
        enrolled: byStatus('ENROLLED'),
      },
    });
  } catch (error) {
    console.error('Error listing admissions:', error);
    return NextResponse.json({ error: 'فشل في جلب طلبات الالتحاق' }, { status: 500 });
  }
}

// PATCH /api/institute/admissions — change status; "ENROLLED" creates a real Student.
// This closes the admission loop: an approved applicant becomes a shared Student
// that the Student/Faculty/Parent portals can then see.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('admission.application.decide');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { id, status, departmentId, programId } = body ?? {};
    if (!id || !status) return NextResponse.json({ error: 'المعرف والحالة مطلوبان' }, { status: 400 });

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const next = String(status).toUpperCase();
    let createdStudent = null;

    // Resolve the applicant's choice to a real Program. This is what carries the academic system:
    // a Student created without a programId silently defaults to credit-hours, which would be wrong
    // for an annual-programme applicant and would misroute every later result/promotion decision.
    const resolvedProgramId = await resolveApplicationProgramId(app.firstChoice, programId);

    if (next === 'ENROLLED') {
      // Create the Student from the application if not already created.
      const program = resolvedProgramId
        ? await prisma.program.findUnique({ where: { id: resolvedProgramId }, select: { departmentId: true } })
        : null;
      const year = new Date().getFullYear();
      const count = await prisma.student.count();
      createdStudent = await prisma.student.create({
        data: {
          studentCode: `${year}-${String(count + 1).padStart(4, '0')}`,
          nameAr: app.fullName,
          email: app.email,
          phone: app.phone,
          nationalId: app.nationalId,
          departmentId: departmentId || program?.departmentId || null,
          programId: resolvedProgramId,
          level: 1,
          enrollYear: year,
          status: 'ACTIVE',
        },
      });
    }

    const updated = await prisma.application.update({
      where: { id },
      // Persist the resolution too, so admissions reports can be filtered by academic system.
      data: { status: next, ...(resolvedProgramId && !app.programId ? { programId: resolvedProgramId } : {}) },
    });
    return NextResponse.json({ application: updated, createdStudent });
  } catch (error) {
    console.error('Error updating admission:', error);
    return NextResponse.json({ error: 'فشل في تحديث طلب الالتحاق' }, { status: 500 });
  }
}
