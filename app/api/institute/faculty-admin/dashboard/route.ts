import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { scopedWhere } from '@/lib/tenant';

// GET /api/institute/faculty-admin/dashboard — faculty/college admin (وكيل الكلية)
// overview. scopedWhere(ctx) filters every query by the signed-in user's faculty
// scope (facultyId in [...]) and tenant; with an empty scope it falls back to the
// whole tenant, which is correct until scoped staff users exist.
export async function GET() {
  try {
    const guard = await requirePermission('institute.dashboard.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { ctx } = guard;

    const [departmentCount, studentCount, instructorCount, courseCount, departments] =
      await Promise.all([
        prisma.department.count({ where: scopedWhere(ctx, { isActive: true }) }),
        prisma.student.count({ where: scopedWhere(ctx) }),
        prisma.instructor.count({ where: scopedWhere(ctx) }),
        prisma.course.count({ where: scopedWhere(ctx) }),
        prisma.department.findMany({
          where: scopedWhere(ctx, { isActive: true }),
          orderBy: { order: 'asc' },
          include: { _count: { select: { students: true, instructors: true } } },
        }),
      ]);

    return NextResponse.json({
      stats: {
        departments: departmentCount,
        students: studentCount,
        instructors: instructorCount,
        courses: courseCount,
      },
      departments: departments.map((d) => ({
        id: d.id,
        name: d.nameAr,
        students: d._count.students,
        instructors: d._count.instructors,
      })),
    });
  } catch (error) {
    console.error('Error building faculty-admin dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات لوحة وكيل الكلية' }, { status: 500 });
  }
}
