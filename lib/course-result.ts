import prisma from '@/lib/prisma';
import { getRegulations } from '@/lib/regulations';
import { recomputeStudentGpa } from '@/lib/gpa';

/**
 * Course-result state machine (ClientR2).
 *
 * The bylaw separates the *normal* control path (scores → total → letter → PASS/FAIL)
 * from the *exceptional* path: when an exceptional event happens the system starts from
 * the STATE, not the scores. Each state carries policy properties on its GradeStatus row
 * — GPA / Earn-Credit (isPass) / Count-Attempt / Need-Action / Next-Action — and the
 * engine reads those flags instead of hardcoding behaviour per screen
 * ("السيستم يقرأ خصائص الحالة ويقرر"). This module is the single write path for the
 * exceptional states and the reason/attempt/pending bookkeeping that hangs off them.
 */

// Follow-up actions a pending state can require.
export const ACTION_TYPES = ['MAKEUP_EXAM', 'COMPLETE_ASSESSMENT', 'REPEAT', 'NONE'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

// Two-step (soft) approval lifecycle for an exceptional state.
export const APPROVAL_STATES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

// Default reason auto-attached for system-derived states so the reason reports have data
// even when the operator doesn't pick one explicitly. Configurable reasons can still override.
const DEFAULT_REASON_BY_CODE: Record<string, string> = {
  BL: 'WrittenFail', // راسب لائحة (سقوط التحريري)
  DN: 'AttendanceShortage', // محروم بسبب الغياب
  DS: 'DisciplinaryAction', // حرمان/رسوب تأديبي
  NE: 'AttendanceShortage', // غائب بدون عذر
  FW: 'WithdrawalRequest', // منسحب إجباري
  W: 'WithdrawalRequest', // منسحب
  AB: 'MedicalExcuse', // غائب بعذر (الأكثر شيوعًا — قابل للتعديل)
  E: 'MedicalExcuse', // غائب بعذر (كود قديم مرادف لـ AB)
  INC: 'MedicalExcuse', // غير مكتمل بعذر
  I: 'MedicalExcuse', // غير مكتمل (كود قديم مرادف لـ INC)
};

export type StatusEffects = {
  code: string;
  name: string;
  points: number | null;
  affectsGpa: boolean;
  earnsCredits: boolean; // isPass
  countsAttempt: boolean;
  needsAction: boolean;
  nextAction: string | null;
  isException: boolean;
  isFinal: boolean;
  isLetter: boolean;
};

/** Resolve a result-state code to its configured policy effects (the "rules table" lookup). */
export async function statusEffects(code: string): Promise<StatusEffects | null> {
  const st = await prisma.gradeStatus.findFirst({ where: { code } });
  if (!st) return null;
  return toEffects(st);
}

function toEffects(st: {
  code: string; name: string; points: number | null; affectsGpa: boolean; isPass: boolean;
  countsAttempt: boolean; needsAction: boolean; nextAction: string | null; isException: boolean;
  isFinal: boolean; isLetter: boolean;
}): StatusEffects {
  return {
    code: st.code,
    name: st.name,
    points: st.points,
    affectsGpa: st.affectsGpa,
    earnsCredits: st.isPass,
    countsAttempt: st.countsAttempt,
    needsAction: st.needsAction,
    nextAction: st.nextAction,
    isException: st.isException,
    isFinal: st.isFinal,
    isLetter: st.isLetter,
  };
}

export type AttemptInfo = {
  attempts: number; // enrollments whose outcome counts as an attempt at the course
  fails: number; // graded, non-pass, GPA-affecting outcomes (F/NE/BL/DN/DS) — repeated-failure metric
  passed: boolean; // passed on any attempt
  thisAttemptNo: number; // 1-based attempt ordinal for the given enrollment (if provided)
};

const SEM_RANK: Record<string, number> = { first: 1, second: 2, summer: 3 };
function termKey(academicYear: string, semester: string): number {
  const y = parseInt(academicYear.split('-')[0], 10) || 0;
  return y * 10 + (SEM_RANK[semester] ?? 9);
}

/**
 * Attempt/fail bookkeeping for a (student, course). `attempts` counts outcomes whose status
 * has countsAttempt=true (PASS/FAIL/DN/FW…), NOT withdrawals/excused-absence/incomplete.
 * `fails` mirrors lib/registration.ts repeated-failure semantics so the dismissal rule and
 * the registration block agree. When `forEnrollmentId` is given, returns that row's 1-based
 * attempt ordinal among the counted attempts (chronological by term).
 */
export async function attemptInfo(
  studentId: string,
  courseId: string,
  forEnrollmentId?: string,
): Promise<AttemptInfo> {
  const [rows, statuses] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId, courseId },
      select: { id: true, academicYear: true, semester: true, gradeStatusCode: true },
    }),
    prisma.gradeStatus.findMany(),
  ]);
  const byCode = new Map(statuses.map((s) => [s.code, s]));
  const ordered = [...rows].sort((a, b) => termKey(a.academicYear, a.semester) - termKey(b.academicYear, b.semester));

  let attempts = 0;
  let fails = 0;
  let passed = false;
  let thisAttemptNo = 0;
  for (const e of ordered) {
    const st = e.gradeStatusCode ? byCode.get(e.gradeStatusCode) : undefined;
    const counts = st?.countsAttempt ?? false;
    if (counts) attempts += 1;
    if (st?.isPass) passed = true;
    if (st && !st.isPass && st.affectsGpa && st.points != null) fails += 1;
    if (e.id === forEnrollmentId) thisAttemptNo = counts ? attempts : Math.max(attempts, 1);
  }
  return { attempts, fails, passed, thisAttemptNo };
}

type ExceptionInput = {
  code: string; // exceptional status code: AB | ABS | INC | W | FW | DN | DEFER | E | I | NE …
  reasonCode?: string | null; // CourseResultReason.code — defaults from DEFAULT_REASON_BY_CODE
  actionType?: ActionType | null; // overrides the status' nextAction default
  actionDueDate?: Date | null; // bylaw deadline for the follow-up
  setByUserId?: string | null; // executor (control)
};

export type ExceptionResult = {
  id: string;
  studentId: string;
  code: string;
  statusName: string;
  reasonCode: string | null;
  resultPending: boolean;
  actionType: string | null;
  approvalState: ApprovalState | null;
  attemptNo: number;
  cgpa: number;
};

/**
 * Apply an exceptional result state to an enrollment (executor = control).
 * Soft two-step approval: the state is recorded as PENDING approval. When the state
 * needs a follow-up action (AB/INC/DEFER → makeup/complete) the result is held
 * (resultPending=true) and excluded from the settled GPA/credit calc until resolved.
 * Points/letterGrade/credit effects are taken from the GradeStatus row, so the config
 * table stays authoritative; the student's CGPA is recomputed in the same call.
 */
export async function setExceptionStatus(enrollmentId: string, input: ExceptionInput): Promise<ExceptionResult> {
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) throw new Error('enrollment-not-found');
  if (e.resultLocked) throw new Error('النتيجة معتمدة ومغلقة — يجب إعادة الفتح قبل التعديل');

  const eff = await statusEffects(input.code);
  if (!eff) throw new Error(`unknown-grade-status:${input.code}`);
  if (!eff.isException) throw new Error('هذه الحالة ليست حالة استثنائية — استخدم مسار رصد الدرجات');

  const reasonCode = input.reasonCode ?? DEFAULT_REASON_BY_CODE[input.code] ?? null;
  const actionType = (input.actionType ?? (eff.nextAction as ActionType | null)) || null;
  const pending = eff.needsAction; // AB/INC/DEFER hold until the follow-up is recorded

  const { thisAttemptNo } = await attemptInfo(e.studentId, e.courseId, e.id);

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      gradeStatusCode: eff.code,
      letterGrade: eff.code,
      points: eff.points, // null for non-GPA exceptional states
      reasonCode,
      attemptNo: Math.max(thisAttemptNo, 1),
      resultPending: pending,
      actionType: actionType && actionType !== 'NONE' ? actionType : null,
      actionDueDate: input.actionDueDate ?? null,
      actionResolvedAt: null,
      statusSetBy: input.setByUserId ?? null,
      statusApprovalState: 'PENDING',
      statusApprovedBy: null,
      statusApprovedAt: null,
      // a held result is not COMPLETED; a final exceptional state (W/FW/DN) is.
      status: pending ? 'PENDING' : 'COMPLETED',
    },
  });

  const cgpa = await recomputeStudentGpa(updated.studentId);
  return {
    id: updated.id,
    studentId: updated.studentId,
    code: eff.code,
    statusName: eff.name,
    reasonCode,
    resultPending: pending,
    actionType: updated.actionType,
    approvalState: 'PENDING',
    attemptNo: updated.attemptNo,
    cgpa,
  };
}

/** Approver (control head / student affairs) confirms or rejects a pending exceptional state. */
export async function approveExceptionStatus(
  enrollmentId: string,
  opts: { approve: boolean; approverUserId?: string | null },
): Promise<{ id: string; approvalState: ApprovalState }> {
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) throw new Error('enrollment-not-found');
  if (!e.statusApprovalState) throw new Error('لا توجد حالة استثنائية بانتظار الاعتماد');

  const approvalState: ApprovalState = opts.approve ? 'APPROVED' : 'REJECTED';
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      statusApprovalState: approvalState,
      statusApprovedBy: opts.approverUserId ?? null,
      statusApprovedAt: new Date(),
    },
  });
  return { id: enrollmentId, approvalState };
}

/**
 * Resolve a held (pending) exceptional result once the follow-up is done — the makeup
 * exam is graded or the missing assessment is completed. Recomputes the course from the
 * recorded scores (INC → PASS/FAIL) or applies an explicit final code, clears the pending
 * flag, stamps the resolution, and recomputes the CGPA.
 */
export async function resolveAction(
  enrollmentId: string,
  opts: {
    code?: string; // explicit final code; omit to derive from components
    components?: { midterm?: number; final?: number; practical?: number; homework?: number };
    resolvedByUserId?: string | null;
  },
): Promise<{ id: string; gradeStatusCode: string | null; resultPending: boolean; cgpa: number }> {
  // lib/gpa.setEnrollmentResult is the shared scoring path; import lazily to avoid a cycle.
  const { setEnrollmentResult } = await import('@/lib/gpa');
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) throw new Error('enrollment-not-found');
  if (e.resultLocked) throw new Error('النتيجة معتمدة ومغلقة — يجب إعادة الفتح قبل التعديل');

  const result = await setEnrollmentResult(enrollmentId, {
    code: opts.code,
    components: opts.components,
  });

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      resultPending: false,
      actionResolvedAt: new Date(),
      statusSetBy: opts.resolvedByUserId ?? e.statusSetBy,
    },
  });

  return {
    id: enrollmentId,
    gradeStatusCode: result.gradeStatusCode,
    resultPending: updated.resultPending,
    cgpa: result.cgpa,
  };
}

/** Makeup/INC deadline helper: end of the configured week of the following term. */
export async function defaultActionDueDate(termStart?: Date | null): Promise<Date | null> {
  const reg = await getRegulations();
  const weeks = (reg as { makeupDeadlineWeeks?: number }).makeupDeadlineWeeks ?? 2;
  if (!termStart) return null;
  const d = new Date(termStart);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}
