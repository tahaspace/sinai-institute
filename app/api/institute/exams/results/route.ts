import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

// GET /api/institute/exams/results — per-course result aggregates from Enrollment grades.
export async function GET() {
  try {
    const guard = await requirePermission('exam.result.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const courses = await prisma.course.findMany({
      include: { enrollments: true },
      orderBy: { code: 'asc' },
    });

    const courseResults = courses.map((c) => {
      const max = c.midtermMax + c.finalMax + c.practicalMax + c.homeworkMax;
      const graded = c.enrollments.filter((e) => e.final != null);
      const totals = graded.map((e) => (e.midterm ?? 0) + (e.final ?? 0) + (e.practical ?? 0) + (e.homework ?? 0));
      const passed = totals.filter((t) => max > 0 && t / max >= 0.6).length;
      const avgPct = totals.length ? Math.round((totals.reduce((s, t) => s + (max > 0 ? (t / max) * 100 : 0), 0) / totals.length)) : 0;
      return {
        course: c.nameAr,
        code: c.code,
        enrolled: c.enrollments.length,
        graded: graded.length,
        passed,
        passRate: graded.length ? Math.round((passed / graded.length) * 100) : 0,
        avgGrade: avgPct,
      };
    });

    const gradedCourses = courseResults.filter((r) => r.graded > 0);
    return NextResponse.json({
      courseResults,
      stats: {
        totalCourses: courseResults.length,
        avgPassRate: gradedCourses.length ? Math.round(gradedCourses.reduce((s, r) => s + r.passRate, 0) / gradedCourses.length) : 0,
        publishedCourses: gradedCourses.length,
      },
    });
  } catch (error) {
    console.error('Error building results:', error);
    return NextResponse.json({ error: 'فشل في جلب النتائج' }, { status: 500 });
  }
}
