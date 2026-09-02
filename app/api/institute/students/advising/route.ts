import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { academicSystemWhere, normalizeSystem } from '@/lib/academic-system';
import { requirePermission } from '@/lib/authz';

const creditHoursOnly = academicSystemWhere('CREDIT_HOURS') as Prisma.StudentWhereInput;

// GET /api/institute/students/advising — students who need academic advising (low GPA).
export async function GET() {
  try {
    const guard = await requirePermission('advising.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    // "Needs advising" is a CGPA threshold, and only the credit-hour system has a CGPA: annual
    // students store none at all (lib/gpa.ts keeps raw marks for them), so their default gpa 0
    // matched `lt: 2.5` and flagged every single one of them as critically at risk.
    // Composed under AND because academicSystemWhere returns an OR a spread would clobber.
    const atRisk = await prisma.student.findMany({
      where: { AND: [{ gpa: { lt: 2.5 } }, creditHoursOnly] },
      include: { department: true, program: true, warnings: { where: { status: 'ACTIVE' } } },
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
      // Program-driven, resolved server-side — the client filters/renders on this, never guesses it.
      system: normalizeSystem(s.program?.academicSystem),
    }));

    const [totalStudents, creditStudents] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: creditHoursOnly }),
    ]);

    return NextResponse.json({
      studentsNeedingAdvice,
      // No advising-session model yet; surfaced as empty rather than fabricated.
      upcomingSessions: [],
      stats: {
        needAdvice: studentsNeedingAdvice.length,
        totalStudents,
        sessionsScheduled: 0,
        // Per-system headcounts so the display filter can narrow the denominator without a second
        // round-trip. totalStudents itself is unchanged — still the whole institute.
        totalBySystem: { CREDIT_HOURS: creditStudents, ANNUAL: totalStudents - creditStudents },
      },
    });
  } catch (error) {
    console.error('Error building advising:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الإرشاد' }, { status: 500 });
  }
}
