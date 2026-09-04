/**
 * Study-plan write helpers shared by the row endpoints and the level bulk-replace.
 *
 * WHY this file exists at all: 31 of the bylaw's 35 tables ARE the study plan, and the plan had no
 * write path — rows could only be seeded. A new institute must be able to type its own plan in.
 *
 * Bylaw anchors (معهد سيناء العالي, جدول 1):
 *   «مقررات تخصص اجباريه علي جميع التخصصات 32 | مقررات تخصص اجبارية علي تخصص 28 |
 *     مقررات تخصص اختيارية علي تخصص 4 | مقررات التخصص الرئيسي اجبارية 54 |
 *     مقررات التخصص الرئيسي اختيارية 4 | مقررات التخصص الفرعي اختيارية 8 | 130 ساعة اجمالية»
 * — that is exactly the six buckets below, and the reason the editor foots each bucket separately.
 * NOTHING here hardcodes 32/28/4/54/4/8 or 130: the institute types its own rows and the total is
 * compared against its own Program.totalCreditHours.
 */
import prisma from '@/lib/prisma';
import { tenantOrGlobalWhere } from '@/lib/tenant';
import { getRegulations } from '@/lib/regulations';

export const BUCKETS = [
  { value: 'GENERAL', label: 'مقررات إجبارية على جميع التخصصات' },
  { value: 'DEPARTMENT', label: 'مقررات إجبارية على التخصص (القسم)' },
  { value: 'MAJOR_MANDATORY', label: 'مقررات التخصص الرئيسي — إجبارية' },
  { value: 'MAJOR_ELECTIVE', label: 'مقررات التخصص الرئيسي — اختيارية' },
  { value: 'MINOR', label: 'مقررات التخصص الفرعي — اختيارية' },
  { value: 'TRAINING', label: 'تدريب / مشروع' },
] as const;

export const REQUIREMENT_TYPES = [
  { value: 'MANDATORY', label: 'إجباري' },
  { value: 'ELECTIVE', label: 'اختياري' },
] as const;

const BUCKET_VALUES = BUCKETS.map((b) => b.value) as string[];
const REQ_VALUES = REQUIREMENT_TYPES.map((r) => r.value) as string[];

/**
 * The highest level an institute may type, read from ITS OWN bylaw — never derived from
 * Program.years, which counts YEARS, not levels. The bylaw needs a level the year count cannot
 * express: «يجوز له اختيار التخصص الفرعي الثاني بناءعلي عب ء دراسي اضافي ويكون في المستوي الخامس»
 * (years = 4), and an institute that numbers per term needs 1..8 («130 ساعة مقمسمه علي 8 فصول»).
 *
 * Unconfigured means NO ceiling: an institute that typed nothing (or typed 0) must not be refused
 * its own plan. `planLevelCount` is a typed Regulations key now — «عدد المستويات في اللائحة» on the
 * bylaw screen — so it is read directly instead of through a cast.
 */
export async function planLevelCeiling(universityId: string | null): Promise<number | null> {
  const reg = await getRegulations(universityId);
  const n = Number(reg.planLevelCount);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const ORDINALS = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];

/**
 * The legacy free-text columns are still the ONLY thing the old read path (and any report built on
 * it) understands, so every structured write also fills them. They are derived, never authoritative.
 * Term 3 is «الفصل الصيفي» — the bylaw excludes it from the 16-hour load: «الفصل الدراسي 16 ساعة
 * دون احتساب الفصول الصيفيه».
 */
export function legacyLabels(levelNo: number, termNo: number) {
  return {
    year: `المستوى ${ORDINALS[levelNo] ?? levelNo}`,
    semester: termNo === 3 ? 'الفصل الصيفي' : `الفصل ${ORDINALS[termNo] ?? termNo}`,
  };
}

type PlanRow = {
  id: string; programId: string | null; programName: string; year: string; semester: string;
  courseCode: string; courseName: string; hours: number; order: number;
  courseId: string | null; levelNo: number | null; termNo: number | null;
  requirementType: string | null; bucket: string | null; specializationId: string | null;
  electiveGroup: string | null; chooseCount: number | null;
};

export function serializeItem(i: PlanRow) {
  return {
    id: i.id,
    programId: i.programId,
    programName: i.programName,
    // Legacy fallbacks are what a seeded row has; the editor shows them read-only when the
    // structured half is absent, and never rewrites them behind the registrar's back.
    year: i.year,
    semester: i.semester,
    courseCode: i.courseCode,
    courseName: i.courseName,
    hours: i.hours,
    order: i.order,
    courseId: i.courseId,
    levelNo: i.levelNo,
    termNo: i.termNo,
    requirementType: i.requirementType,
    bucket: i.bucket,
    specializationId: i.specializationId,
    electiveGroup: i.electiveGroup,
    chooseCount: i.chooseCount,
    isLegacy: i.levelNo === null, // seeded row: structured half never filled
  };
}

type Year = { year: string; semesters: { name: string; courses: { code: string; name: string; hours: number }[] }[] };

/** The exact grouping the read-only screen has always used — unchanged, legacy columns only. */
export function buildLegacyTree(items: PlanRow[]): Year[] {
  const years: Year[] = [];
  const byName = new Map<string, Year>();
  for (const item of items) {
    let year = byName.get(item.year);
    if (!year) {
      year = { year: item.year, semesters: [] };
      byName.set(item.year, year);
      years.push(year);
    }
    let semester = year.semesters.find((s) => s.name === item.semester);
    if (!semester) {
      semester = { name: item.semester, courses: [] };
      year.semesters.push(semester);
    }
    semester.courses.push({ code: item.courseCode, name: item.courseName, hours: item.hours });
  }
  return years;
}

export type ValidatedItem = {
  data: {
    programId: string; programName: string; year: string; semester: string;
    courseCode: string; courseName: string; hours: number; order: number;
    courseId: string | null; levelNo: number | null; termNo: number | null;
    requirementType: string | null; bucket: string | null; specializationId: string | null;
    electiveGroup: string | null; chooseCount: number | null;
  };
};

const asInt = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Server-side validation for one plan row. `ignoreId` excludes the row being edited from the
 * duplicate check; `siblings` lets the bulk-replace check a batch against itself before writing.
 */
export async function validateItemInput(
  body: Record<string, unknown>,
  universityId: string | null,
  ignoreId: string | null,
  /**
   * Legacy escape hatch: a seeded row has NO levelNo/termNo. Editing it (say, fixing its hours)
   * must not force the registrar to structure it, and must not rewrite its free-text year/semester.
   */
  allowUnstructured = false,
  siblings?: { courseId: string | null; courseCode: string; levelNo: number; termNo: number }[],
  /** Bulk level replace: the stored rows of this level are about to be deleted, so they are not
   *  duplicates. Uniqueness inside the submitted batch is still enforced via `siblings`. */
  skipStoredDuplicateCheck = false,
): Promise<ValidatedItem | { error: string }> {
  const programId = typeof body.programId === 'string' ? body.programId : '';
  if (!programId) return { error: 'البرنامج مطلوب' };

  const program = await prisma.program.findFirst({ where: { AND: [tenantOrGlobalWhere(universityId), { id: programId }] } });
  if (!program) return { error: 'البرنامج غير موجود' };

  const hours = asInt(body.hours);
  if (!Number.isInteger(hours) || hours <= 0) return { error: 'عدد الساعات يجب أن يكون رقمًا موجبًا' };

  const hasLevel = body.levelNo !== null && body.levelNo !== undefined && String(body.levelNo) !== '';
  let levelNo: number | null = null;
  let termNo: number | null = null;
  if (hasLevel) {
    levelNo = asInt(body.levelNo);
    // The ceiling comes from the institute's own «عدد المستويات», NOT from Program.years (a year
    // count): the bylaw itself reaches level 5 («ويكون في المستوي الخامس») on a 4-year programme.
    // Unconfigured → no ceiling, only a sanity bound, so nothing an institute types is refused.
    const ceiling = await planLevelCeiling(universityId);
    if (!Number.isInteger(levelNo) || levelNo < 1 || (ceiling !== null && levelNo > ceiling)) {
      return {
        error: ceiling !== null
          ? `المستوى يجب أن يكون بين 1 و ${ceiling} حسب عدد المستويات في لائحة المعهد`
          : 'المستوى يجب أن يكون رقمًا من 1 فأعلى',
      };
    }
    termNo = asInt(body.termNo);
    if (!Number.isInteger(termNo) || termNo < 1 || termNo > 3) {
      return { error: 'الفصل يجب أن يكون 1 (الأول) أو 2 (الثاني) أو 3 (الصيفي)' };
    }
  } else if (!allowUnstructured) {
    return { error: 'المستوى والفصل مطلوبان' };
  }

  const courseId: string | null = typeof body.courseId === 'string' && body.courseId ? body.courseId : null;
  let courseCode = typeof body.courseCode === 'string' ? body.courseCode.trim() : '';
  let courseName = typeof body.courseName === 'string' ? body.courseName.trim() : '';

  if (courseId) {
    // Course IS a tenanted model and the auto-scoping extension is inert here, so scope explicitly —
    // otherwise an institute could mirror another tenant's course code/name into its own plan row.
    const course = await prisma.course.findFirst({ where: { AND: [tenantOrGlobalWhere(universityId), { id: courseId }] } });
    if (!course) return { error: 'المقرر غير موجود في دليل المقررات' };
    // The real course row is the source of the code/name; the legacy text columns mirror it.
    courseCode = course.code;
    courseName = course.nameAr;
  } else if (!courseCode || !courseName) {
    // Legacy (seeded) rows carry no courseId; editing one must still be possible without inventing
    // a Course, but a brand-new row without either is meaningless.
    return { error: 'اختر المقرر من دليل المقررات' };
  }

  const requirementType = typeof body.requirementType === 'string' && body.requirementType ? body.requirementType : null;
  if (requirementType && !REQ_VALUES.includes(requirementType)) return { error: 'نوع المتطلب غير صحيح' };

  const bucket = typeof body.bucket === 'string' && body.bucket ? body.bucket : null;
  if (bucket && !BUCKET_VALUES.includes(bucket)) return { error: 'بند توزيع الساعات غير صحيح' };

  const specializationId = typeof body.specializationId === 'string' && body.specializationId ? body.specializationId : null;
  if (specializationId) {
    // Specialization has no universityId of its own; its programme is the tenant anchor, so the
    // membership check IS the query — a foreign tenant's specialisation simply does not resolve.
    const spec = await prisma.specialization.findFirst({
      where: { AND: [{ id: specializationId }, { OR: [{ programId }, { programId: null }] }] },
    });
    if (!spec) return { error: 'التخصص غير موجود أو لا يتبع هذا البرنامج' };
    // «التخصص الفرعي يكون في المستوي الرابع فقط» — the level gate is the specialisation's own
    // minLevel, typed by the institute, not a constant here.
    if (spec.minLevel && levelNo !== null && levelNo < spec.minLevel) {
      return { error: `هذا التخصص يبدأ من المستوى ${spec.minLevel} فأعلى حسب اللائحة` };
    }
  }

  // «وعندي مقررات اختيارية … وليكن اربعة او خمسه وهو لازم ياخد من مقررات دي وليكن اتنين»:
  // rows sharing electiveGroup are alternatives, chooseCount says how many of them count.
  const electiveGroup = typeof body.electiveGroup === 'string' && body.electiveGroup.trim() ? body.electiveGroup.trim() : null;
  let chooseCount: number | null = null;
  if (body.chooseCount !== null && body.chooseCount !== undefined && String(body.chooseCount) !== '') {
    chooseCount = asInt(body.chooseCount);
    if (!Number.isInteger(chooseCount) || chooseCount < 1) return { error: 'عدد المقررات المطلوب اختيارها يجب أن يكون 1 فأكثر' };
  }
  if (chooseCount !== null && !electiveGroup) return { error: 'حدد اسم المجموعة الاختيارية قبل عدد المقررات المطلوب اختيارها' };

  // A course may not appear twice in the same level+term of the same programme. Legacy rows with
  // no level cannot be checked this way, and are left alone.
  if (levelNo !== null && termNo !== null) {
    const key = (r: { courseId: string | null; courseCode: string }) => r.courseId ?? `code:${r.courseCode}`;
    const mine = key({ courseId, courseCode });
    if (siblings?.some((s2) => s2.levelNo === levelNo && s2.termNo === termNo && key(s2) === mine)) {
      return { error: `المقرر ${courseCode} مكرر في نفس المستوى والفصل` };
    }
    const dup = skipStoredDuplicateCheck ? null : await prisma.studyPlanItem.findFirst({
      where: {
        AND: [
          tenantOrGlobalWhere(universityId),
          { programId, levelNo, termNo },
          courseId ? { courseId } : { courseCode },
          ...(ignoreId ? [{ NOT: { id: ignoreId } }] : []),
        ],
      },
    });
    if (dup) return { error: `المقرر ${courseCode} مسجَّل بالفعل في هذا المستوى والفصل` };
  }

  // Structured rows derive the legacy text from the numbers; an unstructured legacy row keeps the
  // free text it was seeded with, untouched.
  const labels = levelNo !== null && termNo !== null
    ? legacyLabels(levelNo, termNo)
    : { year: String(body.year ?? ''), semester: String(body.semester ?? '') };
  const orderRaw = asInt(body.order);
  const order = Number.isInteger(orderRaw) ? orderRaw : 0;

  return {
    data: {
      programId,
      programName: program.nameAr,
      year: labels.year,
      semester: labels.semester,
      courseCode,
      courseName,
      hours,
      order,
      courseId,
      levelNo,
      termNo,
      requirementType,
      bucket,
      specializationId,
      electiveGroup,
      chooseCount,
    },
  };
}
