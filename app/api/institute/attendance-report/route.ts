import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { courseAttendance } from '@/lib/attendance';
import { setEnrollmentResult } from '@/lib/gpa';

const DEFAULT_TERM = { academicYear: '2024-2025', semester: 'first' };

// GET /api/institute/attendance-report?courseId=&academicYear=&semester=&lowOnly=true
// Per-course attendance roster with the 3-stage warning + ban flags. `lowOnly=true`
// returns only students at/below the warn threshold (the bylaw's حصر / filtered roster).
export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('attendance.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const { searchParams } = new URL(request.url);
    let courseId = searchParams.get('courseId');
    const academicYear = searchParams.get('academicYear') || DEFAULT_TERM.academicYear;
    const semester = searchParams.get('semester') || DEFAULT_TERM.semester;
    const lowOnly = searchParams.get('lowOnly') === 'true';

    const courses = await prisma.course.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true } });
    if (!courseId) courseId = courses[0]?.id ?? null;
    if (!courseId) return NextResponse.json({ courses: [], report: null });

    const report = await courseAttendance(courseId, academicYear, semester, { lowOnly });
    return NextResponse.json({ courses, selectedCourseId: courseId, term: { academicYear, semester }, report });
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
    return NextResponse.json({ ok: true, gradeStatusCode: result.gradeStatusCode, statusName: result.statusName, cgpa: result.cgpa });
  } catch (error) {
    console.error('Error applying deprivation:', error);
    return NextResponse.json({ error: 'فشل في تطبيق الحرمان' }, { status: 500 });
  }
}
