# Feature Inventory

**Legend**: ✅ Confirmed working · ⚠️ Partial/uncertain · ❌ Not implemented · ☠️ Broken at runtime  
**Source**: Direct code inspection, API route reading, Vercel audit — 2026-03-28  
**Only items with code evidence are marked ✅**

---

## Public Website (`app/(public)/`)

| Feature | Status | Route | Notes |
|---------|--------|-------|-------|
| Homepage shell | ✅ | `/` | Renders; 723 lines |
| Homepage Hero Slider | ⚠️ | `/` | `localStorage['homepage_slides']` — browser-local only |
| Homepage News Ticker | ⚠️ | `/` | `localStorage['homepage_ticker_news']` — browser-local only |
| Homepage Specializations | ⚠️ | `/` | `localStorage` only; `HomepageSpecialization` model does NOT exist |
| Homepage Stats | ⚠️ | `/` | `localStorage['homepage_stats']` |
| Footer Social Media links | ⚠️ | global | `localStorage` only |
| Online enrollment (3-step) | ✅ | `/apply` | → `POST /api/applications` (no auth — public by design) |
| Complaints form | ✅ | `/complaints` | → `POST /api/complaints` |
| Schedule viewer | ✅ | `/schedules` | → `GET /api/schedules` |
| GrapesJS dynamic page render | ✅ | `/[slug]` | 15+ debug console.logs in production |
| Legacy page render | ✅ | `/pages/[slug]` | API + localStorage fallback |
| `/about` named route | ❌ | `/about` | Directory exists, no `page.tsx` — **404** |
| `/admission` named route | ❌ | `/admission` | Same — **404** |
| `/contact` named route | ❌ | `/contact` | Same — **404** |
| `/departments` named route | ❌ | `/departments` | Same — **404** |
| `/results` named route | ❌ | `/results` | Same — **404** |
| News listing page | ❓ | `/news`? | Route not confirmed |
| Language toggle (AR/EN) | ❌ | — | `next-intl` installed, not wired to any UI |
| PWA install prompt | ☠️ | — | `register-sw.ts` present, `public/sw.js` absent — silently fails |

---

## CMS Panel (`app/(cms)/`) — Single user: `admin@sainaiinstitute.com` / `admin123`

| Feature | Status | Route | Notes |
|---------|--------|-------|-------|
| Login | ✅ | `/login` | Hardcoded string match — no DB query |
| Dashboard | ✅ | `/cms/dashboard` | |
| Department CRUD | ✅ | `/cms/departments` | → `/api/departments` |
| News CRUD | ✅ | `/cms/news` | → `/api/news` |
| Application review | ✅ | `/cms/applications` | → `/api/applications` |
| Complaint management | ✅ | `/cms/complaints` | |
| Results management UI | ⚠️ | `/cms/results` | UI exists; `/api/results` POST is **broken** |
| Schedule manage/upload | ✅ | `/cms/schedules` | → `/api/upload` (Cloudinary) |
| GrapesJS page list | ✅ | `/cms/pages` | force-dynamic; reads DB |
| Second page list UI | ⚠️ | `/cms/pages-new` | Relationship to `/cms/pages` unclear |
| GrapesJS page editor | ✅ | `/cms/page-builder-grapes/[id]` | Static import inside `'use client'` — safe |
| Legacy page builder | ⚠️ | `/cms/page-builder/[id]` | Pre-GrapesJS builder — may still exist; relationship to GrapesJS editor unclear |
| Homepage CMS controls | ⚠️ | `/cms/homepage` | Saves to localStorage — not DB (except news: ✅ institute/general news wired to /api/news 2026-04-05) |
| Hero slider upload | ✅ | `/cms/homepage` | → `/api/upload-image` (Cloudinary) |
| Social media management | ⚠️ | `/cms/homepage` | localStorage only |
| Specialization card editor | ⚠️ | `/cms/homepage` | localStorage only |
| Page migration tool | ✅ | `/cms/migrate-pages` | One-time tool — still live and active |
| Page seeder | ✅ | `/cms/seed-pages` | Still live |
| Site settings | ⚠️ | `/cms/settings` | `Setting` model exists; UI depth uncertain |
| Page version history capture | ✅ | via blocks API | Versions written on `createVersion=true` |
| Page version restore | ❌ | — | No restore API observed |
| Role-based CMS access | ❌ | — | `User.role` exists; not enforced anywhere |
| Multi-user CMS | ❌ | — | One hardcoded credential |

---

## API Routes — Complete Table

| Endpoint | Methods | Session on writes | Status |
|----------|---------|-----------------|--------|
| `/api/auth/[...nextauth]` | POST | — | ✅ (hardcoded bypass) |
| `/api/departments` | GET, PUT | inferred | ✅ |
| `/api/news` | GET, POST, PUT, DELETE | ✅ getServerSession on writes | ✅ GET filter fixed 2026-04-05 (`isPublished`, `publishDate`) — PUT field mapping fixed 2026-04-05 |
| `/api/applications` | GET, POST, PUT | GET: ✅ · POST: ❌ none | ✅ (public POST intentional) |
| `/api/complaints` | GET, POST, PATCH | POST: ❌ none | ✅ (public POST intentional) |
| `/api/results` | GET, POST, PUT, DELETE | GET: ❌ none | ☠️ **POST broken** (field mismatch) · **GET broken** (bad orderBy) |
| `/api/schedules` | GET, POST, PUT, DELETE | inferred | ✅ |
| `/api/upload` | POST | ✅ guarded | ✅ → Cloudinary |
| `/api/upload-image` | POST | ❌ **None** | ⚠️ Open endpoint → Cloudinary |
| `/api/upload-media` | POST | uncertain | ⚠️ → Cloudinary (auth status unknown) |
| `/api/pages` | GET, POST, PATCH | ❌ **None on writes** | ⚠️ GET ✅ · writes unauthenticated |
| `/api/pages/[id]` | GET, PUT, DELETE | uncertain | ✅ |
| `/api/pages/[id]/blocks` | GET, POST | uncertain | ✅ (non-atomic delete+create) |
| `/api/pages/migrate` | POST | uncertain | ⚠️ Production utility — auth status unknown |
| `/api/pages/seed` | POST | uncertain | ⚠️ Production utility — auth status unknown |

---

## Portal Pages — All `'use client'`, No Auth, Hardcoded Data

| Portal | Route | Pages (approx) | DB backing? |
|--------|-------|----------------|------------|
| Institute admin | `/institute/*` | ~54 | ❌ None |
| Student | `/student/*` | ~14 | ❌ None |
| Faculty | `/faculty/*` | ~11 | ❌ None |
| Teaching assistant | `/assistant/*` | unknown | ❌ None |
| Parent | `/parent/*` | unknown | ❌ None |
| Library admin | `/library-admin/*` | unknown | ❌ None |
| Accountant | `/accountant/*` | unknown | ❌ None |
| LMS | `/lms/*` | 9 (scaffold) | ❌ None |

No `Student`, `Faculty`, `Exam`, `Finance`, or `Course` model exists in `prisma/schema.prisma`. Portal data cannot be made live without schema extension.

---

## Infrastructure / DevOps

| Feature | Status | Notes |
|---------|--------|-------|
| Vercel deployment | ✅ Active | Manual CLI; 57 days stale |
| GitHub repo | ✅ Active | `tahaspace/sinai-institute` — private |
| CI/CD | ❌ None | Manual `vercel --prod` only |
| Git auto-deploy | ❌ None | No Vercel Git integration |
| Staging environment | ❌ None | Dev and prod share same DB |
| Error monitoring | ❌ None | No Sentry/Datadog etc. |
| Uptime monitoring | ❌ None | No external monitor |
| Email/SMTP | ❌ None | Config in `.env.example`; no mailer library |
| Analytics | ❌ None | |
| Cloudinary | ✅ Active | Credentials in prod dashboard (52d old) |
| DB backups | ⚠️ Unknown | Supabase free tier: daily snapshots only (PITR on Pro) |

---

## ClientR2 — Result Status & Exceptional Cases (local/test only, branch `feat/rbac-multitenant-platform`)

| Feature | Status | Route | Notes |
|---------|--------|-------|-------|
| Result-state rules table (config) | ✅ | `/institute/exams/result-states` | per-status props + reason catalogue; PATCH live |
| Exceptional-case control desk | ✅ | `/institute/exams/exceptions` | set status+reason+makeup deadline; pending-approval queue; resolve |
| Result reasons CRUD | ✅ | `GET/POST/PATCH/DELETE /api/institute/course-result-reasons` | `exam.grade.edit` |
| Exceptions workflow API | ✅ | `GET/PATCH /api/institute/exams/exceptions` | set/approve/reject/resolve; audited |
| Grade-status props expose/edit | ✅ | `/api/institute/grade-statuses` | +countsAttempt/needsAction/nextAction/isException/isFinal |
| Fail-reasons report | ✅ | `/api/institute/reports?type=fail-reasons` | أسباب الرسوب |
| Absence-reasons report | ✅ | `/api/institute/reports?type=absence-reasons` | أسباب الغياب |
| Open-actions report | ✅ | `/api/institute/reports?type=open-actions` | الإجراءات المفتوحة |
| Permissions | ✅ | RBAC | `exam.exception.view/set/approve`; REGISTRAR=view+approve |

> ✅ = code-complete + `tsc`/ESLint clean. DB push + seed (`scripts/seed-result-states.ts`) pending a local/test DB run; production untouched.
