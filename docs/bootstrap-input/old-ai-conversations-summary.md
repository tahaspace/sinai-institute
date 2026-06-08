# Old AI Conversations Summary

**Source files**: `docs/bootstrap-input/chats-raw/` (15 Cursor conversation exports, 2026-01-28 to 2026-03-28)

---

## Overview

All conversations took place in **Cursor IDE** (versions 2.6.21–2.6.22). The user communicates in **Arabic**; Cursor responds in Arabic with English technical output. Development was incremental — each session focused on a specific feature or bug. No CI/CD pipeline; deployments were triggered manually via `vercel --prod` or Vercel CLI.

---

## Session 1 — `cursor_edusaas.md` (largest file, ~247 KB)
**Topic**: Initial platform scaffold and portal setup

**What happened**:
- A full Next.js 14 project was scaffolded with ~106 pages, 110 components, 4 portals, Prisma schema (13 tables), and seed data.
- The user requested: student portal, doctor portal, teaching-assistant portal (معيد), and specialized admin portals (library, accounting, student affairs, admissions).
- AI confirmed 80% completion initially, then user requested "complete the remaining 20%".
- **The 20% completed**: NextAuth + login page + middleware, 8 API routes (departments, news, applications, complaints, results, schedules, upload, auth), 5 CMS pages (dashboard, departments, news, applications, complaints), file upload system, and seed data.
- Original deployment target mentioned as **A2 Hosting** with MySQL (this was later changed to Vercel + PostgreSQL).
- Local dev server ran on **port 3001** throughout early sessions.

**Key facts**:
- Original DB adapter: **MySQL** (later migrated to PostgreSQL/Neon, then Supabase)
- Original file at time: 312–324 TSX files, 253 npm packages
- Middleware protects only `/cms/*` and `/login` routes (confirmed in current `middleware.ts`)

---

## Session 2 — `cursor_.md` (About + Admission pages, GrapesJS builder)
**Topic**: Content for public pages, CMS GrapesJS page builder (Arabic), bug fixes

**What happened**:
- About page (`/about`) was built with institute founding info, 3 departments, specializations, features.
- Admission page (`/admission`) was built with full content: study system, job opportunities per specialization, facilities. A date was incorrectly set to 2021 then corrected to 2026.
- GrapesJS page builder was integrated and partially **Arabicized** (block labels, UI panels translated to Arabic). English plugin blocks were disabled.
- A Chrome extension error (`fldfpgipfncgndfolcbkdeeknbbbnhcc` — likely MetaMask/Crypto wallet) caused false runtime errors visible in browser console. AI correctly identified these as non-project errors.
- Local server repeatedly stopped and had to be manually restarted — **no process manager** was in use.

**Key facts**:
- GrapesJS builder URL: `/cms/page-builder-grapes/[id]` — confirmed in current file structure
- Issue: GrapesJS is a client-side library with dynamic import requirements; SSR complications expected in Next.js

---

## Session 3 — `cursor_vercel 01.md` (Vercel + database migration)
**Topic**: Migrating from Neon PostgreSQL to Supabase; fixing DATABASE_URL on Vercel

**What happened**:
1. **Neon PostgreSQL quota exceeded** — API returned `Can't reach database server at ep-shy-fire-ag4sxzsm.c-2.eu-central-1.aws.neon.tech`.
2. A Supabase project was created (`eacpjbbpwonwmthutxow`, region `eu-west-1`).
3. The correct Supabase host was `aws-1-eu-west-1` (not `aws-0`), which caused initial connection failures.
4. Data was migrated from `dev.db` (SQLite) to Supabase via a custom Node script: 1 user, 6 departments, 7 pages, 3 news, 2 applications, 3 complaints.
5. **Root cause bug**: `lib/prisma.ts` was using a hardcoded Neon connection string baked into the Prisma client at build time, overriding Vercel environment variables at runtime.
6. **Fix**: Hardcoded Supabase URL directly in `lib/prisma.ts` for production, conditioned on `NODE_ENV`. This is a known antipattern but was the only working solution found.
7. `.vercelignore` was updated to prevent local `.env` files from being deployed (then partially reverted).
8. Three manual deployments with cache busting were required before the Supabase connection worked.

**Key facts (high confidence)**:
- Production DB: **Supabase PostgreSQL** (`eacpjbbpwonwmthutxow`, `aws-1-eu-west-1`, port 6543, pgbouncer transaction mode)
- Production URL at time: `https://test.sinaiinstitute.com`
- Vercel project: `sinai-institute` under org `tahaspace`
- A hardcoded connection string likely still exists somewhere in `lib/prisma.ts` — needs verification
- Neon credentials appear in `vercel.json` (the old value) — this file should be audited

---

## Session 4 — `cursor_ 02.md` (Schedule upload feature)
**Topic**: Schedule PDF/image upload in CMS, display to students

**What happened**:
- CMS at `/cms/schedules` was extended with file upload (PDF or image) per department+year.
- Student page at `/schedules` updated to filter by department → year → display/download.
- Bug found: `department.name` vs `department.nameAr` mismatch in TypeScript interface.
- `public/uploads/schedules/` directory was created for local file storage.

**Key caveat**: This implemented local file uploads. If Cloudinary is used in production (as seen in `.env.production`), local uploads won't persist on Vercel (ephemeral filesystem). **This is a known gap.**

---

## Session 5 — `cursor_ 03.md` and `cursor_ 04.md`
**Topic**: Additional page/feature work (exact content not fully read but referenced in file list)

---

## Session 6 — `cursor_branding and clours.md`
**Topic**: Color theme restoration

**What happened**:
- User complained that colors were changed from the expected **blue (#0B69D4) + gold (#FFC700)** to teal/cyan.
- A Python script was run to batch-replace color classes across 54–58 TSX files.
- 495 color references updated, 0 linting errors.
- Tailwind config and `globals.css` were updated with `institute-blue` and `institute-gold` custom tokens.
- Arabic font **Tajawal** was confirmed preserved.

---

## Session 7 — `cursor_hero_slider.md`
**Topic**: Hero Slider image upload button, layout sizing

**What happened**:
- Hero Slider edit form lacked an image upload button (only text URL field existed).
- Upload button was added using the existing `/api/upload-image` endpoint.
- Image preview with 5 MB / JPG,PNG,WebP,GIF validation was added.
- Images stored in `/public/images/news/` — **same caveat as schedules**: not Cloudinary.
- User requested the hero image not be full-screen-width. Layout was changed to `max-w-6xl`, `rounded-3xl`, `shadow-2xl` → "Contained Background" design.

---

## Session 8 — `cursor_cms_social_media_links_managemen.md`
**Topic**: Social media link management in CMS → Footer

**What happened**:
- A "Social Media" tab was added to `/cms/homepage`.
- Supported platforms: Facebook, Twitter, Instagram, LinkedIn, YouTube.
- **Storage: `localStorage`** — not database. This is intentional for speed but means data is browser-local and not shared across devices.
- Footer component `public-footer.tsx` updated to read from localStorage.

---

## Session 9 — `cursor_homepage_specialization_section.md`
**Topic**: Specialization section control in homepage CMS

**What happened**:
- Homepage had hardcoded specialization cards. A CMS management tab was added.
- `HomepageSpecialization` model was added to Prisma schema (uncertain if migrated to production DB).
- **Storage also uses localStorage** — same as social media links (not database).
- User renamed "إدارة متفرقات" → "إدارة الصفحة الرئيسية" in sidebar and page title.

---

## Session 10 — `cursor_news bar 2.md` (GrapesJS page builder, CMS Pages rebuild)
**Topic**: Full CMS pages system rebuild with GrapesJS

**What happened**:
- User requested a full Elementor-like page builder. A custom block-based builder attempt was made (~40% complete). User then selected GrapesJS.
- GrapesJS fully integrated: `/cms/pages` now routes to GrapesJS-backed page management.
- Prisma schema extended with `Page`, `PageBlock`, `PageVersion`, `WidgetTemplate` models.
- Dynamic public page route: `/pages/[slug]` reads from database.
- Header (`public-header.tsx`) updated to show CMS pages dynamically.
- A migration UI at `/cms/migrate-pages` was created to seed existing pages into the DB.
- 8 core pages seeded: home, about, admission, departments, results, schedules, apply, contact.
- `key` prop bug on Dialog component fixed in separate commit.
- `force dynamic` rendering added to CMS pages to prevent stale cache on edit dialog.

---

## Session 11 — `cursor_project_logo_update.md` and others
**Topic**: Logo update, news bar, other minor features (details not fully extracted but referenced)

---

## Patterns and Risk Signals Observed Across Sessions

| Pattern | Risk |
|---------|------|
| Several features store data in `localStorage` (social media, specializations) | Data not shared across users/devices; wiped on clear |
| Hardcoded DB connection string in `lib/prisma.ts` | Security + maintainability risk |
| No process manager for local dev server (manually restarted repeatedly) | Development friction |
| Vercel ephemeral filesystem used for some uploads | Files lost on redeploy |
| TypeScript and ESLint errors suppressed in `next.config.ts` (`ignoreBuildErrors: true`) | Hidden type/lint bugs |
| Multiple old `.env.*` files present in repo | Credential exposure risk |
| `vercel.json` contains plaintext DB credentials | **Critical: credential in VCS** |
| Neon credentials still referenced in `vercel.json` | Stale/potentially active credential |
