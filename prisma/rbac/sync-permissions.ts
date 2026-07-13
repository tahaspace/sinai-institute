/**
 * Additive RBAC catalog sync (prod-safe, idempotent).
 *
 * Brings the DB up to date with prisma/rbac/catalog.ts WITHOUT the destructive parts of
 * seed-rbac-and-backfill.ts (no deleteMany, no tenant re-stamp, no UserRole backfill):
 *   1. upsert every PERMISSION_KEYS row (adds newly-declared keys)
 *   2. for each existing Role that matches a SYSTEM_ROLES def, ADD any missing RolePermission
 *      links (createMany skipDuplicates) — never removes an existing grant.
 *
 * Re-runnable; a second run adds nothing. Requires an explicit opt-in for a remote DB:
 *   DATABASE_URL="<neon>" ALLOW_REMOTE_SEED=1 npx tsx prisma/rbac/sync-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { PERMISSION_KEYS, SYSTEM_ROLES, expandPermissions } from './catalog';

const url = process.env.DATABASE_URL || '';
if (process.env.ALLOW_REMOTE_SEED !== '1' && !/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
  console.error('\nRefusing: remote DATABASE_URL. Set ALLOW_REMOTE_SEED=1 to sync a remote DB.\n');
  process.exit(1);
}
const prisma = new PrismaClient();

async function main() {
  // 1) permission catalog (additive upsert)
  let permAdded = 0;
  for (const key of PERMISSION_KEYS) {
    const i = key.lastIndexOf('.');
    const resource = key.slice(0, i);
    const action = key.slice(i + 1);
    const before = await prisma.permission.findUnique({ where: { key } });
    await prisma.permission.upsert({ where: { key }, update: { resource, action }, create: { key, resource, action } });
    if (!before) permAdded++;
  }
  const permId = new Map((await prisma.permission.findMany()).map((p) => [p.key, p.id]));
  const defByKey = new Map(SYSTEM_ROLES.map((d) => [d.key, d]));

  // 2) add missing role→permission links for every existing role matching a catalog def
  const roles = await prisma.role.findMany();
  let linksAdded = 0;
  const perRole: Record<string, number> = {};
  for (const role of roles) {
    const def = defByKey.get(role.key);
    if (!def) continue;
    const wantIds = expandPermissions(def.permissions).map((k) => permId.get(k)).filter((v): v is string => !!v);
    const have = new Set((await prisma.rolePermission.findMany({ where: { roleId: role.id }, select: { permissionId: true } })).map((r) => r.permissionId));
    const missing = wantIds.filter((pid) => !have.has(pid));
    if (missing.length) {
      await prisma.rolePermission.createMany({ data: missing.map((pid) => ({ roleId: role.id, permissionId: pid })), skipDuplicates: true });
      linksAdded += missing.length;
      perRole[role.key] = (perRole[role.key] ?? 0) + missing.length;
    }
  }

  console.log('sync-permissions OK:', JSON.stringify({ permAdded, linksAdded, perRole, totalPermissions: permId.size, roles: roles.length }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
