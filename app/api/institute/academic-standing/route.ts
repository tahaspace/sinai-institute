import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { computeAcademicStanding, computeStandingForStudents } from '@/lib/standing';
import { academicSystemWhere } from '@/lib/reporting/filters';

// GET /api/institute/academic-standing
//   ?studentCode=  → full standing for one student
//   (no param)     → standing summary for every active student + dashboard aggregates
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('student.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    const studentCode = searchParams.get('studentCode');

    if (studentCode) {
      const student = await prisma.student.findUnique({ where: { studentCode } });
      if (!student) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
      const standing = await computeAcademicStanding(student.id);
      return NextResponse.json({
        student: { studentCode: student.studentCode, name: student.nameAr, level: student.level },
        standing,
      });
    }

    // All currently-enrolled students (probation/warning students MUST appear here);
    // only terminal statuses are excluded.
    // Dual-system: this is the CGPA/probation dashboard, a credit-hours concept. Annual students
    // have no CGPA (they'd surface as false probation), so scope to credit-hours — annual standing
    // (منقول / له دور ثانٍ / باقٍ + تقدير) is shown in the promotion + annual-result screens instead.
    const students = await prisma.student.findMany({
      where: { status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] }, ...academicSystemWhere('CREDIT_HOURS') },
      select: { id: true, studentCode: true, nameAr: true, level: true, departmentId: true, department: { select: { nameAr: true } } },
      orderBy: { studentCode: 'asc' },
    });
    const standings = await computeStandingForStudents(students.map((s) => s.id));

    const rows = students.map((s) => {
      const st = standings.get(s.id)!;
      return {
        studentCode: s.studentCode,
        name: s.nameAr,
        department: s.department?.nameAr ?? '',
        level: s.level,
        cgpa: st.cgpa,
        earnedHours: st.earnedHours,
        onProbation: st.onProbation,
        escalation: st.escalation,
        termHonor: st.termHonor,
        cumulativeHonor: st.cumulativeHonor,
        canPromote: st.canPromote,
        qualifiedLevel: st.qualifiedLevel,
        graduationEligible: st.graduationEligible,
        remainingHours: st.remainingHours,
        failedMandatory: st.failedMandatory.length,
        flags: st.flags,
      };
    });

    const stats = {
      total: rows.length,
      warnings: rows.filter((r) => r.escalation === 'warning').length,
      finalWarnings: rows.filter((r) => r.escalation === 'track-change-or-dismissal').length,
      honor: rows.filter((r) => r.cumulativeHonor || r.termHonor).length,
      promotable: rows.filter((r) => r.canPromote).length,
      expectedGraduates: rows.filter((r) => r.graduationEligible).length,
    };

    return NextResponse.json({ rows, stats });
  } catch (error) {
    console.error('Error computing academic standing:', error);
    return NextResponse.json({ error: 'فشل في حساب الحالة الأكاديمية' }, { status: 500 });
  }
}
