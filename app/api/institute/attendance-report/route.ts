import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { courseAttendance } from '@/lib/attendance';
import { setEnrollmentResult } from '@/lib/gpa';
import { normalizeSystemFilter } from '@/lib/academic-system';

const DEFAULT_TERM = { academicYear: '2024-2025', semester: 'first' };

// GET /api/institute/attendance-report?courseId=&academicYear=&semester=&lowOnly=true&system=
// Per-course attendance roster with the 3-stage warning + ban flags. `lowOnly=true`
// returns only students at/below the warn threshold (the bylaw's حصر / filtered roster).
// `system` narrows the roster to one academic system; omitted/'all' means everything.
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('attendance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    let courseId = searchParams.get('courseId');
    const academicYear = searchParams.get('academicYear') || DEFAULT_TERM.academicYear;
    const semester = searchParams.get('semester') || DEFAULT_TERM.semester;
    const lowOnly = searchParams.get('lowOnly') === 'true';
    // Narrowing must happen in the roster query, not in the browser: the summary cards sit ABOVE the
    // table, so a client-side pass would leave them claiming whole-course totals next to a narrowed
    // list. Absent/'all' → undefined → the engine's {} fragment → the roster is exactly as before.
    const academicSystem = normalizeSystemFilter(searchParams.get('system'));

    // The course dropdown is deliberately NOT narrowed — a course has no student dimension of its
    // own, and dropping courses would hide the very rosters the registrar is checking.
    const courses = await prisma.course.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true } });
    if (!courseId) courseId = courses[0]?.id ?? null;
    // Echo the applied system on THIS exit too — otherwise the page falls back to "no attendance
    // data", asserting absence while a filter is active.
    if (!courseId) return NextResponse.json({ courses: [], report: null, academicSystem: academicSystem ?? null });

    const report = await courseAttendance(courseId, academicYear, semester, { lowOnly, academicSystem });
    // Echo what was actually applied so the empty state can say "no matches" instead of "no data".
    return NextResponse.json({ courses, selectedCourseId: courseId, term: { academicYear, semester }, academicSystem: academicSystem ?? null, report });
  } catch (error) {
    console.error('Error building attendance report:', error);
    return NextResponse.json({ error: 'فشل في إنشاء تقرير الحضور' }, { status: 500 });
  }
}

// PATCH /api/institute/attendance-report — apply deprivation (حرمان → DN) to an
// enrollment whose absence exceeded the threshold. DN counts as a fail (0) toward GPA,
// and the student's CGPA is recomputed via the shared write path.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('attendance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { enrollmentId } = body ?? {};
    if (!enrollmentId) return NextResponse.json({ error: 'معرف التسجيل مطلوب' }, { status: 400 });

    const result = await setEnrollmentResult(enrollmentId, { code: 'DN' });
    // No `cgpa` on the wire: for an ANNUAL student setEnrollmentResult returns a placeholder 0
    // (annual programs have no CGPA), and no caller reads it — the client only checks res.ok.
    return NextResponse.json({ ok: true, gradeStatusCode: result.gradeStatusCode, statusName: result.statusName });
  } catch (error) {
    console.error('Error applying deprivation:', error);
    return NextResponse.json({ error: 'فشل في تطبيق الحرمان' }, { status: 500 });
  }
}
