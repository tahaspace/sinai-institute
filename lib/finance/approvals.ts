import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';

/**
 * Maker-checker workflow (Finance v2 — Phase 0). Financial actions that need dual control —
 * posting a journal entry, approving a payment/refund/payroll run, closing a period — raise an
 * Approval(PENDING). A different user decides it. The segregation rule (decider ≠ requester) is
 * SOFT by default (configurable per the chosen control level) so a single-admin demo still works,
 * matching the soft-approval convention used elsewhere (course-result exceptions).
 */
export type ApprovalEntity = 'JournalEntry' | 'Payment' | 'Refund' | 'PayRun' | 'Period' | 'Bill' | 'ExpenseClaim';
export type ApprovalAction = 'post' | 'approve' | 'refund' | 'close' | 'pay';
export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED';

export async function requestApproval(args: {
  universityId: string | null;
  entityType: ApprovalEntity;
  entityId: string;
  action: ApprovalAction;
  requestedById?: string | null;
  note?: string | null;
}) {
  const a = await prisma.approval.create({
    data: {
      universityId: args.universityId ?? null,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      state: 'PENDING',
      requestedById: args.requestedById ?? null,
      note: args.note ?? null,
    },
  });
  await writeAudit('finance.approval.request', { targetType: args.entityType, targetId: args.entityId, metadata: { action: args.action }, universityId: args.universityId });
  return a;
}

export async function decideApproval(args: {
  approvalId: string;
  decidedById?: string | null;
  approve: boolean;
  note?: string | null;
  enforceSegregation?: boolean; // when true, decider must differ from requester
}) {
  const a = await prisma.approval.findUnique({ where: { id: args.approvalId } });
  if (!a) throw new Error('طلب الاعتماد غير موجود');
  if (a.state !== 'PENDING') throw new Error('تم البت في هذا الطلب بالفعل');
  if (args.enforceSegregation && args.decidedById && a.requestedById && args.decidedById === a.requestedById) {
    throw new Error('تعارض في الفصل بين الواجبات — يجب أن يعتمد الطلب شخص آخر');
  }
  const state: ApprovalState = args.approve ? 'APPROVED' : 'REJECTED';
  const updated = await prisma.approval.update({
    where: { id: args.approvalId },
    data: { state, decidedById: args.decidedById ?? null, decidedAt: new Date(), note: args.note ?? a.note },
  });
  await writeAudit(`finance.approval.${args.approve ? 'approve' : 'reject'}`, { targetType: a.entityType, targetId: a.entityId, metadata: { action: a.action }, universityId: a.universityId });
  return updated;
}

/** Has this entity+action been APPROVED (latest decision)? */
export async function isApproved(entityType: ApprovalEntity, entityId: string, action: ApprovalAction): Promise<boolean> {
  const a = await prisma.approval.findFirst({
    where: { entityType, entityId, action },
    orderBy: { createdAt: 'desc' },
  });
  return a?.state === 'APPROVED';
}
