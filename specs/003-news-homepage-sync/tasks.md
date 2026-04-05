# Tasks: 003-news-homepage-sync — Save Failure Fix

**Input**: `specs/003-news-homepage-sync/plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/news-api.md`  
**Branch**: `003-news-homepage-sync`  
**Target**: `https://sinaiinstitute.com` (Vercel production)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: User story this task belongs to (US1 = visitor sees news, US2 = CMS admin reads news, US3 = propagation)
- **⚠️ RISKY**: Task carries a data-mutation or production-state risk — treat with extra care
- **👤 OPERATOR**: Requires manual action in browser or external dashboard — cannot be automated

---

## Phase 1: Setup — Confirm Baseline (Read-Only Diagnosis)

**Purpose**: Establish confirmed ground truth before any code change. All tasks are read-only. No data is modified.

**⚠️ CRITICAL**: Complete this phase entirely before writing any code. Document each result.

- [ ] T001 Confirm `GET https://sinaiinstitute.com/api/news` returns HTTP 500 (not 200): `curl -s -o /dev/null -w "%{http_code}" "https://sinaiinstitute.com/api/news"`
- [ ] T002 [P] Confirm 3 News records exist in Supabase: open Supabase dashboard → Table Editor → `News` table → verify IDs `cmkx1oyfs0008cwzgx9wlj9w7` (INSTITUTE_NEWS), `cmkx1oyga0009cwzgclf0fbnt` (EVENTS), `cmkx1oyfb0007cwzgvio444ee` (ANNOUNCEMENTS)
- [ ] T003 [P] Confirm public homepage fires NO `/api/news` request: open `https://sinaiinstitute.com` in browser DevTools → Network tab → reload → filter for "api/news" → confirm zero requests
- [ ] T004 [P] Confirm CMS homepage fires NO `/api/news` request: open `https://sinaiinstitute.com/cms/homepage` → DevTools Network → filter "api/news" → confirm zero requests pre-fix
- [ ] T005 Identify exact shared save handler: inspect `app/(cms)/cms/homepage/page.tsx` lines 428–480 (`handleAddInstituteNews`) and 900–955 (`handleAddGeneralNews`) — confirm both call `fetch('/api/news', { method: 'POST'|'PUT' })` with identical structure, only `category` differs
- [ ] T006 Inspect POST/PUT request payload: confirm CMS sends `{ title, content, image, category, published }` — confirm `title`, `content`, `published` are NOT Prisma schema field names (schema uses `titleAr`, `contentAr`, `isPublished`)
- [ ] T007 Inspect auth/session layer in `app/api/news/route.ts` lines 40–50: confirm `getServerSession(authOptions)` is called as first action in POST; confirm 401 is returned if `session` is null; confirm this is the cause of on-production save failures
- [ ] T008 Inspect PUT handler in `app/api/news/route.ts` lines 93–127: confirm raw body spread `const { id, ...data } = body; prisma.news.update({ data })` passes non-schema fields → will cause Prisma P2009 error once auth is working
- [ ] T009 [P] Verify image/storage path is separate from DB write path: confirm `image` field in CMS body is a Cloudinary URL string already resolved at form submit time — confirm no Cloudinary API call occurs inside `POST /api/news` — image failure and DB failure are independent
- [ ] T010 Confirm local dev server returns HTTP 200 for GET (post-previous-session fix): `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3100/api/news"` — expected: 200

**Checkpoint**: Phase 1 complete when all 10 tasks are confirmed with documented results. Safe to proceed to code changes.

---

## Phase 2: Foundational — PUT Handler Fix

**Purpose**: Fix the one remaining code bug: PUT handler raw body spread → explicit field mapping. This is the only new code change in this fix; all other source file changes were applied in the previous session.

**⚠️ CRITICAL**: Do not commit until Phase 3 verification gates all pass.

- [ ] T011 Replace raw body spread in PUT handler `app/api/news/route.ts` lines 105–118 with explicit field destructuring and conditional field mapping (`title→titleAr`, `content→contentAr`, `image→image`, `category→category`, `published→isPublished`) — preserve existing auth guard at lines 96–103 and `id` validation at lines 108–113 — use conditional spread syntax so only provided fields are updated (partial update behavior)

**Checkpoint**: PUT handler now maps CMS fields correctly to Prisma schema. Auth guard untouched.

---

## Phase 3: User Story 1 — Visitor Sees Institute News on Homepage (P1) 🎯 MVP

**Goal**: Public visitors on any device can see institute news on the homepage without prior local state.

**Independent Test**: Open `https://sinaiinstitute.com` in a fresh incognito browser. The "أخبار المعهد" section displays news cards populated from the database — not empty, not broken.

- [ ] T012 [US1] Verify GET filter correctness (local): `curl -s "http://localhost:3100/api/news?category=INSTITUTE_NEWS&published=true"` — must return exactly 1 record (`cmkx1oyfs0008cwzgx9wlj9w7`); confirm `isPublished: true`, `titleAr` is non-empty
- [ ] T013 [US1] Verify homepage fetch wiring (local): open `http://localhost:3100` in browser → DevTools Network → confirm 2 requests fire to `/api/news` with `category=INSTITUTE_NEWS` and `category=GENERAL_NEWS` parameters → confirm both return 200
- [ ] T014 [US1] Verify institute news card renders (local): confirm "أخبار المعهد" section on `localhost:3100` shows at least 1 visible card with title and content — no empty section, no console error
- [ ] T015 [US1] Verify graceful empty state for general news (local): `curl -s "http://localhost:3100/api/news?category=GENERAL_NEWS&published=true"` — must return `[]`; confirm homepage general news section renders a graceful empty state (no crash, no broken layout)
- [ ] T016 [US1] Run TypeScript gate: `npx tsc --noEmit` from repo root — must exit 0; if pre-existing errors remain, document them in the commit message but do not introduce new ones

**Checkpoint**: US1 fully verifiable locally. Homepage displays institute news from DB on a fresh browser. TypeScript gate passed.

---

## Phase 4: User Story 2 — CMS Admin Reads Existing News (P2)

**Goal**: CMS admin on any device sees all previously saved news in the CMS homepage manager — not an empty list.

**Independent Test**: Log in to `localhost:3100/cms/homepage`, navigate to "أخبار عن المعهد" — the section shows the existing institute news entry without re-entering it.

- [ ] T017 [US2] Verify CMS read path (local): open `http://localhost:3100/cms/homepage` → DevTools Network → confirm `GET /api/news?category=INSTITUTE_NEWS` fires on page load → confirm it returns the existing record → confirm UI renders it in the list
- [ ] T018 [US2] Verify CMS POST path (local): in `localhost:3100/cms/homepage` → "أخبار عن المعهد" → click add → enter title and content → save → confirm success toast fires → confirm `POST /api/news` returns HTTP 201 in DevTools (requires being logged into CMS locally) — add test item titled `"اختبار محلي"` only
- [ ] T019 [US2] Verify CMS PUT path (local): ⚠️ RISKY (mutates local DB via remote Supabase) — edit the test item `"اختبار محلي"` created in T018 → confirm `PUT /api/news` fires → confirm success toast → confirm updated title appears in list — do NOT edit the original production record `cmkx1oyfs0008cwzgx9wlj9w7`
- [ ] T020 [US2] Verify CMS DELETE path (local): ⚠️ RISKY (mutates Supabase) — delete only the test item `"اختبار محلي"` created in T018 — confirm `DELETE /api/news?id=<test-id>` returns 200 → confirm item removed from list — do NOT delete any of the 3 original production records
- [ ] T021 [US2] Re-confirm data integrity after T018–T020: `curl -s "http://localhost:3100/api/news" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'records')"` — must return exactly 3 records (original records intact)

**Checkpoint**: US2 fully verifiable locally. CMS create/edit/delete all work. Original data intact.

---

## Phase 5: User Story 3 — News Changes Propagate Within 60s (P3)

**Goal**: After CMS save, a fresh visitor sees the update within 60 seconds without manual cache clearing.

**Independent Test**: Add a new news item in the CMS, reload the homepage in incognito within 60 seconds — the new item appears.

- [ ] T022 [US3] Verify no ISR/static caching on the homepage fetch: inspect `app/(public)/page.tsx` — confirm the page either uses `'use client'` + `useEffect` fetch (CSR) or `cache: 'no-store'` (SSR) — confirm fetch does not use stale-while-revalidate with a long TTL that would delay propagation > 60s
- [ ] T023 [US3] Verify revalidation behavior (local): add a new test news item via CMS at `localhost:3100/cms/homepage` → immediately reload `localhost:3100` in a different browser tab → confirm the new item appears in the homepage institute news section without a hard refresh or cache clear

**Checkpoint**: US3 verifiable locally. Propagation confirmed < 60s.

---

## Phase 6: Documentation Updates

**Purpose**: Keep all `docs/` files accurate. Required in same commit as code changes (Constitution — Principle V).

- [ ] T024 [P] Update `docs/domain-model.md`: find the News model entry and remove the warning note `"⚠️ GET route filters on { published: ... } (wrong name)"` — replace with `"✅ GET route: isPublished (correct, fixed 2026-04-05)"`
- [ ] T025 [P] Update `docs/feature-inventory.md`: find `/api/news` row → change GET filter status from `⚠️` to `✅` — add note `"GET filter fixed 2026-04-05 (isPublished, publishDate)"`
- [ ] T026 [P] Update `docs/known-issues.md`: search for any open item referencing `homepage_institute_news`, `localStorage` news sync, or `/api/news` GET filter — mark each as resolved with date `2026-04-05` and reference `003-news-homepage-sync`
- [ ] T027 Update `docs/003-news-homepage-sync-review.md`: add confirmed PUT handler fix (FR-019), NEXTAUTH_URL issue (FR-016/017/018), and deployment sequence — mark final status as "code fix complete, awaiting deployment"

**Checkpoint**: All docs accurate. Constitution Principle V satisfied.

---

## Phase 7: Commit and Deploy

**Purpose**: Atomic commit of all code + docs changes, push to trigger Vercel deployment.

- [ ] T028 Stage all changed files: `git add app/api/news/route.ts app/(public)/page.tsx app/(cms)/cms/homepage/page.tsx docs/domain-model.md docs/feature-inventory.md docs/known-issues.md docs/003-news-homepage-sync-review.md`
- [ ] T029 Commit with structured message per commit discipline: `git commit -m "fix(news): wire homepage and CMS to /api/news, fix PUT field mapping [SECURITY]: no auth guard removed; getServerSession check preserved on all mutating handlers"`
- [ ] T030 Push branch and merge to main: `git push origin 003-news-homepage-sync` then `git checkout main && git merge 003-news-homepage-sync && git push origin main`
- [ ] T031 Monitor Vercel build: open `vercel.com/dashboard` → confirm build starts within 30s → confirm build succeeds (~2–3 min) — if build fails, do NOT continue to T032
- [ ] T032 Confirm production GET returns 200 post-deploy: `curl -s -o /dev/null -w "%{http_code}" "https://sinaiinstitute.com/api/news"` — expected: 200 (was 500 pre-deploy)

**Checkpoint**: Code fix deployed. Homepage reads working in production. CMS writes still return 401 until T033.

---

## Phase 8: NEXTAUTH_URL Correction (Operator — No Code Change)

**Purpose**: Unblock CMS write operations on production. No redeploy needed — env var change takes effect on next request.

**👤 OPERATOR — All tasks in this phase require manual browser action in Vercel dashboard.**

- [ ] T033 👤 Open Vercel dashboard → project → Settings → Environment Variables → locate `NEXTAUTH_URL` → confirm its current value is NOT `https://sinaiinstitute.com`
- [ ] T034 👤 ⚠️ RISKY (modifies production auth config) — Update `NEXTAUTH_URL` in Vercel dashboard to exactly `https://sinaiinstitute.com` (no trailing slash, no `www`, correct protocol) → click Save
- [ ] T035 👤 Confirm `NEXTAUTH_SECRET` is present and non-empty in Vercel dashboard (Settings → Environment Variables)
- [ ] T036 👤 Test CMS write on production: log in to `https://sinaiinstitute.com/cms` → open homepage manager → "أخبار عن المعهد" → add test item titled `"اختبار - لا تحذف"` → confirm success toast (HTTP 201) → confirm item appears in list
- [ ] T037 👤 ⚠️ RISKY (deletes production record) — Delete only the test item `"اختبار - لا تحذف"` created in T036 → confirm item removed → this is the ONLY permitted delete on production

**Checkpoint**: NEXTAUTH_URL corrected. CMS add/edit/delete all unblocked on production.

---

## Phase 9: Production Verification

**Purpose**: End-to-end verification across browsers and devices. All tests are read-only (except T036–T037 above which were part of Phase 8).

- [ ] T038 [US1] Verify production GET returns correct data: `curl -s "https://sinaiinstitute.com/api/news?category=INSTITUTE_NEWS&published=true" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d),'records')"` — expected: 1 record
- [ ] T039 [US1] Verify homepage shows institute news in incognito: open `https://sinaiinstitute.com` in a fresh incognito window → "أخبار المعهد" section must show at least 1 news card → no empty section, no console error
- [ ] T040 [US1] [P] Verify homepage news on mobile (different device): open `https://sinaiinstitute.com` on a mobile browser → confirm same news card visible — cross-device consistency confirmed
- [ ] T041 [US2] Verify CMS loads existing news on fresh browser: log in to `https://sinaiinstitute.com/cms/homepage` on a device that has never accessed the CMS → "أخبار عن المعهد" section shows the existing institute news entry without re-entering it
- [ ] T042 [US3] Verify propagation < 60s: add a new institute news item via CMS → start a timer → reload `https://sinaiinstitute.com` in incognito → confirm new item appears within 60 seconds
- [ ] T043 [P] Confirm data integrity: `curl -s "https://sinaiinstitute.com/api/news"` → confirm 3 original records present → no record deleted, overwritten, or modified unintentionally

**Checkpoint**: All user stories verified on production. Fix confirmed complete.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Diagnosis)      → No dependencies — start immediately (read-only)
Phase 2 (PUT fix)        → Requires Phase 1 complete (confirmed understanding of bug)
Phase 3 (US1 local)      → Requires Phase 2 complete (PUT fix in place)
Phase 4 (US2 local)      → Requires Phase 2 complete (can run after Phase 3 in parallel)
Phase 5 (US3 local)      → Requires Phase 3 complete (depends on homepage rendering)
Phase 6 (Docs)           → Requires Phase 3–5 complete (documents confirmed results)
Phase 7 (Commit+Deploy)  → Requires Phase 6 complete (docs in same commit)
Phase 8 (NEXTAUTH_URL)   → Requires Phase 7 T031+T032 passed (deployed first)
Phase 9 (Prod verify)    → Requires Phase 7 + Phase 8 complete
```

### Within Each Phase (Parallel Opportunities)

- **Phase 1**: T002, T003, T004, T009 can run in parallel (independent checks)
- **Phase 6**: T024, T025, T026 can run in parallel (different docs files)
- **Phase 9**: T040, T043 can run in parallel with other Phase 9 tasks

### Story Dependencies

- **US1 (P1)**: Independent — can validate as soon as Phase 2 is complete
- **US2 (P2)**: Independent — depends on Phase 2 (PUT fix), not on US1
- **US3 (P3)**: Depends on US1 (homepage must render before propagation can be confirmed)

---

## Parallel Execution Example: Phase 1

```bash
# These 4 tasks can run concurrently:
Task T002: Supabase dashboard — check 3 records exist
Task T003: Browser DevTools — check homepage fires no /api/news
Task T004: Browser DevTools — check CMS fires no /api/news
Task T009: Inspect CMS code — confirm image path is separate from DB write
```

---

## Implementation Strategy

### MVP (User Story 1 — Visitor Sees News)

1. Complete Phase 1 (diagnosis) — all read-only
2. Complete Phase 2 (PUT handler fix) — 1 file, ~12 lines
3. Complete Phase 3 (US1 local verification) — curl + browser
4. **STOP + VALIDATE**: IS homepage showing news locally? → Yes → proceed
5. Complete Phase 6 (docs) + Phase 7 (commit + deploy)
6. Verify T032 (production GET 200)
7. Verify T039 (incognito homepage)

### Full Fix (All 3 User Stories + CMS Write)

8. Complete Phase 8 (NEXTAUTH_URL — operator) after Phase 7
9. Complete Phase 4 (US2) verification on production (T041)
10. Complete Phase 5 (US3) + Phase 9 verification (T042, T043)

---

## Notes

- **No destructive DB operations**: T019 and T020 only interact with the test item created in T018. Original records (`cmkx1oyfs0008cwzgx9wlj9w7`, `cmkx1oyga0009cwzgclf0fbnt`, `cmkx1oyfb0007cwzgvio444ee`) must never be edited or deleted.
- **Rollback**: If any production issue detected after T031, run `git revert HEAD --no-edit && git push origin main` — Vercel auto-deploys revert in ~2 min.
- **Image/Storage**: No image upload logic is in `/api/news`. Image field is Cloudinary URL resolved at CMS form submission. If image doesn't appear, verify Cloudinary URL is valid — this is independent of the DB write fix.
- **Session requirement**: T018–T020 and T036–T037 require a valid CMS session. Ensure admin login works before attempting write tests.
- **GENERAL_NEWS empty state**: After deployment, homepage "الأخبار العامة" section will show empty gracefully (no GENERAL_NEWS DB records). Operator can add records via CMS after Phase 8 (no code needed).
