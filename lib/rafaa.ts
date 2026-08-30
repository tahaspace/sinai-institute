/**
 * ClientR7 — الرأفة (Rafaa/leniency) + رفع التقدير (grade improvement) engines.
 *
 * الرأفة: bylaw-configurable grace marks added to FAILING courses to flip the year
 *   status (راسب → منقول بمادة/مادتين → ناجح). Persisted as Enrollment.graceMarks.
 * رفع التقدير: bylaw-configurable bump of an ALREADY-PASSING student's تقدير band
 *   (جيد → جيد جداً) when within the allowed gap. Stored as toGrade on the item and
 *   overlaid onto the annual result at read time.
 *
 * Both run AFTER control grade entry, per فرقة/year, on the combined-semesters result
 * (computeAnnualForStudents), then a batch is reviewed and APPROVED by control.
 */
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { getRegulations } from '@/lib/regulations';
import { computeAnnualForStudents, bandsFromRegulations, type AnnualCourseResult, type AnnualGrade, type AnnualResultStatus } from '@/lib/annual';

// ───────────────────────── Bylaw config (config-as-data in Setting) ─────────────────────────
export type RafaaConfig = {
  enabled: boolean;
  maxTotalMarks: number;        // الحد الأقصى الإجمالي (marks across all a student's courses)
  maxPerCourse: number;         // الحد الأقصى للمادة
  writtenExamMinPct: number;    // ≥ % on the written (final) exam to enter رأفة
  excludeNoWrittenCourses: boolean; // courses with no written exam excluded
  maxCourses: number;           // عدد المواد (0 = no cap)
  changeableStatuses: string[]; // which year results رأفة may act on
  includeDeferred: boolean;     // هل التخلف/المؤجل يدخل؟
  includeDismissed: boolean;    // هل المفصول يدخل؟
  includePriorBeneficiary: boolean; // هل المستفيد سابقًا من الرأفة يدخل؟
  affectsTotal: boolean;        // هل تؤثر على المجموع المعروض؟
  affectsGrade: boolean;        // هل تؤثر على التقدير؟
};
export const DEFAULT_RAFAA: RafaaConfig = {
  enabled: true, maxTotalMarks: 6, maxPerCourse: 3, writtenExamMinPct: 30,
  excludeNoWrittenCourses: true, maxCourses: 2,
  changeableStatuses: ['باقٍ للإعادة', 'له دور ثانٍ', 'راسب'],
  includeDeferred: false, includeDismissed: false, includePriorBeneficiary: true,
  affectsTotal: true, affectsGrade: true,
};

export type ImprovementConfig = {
  enabled: boolean;
  maxRaisePct: number;      // max % points added to the overall
  maxGapToBandPct: number;  // only if within this gap of the next band
  scope: 'year' | 'graduation' | 'cumulative';
  requirePassedAll: boolean;
  requireNoPriorFail: boolean;
  requireNoRafaa: boolean;  // «من أخذ رأفة لا يأخذ رفع» — configurable
};
export const DEFAULT_IMPROVEMENT: ImprovementConfig = {
  enabled: true, maxRaisePct: 2, maxGapToBandPct: 2, scope: 'year',
  requirePassedAll: true, requireNoPriorFail: false, requireNoRafaa: true,
};

// Master module toggle — some institutes (نظام الساعات المعتمدة) don't apply رأفة/رفع at all,
// so the whole sub-module can be turned off per the institute's bylaw.
export type ModuleConfig = { enabled: boolean };
export const DEFAULT_MODULE: ModuleConfig = { enabled: true };

export const RAFAA_KEY = 'institute.rafaa';
export const IMPROVEMENT_KEY = 'institute.gradeImprovement';
export const MODULE_KEY = 'institute.gradeAdjustModule';

async function readSetting<T>(key: string, def: T): Promise<T> {
  const row = await prisma.setting.findFirst({ where: { key } });
  if (!row) return def;
  try { return { ...def, ...JSON.parse(row.value) }; } catch { return def; }
}
async function saveSetting(key: string, value: unknown): Promise<unknown> {
  const existing = await prisma.setting.findFirst({ where: { key } });
  if (existing) await prisma.setting.update({ where: { id: existing.id }, data: { value: JSON.stringify(value) } });
  else await prisma.setting.create({ data: { key, value: JSON.stringify(value) } });
  return value;
}
export const getRafaaConfig = () => readSetting<RafaaConfig>(RAFAA_KEY, DEFAULT_RAFAA);
export const getImprovementConfig = () => readSetting<ImprovementConfig>(IMPROVEMENT_KEY, DEFAULT_IMPROVEMENT);
export async function saveRafaaConfig(patch: Partial<RafaaConfig>) { return saveSetting(RAFAA_KEY, { ...(await getRafaaConfig()), ...patch }); }
export async function saveImprovementConfig(patch: Partial<ImprovementConfig>) { return saveSetting(IMPROVEMENT_KEY, { ...(await getImprovementConfig()), ...patch }); }
export const getModuleConfig = () => readSetting<ModuleConfig>(MODULE_KEY, DEFAULT_MODULE);
export async function saveModuleConfig(patch: Partial<ModuleConfig>) { return saveSetting(MODULE_KEY, { ...(await getModuleConfig()), ...patch }); }

// ───────────────────────── Preview ─────────────────────────
export type RafaaCourseApplied = { courseId: string; code: string; marks: number };
export type AdjustmentRow = {
  studentId: string; studentCode: string; name: string; yearGroup: number;
  originalResult: AnnualResultStatus; originalGrade: AnnualGrade | null; originalPct: number | null; failedCourses: string[];
  rafaaCourses: RafaaCourseApplied[]; rafaaTotal: number;
  postResult: AnnualResultStatus; postFailed: number;
  improvementMarks: number; fromGrade: AnnualGrade | null; toGrade: AnnualGrade | null;
  finalStatus: AnnualResultStatus; finalGrade: string | null;
  benefitedRafaa: boolean; benefitedImprovement: boolean; priorBeneficiary: boolean;
};

function marksNeeded(c: AnnualCourseResult, passPct: number) {
  const totalMax = c.midtermMax + c.finalMax + c.practicalMax + c.homeworkMax;
  const passMarks = Math.ceil((passPct / 100) * totalMax);
  const got = (c.midterm ?? 0) + (c.final ?? 0) + (c.practical ?? 0) + (c.homework ?? 0);
  return { needed: passMarks - got, hasWritten: c.finalMax > 0, writtenPct: c.finalMax > 0 ? ((c.final ?? 0) / c.finalMax) * 100 : null };
}
function statusFromFailed(failed: number, allGraded: boolean, maxCarry: number): AnnualResultStatus {
  if (!allGraded) return 'قيد الرصد';
  if (failed === 0) return 'منقول';
  if (failed <= maxCarry) return 'له دور ثانٍ';
  return 'باقٍ للإعادة';
}

/** Compute the رأفة + رفع plan for a فرقة/year (from the ORIGINAL result, ignoring any prior grace). */
export async function previewAdjustments(opts: { academicYear: string; yearGroup: number; programId?: string | null; departmentId?: string | null }): Promise<AdjustmentRow[]> {
  const students = await prisma.student.findMany({
    where: { level: opts.yearGroup, ...(opts.programId ? { programId: opts.programId } : {}), ...(opts.departmentId ? { departmentId: opts.departmentId } : {}) },
    select: { id: true, status: true }, orderBy: { studentCode: 'asc' },
  });
  if (!students.length) return [];
  const ids = students.map((s) => s.id);
  const statusById = new Map(students.map((s) => [s.id, s.status]));

  const [reg, rcfg, icfg, original, priorItems] = await Promise.all([
    getRegulations(), getRafaaConfig(), getImprovementConfig(),
    computeAnnualForStudents(ids, { academicYear: opts.academicYear }, { ignoreGrace: true }),
    prisma.gradeAdjustmentItem.findMany({ where: { studentId: { in: ids }, benefitedRafaa: true, batch: { status: 'APPROVED' } }, select: { studentId: true } }),
  ]);
  const passPct = reg.annualPassPercent ?? 50;
  const maxCarry = reg.maxCarryOverSubjects ?? 2;
  const bands = bandsFromRegulations(reg);
  const priorSet = new Set(priorItems.map((p) => p.studentId));

  const rows: AdjustmentRow[] = [];
  for (const s of students) {
    const r = original.get(s.id);
    if (!r) continue;
    const allGraded = r.result !== 'قيد الرصد';
    const priorBeneficiary = priorSet.has(s.id);

    // --- الرأفة ---
    const rafaaCourses: RafaaCourseApplied[] = [];
    let rafaaTotal = 0;
    const postFailedCourses = new Set(r.failedCourses);
    const rafaaEligible = rcfg.enabled && allGraded && rcfg.changeableStatuses.includes(r.result)
      && (rcfg.includePriorBeneficiary || !priorBeneficiary)
      && (rcfg.includeDeferred || statusById.get(s.id) !== 'DEFERRED')
      && (rcfg.includeDismissed || statusById.get(s.id) !== 'DISMISSED');
    if (rafaaEligible) {
      const cand = r.courses.filter((c) => c.graded && !c.passed).map((c) => ({ c, ...marksNeeded(c, passPct) }))
        .filter((x) => x.needed > 0 && x.needed <= rcfg.maxPerCourse
          && (!rcfg.excludeNoWrittenCourses || x.hasWritten)
          && (x.writtenPct == null || x.writtenPct >= rcfg.writtenExamMinPct))
        .sort((a, b) => a.needed - b.needed);
      let budget = rcfg.maxTotalMarks;
      for (const x of cand) {
        if (rcfg.maxCourses > 0 && rafaaCourses.length >= rcfg.maxCourses) break;
        if (x.needed > budget) continue;
        rafaaCourses.push({ courseId: x.c.courseId, code: x.c.code, marks: x.needed });
        budget -= x.needed; rafaaTotal += x.needed; postFailedCourses.delete(x.c.code);
      }
    }
    const postFailed = postFailedCourses.size;
    const postResult = statusFromFailed(postFailed, allGraded, maxCarry);
    const benefitedRafaa = rafaaCourses.length > 0;

    // --- رفع التقدير (on the passing student) ---
    let improvementMarks = 0;
    const fromGrade: AnnualGrade | null = r.overallGrade;
    let toGrade: AnnualGrade | null = null;
    const improveEligible = icfg.enabled && postResult === 'منقول'
      && (!icfg.requirePassedAll || postFailed === 0)
      && !(icfg.requireNoRafaa && benefitedRafaa);
    if (improveEligible && r.overallPct != null) {
      const pct = r.overallPct;
      const higher = bands.filter((b) => b.min > pct).sort((a, b) => a.min - b.min)[0];
      if (higher) {
        const gap = Math.round((higher.min - pct) * 10) / 10;
        if (gap > 0 && gap <= icfg.maxGapToBandPct && gap <= icfg.maxRaisePct) { improvementMarks = Math.ceil(gap); toGrade = higher.label; }
      }
    }
    const benefitedImprovement = toGrade != null;

    rows.push({
      studentId: s.id, studentCode: r.studentCode, name: r.name, yearGroup: r.yearGroup,
      originalResult: r.result, originalGrade: r.overallGrade, originalPct: r.overallPct, failedCourses: r.failedCourses,
      rafaaCourses, rafaaTotal, postResult, postFailed,
      improvementMarks, fromGrade, toGrade,
      finalStatus: postResult, finalGrade: toGrade ?? r.overallGrade,
      benefitedRafaa, benefitedImprovement, priorBeneficiary,
    });
  }
  return rows;
}

// ───────────────────────── Apply + Approve (اعتماد الكنترول) ─────────────────────────
export async function createAdjustmentBatch(
  opts: { academicYear: string; yearGroup: number; programId?: string | null; departmentId?: string | null; universityId?: string | null },
  selectedStudentIds: string[], actorId?: string | null
) {
  if (!(await getModuleConfig()).enabled) throw new Error('موديول الرأفة ورفع التقدير غير مُفعّل حسب لائحة المعهد');
  const rows = await previewAdjustments(opts);
  const selected = new Set(selectedStudentIds);
  const chosen = (selectedStudentIds.length ? rows.filter((r) => selected.has(r.studentId)) : rows).filter((r) => r.benefitedRafaa || r.benefitedImprovement);

  const batch = await prisma.gradeAdjustmentBatch.create({
    data: {
      universityId: opts.universityId ?? null, academicYear: opts.academicYear, yearGroup: opts.yearGroup,
      programId: opts.programId ?? null, departmentId: opts.departmentId ?? null, status: 'DRAFT',
      rafaaCount: chosen.filter((r) => r.benefitedRafaa).length,
      improvementCount: chosen.filter((r) => r.benefitedImprovement).length,
      createdById: actorId ?? null,
      items: {
        create: chosen.map((r) => ({
          studentId: r.studentId, studentCode: r.studentCode, studentName: r.name,
          rafaaMarks: r.rafaaTotal, rafaaCourses: JSON.stringify(r.rafaaCourses),
          fromStatus: r.originalResult, toStatus: r.postResult, benefitedRafaa: r.benefitedRafaa,
          improvementMarks: r.improvementMarks, fromGrade: r.fromGrade, toGrade: r.toGrade, benefitedImprovement: r.benefitedImprovement,
        })),
      },
    },
    include: { items: true },
  });
  await writeAudit('gradeadjust.create', { targetType: 'GradeAdjustmentBatch', targetId: batch.id, universityId: opts.universityId ?? null, metadata: { year: opts.academicYear, yearGroup: opts.yearGroup, rafaa: batch.rafaaCount, improvement: batch.improvementCount } });
  return batch;
}

/** اعتماد الكنترول: DRAFT → APPROVED. Persists رأفة grace onto the enrollments; رفع is overlaid at read time. */
export async function approveAdjustmentBatch(batchId: string, actorId?: string | null) {
  const batch = await prisma.gradeAdjustmentBatch.findUnique({ where: { id: batchId }, include: { items: true } });
  if (!batch) return null;
  if (batch.status !== 'DRAFT') throw new Error('لا يمكن اعتماد دفعة ليست في حالة مسودة');
  for (const it of batch.items) {
    if (!it.rafaaCourses) continue;
    let courses: RafaaCourseApplied[] = [];
    try { courses = JSON.parse(it.rafaaCourses); } catch { courses = []; }
    for (const c of courses) {
      await prisma.enrollment.updateMany({ where: { studentId: it.studentId, courseId: c.courseId, academicYear: batch.academicYear }, data: { graceMarks: c.marks } });
    }
  }
  const updated = await prisma.gradeAdjustmentBatch.update({ where: { id: batchId }, data: { status: 'APPROVED', approvedById: actorId ?? null, approvedAt: new Date() } });
  await writeAudit('gradeadjust.approve', { targetType: 'GradeAdjustmentBatch', targetId: batchId, universityId: batch.universityId, metadata: { rafaa: batch.rafaaCount, improvement: batch.improvementCount } });
  return updated;
}

/** Cancel a batch; if it was approved, roll back the persisted grace. */
export async function cancelAdjustmentBatch(batchId: string) {
  const batch = await prisma.gradeAdjustmentBatch.findUnique({ where: { id: batchId }, include: { items: true } });
  if (!batch) return null;
  if (batch.status === 'APPROVED') {
    for (const it of batch.items) {
      if (!it.rafaaCourses) continue;
      let courses: RafaaCourseApplied[] = [];
      try { courses = JSON.parse(it.rafaaCourses); } catch { courses = []; }
      for (const c of courses) await prisma.enrollment.updateMany({ where: { studentId: it.studentId, courseId: c.courseId, academicYear: batch.academicYear }, data: { graceMarks: 0 } });
    }
  }
  const updated = await prisma.gradeAdjustmentBatch.update({ where: { id: batchId }, data: { status: 'CANCELLED' } });
  await writeAudit('gradeadjust.cancel', { targetType: 'GradeAdjustmentBatch', targetId: batchId, universityId: batch.universityId });
  return updated;
}
