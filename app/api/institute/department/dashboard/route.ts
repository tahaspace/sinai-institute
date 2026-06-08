import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { scopedWhere } from '@/lib/tenant';

// GET /api/institute/department/dashboard — department-head overview.
//
// Scope: scopedWhere(ctx) folds in the tenant + the head's departmentIds when
// the role assignment is scoped; an unscoped/platform context sees the whole
// tenant (no scoped staff users exist yet — see lib/tenant.ts note). Every count
// below shares that same where so KPIs and the at-risk list stay consistent.
export async function GET() {
  try {
    const guard = await requirePermission('institute.dashboard.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { ctx } = guard;

    // "At risk" = CGPA below the 2.0 academic-probation line OR carrying an
    // active warning. The warnings relation filter (some/status ACTIVE) mirrors
    // /api/institute/students/warnings so the two views can't disagree.
    const atRiskWhere = scopedWhere(ctx, {
      OR: [{ gpa: { lt: 2 } }, { warnings: { some: { status: 'ACTIVE' } } }],
    });

    const [students, instructors, courses, activeWarnings, atRiskStudents] = await Promise.all([
      prisma.student.count({ where: scopedWhere(ctx) }),
      prisma.instructor.count({ where: scopedWhere(ctx) }),
      prisma.course.count({ where: scopedWhere(ctx) }),
      // Count warnings via their student so department scope still applies.
      prisma.studentWarning.count({ where: { status: 'ACTIVE', student: scopedWhere(ctx) } }),
      prisma.student.findMany({
        where: atRiskWhere,
        orderBy: { gpa: 'asc' },
        take: 8,
        include: { department: true },
      }),
    ]);

    const atRisk = atRiskStudents.map((s) => ({
      name: s.nameAr,
      gpa: s.gpa,
      department: s.department?.nameAr ?? '—',
    }));

    return NextResponse.json({
      stats: { students, instructors, courses, activeWarnings },
      atRisk,
    });
  } catch (error) {
    console.error('Error building department dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات لوحة رئيس القسم' }, { status: 500 });
  }
}
