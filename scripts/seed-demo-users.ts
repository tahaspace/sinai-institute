/**
 * TEST-ONLY: one demo login per role so every role can be exercised.
 * Uniform password for the new staff accounts: Sinai@12345.
 * Existing demo.student/faculty/parent accounts keep their own passwords.
 * Idempotent (upsert by email). Localhost-guarded.
 *   DATABASE_URL="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public" \
 *     npx tsx scripts/seed-demo-users.ts
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const url = process.env.DATABASE_URL || '';
if (!/(@(127\.0\.0\.1|localhost))[:/]/.test(url) && process.env.ALLOW_REMOTE_SEED !== '1') {
  console.error('\nRefusing to run: DATABASE_URL is not a local host.\n');
  process.exit(1);
}
const prisma = new PrismaClient();
const PASSWORD = 'Sinai@12345';

// roleKey -> demo email local-part. (STUDENT/PROFESSOR/PARENT already have demo.* accounts.)
const ROLE_ACCOUNTS: Record<string, string> = {
  INSTITUTE_ADMIN: 'dean',
  FACULTY_ADMIN: 'faculty.admin',
  DEPARTMENT_HEAD: 'dept.head',
  CFO: 'cfo',
  FINANCE: 'finance',
  ACCOUNTANT: 'accountant',
  REGISTRAR: 'registrar',
  ADMISSIONS: 'admissions',
  EXAMS_CONTROL: 'control',
  LIBRARIAN: 'librarian',
  QUALITY: 'quality',
  HR: 'hr',
  MARKETING: 'marketing',
  CMS_EDITOR: 'editor',
  TEACHING_ASSISTANT: 'ta',
};

async function main() {
  const uni = await prisma.university.findFirst({ where: { slug: 'sinai' } });
  if (!uni) throw new Error('default university not found — run seed-rbac-and-backfill first');
  const pw = await hash(PASSWORD, 10);
  const out: { email: string; role: string }[] = [];

  for (const [roleKey, local] of Object.entries(ROLE_ACCOUNTS)) {
    const role = await prisma.role.findFirst({ where: { universityId: uni.id, key: roleKey } });
    if (!role) { console.warn('skip (role missing):', roleKey); continue; }
    const email = `${local}@sinaiinstitute.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { universityId: uni.id, password: pw, role: roleKey },
      create: { email, name: role.nameAr, password: pw, role: roleKey, universityId: uni.id, isPlatformAdmin: false },
    });
    // ensure the UserRole assignment (unscoped) exists
    const existing = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id, facultyId: null, departmentId: null } });
    if (!existing) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    out.push({ email, role: roleKey });
  }

  console.log(`seed-demo-users OK: ${out.length} role accounts ensured (password "${PASSWORD}")`);
  out.forEach((o) => console.log(`  ${o.email}  ->  ${o.role}`));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
