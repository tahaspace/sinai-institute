# CLAUDE.md — Sinai Higher Institute Platform

> **Read this before touching any code.** All facts are code-verified + live-runtime confirmed.  
> Last updated: 2026-03-28. Audit sources: `docs/` directory (see reading order below).

---

## Project Identity

| Field | Value |
|-------|-------|
| **What** | Single-tenant education platform — Sinai Higher Institute (معهد سيناء العالي للدراسات النوعية) |
| **Stack** | Next.js 16.1.5 · React 19 · TypeScript · Tailwind CSS · Prisma 5 · Supabase PG · NextAuth 4 · Cloudinary |
| **Repo** | `github.com/tahaspace/sinai-institute` (private) — `main` — 4 commits total |
| **Production** | `https://test.sinaiinstitute.com` + `sinai-institute.vercel.app` |
| **Node (production)** | **24.x** (Vercel API confirmed — codebase targets 20.x, unvalidated) |
| **Last deployed** | ~2026-01-30 (57 days stale — 2 bug-fix commits not yet live) |
| **Git integration** | ❌ None — Vercel CLI manual deploys only |

---

## Commands

```bash
npm run dev                  # Next.js dev server (usually :3001 per .env NEXTAUTH_URL)
                             # ⚠️ Targets PRODUCTION Supabase DB — no dev/prod isolation

npm run build                # prisma generate && next build
                             # ⚠️ NODE_ENV=production → lib/prisma.ts uses HARDCODED Supabase string
                             # ⚠️ TypeScript + ESLint errors suppressed — build always passes

npm run prisma:generate      # safe — regenerates Prisma client
npm run prisma:push          # ⚠️ DESTRUCTIVE — schema pushed to production DB, no rollback
npm run prisma:seed          # ☠️ WIPES production departments + news via deleteMany()
npm run prisma:studio        # GUI at :5555
npm run lint                 # ESLint (bypassed during build — run manually)
npx tsc --noEmit             # TypeScript check (bypassed during build — run manually)
```

**No test runner. Zero test files in repo.**

---

## Critical Code Realities — Read All 15

Code wins over all docs and chats when they conflict.

| # | Fact | File |
|---|------|------|
| 1 | **Auth is a hardcoded string comparison** — DB auth path is commented out with MySQL TODO | `lib/auth.ts:30–38` |
| 2 | **DATABASE_URL uses port 6543 (pgbouncer)** — read from env, no hardcode | Vercel Env |
| 3 | **All uploads use Cloudinary** — `/api/upload`, `/api/upload-image`, `/api/upload-media` | API route files |
| 4 | **`/api/results` POST is broken** — sends `published`, `title`, `publishedAt` which don't exist in `Result` model | `app/api/results/route.ts` |
| 5 | **`/api/results` GET is also broken** — `orderBy: { publishedAt: 'desc' }` references non-existent field | `app/api/results/route.ts:20` |
| 6 | **4 write endpoints require CMS session** — POST/PATCH /api/pages, POST /api/upload-image/media | API route files |
| 7 | **All secrets in Vercel dashboard only** — no credentials in any committed file | Dashboard / `vercel.json` |
| 8 | **All portals show hardcoded data** — no DB connection in any portal page | `app/(student)/student/grades/page.tsx` confirmed |
| 9 | **Homepage reads only localStorage** — not DB; different browsers see different content | `app/(public)/page.tsx` |
| 10 | **`HomepageSpecialization` does not exist in schema** — chat claimed it was added; it wasn't | `prisma/schema.prisma` (all 14 models enumerated) |
| 11 | **vercel.json env block removed** — dashboard vars are respected | `vercel.json` |
| 12 | **All portal routes return 404** — `/about`, `/admission`, `/contact`, `/departments`, `/results` dirs have no `page.tsx` | `ls app/(public)/` |
| 13 | **Production deployment 57 days stale** — commits `a045e58` + `ff29e76` on `main`, not live | Vercel API |
| 14 | **Supabase SDK not installed** — `@supabase/supabase-js` not in `package.json`; only Prisma connects to DB | `package.json` |
| 15 | **`check-localstorage.html` is live** at `https://test.sinaiinstitute.com/check-localstorage.html` | `public/` listing |

---

## Architecture Guardrails

- **No new `localStorage` stores** for content shared across users — use the `Setting` table
- **No raw SQL** — all DB access through Prisma client in `app/api/*/route.ts`
- **No imports of Prisma in page components** — only API routes access DB
- **No writing to `public/`** at runtime — Vercel filesystem is ephemeral and read-only
- **Middleware covers `/cms/*` and `/login` only** — all other routes (`/student/*`, `/faculty/*`, etc.) are public
- **Do not run `prisma:seed`** without overriding `DATABASE_URL` — it runs `deleteMany()` on production data
- **Do not run `npm run build` locally** without knowing it connects to production Supabase

---

## Prisma Safety Rules

1. **No migration files** — `prisma db push` only — schema mistakes cannot be rolled back
2. **Always backup Supabase before schema changes**: Supabase dashboard → Backups
3. **Never run `prisma migrate reset`** — drops all tables
4. **Run `prisma generate` after every schema change**
5. **`prisma/dev.db`** (SQLite, 299KB) is in git — may contain PII — do not add real data
6. **Before `db push`**: Use session mode (port 5432 — already the case) for schema operations

→ Full audit: [`docs/database-and-prisma-audit.md`](./docs/database-and-prisma-audit.md)

---

## Environment & Secrets

- **`lib/prisma.ts`** reads `DATABASE_URL` from the active environment without hardcoding.
- **No `vercel.json` `env` block** exists. It must stay this way to respect dashboard vars.
- **Never add new hardcoded secrets** to any file.
- **All secrets go in Vercel dashboard** → Project Settings → Environment Variables.
- **`NEXTAUTH_URL`** must be set correctly in dashboard.
- **`NEXTAUTH_SECRET`** must be a strong secret set in the dashboard only.

---

## Deployment

```bash
vercel --prod          # deploys current branch to production — 10s function timeout on Hobby plan
vercel rollback        # reverts to last known-good deployment (does NOT revert schema changes)
```

- **No CI/CD** — every deploy is manual
- **No staging environment** — local dev and production share the same Supabase DB
- **No git integration** — pushing to `main` does NOT trigger a deploy
- **Pending deploy**: run `vercel --prod` to push the 2 stale bug-fix commits
- **Before schema-changing deploy**: `prisma db pull` to check current production schema

→ Full runbook: [`docs/deployment-vercel.md`](./docs/deployment-vercel.md)

---

## Documentation Update Rules

| What changed | Update |
|-------------|--------|
| New route or portal | `docs/current-architecture.md`, `docs/route-inventory.md` |
| New Prisma model or field | `docs/domain-model.md`, `docs/database-and-prisma-audit.md` |
| New API endpoint | `docs/feature-inventory.md` (API table) |
| Bug fixed | `docs/known-issues.md` — mark resolved |
| Architecture decision | `docs/adrs/adr-00N-*.md` |
| Contradiction resolved | `docs/contradictions-and-gaps.md` |
| Open question answered | `docs/open-questions.md` — mark resolved |
| Deployment changed | `docs/deployment-vercel.md` |
| Production risk changed | `docs/production-risk-register.md` |

---

## Pre-Modification Checklist

- [ ] Read the relevant `docs/` file for the area being touched
- [ ] I know whether state goes to DB, `localStorage`, or Cloudinary — maintaining existing pattern
- [ ] I am NOT hardcoding any secret, credential, or connection string
- [ ] If changing Prisma schema: backup Supabase → `prisma db push` → `vercel --prod`
- [ ] If touching `/api/results`: fix field name mismatch FIRST (`published`→`isVisible`, `publishedAt`→`publishDate`)
- [ ] After my change: update the appropriate `docs/` file
- [ ] I will not create net-new `localStorage` stores for any DB-backed data

---

## Recommended Reading Order (New AI Sessions)

1. `CLAUDE.md` ← this file
2. `docs/known-issues.md` — confirmed bugs and security risks
3. `docs/current-architecture.md` — how it's actually built
4. `docs/domain-model.md` — schema source of truth
5. `docs/feature-inventory.md` — what exists and its real status
6. `docs/contradictions-and-gaps.md` — where docs lie vs code
7. `docs/open-questions.md` — pending decisions
8. `docs/deployment-vercel.md` — deploy runbook
9. `docs/bootstrap-next-steps.md` — prioritized action list
