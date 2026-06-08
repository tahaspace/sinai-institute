# Codebase Research

**Method**: Code-first inspection — `app/`, `components/`, `lib/`, `prisma/`, `middleware.ts`, `public/`, `next.config.ts`  
**Last updated**: 2026-03-28  
**Confidence key**: 🟢 Directly observed · 🟡 Strongly inferred · 🔴 Uncertain

---

## 1. System Purpose (Inferred from Code)

A **single-tenant, multi-portal education platform** for one physical institution: Sinai Higher Institute for Specific Studies (معهد سيناء العالي للدراسات النوعية).

Evidence:
- `app/layout.tsx` `metadata.title = 'معهد سيناء العالي'` — one institution name hardcoded 🟢
- `prisma/seed.ts` creates exactly 6 departments (Tourism, Hospitality, English, French, Business Admin, Tourism Guidance) — fixed academic structure 🟢
- `public/logo.png`, `components/layouts/public-header.tsx` hardcodes phone `+201220822224` and email `info@sainaiinstitute.com` 🟢
- `lib/auth.ts` returns hardcoded `id: 'dev-admin-001'` — single admin, no multi-tenancy 🟢

**The project is NOT a multi-tenant SaaS** despite the generic SaaS-style type definitions in `types/index.ts` (vestiges of a code scaffold).

---

## 2. Major Architectural Patterns

### 2.1 Next.js App Router with Route Groups

Eight route groups, each with its own `layout.tsx`:

```
app/
├── (public)/     ← public website + public API consumers
├── (auth)/       ← /login only
├── (cms)/        ← CMS admin panel; protected by middleware
├── (institute)/  ← admin portal — 54 pages, no auth
├── (student)/    ← student portal — 14 pages, no auth
├── (faculty)/    ← faculty portal — 11 pages, no auth
├── (assistant)/  ← teaching assistant — 1 page, no auth
├── (parent)/     ← parent portal — 5 pages, no auth
└── (lms)/        ← LMS scaffold — 8 pages, no auth
```

Additionally: `app/[slug]/page.tsx` at the root level (outside any route group) — purpose unclear; likely a redirect/not-found catch-all.

### 2.2 Client-First Rendering (Not RSC)

**All portal and public page components use `'use client'` at the top.** None of the page components use React Server Components for data fetching. Data is fetched in `useEffect` via `fetch()`. This means:
- Server returns an empty HTML shell
- Hydration triggers client-side data load
- All "loading" states are visible to users

Observed files with `'use client'`: 28 page/layout files (counted) 🟢  
Observed use of RSC data fetching patterns (`async function Page()`): 0 in page layer 🟢

**Exception**: `app/(public)/layout.tsx` has no `'use client'` (pure server layout), but its children do.

### 2.3 API Layer Pattern

All DB operations are in `app/api/*/route.ts` files (serverless functions on Vercel). Pattern:

```typescript
// Consistent across all API routes:
const session = await getServerSession(authOptions);
if (!session) return 401;
// ... prisma call
```

But two routes lack the guard entirely:
- `POST /api/upload-image` — no session check 🟢
- `POST /api/pages`, `PATCH /api/pages` — no session check 🟢

### 2.4 Key Third-Party Integrations

| Integration | How it's wired | File |
|-------------|---------------|------|
| Cloudinary | `lib/cloudinary.ts` wraps `cloudinary.v2`, env-configured | All upload routes |
| Prisma | `lib/prisma.ts` — singleton with prod URL hardcoded | All API routes |
| NextAuth | `lib/auth.ts` — credentials provider, JWT strategy | `middleware.ts`, sessions |
| GrapesJS | Static import inside `'use client'` component | `components/page-builder/grapes-builder.tsx` |
| TanStack Query | `QueryClientProvider` in `components/providers/index.tsx` | Wrapper only; no `useQuery` found in page code 🟡 |
| Zustand | `store/use-app-store.ts` — UI/sidebar/language state | Persisted to `localStorage` as `edusaas-app-storage` |
| framer-motion | Layout files for portal sidebars (`AnimatePresence`) | All portal `layout.tsx` files |
| next-themes | `ThemeProvider` in providers | not wired to any toggle UI 🟡 |

---

## 3. Framework/Runtime Shape

| Dimension | Observed value | Source |
|-----------|---------------|--------|
| Framework | Next.js 16.1.5, App Router | `package.json` |
| React | 19.2.3 | `package.json` |
| TypeScript | Present; **entirely suppressed** in build | `next.config.ts` |
| Styling | Tailwind CSS + shadcn/ui (Radix UI under) | `package.json`, `components/ui/` |
| Font | Tajawal (Google Fonts, loaded via `next/font`) | `app/layout.tsx` |
| HTML dir | `lang="ar" dir="rtl"` — hardcoded | `app/layout.tsx` |
| Build | `prisma generate && next build` | `package.json` scripts |
| Dev server | `next dev` → default port 3000 | `package.json` |
| Node | 20.x (Vercel config) | `vercel.json` |
| Runtime | Vercel serverless (Hobby plan) | `vercel.json` |
| DB connection | Supabase PostgreSQL via Prisma 5 | `lib/prisma.ts` |
| Auth | NextAuth 4, JWT strategy | `lib/auth.ts` |
| Font Awesome | CDN link in `<head>` | `app/layout.tsx` |
| PWA | Manifest linked, `lib/pwa/register-sw.ts` exists, `sw.js` missing from public/ | Various |

---

## 4. Cross-Cutting Concerns

### 4.1 Authentication

**Middleware** (`middleware.ts`):
- Protects: `/cms/:path*`, `/login`
- `callbacks.authorized` always returns `true` — meaning the middleware calls the auth check, but then `middleware()` function itself decides redirect logic
- All other routes (portals, LMS, etc.): **completely unprotected**

**Auth check pattern** (in `lib/auth.ts`):
```typescript
if (email === 'admin@sainaiinstitute.com' && password === 'admin123') {
  return { id: 'dev-admin-001', role: 'SUPER_ADMIN' };
}
throw new Error('...');
// DB auth block: 100% commented out
```
`PrismaAdapter` is imported but non-functional — NextAuth is in JWT mode, adapter is irrelevant for session storage. The adapter was likely left from a different auth strategy attempt.

### 4.2 Error Handling

- `console.error()` on every catch block (good for logs, not suppressed)
- `console.log()` debug statements left in production code: 15+ verbose logs in `app/(public)/[slug]/page.tsx` alone 🟢
- `lib/cloudinary.ts` logs cloud name prefix to stdout on every module load — runs on server and visible in Vercel function logs

### 4.3 Internationalization

- `next-intl` package installed, locale JSON files at `i18n/locales/ar.json` and `en.json`
- **Zero wiring**: no `NextIntlClientProvider` in layout, no middleware locale routing
- `useAppStore` has `language` and `direction` state but the store persists to localStorage and has no effect on actual rendering
- Runtime language: Arabic RTL only (hardcoded in `app/layout.tsx`)

### 4.4 State Storage Summary

| Data | Where stored | Shared across devices? |
|------|-------------|----------------------|
| CMS sidebar / language pref | Zustand → `localStorage` | ❌ Browser-local |
| Homepage slides config | `localStorage['homepage_slides']` | ❌ Browser-local |
| Homepage general news | `localStorage['homepage_general_news']` | ❌ Browser-local |
| Homepage institute news | `localStorage['homepage_institute_news']` | ❌ Browser-local |
| Homepage stats | `localStorage['homepage_stats']` | ❌ Browser-local |
| Homepage specializations | `localStorage['homepage_specializations']` | ❌ Browser-local |
| Social media links | `localStorage['homepage_social_media']` | ❌ Browser-local |
| Nav pages (fallback) | `localStorage['cms_pages']` | ❌ Browser-local |
| Applications, complaints, news, results, schedules | Supabase PostgreSQL via Prisma | ✅ |
| CMS pages (GrapesJS) | Supabase `Page`, `PageBlock`, `PageVersion` tables | ✅ |

### 4.5 XSS Surfaces

Three locations render untrusted HTML directly:
1. `app/(public)/[slug]/page.tsx` — renders `page.contentAr` and `block.content` via `dangerouslySetInnerHTML`
2. `app/(public)/pages/[slug]/page.tsx` — same pattern
3. `app/(cms)/cms/page-builder/[id]/page.tsx` — renders `customCSS` via `<style dangerouslySetInnerHTML>`

The `Page` model stores `customJS` — if any page has JS injected via the CMS (which requires no auth on POST), it would be served to all public visitors of that page.

---

## 5. Risky Areas

### R-01 — Auth stub is in production (Critical)
`lib/auth.ts` has the DB auth block fully commented out. The comment says `TODO: Enable when MySQL is configured`. Currently MySQL→PostgreSQL migration happened but auth was never re-enabled. **Any change to `User.password` in the DB has no effect on login.**

### R-02 — Production DB password in source code (Critical)
`lib/prisma.ts:7`: literal `SinaiInstitute2026!` in URL. `vercel.json`: contains old `NEXTAUTH_SECRET`. `.env`: contains all live credentials. All are in git history.

### R-03 — `/api/upload-image` and `/api/pages` write ops are open (Critical)
No `getServerSession()` check. Verified by code read. Anyone can upload images to the institute's Cloudinary account or inject JS/CSS into served pages.

### R-04 — `/api/results` POST has wrong field names (High)
POST creates with `published`, `title`, `publishedAt`. `Result` model has `isVisible`, no `title`, `publishDate`. Will throw Prisma `Unknown field` at runtime. Results cannot be created via CMS.

### R-05 — Supabase on session mode under serverless (High)
`lib/prisma.ts` uses port 5432 (session/direct mode). Vercel functions are stateless — each invocation creates a new connection. Supabase free tier has ~60 simultaneous connection limit. Under real student traffic this will exhaust connections.

### R-06 — Homepage content is device-local (High)
All homepage section configs are in `localStorage`. Admin updates on one machine are invisible on all other machines and to public visitors.

### R-07 — `prisma/seed.ts` wipes production data (High)
`deleteMany()` on `Department` and `News` before seeding. The local `.env` `DATABASE_URL` points to production Supabase. Running `npm run prisma:seed` locally destroys production content instantly.

### R-08 — 5 named public routes are empty directories (Medium)
`/about`, `/admission`, `/results`, `/contact`, `/departments` exist as directories in `app/(public)/` but contain **no `page.tsx` file**. These routes 404. The `[slug]` dynamic catch-all handles anything with that slug in the DB, but the routes are not populated with page files.

### R-09 — `app/(institute)/institute/payroll/{dashboard}/` is a literal `{` dir (Medium)
A directory named `{dashboard}` (with literal curly braces) exists alongside `dashboard/`. This is a filesystem artifact — not a valid Next.js route. Likely a scaffolding error.

### R-10 — Root-level `app/[slug]/page.tsx` conflicts with route groups (Low–Medium)
There is a `[slug]` catch-all both inside `(public)` and at `app/[slug]/page.tsx` (root level). Next.js will prefer the root-level one for all paths that don't match a named route group. This may shadow or intercept routes unexpectedly.

---

## 6. Confidence Notes

| Area | Confidence | Rationale |
|------|-----------|-----------|
| Auth is a hardcoded stub | 🟢 High | `lib/auth.ts` read in full |
| Port 5432 in production | 🟢 High | `lib/prisma.ts:7` literal string read |
| All uploads go to Cloudinary | 🟢 High | All 3 route handlers read; none use `fs` write |
| Portal pages use hardcoded data | 🟢 High | `student/grades/page.tsx` confirmed static array |
| localStorage keys | 🟢 High | `grep` enumerated 15 distinct keys |
| TanStack Query usage in pages | 🟡 Medium | `QueryClientProvider` confirmed; no `useQuery` in any read page — may exist in unread pages |
| `next-intl` not wired | 🟢 High | No `NextIntlClientProvider` in layout confirmed |
| Named public routes 404 | 🟢 High | `ls` confirmed empty directories |
| `sw.js` missing | 🟡 Medium | Not seen in `public/` listing, `register-sw.ts` tries to register `/sw.js` |
| Zustand stores disconnect from NextAuth | 🟢 High | `useAuthStore` in `store/use-app-store.ts` is entirely separate from `useSession` |
