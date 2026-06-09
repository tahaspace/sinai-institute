import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';

// Academic GPA engine — the single source of truth for standing. It honors the
// configurable GradeStatus table (affectsGpa / isPass / points) and the per-course
// `countsInGpa` flag, exactly as the client's bylaw requires.

type CourseMaxes = { midtermMax: number; finalMax: number; practicalMax: number; homeworkMax: number };
type GradeComponents = { midterm: number; final: number; practical: number; homework: number };

export type Standing = {
  cgpa: number;
  gpaHours: number; // credit hours that counted toward CGPA
  earnedHours: number; // credit hours actually passed (isPass statuses)
  termGpas: { term: string; academicYear: string; semester: string; gpa: number; hours: number }[];
};

// Map a numeric total percentage to a letter-grade code using the GradeStatus
// letter rows (their minPercent bounds). Returns 'F' if below all bounds.
export async function letterForPercent(pct: number): Promise<string> {
  const letters = await prisma.gradeStatus.findMany({
    where: { isLetter: true, minPercent: { not: null } },
    orderBy: { minPercent: 'desc' },
  });
  for (const g of letters) {
    if (g.minPercent != null && pct >= g.minPercent) return g.code;
  }
  return 'F';
}

// Compute a student's standing from their enrollments + result states.
export async function computeStanding(studentId: string): Promise<Standing> {
  const [enrollments, statuses] = await Promise.all([
    prisma.enrollment.findMany({ where: { studentId }, include: { course: true } }),
    prisma.gradeStatus.findMany(),
  ]);
  const byCode = new Map(statuses.map((s) => [s.code, s]));

  let qualityPoints = 0;
  let gpaHours = 0;
  let earnedHours = 0;
  const termAgg = new Map<string, { qp: number; h: number; ay: string; sem: string }>();

  for (const e of enrollments) {
    const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : null;
    if (!st) continue;
    const ch = e.course.creditHours;
    if (st.isPass) earnedHours += ch;
    // included in CGPA only if the status affects GPA AND the course counts toward GPA
    if (st.affectsGpa && e.course.countsInGpa && st.points != null) {
      const qp = st.points * ch;
      qualityPoints += qp;
      gpaHours += ch;
      const k = `${e.academicYear}|${e.semester}`;
      const t = termAgg.get(k) ?? { qp: 0, h: 0, ay: e.academicYear, sem: e.semester };
      t.qp += qp;
      t.h += ch;
      termAgg.set(k, t);
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    cgpa: gpaHours > 0 ? round2(qualityPoints / gpaHours) : 0,
    gpaHours,
    earnedHours,
    termGpas: [...termAgg.entries()].map(([term, v]) => ({
      term,
      academicYear: v.ay,
      semester: v.sem,
      gpa: v.h > 0 ? round2(v.qp / v.h) : 0,
      hours: v.h,
    })),
  };
}

// Recompute and persist Student.gpa (cached cumulative) for one student.
export async function recomputeStudentGpa(studentId: string): Promise<number> {
  const standing = await computeStanding(studentId);
  await prisma.student.update({ where: { id: studentId }, data: { gpa: standing.cgpa } });
  return standing.cgpa;
}

// Decide the result-state code from recorded scores, applying the bylaw's
// "board fail" rule: a written/final exam below the written-min % fails the course
// (BL) even when the aggregate total would otherwise pass. Below 60% total it is a
// plain F, so the BL branch only fires when the total would have passed.
export async function deriveGradeCode(
  course: CourseMaxes,
  c: GradeComponents,
  reg?: Awaited<ReturnType<typeof getRegulations>>,
): Promise<{ code: string; totalPct: number; finalPct: number | null }> {
  const r = reg ?? (await getRegulations());
  const max = course.midtermMax + course.finalMax + course.practicalMax + course.homeworkMax;
  const total = c.midterm + c.final + c.practical + c.homework;
  const totalPct = max > 0 ? (total / max) * 100 : 0;
  const finalPct = course.finalMax > 0 ? (c.final / course.finalMax) * 100 : null;
  if (finalPct != null && finalPct < r.writtenMinPercent && totalPct >= 60) {
    return { code: 'BL', totalPct, finalPct };
  }
  return { code: await letterForPercent(totalPct), totalPct, finalPct };
}

// The single write path for grade entry, shared by the faculty and institute
// (control) endpoints. An explicit `code` (control-head verbal grade: I/E/W/NE/
// DN/FW/DS/BL/TR) overrides the derived letter; otherwise the letter is derived
// from the recorded components (with the board-fail rule). letterGrade/points are
// taken from the GradeStatus row so the config table stays authoritative, and the
// student's CGPA is recomputed in the same call.
export async function setEnrollmentResult(
  enrollmentId: string,
  opts: { code?: string; components?: Partial<GradeComponents> },
): Promise<{
  id: string;
  studentId: string;
  gradeStatusCode: string;
  letterGrade: string;
  points: number | null;
  statusName: string;
  cgpa: number;
}> {
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { course: true } });
  if (!e) throw new Error('enrollment-not-found');
  // Once a course result is approved & locked (اعتماد وغلق) the bylaw forbids any
  // further mutation of the grade — callers must reopen (unlock) first.
  if (e.resultLocked) throw new Error('النتيجة معتمدة ومغلقة');

  const c: GradeComponents = {
    midterm: opts.components?.midterm ?? e.midterm ?? 0,
    final: opts.components?.final ?? e.final ?? 0,
    practical: opts.components?.practical ?? e.practical ?? 0,
    homework: opts.components?.homework ?? e.homework ?? 0,
  };

  const code = opts.code ?? (await deriveGradeCode(e.course, c)).code;
  const st = await prisma.gradeStatus.findFirst({ where: { code } });
  if (!st) throw new Error(`unknown-grade-status:${code}`);

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      midterm: c.midterm,
      final: c.final,
      practical: c.practical,
      homework: c.homework,
      gradeStatusCode: code,
      letterGrade: code, // displayed token: A / B+ / W / I / BL …
      points: st.points, // null for non-GPA statuses (W/E/I/FW/TR/P/NP)
      status: 'COMPLETED',
    },
  });

  const cgpa = await recomputeStudentGpa(updated.studentId);
  return {
    id: updated.id,
    studentId: updated.studentId,
    gradeStatusCode: code,
    letterGrade: code,
    points: st.points,
    statusName: st.name,
    cgpa,
  };
}
