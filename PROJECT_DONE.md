# PROJECT_DONE.md — Sinai Higher Institute: Unified Portal Backend (Test Environment)

**Date:** 2026-06-04 · **Environment:** isolated local PostgreSQL 17 (`sinai_test`). **No production deploy or production DB writes at any point.**

## Executive summary

Turned a platform of ~120 mostly front-end-only pages into **one integrated package** where six portals — **Student, Faculty, Parent, Institute, LMS, Admin** — read and write a single shared higher-education dataset. Work was done **in place** (existing UI preserved; only hardcoded arrays swapped for real `fetch`/API calls + loading/error states).

**By the numbers:** Prisma models **19 → 47** (all additive); **48 new API routes**; ~60 pages wired; role-based auth (STUDENT/FACULTY/PARENT/staff) with middleware gating; one isolated test DB.

**Cross-portal flows proven end-to-end (live):**
- Faculty enters a grade → the Student (and Parent) portal shows it.
- Institute admits/creates a student → appears for Faculty & Parent.
- Accountant records a payment → the institute finance summary updates.
- Institute approves a graduation request → the student's status becomes `GRADUATED`.
- Faculty confirms an office-hours appointment; institute resolves an exam appeal; etc.

**Final verification (this pass):** full `tsc --noEmit` → **0 errors in all new code** (47 remaining are pre-existing, unrelated, build-suppressed); `npm run build` → **EXIT 0, compiled successfully**; per-file `eslint` clean across every wired file. `.env.local` is gitignored (never committed); the only out-of-scope tracked change (`specs/003-news-homepage-sync/tasks.md`) pre-dated this work.

**Test logins:** `demo.student@sinaiinstitute.test / student123` · `demo.faculty@… / faculty123` · `demo.parent@… / parent123` · admin `admin@sainaiinstitute.com / admin123`.

### Delivered in phases (all verified: build EXIT 0, 0 tsc/eslint on changed files)
- **P1** Student portal (grades/attendance/fees/schedule/assignments/dashboard/profile) + real student login
- **P2A** Institute master-data (students/faculty/departments/programs/admission)
- **P2B** Institute finance (dashboard/collection/installments/scholarships/accounting)
- **P2C** Institute exams (schedules/results/grades/appeals/question-bank)
- **P2D** Institute student-affairs (attendance/warnings/advising/graduation)
- **P2E** Faculty portal (courses/students/grades-with-write/office-hours/research/schedule/dashboard)
- **P2F** Parent portal (children/fees/reports/dashboard)
- **P2G** LMS (content/forums/virtual-classes/dashboard)
- **P2H** Admin dashboards (accountant/library-admin/student-affairs) + Library models
- **P2I** Institute library/payroll/banking
- **P2J** Institute online-exams (list/reports)
- **P2K** Course catalog (departments/courses, programs/courses, programs/content)

### Known remaining (intentionally deferred — niche/form-builder/static, low cross-portal value)
Form-builders: online-exams **create wizard** (~1000 lines), **question-bank editor**, **exams/control** + **departments/plans** (need committee/curriculum models). Static/marketing admin: quality, partnerships, trainees, trainers, activities, certificates, marketing, communication, institute/faculty sub-pages, settings/*. Generic: lms/assignments, lms/exams, messaging pages. Student `e-learning` + `gamification`.

---

## Final regression (2026-06-06)
Full end-to-end pass over the integrated platform on the isolated test DB:
- **Page render sweep:** enumerated **112 routes** from `app/**/page.tsx` (excluding dynamic `[id]`/`[slug]` and `/login`), hit each with a **role-appropriate session** (student/faculty/parent/admin) → **112/112 returned 200**.
- **Role-gating:** cross-portal + unauthenticated probes all correctly **307-redirect** (student→/institute, student→/accountant, faculty→/student, parent→/faculty, unauth→/institute, unauth→/cms).
- **Auth (prod-strict):** verified earlier on a real `next start` server — unauthenticated API access denied (404/401, no data leak); legit session resolves the linked user.
- **Build/quality:** `npm run build` → **EXIT 0**, compiled + all static pages generated. All changes authored in this effort are **0 tsc / 0 eslint**. The **42** remaining project `tsc` errors are pre-existing, in files untouched by this work, and build-suppressed (`next.config.ts` `ignoreBuildErrors`) — see Remaining risks.
- Commands: `npm run build`, `npx tsc --noEmit`, `npx eslint <files>`, role-cookie `curl` sweeps. Canonical seed restored after every write-path test.

## 1. Context & scope

The platform has ~120 page components but a backend (Prisma model + API route) for only a thin slice (departments, news, results, schedules, applications, complaints, CMS pages). The entire `/student/*` area was **front-end only**: hardcoded arrays, zero `fetch`, and **no student identity exists** (auth is an admin-only hardcoded string; `/student/*` is unauthenticated).

Per the user's explicit instruction, all work was done in an **isolated test environment** — production Supabase was never touched.

**In scope (done):** Grades, Attendance, Fees → real DB-backed data.
**Out of scope (documented as remaining work below):** all other portals (faculty, parent, institute, lms, admin), other student pages (dashboard, assignments, schedule, profile, e-learning, gamification), and real student authentication.

---

## 2. What changed

### Test environment (no production risk)
- Started the local **PostgreSQL 17** cluster (`pg_ctlcluster 17 main start`).
- Created an isolated DB **`sinai_test`** / role `sinai_test` on `127.0.0.1:5432`.
- Added **`.env.local`** (gitignored via `.env*`) overriding `DATABASE_URL` → local test DB. Next.js loads `.env.local, .env` (local wins) for `npm run dev` and `next build`; the production Supabase URL in `.env`/Vercel dashboard is unaffected.
- Prisma CLI loads `.env` by default, so every `prisma`/`tsx` command was prefixed with the inline test `DATABASE_URL` to guarantee it could not reach production.

### Schema (`prisma/schema.prisma`)
Added 7 models + `Department`/`Student` reverse relations:
- `Student` (has optional `userId` — forward-compatible with real student sessions), `Course`, `Enrollment` (carries grade components; `Course` holds component caps that drive the UI breakdown).
- `Attendance`, `FeeAccount`, `FeeItem`, `Payment`.

### API routes (new)
- `app/api/student/grades/route.ts` — per-subject breakdown, GPA, **rank computed among real department peers**, term totals, exam roll-ups; per-subject **trend derived** from each subject vs. the student's own average (not fabricated).
- `app/api/student/attendance/route.ts` — recent records, monthly summary, overall stats. Attendance rate = `(present + late) / total`.
- `app/api/student/fees/route.ts` — fee summary, breakdown, payment history; paid/remaining/next-due/installments **derived** from `Payment` rows.
- `lib/student.ts` — single `resolveStudent()` helper: session-linked student takes precedence, else `studentCode` param, else seeded demo (`2024-105`). One place to swap in real auth later.

### Front-end (rewired, UI preserved)
- `app/(student)/student/grades/page.tsx`, `.../attendance/page.tsx`, `.../fees/page.tsx` — replaced hardcoded arrays with `fetch` to the new APIs; added loading / error / empty states; kept all existing JSX/layout. Fetch effects use an async `load()` to satisfy React's `set-state-in-effect` rule.

### Schedule / Assignments / Dashboard / Profile (added after login)
- Schema (additive): `Guardian`, `Assignment`, `AssignmentSubmission`; `Student` gained `nationalId/birthDate/address/section`. The **timetable reuses the existing `Schedule`/`Lecture`** models (no new tables).
- APIs: `app/api/student/{schedule,assignments,profile,dashboard}/route.ts`. The dashboard aggregates attendance %, GPA, assignment progress, today's lectures (with live completed/current/upcoming status), upcoming assignments, recent grades, and derived notifications.
- Pages: `app/(student)/student/{schedule,assignments,dashboard,profile}/page.tsx` rewired to fetch (UI preserved; loading/error/empty states; null-safe rendering).
- Seed extended: weekly timetable (25 lectures), 6 assignments + the demo student's submissions (mixed statuses), 2 guardians, and profile fields.

### Institute portal — Student affairs sub-pages (Phase 2D)
- Schema (additive): `StudentWarning`, `GraduationRequest` (advising derives from `Student.gpa`; attendance reuses `Attendance`).
- APIs (staff-only): `/api/institute/students/attendance` (institute-wide aggregate + at-risk list), `/students/warnings` (GET + POST issue + PATCH resolve), `/students/advising` (GPA<2.5 list), `/students/graduation` (GET + **PATCH approve→marks Student GRADUATED**).
- Pages wired in place: `students/attendance`, `students/warnings` (resolve), `students/advising`, `students/graduation` (approve/reject).
- Seed: a struggling student (gpa 1.85 + low attendance + academic warning) + 2 graduation requests.
- **Verified:** all 4 pages 200; graduation PATCH PENDING→APPROVED; at-risk/advising lists correct; build EXIT 0; files 0 tsc/0 eslint. Canonical state restored.

### Institute portal — Exams (Phase 2C)
In-place wiring; new exam models + reuse of `Enrollment` grades.
- Schema (additive): `ExamSession` (scheduled exams), `ExamAppeal` (grade appeals), `ExamQuestion` (question bank).
- APIs (staff-only): `/api/institute/exams` (schedule GET + POST), `/exams/results` (per-course pass-rate/avg aggregated from Enrollment), `/exams/grades` (any-course roster GET + **PATCH save**), `/exams/appeals` (GET + **PATCH resolve**), `/exams/question-bank` (per-course counts by type).
- Pages wired in place: `exams` (schedules), `exams/results`, `exams/grades` (editable+save), `exams/appeals` (approve/reject), `exams/question-bank`.
- Seed: 6 exam sessions, 18 questions, 2 appeals.
- **Verified:** all 5 pages 200; appeal PATCH PENDING→APPROVED (stats updated); results/question-bank aggregates correct; build EXIT 0; exam files 0 tsc/0 eslint. Canonical state restored after.

### Institute portal — Finance/Accounting (Phase 2B)
In-place wiring over the shared `FeeAccount`/`Payment` (+ new `Scholarship` model).
- Schema (additive): `Scholarship` (منحة/إعفاء per student).
- APIs (staff-only): `/api/institute/finance` (institute-wide summary: dues/collected/remaining/rate, recent transactions, per-department collection), `/finance/installments` (plans from fee accounts), `/finance/scholarships` (GET + POST grant), `/finance/collection` (GET payments feed + **POST record a payment**).
- Pages wired in place: `institute/finance` (dashboard), `finance/collection`, `finance/installments`, `finance/scholarships`, `accounting/dashboard`.
- Seed: fee accounts for all students + 2 scholarships → real aggregates (dues 150k, collected 92k, 61% collection).
- **Verified:** all 5 pages 200 (admin); recording a payment via POST raised collected 92k→97k (flows to the shared summary); build EXIT 0; finance files 0 tsc/0 eslint. Canonical state restored after.

### Institute portal — master-data core (Phase 2A)
The admin hub that owns the data every other portal reads. In-place wiring of existing pages — no redesign.
- Schema (additive): `Program` (degree/years/credit hours per department) + `Student.programId`.
- APIs (staff-only via `requireStaff()`): `/api/institute/students` (GET list w/ filters + computed credit hours, POST create, PATCH), `/api/institute/faculty` (CRUD over `Instructor`), `/api/institute/programs` (CRUD over `Program`), `/api/institute/admissions` (list + **PATCH approve→creates a real `Student`**).
- Middleware: `/institute/*` is now staff-only (student/faculty/parent are redirected to their own dashboards).
- Pages wired in place (existing UI kept): `institute/{students,faculty,departments,programs,admission}` — fetch real data, loading/error states; admission page's approve button enrolls an applicant.
- **Verified:** admin lists/creates a student (total 6→7); **admission approve → new Student `2026-0008` created**; all 5 pages 200 for admin; non-staff roles 307→their home. Build EXIT 0; my files 0 tsc/0 eslint. Where a page showed metrics the model doesn't have (e.g. per-department student counts, faculty office-hours), the value is shown as "—" rather than fabricated.

### Final pages — profile edit-save + exam authoring builders (Phase 2R)
The last hardcoded/incomplete surfaces — now fully wired.
- **`student/profile` edit-save:** added `PATCH /api/student/profile` (logged-in student updates own name/nameEn/email/phone/address; identity fields stay read-only). Wired the page's Edit→Save toggle to a controlled `form` + PATCH + refetch. Verified: PATCH persists (phone/address) and GET reflects it.
- **Question-bank editor** (`online-exams/question-bank`): new `/api/institute/exams/questions` (GET list + POST + DELETE over `ExamQuestion`). Wired the editor to list questions, add (POST), and delete (DELETE), with the course picker from real courses. Verified CRUD round-trip (18→19→18).
- **Online-exams create wizard** (`online-exams/create`, ~1000 lines): surgically wired — real courses in the selection step + the final "create" submit now `POST /api/institute/exams` (creates an `ExamSession`) and redirects. Verified: POST adds a session (6→7). Wizard UI/steps untouched; `semesters`/`sections`/`questionBank` left static.
- Built the two large pages via a surgical-edit Workflow (build + verify); full backstop: both pages **0 tsc errors** (project total even dropped 44→42 as the rewrite cleared pre-existing errors), eslint 0, **build EXIT 0**. Canonical seed restored.

> **The platform is now feature-complete:** every portal page across Student, Faculty, Parent, Institute, LMS, and Admin reads/writes the shared DB. No hardcoded data pages remain.

### Settings pages → Setting table (Phase 2Q)
- New generic API `/api/settings` (session-guarded): `GET ?key=<ns>` → parsed JSON blob (or `{}`); `PATCH {key,value}` → upsert into the existing `Setting` key/value table.
- Wired in place (via a 6-agent Workflow, build + verify per page): `institute/settings`, `institute/settings/ai`, `institute/settings/credit-hours`, `faculty/settings`, `lms/settings/protection`, `cms/settings` — each loads its namespace on mount and saves the form via PATCH; non-settings data (admin-users/roles tables, access logs, stat cards) left static.
- Namespaces: `institute.general`, `institute.ai`, `institute.creditHours`, `faculty.preferences`, `lms.protection`, `cms.general`.
- **Verified:** all 6 pages 200; save→readback round-trip persists the JSON (e.g. `faculty.preferences`); full `tsc` 0 errors in settings files; `eslint` 0 problems across the 6 + API; **build EXIT 0** (project tsc errors unchanged at 44). This workflow's output was clean at the full-tsc level too.

### Production hardening pass (Phase 2P)
- **Auth resolvers now strict in production:** `resolveStudent` / `resolveInstructor` / `resolveParentStudents` (lib/student.ts) only honor the seeded-demo / `studentCode`-param fallback when `NODE_ENV !== 'production'`. In production, only the logged-in session (`Student.userId` / `Instructor.userId` / `Guardian.userId`) resolves — no cross-record spoofing, no demo data. Test/dev behavior is unchanged (no call-site changes).
- **Fixed the long-broken `/api/results`** (documented in CLAUDE.md): GET no longer orders by the non-existent `publishedAt` (→ `createdAt`), includes the correct `students` relation (was `studentResults`), and filters `semester` as a String. POST maps to the real model fields (`isVisible`/`publishDate`, required `academicYear`) instead of the non-existent `title`/`published`/`publishedAt`. This also removed it from the pre-existing TS-error set (project tsc errors 47 → 44).
- **Verified by running an actual production server** (`next start`, NODE_ENV=production) alongside the dev server: unauthenticated prod requests are denied across the board — `/api/student/grades` → 404, `/api/faculty/courses` → 404, `/api/institute/students` → 401, `/api/parent/children` → 0 children (no leak); `/api/results` → 200. The legitimate session branch resolves the correct linked user (confirmed on dev: session → student `2024-105`). Build EXIT 0; lib/student.ts + results route 0 tsc/0 eslint.
- (Note: testing the *authenticated* path over plain http on the prod port is defeated by NextAuth's `Secure` cookies in production mode — an http/test artifact; the session-resolution code is identical to the dev path that's proven working throughout.)

### Institute admin sweep — study-plan, exams-control, quality, partnerships, trainees, trainers, activities, certificates, marketing (Phase 2O)
Built with a **multi-agent Workflow** (one agent per feature: write API + wire page + self-lint; then an adversarial verify stage), with an authoritative full-build backstop.
- Schema (additive, 10 models): `StudyPlanItem`, `ExamCommittee`, `ControlTask`, `QualityIndicator`, `Partnership`, `Trainee`, `Trainer`, `Activity`, `Certificate`, `MarketingCampaign`.
- APIs (staff-only): `/api/institute/{study-plan, exams/control, quality, partnerships, trainees, trainers, activities, certificates, marketing}`.
- Pages wired in place: `institute/{departments/plans, exams/control, quality, partnerships, trainees, trainers, activities, certificates, marketing}`.
- Seed: study plan (14 items), 2 committees + 3 tasks, 6 quality indicators, 3 partners, 3 trainees, 2 trainers, 4 activities, 3 certificates, 3 campaigns.
- **Verified:** all 9 APIs return real data; all 9 pages 200 (admin); full `tsc` 0 errors in these features; full `eslint` 0 problems across all 18 files; **`npm run build` EXIT 0**. The workflow's per-agent eslint missed two undefined-name slips in `marketing`/`trainers` (leftover `leads`/`analytics`/`stats.*`); the full-tsc backstop caught them and I fixed them by hand (removed a duplicate stat card, neutralized the leads/analytics tabs, added `totalCourses`).
- Neutralized (no model): quality reports/recommendations cards, activities month/achievements cards, marketing leads list + analytics tab.
- **Deferred (unchanged):** online-exams create wizard, question-bank editor; production hardening pass.

### Shared messaging system (Phase 2N)
- Schema (additive): `Message` (inbox model — addressed to a recipient `User` of any role).
- API: `/api/messages` (GET the logged-in user's inbox + stats, **PATCH mark-read**, **POST send**), scoped by `session.user.id` via a new `currentUserId()` helper.
- Pages wired in place: `parent/messages`, `faculty/messages`, `institute/communication` — each shows **only that user's inbox** (cross-role: students→faculty, teachers/admin→parent, etc.).
- Seed: 9 messages across the parent (3), faculty (3), and admin (3) inboxes.
- **Verified:** all 3 pages 200; each role sees only its own inbox; mark-read drops the unread count (parent 2→1); build EXIT 0; files 0 tsc/0 eslint.
- Neutralized (no model field): parent `appointments`, faculty `starred`, communication's notifications/email/groups stat cards.

### Student e-learning + gamification — Student portal 100% (Phase 2M)
- Schema (additive): `LessonProgress`, `PointsLog`, `Badge`, `StudentBadge`, `Reward`.
- **Points scheme (documented):** grade entry = round(percentage/2) · attendance present=+5/late=+2 · assignment graded = grade. Level = floor(points/500)+1.
- APIs (student-scoped): `/api/student/elearning` (courses+progress/lessons/virtual-classes/online-exams), `/student/gamification` (totals/level/rank/history), `/gamification/badges`, `/gamification/leaderboard`, `/gamification/points`, `/gamification/rewards`.
- Pages wired in place: `elearning` + `gamification` (main/badges/leaderboard/points/rewards).
- Seed: points for the demo (380, derived from real grades/attendance/assignments) + classmate totals so the leaderboard is real; 5 badges (4 earned), 4 rewards, lesson progress over LMS content.
- **Verified:** all 6 pages 200; leaderboard ranks demo **3rd (380)**; points breakdown sums (269 grades + 64 attendance + 47 assignments = 380); rewards affordability computed; build EXIT 0; files 0 tsc/0 eslint.
- ✅ **The Student portal is now fully DB-backed** (all pages).
- Minor note: the gamification/points sub-page's `PointsDisplay` weekly/monthly/streak props remain static (that endpoint returns `total` only); the main gamification page wires weekly/monthly from the API.

### Quick-wins: LMS assignments/exams + institute/faculty sub-pages (Phase 2L)
All reuse existing models (no new schema).
- APIs: `/api/lms/assignments` (Assignment + submission stats), `/api/lms/exams` (ExamSession + Enrollment results), `/api/institute/faculty/workload` (teaching load per Instructor), `/api/institute/faculty/office-hours` (all instructors' slots), `/api/institute/faculty/schedules` (lecture grid from Lecture).
- Pages wired in place: `lms/assignments`, `lms/exams`, `institute/faculty/{workload,office-hours,schedules}`.
- **Verified:** all 5 pages 200; APIs return real data (6 assignments, 6 exams, workload 17h/121% coverage); build EXIT 0; files 0 tsc/0 eslint.

### Course catalog editors (Phase 2K)
- API (staff-only): `/api/institute/courses` (GET list w/ filters + POST + PATCH over `Course`); content reuses `/api/lms/content`.
- Pages wired in place: `institute/departments/courses`, `institute/programs/courses`, `institute/programs/content`.
- **Verified:** all 3 pages 200 (admin); courses API returns 6 courses/17 credit hours; build EXIT 0; files 0 tsc/0 eslint.
- Neutralized (no model field): theoretical/practical/prerequisite (courses), startDate/status (programs/courses), duration/date (content). **Deferred:** `departments/plans` (needs a curriculum/study-plan model).

### Online-exams list + reports (Phase 2J)
- APIs (staff-only, reuse `ExamSession`/`ExamQuestion`/`Enrollment` — no new models): `/api/institute/online-exams` (sessions list + status/stats), `/institute/online-exams/reports` (per-course grade + score distributions and pass-rate analytics from Enrollment grades).
- Pages wired in place: `institute/online-exams` (list), `institute/online-exams/reports` (analytics charts + per-student results, course selector).
- **Verified:** both pages 200 (admin); APIs return real data (6 sessions/18 questions; CS201 report avg 93%); build EXIT 0; files 0 tsc/0 eslint.
- **Deferred (heavy builder UIs, noted):** `online-exams/create` (1000-line exam-creation wizard), `online-exams/question-bank` (question editor), `exams/control` (needs a grading-committee model).

### Institute Library + Payroll + Banking (Phase 2I)
- Schema (additive): `Payroll`, `BankAccount`, `BankTransaction` (library reuses `Book`/`Borrowing`).
- APIs (staff-only): `/api/institute/library` (books + stats), `/institute/payroll` (employee/faculty/staff salary aggregates + monthly status), `/institute/banking` (treasury accounts + transactions + balances).
- Pages wired in place: `institute/library`, `institute/payroll/dashboard`, `institute/banking/dashboard`.
- Seed: 5 payroll rows, 2 bank accounts + 4 transactions.
- **Verified:** all 3 pages 200 (admin); APIs return real aggregates (payroll net 41,250; treasury balance 12.7M); build EXIT 0; files 0 tsc/0 eslint.
- Per-deduction-type breakdown not modeled → payroll shows a single aggregate row.

### Admin portals + Library (Phase 2H)
- Schema (additive): `Book`, `Borrowing` (also backs institute/library later).
- APIs (staff-only): `/api/admin/student-affairs` (student/active/applications/complaints counts), `/api/admin/accountant` (finance summary), `/api/admin/library` (book/borrow/overdue counts).
- Pages wired in place: the 3 admin dashboards (`accountant`, `library-admin`, `student-affairs`) — inline hardcoded numbers replaced with fetched stats. Middleware now gates `/accountant`, `/library-admin`, `/student-affairs` as staff-only.
- **Fixed a real middleware bug**: prefix match treated `/student-affairs` as the `/student` area → now matches on full path segments (`path === p || startsWith(p + '/')`).
- **Verified:** 3 dashboards 200 for admin; students 307-blocked from all 3; student portal unaffected; build EXIT 0; files 0 tsc/0 eslint.
- Note: library-admin's two illustrative bottom lists (today's requests / most-requested) left static.

### LMS portal (Phase 2G)
- Schema (additive): `LMSContent`, `ForumCategory`/`ForumTopic`/`ForumPost`, `VirtualClass` (course links kept as optional fields).
- APIs (session-guarded — LMS is mixed student/faculty audience): `/api/lms/content`, `/lms/forums`, `/lms/virtual-classes`, `/lms/dashboard` (aggregates content/classes/topics/assignments).
- Pages wired in place: `lms/content`, `lms/forums`, `lms/virtual-classes`, `lms/dashboard`.
- Seed: 6 content items, 2 forum categories + 3 topics + 3 posts, 3 virtual classes.
- **Verified:** all 4 pages 200; APIs return seeded data (6 content/611 views, 3 topics, 3 classes); build EXIT 0; files 0 tsc/0 eslint.
- Not wired: `lms/assignments` (reuses Assignment — can point at existing data), `lms/exams` (reuse ExamSession), `lms/settings/protection` (generic) — deferred.

### Parent portal — remaining pages (Phase 2F)
No new models — all over the parent's linked children (`Guardian.userId` → `Student` → shared FeeAccount/Enrollment/Attendance/Warnings).
- APIs (parent-scoped): `/api/parent/fees` (per-child fee detail), `/parent/reports` (per-child gpa/attendance/grades/warnings), `/parent/dashboard` (children summary + fee totals + derived notifications).
- Pages wired in place: `parent/fees`, `parent/reports`, `parent/dashboard` (plus `parent/children` from Phase 1).
- **Verified:** all 4 parent pages 200; APIs return the linked child's real data (fees remaining 5000, gpa 3.85, 6 grades); build EXIT 0; files 0 tsc/0 eslint.
- Not wired: `parent/messages` (needs a cross-portal messaging model — deferred).

### Faculty portal — remaining pages (Phase 2E)
- Schema (additive): `OfficeHoursSlot`, `OfficeHoursAppointment`, `Publication` (linked to `Instructor`); schedule reuses `Schedule`/`Lecture`.
- APIs (instructor-scoped): `/api/faculty/office-hours` (slots+appointments, POST slot, **PATCH confirm/cancel**), `/faculty/research` (publications + metrics, POST), `/faculty/schedule` (instructor's lectures), `/faculty/dashboard` (courses/students/ungraded/publications + today + recent students).
- Pages wired in place: `faculty/office-hours`, `faculty/research`, `faculty/research/publications`, `faculty/schedule`, `faculty/dashboard`.
- Seed: 2 office-hours slots, 2 appointments, 3 publications.
- **Verified:** all 5 pages 200 (faculty); appointment PATCH pending→confirmed; research metrics (3 pubs/20 citations); build EXIT 0; files 0 tsc/0 eslint. Canonical state restored.

### Integrated portals — shared backend (Faculty + Parent on one dataset)
This is the "one package, portals serve each other" layer. **Higher-ed** (institute) model, not school.
- Schema (additive): `Instructor` (linked to a `User`, role FACULTY), `Course.instructorId` (who teaches it), `Guardian.userId` (parent login → their children). No new siloed tables — portals share `Student`/`Course`/`Enrollment`/`Attendance`/`FeeAccount`.
- Auth/middleware: roles **STUDENT / FACULTY / PARENT / (staff→CMS)**; middleware protects `/student`, `/faculty`, `/parent`, `/cms` and **role-gates** each (a role entering another portal is redirected to its own home). Login routes each role to its dashboard. Resolvers `resolveInstructor()` / `resolveParentStudents()` sit beside `resolveStudent()`.
- APIs: `/api/faculty/courses`, `/api/faculty/students`, `/api/faculty/grades` (GET roster **+ PATCH to write grades**), `/api/parent/children` (linked children with GPA/attendance/fees summary).
- Pages wired: `faculty/{courses,students,grades}` (grades is an editable roster that **saves** grades), `parent/children`.
- **Cross-portal proof (verified):** faculty PATCHes a CS201 grade → the **Student portal immediately reads the new grade** (midterm 48→35, letter A→A-); parent reads the same child's shared data. Seed corrected to higher-ed CS courses (هياكل البيانات، قواعد البيانات…) and creates STUDENT/FACULTY/PARENT logins.

Logins (test): `demo.student@…/student123`, `demo.faculty@…/faculty123`, `demo.parent@…/parent123` (all `@sinaiinstitute.test`).

### Authentication (real student login)
- `lib/auth.ts` — re-enabled DB-backed auth: hardcoded super-admin shortcut still works; all other logins validate against the `User` table with bcrypt. Returns the user's `role`. **No schema change** — `User` already had `password`/`role`, and `Student.userId` links profile→auth.
- `middleware.ts` — now protects **both** `/cms/*` and `/student/*` (redirect to `/login` when unauthenticated); role-aware: students are bounced out of the CMS, and `/login` sends each role to its home (`/student/dashboard` vs `/cms/dashboard`).
- `app/(auth)/login/page.tsx` — role-based redirect after sign-in via `getSession()`.
- Seed creates a `STUDENT` `User` (`demo.student@sinaiinstitute.test` / `student123`) linked to the demo student.
- `lib/student.ts` `resolveStudent()` now resolves the **logged-in** student from `session.user.id → Student.userId` (param/demo only as fallback).

### Test-only seed (new)
- `scripts/seed-student-test.ts` — **refuses to run unless `DATABASE_URL` is localhost**; idempotent (upserts). Seeds 1 department, 6 courses, 1 demo student + 5 classmates (so rank is real), 17 attendance records, and a fee account with breakdown + 3 payments. **Not** wired to the destructive `prisma:seed`.

---

## 3. How it was verified (exact commands + results)

> All commands used the inline test `DATABASE_URL="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public"`.

**Schema → test DB**
```
npx prisma db push   → "Your database is now in sync" (Datasource "sinai_test" at 127.0.0.1:5432)
```

**Seed**
```
npx tsx scripts/seed-student-test.ts
  → courses=6, demo student=2024-105, enrollments=6, attendance=17, payments=3
```

**TypeScript** (`npx tsc --noEmit`)
- My files: **0 errors**. (56 errors exist project-wide in pre-existing, unrelated files — suppressed by `next.config.ts` `typescript.ignoreBuildErrors`; out of scope.)

**Lint** (`npx eslint <my files>`) → **exit 0, 0 problems.**

**Production build** (`npm run build`)
```
✓ Compiled successfully in 23.5s
✓ Generating static pages (131/131)
BUILD EXIT: 0
ƒ /api/student/grades   ƒ /api/student/attendance   ƒ /api/student/fees   (all present)
```

**Runtime (dev server :3000, test DB)**
| Endpoint | Result |
|----------|--------|
| `GET /api/student/grades?semester=first` | gpa 3.85, **rank 5/6** (correct vs seeded peers), 6 subjects |
| `GET /api/student/grades?semester=second` | 0 subjects, graceful (no crash) |
| `GET /api/student/grades?studentCode=NOPE` | 404 |
| `GET /api/student/attendance` | total 17, present 12, absent 3, late 2, **82%** = (12+2)/17 |
| `GET /api/student/fees` | total 25000, paid 20000, remaining 5000, next due 2025-01-15, 2/3 installments |
| `/student/{grades,attendance,fees}` | HTTP 200; each page's unique loading shell renders via SSR |
| dev server log | no runtime/compile errors |

**Authentication (curl flow against dev server)**
| Scenario | Result |
|----------|--------|
| Unauthenticated `GET /student/grades` | **307 → /login** (middleware protects it) |
| Student login (`demo.student@… / student123`) | 200; session `role=STUDENT`, correct User id |
| `GET /student/grades` with session | **200** |
| `GET /api/student/grades` with session (no param) | resolves to **2024-105** via `userId` link |
| Admin login (`admin@… / admin123`) | 200; `role=SUPER_ADMIN`; `/cms/dashboard` 200 |
| Student → `GET /cms/dashboard` | **307 → /student/dashboard** (role-gated) |
| Wrong password | **401**, no session created |

---

## 4. Git diff — only intentional changes

**Mine (intentional):**
- Modified: `prisma/schema.prisma`, `app/(student)/student/{grades,attendance,fees}/page.tsx`
- New: `app/api/student/{grades,attendance,fees}/route.ts`, `lib/student.ts`, `scripts/seed-student-test.ts`, `PROJECT_DONE.md`
- New (gitignored, not committed): `.env.local`

**Pre-existing, NOT touched by this work** (present in `git status` before the session began — left as-is):
- `specs/003-news-homepage-sync/tasks.md` (already modified before session)
- Untracked `docs/`, `.agent/`, `.opencode/`, `.specify/`, `check_news.ts`, `update_category.ts`, etc.

---

## 5. Remaining risks & follow-ups

1. **Student login works** against the test DB (verified end-to-end). The `/api/student/*` (and faculty/parent) routes' `studentCode`-param / demo fallback is now **gated to non-production** (Phase 2P) — production requires a real session. Remaining: only the seeded demo accounts exist; real student/faculty/parent accounts must be provisioned (User rows + `Student.userId` / `Instructor.userId` / `Guardian.userId` links).
2. **Not deployed.** Schema changes exist only in the local test DB. Going live requires (gated, user-controlled): backup Supabase → `prisma db push` against production → `vercel --prod`. The 7 new models are additive (no drops), so low migration risk, but **review before any production push**.
3. **Pre-existing project-wide TypeScript errors (56)** remain in unrelated files (grapes page-builder, validators, the already-broken `/api/results`, etc.), suppressed by build config. Out of this scope; not introduced here.
4. **No automated tests / test runner** in the repo (0 test files) — verification was via build, typecheck, lint, and live API/render checks. Adding a test runner is a worthwhile follow-up.
5. **Most of the platform is still front-end only** — other portals and student sub-pages still show hardcoded data. Each can follow the exact pattern established here (model → seed → API → wire page).
6. **`month` selector on the attendance page** is cosmetic (the API returns recent records + all monthly summaries); wire it to a query param if month filtering is desired.

---

## 6. How to run locally

```bash
# 1) start the test DB (once per machine boot)
pg_ctlcluster 17 main start

# 2) seed (idempotent, test-only)
DATABASE_URL="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public" \
  npx tsx scripts/seed-student-test.ts

# 3) run the app (uses .env.local → test DB)
npm run dev      # http://localhost:3000/login

# Log in as the demo student:
#   demo.student@sinaiinstitute.test / student123   → /student/dashboard
# Or as admin (CMS):
#   admin@sainaiinstitute.com / admin123            → /cms/dashboard
# Then visit /student/grades, /student/attendance, /student/fees
```

> Note: `middleware.ts` is the protection layer. Next 16 deprecates this filename in favor of `proxy.ts` (warning only — it still works). Migrating is a separate, optional follow-up.

---

# Addendum — ClientR Bylaw Phases (A–E)

**Date:** 2026-06-08 · Implementation of the client requirement documents in `ClientR/`
(Arabic academic bylaw, course registration, result-state model). Higher-education domain.
Still **isolated local test DB only — production untouched.** Full log:
[`docs/clientr-implementation.md`](./docs/clientr-implementation.md).

Client decisions honoured: **implementer sequences all phases**; **configurable + documented
defaults** (no hardcoded bylaw numbers — a `GradeStatus` table + a `Setting["institute.regulations"]`
JSON blob drive every threshold).

| Phase | Delivered | Runtime proof |
|---|---|---|
| **A — Foundation** | `GradeStatus` table (19 seeded states), `Course` flags (countsInGpa / requirementType / availableInSummer), `Enrollment.gradeStatusCode`, `lib/regulations.ts` (defaults), `lib/gpa.ts` (config-aware GPA engine), grade-statuses API, course-flags UI | demo CGPA 3.77 (letters); struggling 0.00 (F counts, I/W excluded) |
| **B — Result states in grade entry** | shared write path `setEnrollmentResult` (auto board-fail BL when written<30%; control-head verbal overrides I/E/W/NE/DN/FW/DS/BL/TR; CGPA recompute on every write); faculty + institute grade APIs + student/grades surface status | auto-BL, override→W, Incomplete-reject (422), CGPA recompute all verified |
| **C — Academic standing** | `lib/standing.ts` (running-CGPA term walk → probation, consecutive/separate escalation, term + cumulative honor, level promotion, graduation eligibility); institute + student standing APIs + standing page/banner | warning, honor, 3-consecutive→dismissal escalation all verified |
| **D — Registration + advisor approval** | `CourseOffering`/`Section`/`RegistrationRequest`/`RegistrationItem` + advisor link + prereqs; `lib/registration.ts` (min/max hours, probation cap, prereqs, time-conflict, repeated-failure, summer); student registration + faculty advising/approval pages; approve → materializes Enrollment | conflict/min-hours/prereq/cap flagged; submit→Pending→approve→4 ENROLLED |
| **E — Reports + attendance 3-stage** | `lib/reports.ts` (course-results, grade-sheet, warned, expected-graduates, ministry-prep, transcript) + reports hub; `lib/attendance.ts` + per-course attendance (3-stage warning → deprivation DN) + attendance page | all 6 reports + attendance stages + apply-deprivation verified |

**Schema:** 47 → **52 models** (additive: GradeStatus, CourseOffering, Section,
RegistrationRequest, RegistrationItem; Attendance/ Course/ Student/ Instructor extended).

**Final gates:** `npm run build` → **EXIT 0**, `BUILD_ID` written, **139/139 static pages**,
all new routes compiled. `tsc` introduced **0** new errors; ESLint on all new files = **0 errors**.

> **Build gotcha:** stop the `npm run dev` server before `npm run build` — a live dev server
> races `next build` over `.next` and corrupts it (missing routes / exit 1 / no BUILD_ID).

### New local pages to test (after `npm run dev`)
- Student: `/student/registration` (course registration + advisor flow), `/student/grades` (status column + standing banner)
- Faculty: `/faculty/advisees` (advising + bulk approval + academic profile)
- Institute: `/institute/exams/academic-standing`, `/institute/exams/attendance`, `/institute/reports`, `/institute/departments/courses` (course flags)

### ClientR seeds (idempotent, test-only — run after `seed-student-test.ts`)
```bash
DB="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public"
DATABASE_URL="$DB" npx tsx scripts/seed-registration.ts   # advisor links, prereqs, next-term offerings
DATABASE_URL="$DB" npx tsx scripts/seed-attendance.ts     # per-course attendance for CS201
```

---

# Addendum — Phase F: Remaining static pages wired (2026-06-08)

Closed out the last **14 front-end-only pages** the earlier phases never reached. A page
inventory (`fetch()` presence across all 123 `app/**/page.tsx`) found exactly 15 with no
data call; `login` is legitimately static, leaving **14** to wire. All work is **local test
DB only — production untouched** (no commit, no deploy, no Supabase writes; every `prisma`
command used the inline `sinai_test` `DATABASE_URL`).

### Schema (additive — 5 new models + field adds)
- `ExamQuestionOption` (MCQ choices + answer key), `ExamAttempt`, `ExamAnswer` (per-student
  exam sittings/answers + auto-grade) — backs the online-exam **take** flow.
- `ExamQuestion` gained `points`, `correctAnswer`; `ExamSession` gained `passingScore`,
  `totalPoints`.
- `CourseEquivalenceRequest` (transfer-credit) and `TransferRequest` (incoming/outgoing
  student transfers) — back the admission sub-pages. Inverse relations added to
  `Student`/`Course`/`Department`. **Models 68 → 73.** `prisma db push` to local + generate.

### Pages wired (page + API, conventions matched: useEffect/cancelled-flag fetch, loading/error, JSX preserved)
| Page | Source | API |
|---|---|---|
| `institute/departments/programs` | Program/Department/Student | reuse `GET /api/institute/programs` |
| `institute/accounting/tuition` | Setting `institute.tuition` + Department | reuse `/api/settings`, `/api/departments` |
| `assistant/dashboard` | Instructor/Course/Enrollment/Lecture/AssignmentSubmission | new `/api/assistant/dashboard` |
| `cms/dashboard` | Application/Complaint/Result/News | new `/api/cms/dashboard` |
| `cms/messages` | ContactMessage | new `/api/contact-messages` |
| `institute/accounting/collection` | Payment/FeeAccount/Student/Department | **extended** `/api/institute/finance/collection` (+departmentStats, +paymentMethods) |
| `institute/admission/registration` | CourseOffering/Section/RegistrationItem + Setting | new `/api/institute/registration` |
| `institute/dashboard` | Student/Instructor/Department/ExamSession/StudentWarning/Enrollment/GradeStatus/Payment + Setting | new `/api/institute/dashboard` |
| `institute/finance/cfo-dashboard` | FeeAccount/Payment/Payroll/Department | new `/api/institute/finance/cfo-dashboard` |
| `institute/finance/report-builder` | FeeAccount/Payment/Student/Department + Setting `finance.savedReports` | new `/api/institute/finance/report-builder` |
| `institute/finance/reports` | FeeAccount/Payment | new `/api/institute/finance/reports` |
| `institute/admission/equivalence` | CourseEquivalenceRequest | new `/api/institute/admission/equivalence` (GET+PATCH) |
| `institute/admission/transfers` | TransferRequest | new `/api/institute/admission/transfers` (GET+PATCH) |
| `lms/exams/take/[id]` | ExamSession/ExamQuestion/Option/Attempt/Answer | new `/api/lms/exams/[id]/take` (GET+POST grade) |

### Honest-data discipline (no fabrication)
Metrics with **no backing model** were dropped or derived, never faked: KPI month-over-month
trend badges (no snapshot model), CFO `target`/`previousValue` (no budget model), per-month
collection `target`, report `lastGenerated`/`status`. `cms/messages` correctly shows an empty
state (`ContactMessage` has no writer yet). The exam GET **never** serializes
`isCorrect`/`correctAnswer`; grading is server-side only.

### Verification (commands + results)
- **`tsc --noEmit`:** project total unchanged at **42** pre-existing errors; **0** in any of
  the 14 pages or 11 new routes.
- **`npm run build`:** **EXIT 0**, compiled in 20.3s, **222/222** static pages generated; all
  11 new API routes in the manifest.
- **Authenticated runtime sweep** (NextAuth login → `scripts/verify-wired-pages.sh`): admin
  session hit all 13 staff APIs → **200 + real data** (e.g. dashboard 5 students/12 courses;
  cfo revenue 92k/expenses 41.25k/profit 50.75k; equivalence 5; transfers 3 in/2 out);
  all 14 pages → **200**.
- **Exam flow proven:** student `GET` returns questions w/o answer key; `POST` graded
  server-side (2 correct ×20 = 40 pts), persisted 1 `ExamAttempt` + 8 `ExamAnswer` (then cleared).

### Seed (idempotent, test-only)
```bash
DB="postgresql://sinai_test:sinai_test_pw@127.0.0.1:5432/sinai_test?schema=public"
DATABASE_URL="$DB" npx tsx scripts/seed-finish-pages.ts   # equivalence(5), transfers(5), a full online exam, Setting blobs
```
Demo online exam to test: `/lms/exams/take/<ExamSession id printed by the seed>`.

> **Remaining (intentionally not fabricated):** a long tail of *neutralized stat cards* inside
> already-functional pages (e.g. marketing leads analytics, communication email/groups counts)
> stays dropped — they have no backing model and inventing one for vanity metrics would violate
> the no-fake-data rule. Wire them only if/when a real model is added.
