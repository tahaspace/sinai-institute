/**
 * Per-request tenant context (AsyncLocalStorage). A route opts into tenant
 * scoping by running its body inside `runWithTenant(ctx, () => ...)`. While a
 * context is active, the Prisma extension in lib/prisma.ts auto-filters reads
 * and auto-stamps writes for tenant-scoped models. When NO context is active
 * (scripts, un-migrated routes), the extension passes through unchanged — so
 * adopting this is incremental and non-breaking.
 *
 * Design: docs/rbac-multitenant-design.md §3.5.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantCtx {
  universityId: string | null; // null => platform admin
  facultyIds?: string[];
  departmentIds?: string[];
  bypass?: boolean; // platform admin / backfill: skip all tenant filtering
}

export const tenantStore = new AsyncLocalStorage<TenantCtx>();

export function getTenantCtx(): TenantCtx | undefined {
  return tenantStore.getStore();
}

/** Run `fn` with an active tenant context (scopes all Prisma calls inside). */
export function runWithTenant<T>(ctx: TenantCtx, fn: () => Promise<T>): Promise<T> {
  return tenantStore.run(ctx, fn);
}

/** Models that carry a denormalized `universityId` column (direct-scoped). */
export const TENANT_SCOPED_MODELS = new Set<string>([
  'Department', 'Student', 'Instructor', 'Course', 'Program', 'Result', 'Schedule',
  'News', 'Page', 'WidgetTemplate', 'Application', 'Complaint', 'ContactMessage',
  'StudyPlanItem', 'ExamCommittee', 'ControlTask', 'QualityIndicator', 'Partnership',
  'Trainee', 'Trainer', 'Activity', 'Certificate', 'MarketingCampaign', 'Message',
  'Payroll', 'BankAccount', 'Book', 'Reward', 'Badge', 'LMSContent', 'ForumCategory',
  'VirtualClass', 'CourseEquivalenceRequest', 'TransferRequest', 'GradeStatus',
  'StudentEnrollmentSuspension', 'StudentTraining', 'AcademicTerm', 'CoursePrerequisite',
  // NOTE: `Specialization` is deliberately NOT here — it has no universityId column and is scoped
  // through its programme instead. Listing it would make the extension inject a field that does not
  // exist and break every query against it.
  // NOTE: `Setting` is intentionally excluded — it allows platform-global rows
  // (universityId = null) and is handled explicitly via findFirst-by-key.
]);
