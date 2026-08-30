import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';
import { computeStanding } from '@/lib/gpa';
import { scopeBlock } from '@/lib/holds';

// GET /api/student/grades?studentCode=&academicYear=&semester=
// Returns the grade breakdown + stats for one student.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear') || '2024-2025';
    const semester = searchParams.get('semester') || 'first';

    const student = await resolveStudent(searchParams.get('studentCode'));

    if (!student) {
      return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
    }

    // ClientR5 — result-visibility hold. The result stays in the DB untouched;
    // it is simply hidden from the student, who instead sees the hold message.
    const rBlock = await scopeBlock(student.id, 'blockResult');
    if (rBlock.blocked) {
      return NextResponse.json({
        held: true,
        holdType: rBlock.type,
        holdMessage: rBlock.message,
        student: { id: student.id, studentCode: student.studentCode, name: student.nameAr, level: student.level },
        subjects: [],
        exams: [],
        stats: null,
      });
    }

    const [enrollments, statuses] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId: student.id, academicYear, semester },
        include: { course: true },
        orderBy: { course: { code: 'asc' } },
      }),
      prisma.gradeStatus.findMany(),
    ]);
    const statusByCode = new Map(statuses.map((s) => [s.code, s]));

    // Per-subject breakdown
    const subjects = enrollments.map((e) => {
      const st = e.gradeStatusCode ? statusByCode.get(e.gradeStatusCode) : null;
      const midterm = e.midterm ?? 0;
      const final = e.final ?? 0;
      const practical = e.practical ?? 0;
      const homework = e.homework ?? 0;
      const total = midterm + final + practical + homework;
      const max =
        e.course.midtermMax + e.course.finalMax + e.course.practicalMax + e.course.homeworkMax;
      return {
        courseId: e.courseId,
        subject: e.course.nameAr,
        subjectEn: e.course.nameEn,
        midterm,
        final,
        practical,
        homework,
        total,
        max,
        midtermMax: e.course.midtermMax,
        finalMax: e.course.finalMax,
        practicalMax: e.course.practicalMax,
        homeworkMax: e.course.homeworkMax,
        letterGrade: e.letterGrade,
        // result-state (configurable): code + Arabic name + whether it counts toward GPA
        gradeStatusCode: e.gradeStatusCode,
        statusName: st?.name ?? null,
        affectsGpa: st ? st.affectsGpa && e.course.countsInGpa : true,
        isPass: st?.isPass ?? false,
        percentage: max > 0 ? (total / max) * 100 : 0,
      };
    });

    // Aggregate totals across this term
    const totalGrade = subjects.reduce((s, x) => s + x.total, 0);
    const maxGrade = subjects.reduce((s, x) => s + x.max, 0);
    const avgPct = subjects.length
      ? subjects.reduce((s, x) => s + x.percentage, 0) / subjects.length
      : 0;

    // Trend is derived (not fabricated): subject vs. the student's own average.
    const withTrend = subjects.map((x) => ({
      ...x,
      trend:
        x.percentage > avgPct + 2 ? 'up' : x.percentage < avgPct - 2 ? 'down' : 'same',
    }));

    // Rank: position among students in the same department, by GPA desc.
    let rank = 1;
    let totalStudents = 1;
    if (student.departmentId) {
      const peers = await prisma.student.findMany({
        where: { departmentId: student.departmentId, status: 'ACTIVE' },
        select: { id: true, gpa: true },
        orderBy: { gpa: 'desc' },
      });
      totalStudents = peers.length;
      const idx = peers.findIndex((p) => p.id === student!.id);
      rank = idx >= 0 ? idx + 1 : totalStudents;
    }

    // Exam-level rollups (midterm exam, final exam) across the term's subjects.
    const examRollup = (key: 'midterm' | 'final', maxKey: 'midtermMax' | 'finalMax') => {
      const graded = withTrend.filter((s) => s[maxKey] > 0);
      if (!graded.length) return 0;
      const pct =
        graded.reduce((acc, s) => acc + (s[key] / s[maxKey]) * 100, 0) / graded.length;
      return Math.round(pct);
    };
    const exams = [
      { id: 'midterm', exam: 'اختبار منتصف الفصل', subjects: subjects.length, average: examRollup('midterm', 'midtermMax') },
      { id: 'final', exam: 'اختبار نهاية الفصل', subjects: subjects.length, average: examRollup('final', 'finalMax') },
    ];

    // Cumulative standing from the GPA engine (config-aware) — authoritative CGPA + earned hours.
    const standing = await computeStanding(student.id);

    return NextResponse.json({
      student: {
        id: student.id,
        studentCode: student.studentCode,
        name: student.nameAr,
        level: student.level,
      },
      stats: {
        gpa: standing.cgpa,
        earnedHours: standing.earnedHours,
        gpaHours: standing.gpaHours,
        rank,
        totalStudents,
        totalGrade,
        maxGrade,
        percentage: maxGrade > 0 ? (totalGrade / maxGrade) * 100 : 0,
      },
      subjects: withTrend,
      exams,
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    return NextResponse.json({ error: 'فشل في جلب الدرجات' }, { status: 500 });
  }
}
