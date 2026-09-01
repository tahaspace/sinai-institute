import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';
import { computeAcademicStanding } from '@/lib/standing';
import { getProgramSystem } from '@/lib/academic-system';
import { computeAnnualForStudents } from '@/lib/annual';
import { getAcademicYears } from '@/lib/academic-years';

const DEFAULT_TERM = { academicYear: '2024-2025', semester: 'second' };

// GET /api/faculty/advisees
//   (no param) → the advisor's advisees + standing summary + current-term request status
//   ?studentCode= → full Student Academic Profile (standing + transcript + current request)
export async function GET(request: NextRequest) {
  try {
    const advisor = await resolveInstructor();
    if (!advisor) return NextResponse.json({ error: 'عضو هيئة التدريس غير موجود' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const studentCode = searchParams.get('studentCode');

    if (studentCode) {
      const student = await prisma.student.findFirst({ where: { studentCode, advisorId: advisor.id } });
      if (!student) return NextResponse.json({ error: 'الطالب غير موجود ضمن طلابك' }, { status: 404 });

      const [standing, enrollments, statuses, req] = await Promise.all([
        computeAcademicStanding(student.id),
        prisma.enrollment.findMany({ where: { studentId: student.id }, include: { course: true }, orderBy: [{ academicYear: 'asc' }, { semester: 'asc' }, { course: { code: 'asc' } }] }),
        prisma.gradeStatus.findMany(),
        prisma.registrationRequest.findUnique({
          where: { studentId_academicYear_semester: { studentId: student.id, academicYear: DEFAULT_TERM.academicYear, semester: DEFAULT_TERM.semester } },
          include: { items: { include: { section: { include: { offering: { include: { course: true } } } } } } },
        }),
      ]);
      const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));

      // transcript grouped by term
      const terms = new Map<string, { academicYear: string; semester: string; courses: { code: string; name: string; creditHours: number; status: string | null; statusName: string | null; points: number | null }[] }>();
      for (const e of enrollments) {
        const key = `${e.academicYear}|${e.semester}`;
        const t = terms.get(key) ?? { academicYear: e.academicYear, semester: e.semester, courses: [] };
        t.courses.push({
          code: e.course.code,
          name: e.course.nameAr,
          creditHours: e.course.creditHours,
          status: e.gradeStatusCode,
          statusName: e.gradeStatusCode ? nameByCode.get(e.gradeStatusCode) ?? null : null,
          points: e.points,
        });
        terms.set(key, t);
      }

      // Dual-system: annual advisees show their year result + النسبة/التقدير (the page hides the
      // credit CGPA/hours/registration for them); credit advisees keep the standing + transcript.
      const system = await getProgramSystem(student.programId);
      const yrs = await getAcademicYears();
      const ar = system === 'ANNUAL'
        ? (await computeAnnualForStudents([student.id], yrs.current ? { academicYear: yrs.current } : {})).get(student.id) ?? null
        : null;

      return NextResponse.json({
        system,
        student: { studentCode: student.studentCode, name: student.nameAr, level: student.level, status: student.status },
        standing: system === 'ANNUAL' ? null : standing,
        annual: ar ? { result: ar.result, overallPct: ar.overallPct, overallGrade: ar.overallGrade, yearGroup: ar.yearGroup } : null,
        transcript: [...terms.values()],
        currentRequest: req && {
          status: req.status,
          note: req.note,
          items: req.items.map((i) => ({ code: i.section.offering.course.code, name: i.section.offering.course.nameAr, creditHours: i.section.offering.course.creditHours, sectionCode: i.section.code })),
        },
      });
    }

    // list view — each advisee summarized by their OWN program system (credit → CGPA/probation;
    // annual → النسبة/التقدير + year result). Annual advisees are no longer scored by the credit engine.
    const advisees = await prisma.student.findMany({
      where: { advisorId: advisor.id },
      select: { id: true, studentCode: true, nameAr: true, level: true, program: { select: { academicSystem: true } } },
      orderBy: { studentCode: 'asc' },
    });
    const [reqs, years] = await Promise.all([
      prisma.registrationRequest.findMany({ where: { studentId: { in: advisees.map((s) => s.id) }, academicYear: DEFAULT_TERM.academicYear, semester: DEFAULT_TERM.semester } }),
      getAcademicYears(),
    ]);
    const reqByStudent = new Map(reqs.map((r) => [r.studentId, r]));
    const annualIds = advisees.filter((s) => s.program?.academicSystem === 'ANNUAL').map((s) => s.id);
    const annualResults = await computeAnnualForStudents(annualIds, years.current ? { academicYear: years.current } : {});

    const rows = [];
    for (const s of advisees) {
      const req = reqByStudent.get(s.id);
      if (s.program?.academicSystem === 'ANNUAL') {
        const ar = annualResults.get(s.id);
        rows.push({
          studentCode: s.studentCode, name: s.nameAr, level: s.level, system: 'ANNUAL',
          result: ar?.result ?? 'قيد الرصد', pct: ar?.overallPct ?? null, grade: ar?.overallGrade ?? null,
          atRisk: ar?.result === 'باقٍ للإعادة' || ar?.result === 'له دور ثانٍ',
          requestStatus: req?.status ?? 'None',
        });
      } else {
        const standing = await computeAcademicStanding(s.id);
        rows.push({
          studentCode: s.studentCode, name: s.nameAr, level: s.level, system: 'CREDIT_HOURS',
          cgpa: standing?.cgpa ?? 0, onProbation: standing?.onProbation ?? false,
          escalation: standing?.escalation ?? 'none', flags: standing?.flags ?? [],
          atRisk: (standing?.escalation ?? 'none') !== 'none',
          requestStatus: req?.status ?? 'None',
        });
      }
    }

    return NextResponse.json({
      advisor: { name: advisor.name },
      term: DEFAULT_TERM,
      rows,
      stats: {
        total: rows.length,
        pending: rows.filter((r) => r.requestStatus === 'Pending').length,
        approved: rows.filter((r) => r.requestStatus === 'Approved').length,
        warnings: rows.filter((r) => r.atRisk).length,
      },
    });
  } catch (error) {
    console.error('Error loading advisees:', error);
    return NextResponse.json({ error: 'فشل في جلب الطلاب' }, { status: 500 });
  }
}
