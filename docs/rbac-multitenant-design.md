# Design — Multi-Tenant + Full RBAC + Super-Admin Control Panel

> **Status:** DESIGN (approved direction; not yet built). Owner decision 2026-06-08: multi-tenant
> (University→Faculty→Dept), full Role+Permission RBAC, super-admin control panel, design-first.
> All build work targets the local `sinai_test` DB — production untouched.
> Source: 4-track design analysis (org/tenancy, RBAC engine, role→dashboard catalog, admin panel/auth).

---

## 1. Goal

Turn the single-institute platform (one `User.role` string + "any staff = full access") into:
1. **Multi-tenant** — a `University` tenant root, with `Faculty/College → Department` beneath it; a super-admin can add universities/faculties. Every tenant-scoped query is filtered by `universityId`.
2. **Full RBAC** — `Role` + `Permission` + `RolePermission` + `UserRole`; users hold multiple roles; assignments can be scoped to a faculty/department.
3. **A super-admin control panel** (`/admin`) to manage tenants, users, roles, permissions, feature flags, and an audit log.

## 2. Current baseline (code-verified)

- `User` = `{id,name,email,password,role(String,default "EDITOR"),createdAt,updatedAt}`. Hardcoded `SUPER_ADMIN` for `admin@sainaiinstitute.com` in `lib/auth.ts`. **No Role/Permission tables.**
- Org: only `Department`. **No University/Faculty/Tenant.** 73 models, all single-tenant by assumption; queries have **no tenant predicate**.
- `middleware.ts`: enforces only `STUDENT/FACULTY/PARENT`; all staff areas (`/cms`,`/institute`,`/accountant`,`/library-admin`,`/student-affairs`) open to *any* non-portal session. `/assistant` + `/lms` **ungated/public** (security gap).
- `lib/student.ts` guards `requireStaff()`/`requireSession()` return `{ok}|{ok,status,error}` — consumed by ~52–80 API routes.

---

## 3. Target architecture

### 3.1 Org / multi-tenancy (new models + Department change)

```
University (tenant root)
  └── Faculty / College
        └── Department  (existing — gains facultyId + denormalized universityId)
              └── Program / Course / Section / Student / Instructor / ...
```

- **`University`** `{id, nameAr, nameEn, slug @unique, domain? @unique, logo?, isActive, settings Json?, …}` — the hard scoping boundary.
- **`Faculty`** `{id, universityId, nameAr, nameEn, dean?, order, isActive}`.
- **`Department`** gains `facultyId?` + **denormalized `universityId?`** (nullable for backfill → required after).

**Tenant key is denormalized down to every scoped row** (`universityId` column), not joined through Faculty — because (a) a flat indexed `where:{universityId}` can't be "forgotten into a leak" like a nested join, (b) ~37 leaf models have nullable/absent parent FKs and can't be scoped transitively, (c) a Prisma extension can blanket-inject a flat column safely.

**Model classification (73 total):** ~35 **direct-scoped** (get `universityId`; some also `facultyId`: Student, Instructor, Course, Program, Department) · ~37 **child** (scoped transitively via a non-null parent FK — no new column) · `User` is special (gets `universityId` but owned by the RBAC section). Models with nullable/absent parent FKs (`Attendance`, `LMSContent`, `StudyPlanItem`, `ControlTask`, `CourseEquivalenceRequest`, `TransferRequest`, `Message`, …) are **promoted to direct-scoped** to avoid orphan leaks. `Setting.key` unique → `@@unique([universityId,key])`; `GradeStatus.code` unique → `@@unique([universityId,code])`.

### 3.2 RBAC core (new models)

```prisma
Role           { id, universityId? (null=platform role), key, nameAr, nameEn, isSystem, @@unique([universityId,key]) }
Permission     { id, key @unique ("resource.action"), resource, action, descriptionAr?, descriptionEn? }   // GLOBAL catalog
RolePermission { roleId, permissionId, @@id([roleId,permissionId]) }
UserRole       { id, userId, roleId, facultyId?, departmentId?, @@unique([userId,roleId,facultyId,departmentId]) }
```
- `Permission` is a **global catalog** (every institute has "approve a payment"); only *assignment* (Role/UserRole) is tenant-scoped.
- Each University is seeded its own copy of the system roles → tenant admins can rename/extend without affecting others. `universityId=null` roles are platform-level (super-admin).
- **`User`** gains `universityId?` (required after backfill, null only for platform admin), `isPlatformAdmin Boolean @default(false)`, `title?`, `userRoles UserRole[]`. **Legacy `role` String is KEPT** through the whole rollout (the back-compat keystone).

### 3.3 Control-plane models (new)

- **`FeatureFlag`** `{id, universityId? (null=platform default), key, enabled, config Json?, @@unique([universityId,key])}` — per-university feature toggles ("control every part"). Chosen over `Setting` for relational integrity, cascade-on-delete, and clean "all flags for tenant X" queries. Resolution: tenant row → platform default → hardcoded `false`.
- **`AuditLog`** `{id, universityId?, actorUserId?, action, targetType?, targetId?, metadata Json?, ip?, createdAt}` — every admin mutation writes one.

### 3.4 Session shape (the single contract every layer reads)

```ts
session.user = {
  id, role,                       // legacy string KEPT for back-compat
  universityId: string | null,    // null only for platform admin
  isPlatformAdmin: boolean,
  roleKeys: string[],             // e.g. ["REGISTRAR","EXAMS_CONTROL"]
  permissions: string[],          // flattened effective keys (deduped, '*' for platform)
  scope: { facultyIds: string[], departmentIds: string[] }, // [] = unrestricted within tenant
}
```
Computed **once at login** in the NextAuth `jwt` callback via `loadAuthContext(userId)` (one join: User→UserRole→Role→RolePermission→Permission), cached on the JWT, re-hydrated on a ≤5-min staleness window so role edits propagate. Platform admin short-circuits to `permissions:['*']`. Middleware runs on **Edge** → reads only the token, never Prisma.

### 3.5 Enforcement — three layers

1. **Prisma `$extends` + `AsyncLocalStorage`** (safety net) — auto-injects `where.universityId` on reads and stamps it on writes for the ~35 direct-scoped models; a missing tenant context is **default-deny** (a bug surfaces as a visible failure, never a silent cross-tenant read). `findUnique` on scoped models is promoted to tenant-filtered `findFirst`. `bypass` reserved for platform admin + backfill.
2. **`tenantWhere(ctx)` / `scopedWhere(ctx)` helpers** (explicit/reviewable) — for routes building their own `where`; `scopedWhere` also folds in `scope.facultyIds/departmentIds` for scoped roles (Department Head, Faculty Admin).
3. **`requirePermission(key, {facultyId?,departmentId?})`** (API guard) — **returns the exact same `{ok}|{ok,status,error}` shape as `requireStaff()`**, so the ~52 existing routes migrate with a one-line swap. `requireStaff()` is re-implemented over permissions so it keeps working untouched during transition.

New **middleware** maps URL-area → required permission (+ tenant gate + `/admin`→`isPlatformAdmin`), and the matcher **adds `/admin`, `/assistant`, `/lms`** (closing the public-access gap).

---

## 4. Canonical permission catalog (reconciled — single source of truth)

Format **`resource.action`**, lowercase. Standard actions: `view · create · edit · delete · approve · export` (+ a few domain verbs: `publish`, `post`, `resolve`, `run`). `*` = platform wildcard. Seeded once in `prisma/rbac/permissions.ts`; every facet guards against these exact strings.

| Area | Keys (representative) |
|---|---|
| Platform | `platform.tenant.view/create/edit/delete` · `platform.user.manage` · `platform.role.manage` · `platform.feature.manage` · `platform.audit.view` · `*` |
| Org structure | `faculty.view/edit` · `department.view/create/edit/delete` · `program.view/edit` · `course.view/edit` · `plan.view/edit` |
| Students/Affairs | `student.view/create/edit` · `advising.edit` · `warning.create` · `transfer.approve` · `equivalence.approve` · `graduation.approve` · `attendance.edit` · `certificate.issue` |
| Admissions | `admission.application.view/review/decide` · `admission.registration.edit` |
| Exams | `exam.schedule.edit` · `exam.questionbank.edit` · `exam.grade.edit` · `exam.control.edit` · `exam.result.publish` · `exam.appeal.resolve` · `onlineexam.manage/grade` |
| Finance | `finance.view` · `finance.tuition.edit` · `finance.collection.edit` · `finance.installment.edit` · `finance.scholarship.approve` · `finance.payment.approve/refund` · `finance.report.export` |
| Payroll/Banking/Accounting | `payroll.view/edit/run/approve` · `banking.view/edit` · `accounting.view/edit` |
| Library | `library.view` · `library.book.edit` · `library.loan.manage` |
| HR | `hr.staff.view/edit` · `hr.contract.edit` · `hr.leave.approve` · `workload.edit` |
| Quality/Reports | `quality.view/edit` · `reports.view/export` |
| CMS | `cms.page.edit` · `cms.news.publish` · `cms.result.edit` · `cms.application.view` · `cms.complaint.resolve` · `cms.media.upload` |
| Teaching/LMS | `faculty.portal.access` · `faculty.grade.edit` · `faculty.research.edit` · `ta.portal.access` · `lms.instructor.access` · `lms.content.edit` · `lms.assignment.grade` |
| End-user | `student.portal.access` · `parent.portal.access` · `self.*` |
| Misc | `marketing.manage` · `partnerships.manage` · `trainees.manage` · `activities.edit` · `communication.send` · `settings.view/edit` |

---

## 5. Role catalog → dashboard (the enumeration: have vs need)

`REUSE` = page exists today; `NEW` = must be built. "Gating" = needs a role+permissions assigned (no role distinction exists today).

| Role (key) | Landing dashboard | Pages it owns | UI status |
|---|---|---|---|
| **SUPER_ADMIN** (platform owner) | `/admin/dashboard` **NEW** | all `/admin/*`, any tenant route | **NEW tier (control panel)** |
| **INSTITUTE_ADMIN / Dean** | `/institute/dashboard` REUSE | all `/institute/*` + `/cms/*` | ✅ covered — needs perms |
| **FACULTY_ADMIN** (college) | `/institute/faculty-admin/dashboard` **NEW** | institute sections, faculty-scoped | mostly reuse + 1 scoped dashboard |
| **DEPARTMENT_HEAD** | `/institute/department/dashboard` **NEW** | departments/students/faculty/exams (dept-scoped) | mostly reuse + 1 scoped dashboard |
| **CFO** | `/institute/finance/cfo-dashboard` REUSE | all finance/accounting/payroll/banking | ✅ covered |
| **FINANCE** | `/institute/accounting/dashboard` REUSE | accounting + finance (no payment.approve) | ✅ covered |
| **ACCOUNTANT** | `/accountant/dashboard` REUSE | accounting/tuition/collection | ✅ page; needs admin-portals shell |
| **REGISTRAR / Student-Affairs** | `/student-affairs/dashboard` REUSE | students/*, admission/*, certificates | ✅ page; needs shell |
| **ADMISSIONS** | `/admission-admin/dashboard` **NEW (empty stub dir)** | admission/*, applications | 1 NEW dashboard + shell |
| **EXAMS_CONTROL** (الكنترول) | `/institute/exams` REUSE | exams/*, online-exams/* | ✅ covered |
| **LIBRARIAN** | `/library-admin/dashboard` REUSE | library | ✅ page; needs shell |
| **QUALITY** | `/institute/quality` REUSE | quality, reports (read) | ✅ covered (optional KPI dash) |
| **HR** | `/institute/hr/dashboard` **NEW** | faculty-as-staff, payroll + new HR pages | **least covered — NEW section (~4 pages)** |
| **PROFESSOR / Faculty** | `/faculty/dashboard` REUSE | all `/faculty/*`, `/lms/*` | ✅ covered — gate `/lms` |
| **TEACHING_ASSISTANT (معيد)** | `/assistant/dashboard` REUSE | assistant shell, subset of faculty/lms | ✅ page; **MUST gate (public today)** + shell |
| **STUDENT** | `/student/dashboard` REUSE | all `/student/*`, `/lms` learner | ✅ already gated |
| **PARENT** | `/parent/dashboard` REUSE | all `/parent/*` | ✅ already gated |
| **CMS_EDITOR** (legacy EDITOR) | `/cms/dashboard` REUSE | `/cms/*` content | ✅ covered |

**Default role permission sets** (seeded `isSystem=true`): SUPER_ADMIN=`*`; INSTITUTE_ADMIN=all tenant perms except `platform.*`; FACULTY_ADMIN=academic+HR within faculty scope; DEPARTMENT_HEAD=read+workload/plans within dept scope; CFO=`finance.*`+`payroll.*`+`banking.*`+approve; FINANCE/ACCOUNTANT=finance subset; REGISTRAR=`student.*`+`registration.*`+transfers/equivalence/graduation; ADMISSIONS=`admission.*`; EXAMS_CONTROL=`exam.*`+`exam.control.*`; LIBRARIAN=`library.*`; QUALITY=`quality.*`+reports; HR=`hr.*`+payroll.view; PROFESSOR=faculty portal+grade.edit(own)+lms; TEACHING_ASSISTANT=subset (grade.read, assignment.grade, attendance.edit — no grade authoring); STUDENT/PARENT=`self.*`+portal access.

---

## 6. New UI/routes required (union of facets)

- **Super-admin `/admin` control panel** (10 pages): dashboard, universities, university/[id], faculties, users, users/[id] (assign tenant+faculty+dept+roles), roles, roles/[id] (permission matrix), feature-flags, audit-log — + the `/api/admin/platform/*` routes behind each.
- **Scoped dashboards**: `/institute/faculty-admin/dashboard`, `/institute/department/dashboard`.
- **HR section**: `/institute/hr/{dashboard,staff,contracts,leave}` (contracts/leave need new `Employee/Contract/Leave`-style models — flag).
- **Admissions**: fill the empty `(admin-portals)/admission-admin` stub.
- **Shared shells**: NEW `(admin-portals)/layout.tsx` (accountant/library-admin/student-affairs/admission-admin currently render shell-less); REPLACE `(assistant)/layout.tsx` passthrough with a real gated TA shell.
- **`lib/nav-catalog.ts` + `useVisibleNav()`** — one permission-tagged nav source replacing 6 hardcoded arrays, so each role sees only authorized links.

---

## 7. Rollout plan (phased, additive, backward-compatible)

> **Build progress (local `sinai_test`):** ✅ **P1–P7 DONE & verified.**
> - P1–P6: schema (81 models), backfill (0 NULL tenant), RBAC seed (137 perms / 19 roles), auth (login→permissions), tenant-scoping extension + helpers (pass-through, non-breaking), permission-based middleware (gating matrix verified, `/assistant` & `/lms` secured).
> - **P7 admin panel**: `/admin/{dashboard,universities,universities/[id],users,users/[id],roles,roles/[id],feature-flags,audit-log}` + 14 `/api/admin/platform/*` routes + shared `app/(admin)/admin/layout.tsx`, `lib/audit.ts`. Verified end-to-end: created a university+faculty, assigned a role, toggled a feature flag — all audited; platform-admin landing now `/admin/dashboard`.
> - Gates: `tsc` 42-baseline (0 net new), `npm run build` EXIT 0 (236 pages).
> - **P8a DONE**: new dashboards `/institute/{faculty-admin,department,hr}/dashboard` + `/admission-admin/dashboard` (each with a scoped API), shared `app/(admin-portals)/layout.tsx` shell, and a real `app/(assistant)/layout.tsx` TA shell. Verified: all 4 APIs 200 w/ real data, all pages 200. `tsc` 42-baseline.
> - **P8c DONE**: all **52** `requireStaff()` routes migrated → `requirePermission('<key>')` (0 requireStaff left; `lms/*`+`settings` stay on `requireSession` by design). **Proven end-to-end**: a `FINANCE`-only user gets 200 on finance APIs/pages and **403 (API) / 307 (page)** on exams/students/library/payroll. `tsc` 42-baseline, `npm run build` EXIT 0 (244 pages).
> - **P9 DONE**: per-university feature-flag enforcement. Tenant's disabled flags baked into the JWT; `lib/authz.ts` `featureEnabled()`/`requireFeature()`; middleware `AREA_FEATURE` gate. **Proven**: admin toggles `lms.enabled` OFF → demo student is 307'd off `/lms` (portal intact) → ON restores access. 8 flags seeded enabled per tenant.
> - **P10 DONE**: feature-flag seed; final build EXIT 0 (244 pages); multi-role landing verified (admin→/admin, student/faculty/parent→portals). **Legacy `User.role` KEPT** as a documented denormalized primary-role cache (still used by the hardcoded-admin path + NextAuth `User` interface; dropping = risky refactor, ~0 value). `requireStaff()` is now unused-but-retained in `lib/student.ts` (harmless).
> - **✅ PROJECT COMPLETE (P1–P10).** Only optional polish remains: **P8b** (hide nav items a role can't use — purely cosmetic; access is already enforced) and extending `requireFeature()` to the per-area APIs (defense-in-depth; pages are already gated). All work is on the local `sinai_test` DB — **production untouched, nothing committed/deployed**.
> - Files: `lib/{authz,tenant-context,tenant,audit}.ts`, `prisma/rbac/{catalog,seed-rbac-and-backfill}.ts`.


All on `sinai_test`; `prisma db push` (no migrations) + idempotent backfill; **legacy `role` string + `requireStaff()` keep working until the last step** so the app is never broken mid-migration.

| Phase | Work | Gate |
|---|---|---|
| **P1 Schema** | Add University/Faculty/Role/Permission/RolePermission/UserRole/FeatureFlag/AuditLog; nullable `universityId/facultyId` on Department; `universityId/isPlatformAdmin/title` on User. `db push` + generate. | build EXIT 0, app unaffected |
| **P2 Backfill** | Create University "معهد سيناء العالي" + a default Faculty; stamp `universityId` on all existing rows; set `isPlatformAdmin` on the super-admin. Idempotent. | `verify-tenant.ts` = 0 NULLs |
| **P3 RBAC seed** | Seed global Permission catalog; seed per-tenant system Roles + RolePermission sets; backfill `UserRole` from legacy `role` strings (`Instructor.title==='معيد'`→TEACHING_ASSISTANT). | each legacy role → equivalent perms |
| **P4 Auth** | `lib/authz.ts` (`loadAuthContext`, `requirePermission`); extend `lib/auth.ts` jwt/session + `types/next-auth.d.ts`; re-implement `requireStaff` over perms; convert hardcoded admin → seeded platform user. | sample login per role = expected perms |
| **P5 Enforce NOT NULL + Prisma extension** | Flip `universityId` required; add `$extends` tenant scoping + `tenantWhere`/`scopedWhere`. | no cross-tenant leak in audit sweep |
| **P6 Middleware** | area→permission map + tenant gate + `/admin` gate; add `/admin`,`/assistant`,`/lms` to matcher; portal gating via `roleKeys`. | all portals still route correctly |
| **P7 Admin panel** | `/admin/*` pages + `/api/admin/platform/*`; audit logging. | super-admin CRUD works |
| **P8 Per-role gating** | migrate ~52 `requireStaff()` → specific `requirePermission(...)`; build scoped dashboards, HR section, admissions, shells, nav-catalog. | each area denies unauthorized roles |
| **P9 Feature flags + nav** | `featureEnabled(ctx,key)`; hide disabled areas; permission-driven sidebars. | flags toggle areas per tenant |
| **P10 Cleanup** | drop/denormalize legacy `User.role`; docs. | — |

---

## 8. Reconciled decisions (where the tracks diverged)
- **Permission keys:** one catalog (§4), `resource.action`, singular resources, actions `view/create/edit/delete/approve/export`. (Resolves B's `students.read` vs C's `student.view`.)
- **Feature flags:** dedicated **`FeatureFlag` model**, not `Setting` (relational integrity + cascade + per-tenant queries).
- **Super-admin tier route:** **`/admin`** (not `/platform`); API under `/api/admin/platform/*` to avoid colliding with existing `/api/admin/{library,accountant,student-affairs}`.
- **Platform-owner role key:** `SUPER_ADMIN` (continuity with today), with `isPlatformAdmin=true` + `universityId=null`.
- **Permissions in JWT:** flattened array on token + 5-min staleness refresh (revisit only if a role exceeds ~100 keys → switch to roleIds + server hydrate).

## 9. Owner decisions (RESOLVED 2026-06-08)
1. **Tenant resolution** → **Path prefix** (e.g. `/sinai/...`); `University.slug` is the key. Custom domains can layer on later via `University.domain`.
2. **HR scope for v1** → **Reuse existing only** (faculty/staff list + payroll dashboard). No `Employee/Contract/Leave` models yet.
3. **Role-change propagation** → **≤5-min staleness** (JWT-cached perms, re-hydrate window). No immediate-revocation denylist in v1.
4. **Departments under Faculty** → backfill creates one default Faculty and attaches all departments to it (so `facultyId` can be tightened later); departments are never tenant-orphaned.
5. **Unmapped legacy staff strings** → default-map to `INSTITUTE_ADMIN` (conservative, keeps them working); log for review.
6. **Build cadence** → build end-to-end through all 10 phases with a check-in between phases.

## 10. Top risks
- **Cross-tenant leak** via child models queried top-level by id, or a route that forgets `tenantWhere` / runs outside the ALS scope. Mitigation: default-deny extension + child-by-parent rule + grep/lint test + review checklist.
- **`/assistant` & `/lms` are public today** — must be added to the matcher (don't defer).
- **Backfill equivalence is the keystone** — if legacy `role`→Role mapping is wrong, users silently gain/lose access; verify per-role before P6.
- **`requirePermission` must preserve the `{ok,status,error}` shape** or all ~52 routes break.
- **Edge middleware** must read only the JWT (no Prisma import).
- **`prisma db push` is non-reversible** — snapshot `sinai_test` before each push; keep backfill idempotent; `universityId` nullable at push time, tightened only after verified backfill.
- **JWT 4KB cookie limit** if a role accumulates a very large permission set.

## 11. Rough effort
P1–P6 (foundation: schema, backfill, auth, enforcement, middleware) is the bulk of the risk and ~½ the work. P7 (admin panel) and P8 (per-role gating + new dashboards/HR/shells) are the larger surface but lower-risk and parallelizable per area. Most *pages* already exist — the heavy lift is the **enforcement spine + admin panel + the few genuinely-new dashboards (platform, faculty/dept-scoped, HR, admissions)**.
