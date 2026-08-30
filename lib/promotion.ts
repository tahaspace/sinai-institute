/**
 * ClientR6 — student promotion (rollover) engine.
 * After results, evaluates a cohort at one level and decides each student's
 * action (PROMOTE up / GRADUATE / STAY / SKIP) from the standing engine + status
 * + ClientR5 financial holds. Runs DRAFT → APPROVED (manager gate) → EXECUTED
 * (locked). Execute bumps the level (or graduates) and opens a new-year
 * registration; prior enrollments stay as immutable history. Everything audited.
 */
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { computeStandingForStudents } from '@/lib/standing';
import { outstandingFeesFor } from '@/lib/holds';

export type PromotionAction = 'PROMOTE' | 'GRADUATE' | 'STAY' | 'SKIP';

const GRADE_BANDS: [number, string][] = [[3.67, 'ممتاز'], [3.0, 'جيد جداً'], [2.33, 'جيد'], [2.0, 'مقبول'], [0, 'ضعيف']];
export function cgpaGrade(cgpa: number): string { for (const [min, g] of GRADE_BANDS) if (cgpa >= min) return g; return 'ضعيف'; }

export type PromotionSettings = { blockDebtPromotion: boolean };
export const PROMOTION_SETTINGS_KEY = 'institute.promotion';
export async function getPromotionSettings(): Promise<PromotionSettings> {
  const row = await prisma.setting.findFirst({ where: { key: PROMOTION_SETTINGS_KEY } });
  const def: PromotionSettings = { blockDebtPromotion: true };
  if (!row) return def;
  try { return { ...def, ...JSON.parse(row.value) }; } catch { return def; }
}

export type PromotionRow = {
  studentId: string; studentCode: string; name: string; program: string;
  level: number; cgpa: number; grade: string; result: string;
  action: PromotionAction; toLevel: number | null; eligible: boolean; reason: string;
};

const isTransfer = (t?: string | null) => !!t && /تحويل|محو|منقول/.test(t);

/** Evaluate every student at a level: compute each one's promotion action + reason. */
export async function evaluateCohort(opts: { academicYear: string; level: number; programId?: string | null; departmentId?: string | null }): Promise<PromotionRow[]> {
  const students = await prisma.student.findMany({
    where: { level: opts.level, ...(opts.programId ? { programId: opts.programId } : {}), ...(opts.departmentId ? { departmentId: opts.departmentId } : {}) },
    select: { id: true, studentCode: true, nameAr: true, status: true, level: true, admissionType: true, program: { select: { nameAr: true } } },
    orderBy: { studentCode: 'asc' },
  });
  if (!students.length) return [];
  const standings = await computeStandingForStudents(students.map((s) => s.id));
  const settings = await getPromotionSettings();

  const rows: PromotionRow[] = [];
  for (const s of students) {
    const st = standings.get(s.id);
    const cgpa = st?.cgpa ?? 0;
    let action: PromotionAction = 'STAY';
    let toLevel: number | null = null;
    let eligible = false;
    let reason = '';
    let result = 'راسب';

    if (s.status === 'WITHDRAWN') { action = 'SKIP'; reason = 'منسحب'; result = 'منسحب'; }
    else if (s.status === 'DISMISSED') { action = 'SKIP'; reason = 'مفصول'; result = 'مفصول'; }
    else if (s.status === 'GRADUATED') { action = 'SKIP'; reason = 'خريج بالفعل'; result = 'خريج'; }
    else if (s.status === 'DEFERRED' || s.status === 'SUSPENDED') { action = 'STAY'; reason = 'مؤجل / موقوف — يبقى كما هو'; result = 'مؤجل'; }
    else if (isTransfer(s.admissionType)) { action = 'SKIP'; reason = 'محوّل من جامعة أخرى — معالجة يدوية'; result = 'محوّل'; }
    else if (st?.graduationEligible) { action = 'GRADUATE'; eligible = true; reason = 'مستوفٍ لشروط التخرج'; result = 'ناجح — خريج'; }
    else if (st?.canPromote) { action = 'PROMOTE'; toLevel = st.qualifiedLevel; eligible = true; reason = 'ناجح — مؤهل للترقية'; result = 'ناجح'; }
    else { action = 'STAY'; reason = 'لم يستوفِ شروط الترقية (راسب / ساعات ناقصة)'; result = 'راسب'; }

    // Financial block (per setting) can veto an otherwise-eligible promotion.
    if (eligible && settings.blockDebtPromotion) {
      const debt = await outstandingFeesFor(s.id);
      if (debt > 0) { eligible = false; action = 'SKIP'; reason = `مديونية غير مسددة (${debt.toLocaleString()})`; }
    }

    rows.push({ studentId: s.id, studentCode: s.studentCode, name: s.nameAr, program: s.program?.nameAr ?? '—', level: s.level, cgpa: Math.round(cgpa * 100) / 100, grade: cgpaGrade(cgpa), result, action, toLevel, eligible, reason });
  }
  return rows;
}

export type PromotionBatchOpts = { fromYear: string; toYear: string; fromSemester?: string | null; toSemester?: string | null; programId?: string | null; departmentId?: string | null; fromLevel: number; toLevel?: number | null; universityId?: string | null };

/** Create a DRAFT batch from a cohort evaluation + the staff selection. */
export async function createBatch(opts: PromotionBatchOpts, selectedStudentIds: string[], actorId?: string | null) {
  const rows = await evaluateCohort({ academicYear: opts.fromYear, level: opts.fromLevel, programId: opts.programId, departmentId: opts.departmentId });
  const selected = new Set(selectedStudentIds);
  const chosen = selectedStudentIds.length ? rows.filter((r) => selected.has(r.studentId)) : rows;
  const eligible = chosen.filter((r) => r.eligible);

  const batch = await prisma.promotionBatch.create({
    data: {
      universityId: opts.universityId ?? null, fromYear: opts.fromYear, toYear: opts.toYear,
      fromSemester: opts.fromSemester ?? null, toSemester: opts.toSemester ?? null,
      programId: opts.programId ?? null, departmentId: opts.departmentId ?? null,
      fromLevel: opts.fromLevel, toLevel: opts.toLevel ?? opts.fromLevel + 1,
      status: 'DRAFT', eligibleCount: eligible.length, createdById: actorId ?? null,
      items: {
        create: chosen.map((r) => ({
          studentId: r.studentId, studentCode: r.studentCode, studentName: r.name, action: r.action,
          fromLevel: r.level, toLevel: r.toLevel ?? (r.action === 'PROMOTE' ? opts.fromLevel + 1 : null),
          cgpa: r.cgpa, resultGrade: r.grade, reason: r.reason,
        })),
      },
    },
    include: { items: true },
  });
  await writeAudit('promotion.create', { targetType: 'PromotionBatch', targetId: batch.id, universityId: opts.universityId ?? null, metadata: { fromLevel: opts.fromLevel, toYear: opts.toYear, eligible: eligible.length, total: chosen.length } });
  return batch;
}

/** Manager approval gate (permission `promotion.approve`). DRAFT → APPROVED. */
export async function approveBatch(batchId: string, actorId?: string | null) {
  const batch = await prisma.promotionBatch.findUnique({ where: { id: batchId } });
  if (!batch) return null;
  if (batch.status !== 'DRAFT') throw new Error('لا يمكن اعتماد دفعة ليست في حالة مسودة');
  const updated = await prisma.promotionBatch.update({ where: { id: batchId }, data: { status: 'APPROVED', approvedById: actorId ?? null, approvedAt: new Date() } });
  await writeAudit('promotion.approve', { targetType: 'PromotionBatch', targetId: batchId, universityId: batch.universityId, metadata: { eligible: batch.eligibleCount } });
  return updated;
}

/** Execute an APPROVED batch (locked after): bump level / graduate + open new-year registration. */
export async function executeBatch(batchId: string, actorId?: string | null) {
  const batch = await prisma.promotionBatch.findUnique({ where: { id: batchId }, include: { items: true } });
  if (!batch) return null;
  if (batch.status !== 'APPROVED') throw new Error('يجب اعتماد الترحيل قبل التنفيذ');
  let promoted = 0;
  for (const it of batch.items) {
    if (it.action === 'PROMOTE') {
      const toLevel = it.toLevel ?? (it.fromLevel ?? 0) + 1;
      await prisma.student.update({ where: { id: it.studentId }, data: { level: toLevel } });
      await prisma.registrationRequest.upsert({
        where: { studentId_academicYear_semester: { studentId: it.studentId, academicYear: batch.toYear, semester: batch.toSemester ?? 'first' } },
        update: {},
        create: { studentId: it.studentId, academicYear: batch.toYear, semester: batch.toSemester ?? 'first', status: 'Draft' },
      });
      promoted++;
    } else if (it.action === 'GRADUATE') {
      await prisma.student.update({ where: { id: it.studentId }, data: { status: 'GRADUATED' } });
      promoted++;
    }
    // STAY / SKIP → no mutation; prior enrollments stay as immutable history.
  }
  const updated = await prisma.promotionBatch.update({ where: { id: batchId }, data: { status: 'EXECUTED', executedById: actorId ?? null, executedAt: new Date(), promotedCount: promoted } });
  await writeAudit('promotion.execute', { targetType: 'PromotionBatch', targetId: batchId, universityId: batch.universityId, metadata: { fromYear: batch.fromYear, toYear: batch.toYear, fromLevel: batch.fromLevel, toLevel: batch.toLevel, promoted } });
  return { batch: updated, promoted };
}
