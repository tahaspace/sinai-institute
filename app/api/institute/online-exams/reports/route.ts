import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission, requireFeature } from '@/lib/authz';
import { normalizeSystem, normalizeSystemFilter, studentSystemWhere } from '@/lib/academic-system';
import { getRegulations } from '@/lib/regulations';
import { bandsFromRegulations, gradeFromBands } from '@/lib/annual';

// GET /api/institute/online-exams/reports?courseId=&system= — exam analytics from Enrollment grades.

// The letter ladder (جدول 3) has exactly ONE home: the GradeStatus rows the institute types in on
// «حالات وقواعد النتائج». This route used to carry its own 8-band copy, which reported 71% as C+
// where the bylaw says B-. It now reads the rows once per request and bands in-process — calling
// lib/gpa's letterForPercent per student would issue one query per row.
type LadderRow = { code: string; name: string; minPercent: number | null; isPass: boolean };

const bandOf = (ladder: LadderRow[], pct: number): LadderRow | null =>
  ladder.find((g) => g.minPercent != null && pct >= g.minPercent) ?? null;

// The credit-hour pass line is not a constant either: it is the lowest band this institute marked
// ناجح (this bylaw: D at 50%). Null when no passing band is configured — then the pass rate is
// unknown, and saying "0%" would be a fabricated number.
const passFloorOf = (ladder: LadderRow[]): number | null => {
  const mins = ladder.filter((g) => g.isPass && g.minPercent != null).map((g) => g.minPercent as number);
  return mins.length ? Math.min(...mins) : null;
};

export async function GET(request: NextRequest) {
  try {
    const feat = await requireFeature('exams.online');
    if (!feat.ok) return NextResponse.json({ error: feat.error }, { status: feat.status });

    const guard = await requirePermission('onlineexam.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    let courseId = searchParams.get('courseId');
    // «النظام الأكاديمي» narrowing. It has to run server-side because the stats and both charts are
    // computed here — otherwise they would keep claiming numbers for students no longer in the table.
    // Absent/'all' → undefined → studentSystemWhere is {}, so the unfiltered query is untouched.
    // The course dropdown itself is never narrowed: a course can serve both systems.
    const system = normalizeSystemFilter(searchParams.get('system'));
    const [courses, ladder] = await Promise.all([
      prisma.course.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true } }),
      // Highest band first — bandOf() walks it in order and takes the first band the mark reaches.
      prisma.gradeStatus.findMany({
        where: { isLetter: true, minPercent: { not: null } },
        orderBy: { minPercent: 'desc' },
        select: { code: true, name: true, minPercent: true, isPass: true },
      }),
    ]);
    if (!courseId) courseId = courses[0]?.id ?? null;
    // The ladder rides along even here: the page derives its تقدير colours from it, and a page that
    // renders before a course is picked must not fall back to a colour table of its own.
    if (!courseId) return NextResponse.json({ courses, ladder, course: null, studentResults: [], gradeDistribution: [], scoreDistribution: [], stats: {} });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, final: { not: null }, ...studentSystemWhere(system) },
      include: { student: { select: { nameAr: true, studentCode: true, program: { select: { academicSystem: true } } } } },
    });
    const max = course ? course.midtermMax + course.finalMax + course.practicalMax + course.homeworkMax : 100;

    // Dual-system تقدير: annual students never carry an Enrollment.letterGrade (lib/gpa.ts stores raw
    // marks for them), so the A–F fallback below would put them on the credit-hour letter scale, which
    // is not their bylaw's scale. Their تقدير is a percentage BAND (lib/annual.ts), read from the
    // bylaw's own thresholds — same as app/api/institute/exams/grades. Regulations are only read when
    // an annual student is actually present, so the credit-hours-only path issues no extra query.
    const anyAnnual = enrollments.some((e) => normalizeSystem(e.student.program?.academicSystem) === 'ANNUAL');
    const bands = anyAnnual ? bandsFromRegulations(await getRegulations()) : null;

    const studentResults = enrollments.map((e) => {
      const score = (e.midterm ?? 0) + (e.final ?? 0) + (e.practical ?? 0) + (e.homework ?? 0);
      const pct = max > 0 ? Math.round((score / max) * 100) : 0;
      // `system` is resolved from the student's programme, per the house pattern. The score/percentage
      // below are this exam's own marks — not CGPA-derived — so they stay real for annual students too.
      const sys = normalizeSystem(e.student.program?.academicSystem);
      return {
        name: e.student.nameAr,
        studentCode: e.student.studentCode,
        score,
        max,
        percentage: pct,
        // Band the SAME rounded percentage the table shows, so label and number never disagree.
        grade: sys === 'ANNUAL' && bands ? gradeFromBands(pct, bands) : (e.letterGrade ?? bandOf(ladder, pct)?.code ?? '-'),
        system: sys,
      };
    });

    // Grade distribution (count per تقدير — a credit-hour letter or an annual band)
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
    // The pass line is per student, from that student's own system: the credit-hour floor is the
    // lowest ناجح band on the ladder (50% under this bylaw), not the annual bylaw's threshold, so
    // applying one to the other's cohort mislabels passes as failures.
    const reg = anyAnnual ? await getRegulations() : null;
    const annualPassPct = reg?.annualPassPercent ?? null;
    const creditPassPct = passFloorOf(ladder);
    const passLineOf = (r: { system: string }) => (r.system === 'ANNUAL' ? annualPassPct : creditPassPct);
    // A student whose system has no configured pass line cannot be judged; counting him as a
    // failure would invent a number, so he is left out of both sides of the ratio.
    const judged = studentResults.filter((r) => passLineOf(r) != null);
    const passed = judged.filter((r) => r.percentage >= (passLineOf(r) as number)).length;
    const stats = {
      participants: studentResults.length,
      average: pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0,
      passRate: judged.length ? Math.round((passed / judged.length) * 100) : null,
      highest: pcts.length ? Math.max(...pcts) : 0,
      lowest: pcts.length ? Math.min(...pcts) : 0,
    };

    return NextResponse.json({
      courses,
      // «use client» pages may not import a server module, so the ladder travels as data: the page
      // reads the تقدير name and derives every badge colour from these rows.
      ladder,
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
