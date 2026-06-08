import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveParentStudents } from '@/lib/student';

// GET /api/parent/reports — per-child academic report for the logged-in parent.
export async function GET() {
  try {
    const students = await resolveParentStudents();

    const reports = await Promise.all(
      students.map(async (s) => {
        const [enrollments, attendance, warnings] = await Promise.all([
          prisma.enrollment.findMany({ where: { studentId: s.id, final: { not: null } }, include: { course: true } }),
          prisma.attendance.findMany({ where: { studentId: s.id } }),
          prisma.studentWarning.count({ where: { studentId: s.id, status: 'ACTIVE' } }),
        ]);

        const total = attendance.length;
        const present = attendance.filter((a) => a.status === 'present').length;
        const late = attendance.filter((a) => a.status === 'late').length;
        const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        const grades = enrollments.map((e) => {
          const max = e.course.midtermMax + e.course.finalMax + e.course.practicalMax + e.course.homeworkMax;
          const got = (e.midterm ?? 0) + (e.final ?? 0) + (e.practical ?? 0) + (e.homework ?? 0);
          return { subject: e.course.nameAr, total: got, max, letter: e.letterGrade };
        });

        return {
          id: s.id,
          name: s.nameAr,
          studentCode: s.studentCode,
          gpa: s.gpa,
          attendance: attendancePct,
          activeWarnings: warnings,
          grades,
        };
      })
    );

    return NextResponse.json({
      children: reports.map((r) => ({ id: r.id, name: r.name, studentCode: r.studentCode })),
      reports,
      // No certificate model yet; surfaced empty rather than fabricated.
      certificates: [],
    });
  } catch (error) {
    console.error('Error fetching parent reports:', error);
    return NextResponse.json({ error: 'فشل في جلب التقارير' }, { status: 500 });
  }
}
