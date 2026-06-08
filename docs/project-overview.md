# Project Overview — Sinai Higher Institute Platform

**Last updated**: 2026-03-28 (code-verified + Vercel API confirmed)  
**Confidence**: High on all items below unless marked ⚠️

---

## What This Is

A **multi-portal education management platform** for **Sinai Higher Institute for Specific Studies** (معهد سيناء العالي للدراسات النوعية). Two physical campuses: Ismailia and Arish. Egyptian Ministry of Higher Education — Ministerial Decree 1313, 25/5/2005.

> **Not a SaaS platform.** Despite generic SaaS scaffolding in `types/index.ts`, this is a single-tenant, single-institute deployment. Multi-tenancy does not exist.

---

## User Personas and Portal Reality

| Portal | Route | Auth | Data state |
|--------|-------|------|-----------|
| Public website | `/` | None | Mix: DB (departments, news via API) + `localStorage` (slides, stats, social links) |
| CMS | `/cms/*` | ✅ NextAuth (1 hardcoded user) | DB via Prisma |
| Institute admin | `/institute/*` | ❌ None | **Hardcoded static arrays** — no DB |
| Student | `/student/*` | ❌ None | **Hardcoded static arrays** — no DB |
| Faculty | `/faculty/*` | ❌ None | **Hardcoded static arrays** — no DB |
| Teaching assistant | `/assistant/*` | ❌ None | **Hardcoded static arrays** — no DB |
| Parent | `/parent/*` | ❌ None | **Hardcoded static arrays** — no DB |
| Specialized admin | `/library-admin/*`, `/accountant/*`, etc. | ❌ None | **Hardcoded static arrays** — no DB |
| LMS | `/lms/*` | ❌ None | Scaffold only — empty pages |

**Only `/cms/*` is protected.** All portal pages outside CMS are publicly accessible and show fake data.

---

## Academic Structure (DB-verified from seed)

| Department | Code |
|-----------|------|
| Hospitality Management (إدارة الضيافة) | 1 |
| Tourism Guidance (الإرشاد السياحي) | 2 |
| Tourism Studies (الدراسات السياحية) | 3 |
| English Language (اللغة الإنجليزية) | 4 |
| French Language (اللغة الفرنسية) | 5 |
| Business Administration (العلوم الإدارية) | 6 |

3 departments have Specializations downstream. Results and Schedules cascade off Departments.

---

## Tech Stack (Confirmed from Code)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.1.5, App Router | All pages are `'use client'` — no RSC data fetching |
| Language | TypeScript (strict but suppressed in build) | `ignoreBuildErrors: true` |
| Styling | Tailwind CSS 3.4 + custom tokens (`institute-blue`, `institute-gold`) | RTL, Arabic primary |
| Fonts | Tajawal (via `next/font`) | Arabic Google Font |
| UI components | shadcn/ui (Radix primitives), Lucide React, Framer Motion 12 | |
| CMS editor | GrapesJS 0.22 | Static import inside `'use client'` — SSR-safe |
| Rich text | Tiptap 3.17 | In `package.json` |
| State | Zustand 5 (with localStorage persistence) | |
| ORM | Prisma 5 → Supabase PostgreSQL | Direct mode, port 5432, no pgbouncer |
| Auth | NextAuth v4, Credentials provider | Hardcoded bypass — DB auth is stub |
| Media | Cloudinary (`dyz4dc6n7`) | All uploads go here |
| Hosting | Vercel, Hobby plan | Frankfurt build; Node 24.x |
| DB host | Supabase PostgreSQL, eu-west-1 | Project `eacpjbbpwonwmthutxow` |

**Installed but not confirmed in use**: `@tanstack/react-query`, `next-intl`, `better-sqlite3`  
**Not installed despite dashboard env vars**: `@supabase/supabase-js` — Supabase used as PostgreSQL host only

---

## Repository State

```
GitHub:   github.com/tahaspace/sinai-institute (private)
Branch:   main (4 commits — entire project history in 1 init commit + 3 fixes)
Local:    speckit-bootstrap (local work branch — docs/ not committed)
Vercel:   No git integration — CLI deploy only
Last deploy: ~2026-01-30 (57 days stale)
```

---

## Branding

- Primary: **Institute Blue** `#0B69D4`  
- Secondary: **Gold** `#FFC700`  
- Typeface: **Tajawal** (Arabic, RTL-primary)  
- Dark mode: `next-themes` (partial — toggle UI unconfirmed in portals)

---

## Key Risks (Summary)

| Risk | Severity |
|------|----------|
| DB password in `lib/prisma.ts` source code | 🔴 Critical |
| `NEXTAUTH_SECRET` weak and in git | 🔴 Critical |
| Unauthenticated write endpoints (`/api/upload-image`, `/api/pages` POST) | 🔴 Critical |
| Auth is a hardcoded string — DB auth does nothing | 🔴 Critical |
| `/api/results` POST + GET both broken (field mismatches) | 🟠 High |
| All portals show fake data — production-unrealistic | 🟠 High |
| No dev/prod DB isolation | 🟠 High |

→ Full list: [`docs/known-issues.md`](./known-issues.md) · [`docs/production-risk-register.md`](./production-risk-register.md)
