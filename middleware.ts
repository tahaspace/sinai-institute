import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Permission-based gating (P6). Reads the RBAC fields baked onto the JWT at
 * login (lib/auth.ts): permissions[], roleKeys[], isPlatformAdmin. Edge-safe —
 * no DB, no Prisma; everything comes from the token.
 *
 * Safety: a logged-in user denied an area is redirected to THEIR landing (never
 * a hard /login lockout), with a loop guard so they can always reach a page.
 */

// Area prefix -> permissions that may ENTER it (any-of). Most-specific first.
const AREA_RULES: Array<[string, string[]]> = [
  ['/admin', ['__platform__']], // platform admin only (isPlatformAdmin handles it)
  ['/student', ['student.portal.access']],
  ['/faculty', ['faculty.portal.access']],
  ['/parent', ['parent.portal.access']],
  ['/assistant', ['ta.portal.access', 'faculty.portal.access']],
  ['/lms', ['lms.learner.access', 'lms.instructor.access']],
  ['/cms', ['cms.page.view', 'cms.page.edit', 'cms.news.edit']],
  ['/accountant', ['finance.view', 'accounting.view']],
  ['/library-admin', ['library.view']],
  ['/student-affairs', ['student.view', 'advising.view']],
  ['/admission-admin', ['admission.application.view', 'admission.registration.view']],
  ['/institute/finance', ['finance.view']],
  ['/institute/accounting', ['finance.view', 'accounting.view']],
  ['/institute/payroll', ['payroll.view']],
  ['/institute/banking', ['banking.view']],
  ['/institute/online-exams', ['onlineexam.view']],
  ['/institute/exams', ['exam.schedule.view', 'exam.control.view', 'exam.grade.view']],
  ['/institute/students', ['student.view', 'advising.view']],
  ['/institute/admission', ['admission.registration.view', 'admission.application.view', 'transfer.view', 'equivalence.view']],
  ['/institute/library', ['library.view']],
  ['/institute/quality', ['quality.view']],
  ['/institute/hr', ['hr.staff.view']],
  ['/institute/marketing', ['marketing.manage']],
  ['/institute/reports', ['reports.view', 'institute.reports.view']],
  ['/institute', ['institute.dashboard.view', 'department.view', 'student.view', 'finance.view', 'exam.schedule.view']],
];

// roleKey -> landing path, in priority order (first match a user holds wins).
const LANDING: Array<[string, string]> = [
  ['SUPER_ADMIN', '/admin/dashboard'],
  ['INSTITUTE_ADMIN', '/institute/dashboard'],
  ['FACULTY_ADMIN', '/institute/dashboard'],
  ['DEPARTMENT_HEAD', '/institute/dashboard'],
  ['CFO', '/institute/finance/cfo-dashboard'],
  ['FINANCE', '/institute/accounting/dashboard'],
  ['ACCOUNTANT', '/accountant/dashboard'],
  ['REGISTRAR', '/student-affairs/dashboard'],
  ['ADMISSIONS', '/institute/admission'],
  ['EXAMS_CONTROL', '/institute/exams'],
  ['LIBRARIAN', '/library-admin/dashboard'],
  ['QUALITY', '/institute/quality'],
  ['HR', '/institute/faculty'],
  ['MARKETING', '/institute/marketing'],
  ['PROFESSOR', '/faculty/dashboard'],
  ['TEACHING_ASSISTANT', '/assistant/dashboard'],
  ['CMS_EDITOR', '/cms/dashboard'],
  ['STUDENT', '/student/dashboard'],
  ['PARENT', '/parent/dashboard'],
];

function matchArea(path: string): string[] | null {
  for (const [prefix, perms] of AREA_RULES) {
    if (path === prefix || path.startsWith(prefix + '/')) return perms;
  }
  return null;
}

// Area prefix -> the feature-flag key that must be enabled for the tenant.
// Most-specific first. Features default ON; only an explicit per-tenant OFF blocks.
const AREA_FEATURE: Array<[string, string]> = [
  ['/institute/online-exams', 'exams.online'],
  ['/institute/banking', 'finance.banking'],
  ['/institute/payroll', 'finance.payroll'],
  ['/institute/library', 'library.enabled'],
  ['/institute/quality', 'quality.enabled'],
  ['/institute/admission/transfers', 'admission.transfers'],
  ['/institute/admission/equivalence', 'admission.transfers'],
  ['/library-admin', 'library.enabled'],
  ['/student/gamification', 'gamification.enabled'],
  ['/lms', 'lms.enabled'],
];

function matchFeature(path: string): string | null {
  for (const [prefix, feat] of AREA_FEATURE) {
    if (path === prefix || path.startsWith(prefix + '/')) return feat;
  }
  return null;
}

function landingFor(roleKeys: string[], isPlatformAdmin: boolean): string {
  if (isPlatformAdmin) return '/admin/dashboard';
  for (const [key, path] of LANDING) if (roleKeys.includes(key)) return path;
  return '/login';
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as
      | { permissions?: string[]; roleKeys?: string[]; isPlatformAdmin?: boolean; disabledFeatures?: string[] }
      | null;
    const isAuth = !!token;
    const path = req.nextUrl.pathname;
    const isAuthPage = path.startsWith('/login');

    const perms = token?.permissions ?? [];
    const roleKeys = token?.roleKeys ?? [];
    const isPlatformAdmin = !!token?.isPlatformAdmin;
    const disabledFeatures = token?.disabledFeatures ?? [];
    const home = landingFor(roleKeys, isPlatformAdmin);

    // Logged-in users shouldn't sit on /login.
    if (isAuthPage) {
      return isAuth ? NextResponse.redirect(new URL(home, req.url)) : null;
    }

    const required = matchArea(path);
    if (!required) return null; // unmatched (shouldn't happen given the matcher)

    // Unauthenticated -> sign in.
    if (!isAuth) return NextResponse.redirect(new URL('/login', req.url));

    // Platform admin bypasses every gate (incl. tenant feature flags).
    if (isPlatformAdmin || perms.includes('*')) return NextResponse.next();

    // Feature gate: if the area's feature is OFF for this tenant, send home
    // (applies even if the user has the permission). Loop-guarded.
    const feat = matchFeature(path);
    if (feat && disabledFeatures.includes(feat)) {
      if (home === path || path.startsWith(home + '/')) return NextResponse.next();
      return NextResponse.redirect(new URL(home, req.url));
    }

    // /admin requires the platform flag.
    if (required[0] === '__platform__') {
      return NextResponse.redirect(new URL(home, req.url));
    }

    // Allow if the user holds any of the area's permissions.
    if (required.some((p) => perms.includes(p))) return NextResponse.next();

    // Denied: send to their landing — unless that IS the current path (loop guard).
    if (home === path || path.startsWith(home + '/')) return NextResponse.next();
    return NextResponse.redirect(new URL(home, req.url));
  },
  { callbacks: { authorized: () => true } }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/cms/:path*',
    '/institute/:path*',
    '/accountant/:path*',
    '/library-admin/:path*',
    '/student-affairs/:path*',
    '/admission-admin/:path*',
    '/student/:path*',
    '/faculty/:path*',
    '/parent/:path*',
    '/assistant/:path*',
    '/lms/:path*',
    '/login',
  ],
};
