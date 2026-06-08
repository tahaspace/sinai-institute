# Pending Features

**Evidence sources**: `cursor_edusaas.md`, `cursor_news bar 2.md`, `cursor_homepage_specialization_section.md`, `ARCHITECTURE.md`, source code analysis  
**Classification**: ✅ Implemented | ⚠️ Partially Implemented | ❌ Planned / Not Implemented

---

## 1. CMS & Content Management

| Feature | Status | Notes |
|---------|--------|-------|
| GrapesJS page builder | ✅ Implemented | `/cms/page-builder-grapes/[id]` exists |
| Page CRUD with hierarchy (3 levels) | ✅ Implemented | `Page` model with `parentId`, `PageBlock`, `PageVersion` |
| Dynamic header navigation from CMS pages | ✅ Implemented | `public-header.tsx` reads from DB |
| Page version history | ⚠️ Partial | `PageVersion` model exists; UI for restore uncertain |
| Full page-to-public-URL mapping | ⚠️ Partial | `/pages/[slug]` exists but hardcoded pages (`/about` etc.) not redirected |
| Tiptap rich text editor in CMS | ✅ Implemented | Tiptap packages in `package.json` (`@tiptap/*`) |
| GrapesJS Arabicization | ⚠️ Partial | Some plugins remain untranslated (flagged in `cursor_.md`) |
| CMS page builder: responsive controls (desktop/tablet/mobile) | ⚠️ Partial | `PageBlock` has `desktop`, `tablet`, `mobile` fields but UI uncertain |
| Widget templates library | ⚠️ Partial | `WidgetTemplate` model exists; UI uncertain |
| Undo/Redo in page builder | ❌ Not implemented | GrapesJS supports natively but integration not confirmed |
| Autosave in page builder | ❌ Not implemented | Mentioned in chat as not yet done |
| Custom domain page builder export | ❌ Not implemented | — |

---

## 2. Authentication & Authorization

| Feature | Status | Notes |
|---------|--------|-------|
| Admin login (`/login`) | ✅ Implemented | NextAuth credentials provider |
| CMS protected by middleware | ✅ Implemented | `middleware.ts` covers `/cms/*` |
| Role-based access in CMS | ⚠️ Partial | `User.role` field exists (`EDITOR`, `ADMIN`); middleware doesn't enforce roles |
| Student/Faculty/Portal authentication | ❌ Not implemented | Portal pages exist but have no auth guard |
| Password reset flow | ❌ Not implemented | No API route or UI found |
| OAuth / social login | ❌ Not implemented | Only credentials provider configured |
| Multi-user CMS (different editors) | ❌ Not implemented | Single admin user in seed |

---

## 3. Public Website Features

| Feature | Status | Notes |
|---------|--------|-------|
| Homepage with Hero Slider | ✅ Implemented | CMS-controlled slides |
| Homepage news ticker | ✅ Implemented | CMS-controlled |
| Homepage specialization section | ⚠️ Partial | Configuration stored in `localStorage` — not DB |
| Homepage statistics section | ⚠️ Partial | CMS tab exists; localStorage or DB uncertain |
| Social media footer links | ⚠️ Partial | `localStorage` only — not shared across users |
| About page | ✅ Implemented | Full content, animated design |
| Admission page | ✅ Implemented | Full content including job prospects |
| Departments listing | ✅ Implemented | 6 departments from DB |
| Specializations under departments | ✅ Implemented | `Specialization` model |
| Student results lookup | ✅ Implemented | `/results` — filter by dept + year |
| Schedule viewer | ✅ Implemented | `/schedules` — PDF/image display |
| Online application (3-step) | ✅ Implemented | `/apply` with form validation |
| Contact form | ✅ Implemented | `/contact` → `ContactMessage` table |
| Complaints form | ✅ Implemented | `/complaints` → `Complaint` table |
| Student result PDF download | ✅ Implemented | `allowDownload` flag on `Result` |
| News/announcements page | ⚠️ Partial | News model exists; public news listing page uncertain |
| Bilingual switching (AR/EN) | ⚠️ Partial | `next-intl` installed, locale files exist; public toggle UI not confirmed |
| SEO metadata per page | ⚠️ Partial | `metaTitle`, `metaDesc`, `metaKeywords` in `Page` model; static pages may lack this |

---

## 4. Institute Admin Dashboard (`/institute/*`)

| Feature | Status | Notes |
|---------|--------|-------|
| Admin dashboard overview | ✅ Implemented | Stats cards |
| Department management | ✅ Implemented | Part of 56-file institute section |
| Faculty/staff management | ✅ Implemented | Listed in checklist |
| Exam management | ✅ Implemented | `app/(institute)/exams/` |
| Online exam system | ✅ Implemented | `app/(institute)/online-exams/` |
| Finance / tuition tracking | ⚠️ Partial | UI exists; backend API uncertain |
| Accounting / payroll | ⚠️ Partial | UI exists; DB models uncertain |
| Banking module | ⚠️ Partial | UI exists; integration uncertain |
| Library management | ⚠️ Partial | Admin portal exists |
| Attendance tracking | ⚠️ Partial | UI pages exist |
| Marketing / partnerships | ⚠️ Partial | Listed in color migration files |
| Certificate generation | ⚠️ Partial | Mentioned in checklists |
| Academic advising (إرشاد) | ⚠️ Partial | UI pages in institute section |

---

## 5. Student Portal (`/student/*`)

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ✅ Implemented | 14 pages per chat report |
| Personal profile | ✅ Implemented | — |
| Timetable | ✅ Implemented | — |
| Grades / GPA | ✅ Implemented | — |
| Attendance | ✅ Implemented | — |
| Assignments | ✅ Implemented | — |
| LMS integration | ⚠️ Partial | `/lms/` route group exists (9 files), content uncertain |
| Financial balance / tuition | ✅ Implemented | Listed in portal features |
| Live DB data (not mock) | ❌ Not implemented | *Uncertain* — portal pages may use hardcoded/mock data |

---

## 6. Faculty Portal (`/faculty/*`)

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ✅ Implemented | 11 pages per chat report |
| Course management | ✅ Implemented | — |
| Student roster | ✅ Implemented | — |
| Grade entry | ✅ Implemented | — |
| Assignment management | ✅ Implemented | — |
| Research / publication tracking | ✅ Implemented | Mentioned in portal list |
| Office hours management | ✅ Implemented | — |
| Live DB data | ❌ *Uncertain* | — |

---

## 7. LMS (`/lms/*`)

| Feature | Status | Notes |
|---------|--------|-------|
| LMS dashboard | ⚠️ Partial | 9 files, basic scaffold |
| Content management | ⚠️ Partial | — |
| Assignments | ⚠️ Partial | — |
| Virtual classes | ⚠️ Partial | Listed but not confirmed functional |
| Video streaming | ❌ Not implemented | — |
| Progress tracking | ❌ Not implemented | — |
| Quizzes / online exams in LMS | ❌ Not implemented | Separate online-exams system in institute panel |

---

## 8. API Coverage

| API Route | Status |
|-----------|--------|
| `/api/auth/[...nextauth]` | ✅ |
| `/api/departments` | ✅ |
| `/api/news` | ✅ |
| `/api/applications` | ✅ |
| `/api/complaints` | ✅ |
| `/api/results` | ✅ |
| `/api/schedules` | ✅ |
| `/api/upload` | ✅ |
| `/api/upload-image` | ✅ (Cloudinary) |
| `/api/upload-media` | ✅ (Cloudinary) |
| `/api/pages` | ✅ |
| `/api/pages/[id]` | ✅ |
| `/api/pages/[id]/blocks` | ✅ |
| `/api/pages/migrate` | ✅ |
| Student-specific APIs | ❌ No dedicated student APIs found |
| Faculty-specific APIs | ❌ No dedicated faculty APIs found |
| Finance / payroll APIs | ❌ Not confirmed |
| LMS content APIs | ❌ Not confirmed |

---

## 9. Infrastructure / DevOps

| Feature | Status | Notes |
|---------|--------|-------|
| Vercel deployment | ✅ Active | Manual CLI deploy |
| GitHub repo | ✅ Active | `tahaspace/sinai-institute` |
| CI/CD pipeline | ❌ Not implemented | Manual deploys only |
| Automatic deploys on push | ❌ Not implemented | Git integration not active in Vercel |
| Staging environment | ❌ Not implemented | Only production (`test.sinaiinstitute.com`) |
| Email notifications (SMTP) | ❌ Not implemented | Config in `.env.example` but no `nodemailer` or similar in `package.json` |
| Error monitoring (Sentry, etc.) | ❌ Not implemented | — |
| Analytics | ❌ Not implemented | — |
| Cloudinary media library | ✅ Active | Credentials set in production |

---

## 10. Internalization / Localization

| Feature | Status | Notes |
|---------|--------|-------|
| Arabic content | ✅ Implemented | Primary language throughout |
| English content fields in schema | ✅ Implemented | `nameEn`, `titleEn`, etc. |
| `next-intl` integration | ⚠️ Partial | Package installed; locale files (`ar.json`, `en.json`) exist; public language switcher UI not confirmed |
| RTL layout | ✅ Implemented | `dir="rtl"` in layout |
| English UI | ❌ Not implemented | English locale file exists but no UI toggle confirmed |
