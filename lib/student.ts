import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// The single place that maps a request to its Student. In production this is
// STRICT: only the logged-in session (Student.userId) resolves — no studentCode
// spoofing, no demo fallback. The seeded-demo / studentCode-param convenience is
// gated to non-production so the test build stays usable without real logins.
export const DEMO_STUDENT_CODE = '2024-105';
const DEV_FALLBACK = process.env.NODE_ENV !== 'production';

export async function resolveStudent(studentCodeParam?: string | null) {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  if (sessionUserId) {
    const linked = await prisma.student.findUnique({ where: { userId: sessionUserId } });
    if (linked) return linked;
  }
  if (!DEV_FALLBACK) return null; // production: session-linked student only
  const code = studentCodeParam || DEMO_STUDENT_CODE;
  return prisma.student.findUnique({ where: { studentCode: code } });
}

// Dev fallbacks for the test build — only honored when NODE_ENV !== 'production'.
const DEMO_FACULTY_EMAIL = 'demo.faculty@sinaiinstitute.test';
const DEMO_PARENT_EMAIL = 'demo.parent@sinaiinstitute.test';

async function sessionUserId(): Promise<string | undefined> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id;
}

// The Instructor for the logged-in faculty user (falls back to the demo faculty).
export async function resolveInstructor() {
  const uid = await sessionUserId();
  if (uid) {
    const byUser = await prisma.instructor.findUnique({ where: { userId: uid } });
    if (byUser) return byUser;
  }
  if (!DEV_FALLBACK) return null; // production: session-linked instructor only
  return prisma.instructor.findFirst({ where: { email: DEMO_FACULTY_EMAIL } });
}

// The parent User id for the logged-in parent (falls back to the demo parent).
async function resolveParentUserId(): Promise<string | null> {
  const uid = await sessionUserId();
  if (uid) {
    const g = await prisma.guardian.findFirst({ where: { userId: uid } });
    if (g) return uid;
  }
  if (!DEV_FALLBACK) return null; // production: session-linked parent only
  const pu = await prisma.user.findUnique({ where: { email: DEMO_PARENT_EMAIL } });
  return pu?.id ?? null;
}

// The logged-in user's id (any role), or null. Used by cross-role features
// like messaging where the inbox owner can be a student/faculty/parent/admin.
export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

// Guards an authenticated API (any logged-in role). Used by mixed-audience
// areas like the LMS that both students and faculty use.
export async function requireSession(): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, status: 401, error: 'غير مصرح' };
  return { ok: true };
}

// Guards a staff-only (institute/CMS) API: rejects no-session and the
// student/faculty/parent roles. Returns { ok } or an error + status.
export async function requireStaff(): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, status: 401, error: 'غير مصرح' };
  const role = (session.user as { role?: string } | undefined)?.role;
  if (role && ['STUDENT', 'FACULTY', 'PARENT'].includes(role)) {
    return { ok: false, status: 403, error: 'غير مصرح لهذا الدور' };
  }
  return { ok: true };
}

// The Student rows linked to the logged-in parent via Guardian.userId.
export async function resolveParentStudents() {
  const uid = await resolveParentUserId();
  if (!uid) return [];
  const guardians = await prisma.guardian.findMany({
    where: { userId: uid },
    include: { student: true },
  });
  return guardians.map((g) => g.student);
}
