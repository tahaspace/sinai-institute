import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { courseAttendance } from '@/lib/attendance';
import { setEnrollmentResult } from '@/lib/gpa';
import { getRegulations } from '@/lib/regulations';
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

// The desk already knows WHY: this button is pressed because the student passed the bylaw's absence
// percentage, never because he asked to withdraw. Without saying so, a configured FW would inherit
// gpa.ts's default reason «طلب انسحاب» and the bylaw's own requirement — «بس في تقرير لازم افرق ان
// طالب راسب نتيجة تجاوز نسبة الغياب» — would count these rows as voluntary withdrawals.
const ABSENCE_REASON_CODE = 'AttendanceShortage';

// PATCH /api/institute/attendance-report — apply the deprivation (حرمان / انسحاب إجباري) to an
// enrollment whose absence passed the bylaw threshold. WHICH result status is written comes from the
// bylaw (Regulations.absenceBanStatusCode), never from a literal: جدول 3 attaches two opposite
// outcomes to the same trigger — FW «منسحب اجباري … ولا يدخل في معدل التراكمي» (the bylaw's own
// wording for «زادت نسبه الغياب عن 25%», hence the default) and DN «محروم … تتساوي مع راسب وتضاف الي
// معدل تراكمي». The choice decides whether a zero enters the student's CGPA, so it must be the
// institute's, and hardcoding DN here made the bylaw screen describe a policy the engine ignored.
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requirePermission('attendance.edit');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json();
    const { enrollmentId } = body ?? {};
    if (!enrollmentId) return NextResponse.json({ error: 'معرف التسجيل مطلوب' }, { status: 400 });

    const reg = await getRegulations();
    const code = String(reg.absenceBanStatusCode || '').trim();
    // The settings route only accepts a code that exists, but a bylaw blob can also be written
    // directly; say which code is wrong instead of failing as a generic 500 from the write path
    // (and, for an ANNUAL student, instead of silently stamping a dangling code on the enrolment).
    const status = code ? await prisma.gradeStatus.findFirst({ where: { code }, select: { code: true } }) : null;
    if (!status) {
      return NextResponse.json(
        { error: `حالة النتيجة المحددة في اللائحة للحرمان (${code || 'غير محددة'}) غير موجودة في جدول حالات النتائج` },
        { status: 400 },
      );
    }
    // Only send the reason when the institute's catalogue actually has it — the reason list is
    // configurable too, and an unknown code must not be forced onto the enrolment.
    const reason = await prisma.courseResultReason.findFirst({ where: { code: ABSENCE_REASON_CODE, isActive: true }, select: { code: true } });

    const result = await setEnrollmentResult(enrollmentId, { code: status.code, ...(reason ? { reasonCode: reason.code } : {}) });
    // No `cgpa` on the wire: for an ANNUAL student setEnrollmentResult returns a placeholder 0
    // (annual programs have no CGPA), and no caller reads it — the client only checks res.ok.
    return NextResponse.json({ ok: true, gradeStatusCode: result.gradeStatusCode, statusName: result.statusName });
  } catch (error) {
    console.error('Error applying deprivation:', error);
    return NextResponse.json({ error: 'فشل في تطبيق الحرمان' }, { status: 500 });
  }
}
