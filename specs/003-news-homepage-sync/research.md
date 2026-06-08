# Research: 003-news-homepage-sync

**Phase**: 0 — Research  
**Feature**: Institute and General News Homepage Production Sync Fix  
**Date**: 2026-04-05  
**Source**: Spec clarifications Q1–Q10, code audit, `docs/known-issues.md`, `docs/domain-model.md`, `docs/feature-inventory.md`, `docs/deployment-vercel.md`

---

## Resolved Unknowns

### R-001: Production Domain and Correct NEXTAUTH_URL Value

**Decision**: The Vercel production app lives at **`https://sinaiinstitute.com`** — confirmed by the operator.  
`docs/deployment-vercel.md` and `docs/known-issues.md` KI-005 that reference `test.sinaiinstitute.com` are **stale** — the domain was migrated to the apex domain after those docs were written.  
**Correct `NEXTAUTH_URL` value**: `https://sinaiinstitute.com`  
**Source**: Operator confirmation (2026-04-05).  
**Impact on plan**: All plan steps use `https://sinaiinstitute.com`. The `docs/deployment-vercel.md` domain table and KI-005 fix record should be updated to reflect the current domain as a documentation cleanup task (out of scope for this fix, non-blocking).

---

### R-002: Current State of Local Code Changes

**Decision**: Three files were already fixed in the previous session (2026-04-05):

| File | Status | What was fixed |
|------|--------|----------------|
| `app/api/news/route.ts` GET handler | ✅ Fixed locally | `published` → `isPublished`, `publishedAt` → `publishDate` |
| `app/api/news/route.ts` POST handler | ✅ Fixed locally | Field mapping: `title→titleAr`, `content→contentAr`, `published→isPublished` |
| `app/(public)/page.tsx` | ✅ Fixed locally | Wired to `/api/news?category=INSTITUTE_NEWS` + `GENERAL_NEWS`; removed localStorage reads |
| `app/(cms)/cms/homepage/page.tsx` | ✅ Fixed locally | CRUD via `/api/news`; removed localStorage persistence |

**Not yet fixed**:
- `app/api/news/route.ts` PUT handler (lines 115–118): still uses raw body spread `const { id, ...data } = body; prisma.news.update({ data })` — will fail with Prisma P2009 on any edit once session auth is functional.

**None of these changes are committed or deployed.**

---

### R-003: PUT Handler Failure Mechanism

**Decision**: The PUT handler passes non-schema field names to Prisma.  
CMS sends: `{ id, title, content, image, category, published }`.  
`title`, `content`, `published` are not Prisma schema fields. Prisma `update()` will reject these with a runtime error (P2009: Unknown argument).  
**Fix**: Replace the raw spread with explicit field assignment identical to POST handler.  
**Same commit**: Yes — must be included with the other three fixed files to avoid a new visible regression after NEXTAUTH_URL is corrected.

---

### R-004: NEXTAUTH_URL State in Vercel

**Decision**: `NEXTAUTH_URL` exists in Vercel dashboard but currently points to wrong URL (confirmed by user, Q7). The correct value per `docs/known-issues.md` KI-005 resolution is `https://test.sinaiinstitute.com`.  
**Verification**: Vercel dashboard → Project → Settings → Environment Variables → look for `NEXTAUTH_URL`.  
**Risk**: Changing NEXTAUTH_URL to the wrong value would break CMS login. If API URL is correct, no redeploy needed — takes effect on next request.

---

### R-005: Shared Save Endpoint Topology

**Decision**: Both "أخبار عن المعهد" (`handleAddInstituteNews`, line 428) and "أخبار" (`handleAddGeneralNews`, line 900) use **the identical `fetch('/api/news', { method: 'POST'|'PUT' })` call**. Only the `category` field differs: `INSTITUTE_NEWS` vs `GENERAL_NEWS`. This means one PUT fix covers both sections.

---

### R-006: Image/Storage vs Database Write Failure Separation

**Decision**: Image upload is handled **before** the news API call and is independent. The CMS forms use a separate `image` field (URL from Cloudinary) that is already resolved at save time. The `POST /api/news` body receives `image: <cloudinary_url>` as a plain string. Therefore:
- Image storage failures: upload-time errors (Cloudinary), not at DB save time
- Database write failures: session (401) and Prisma field mismatch (500) — both on `/api/news` POST/PUT
- These are **independent failure paths** and require only the `/api/news` route.ts fix.

---

### R-007: Constitution Gate — Known Issues

All 5 tracked Critical KIs resolved as of 2026-03-29:

| KI | Issue | Status |
|----|-------|--------|
| KI-001 | Secrets in git history | ✅ Resolved — rotated |
| KI-002 | `vercel.json` env block | ✅ Resolved — block removed |
| KI-003 | Unauthenticated write endpoints | ✅ Resolved — endpoints guarded |
| KI-004 | Auth is hardcoded stub | ✅ Resolved |
| KI-005 | NEXTAUTH_URL wrong domain | ✅ Resolved in dashboard |

Constitution gate I **passes**. Feature work may proceed.

---

### R-008: Existing Data Safety

3 existing production records in the `News` table:

| ID | Category | isPublished |
|----|----------|-------------|
| `cmkx1oyfs0008cwzgx9wlj9w7` | `INSTITUTE_NEWS` | `true` |
| `cmkx1oyga0009cwzgclf0fbnt` | `EVENTS` | `true` |
| `cmkx1oyfb0007cwzgvio444ee` | `ANNOUNCEMENTS` | `true` |

The fix applies no write, delete, or update to any of these records. The only permitted write during verification is a labeled test item that is explicitly deleted after confirmation.

---

### R-009: Deployment Mechanism

**Decision**: Vercel auto-deploys from the `main` branch on push (or via manual `vercel --prod`). No `vercel.json` env block exists (removed in KI-002 fix). All env vars are in Vercel dashboard. The NEXTAUTH_URL correction in the dashboard takes effect on the **next request** without requiring a redeploy.

---

## Alternatives Considered

| Decision | Alternative | Rejected Because |
|----------|-------------|-----------------|
| Fix PUT in same commit as GET/POST | Separate PR for PUT fix | Creates a gap window where auth works but edit fails — visible production regression |
| Code fix first, NEXTAUTH_URL second | NEXTAUTH_URL first | GET has no auth guard; homepage is unblocked immediately by code fix regardless of NEXTAUTH_URL |
| Map fields explicitly in PUT | Raw body whitelist (reject unknown fields) | More defensive but adds complexity; explicit mapping is consistent with POST and directly satisfies FR-019 |
| Use `https://test.sinaiinstitute.com` | Use `https://sinaiinstitute.com` | `sinaiinstitute.com` is A2Hosting — not the Vercel app |
