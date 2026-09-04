import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';
import { studentSystemWhere, type AcademicSystem } from '@/lib/academic-system';

// Per-course attendance report + the bylaw's escalation ladder. The bylaw names its points
// explicitly — «اذا غاب بدون عذر مقبول هو 15% من مجموع ساعات مقررة يوجه له الانذار الاول ، الانذار
// الثاني عند نسبه 20% ، اما اذا وصل 25% غياب بدون عذر فيعتبر منسحب اجباري» — so all three come from
// the bylaw settings (absenceWarn1Percent / absenceWarn2Percent / absenceBanPercent). They used to
// be DERIVED as 40/60/80% of the ban, which put the «إنذار أول» at 10% absence, a point the bylaw
// gives no warning at, and left an institute with a different ladder unable to enter it.

export type AttendanceRow = {
  enrollmentId: string;
  studentCode: string;
  name: string;
  sessions: number;
  attended: number; // present + late
  absent: number;
  attendancePct: number;
  absencePct: number;
  // The bylaw point this row reached, by IDENTITY: 0 = منتظم, 1 = الإنذار الأول, 2 = الإنذار الثاني,
  // 3 = نسبة الحرمان. A stage keeps its meaning whatever the institute configures — see `ladder` below.
  warningStage: 0 | 1 | 2 | 3;
  warningAtPercent: number | null; // the configured absence % that stage actually is (null at stage 0)
  warningLabel: string | null; // ready-to-render Arabic label for that stage (null at stage 0)
  banned: boolean; // absence past the bylaw threshold → eligible for الحرمان / الانسحاب الإجباري
  gradeStatusCode: string | null;
  banApplied: boolean; // the deprivation status was ALREADY recorded on this enrolment
};

export async function courseAttendance(
  courseId: string,
  academicYear: string,
  semester: string,
  opts: { lowOnly?: boolean; academicSystem?: AcademicSystem } = {},
) {
  const reg = await getRegulations();
  const [course, banStatus] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId } }),
    prisma.gradeStatus.findFirst({ where: { code: reg.absenceBanStatusCode }, select: { name: true } }),
  ]);
  if (!course) return null;

  // Optional academic-system narrowing: `undefined` yields `{}` so every existing caller keeps the
  // whole roster. The same fragment goes on the attendance query only so out-of-system rows are never
  // loaded — it cannot change a tally: byStudent is keyed by studentId and read only for enrollments
  // that already passed the same predicate.
  const systemWhere = studentSystemWhere(opts.academicSystem);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, academicYear, semester, ...systemWhere },
    include: { student: true },
    orderBy: { student: { studentCode: 'asc' } },
  });
  const attendance = await prisma.attendance.findMany({ where: { courseId, academicYear, semester, ...systemWhere } });

  // group attendance by student
  const byStudent = new Map<string, { sessions: number; attended: number; absent: number }>();
  for (const a of attendance) {
    const g = byStudent.get(a.studentId) ?? { sessions: 0, attended: 0, absent: 0 };
    g.sessions += 1;
    if (a.status === 'absent') g.absent += 1;
    else g.attended += 1; // present | late both count as attended
    byStudent.set(a.studentId, g);
  }

  // The bylaw's own three points, as configured — each keeping its own IDENTITY. The stage used to be
  // a COUNT of points passed, which made its meaning move with the configuration: an institute that
  // disables the first warning (types 0) turned 20% absence into «إنذار أول» and the ban point into
  // «إنذار ثانٍ», silently changing what every `warningStage >= 2` consumer measures. With identities,
  // a disabled point is skipped and never renumbers the ones above it. A point set to 0 means «this
  // institute has no such stage».
  const ladder = [
    { stage: 1 as const, percent: Number(reg.absenceWarn1Percent), label: 'إنذار أول' },
    { stage: 2 as const, percent: Number(reg.absenceWarn2Percent), label: 'إنذار ثانٍ' },
    { stage: 3 as const, percent: Number(reg.absenceBanPercent), label: 'بلوغ نسبة الحرمان' },
  ].filter((p) => Number.isFinite(p.percent) && p.percent > 0);
  // «وصل 25%» (prose) vs «زادت عن 25%» (جدول 3, FW row) — the bylaw says both, so the institute picks.
  const isBanned = (absencePct: number) =>
    reg.absenceBanInclusive ? absencePct >= reg.absenceBanPercent : absencePct > reg.absenceBanPercent;

  const allRows: AttendanceRow[] = enrollments.map((e) => {
    const g = byStudent.get(e.studentId) ?? { sessions: 0, attended: 0, absent: 0 };
    const absencePct = g.sessions ? (g.absent / g.sessions) * 100 : 0;
    const attendancePct = g.sessions ? (g.attended / g.sessions) * 100 : 100;
    // Highest point reached, by stage identity (not by percentage), so a bylaw typed out of order
    // still reports the most serious stage the student is in rather than the biggest number.
    const reached = ladder.filter((p) => absencePct >= p.percent);
    const top = reached.length ? reached.reduce((a, b) => (b.stage >= a.stage ? b : a)) : null;
    return {
      enrollmentId: e.id,
      studentCode: e.student.studentCode,
      name: e.student.nameAr,
      sessions: g.sessions,
      attended: g.attended,
      absent: g.absent,
      attendancePct: Math.round(attendancePct),
      absencePct: Math.round(absencePct),
      warningStage: top?.stage ?? 0,
      warningAtPercent: top?.percent ?? null,
      warningLabel: top?.label ?? null,
      banned: isBanned(absencePct),
      gradeStatusCode: e.gradeStatusCode,
      // Whether the desk already recorded the deprivation is a question about the CONFIGURED status,
      // never about a literal: an institute on FW must not keep seeing «تطبيق الحرمان» offered.
      banApplied: !!e.gradeStatusCode && e.gradeStatusCode === reg.absenceBanStatusCode,
    };
  });

  // Low-attendance = at/below the configurable warn threshold. This is the bylaw's
  // حصر (filtered roster) the registrar acts on; rounded attendance is compared so
  // the UI highlight and this filter use the same value.
  const isLow = (r: AttendanceRow) => r.attendancePct <= reg.attendanceWarnThreshold;
  // Summary covers every row this call loaded, so the cards stay stable when `lowOnly` narrows the
  // table below. It does move with `opts.academicSystem`, which narrows the roster itself, not the view.
  const summary = {
    total: allRows.length,
    warned: allRows.filter((r) => r.warningStage > 0 && !r.banned).length,
    banned: allRows.filter((r) => r.banned).length,
    low: allRows.filter(isLow).length,
  };

  const rows = opts.lowOnly ? allRows.filter(isLow) : allRows;

  return {
    course: { code: course.code, name: course.nameAr },
    thresholds: {
      warnAt: reg.attendanceWarnThreshold,
      banAbsenceAbove: reg.absenceBanPercent,
      // The two named warning points, so the screen can state the bylaw's own numbers instead of
      // implying them, and the status the deprivation must be recorded under (FW vs DN — جدول 3
      // attaches both to the same trigger, so the institute's choice travels with the report).
      warn1AbsenceAt: reg.absenceWarn1Percent,
      warn2AbsenceAt: reg.absenceWarn2Percent,
      banInclusive: reg.absenceBanInclusive,
      banStatusCode: reg.absenceBanStatusCode,
      // …and its Arabic name, so a screen can badge the applied deprivation with the institute's own
      // wording («منسحب اجباري» vs «محروم») instead of assuming one of them.
      banStatusName: banStatus?.name ?? reg.absenceBanStatusCode,
    },
    lowOnly: !!opts.lowOnly,
    rows,
    summary,
  };
}
