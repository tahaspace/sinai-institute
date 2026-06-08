import prisma from '@/lib/prisma';
import { computeStandingForStudents } from '@/lib/standing';

// Registrar reports engine. All reports are aggregations over Enrollment + the
// configurable GradeStatus table, so pass/fail/withdrawn classification stays
// consistent with the GPA and standing engines.

export type StatusClass = 'pass' | 'fail' | 'withdrawn' | 'incomplete' | 'ungraded';

type GS = { code: string; isPass: boolean; affectsGpa: boolean; points: number | null };

export function classify(st: GS | undefined | null): StatusClass {
  if (!st) return 'ungraded';
  if (st.isPass) return 'pass';
  if (st.code === 'W' || st.code === 'FW') return 'withdrawn';
  if (st.code === 'I' || st.code === 'E') return 'incomplete';
  // graded, non-pass, counts as 0 toward GPA → fail (F/NE/BL/DN/DS)
  if (st.affectsGpa && st.points != null) return 'fail';
  return 'ungraded';
}

type TermFilter = { academicYear?: string; semester?: string };

function termWhere(f: TermFilter) {
  const w: Record<string, string> = {};
  if (f.academicYear) w.academicYear = f.academicYear;
  if (f.semester) w.semester = f.semester;
  return w;
}

// Per-course outcome counts + pass rate (covers: pass-rate, #failing, #withdrawn).
export async function courseResults(f: TermFilter) {
  const [courses, statuses] = await Promise.all([
    prisma.course.findMany({
      include: { enrollments: { where: termWhere(f) }, department: { select: { nameAr: true } } },
      orderBy: { code: 'asc' },
    }),
    prisma.gradeStatus.findMany(),
  ]);
  const byCode = new Map(statuses.map((s) => [s.code, s]));

  const rows = courses
    .map((c) => {
      let pass = 0, fail = 0, withdrawn = 0, incomplete = 0, ungraded = 0;
      for (const e of c.enrollments) {
        const cls = classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null);
        if (cls === 'pass') pass++;
        else if (cls === 'fail') fail++;
        else if (cls === 'withdrawn') withdrawn++;
        else if (cls === 'incomplete') incomplete++;
        else ungraded++;
      }
      const graded = pass + fail;
      return {
        code: c.code,
        name: c.nameAr,
        department: c.department?.nameAr ?? '',
        enrolled: c.enrollments.length,
        graded,
        pass,
        fail,
        withdrawn,
        incomplete,
        ungraded,
        passRate: graded ? Math.round((pass / graded) * 100) : 0,
      };
    })
    .filter((r) => r.enrolled > 0);

  const totGraded = rows.reduce((s, r) => s + r.graded, 0);
  const totPass = rows.reduce((s, r) => s + r.pass, 0);
  return {
    rows,
    totals: {
      courses: rows.length,
      enrolled: rows.reduce((s, r) => s + r.enrolled, 0),
      pass: totPass,
      fail: rows.reduce((s, r) => s + r.fail, 0),
      withdrawn: rows.reduce((s, r) => s + r.withdrawn, 0),
      passRate: totGraded ? Math.round((totPass / totGraded) * 100) : 0,
    },
  };
}

// Grade recording sheet (كشف رصد) for one course: roster with components + status.
export async function gradeSheet(courseId: string, f: TermFilter) {
  const [course, enrollments, statuses] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.enrollment.findMany({ where: { courseId, ...termWhere(f) }, include: { student: true }, orderBy: { student: { studentCode: 'asc' } } }),
    prisma.gradeStatus.findMany(),
  ]);
  if (!course) return null;
  const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));
  const byCode = new Map(statuses.map((s) => [s.code, s]));
  const max = course.midtermMax + course.finalMax + course.practicalMax + course.homeworkMax;

  return {
    course: { code: course.code, name: course.nameAr, max, midtermMax: course.midtermMax, finalMax: course.finalMax, practicalMax: course.practicalMax, homeworkMax: course.homeworkMax },
    rows: enrollments.map((e) => {
      const total = (e.midterm ?? 0) + (e.final ?? 0) + (e.practical ?? 0) + (e.homework ?? 0);
      return {
        studentCode: e.student.studentCode,
        name: e.student.nameAr,
        midterm: e.midterm,
        final: e.final,
        practical: e.practical,
        homework: e.homework,
        total,
        statusCode: e.gradeStatusCode,
        statusName: e.gradeStatusCode ? nameByCode.get(e.gradeStatusCode) ?? null : null,
        outcome: classify(e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null),
      };
    }),
  };
}

// Warned students + expected graduates, derived from the standing engine.
export async function standingReport(kind: 'warned' | 'expected-graduates') {
  const students = await prisma.student.findMany({
    where: { status: { notIn: ['GRADUATED', 'WITHDRAWN', 'DISMISSED'] } },
    select: { id: true, studentCode: true, nameAr: true, level: true, department: { select: { nameAr: true } } },
    orderBy: { studentCode: 'asc' },
  });
  const standings = await computeStandingForStudents(students.map((s) => s.id));
  const rows = students
    .map((s) => ({ s, st: standings.get(s.id)! }))
    .filter(({ st }) => (kind === 'warned' ? st.escalation !== 'none' : st.graduationEligible))
    .map(({ s, st }) => ({
      studentCode: s.studentCode,
      name: s.nameAr,
      department: s.department?.nameAr ?? '',
      level: st.currentLevel,
      cgpa: st.cgpa,
      earnedHours: st.earnedHours,
      escalation: st.escalation,
      remainingHours: st.remainingHours,
      flags: st.flags,
    }));
  return { rows, count: rows.length };
}

// Ministry exam-prep candidate sheet: students enrolled in a course who are at/near
// graduation (final-level or graduation-eligible) — the registrar's exam-board roster.
export async function ministryPrep(courseId: string, f: TermFilter) {
  const [course, enrollments] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.enrollment.findMany({ where: { courseId, ...termWhere(f) }, include: { student: { select: { id: true, studentCode: true, nameAr: true, level: true } } } }),
  ]);
  if (!course) return null;
  const standings = await computeStandingForStudents(enrollments.map((e) => e.student.id));
  const rows = enrollments
    .map((e) => ({ e, st: standings.get(e.student.id)! }))
    .filter(({ st }) => st.graduationEligible || st.qualifiedLevel >= 4)
    .map(({ e, st }) => ({
      studentCode: e.student.studentCode,
      name: e.student.nameAr,
      level: st.currentLevel,
      cgpa: st.cgpa,
      earnedHours: st.earnedHours,
      graduationEligible: st.graduationEligible,
    }));
  return { course: { code: course.code, name: course.nameAr }, rows, count: rows.length };
}
