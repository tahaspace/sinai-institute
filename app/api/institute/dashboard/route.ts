import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeSystem } from '@/lib/academic-system';
import { requirePermission } from '@/lib/authz';

// The academic term the dashboard aggregates over. Enrollment rows in the test
// DB are tagged academicYear="2024-2025" / semester="first"; that pair is the
// source of truth for term-scoped queries (enrollments, offerings). The display
// label/week shown in the header come from Setting (institute.currentTerm /
// institute.studyWeek), which are pure config, not derivable from any model.
const TERM_YEAR = '2024-2025';
const TERM_SEMESTER = 'first';

// Setting.value is JSON-encoded for some keys ("...\"" strings) and bare for
// others (e.g. "12"). Parse defensively so we never crash on a raw value.
function readSetting(value: string | undefined): string | null {
  if (value == null) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' || typeof parsed === 'number' ? String(parsed) : value;
  } catch {
    return value;
  }
}

const warningTypeLabel = (t: string) =>
  ({ FIRST: 'إنذار أول', SECOND: 'إنذار ثاني', ACADEMIC: 'إنذار أكاديمي', BEHAVIORAL: 'إنذار سلوكي' } as Record<string, string>)[t] ?? t;

const examTypeLabel = (t: string) =>
  ({ midterm: 'امتحان منتصف الفصل', final: 'الامتحان النهائي', quiz: 'اختبار قصير' } as Record<string, string>)[t] ?? t;

// GET /api/institute/dashboard — institute-wide overview built entirely from
// existing models (Student/Instructor/Department/Course/CourseOffering/
// Enrollment/ExamSession/StudentWarning/FeeAccount/Payment/GradeStatus/Setting).
export async function GET() {
  try {
    const guard = await requirePermission('institute.dashboard.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const now = new Date();

    const [
      totalStudents,
      totalInstructors,
      activeDepartments,
      totalCourses,
      departments,
      examSessions,
      warnings,
      currentTermSetting,
      studyWeekSetting,
      termEnrollments,
      openOfferings,
      gradeStatuses,
      feeAccounts,
    ] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.instructor.count(),
      prisma.department.count({ where: { isActive: true } }),
      prisma.course.count(),
      prisma.department.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: { _count: { select: { students: true, instructors: true } } },
      }),
      prisma.examSession.findMany({
        where: { date: { gte: now } },
        orderBy: { date: 'asc' },
        take: 5,
        include: { course: true },
      }),
      prisma.studentWarning.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { issuedAt: 'desc' },
        take: 3,
        include: { student: { include: { department: true, program: true } } },
      }),
      prisma.setting.findFirst({ where: { key: 'institute.currentTerm' } }),
      prisma.setting.findFirst({ where: { key: 'institute.studyWeek' } }),
      prisma.enrollment.findMany({
        where: { academicYear: TERM_YEAR, semester: TERM_SEMESTER },
        select: { studentId: true, gradeStatusCode: true },
      }),
      prisma.courseOffering.count({ where: { academicYear: TERM_YEAR, status: 'open' } }),
      prisma.gradeStatus.findMany({ select: { code: true, isPass: true } }),
      prisma.feeAccount.findMany({ include: { payments: true } }),
    ]);

    // --- KPI cards (no trend/change badge: no time-series snapshot model exists) ---
    const stats = {
      students: totalStudents,
      instructors: totalInstructors,
      departments: activeDepartments,
      courses: totalCourses,
    };

    // --- Departments breakdown (color is presentational, applied in the page by index) ---
    const departmentRows = departments.map((d) => ({
      id: d.id,
      name: d.nameAr,
      students: d._count.students,
      faculty: d._count.instructors,
    }));

    // --- Upcoming events: ExamSession is the only date-bearing academic model.
    // Other calendar types (registration/meeting/workshop) have no backing model. ---
    const upcomingEvents = examSessions.map((e) => ({
      id: e.id,
      title: `${examTypeLabel(e.examType)} - ${e.course.nameAr}`,
      date: e.date.toISOString().slice(0, 10),
      type: 'exam' as const,
    }));

    // --- Academic alerts: same source as /api/institute/students/warnings ---
    const academicAlerts = warnings.map((w) => ({
      id: w.id,
      student: w.student.nameAr,
      type: warningTypeLabel(w.type),
      // Annual students hold no CGPA (lib/gpa.ts stores raw marks only), so their Student.gpa is a
      // structural 0 — falling back to it would re-materialise the very number the warnings screen
      // deliberately renders as "—". Null is "not applicable"; the page prints "—" for it.
      gpa: normalizeSystem(w.student.program?.academicSystem) === 'ANNUAL' ? null : w.gpa ?? w.student.gpa,
      department: w.student.department?.nameAr ?? '',
    }));

    // --- Term quick-stats ---
    const enrolledStudents = new Set(termEnrollments.map((e) => e.studentId)).size;
    // "مقرر مطروح": open offerings this term; fall back to whole catalog if none seeded.
    const offeredCourses = openOfferings > 0 ? openOfferings : totalCourses;

    const passCodes = new Set(gradeStatuses.filter((g) => g.isPass).map((g) => g.code));
    const graded = termEnrollments.filter((e) => e.gradeStatusCode != null);
    const passed = graded.filter((e) => e.gradeStatusCode != null && passCodes.has(e.gradeStatusCode));
    const passRate = graded.length > 0 ? Math.round((passed.length / graded.length) * 100) : 0;

    // "نسبة التحصيل": collected paid payments / total dues — identical to /api/institute/finance.
    const totalDues = feeAccounts.reduce((s, a) => s + a.totalFees, 0);
    const collected = feeAccounts.reduce(
      (s, a) => s + a.payments.filter((p) => p.status === 'paid').reduce((x, p) => x + p.amount, 0),
      0
    );
    const collectionRate = totalDues > 0 ? Math.round((collected / totalDues) * 100) : 0;

    const termStats = {
      enrolledStudents,
      offeredCourses,
      passRate,
      collectionRate,
    };

    const term = {
      label: readSetting(currentTermSetting?.value) ?? 'الفصل الدراسي الحالي',
      studyWeek: readSetting(studyWeekSetting?.value),
    };

    return NextResponse.json({
      stats,
      departments: departmentRows,
      upcomingEvents,
      academicAlerts,
      termStats,
      term,
    });
  } catch (error) {
    console.error('Error building institute dashboard:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات لوحة المتابعة' }, { status: 500 });
  }
}
