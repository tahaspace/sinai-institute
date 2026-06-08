import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/admin/student-affairs — read-only summary for the student-affairs dashboard.
export async function GET() {
  try {
    const guard = await requirePermission('student.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const [students, active, newApplications, pendingComplaints] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.complaint.count({ where: { status: 'PENDING' } }),
    ]);

    return NextResponse.json({
      students,
      active,
      activePct: students > 0 ? Math.round((active / students) * 1000) / 10 : 0,
      newApplications,
      pendingComplaints,
    });
  } catch (error) {
    console.error('Error building student-affairs summary:', error);
    return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 });
  }
}
