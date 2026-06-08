# Current Architecture

**Source**: Direct code inspection — fully verified 2026-03-28  
**Trust level**: High on all items unless marked ⚠️ uncertain

---

## 1. System Topology

```
Internet
    │
    ├── test.sinaiinstitute.com (CNAME → Vercel DNS)
    ├── sinai-institute.vercel.app (Vercel auto-alias)
    └── sinaiinstitute.com (A2Hosting — separate server, NOT this project)

Vercel Edge Network (70+ PoPs)
    │   ├── middleware.ts (Edge runtime — guards /cms/* and /login only)
    │   ├── Static CDN: public/* + .next/static/*
    │   └── Serverless Functions (Node 24.x, 10s timeout, Hobby plan)
    │         └── app/api/*/route.ts — one function per route file
    │
Supabase PostgreSQL
    │   Project: eacpjbbpwonwmthutxow · Region: eu-west-1 (Frankfurt, AWS)
    │   Mode: SESSION/DIRECT — port 5432 (NOT pgbouncer port 6543)
    │   Connected via: lib/prisma.ts HARDCODED URL (bypasses env var)
    │
Cloudinary CDN
    │   Account: dyz4dc6n7 · Folder: sinai-institute/{type}/
    │   All runtime file uploads → Cloudinary (NOT local filesystem)
    │
localStorage (browser-local, per-device)
        Homepage slides, stats, news ticker, social links, specializations
        CMS session state (Zustand persist)
```

---

## 2. Render Strategy — Code-Verified

**Critical fact**: All page components are `'use client'` with `useEffect` data fetching. There is **no React Server Component data fetching** anywhere in the page layer.

| Route type | Rendering | Notes |
|-----------|-----------|-------|
| `app/(public)/page.tsx` | Client-only; reads `localStorage` | 723 lines, no server fetch |
| `app/(public)/[slug]/page.tsx` | CSR; fetches `/api/pages` in `useEffect` | 15+ debug `console.log` in production |
| `app/(public)/pages/[slug]/page.tsx` | CSR; API then localStorage fallback | Legacy path |
| `app/(cms)/*` | CSR + `force-dynamic` on list pages | Auth via middleware |
| `app/api/*` | Serverless function (Node) | Real DB access via Prisma |
| `middleware.ts` | Edge (not Node) | `authorized: () => true` — always passes; redirect logic is manual |

**SEO impact**: GrapesJS-rendered public pages are empty shells until client JS runs. Crawlers see no content.

---

## 3. App Router Structure

```
app/
├── (public)/           ← No auth — public pages
│   ├── page.tsx        ← Homepage: localStorage-only (no DB)
│   ├── apply/          ← 3-step enrollment → /api/applications
│   ├── complaints/     ← → /api/complaints
│   ├── schedules/      ← → /api/schedules
│   ├── [slug]/         ← GrapesJS page render → /api/pages
│   └── pages/[slug]/   ← Legacy GrapesJS render (both paths active)
│
├── (auth)/             ← /login — NextAuth credentials form
│
├── (cms)/              ← /cms/* — guarded by middleware.ts
│   ├── cms/dashboard/
│   ├── cms/departments/     ← → /api/departments
│   ├── cms/news/            ← → /api/news
│   ├── cms/applications/    ← → /api/applications
│   ├── cms/complaints/      ← → /api/complaints
│   ├── cms/results/         ← → /api/results  ⚠️ POST BROKEN
│   ├── cms/schedules/       ← → /api/upload (Cloudinary)
│   ├── cms/pages/           ← GrapesJS page list (force-dynamic)
│   ├── cms/pages-new/       ← Second page list UI — relationship to above: UNCLEAR
│   ├── cms/page-builder-grapes/[id]/  ← GrapesJS editor (current primary)
│   ├── cms/page-builder/[id]/         ← Legacy page builder (possibly replaced; relationship to above unclear)
│   ├── cms/homepage/        ← Saves to localStorage — NOT DB
│   ├── cms/migrate-pages/   ← One-time seed tool (still live, unprotected)
│   ├── cms/seed-pages/      ← Page seeder (still live)
│   └── cms/settings/        ← Setting model exists; UI depth uncertain
│
├── (institute)/        ← /institute/* — ~54 pages — ❌ NO AUTH — hardcoded data
├── (student)/          ← /student/* — ~14 pages — ❌ NO AUTH — hardcoded data
├── (faculty)/          ← /faculty/* — ~11 pages — ❌ NO AUTH — hardcoded data
├── (assistant)/        ← /assistant/* — ❌ NO AUTH — hardcoded data
├── (parent)/           ← /parent/* — ❌ NO AUTH — hardcoded data
├── (admin-portals)/    ← /library-admin/*, /accountant/*, etc. — ❌ NO AUTH
├── (lms)/              ← /lms/* — 9 empty scaffold files — NO AUTH — no DB
└── api/
    ├── auth/[...nextauth]/  ← NextAuth handler
    ├── departments/
    ├── news/                ← ⚠️ GET filter uses wrong field name (isPublished vs published)
    ├── applications/
    ├── complaints/
    ├── results/             ← ⚠️ POST broken (field mismatch) · GET broken (bad orderBy)
    ├── schedules/
    ├── upload/              ← ✅ Auth guarded → Cloudinary
    ├── upload-image/        ← ❌ NO AUTH → Cloudinary (open endpoint)
    ├── upload-media/        ← Auth status uncertain → Cloudinary
    ├── pages/               ← GET ✅ · POST/PATCH ❌ NO AUTH
    ├── pages/[id]/
    ├── pages/[id]/blocks/   ← Non-atomic: deleteMany then create (no transaction)
    ├── pages/migrate/       ← Seeding utility — auth status uncertain
    └── pages/seed/
```

---

## 4. State and Data Flow

| Data type | Where stored | Cross-device? | Server-rendered? |
|-----------|-------------|--------------|-----------------|
| Academic departments | Supabase → `Department` | ✅ Yes | No (client fetch) |
| News | Supabase → `News` | ✅ Yes | No (client fetch) |
| Results (when GET works) | Supabase → `Result` | ✅ Yes | No |
| Schedules | Supabase → `Schedule` | ✅ Yes | No |
| Applications | Supabase → `Application` | ✅ Yes | No |
| Complaints | Supabase → `Complaint` | ✅ Yes | No |
| CMS pages | Supabase → `Page` + `PageBlock` | ✅ Yes | No |
| Homepage slides config | `localStorage['homepage_slides']` | ❌ No | ❌ No |
| Homepage stats | `localStorage['homepage_stats']` | ❌ No | ❌ No |
| News ticker content | `localStorage['homepage_ticker_news']` | ❌ No | ❌ No |
| Social media links | `localStorage['social_links']` | ❌ No | ❌ No |
| Specialization cards | `localStorage['homepage_specializations']` | ❌ No | ❌ No |
| UI state (sidebar, lang) | `localStorage['edusaas-app-storage']` (Zustand) | ❌ No | ❌ No |
| Portal data (student, faculty) | **Hardcoded `const` arrays in component files** | ❌ N/A | ❌ No |
| Uploaded media | Cloudinary CDN | ✅ Yes | N/A |

---

## 5. Auth Architecture (Code-Verified)

```
/login
  → POST /api/auth/callback/credentials
  → lib/auth.ts: ONLY active path:
      if (email === 'admin@sainaiinstitute.com' && password === 'admin123') return session
      // DB bcrypt path is COMMENTED OUT (MySQL TODO reference)
  → NextAuth JWT cookie: next-auth.session-token
  → middleware.ts: authorized: () => true (always passes for /cms/*)
                   manual redirect: !token → redirect to /login

Result:
 - One hardcoded user, one hardcoded password
 - Changing User.password in DB has NO effect on login
 - Role in JWT is always hardcoded 'SUPER_ADMIN'
 - All portal routes outside /cms/* have ZERO auth
```

---

## 6. Prisma Client Initialization

```typescript
// lib/prisma.ts — production path
if (VERCEL_ENV === 'production' || NODE_ENV === 'production') {
  return 'postgresql://postgres.eacpjbbpwonwmthutxow:...@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
}
// dev path
return process.env.DATABASE_URL
```

- Production ignores `DATABASE_URL` env var entirely
- Uses port **5432** (session/direct mode, not pgbouncer)
- Global singleton only active in dev (`NODE_ENV !== 'production'`)
- Each cold start in production creates a new PrismaClient + new TCP connection
- No `prisma.$transaction()` used anywhere — all multi-step writes are non-atomic

---

## 7. Key Dependencies

| Package | Version | Status |
|---------|---------|--------|
| `next` | 16.1.5 | Active |
| `react` | 19 | Active |
| `prisma` | 5 | Active |
| `next-auth` | 4 | Active (partially broken) |
| `grapesjs` | 0.22 | Active |
| `@tiptap/react` | 3.17 | Active (usage scope uncertain) |
| `zustand` | 5 | Active |
| `framer-motion` | 12 | Active |
| `cloudinary` | — | Active |
| `@tanstack/react-query` | — | ⚠️ Installed, likely unused |
| `next-intl` | — | ⚠️ Installed, not wired (no language toggle UI) |
| `better-sqlite3` | — | ⚠️ DevDep — for `prisma/dev.db` only; not production |
| `@supabase/supabase-js` | — | ❌ NOT installed |
