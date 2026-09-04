/**
 * التقويم الأكاديمي — shared parsing/validation for the AcademicTerm write endpoints.
 *
 * Lives beside the routes (not in lib/) because a `route.ts` may export handlers only; the
 * underscore keeps it out of the router. It is imported by ./route.ts and ./[id]/route.ts so the
 * two writers can never drift apart on the invariants.
 *
 * WHY a calendar at all — the bylaw defines the term as a sequence of dated windows:
 *   «تقسيمه الفصل الدراسي: فصل التسجيل____ اسبوع واحد ( لو تاخر الطالب علي تسجيل يتحمل الطالب
 *    رسوم التسجيل وغرامه تاخير خلال هذا الاسبوع ) . الدراسه______ 12 اسبوع . الامتحانات_____ اسبوعان»
 *   «✡الفصل الصيفي 8 اسابيع مكثف …»
 *   «يجوز للطالب الحق في ان يكون خلال الاسبوع الثاني من الدراسة او الاسبوع الاول من الفصل الصيفي
 *    المكثف .» (حق الإضافة والحذف)
 *   «يجوز طالب الانسحاب من المادة حتي نهايه الاسبوع الثاني عشر من بدء التسجيل ، بشرط الا يكون
 *    تجاوز نسبه الغياب .» (جدول 3 — الحالة W)
 * Weeks can only be counted from a start date, which is why Regulations.withdrawWeek was editable
 * and read by nothing. The institute types the DATES here; nothing below hardcodes a week number.
 */
import prisma from '@/lib/prisma';
import { getAcademicYears } from '@/lib/academic-years';

export const TERM_TYPES = ['first', 'second', 'summer'] as const;
export type TermType = (typeof TERM_TYPES)[number];

export const TERM_LABELS: Record<string, string> = {
  first: 'الفصل الدراسي الأول',
  second: 'الفصل الدراسي الثاني',
  summer: 'الفصل الصيفي',
};

/** The ten writable columns, in the order the bylaw walks the term. */
export const DATE_FIELDS = [
  'registrationStart',
  'registrationEnd',
  'teachingStart',
  'addDropDeadline',
  'withdrawDeadline',
  'teachingEnd',
  'examsStart',
  'examsEnd',
] as const;
export type DateField = (typeof DATE_FIELDS)[number];

export const FIELD_LABELS: Record<DateField, string> = {
  registrationStart: 'بداية التسجيل',
  registrationEnd: 'نهاية التسجيل',
  teachingStart: 'بداية الدراسة',
  addDropDeadline: 'آخر موعد للحذف والإضافة',
  withdrawDeadline: 'آخر موعد للانسحاب',
  teachingEnd: 'نهاية الدراسة',
  examsStart: 'بداية الامتحانات',
  examsEnd: 'نهاية الامتحانات',
};

export type TermInput = Partial<Record<DateField, Date | null>> & {
  academicYear: string;
  termType: string;
  nameAr: string | null;
  lateRegistrationFee: number | null;
  isCurrent: boolean;
};

/** '' / null / undefined all mean "not entered yet" — a partially filled calendar is legal. */
function parseDate(v: unknown, label: string): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new Error(`تاريخ «${label}» غير صحيح`);
  return d;
}

/** Parse + shape-check a request body. Throws Arabic errors naming the offending field. */
export async function parseTermBody(
  body: Record<string, unknown>,
  current?: { academicYear: string; termType: string; isCurrent?: boolean },
): Promise<TermInput> {
  const academicYear = String(body.academicYear ?? current?.academicYear ?? '').trim();
  const termType = String(body.termType ?? current?.termType ?? '').trim();

  if (!academicYear) throw new Error('السنة الدراسية مطلوبة');
  // The year list is already managed in one place (Setting["institute.academicYears"]); refusing an
  // unmanaged year keeps the calendar joined to the same names the import/promotion screens use.
  const { years } = await getAcademicYears();
  if (!years.includes(academicYear)) {
    throw new Error(`السنة الدراسية «${academicYear}» غير موجودة في قائمة السنوات المُفعّلة — أضِفها أولاً من «السنوات الدراسية»`);
  }
  if (!(TERM_TYPES as readonly string[]).includes(termType)) throw new Error('نوع الفصل غير صحيح — القيم المسموحة: الأول / الثاني / الصيفي');

  const fee = body.lateRegistrationFee === null || body.lateRegistrationFee === undefined || body.lateRegistrationFee === ''
    ? null
    : Number(body.lateRegistrationFee);
  if (fee !== null && (!Number.isFinite(fee) || fee < 0)) throw new Error('غرامة التأخير في التسجيل يجب أن تكون رقماً غير سالب');

  const out: TermInput = {
    academicYear,
    termType,
    nameAr: body.nameAr ? String(body.nameAr).trim() : null,
    lateRegistrationFee: fee,
    // A PATCH that simply omits isCurrent must NOT un-mark the current term (a "save just the
    // dates" call from any other client would otherwise silently clear the marker). Same fallback
    // treatment academicYear/termType already get.
    isCurrent:
      body.isCurrent === undefined
        ? current?.isCurrent ?? false
        : body.isCurrent === true || body.isCurrent === 'true',
  };
  for (const f of DATE_FIELDS) out[f] = parseDate(body[f], FIELD_LABELS[f]);
  return out;
}

/**
 * Chronology. The bylaw's order is registration → teaching → exams, with الحذف والإضافة and
 * الانسحاب falling INSIDE the teaching weeks. Only pairs the institute actually filled are
 * compared, so a half-entered term saves and can be finished later.
 */
export function validateChronology(t: TermInput): void {
  const v = (f: DateField) => t[f] ?? null;
  const order: [DateField, DateField][] = [
    ['registrationStart', 'registrationEnd'],
    ['teachingStart', 'teachingEnd'],
    ['teachingEnd', 'examsStart'],
    ['examsStart', 'examsEnd'],
  ];
  for (const [a, b] of order) {
    const da = v(a), db = v(b);
    if (da && db && da > db) throw new Error(`«${FIELD_LABELS[b]}» يجب ألا يسبق «${FIELD_LABELS[a]}»`);
  }

  // registrationEnd is deliberately NOT forced before teachingStart: «فصل التسجيل اسبوع واحد ( لو
  // تاخر الطالب علي تسجيل يتحمل الطالب رسوم التسجيل وغرامه تاخير خلال هذا الاسبوع )» and the
  // late-registration grace in lib/registration.ts both let registration run into the teaching
  // weeks, so an institute must be able to express that. It only may not outlast the teaching.
  const re = v('registrationEnd'), teEnd = v('teachingEnd');
  if (re && teEnd && re > teEnd) throw new Error(`«${FIELD_LABELS.registrationEnd}» يجب أن يقع قبل نهاية الدراسة`);

  // Deadlines must fall inside the term itself, else they can never be counted as "week N".
  const start = v('teachingStart') ?? v('registrationStart');
  const end = v('examsEnd') ?? v('teachingEnd');
  for (const f of ['addDropDeadline', 'withdrawDeadline'] as const) {
    const d = v(f);
    if (!d) continue;
    if (start && d < start) throw new Error(`«${FIELD_LABELS[f]}» يجب أن يقع بعد بداية الفصل`);
    if (end && d > end) throw new Error(`«${FIELD_LABELS[f]}» يجب أن يقع قبل نهاية الفصل`);
  }
  const ad = v('addDropDeadline'), wd = v('withdrawDeadline');
  // «الأسبوع الثاني من الدراسة» for add/drop vs «نهايه الاسبوع الثاني عشر» for withdrawal.
  if (ad && wd && ad > wd) throw new Error(`«${FIELD_LABELS.withdrawDeadline}» يجب ألا يسبق «${FIELD_LABELS.addDropDeadline}»`);
  const te = v('teachingEnd');
  if (wd && te && wd > te) throw new Error(`«${FIELD_LABELS.withdrawDeadline}» يجب أن يقع قبل نهاية الدراسة`);
}

/**
 * INVARIANT 2 — the @@unique([universityId, academicYear, termType]) does NOT stop a duplicate when
 * universityId is NULL, because Postgres treats two NULLs as distinct rows. Untenanted rows are
 * exactly the ones every institute still creates today, so the check has to live here.
 */
export async function assertNoDuplicate(universityId: string | null, academicYear: string, termType: string, excludeId?: string): Promise<void> {
  const dup = await prisma.academicTerm.findFirst({
    where: {
      academicYear,
      termType,
      universityId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (dup) throw new Error(`«${TERM_LABELS[termType] ?? termType}» لعام ${academicYear} مُعرَّف بالفعل — عدِّل الفصل الموجود بدل إنشاء نسخة ثانية`);
}

/**
 * INVARIANT 1 — at most ONE isCurrent per (universityId, academicYear). No SQL constraint says
 * "one true row per group", so the write clears the siblings in the SAME transaction as the save.
 */
export function clearOtherCurrent(
  universityId: string | null,
  academicYear: string,
  keepId?: string,
  tx: { academicTerm: { updateMany: typeof prisma.academicTerm.updateMany } } = prisma,
) {
  return tx.academicTerm.updateMany({
    where: {
      universityId,
      academicYear,
      isCurrent: true,
      ...(keepId ? { id: { not: keepId } } : {}),
    },
    data: { isCurrent: false },
  });
}

export function serializeTerm(t: Record<string, unknown>) {
  return { ...t, label: TERM_LABELS[String(t.termType)] ?? String(t.termType) };
}
