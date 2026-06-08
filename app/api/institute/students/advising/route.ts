import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/students/advising — students who need academic advising (low GPA).
export async function GET() {
  try {
    const guard = await requirePermission('advising.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const atRisk = await prisma.student.findMany({
      where: { gpa: { lt: 2.5 } },
      include: { department: true, warnings: { where: { status: 'ACTIVE' } } },
      orderBy: { gpa: 'asc' },
    });

    const studentsNeedingAdvice = atRisk.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      name: s.nameAr,
      department: s.department?.nameAr ?? '',
      gpa: s.gpa,
      level: s.level,
      activeWarnings: s.warnings.length,
    }));

    const totalStudents = await prisma.student.count();
    return NextResponse.json({
      studentsNeedingAdvice,
      // No advising-session model yet; surfaced as empty rather than fabricated.
      upcomingSessions: [],
      stats: {
        needAdvice: studentsNeedingAdvice.length,
        totalStudents,
        sessionsScheduled: 0,
      },
    });
  } catch (error) {
    console.error('Error building advising:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الإرشاد' }, { status: 500 });
  }
}
