# Route Inventory

**Source**: `find app -name "*.tsx"` + directory tree inspection  
**Last updated**: 2026-03-28  
**Status key**: ✅ Implemented · ⚠️ Partial · ❌ Not implemented · 🚫 Directory exists but no page.tsx (404s)

---

## Public Routes — `app/(public)/`

Layout: `app/(public)/layout.tsx` — server component wrapping `PublicHeader` + `PublicFooter` + children. No auth check.

| Route | File | Purpose | Auth | Data Source | Status |
|-------|------|---------|------|------------|--------|
| `/` | `(public)/page.tsx` | Institute homepage | None | `localStorage` (slides, stats, news, specializations) | ✅ (client-rendered, DB not used) |
| `/apply` | `(public)/apply/page.tsx` | Online enrollment form (3 steps) | None | `POST /api/applications` | ✅ |
| `/complaints` | `(public)/complaints/page.tsx` | Complaint submission form | None | `POST /api/complaints` | ✅ |
| `/schedules` | `(public)/schedules/page.tsx` | Academic timetable viewer | None | `GET /api/schedules` | ✅ |
| `/pages/[slug]` | `(public)/pages/[slug]/page.tsx` | Legacy GrapesJS page render | None | `GET /api/pages?slug=X` + localStorage fallback | ⚠️ Has localStorage fallback |
| `/[slug]` | `(public)/[slug]/page.tsx` | Primary CMS dynamic page | None | `GET /api/pages?slug=X` | ✅ (has 15+ debug console.logs in prod) |
| `/about` | `(public)/about/` (EMPTY DIR) | — | — | — | 🚫 404 |
| `/admission` | `(public)/admission/` (EMPTY DIR) | — | — | — | 🚫 404 |
| `/contact` | `(public)/contact/` (EMPTY DIR) | — | — | — | 🚫 404 |
| `/departments` | `(public)/departments/` (EMPTY DIR) | — | — | — | 🚫 404 |
| `/results` | `(public)/results/` (EMPTY DIR) | — | — | — | 🚫 404 |

> ⚠️ `/about`, `/admission`, `/contact`, `/departments`, `/results` directories exist but contain no `page.tsx`. These routes return 404. Content for these must be created via the CMS and will render at `/[slug]` (e.g., `/about` if a page with `slug=about` is published).

---

## Root-Level Dynamic Route

| Route | File | Purpose | Notes |
|-------|------|---------|-------|
| `/[slug]` | `app/[slug]/page.tsx` | Unknown | Exists outside all route groups. Relationship to `(public)/[slug]/page.tsx` is ambiguous. May shadow portal routes. |

---

## Auth Routes — `app/(auth)/`

Layout: `app/(auth)/layout.tsx` — passthrough (`<>{children}</>`)

| Route | File | Purpose | Auth | Status |
|-------|------|---------|------|--------|
| `/login` | `(auth)/login/page.tsx` (inferred) | NextAuth credentials login | Can't access if already authenticated (middleware redirects) | ✅ |

> Note: exact file location confirmed via middleware redirect `new URL('/login', req.url)`. Directory exists as `app/(auth)/`.

---

## CMS Routes — `app/(cms)/`

Layout: `app/(cms)/layout.tsx` — `'use client'`, full sidebar navigation + `signOut`. Protected by `middleware.ts` (redirects to `/login` if no session).

| Route | File | Purpose | Auth | Data | Status |
|-------|------|---------|------|------|--------|
| `/cms/dashboard` | `(cms)/cms/dashboard` | CMS home | ✅ Required | None inferred | ✅ |
| `/cms/departments` | `(cms)/cms/departments/page.tsx` | CRUD departments | ✅ Required | `/api/departments` | ✅ |
| `/cms/news` | `(cms)/cms/news/page.tsx` | CRUD news + announcements | ✅ Required | `/api/news` | ✅ |
| `/cms/applications` | `(cms)/cms/applications/page.tsx` | Review applications | ✅ Required | `/api/applications` | ✅ |
| `/cms/complaints` | `(cms)/cms/complaints/page.tsx` | Review complaints | ✅ Required | `/api/complaints` | ✅ |
| `/cms/results` | `(cms)/cms/results/page.tsx` | Manage exam results | ✅ Required | `/api/results` | ⚠️ POST broken (field mismatch) |
| `/cms/schedules` | `(cms)/cms/schedules/page.tsx` | Manage timetables | ✅ Required | `/api/schedules` + `/api/upload` | ✅ |
| `/cms/pages` | `(cms)/cms/pages/page.tsx` | GrapesJS page list | ✅ Required | `/api/pages` (`force-dynamic`) | ✅ |
| `/cms/pages-new` | `(cms)/cms/pages-new/page.tsx` | Second page manager | ✅ Required | Unknown | ⚠️ Relationship to `/cms/pages` unclear |
| `/cms/page-builder-grapes/[id]` | `(cms)/cms/page-builder-grapes/[id]/page.tsx` | GrapesJS visual editor | ✅ Required | `/api/pages/[id]`, `/api/pages/[id]/blocks` | ✅ |
| `/cms/page-builder/[id]` | `(cms)/cms/page-builder/[id]/page.tsx` | Legacy page builder | ✅ Required | `/api/pages/[id]` | ⚠️ Possibly replaced by GrapesJS |
| `/cms/homepage` | `(cms)/cms/homepage/page.tsx` | Homepage config | ✅ Required | `localStorage` (NOT DB) + `/api/upload-image` | ⚠️ Config not persisted to DB |
| `/cms/migrate-pages` | `(cms)/cms/migrate-pages/page.tsx` | One-time migration tool | ✅ Required | `/api/pages/migrate` | ⚠️ Utility; should be removed after use |
| `/cms/seed-pages` | `(cms)/cms/seed-pages/page.tsx` | Page seeder | ✅ Required | `/api/pages/seed` | ⚠️ Utility |
| `/cms/settings` | `(cms)/cms/settings/page.tsx` | Site settings | ✅ Required | `Setting` model (usage extent uncertain) | ⚠️ |

---

## Institute Admin Portal — `app/(institute)/`

Layout: `app/(institute)/layout.tsx` — `'use client'`, framer-motion sidebar. **No auth check.** Publicly accessible.

All pages: hardcoded static data. No API or DB connections confirmed.

| Route | Purpose | Data | Status |
|-------|---------|------|--------|
| `/institute/dashboard` | Overview dashboard | Hardcoded | ⚠️ UI only |
| `/institute/departments` | Dept overview | Hardcoded | ⚠️ UI only |
| `/institute/departments/courses` | Course list | Hardcoded | ⚠️ UI only |
| `/institute/departments/plans` | Study plans | Hardcoded | ⚠️ UI only |
| `/institute/departments/programs` | Programs | Hardcoded | ⚠️ UI only |
| `/institute/students` | Student list | Hardcoded | ⚠️ UI only |
| `/institute/students/attendance` | Attendance | Hardcoded | ⚠️ UI only |
| `/institute/students/advising` | Academic advising | Hardcoded | ⚠️ UI only |
| `/institute/students/graduation` | Graduation | Hardcoded | ⚠️ UI only |
| `/institute/students/warnings` | Academic warnings | Hardcoded | ⚠️ UI only |
| `/institute/faculty` | Faculty list | Hardcoded | ⚠️ UI only |
| `/institute/faculty/schedules` | Faculty timetables | Hardcoded | ⚠️ UI only |
| `/institute/faculty/workload` | Workload | Hardcoded | ⚠️ UI only |
| `/institute/faculty/office-hours` | Office hours | Hardcoded | ⚠️ UI only |
| `/institute/exams` | Exam management | Hardcoded | ⚠️ UI only |
| `/institute/exams/grades` | Grade entry | Hardcoded | ⚠️ UI only |
| `/institute/exams/results` | Result view | Hardcoded | ⚠️ UI only |
| `/institute/exams/control` | Exam control | Hardcoded | ⚠️ UI only |
| `/institute/exams/appeals` | Grade appeals | Hardcoded | ⚠️ UI only |
| `/institute/exams/question-bank` | Question bank | Hardcoded | ⚠️ UI only |
| `/institute/online-exams` | Online exam mgmt | Hardcoded | ⚠️ UI only |
| `/institute/online-exams/create` | Create exam | Hardcoded | ⚠️ UI only |
| `/institute/online-exams/question-bank` | Q-bank | Hardcoded | ⚠️ UI only |
| `/institute/online-exams/reports` | Exam reports | Hardcoded | ⚠️ UI only |
| `/institute/finance` | Finance dashboard | Hardcoded | ⚠️ UI only |
| `/institute/finance/cfo-dashboard` | CFO view | Hardcoded | ⚠️ UI only |
| `/institute/finance/collection` | Fee collection | Hardcoded | ⚠️ UI only |
| `/institute/finance/installments` | Installment plans | Hardcoded | ⚠️ UI only |
| `/institute/finance/reports` | Finance reports | Hardcoded | ⚠️ UI only |
| `/institute/finance/report-builder` | Report builder | Hardcoded | ⚠️ UI only |
| `/institute/finance/scholarships` | Scholarships | Hardcoded | ⚠️ UI only |
| `/institute/accounting/dashboard` | Accounting | Hardcoded | ⚠️ UI only |
| `/institute/accounting/collection` | Collection | Hardcoded | ⚠️ UI only |
| `/institute/accounting/tuition` | Tuition | Hardcoded | ⚠️ UI only |
| `/institute/banking/dashboard` | Banking | Hardcoded | ⚠️ UI only |
| `/institute/payroll/dashboard` | Payroll | Hardcoded | ⚠️ UI only |
| `/institute/programs` | Academic programs | Hardcoded | ⚠️ UI only |
| `/institute/programs/courses` | Program courses | Hardcoded | ⚠️ UI only |
| `/institute/programs/content` | Content | Hardcoded | ⚠️ UI only |
| `/institute/library` | Library | Hardcoded | ⚠️ UI only |
| `/institute/activities` | Activities | Hardcoded | ⚠️ UI only |
| `/institute/certificates` | Certificates | Hardcoded | ⚠️ UI only |
| `/institute/communication` | Communication | Hardcoded | ⚠️ UI only |
| `/institute/admission` | Admission mgmt | Hardcoded | ⚠️ UI only |
| `/institute/admission/registration` | Registration | Hardcoded | ⚠️ UI only |
| `/institute/admission/equivalence` | Equivalence | Hardcoded | ⚠️ UI only |
| `/institute/admission/transfers` | Transfers | Hardcoded | ⚠️ UI only |
| `/institute/quality` | Quality assurance | Hardcoded | ⚠️ UI only |
| `/institute/marketing` | Marketing | Hardcoded | ⚠️ UI only |
| `/institute/partnerships` | Partnerships | Hardcoded | ⚠️ UI only |
| `/institute/trainees` | Trainees | Hardcoded | ⚠️ UI only |
| `/institute/trainers` | Trainers | Hardcoded | ⚠️ UI only |
| `/institute/settings` | Settings | Hardcoded | ⚠️ UI only |
| `/institute/settings/ai` | AI settings | Hardcoded | ⚠️ UI only |
| `/institute/settings/credit-hours` | Credit hours | Hardcoded | ⚠️ UI only |

> ⚠️ Note: `app/(institute)/institute/payroll/{dashboard}/` contains a directory with literal curly braces `{dashboard}` — a filesystem artifact, not a valid Next.js route. Next.js ignores it.

---

## Student Portal — `app/(student)/`

Layout: `'use client'`, framer-motion sidebar. **No auth check.** Publicly accessible.

| Route | Purpose | Data | Status |
|-------|---------|------|--------|
| `/student/dashboard` | Student home | Hardcoded | ⚠️ UI only |
| `/student/grades` | Grades + GPA | `const subjectGrades = [...]` (static array) | ⚠️ UI only |
| `/student/schedule` | Timetable | Hardcoded | ⚠️ UI only |
| `/student/attendance` | Attendance | Hardcoded | ⚠️ UI only |
| `/student/assignments` | Assignments | Hardcoded | ⚠️ UI only |
| `/student/fees` | Tuition fees | Hardcoded | ⚠️ UI only |
| `/student/profile` | Profile | Hardcoded | ⚠️ UI only |
| `/student/elearning` | E-learning links | Hardcoded | ⚠️ UI only |
| `/student/gamification` | Points/badges overview | Hardcoded | ⚠️ UI only |
| `/student/gamification/badges` | Badge list | Hardcoded | ⚠️ UI only |
| `/student/gamification/leaderboard` | Leaderboard | Hardcoded | ⚠️ UI only |
| `/student/gamification/points` | Points history | Hardcoded | ⚠️ UI only |
| `/student/gamification/rewards` | Rewards shop | Hardcoded | ⚠️ UI only |

---

## Faculty Portal — `app/(faculty)/`

Layout: `'use client'`, framer-motion sidebar. **No auth check.** Publicly accessible.

| Route | Purpose | Data | Status |
|-------|---------|------|--------|
| `/faculty/dashboard` | Faculty home | Hardcoded | ⚠️ UI only |
| `/faculty/courses` | Course management | Hardcoded | ⚠️ UI only |
| `/faculty/grades` | Grade entry | Hardcoded | ⚠️ UI only |
| `/faculty/schedule` | Teaching schedule | Hardcoded | ⚠️ UI only |
| `/faculty/students` | Student list | Hardcoded | ⚠️ UI only |
| `/faculty/research` | Research projects | Hardcoded | ⚠️ UI only |
| `/faculty/research/publications` | Publications | Hardcoded | ⚠️ UI only |
| `/faculty/office-hours` | Office hours | Hardcoded | ⚠️ UI only |
| `/faculty/messages` | Messages | Hardcoded | ⚠️ UI only |
| `/faculty/settings` | Settings | Hardcoded | ⚠️ UI only |

---

## Teaching Assistant Portal — `app/(assistant)/`

Layout: server component (no `'use client'`). **No auth check.**

| Route | Purpose | Data | Status |
|-------|---------|------|--------|
| `/assistant/dashboard` | Assistant home | Hardcoded | ⚠️ UI only |

---

## Parent Portal — `app/(parent)/`

Layout: `'use client'`, framer-motion sidebar. **No auth check.** Publicly accessible.

| Route | Purpose | Data | Status |
|-------|---------|------|--------|
| `/parent/dashboard` | Parent home | Hardcoded | ⚠️ UI only |
| `/parent/children` | Children overview | Hardcoded | ⚠️ UI only |
| `/parent/fees` | Fee status | Hardcoded | ⚠️ UI only |
| `/parent/messages` | Messages | Hardcoded | ⚠️ UI only |
| `/parent/reports` | Progress reports | Hardcoded | ⚠️ UI only |

---

## LMS — `app/(lms)/`

Layout: `'use client'`, framer-motion sidebar. **No auth check.** Scaffold only.

| Route | Purpose | Data | Status |
|-------|---------|------|--------|
| `/lms/dashboard` | LMS home | Hardcoded | ❌ Scaffold |
| `/lms/content` | Course content | Hardcoded | ❌ Scaffold |
| `/lms/assignments` | Assignments | Hardcoded | ❌ Scaffold |
| `/lms/exams` | Exam list | Hardcoded | ❌ Scaffold |
| `/lms/exams/take/[id]` | Take exam | Hardcoded | ❌ Scaffold |
| `/lms/forums` | Discussion forums | Hardcoded | ❌ Scaffold |
| `/lms/virtual-classes` | Virtual classes | Hardcoded | ❌ Scaffold |
| `/lms/settings/protection` | DRM settings | Hardcoded | ❌ Scaffold |

---

## API Routes — `app/api/`

| Endpoint | Methods | Auth on writes | DB model | Notes |
|----------|---------|---------------|---------|-------|
| `/api/auth/[...nextauth]` | GET, POST | — | `User` (bypassed) | Hardcoded cred check |
| `/api/departments` | GET, POST, PUT, DELETE | POST/PUT/DELETE: ✅ Session | `Department` | GET: public |
| `/api/news` | GET, POST, PUT(?), DELETE(?) | POST+: ✅ Session | `News` | GET: public with filters |
| `/api/applications` | GET, POST, PUT | GET: ✅ Session · POST: ❌ None | `Application` | POST public by design |
| `/api/complaints` | GET, POST, PATCH | GET: ✅ Session · POST: ❌ None | `Complaint` | POST public by design |
| `/api/results` | GET, POST, PUT, DELETE | GET: ❌ None · POST+: ✅ Session | `Result`, `StudentResult` | ⚠️ POST BROKEN (wrong fields) |
| `/api/schedules` | GET, POST, PUT, DELETE | GET: ❌ None · POST+: ✅ Session | `Schedule`, `Lecture` | GET: public |
| `/api/upload` | POST | ✅ Session | — | → Cloudinary `sinai-institute/{type}` |
| `/api/upload-image` | POST | ❌ **No auth** | — | → Cloudinary `sinai-institute/news` |
| `/api/upload-media` | POST | Unknown | — | → Cloudinary (assumed) |
| `/api/pages` | GET, POST, PATCH | GET: ❌ None · POST/PATCH: ❌ **No auth** | `Page` | ⚠️ Unauthenticated write |
| `/api/pages/[id]` | GET, PUT, DELETE | Unknown | `Page`, `PageBlock`, `PageVersion` | |
| `/api/pages/[id]/blocks` | GET, POST | Unknown | `PageBlock`, `PageVersion` | POST does full block replace + versioning |
| `/api/pages/migrate` | POST | Unknown | `Page` | One-time migration utility |
| `/api/pages/seed` | POST | Unknown | `Page` | Seeder utility |

---

## Static / Public Assets

| Path | Content | Notes |
|------|---------|-------|
| `/manifest.json` | PWA manifest | Wired; `sw.js` not found in `public/` |
| `/check-localstorage.html` | localStorage inspector debug tool | ⚠️ Accessible in production |
| `/logo.png` | Institute logo | Used in header |
| `/favicon.ico`, `/favicon-*.png`, `/apple-touch-icon.png` | Icons | |
| `/uploads/applications/`, `/uploads/news/`, `/uploads/results/`, `/uploads/schedules/` | Upload subdirs | Likely empty — uploads go to Cloudinary not here |
| `/images/news/`, `/images/general-news/` | Committed static images | WhatsApp-sourced press photos |
