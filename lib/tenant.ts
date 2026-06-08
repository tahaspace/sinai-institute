/**
 * Explicit, reviewable tenant-scoping helpers for API routes that build their
 * own Prisma `where`. Complements the auto-injecting extension in lib/prisma.ts.
 *
 *   const guard = await requirePermission('student.view');
 *   if (!guard.ok) return ...;
 *   prisma.student.findMany({ where: tenantWhere(guard.ctx, { status: 'ACTIVE' }) });
 */
import type { AuthContext } from '@/lib/authz';

/** Adds `universityId` to a where clause (no-op for platform admin). */
export function tenantWhere<T extends Record<string, unknown>>(ctx: Pick<AuthContext, 'universityId' | 'isPlatformAdmin'>, extra: T = {} as T) {
  if (ctx.isPlatformAdmin || !ctx.universityId) return extra;
  return { ...extra, universityId: ctx.universityId };
}

/**
 * Tenant + faculty/department scope (for scoped roles like Department Head).
 * Empty scope arrays = unrestricted within the tenant.
 */
export function scopedWhere<T extends Record<string, unknown>>(ctx: AuthContext, extra: T = {} as T) {
  if (ctx.isPlatformAdmin) return extra;
  const w: Record<string, unknown> = { ...extra };
  if (ctx.universityId) w.universityId = ctx.universityId;
  if (ctx.scope?.departmentIds?.length) w.departmentId = { in: ctx.scope.departmentIds };
  else if (ctx.scope?.facultyIds?.length) w.facultyId = { in: ctx.scope.facultyIds };
  return w;
}
