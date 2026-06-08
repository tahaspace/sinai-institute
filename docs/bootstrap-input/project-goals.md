# Project Goals — معهد سيناء العالي

**Evidence sources**: `package.json`, `prisma/schema.prisma`, `ARCHITECTURE.md`, `README.md`, `cursor_edusaas.md`

---

## 1. What This Project Is

A **full-stack SaaS-style education platform** for **Sinai Higher Institute for Specific Studies** (معهد سيناء العالي للدراسات النوعية). The institute has two physical branches (Ismailia, Arish), operates under Ministerial Decree 1313 (25/5/2005), and is affiliated with the Egyptian Ministry of Higher Education.

The platform is built as a **multi-portal self-service web application** deployed on Vercel (subdomain `test.sinaiinstitute.com`), with the main institutional website at `sinaiinstitute.com` (served from A2Hosting).

---

## 2. Core Platform Goals (implemented)

| Goal | Status | Evidence |
|------|--------|----------|
| Public-facing institutional website (Arabic RTL) | ✅ Implemented | `app/(public)/` — 9 pages |
| CMS Panel for non-technical content management | ✅ Implemented | `app/(cms)/` |
| Institute admin dashboard | ✅ Implemented | `app/(institute)/` |
| Student portal | ✅ Implemented | `app/(student)/` |
| Faculty / Doctor portal | ✅ Implemented | `app/(faculty)/` |
| Teaching assistant portal (معيد) | ✅ Implemented | `app/(assistant)/` |
| LMS (Learning Management System) | ✅ Partially Implemented | `app/(lms)/` — 9 files, content incomplete |
| Parent portal | ✅ Implemented | `app/(parent)/` |
| Specialized admin portals (library, accounting, etc.) | ✅ Implemented | `app/(admin-portals)/` |
| Role-based authentication (NextAuth) | ✅ Implemented | `middleware.ts`, `app/api/auth/` |
| GrapesJS drag-and-drop page builder within CMS | ✅ Implemented | `app/(cms)/cms/page-builder-grapes/` |
| Drag-and-drop scheduling and results management | ✅ Implemented | `app/api/schedules/`, `app/api/results/` |
| Student applications (online enrollment) | ✅ Implemented | `app/(public)/apply/`, `app/api/applications/` |
| Complaints system | ✅ Implemented | `app/(public)/complaints/`, `app/api/complaints/` |
| Cloudinary image/media upload | ✅ Implemented | `app/api/upload-image/`, `app/api/upload-media/` |
| Bilingual content (Arabic / English) | ✅ Implemented | `nameAr`/`nameEn` fields, `i18n/locales/` |
| Dark / Light mode | ✅ Implemented | `next-themes`, `globals.css` |

---

## 3. Institute-Specific Domain Goals

The platform must digitize the following institutional workflows:

- **Academic departments**: 3 faculties → Administrative Sciences (Accounting, Marketing), Tourism & Hotels (3 tracks), Languages (English, French)
- **Exam + grade management**: per department, semester, academic year
- **Scheduling**: timetable upload (PDF/image) per department and year
- **Results publication**: student result sheets per department with visibility/download controls
- **Online admissions**: 3-step application form with document upload, status tracking
- **Finance/payroll**: tuition payment tracking, installments, payroll (partially implemented in institute admin)
- **Communications**: contact form, complaint ticketing, news ticker on homepage

---

## 4. Technical Goals

- Deploy on **Vercel** (serverless, Frankfurt region) with **Supabase PostgreSQL** as database
- Use **Prisma ORM** for all DB access with `pgbouncer` transaction pooling
- Use **Next.js App Router** with server components and dynamic API routes
- Use **Cloudinary** for all media uploads (images, PDFs)
- **No local file storage** in production — all media goes to Cloudinary
- Maintain **TypeScript strict typing** across the codebase
- Use **TanStack Query** for client-side data fetching
- Use **Zustand** for global state management
- Support **Framer Motion** animations site-wide

---

## 5. Branding Requirements

- Primary color: **Institute Blue** `#0B69D4`
- Secondary color: **Gold** `#FFC700`
- Arabic typeface: **Tajawal** (Google Fonts)
- Direction: **RTL** (Arabic primary)

> Source: `cursor_branding and clours.md` — colors were migrated from an earlier teal/cyan palette.
