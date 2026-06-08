import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';

// Per-course attendance report + the bylaw's 3-stage escalation:
// warnings as absence rises toward the ban threshold, then deprivation (حرمان → DN)
// once absence exceeds `absenceBanPercent`, which fails the course.

export type AttendanceRow = {
  enrollmentId: string;
  studentCode: string;
  name: string;
  sessions: number;
  attended: number; // present + late
  absent: number;
  attendancePct: number;
  absencePct: number;
  warningStage: 0 | 1 | 2 | 3; // 0 = fine, 3 = final warning before ban
  banned: boolean; // absence beyond the threshold → eligible for حرمان (DN)
  gradeStatusCode: string | null;
};

export async function courseAttendance(courseId: string, academicYear: string, semester: string) {
  const reg = await getRegulations();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, academicYear, semester },
    include: { student: true },
    orderBy: { student: { studentCode: 'asc' } },
  });
  const attendance = await prisma.attendance.findMany({ where: { courseId, academicYear, semester } });

  // group attendance by student
  const byStudent = new Map<string, { sessions: number; attended: number; absent: number }>();
  for (const a of attendance) {
    const g = byStudent.get(a.studentId) ?? { sessions: 0, attended: 0, absent: 0 };
    g.sessions += 1;
    if (a.status === 'absent') g.absent += 1;
    else g.attended += 1; // present | late both count as attended
    byStudent.set(a.studentId, g);
  }

  // three escalating warning points at 40/60/80% of the ban threshold
  const warnPoints = [0.4, 0.6, 0.8].map((k) => reg.absenceBanPercent * k);

  const rows: AttendanceRow[] = enrollments.map((e) => {
    const g = byStudent.get(e.studentId) ?? { sessions: 0, attended: 0, absent: 0 };
    const absencePct = g.sessions ? (g.absent / g.sessions) * 100 : 0;
    const attendancePct = g.sessions ? (g.attended / g.sessions) * 100 : 100;
    const stage = (warnPoints.filter((p) => absencePct >= p).length) as 0 | 1 | 2 | 3;
    return {
      enrollmentId: e.id,
      studentCode: e.student.studentCode,
      name: e.student.nameAr,
      sessions: g.sessions,
      attended: g.attended,
      absent: g.absent,
      attendancePct: Math.round(attendancePct),
      absencePct: Math.round(absencePct),
      warningStage: stage,
      banned: absencePct > reg.absenceBanPercent,
      gradeStatusCode: e.gradeStatusCode,
    };
  });

  return {
    course: { code: course.code, name: course.nameAr },
    thresholds: { warnAt: reg.attendanceWarnThreshold, banAbsenceAbove: reg.absenceBanPercent },
    rows,
    summary: {
      total: rows.length,
      warned: rows.filter((r) => r.warningStage > 0 && !r.banned).length,
      banned: rows.filter((r) => r.banned).length,
    },
  };
}
