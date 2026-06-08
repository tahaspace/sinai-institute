import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveInstructor } from '@/lib/student';
import { computeAcademicStanding } from '@/lib/standing';

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

      return NextResponse.json({
        student: { studentCode: student.studentCode, name: student.nameAr, level: student.level, status: student.status },
        standing,
        transcript: [...terms.values()],
        currentRequest: req && {
          status: req.status,
          note: req.note,
          items: req.items.map((i) => ({ code: i.section.offering.course.code, name: i.section.offering.course.nameAr, creditHours: i.section.offering.course.creditHours, sectionCode: i.section.code })),
        },
      });
    }

    // list view
    const advisees = await prisma.student.findMany({ where: { advisorId: advisor.id }, orderBy: { studentCode: 'asc' } });
    const reqs = await prisma.registrationRequest.findMany({
      where: { studentId: { in: advisees.map((s) => s.id) }, academicYear: DEFAULT_TERM.academicYear, semester: DEFAULT_TERM.semester },
    });
    const reqByStudent = new Map(reqs.map((r) => [r.studentId, r]));

    const rows = [];
    for (const s of advisees) {
      const standing = await computeAcademicStanding(s.id);
      const req = reqByStudent.get(s.id);
      rows.push({
        studentCode: s.studentCode,
        name: s.nameAr,
        level: s.level,
        cgpa: standing?.cgpa ?? 0,
        onProbation: standing?.onProbation ?? false,
        escalation: standing?.escalation ?? 'none',
        flags: standing?.flags ?? [],
        requestStatus: req?.status ?? 'None',
      });
    }

    return NextResponse.json({
      advisor: { name: advisor.name },
      term: DEFAULT_TERM,
      rows,
      stats: {
        total: rows.length,
        pending: rows.filter((r) => r.requestStatus === 'Pending').length,
        approved: rows.filter((r) => r.requestStatus === 'Approved').length,
        warnings: rows.filter((r) => r.escalation !== 'none').length,
      },
    });
  } catch (error) {
    console.error('Error loading advisees:', error);
    return NextResponse.json({ error: 'فشل في جلب الطلاب' }, { status: 500 });
  }
}
