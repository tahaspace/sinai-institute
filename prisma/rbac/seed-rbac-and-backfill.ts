/**
 * PHASE 2+3 — tenant backfill + RBAC seed (TEST-ONLY, idempotent).
 *
 * 1. Create the default University (sinai) + a default Faculty.
 * 2. Stamp universityId (and facultyId where applicable) onto every existing row.
 * 3. Seed the global Permission catalog.
 * 4. Seed the platform SUPER_ADMIN role + the per-tenant system roles + their RolePermissions.
 * 5. Backfill UserRole from each user's legacy `role` string (the back-compat keystone),
 *    distinguishing معيد (TEACHING_ASSISTANT) from PROFESSOR via the linked Instructor.title.
 *
 * Re-runnable: every write is an upsert / updateMany-where-null.
 *   DATABASE_URL="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public" \
 *     npx tsx prisma/rbac/seed-rbac-and-backfill.ts
 */
import { PrismaClient } from '@prisma/client';
import { PERMISSION_KEYS, SYSTEM_ROLES, LEGACY_ROLE_MAP, expandPermissions } from './catalog';

const url = process.env.DATABASE_URL || '';
if (!/(@(127\.0\.0\.1|localhost))[:/]/.test(url) && process.env.ALLOW_REMOTE_SEED !== '1') {
  console.error('\nRefusing to run: DATABASE_URL is not a local host. Test-only script.\n');
  process.exit(1);
}
const prisma = new PrismaClient();

// direct-scoped model accessors that received a plain `universityId` column
const DIRECT_SCOPED = [
  'student', 'instructor', 'course', 'program', 'result', 'schedule', 'news', 'page',
  'widgetTemplate', 'application', 'complaint', 'contactMessage', 'studyPlanItem',
  'examCommittee', 'controlTask', 'qualityIndicator', 'partnership', 'trainee', 'trainer',
  'activity', 'certificate', 'marketingCampaign', 'message', 'payroll', 'bankAccount',
  'book', 'reward', 'badge', 'lMSContent', 'forumCategory', 'virtualClass',
  'courseEquivalenceRequest', 'transferRequest', 'gradeStatus', 'setting',
] as const;
const WITH_FACULTY = ['student', 'instructor', 'course', 'program'] as const;

async function main() {
  // ---- 1) University + Faculty -------------------------------------------
  const uni = await prisma.university.upsert({
    where: { slug: 'sinai' },
    update: {},
    create: { slug: 'sinai', nameAr: 'معهد سيناء العالي للدراسات النوعية', nameEn: 'Sinai Higher Institute', isActive: true },
  });
  let faculty = await prisma.faculty.findFirst({ where: { universityId: uni.id } });
  if (!faculty) {
    faculty = await prisma.faculty.create({ data: { universityId: uni.id, nameAr: 'الكلية الرئيسية', nameEn: 'Main Faculty', order: 0 } });
  }

  // ---- 2) Stamp tenant on existing rows ----------------------------------
  await prisma.department.updateMany({ where: { universityId: null }, data: { universityId: uni.id, facultyId: faculty.id } });
  let stamped = 0;
  for (const m of DIRECT_SCOPED) {
    const r = await (prisma as any)[m].updateMany({ where: { universityId: null }, data: { universityId: uni.id } });
    stamped += r.count;
  }
  for (const m of WITH_FACULTY) {
    await (prisma as any)[m].updateMany({ where: { facultyId: null }, data: { facultyId: faculty.id } });
  }
  // platform admins keep universityId=null; everyone else joins the tenant
  await prisma.user.updateMany({ where: { role: 'SUPER_ADMIN' }, data: { isPlatformAdmin: true, universityId: null } });
  await prisma.user.updateMany({ where: { universityId: null, isPlatformAdmin: false }, data: { universityId: uni.id } });

  // ---- 3) Permission catalog (global) ------------------------------------
  for (const key of PERMISSION_KEYS) {
    const idx = key.lastIndexOf('.');
    const resource = key.slice(0, idx);
    const action = key.slice(idx + 1);
    await prisma.permission.upsert({ where: { key }, update: { resource, action }, create: { key, resource, action } });
  }
  const allPerms = await prisma.permission.findMany();
  const permId = new Map(allPerms.map((p) => [p.key, p.id]));

  // ---- 4) Roles + RolePermissions ----------------------------------------
  async function seedRole(def: (typeof SYSTEM_ROLES)[number], universityId: string | null) {
    // NOTE: can't upsert on the compound unique when universityId is null (Prisma limitation),
    // so find-then-create/update explicitly.
    const found = await prisma.role.findFirst({ where: { universityId, key: def.key } });
    const role = found
      ? await prisma.role.update({ where: { id: found.id }, data: { nameAr: def.nameAr, nameEn: def.nameEn, isSystem: true } })
      : await prisma.role.create({ data: { universityId, key: def.key, nameAr: def.nameAr, nameEn: def.nameEn, isSystem: true } });
    const keys = expandPermissions(def.permissions);
    // reset to the canonical set (idempotent)
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const rows = keys.map((k) => permId.get(k)).filter(Boolean).map((pid) => ({ roleId: role.id, permissionId: pid as string }));
    if (rows.length) await prisma.rolePermission.createMany({ data: rows, skipDuplicates: true });
    return role;
  }
  const roleByKey = new Map<string, string>(); // key -> roleId (tenant roles for this uni)
  for (const def of SYSTEM_ROLES) {
    if (def.isPlatform) {
      const r = await seedRole(def, null);
      roleByKey.set(def.key, r.id);
    } else {
      const r = await seedRole(def, uni.id);
      roleByKey.set(def.key, r.id);
    }
  }

  // ---- 5) Backfill UserRole from legacy role strings ---------------------
  const users = await prisma.user.findMany();
  let assigned = 0;
  for (const u of users) {
    let roleKey = LEGACY_ROLE_MAP[u.role] ?? 'INSTITUTE_ADMIN'; // unknown staff -> conservative
    if (u.role === 'FACULTY') {
      const inst = await prisma.instructor.findFirst({ where: { userId: u.id } });
      if (inst?.title && inst.title.includes('معيد')) roleKey = 'TEACHING_ASSISTANT';
    }
    const roleId = roleByKey.get(roleKey);
    if (!roleId) continue;
    // unscoped assignment (facultyId/departmentId null); @@unique guards duplicates
    const existing = await prisma.userRole.findFirst({ where: { userId: u.id, roleId, facultyId: null, departmentId: null } });
    if (!existing) { await prisma.userRole.create({ data: { userId: u.id, roleId } }); assigned += 1; }
  }

  // ---- summary -----------------------------------------------------------
  console.log('seed-rbac-and-backfill OK:', JSON.stringify({
    university: uni.slug,
    faculty: faculty.id.slice(0, 8),
    stampedDirectRows: stamped,
    permissions: await prisma.permission.count(),
    roles: await prisma.role.count(),
    rolePermissions: await prisma.rolePermission.count(),
    users: users.length,
    userRolesAssignedNow: assigned,
    userRolesTotal: await prisma.userRole.count(),
  }));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
