import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authz';
import { writeAudit } from '@/lib/audit';
import { setExceptionStatus, approveExceptionStatus, resolveAction, ACTION_TYPES } from '@/lib/course-result';

// Exceptional-case control desk (ClientR2).
//   GET  → exception status options + reasons, the pending-approval queue, open follow-up
//          actions, and (with ?courseId=) the course roster with each row's exception state.
//   PATCH→ action ∈ set | approve | reject | resolve, gated by the workflow permissions
//          (set/resolve = control; approve/reject = control head / student affairs).

async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requirePermission('exam.exception.view');
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const courseId = new URL(request.url).searchParams.get('courseId') || undefined;

    const [statuses, letterStatuses, reasons, courses, pendingApproval, openActions] = await Promise.all([
      prisma.gradeStatus.findMany({ where: { isException: true }, orderBy: { order: 'asc' } }),
      prisma.gradeStatus.findMany({ where: { isLetter: true }, orderBy: { order: 'asc' }, select: { code: true, name: true } }),
      prisma.courseResultReason.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
      prisma.course.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true } }),
      prisma.enrollment.findMany({
        where: { statusApprovalState: 'PENDING' },
        include: { student: { select: { studentCode: true, nameAr: true } }, course: { select: { code: true, nameAr: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
      prisma.enrollment.findMany({
        where: { resultPending: true },
        include: { student: { select: { studentCode: true, nameAr: true } }, course: { select: { code: true, nameAr: true } } },
        orderBy: [{ actionDueDate: 'asc' }],
        take: 200,
      }),
    ]);

    const roster = courseId
      ? (await prisma.enrollment.findMany({
          where: { courseId },
          include: { student: { select: { studentCode: true, nameAr: true } } },
          orderBy: { student: { studentCode: 'asc' } },
        })).map((e) => ({
          enrollmentId: e.id,
          studentCode: e.student.studentCode,
          name: e.student.nameAr,
          gradeStatusCode: e.gradeStatusCode,
          reasonCode: e.reasonCode,
          attemptNo: e.attemptNo,
          resultPending: e.resultPending,
          actionType: e.actionType,
          actionDueDate: e.actionDueDate,
          approvalState: e.statusApprovalState,
          resultLocked: e.resultLocked,
          academicYear: e.academicYear,
          semester: e.semester,
        }))
      : [];

    const mapQueue = (rows: typeof pendingApproval) =>
      rows.map((e) => ({
        enrollmentId: e.id,
        studentCode: e.student.studentCode,
        name: e.student.nameAr,
        course: e.course.nameAr,
        courseCode: e.course.code,
        gradeStatusCode: e.gradeStatusCode,
        reasonCode: e.reasonCode,
        actionType: e.actionType,
        actionDueDate: e.actionDueDate,
        approvalState: e.statusApprovalState,
      }));

    return NextResponse.json({
      exceptionStatuses: statuses.map((s) => ({
        code: s.code, name: s.name, needsAction: s.needsAction, nextAction: s.nextAction,
        affectsGpa: s.affectsGpa, isPass: s.isPass, countsAttempt: s.countsAttempt, isFinal: s.isFinal,
      })),
      letterStatuses,
      reasons: reasons.map((r) => ({ code: r.code, nameAr: r.nameAr, category: r.category, appliesTo: r.appliesTo })),
      actionTypes: ACTION_TYPES,
      courses,
      pendingApproval: mapQueue(pendingApproval),
      openActions: mapQueue(openActions),
      roster,
      stats: { pendingApproval: pendingApproval.length, openActions: openActions.length },
    });
  } catch (error) {
    console.error('Error loading exceptions desk:', error);
    return NextResponse.json({ error: 'فشل في جلب الحالات الاستثنائية' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action as 'set' | 'approve' | 'reject' | 'resolve' | undefined;
    const enrollmentId = body?.enrollmentId as string | undefined;
    if (!enrollmentId) return NextResponse.json({ error: 'معرف التسجيل مطلوب' }, { status: 400 });

    // set / resolve are control actions; approve / reject are approver actions.
    const permKey = action === 'approve' || action === 'reject' ? 'exam.exception.approve' : 'exam.exception.set';
    const guard = await requirePermission(permKey);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const userId = await currentUserId();

    if (action === 'set') {
      const { code, reasonCode, actionType, actionDueDate } = body;
      if (!code) return NextResponse.json({ error: 'كود الحالة مطلوب' }, { status: 400 });
      try {
        const res = await setExceptionStatus(enrollmentId, {
          code,
          reasonCode: reasonCode ?? undefined,
          actionType: actionType ?? undefined,
          actionDueDate: actionDueDate ? new Date(actionDueDate) : null,
          setByUserId: userId,
        });
        await writeAudit('exam.exception.set', { targetType: 'Enrollment', targetId: enrollmentId, metadata: { code, reasonCode: res.reasonCode }, universityId: guard.ctx.universityId });
        return NextResponse.json({ ok: true, result: res });
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 422 });
      }
    }

    if (action === 'approve' || action === 'reject') {
      try {
        const res = await approveExceptionStatus(enrollmentId, { approve: action === 'approve', approverUserId: userId });
        await writeAudit(`exam.exception.${action}`, { targetType: 'Enrollment', targetId: enrollmentId, universityId: guard.ctx.universityId });
        return NextResponse.json({ ok: true, result: res });
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 422 });
      }
    }

    if (action === 'resolve') {
      const { code, midterm, final, practical, homework } = body;
      try {
        const res = await resolveAction(enrollmentId, {
          code: code ?? undefined,
          components: code ? undefined : { midterm, final, practical, homework },
          resolvedByUserId: userId,
        });
        await writeAudit('exam.exception.resolve', { targetType: 'Enrollment', targetId: enrollmentId, metadata: { code: res.gradeStatusCode }, universityId: guard.ctx.universityId });
        return NextResponse.json({ ok: true, result: res });
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 422 });
      }
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Error in exceptions action:', error);
    return NextResponse.json({ error: 'فشل تنفيذ الإجراء' }, { status: 500 });
  }
}
