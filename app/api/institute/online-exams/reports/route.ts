import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission, requireFeature } from '@/lib/authz';

const letterOf = (pct: number) =>
  pct >= 90 ? 'A' : pct >= 85 ? 'A-' : pct >= 80 ? 'B+' : pct >= 75 ? 'B' : pct >= 70 ? 'C+' : pct >= 65 ? 'C' : pct >= 60 ? 'D' : 'F';

// GET /api/institute/online-exams/reports?courseId= — exam analytics from Enrollment grades.
export async function GET(request: NextRequest) {
  try {
    const feat = await requireFeature('exams.online');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('onlineexam.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    let courseId = searchParams.get('courseId');
    const courses = await prisma.course.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true } });
    if (!courseId) courseId = courses[0]?.id ?? null;
    if (!courseId) return NextResponse.json({ courses, course: null, studentResults: [], gradeDistribution: [], scoreDistribution: [], stats: {} });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, final: { not: null } },
      include: { student: true },
    });
    const max = course ? course.midtermMax + course.finalMax + course.practicalMax + course.homeworkMax : 100;

    const studentResults = enrollments.map((e) => {
      const score = (e.midterm ?? 0) + (e.final ?? 0) + (e.practical ?? 0) + (e.homework ?? 0);
      const pct = max > 0 ? Math.round((score / max) * 100) : 0;
      return { name: e.student.nameAr, studentCode: e.student.studentCode, score, max, percentage: pct, grade: e.letterGrade ?? letterOf(pct) };
    });

    // Grade distribution (count per letter)
    const gradeMap = new Map<string, number>();
    for (const r of studentResults) gradeMap.set(r.grade, (gradeMap.get(r.grade) ?? 0) + 1);
    const gradeDistribution = [...gradeMap.entries()].map(([grade, count]) => ({ grade, count }));

    // Score distribution (histogram buckets)
    const buckets = [
      { label: '90-100', min: 90 }, { label: '80-89', min: 80 }, { label: '70-79', min: 70 },
      { label: '60-69', min: 60 }, { label: '0-59', min: 0 },
    ];
    const scoreDistribution = buckets.map((b, i) => {
      const upper = i === 0 ? 101 : buckets[i - 1].min;
      return { range: b.label, count: studentResults.filter((r) => r.percentage >= b.min && r.percentage < upper).length };
    });

    const pcts = studentResults.map((r) => r.percentage);
    const stats = {
      participants: studentResults.length,
      average: pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0,
      passRate: pcts.length ? Math.round((pcts.filter((p) => p >= 60).length / pcts.length) * 100) : 0,
      highest: pcts.length ? Math.max(...pcts) : 0,
      lowest: pcts.length ? Math.min(...pcts) : 0,
    };

    return NextResponse.json({
      courses,
      course: course && { id: course.id, code: course.code, nameAr: course.nameAr },
      studentResults,
      gradeDistribution,
      scoreDistribution,
      stats,
    });
  } catch (error) {
    console.error('Error building online-exam reports:', error);
    return NextResponse.json({ error: 'فشل في جلب تقارير الامتحانات' }, { status: 500 });
  }
}
