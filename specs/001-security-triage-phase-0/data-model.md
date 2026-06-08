# Data Model: Security Triage Phase 0

**Branch**: `001-security-triage-phase-0`
**Date**: 2026-03-29

---

## Schema Change Assessment

**Result: ZERO schema changes required in this phase.**

All changes in this phase are:
1. Configuration file edits (`vercel.json`)
2. Source code logic additions (session checks in 4 route files)
3. Source code refactor of one initialization utility (`lib/prisma.ts`)
4. Source code guard addition (`prisma/seed.ts`)
5. Git index operation (`git rm --cached` for `prisma/dev.db`)
6. File deletion (`public/check-localstorage.html`)
7. Out-of-band dashboard operations (credential rotation, env var updates)

No `prisma db push`, no `prisma migrate`, no new models, no new fields.

---

## Entities Affected (Indirectly — Auth State Change)

### `Page` (existing — `prisma/schema.prisma`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Primary key |
| `titleAr` | String | Required |
| `titleEn` | String | Required |
| `slug` | String | Unique |
| `customJS` | String? | ⚠️ Currently writable without auth — **blocked by this phase** |
| `isPublished` | Boolean | Controls public visibility |
| other fields | ... | Unchanged |

**Before this phase**: Any internet user can set `customJS` to arbitrary JavaScript
via `POST /api/pages`. This JavaScript executes in every visitor's browser.

**After this phase**: `POST /api/pages` and `PATCH /api/pages` require a valid
CMS admin session. The `customJS` field is only writable by authenticated admins.

No field changes. No new models. The only change is who can write.

---

## Runtime Environment Entity

This is not a Prisma model — it is the set of key/value pairs that govern production
application behavior. The "state" of this entity changes as a result of this phase.

| Variable | Before | After |
|----------|--------|-------|
| `DATABASE_URL` (source) | Hardcoded string in `lib/prisma.ts` | `process.env.DATABASE_URL` |
| `DATABASE_URL` (value) | Old Supabase password, port 5432 | New Supabase password, port 6543 + pgbouncer |
| `NEXTAUTH_URL` | `sinai-institute.vercel.app` (wrong) | `https://test.sinaiinstitute.com` |
| `NEXTAUTH_SECRET` | Weak 62-char string in git | Strong 32-byte random, dashboard only |
| `CLOUDINARY_API_SECRET` | Present in `.env`/git history | Rotated, dashboard only |

---

## No New Contracts Created

This phase does not add new API endpoints, new response shapes, or new data structures.
It only adds authorization enforcement to existing endpoints whose behavior is otherwise
preserved. The existing contracts for `POST /api/pages`, `PATCH /api/pages`,
`POST /api/upload-image`, and `POST /api/upload-media` are unchanged except:

**New pre-condition on all four**: Valid admin session required.

**New response (when session absent)**:
```json
{ "error": "Unauthorized" }
// HTTP 401
```

This is documented in `contracts/api-auth-guard.md`.
