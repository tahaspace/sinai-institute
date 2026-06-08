/**
 * RBAC runtime — loads a user's effective permission context at login and
 * provides the permission/scope checks the API routes and middleware consume.
 *
 * Design: docs/rbac-multitenant-design.md §3.4–3.5. The effective set is computed
 * ONCE at sign-in (and re-hydrated on a staleness window) and cached on the JWT,
 * so per-request checks are O(1) on an in-memory array (no DB hit, Edge-safe).
 */
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export interface AuthContext {
  universityId: string | null; // null only for platform admin
  isPlatformAdmin: boolean;
  roleKeys: string[];
  permissions: string[]; // flattened effective permission keys ('*' for platform)
  scope: { facultyIds: string[]; departmentIds: string[] }; // [] = unrestricted within tenant
  disabledFeatures: string[]; // feature-flag keys explicitly turned OFF for this tenant (features default ON)
}

const PLATFORM_CONTEXT: AuthContext = {
  universityId: null,
  isPlatformAdmin: true,
  roleKeys: ['SUPER_ADMIN'],
  permissions: ['*'],
  scope: { facultyIds: [], departmentIds: [] },
  disabledFeatures: [],
};

/**
 * Build the effective AuthContext for a user id. Falls back to the platform
 * bundle for the hardcoded super-admin (no DB row) or any user flagged
 * isPlatformAdmin / holding a platform SUPER_ADMIN role.
 */
export async function loadAuthContext(userId: string, legacyRole?: string): Promise<AuthContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });

  // Hardcoded super-admin (not a DB row) or explicit platform flag.
  if (!user) return legacyRole === 'SUPER_ADMIN' ? PLATFORM_CONTEXT : { ...PLATFORM_CONTEXT, isPlatformAdmin: false, roleKeys: [], permissions: [] };
  if (user.isPlatformAdmin) return PLATFORM_CONTEXT;

  const roleKeys: string[] = [];
  const permissions = new Set<string>();
  const facultyIds = new Set<string>();
  const departmentIds = new Set<string>();

  for (const ur of user.userRoles) {
    roleKeys.push(ur.role.key);
    if (ur.role.key === 'SUPER_ADMIN') return PLATFORM_CONTEXT; // safety
    for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
    if (ur.facultyId) facultyIds.add(ur.facultyId);
    if (ur.departmentId) departmentIds.add(ur.departmentId);
  }

  // Feature flags default ON; only explicitly-disabled (enabled=false) keys for
  // this tenant are carried so middleware/guards can hide/deny those areas.
  const disabled = user.universityId
    ? await prisma.featureFlag.findMany({ where: { universityId: user.universityId, enabled: false }, select: { key: true } })
    : [];

  return {
    universityId: user.universityId,
    isPlatformAdmin: false,
    roleKeys,
    permissions: [...permissions],
    scope: { facultyIds: [...facultyIds], departmentIds: [...departmentIds] },
    disabledFeatures: disabled.map((f) => f.key),
  };
}

/** A feature is enabled unless explicitly disabled for the tenant (platform admin: always on). */
export function featureEnabled(ctx: Pick<AuthContext, 'isPlatformAdmin' | 'disabledFeatures'> | null | undefined, key: string): boolean {
  if (!ctx) return true;
  if (ctx.isPlatformAdmin) return true;
  return !(ctx.disabledFeatures ?? []).includes(key);
}

// ---- pure checks (operate on a session-like object) -----------------------
type Checkable = Pick<AuthContext, 'isPlatformAdmin' | 'permissions'> & Partial<AuthContext>;

export function hasPermission(ctx: Checkable | null | undefined, key: string): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformAdmin || ctx.permissions.includes('*')) return true;
  if (ctx.permissions.includes(key)) return true;
  // honor a stored 'resource.*' grant if present
  const prefix = key.slice(0, key.indexOf('.') + 1);
  return ctx.permissions.includes(prefix + '*');
}

export function hasAnyPermission(ctx: Checkable | null | undefined, keys: string[]): boolean {
  return keys.some((k) => hasPermission(ctx, k));
}

/** True if the assignment scope covers the target faculty/department. [] = unrestricted. */
export function inScope(ctx: Checkable | null | undefined, target: { facultyId?: string | null; departmentId?: string | null }): boolean {
  if (!ctx) return false;
  if (ctx.isPlatformAdmin) return true;
  const s = ctx.scope ?? { facultyIds: [], departmentIds: [] };
  if (target.departmentId && s.departmentIds.length && !s.departmentIds.includes(target.departmentId)) return false;
  if (target.facultyId && s.facultyIds.length && !s.facultyIds.includes(target.facultyId)) return false;
  return true;
}

type GuardOk = { ok: true; ctx: AuthContext };
type GuardErr = { ok: false; status: number; error: string };

/**
 * API guard. Returns the SAME shape as lib/student.ts requireStaff()
 * ({ok}|{ok,status,error}) so existing routes can swap one line.
 */
export async function requirePermission(
  key: string,
  opts?: { facultyId?: string | null; departmentId?: string | null }
): Promise<GuardOk | GuardErr> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, status: 401, error: 'غير مصرح' };
  const ctx = sessionToCtx(session);
  if (!hasPermission(ctx, key)) return { ok: false, status: 403, error: 'غير مصرح لهذا الإجراء' };
  if (opts && !inScope(ctx, opts)) return { ok: false, status: 403, error: 'خارج نطاق الصلاحية' };
  return { ok: true, ctx };
}

/** API guard: rejects (404) when the feature is disabled for the caller's tenant. */
export async function requireFeature(key: string): Promise<GuardOk | GuardErr> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, status: 401, error: 'غير مصرح' };
  const ctx = sessionToCtx(session);
  if (!featureEnabled(ctx, key)) return { ok: false, status: 404, error: 'هذه الخدمة غير مفعّلة' };
  return { ok: true, ctx };
}

/** Pull the AuthContext fields off a NextAuth session object. */
export function sessionToCtx(session: Session | null): AuthContext {
  const u = (session?.user ?? {}) as Record<string, unknown>;
  return {
    universityId: (u.universityId as string | null) ?? null,
    isPlatformAdmin: Boolean(u.isPlatformAdmin),
    roleKeys: (u.roleKeys as string[]) ?? [],
    permissions: (u.permissions as string[]) ?? [],
    scope: (u.scope as AuthContext['scope']) ?? { facultyIds: [], departmentIds: [] },
    disabledFeatures: (u.disabledFeatures as string[]) ?? [],
  };
}
