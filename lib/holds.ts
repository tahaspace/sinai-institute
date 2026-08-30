/**
 * ClientR5 — Student Holds & Blocks engine (نظام حجب الطلاب).
 *
 * Core rule (stated across the spec): a hold NEVER deletes/edits a result, never
 * touches the GPA or the student's academic status. It only controls VISIBILITY
 * and access via a set of SCOPE flags. The result stays in the database exactly
 * as the control (كنترول) approved it — the student simply can't see it.
 *
 * A hold has:
 *  - a TYPE (نوع الحجب) — the fixed list shown to the student + grouped in reports,
 *  - a REASON (سبب الحجب) — a configurable HoldReason (drives "holds by reason"),
 *  - a SCOPE — which actions it blocks (result view / registration / …). Login,
 *    schedule and messages are NEVER blocked, by design.
 * Per-type messages + default scopes live in Setting["institute.holdSettings"]
 * (same config-as-data pattern as lib/regulations.ts / lib/ministry-sheet.ts).
 */
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';

// نوع الحجب — shown to the student and grouped in reports.
export const HOLD_TYPES = [
  'FINANCIAL', 'DOCUMENT', 'DISCIPLINARY', 'ACADEMIC',
  'ADMINISTRATIVE', 'GRADUATION', 'LIBRARY', 'CUSTOM',
] as const;
export type HoldType = (typeof HOLD_TYPES)[number];

// دورة حياة الحجب.
export const HOLD_STATUSES = ['PENDING', 'ACTIVE', 'RELEASED', 'CANCELLED', 'EXPIRED'] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

// النطاق — what a hold blocks. Never includes login / schedule / messages.
export const HOLD_SCOPES = [
  'blockResult', 'blockRegistration', 'blockEnrollmentLetter',
  'blockTranscript', 'blockCertificate', 'blockGraduation',
] as const;
export type HoldScope = (typeof HOLD_SCOPES)[number];

export const SCOPE_LABELS: Record<HoldScope, string> = {
  blockResult: 'حجب ظهور النتيجة',
  blockRegistration: 'منع تسجيل المقررات',
  blockEnrollmentLetter: 'منع استخراج إفادة',
  blockTranscript: 'منع استخراج بيان درجات',
  blockCertificate: 'منع استخراج شهادة',
  blockGraduation: 'منع التقديم للتخرج',
};

type TypeDefault = { nameAr: string; nameEn: string; messageAr: string; messageEn: string; scopes: HoldScope[] };

// Built-in per-type defaults (label, student message, default scope set).
export const HOLD_TYPE_DEFAULTS: Record<HoldType, TypeDefault> = {
  FINANCIAL: {
    nameAr: 'حجب مالي', nameEn: 'Financial Hold',
    messageAr: 'النتيجة غير متاحة حاليًا لوجود قيد مالي على حسابك. يرجى مراجعة شؤون الطلاب / الحسابات لسداد المستحقات.',
    messageEn: 'Result is currently unavailable due to an active financial hold. Please contact Student Affairs / Accounts.',
    scopes: ['blockResult', 'blockRegistration'],
  },
  DOCUMENT: {
    nameAr: 'حجب مستندات', nameEn: 'Document Hold',
    messageAr: 'النتيجة غير متاحة حاليًا لنقص في مستنداتك. يرجى مراجعة شؤون الطلاب لاستكمال الأوراق المطلوبة.',
    messageEn: 'Result is currently unavailable due to missing documents. Please contact Student Affairs.',
    scopes: ['blockResult'],
  },
  DISCIPLINARY: {
    nameAr: 'حجب تأديبي', nameEn: 'Disciplinary Hold',
    messageAr: 'النتيجة غير متاحة حاليًا نتيجة قرار تأديبي. يرجى مراجعة شؤون الطلاب.',
    messageEn: 'Result is currently unavailable due to a disciplinary decision. Please contact Student Affairs.',
    scopes: ['blockResult'],
  },
  ACADEMIC: {
    nameAr: 'حجب أكاديمي', nameEn: 'Academic Hold',
    messageAr: 'النتيجة غير متاحة حاليًا لوجود قيد أكاديمي على حسابك. يرجى مراجعة الإرشاد الأكاديمي / شؤون الطلاب.',
    messageEn: 'Result is currently unavailable due to an academic hold. Please contact Academic Advising / Student Affairs.',
    scopes: ['blockResult'],
  },
  ADMINISTRATIVE: {
    nameAr: 'حجب إداري', nameEn: 'Administrative Hold',
    messageAr: 'النتيجة غير متاحة حاليًا لوجود قيد إداري على حسابك. يرجى مراجعة شؤون الطلاب.',
    messageEn: 'Result is currently unavailable due to an administrative hold. Please contact Student Affairs.',
    scopes: ['blockResult'],
  },
  GRADUATION: {
    nameAr: 'حجب متطلبات تخرج', nameEn: 'Graduation Hold',
    messageAr: 'يوجد قيد على متطلبات التخرج. يرجى مراجعة شؤون الطلاب لاستكمال المتطلبات.',
    messageEn: 'A graduation-requirements hold is active. Please contact Student Affairs.',
    scopes: ['blockGraduation', 'blockCertificate'],
  },
  LIBRARY: {
    nameAr: 'حجب مكتبة / عهدة', nameEn: 'Library Hold',
    messageAr: 'يوجد قيد بسبب عهدة/مكتبة لم تُسترد. يرجى مراجعة المكتبة.',
    messageEn: 'A library/custody hold is active. Please contact the Library.',
    scopes: ['blockResult'],
  },
  CUSTOM: {
    nameAr: 'حجب مخصص', nameEn: 'Custom Hold',
    messageAr: 'النتيجة غير متاحة حاليًا لوجود قيد على حسابك. يرجى مراجعة شؤون الطلاب.',
    messageEn: 'Result is currently unavailable due to an active hold. Please contact Student Affairs.',
    scopes: ['blockResult'],
  },
};

export const HOLD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  HOLD_TYPES.map((t) => [t, HOLD_TYPE_DEFAULTS[t].nameAr])
);
export const HOLD_STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد المراجعة', ACTIVE: 'نشط', RELEASED: 'مرفوع', CANCELLED: 'ملغى', EXPIRED: 'منتهٍ',
};

export const HOLD_SETTINGS_KEY = 'institute.holdSettings';
export type HoldSettings = {
  autoFinanceHold: boolean; // surface debtors as candidates for a financial hold (staff confirm)
  autoFinanceRelease: boolean; // auto-release financial holds when the balance reaches zero
  types: Record<string, { messageAr?: string; messageEn?: string; scopes?: HoldScope[] }>;
};
const DEFAULT_HOLD_SETTINGS: HoldSettings = { autoFinanceHold: true, autoFinanceRelease: true, types: {} };

export async function getHoldSettings(): Promise<HoldSettings> {
  const row = await prisma.setting.findFirst({ where: { key: HOLD_SETTINGS_KEY } });
  if (!row) return DEFAULT_HOLD_SETTINGS;
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_HOLD_SETTINGS, ...parsed, types: { ...(parsed.types ?? {}) } };
  } catch {
    return DEFAULT_HOLD_SETTINGS;
  }
}

// Student-facing message for a hold: per-hold override → tenant type-config → built-in default.
export async function holdMessage(
  hold: { type: string; messageAr?: string | null; messageEn?: string | null },
  lang: 'ar' | 'en' = 'ar'
): Promise<string> {
  if (lang === 'ar' && hold.messageAr) return hold.messageAr;
  if (lang === 'en' && hold.messageEn) return hold.messageEn;
  const settings = await getHoldSettings();
  const cfg = settings.types[hold.type];
  if (lang === 'ar' && cfg?.messageAr) return cfg.messageAr;
  if (lang === 'en' && cfg?.messageEn) return cfg.messageEn;
  const def = HOLD_TYPE_DEFAULTS[hold.type as HoldType] ?? HOLD_TYPE_DEFAULTS.ADMINISTRATIVE;
  return lang === 'en' ? def.messageEn : def.messageAr;
}

export type HoldEffect = Record<HoldScope, boolean> & {
  held: boolean;
  holds: { id: string; type: string }[];
};

/** Aggregate scope across a student's ACTIVE holds (logical OR of each flag). */
export async function holdEffect(studentId: string): Promise<HoldEffect> {
  const holds = await prisma.studentHold.findMany({ where: { studentId, status: 'ACTIVE' } });
  const eff = { held: holds.length > 0, holds: holds.map((h) => ({ id: h.id, type: h.type })) } as HoldEffect;
  for (const s of HOLD_SCOPES) eff[s] = holds.some((h) => h[s]);
  return eff;
}

/** Is a specific scope blocked for the student? Returns the message + hold type to show. */
export async function scopeBlock(
  studentId: string,
  scope: HoldScope,
  lang: 'ar' | 'en' = 'ar'
): Promise<{ blocked: boolean; message: string | null; type: string | null }> {
  const where: Prisma.StudentHoldWhereInput = { studentId, status: 'ACTIVE' };
  (where as Record<string, unknown>)[scope] = true;
  const hold = await prisma.studentHold.findFirst({ where, orderBy: { startDate: 'desc' } });
  if (!hold) return { blocked: false, message: null, type: null };
  return { blocked: true, message: await holdMessage(hold, lang), type: hold.type };
}

/** Total unpaid fees across all of a student's fee accounts (operational layer). */
export async function outstandingFeesFor(studentId: string): Promise<number> {
  const accounts = await prisma.feeAccount.findMany({ where: { studentId }, include: { payments: true } });
  let out = 0;
  for (const a of accounts) {
    const paid = a.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    out += Math.max(0, a.totalFees - paid);
  }
  return Math.round(out * 100) / 100;
}

// Keep the legacy Student.holdStatus/holdReason flags in sync (existing report reads them).
async function syncStudentHoldFlag(studentId: string): Promise<void> {
  const active = await prisma.studentHold.findFirst({
    where: { studentId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    include: { reason: true },
  });
  const reason = active
    ? active.reason?.nameAr ?? active.reasonText ?? HOLD_TYPE_DEFAULTS[active.type as HoldType]?.nameAr ?? active.type
    : null;
  await prisma.student.update({ where: { id: studentId }, data: { holdStatus: !!active, holdReason: reason } });
}

export type ApplyHoldArgs = {
  studentId: string;
  type: HoldType | string;
  reasonId?: string | null;
  reasonText?: string | null;
  scopes?: Partial<Record<HoldScope, boolean>>;
  status?: HoldStatus;
  source?: 'MANUAL' | 'AUTOMATIC';
  startDate?: Date;
  endDate?: Date | null;
  messageAr?: string | null;
  messageEn?: string | null;
  appliedById?: string | null;
  approvedById?: string | null;
  universityId?: string | null;
};

/** Place a hold. Defaults to ACTIVE; pass status:'PENDING' for the staff-confirm flow. */
export async function applyHold(args: ApplyHoldArgs) {
  const def = HOLD_TYPE_DEFAULTS[args.type as HoldType] ?? HOLD_TYPE_DEFAULTS.ADMINISTRATIVE;
  const scopeData = {} as Record<HoldScope, boolean>;
  for (const s of HOLD_SCOPES) scopeData[s] = args.scopes?.[s] ?? def.scopes.includes(s);
  const status = args.status ?? 'ACTIVE';
  const source = args.source ?? 'MANUAL';

  const hold = await prisma.studentHold.create({
    data: {
      studentId: args.studentId,
      universityId: args.universityId ?? null,
      type: String(args.type),
      reasonId: args.reasonId ?? null,
      reasonText: args.reasonText ?? null,
      ...scopeData,
      status,
      source,
      messageAr: args.messageAr ?? null,
      messageEn: args.messageEn ?? null,
      startDate: args.startDate ?? new Date(),
      endDate: args.endDate ?? null,
      appliedById: args.appliedById ?? null,
      approvedById: args.approvedById ?? null,
    },
  });
  await prisma.holdEvent.create({
    data: {
      holdId: hold.id, studentId: args.studentId, universityId: args.universityId ?? null,
      action: 'APPLY', source, actorUserId: args.appliedById ?? null, note: args.reasonText ?? null,
    },
  });
  await syncStudentHoldFlag(args.studentId);
  await writeAudit('hold.apply', {
    targetType: 'Student', targetId: args.studentId, universityId: args.universityId ?? null,
    metadata: { holdId: hold.id, type: hold.type, status, source },
  });
  return hold;
}

/** Bulk-apply the same hold to many students (حجب جماعي). Returns the created hold ids. */
export async function applyHoldBulk(studentIds: string[], args: Omit<ApplyHoldArgs, 'studentId'>) {
  const ids: string[] = [];
  for (const studentId of studentIds) {
    const h = await applyHold({ ...args, studentId });
    ids.push(h.id);
  }
  return ids;
}

/** Lift a hold (تفعيل الطالب): status→RELEASED + lifecycle event + audit. */
export async function releaseHold(
  holdId: string,
  args?: { releasedById?: string | null; reason?: string | null; source?: 'MANUAL' | 'AUTOMATIC' }
) {
  const hold = await prisma.studentHold.findUnique({ where: { id: holdId } });
  if (!hold) return null;
  const source = args?.source ?? 'MANUAL';
  const updated = await prisma.studentHold.update({
    where: { id: holdId },
    data: {
      status: 'RELEASED', releasedById: args?.releasedById ?? null, releasedAt: new Date(),
      releaseReason: args?.reason ?? null, endDate: hold.endDate ?? new Date(),
    },
  });
  await prisma.holdEvent.create({
    data: {
      holdId, studentId: hold.studentId, universityId: hold.universityId,
      action: 'RELEASE', source, actorUserId: args?.releasedById ?? null, note: args?.reason ?? null,
    },
  });
  await syncStudentHoldFlag(hold.studentId);
  await writeAudit('hold.release', {
    targetType: 'Student', targetId: hold.studentId, universityId: hold.universityId,
    metadata: { holdId, type: hold.type, source },
  });
  return updated;
}

/** Cancel a hold (placed in error) — distinct from RELEASE (obligation met). */
export async function cancelHold(holdId: string, args?: { actorUserId?: string | null; reason?: string | null }) {
  const hold = await prisma.studentHold.findUnique({ where: { id: holdId } });
  if (!hold) return null;
  const updated = await prisma.studentHold.update({
    where: { id: holdId },
    data: { status: 'CANCELLED', releasedById: args?.actorUserId ?? null, releasedAt: new Date(), releaseReason: args?.reason ?? null },
  });
  await prisma.holdEvent.create({
    data: { holdId, studentId: hold.studentId, universityId: hold.universityId, action: 'CANCEL', source: 'MANUAL', actorUserId: args?.actorUserId ?? null, note: args?.reason ?? null },
  });
  await syncStudentHoldFlag(hold.studentId);
  await writeAudit('hold.cancel', { targetType: 'Student', targetId: hold.studentId, universityId: hold.universityId, metadata: { holdId } });
  return updated;
}

/** Approve a PENDING hold → ACTIVE (manager override, صلاحية Override). */
export async function approveHold(holdId: string, approvedById?: string | null) {
  const hold = await prisma.studentHold.findUnique({ where: { id: holdId } });
  if (!hold) return null;
  const updated = await prisma.studentHold.update({
    where: { id: holdId },
    data: { status: 'ACTIVE', approvedById: approvedById ?? null },
  });
  await prisma.holdEvent.create({
    data: { holdId, studentId: hold.studentId, universityId: hold.universityId, action: 'APPROVE', source: 'MANUAL', actorUserId: approvedById ?? null },
  });
  await syncStudentHoldFlag(hold.studentId);
  await writeAudit('hold.approve', { targetType: 'Student', targetId: hold.studentId, universityId: hold.universityId, metadata: { holdId } });
  return updated;
}

export type AutoHoldCandidate = {
  id: string; studentCode: string; nameAr: string;
  level: number; departmentId: string | null; programId: string | null; outstanding: number;
};

/**
 * Finance link — students with outstanding fees and NO active financial hold yet
 * (طلاب معرضون للحجب). Staff review this list and confirm the hold; the system
 * never places a binding hold on its own without a human confirming.
 */
export async function autoHoldCandidates(universityId?: string | null): Promise<AutoHoldCandidate[]> {
  const accounts = await prisma.feeAccount.findMany({
    where: universityId ? { universityId } : {},
    include: {
      payments: true,
      student: { select: { id: true, studentCode: true, nameAr: true, level: true, departmentId: true, programId: true } },
    },
  });
  const byStudent = new Map<string, { student: AutoHoldCandidate; outstanding: number }>();
  for (const a of accounts) {
    const paid = a.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const rem = Math.max(0, a.totalFees - paid);
    if (rem <= 0) continue;
    const prev = byStudent.get(a.studentId);
    if (prev) prev.outstanding += rem;
    else byStudent.set(a.studentId, { student: { ...a.student, outstanding: 0 }, outstanding: rem });
  }
  const ids = [...byStudent.keys()];
  if (!ids.length) return [];
  const held = await prisma.studentHold.findMany({
    where: { studentId: { in: ids }, type: 'FINANCIAL', status: 'ACTIVE' },
    select: { studentId: true },
  });
  const heldSet = new Set(held.map((h) => h.studentId));
  return [...byStudent.values()]
    .filter((v) => !heldSet.has(v.student.id))
    .map((v) => ({ ...v.student, outstanding: Math.round(v.outstanding * 100) / 100 }));
}

/**
 * Finance link — when a student's balance reaches zero, auto-release their active
 * financial holds (source=AUTOMATIC). Call from the payment-recording path.
 * Returns the number of holds released.
 */
export async function releaseFinancialHoldsIfPaid(studentId: string, actorUserId?: string | null): Promise<number> {
  const settings = await getHoldSettings();
  if (!settings.autoFinanceRelease) return 0;
  if ((await outstandingFeesFor(studentId)) > 0) return 0;
  const holds = await prisma.studentHold.findMany({ where: { studentId, type: 'FINANCIAL', status: 'ACTIVE' } });
  for (const h of holds) {
    await releaseHold(h.id, { releasedById: actorUserId ?? null, reason: 'سداد المديونية بالكامل (رفع تلقائي)', source: 'AUTOMATIC' });
  }
  return holds.length;
}

/** Sweep: mark holds whose endDate has passed as EXPIRED (call from a cron/maintenance path). */
export async function expireDueHolds(): Promise<number> {
  const due = await prisma.studentHold.findMany({ where: { status: 'ACTIVE', endDate: { not: null, lt: new Date() } } });
  for (const h of due) {
    await prisma.studentHold.update({ where: { id: h.id }, data: { status: 'EXPIRED' } });
    await prisma.holdEvent.create({ data: { holdId: h.id, studentId: h.studentId, universityId: h.universityId, action: 'EXPIRE', source: 'AUTOMATIC' } });
    await syncStudentHoldFlag(h.studentId);
  }
  return due.length;
}
