import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveStudent } from '@/lib/student';
import { computeStanding } from '@/lib/gpa';
import { resolveStudentSystem } from '@/lib/academic-system';
import { bandsFromRegulations, computeAnnualForStudents } from '@/lib/annual';
import { getRegulations } from '@/lib/regulations';
import { getAcademicYears } from '@/lib/academic-years';
import { academicSystemWhere } from '@/lib/reporting/filters';
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

    // Exam-level rollups (midterm exam, final exam) — common to both systems.
    const examRollup = (key: 'midterm' | 'final', maxKey: 'midtermMax' | 'finalMax') => {
      const graded = withTrend.filter((s) => s[maxKey] > 0);
      if (!graded.length) return 0;
      const pct = graded.reduce((acc, s) => acc + (s[key] / s[maxKey]) * 100, 0) / graded.length;
      return Math.round(pct);
    };
    const exams = [
      { id: 'midterm', exam: 'اختبار منتصف الفصل', subjects: subjects.length, average: examRollup('midterm', 'midtermMax') },
      { id: 'final', exam: 'اختبار نهاية الفصل', subjects: subjects.length, average: examRollup('final', 'finalMax') },
    ];

    // Dual-system: cumulative stats + rank by the student's OWN program system. Annual students
    // have NO CGPA — they get النسبة/التقدير + the year result (منقول/دور ثانٍ/باقٍ), ranked among
    // their فرقة by percentage; credit students keep CGPA/earned-hours ranked by CGPA.
    const system = await resolveStudentSystem(student.id);
    const baseStats = { totalGrade, maxGrade, percentage: maxGrade > 0 ? (totalGrade / maxGrade) * 100 : 0 };
    let stats: Record<string, unknown>;
    // The تقدير scale this student is actually graded on, shipped as data because the page is
    // "use client" and may not import a server module. It replaces the page's own invented bands
    // (90/80/70/60 + «ضعيف»), which showed the student a تقدير his transcript never says: under
    // جدول 3 a 55% is C- «مقبول», not a failure. Highest band first.
    let ladder: { code: string; name: string; minPercent: number; isPass: boolean }[] = [];

    if (system === 'ANNUAL') {
      const { current } = await getAcademicYears();
      const peers = student.departmentId
        ? await prisma.student.findMany({ where: { departmentId: student.departmentId, level: student.level, status: 'ACTIVE', program: { academicSystem: 'ANNUAL' } }, select: { id: true } })
        : [{ id: student.id }];
      const results = await computeAnnualForStudents(peers.map((p) => p.id), current ? { academicYear: current } : {});
      const ranked = peers.map((p) => ({ id: p.id, pct: results.get(p.id)?.overallPct ?? -1 })).sort((a, b) => b.pct - a.pct);
      const ar = results.get(student.id) ?? null;
      // Annual students carry no letterGrade (lib/gpa.ts stores raw marks for them): their تقدير is
      // a percentage BAND from the bylaw's own thresholds, exactly as lib/annual.ts grades them.
      // «راسب» is by construction the only failing band (gradeFromBands returns it below the
      // configured pass percent), so pass/fail is read off the label — no threshold repeated here.
      ladder = bandsFromRegulations(await getRegulations()).map((b) => ({
        code: b.label,
        name: b.label,
        minPercent: b.min,
        isPass: b.label !== 'راسب',
      }));
      stats = {
        ...baseStats,
        result: ar?.result ?? 'قيد الرصد', overallPct: ar?.overallPct ?? null, overallGrade: ar?.overallGrade ?? null,
        rank: Math.max(ranked.findIndex((r) => r.id === student!.id) + 1, 1), totalStudents: ranked.length,
      };
    } else {
      // Credit-hour letters — the GradeStatus rows edited on «حالات وقواعد النتائج», the ONE ladder.
      ladder = statuses
        .filter((st) => st.isLetter && st.minPercent != null)
        .sort((a, b) => (b.minPercent as number) - (a.minPercent as number))
        .map((st) => ({ code: st.code, name: st.name, minPercent: st.minPercent as number, isPass: st.isPass }));
      const standing = await computeStanding(student.id);
      let rank = 1, totalStudents = 1;
      if (student.departmentId) {
        const peers = await prisma.student.findMany({ where: { departmentId: student.departmentId, status: 'ACTIVE', ...academicSystemWhere('CREDIT_HOURS') }, select: { id: true, gpa: true }, orderBy: { gpa: 'desc' } });
        totalStudents = peers.length;
        const idx = peers.findIndex((p) => p.id === student!.id);
        rank = idx >= 0 ? idx + 1 : totalStudents;
      }
      stats = { ...baseStats, gpa: standing.cgpa, earnedHours: standing.earnedHours, gpaHours: standing.gpaHours, rank, totalStudents };
    }

    return NextResponse.json({
      system,
      student: { id: student.id, studentCode: student.studentCode, name: student.nameAr, level: student.level },
      stats,
      ladder,
      subjects: withTrend,
      exams,
    });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    return NextResponse.json({ error: 'فشل في جلب الدرجات' }, { status: 500 });
  }
}
