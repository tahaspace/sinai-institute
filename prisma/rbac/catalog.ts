/**
 * RBAC catalog — the single source of truth for permission keys, the default
 * system roles and their permission sets, and the legacy-role mapping.
 * Consumed by the seed/backfill and (later) by lib/authz.ts.
 *
 * Permission key format: `resource.action` (resource may contain dots).
 * `*`  = every permission (platform owner).
 * `ALL_TENANT` (role marker) = every non-platform permission (institute admin).
 */

// ---- Permission catalog ---------------------------------------------------
export const PERMISSION_KEYS: string[] = [
  // Platform (cross-tenant)
  'platform.tenant.view', 'platform.tenant.create', 'platform.tenant.edit', 'platform.tenant.delete',
  'platform.user.manage', 'platform.role.manage', 'platform.feature.manage', 'platform.audit.view',
  // Institute oversight
  'institute.dashboard.view', 'institute.reports.view', 'institute.reports.export',
  'institute.settings.view', 'institute.settings.edit',
  // Org structure (college = Faculty unit, to disambiguate from teaching faculty)
  'college.view', 'college.edit',
  'department.view', 'department.create', 'department.edit', 'department.delete',
  'program.view', 'program.edit', 'course.view', 'course.edit', 'plan.view', 'plan.edit',
  // Students / affairs
  'student.view', 'student.create', 'student.edit',
  'advising.view', 'advising.edit', 'warning.view', 'warning.create',
  'attendance.view', 'attendance.edit', 'graduation.view', 'graduation.approve',
  'certificate.view', 'certificate.issue',
  // Admission
  'admission.application.view', 'admission.application.review', 'admission.application.decide',
  'admission.registration.view', 'admission.registration.edit',
  'transfer.view', 'transfer.approve', 'equivalence.view', 'equivalence.approve',
  // Exams
  'exam.schedule.view', 'exam.schedule.edit', 'exam.questionbank.view', 'exam.questionbank.edit',
  'exam.grade.view', 'exam.grade.edit', 'exam.control.view', 'exam.control.edit',
  'exam.result.view', 'exam.result.publish', 'exam.appeal.view', 'exam.appeal.resolve',
  // ClientR2 — exceptional-case state workflow (executor = control; approver = control head / student affairs)
  'exam.exception.view', 'exam.exception.set', 'exam.exception.approve',
  'onlineexam.view', 'onlineexam.manage', 'onlineexam.grade',
  // Finance
  'finance.view', 'finance.tuition.view', 'finance.tuition.edit',
  'finance.collection.view', 'finance.collection.edit',
  'finance.installment.view', 'finance.installment.edit',
  'finance.scholarship.view', 'finance.scholarship.approve',
  'finance.payment.view', 'finance.payment.approve', 'finance.payment.refund',
  'finance.report.view', 'finance.report.export',
  // Payroll / banking / accounting
  'payroll.view', 'payroll.edit', 'payroll.run', 'payroll.approve',
  'banking.view', 'banking.edit', 'accounting.view', 'accounting.edit',
  // Finance v2 — professional accounting upgrade (GL, periods, AR docs, AP, e-invoicing, budgeting)
  'finance.gl.account.view', 'finance.gl.account.edit',
  'finance.gl.journal.view', 'finance.gl.journal.create', 'finance.gl.journal.post', 'finance.gl.journal.reverse',
  'finance.period.view', 'finance.period.manage', 'finance.period.close',
  'finance.invoice.view', 'finance.invoice.issue', 'finance.invoice.void',
  'finance.receipt.view', 'finance.receipt.create', 'finance.creditnote.create',
  'finance.payment.create',
  'finance.einvoice.view', 'finance.einvoice.create', 'finance.einvoice.submit', 'finance.einvoice.cancel',
  'finance.vendor.view', 'finance.vendor.edit',
  'finance.expense.view', 'finance.expense.edit', 'finance.expense.approve',
  'finance.budget.view', 'finance.budget.edit',
  'banking.reconciliation.view', 'banking.reconciliation.edit',
  // ClientR4 — cost-centre & branch profitability dimension
  'finance.costcenter.view', 'finance.costcenter.edit',
  // Library
  'library.view', 'library.book.edit', 'library.loan.manage',
  // HR
  'hr.staff.view', 'hr.staff.edit', 'workload.view', 'workload.edit',
  // Quality / reports
  'quality.view', 'quality.edit', 'reports.view', 'reports.export',
  // ClientR3 — Reporting & Analytics families (hub access per family)
  'reports.ministry.view', 'reports.academic.view', 'reports.attendance.view',
  'reports.financial.view', 'reports.executive.view', 'reports.analytical.view',
  'reports.predictive.view', 'reports.audit.view',
  // ClientR4 — detailed result sheets (transcript / graduates / level roster)
  'reports.transcripts.view',
  // CMS
  'cms.page.view', 'cms.page.edit', 'cms.news.edit', 'cms.news.publish',
  'cms.result.edit', 'cms.schedule.edit', 'cms.application.view',
  'cms.complaint.view', 'cms.complaint.resolve', 'cms.media.upload', 'cms.message.view',
  // Teaching / LMS
  'faculty.portal.access', 'faculty.grade.edit', 'faculty.research.edit', 'faculty.officehours.edit',
  'ta.portal.access', 'lms.instructor.access', 'lms.learner.access',
  'lms.content.view', 'lms.content.edit', 'lms.assignment.grade', 'lms.forum.moderate',
  // Communication
  'communication.view', 'communication.send', 'messages.view', 'messages.send',
  // Misc admin areas
  'marketing.manage', 'partnerships.manage', 'trainees.manage', 'trainers.manage',
  'activities.view', 'activities.edit', 'settings.view', 'settings.edit',
  // Self-service (portals)
  'student.portal.access', 'parent.portal.access',
  'self.profile.view', 'self.grades.view', 'self.schedule.view',
  'self.registration.edit', 'self.fees.view', 'self.children.view',
];

export type RoleDef = {
  key: string;
  nameAr: string;
  nameEn: string;
  isPlatform?: boolean;      // universityId = null
  defaultScope?: 'faculty' | 'department'; // documentation; backfill assigns unscoped
  permissions: string[];     // keys, or '*' / 'ALL_TENANT', or 'prefix.*' wildcards
};

// ---- Default system roles -------------------------------------------------
export const SYSTEM_ROLES: RoleDef[] = [
  { key: 'SUPER_ADMIN', nameAr: 'مدير المنصة', nameEn: 'Platform Owner', isPlatform: true, permissions: ['*'] },
  { key: 'INSTITUTE_ADMIN', nameAr: 'مدير المعهد / العميد', nameEn: 'Institute Admin / Dean', permissions: ['ALL_TENANT'] },
  { key: 'FACULTY_ADMIN', nameAr: 'مدير الكلية', nameEn: 'Faculty/College Admin', defaultScope: 'faculty',
    permissions: ['college.view', 'department.*', 'program.*', 'course.*', 'plan.*', 'student.view', 'student.edit',
      'advising.*', 'warning.*', 'attendance.*', 'graduation.view', 'exam.*', 'onlineexam.*', 'workload.*',
      'hr.staff.view', 'quality.view', 'institute.dashboard.view', 'reports.view', 'communication.send'] },
  { key: 'DEPARTMENT_HEAD', nameAr: 'رئيس القسم', nameEn: 'Department Head', defaultScope: 'department',
    permissions: ['department.view', 'program.view', 'plan.view', 'plan.edit', 'course.view', 'student.view',
      'advising.view', 'hr.staff.view', 'workload.view', 'workload.edit', 'exam.grade.view', 'exam.result.view',
      'admission.registration.view', 'institute.dashboard.view', 'reports.view'] },
  { key: 'CFO', nameAr: 'المدير المالي', nameEn: 'CFO', permissions: ['finance.*', 'payroll.*', 'banking.*', 'accounting.*', 'institute.dashboard.view', 'reports.view', 'reports.export'] },
  { key: 'FINANCE', nameAr: 'موظف مالية', nameEn: 'Finance', permissions: ['finance.view', 'finance.tuition.*', 'finance.collection.*', 'finance.installment.*', 'finance.scholarship.view', 'finance.report.view', 'accounting.view', 'reports.view',
    // Finance v2 cashier/front-desk: read invoices, take receipts, initiate online payments
    'finance.invoice.view', 'finance.receipt.view', 'finance.receipt.create', 'finance.payment.create'] },
  { key: 'ACCOUNTANT', nameAr: 'محاسب', nameEn: 'Accountant', permissions: ['accounting.*', 'finance.view', 'finance.collection.*', 'finance.tuition.view', 'banking.view', 'finance.report.view', 'reports.view',
    // Finance v2 bookkeeping (maker): COA + draft journals + AR/AP docs + e-invoicing + reconciliation.
    // post / approve / period-close stay with CFO (maker-checker via finance.* wildcard).
    'finance.gl.account.view', 'finance.gl.account.edit', 'finance.gl.journal.view', 'finance.gl.journal.create',
    'finance.period.view', 'finance.invoice.*', 'finance.receipt.*', 'finance.creditnote.create',
    'finance.einvoice.*', 'finance.vendor.*', 'finance.expense.view', 'finance.expense.edit', 'banking.reconciliation.*', 'finance.costcenter.view', 'finance.costcenter.edit'] },
  { key: 'REGISTRAR', nameAr: 'شؤون الطلاب / المسجل', nameEn: 'Registrar / Student Affairs', permissions: ['student.*', 'advising.*', 'warning.*', 'attendance.*', 'graduation.*', 'certificate.*', 'admission.registration.*', 'transfer.*', 'equivalence.*', 'cms.result.edit', 'cms.schedule.edit', 'reports.view', 'reports.transcripts.view', 'exam.exception.view', 'exam.exception.approve'] },
  { key: 'ADMISSIONS', nameAr: 'موظف القبول', nameEn: 'Admissions Officer', permissions: ['admission.*', 'student.view', 'student.create', 'cms.application.view', 'reports.view'] },
  { key: 'EXAMS_CONTROL', nameAr: 'الكنترول', nameEn: 'Exams Control', permissions: ['exam.*', 'onlineexam.*', 'cms.result.edit', 'reports.view', 'reports.transcripts.view'] },
  { key: 'LIBRARIAN', nameAr: 'أمين المكتبة', nameEn: 'Librarian', permissions: ['library.*', 'reports.view'] },
  { key: 'QUALITY', nameAr: 'ضمان الجودة', nameEn: 'Quality', permissions: ['quality.*', 'institute.reports.view', 'reports.view', 'reports.export'] },
  { key: 'HR', nameAr: 'الموارد البشرية', nameEn: 'Human Resources', permissions: ['hr.staff.*', 'workload.*', 'payroll.view', 'reports.view'] },
  { key: 'MARKETING', nameAr: 'التسويق', nameEn: 'Marketing', permissions: ['marketing.manage', 'partnerships.manage', 'cms.news.edit', 'communication.send'] },
  { key: 'PROFESSOR', nameAr: 'عضو هيئة تدريس', nameEn: 'Professor / Faculty', defaultScope: 'department',
    permissions: ['faculty.portal.access', 'faculty.grade.edit', 'faculty.research.edit', 'faculty.officehours.edit',
      'exam.questionbank.*', 'exam.grade.view', 'onlineexam.*', 'lms.instructor.access', 'lms.content.*',
      'lms.assignment.grade', 'lms.forum.moderate', 'communication.send', 'self.profile.view', 'messages.*'] },
  { key: 'TEACHING_ASSISTANT', nameAr: 'معيد', nameEn: 'Teaching Assistant', defaultScope: 'department',
    permissions: ['ta.portal.access', 'lms.instructor.access', 'lms.content.view', 'lms.assignment.grade',
      'exam.grade.view', 'onlineexam.grade', 'attendance.edit', 'communication.send', 'self.profile.view', 'messages.*'] },
  { key: 'CMS_EDITOR', nameAr: 'محرر المحتوى', nameEn: 'CMS Editor', permissions: ['cms.*', 'communication.view', 'settings.view'] },
  { key: 'STUDENT', nameAr: 'طالب', nameEn: 'Student', permissions: ['student.portal.access', 'self.profile.view', 'self.grades.view', 'self.schedule.view', 'self.registration.edit', 'self.fees.view', 'lms.learner.access', 'lms.content.view', 'messages.*'] },
  { key: 'PARENT', nameAr: 'ولي أمر', nameEn: 'Parent', permissions: ['parent.portal.access', 'self.children.view', 'self.grades.view', 'self.fees.view', 'messages.*'] },
];

// landing dashboard per role + priority (highest first) when a user holds many
export const ROLE_PRIORITY: string[] = [
  'SUPER_ADMIN', 'INSTITUTE_ADMIN', 'FACULTY_ADMIN', 'DEPARTMENT_HEAD', 'CFO', 'FINANCE', 'ACCOUNTANT',
  'REGISTRAR', 'ADMISSIONS', 'EXAMS_CONTROL', 'LIBRARIAN', 'QUALITY', 'HR', 'MARKETING',
  'PROFESSOR', 'TEACHING_ASSISTANT', 'CMS_EDITOR', 'STUDENT', 'PARENT',
];

export const LANDING_BY_ROLE: Record<string, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  INSTITUTE_ADMIN: '/institute/dashboard',
  FACULTY_ADMIN: '/institute/faculty-admin/dashboard',
  DEPARTMENT_HEAD: '/institute/department/dashboard',
  CFO: '/institute/finance/cfo-dashboard',
  FINANCE: '/institute/accounting/dashboard',
  ACCOUNTANT: '/accountant/dashboard',
  REGISTRAR: '/student-affairs/dashboard',
  ADMISSIONS: '/admission-admin/dashboard',
  EXAMS_CONTROL: '/institute/exams',
  LIBRARIAN: '/library-admin/dashboard',
  QUALITY: '/institute/quality',
  HR: '/institute/hr/dashboard',
  MARKETING: '/institute/marketing',
  PROFESSOR: '/faculty/dashboard',
  TEACHING_ASSISTANT: '/assistant/dashboard',
  CMS_EDITOR: '/cms/dashboard',
  STUDENT: '/student/dashboard',
  PARENT: '/parent/dashboard',
};

// Feature-flag catalog — toggled per-university in the admin panel (P7/P9).
export const FEATURE_FLAGS: { key: string; nameAr: string }[] = [
  { key: 'lms.enabled', nameAr: 'نظام إدارة التعلم (LMS)' },
  { key: 'exams.online', nameAr: 'الامتحانات الإلكترونية' },
  { key: 'finance.banking', nameAr: 'الخزينة والبنوك' },
  { key: 'finance.payroll', nameAr: 'الرواتب' },
  { key: 'library.enabled', nameAr: 'المكتبة' },
  { key: 'gamification.enabled', nameAr: 'التحفيز والنقاط' },
  { key: 'admission.transfers', nameAr: 'التحويلات والمعادلات' },
  { key: 'quality.enabled', nameAr: 'ضمان الجودة' },
];

// legacy User.role string -> new Role key (TEACHING_ASSISTANT decided at runtime via Instructor.title)
export const LEGACY_ROLE_MAP: Record<string, string> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  EDITOR: 'CMS_EDITOR',
  STUDENT: 'STUDENT',
  FACULTY: 'PROFESSOR',
  PARENT: 'PARENT',
};

/** Expand a role's permission list (handles '*', 'ALL_TENANT', and 'prefix.*'). */
export function expandPermissions(perms: string[]): string[] {
  const out = new Set<string>();
  for (const p of perms) {
    if (p === '*') return [...PERMISSION_KEYS];
    if (p === 'ALL_TENANT') { PERMISSION_KEYS.filter((k) => !k.startsWith('platform.')).forEach((k) => out.add(k)); continue; }
    if (p.endsWith('.*')) { const pre = p.slice(0, -1); PERMISSION_KEYS.filter((k) => k.startsWith(pre)).forEach((k) => out.add(k)); continue; }
    out.add(p);
  }
  return [...out];
}
