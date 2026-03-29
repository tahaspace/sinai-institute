# Research: CMS Pages Regression Stabilization

**Date**: 2026-03-29  
**Branch**: `002-cms-pages-fix`

## Root Cause — Confirmed

| Claim | Evidence | Confidence |
|-------|----------|-----------|
| `GET /api/pages` returns HTTP 500 locally | `curl` test — status 500, `{"error":"فشل في جلب الصفحات","details":"...FATAL: Tenant or user not found"}` | 100% |
| Failure is DB auth rejection, not code bug | Prisma error message: `FATAL: Tenant or user not found` — this is PostgreSQL rejecting credentials before any query runs | 100% |
| `.env` uses port 5432, host `aws-1-eu-west-1.pooler.supabase.com` | `grep DATABASE_URL .env` | 100% |
| Password in `.env` does not match Supabase's current active credentials | Error semantics — `Tenant or user not found` = auth failure | 100% |
| `GET /api/pages` handler has no auth guard (intentionally public read) | `app/api/pages/route.ts` line 7: no `getServerSession` in GET | 100% |
| CMS component `pages/page.tsx` renders "no pages" empty state when catch fires | Line 409–416: `else if pages.length === 0` renders "لا توجد صفحات" regardless of whether it was an error or genuinely empty | 100% |
| `public-header.tsx` tries API then falls back to `localStorage['cms_pages']` | Lines 38–60 of `components/layouts/public-header.tsx` | 100% |
| `localStorage['cms_pages']` not inspected — may be empty, may have stale data | Q2 answer: unverified | Unverified — pre-implementation devtools check required |
| Page Builder route exists and is correctly wired | `app/(cms)/cms/page-builder-grapes/[id]/page.tsx` with `dynamic(..., { ssr: false })` | 100% |
| Page Builder is inaccessible only because page cards don't render | No cards = no "Page Builder" button = cascading failure from p list | 100% |
| T008 (password rotation) completion status | Unknown — Supabase dashboard verification required | 0% |

## Decisions

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| Fix via `.env` credential update (operator action), not code | Code path is correct; wrong credential is the bug | Hardcode new password in code — violates constitution Principle II |
| Port 5432 for local `.env` | Enables `prisma studio`, `db pull`, DDL operations required for dev | Port 6543+pgbouncer locally — pgbouncer disables prepared statements and DDL needed for schema tools |
| Add `isError` UI state to `cms/pages/page.tsx` | FR-002: distinct error vs. empty state; prevents future debugging confusion | Keep toast-only error — still shows "no pages" which confuses cause |
| Scope to `cms/pages/page.tsx` only — not `pages-new/` | Q4 clarification: `pages-new` is a duplicate out of scope | Fix both — unnecessary; pages-new is not the canonical route |
| No changes to `app/api/pages/route.ts` | GET handler is correct, public read is intentional | Add auth to GET — would break public homepage header which is an unauthenticated client component |

## Historical Pattern

From `docs/bootstrap-input/chats-raw/cursor_vercel 01.md`: the production app went through a Neon → Supabase database migration and had repeated `DATABASE_URL` credential issues during the transition. The pattern of credentials becoming stale (either `.env` not updated after Supabase password change, or old Neon URL persisting) is the same class of issue as this regression.

This is **not** a new technical bug introduced by the phase-0 security triage. The triage removed hardcoded credentials from `lib/prisma.ts` and `vercel.json` *correctly* — but the local `.env` was never updated to reflect whichever credential is currently active in Supabase.

## What Must Be Verified Without Code Changes (Pre-Implementation)

1. **Supabase dashboard check**: Settings → Database → Connection string → does the password match what's in `.env`?
2. **Browser devtools check**: `localStorage.getItem('cms_pages')` — is this key present and non-empty? (determines whether header fallback might show something)
3. **API connectivity after `.env` update**: `curl http://localhost:3001/api/pages` must return HTTP 200 with `{"pages":[...]}` — only after this passes is Step 1 code work unlocked
