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

/**
 * Lookup scope for rows that may predate multi-tenancy.
 *
 * `Program` (and `FeeStructure`) carry a nullable `universityId`, but no code path in the app ever
 * sets it — every row created so far is untenanted. A strict `universityId: ctx.universityId` filter
 * therefore matches NOTHING for a user whose context has a university, which silently empties
 * programme pickers and turns "programme not found" into a lockout rather than a permission error.
 * Unlike `tenantWhere` above, this accepts the tenant's own rows OR untenanted ones — and never
 * another tenant's. Once programmes carry a university, backfill the legacy nulls and tighten this.
 */
export const tenantOrGlobalWhere = (universityId?: string | null) =>
  universityId ? { OR: [{ universityId }, { universityId: null }] } : {};
