# Tasks: Institute News Homepage Production Sync Fix

**Input**: Design documents from `/specs/003-news-homepage-sync/`  
**Branch**: `003-news-homepage-sync`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md) | **Data model**: [data-model.md](./data-model.md) | **Contract**: [contracts/api-news.md](./contracts/api-news.md)  
**Tests**: No automated test suite in project — manual verification only (pre-existing constraint)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this belongs to
- **⚠️ DATA RISK**: Task that could mutate or delete production data — extra care required
- **🔍 READ-ONLY**: Safe investigation task — no code or data change

---

## Phase 1: Read-Only Diagnosis (FR-014 MANDATORY — do before any code change)

**Purpose**: Confirm root cause with zero risk. All tasks are read-only. Document each result.  
**⚠️ CRITICAL**: This phase MUST complete before Phase 2 begins. No code changes permitted here.

- [ ] T001 🔍 Confirm `/api/news` returns HTTP 500 locally: run `curl http://localhost:3000/api/news` and document actual status + error body (expected: 500 "فشل في جلب الأخبار" from P2009 on unknown `publishedAt` field)
- [ ] T002 🔍 Confirm `published=true` filter is broken: run `curl "http://localhost:3000/api/news?published=true"` and verify it does NOT correctly filter by `isPublished` (expected: same 500 or returns all rows ignoring publish flag)
- [ ] T003 🔍 Confirm Supabase `News` table row existence: open Supabase dashboard → Table Editor → `News` table → record row count and note values in the `category` column (expected finding: rows may have `category = "NEWS"` default rather than `"INSTITUTE_NEWS"`)
- [ ] T004 🔍 Check publish state of existing rows: in Supabase Table Editor, note `isPublished` values on all `News` rows — identify which are `true` vs `false`
- [ ] T005 🔍 [P] Confirm public homepage makes zero `/api/news` requests: open browser DevTools → Network → load `http://localhost:3000/` → filter requests by `/api/news` → document: no matching requests (expected: zero)
- [ ] T006 🔍 [P] Confirm CMS homepage makes zero `/api/news` requests: open browser DevTools → Network → authenticated load of `/cms/homepage` → filter by `/api/news` → document: no matching requests (expected: zero)
- [ ] T007 🔍 [P] Verify public homepage reads localStorage for news: open DevTools → Application → Local Storage → check for `homepage_institute_news` and `homepage_general_news` keys on a fresh incognito load → document values (expected: empty/null — explains invisible news on fresh devices)
- [ ] T008 🔍 [P] Verify CMS does NOT call GET /api/news on load: in DevTools Network tab during CMS homepage load, confirm institute news section reads from `localStorage` not API (expected: no fetch to `/api/news`)
- [ ] T009 🔍 Check ISR/SSR status of public homepage: inspect `app/(public)/page.tsx` line 1 for `'use client'` directive — document: confirms client-side rendering only (no ISR/SSR/revalidation issue — caching is NOT the problem)
- [ ] T010 🔍 Verify Prisma schema field names against API route: run `grep -n "isPublished\|publishDate\|titleAr\|contentAr" prisma/schema.prisma` vs `grep -n "published\|publishedAt\|title\|content" app/api/news/route.ts` and document the full mismatch table

**Checkpoint**: All 10 diagnosis tasks complete. Results documented. Root cause confirmed before any code is written.

---

## Phase 2: Foundational — Fix `/api/news` Route (Blocking Prerequisite)

**Purpose**: Fix the broken API endpoint. This MUST be done before wiring any consumer (public homepage or CMS), because both Phase 3 and Phase 4 depend on the API working correctly.

**⚠️ CRITICAL**: Phases 3 and 4 CANNOT be validated until this phase is complete.

- [ ] T011 Fix `GET` handler in `app/api/news/route.ts`: replace `where.published = published === 'true'` with `where.isPublished = published === 'true'` (field name fix — `published` → `isPublished`)
- [ ] T012 Fix `GET` orderBy in `app/api/news/route.ts`: replace `orderBy: { publishedAt: 'desc' }` with `orderBy: { publishDate: 'desc' }` (field name fix — `publishedAt` → `publishDate`)
- [ ] T013 Fix `POST` handler data object in `app/api/news/route.ts`: update `prisma.news.create({ data: { ... } })` — replace all wrong field names: `title` → `titleAr`, `content` → `contentAr`, `published` → `isPublished`, `publishedAt` → `publishDate` (set to `new Date()` when publishing), `featured` → `isFeatured`, `showInTicker` → `isInTicker`; add `titleEn: ''` and `contentEn: ''` as required empty-string defaults; remove `summary` and `showInSlider` (no matching schema fields)
- [ ] T014 [P] Verify `GET /api/news` now returns HTTP 200 locally: run `curl http://localhost:3000/api/news` → expected: 200 JSON array (may be empty if no rows yet)
- [ ] T015 [P] Verify `published=true` filter now works: run `curl "http://localhost:3000/api/news?published=true"` → expected: 200 with only rows where `isPublished = true`
- [ ] T016 [P] Verify `category` filter works: run `curl "http://localhost:3000/api/news?category=INSTITUTE_NEWS"` → expected: 200 with only rows matching that category (may be empty if no `INSTITUTE_NEWS` rows exist yet)
- [ ] T017 [P] Verify combined filter works: run `curl "http://localhost:3000/api/news?category=INSTITUTE_NEWS&published=true"` → expected: 200 filtered list (correct for public homepage use)

**⚠️ DATA RISK — T018 (CONDITIONAL)**: If T003/T004 found that existing `News` rows have `category = "NEWS"` and `isPublished = true` and should be visible as institute news — update those rows' `category` field via Supabase dashboard Table Editor (direct cell edit, no SQL, no migration). Change `"NEWS"` → `"INSTITUTE_NEWS"` for rows that are institute news. **This is the only permitted data mutation in this plan. No row deletion. No schema change.**

- [ ] T018 ⚠️ DATA RISK [CONDITIONAL] Update `category` on miscategorized rows in Supabase dashboard if found in T003: set `category = "INSTITUTE_NEWS"` for institute news rows currently stored as `category = "NEWS"`. Skip entirely if no such rows exist.

**Checkpoint**: `GET /api/news?category=INSTITUTE_NEWS&published=true` returns 200 with correct filtered data. POST creates records with correct field names. Foundation ready for consumer wiring.

---

## Phase 3: User Story 1 — Public Homepage Reads News from DB (Priority: P1) 🎯 MVP

**Goal**: Any visitor to `https://sinaiinstitute.com/` sees the institute news section populated from the database, regardless of their browser, device, or session.

**Independent Test**: Open `http://localhost:3000/` in a private/incognito window (no localStorage) → institute news section should show DB content without any prior CMS interaction.

### Implementation for User Story 1

- [ ] T019 [P] [US1] Locate the institute news localStorage read block in `app/(public)/page.tsx`: find `localStorage.getItem('homepage_institute_news')` — note exact line numbers for replacement
- [ ] T020 [P] [US1] Locate the general news localStorage read block in `app/(public)/page.tsx`: find `localStorage.getItem('homepage_general_news')` — note exact line numbers for replacement
- [ ] T021 [US1] Replace institute news localStorage read in `app/(public)/page.tsx` useEffect with `fetch('/api/news?category=INSTITUTE_NEWS&published=true')` call: map response items `{ titleAr → title, contentAr → description, image → imageUrl, order, id }` into component state; add `.catch(() => {})` for graceful empty-state fallback
- [ ] T022 [US1] Replace general news localStorage read in `app/(public)/page.tsx` useEffect with `fetch('/api/news?category=GENERAL_NEWS&published=true')` call: same field mapping and graceful error handling as T021
- [ ] T023 [US1] Verify empty-state behaviour in `app/(public)/page.tsx`: confirm that if the API returns `[]`, the news section renders its existing empty/placeholder state without crashing (no code change needed if already handled — just verify and document)
- [ ] T024 [P] [US1] Verify public homepage institute news section in incognito window: load `http://localhost:3000/` → DevTools Network → confirm two requests fire: `GET /api/news?category=INSTITUTE_NEWS&published=true` and `GET /api/news?category=GENERAL_NEWS&published=true` → both return 200 → news sections populated
- [ ] T025 [P] [US1] Verify no regression on other homepage sections: load `http://localhost:3000/` → confirm hero slides, stats, specializations, social media links all still render (those sections remain on localStorage — must NOT be touched)
- [ ] T026 [US1] Check for TypeScript errors introduced in `app/(public)/page.tsx`: run `npx tsc --noEmit` → fix any new type errors in this file only (pre-existing errors elsewhere can be documented, not fixed)

**Checkpoint**: Public homepage shows institute news from DB in incognito. All other sections unaffected. `tsc --noEmit` clean for edited file.

---

## Phase 4: User Story 2 — CMS Reads and Writes News to DB (Priority: P1)

**Goal**: The CMS operator can load, add, and delete institute news entries in `/cms/homepage` and those changes immediately appear in the database and thus on the public homepage.

**Independent Test**: Log into CMS → navigate to institute news section → list loads from DB → add new entry → save → open incognito homepage → new entry visible.

### Implementation for User Story 2

- [ ] T027 [P] [US2] Locate CMS institute news read (localStorage load) in `app/(cms)/cms/homepage/page.tsx`: find `localStorage.getItem('homepage_institute_news')` in the load/useEffect block — note line numbers
- [ ] T028 [P] [US2] Locate CMS general news read (localStorage load) in `app/(cms)/cms/homepage/page.tsx`: find `localStorage.getItem('homepage_general_news')` in the load/useEffect block — note line numbers
- [ ] T029 [P] [US2] Locate CMS institute news WRITE (localStorage save) in `app/(cms)/cms/homepage/page.tsx`: find `localStorage.setItem('homepage_institute_news', ...)` in the save handler — note exact function name and line numbers
- [ ] T030 [P] [US2] Locate CMS general news WRITE (localStorage save) in `app/(cms)/cms/homepage/page.tsx`: find `localStorage.setItem('homepage_general_news', ...)` — note line numbers
- [ ] T031 [US2] Replace institute news localStorage READ in `app/(cms)/cms/homepage/page.tsx` mount useEffect with `fetch('/api/news?category=INSTITUTE_NEWS')` call: map response items `{ id, titleAr → title, contentAr → description, image → imageUrl, isPublished, order }` into component state
- [ ] T032 [US2] Replace general news localStorage READ in `app/(cms)/cms/homepage/page.tsx` with `fetch('/api/news?category=GENERAL_NEWS')` call using same field mapping as T031
- [ ] T033 [US2] Replace institute news localStorage WRITE in `app/(cms)/cms/homepage/page.tsx` save handler with `fetch('/api/news', { method: 'POST', ... })` call: body must include `{ title: item.title, content: item.description, category: 'INSTITUTE_NEWS', image: item.imageUrl || null, published: item.isPublished ?? true }`; after successful save, re-fetch `GET /api/news?category=INSTITUTE_NEWS` to refresh the CMS list
- [ ] T034 [US2] Replace general news localStorage WRITE in `app/(cms)/cms/homepage/page.tsx` save handler with `fetch('/api/news', { method: 'POST', ... })` using `category: 'GENERAL_NEWS'`; after save, re-fetch `GET /api/news?category=GENERAL_NEWS`
- [ ] T035 [US2] Wire CMS delete action for institute news in `app/(cms)/cms/homepage/page.tsx`: replace any localStorage-based delete with `fetch('/api/news?id=${item.id}', { method: 'DELETE' })`; after successful delete, remove item from local state (or re-fetch list)
- [ ] T036 [US2] Wire CMS delete action for general news in `app/(cms)/cms/homepage/page.tsx` using same DELETE pattern as T035
- [ ] T037 [US2] Add loading state indicator in `app/(cms)/cms/homepage/page.tsx` for institute news section: show spinner/disabled state while API fetch is in progress to prevent double-submit (use existing component patterns — no new dependencies)
- [ ] T038 [US2] Add error state in `app/(cms)/cms/homepage/page.tsx` for news API failure: if fetch fails, display Arabic error message (e.g. "فشل في تحميل الأخبار") and do NOT fall back to localStorage
- [ ] T039 [US2] Verify CMS institute news section loads from DB on page mount: log into `/cms/homepage` → DevTools Network → confirm `GET /api/news?category=INSTITUTE_NEWS` fires on load → returns 200 → section populated
- [ ] T040 [US2] Verify CMS add + save writes to DB: add a new institute news entry → save → check Supabase Table Editor → confirm row created with `category = "INSTITUTE_NEWS"` and correct `titleAr` value
- [ ] T041 [US2] Verify cross-device visibility: after saving via CMS (T040), open a **separate incognito window** → load `http://localhost:3000/` → confirm new entry appears in institute news section → this is the primary acceptance test
- [ ] T042 [US2] Verify published/unpublished visibility: if CMS has publish toggle, save an entry with `isPublished = false` → confirm it does NOT appear on public homepage (`GET /api/news?published=true` must exclude it)
- [ ] T043 [US2] Check for TypeScript errors introduced in `app/(cms)/cms/homepage/page.tsx`: run `npx tsc --noEmit` → fix any new type errors in this file only

**Checkpoint**: CMS add → save → incognito homepage shows new entry. `isPublished = false` entries are hidden from homepage. TypeScript clean for edited files.

---

## Phase 5: User Story 3 — API Field Correctness Verified End-to-End (Priority: P2)

**Goal**: Confirm that the POST create path writes to the correct schema fields and the GET read path returns the correctly mapped fields — eliminating the silent data corruption that was occurring before the fix.

**Independent Test**: POST a test news entry → immediately GET by ID or by category filter → confirm `titleAr`, `contentAr`, `isPublished`, `publishDate`, and `category` all have the expected values in the DB row.

### Implementation for User Story 3

- [ ] T044 [P] [US3] POST a test institute news entry via curl: `curl -X POST http://localhost:3000/api/news -H 'Content-Type: application/json' -d '{"title":"اختبار","content":"محتوى اختبار","category":"INSTITUTE_NEWS","published":true}'` (requires local auth cookie — use Postman or browser fetch in DevTools console if curl auth is not available)
- [ ] T045 [US3] Verify the created row in Supabase dashboard: after T044, open Table Editor → `News` → confirm the new row has `titleAr = "اختبار"`, `contentAr = "محتوى اختبار"`, `category = "INSTITUTE_NEWS"`, `isPublished = true`, `publishDate` is not null, `titleEn = ""`, `contentEn = ""`
- [ ] T046 [US3] Verify `order` field display: if any existing news rows have non-zero `order` values, confirm they are returned in correct descending `publishDate` order (not `order` field unless explicitly sorted by it)
- [ ] T047 [US3] Delete the test entry created in T044: use Supabase dashboard delete or `curl -X DELETE "http://localhost:3000/api/news?id={id}"` — confirm row removed (**this is cleanup, not production data**)

**Checkpoint**: POST creates correct schema fields. GET returns correctly mapped data. No field corruption.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, TypeScript build verification, and deployment gate.

- [ ] T048 [P] Update `docs/known-issues.md`: add partial resolution note on KI-009 — mark institute news and general news sections as resolved (2026-04-05, 003-news-homepage-sync); list remaining localStorage sections (slides, stats, specializations, social media) as pending; document resolution scope explicitly
- [ ] T049 [P] Add new known issue entry in `docs/known-issues.md` for KI-024: document the `/api/news` field name mismatch bug (GET `publishedAt` → P2009, POST `title`/`content`/`published`/etc.) and mark resolved (2026-04-05)
- [ ] T050 Run full TypeScript check across project: `npx tsc --noEmit` → fix any new errors introduced by this changeset; document any pre-existing errors in commit message as pre-existing
- [ ] T051 Run lint check: `npm run lint` → resolve any new violations in files touched by this changeset
- [ ] T052 [P] Verify `vercel.json` contains no `"env"` block (deployment gate pre-check)
- [ ] T053 [P] Verify no credential or secret appears in any file modified by this changeset (deployment gate pre-check)
- [ ] T054 Commit all changes on branch `003-news-homepage-sync`: use message `fix(003): wire CMS and homepage news to /api/news — replace localStorage, fix field mismatches`
- [ ] T055 Deploy to production: `vercel --prod` — document output URL and confirm no build errors

### Post-Deploy Production Verification (Vercel + Supabase)

- [ ] T056 Verify production API works: `curl https://sinaiinstitute.com/api/news` → expected HTTP 200, JSON array
- [ ] T057 Verify production category filter works: `curl "https://sinaiinstitute.com/api/news?category=INSTITUTE_NEWS&published=true"` → expected filtered JSON
- [ ] T058 Verify production public homepage: open `https://sinaiinstitute.com/` in incognito → DevTools Network → confirm two GET `/api/news?category=...&published=true` requests → both return 200 → news sections populated
- [ ] T059 Verify production CMS loads from DB: log into `https://sinaiinstitute.com/cms/homepage` → navigate to institute news section → confirm entries load from API (not localStorage)
- [ ] T060 Production end-to-end: add a test entry in production CMS → save → open incognito tab → reload `https://sinaiinstitute.com/` → confirm new entry appears in institute news section on homepage
- [ ] T061 Check Vercel logs for errors: run `vercel logs` or check Vercel dashboard → confirm no P2009, P2023, or 500 errors on `/api/news` after deploy

**Checkpoint**: All 61 tasks complete. Feature fully deployed and verified in production.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Read-Only Diagnosis): No dependencies. Start immediately. No code changes permitted.
- **Phase 2** (Fix `/api/news`): Depends on Phase 1 completion. ⚠️ BLOCKS Phases 3 and 4.
- **Phase 3** (Public Homepage): Depends on Phase 2. Can run in parallel with Phase 4 once T014–T017 pass.
- **Phase 4** (CMS Homepage): Depends on Phase 2. Can run in parallel with Phase 3 once T014–T017 pass.
- **Phase 5** (Field Correctness): Depends on Phase 2. Can run in parallel with Phases 3 and 4.
- **Phase 6** (Polish + Deploy): Depends on Phases 3, 4, and 5 all complete.

### User Story Dependencies

- **US1 (Public Homepage, P1)**: After Phase 2 ✅. Depends on: T014, T015, T016, T017 passing.
- **US2 (CMS Write/Read, P1)**: After Phase 2 ✅. Can start simultaneously with US1.
- **US3 (Field Correctness, P2)**: After Phase 2 ✅. Can start simultaneously with US1/US2.

### Conditional Task

- **T018** (category UPDATE in Supabase): Only execute if T003 reveals `category = "NEWS"` rows. Execute between T017 and T019. Skip entirely if no such rows exist.

### Parallel Opportunities

```bash
# Phase 1 — run in parallel (all read-only):
T005, T006, T007, T008, T009 — browser verification tasks (different targets)
T010 — code inspection (different file)

# Phase 2 — after T013 is coded:
T014, T015, T016, T017 — curl verification tasks (different query params)

# Phase 3 + Phase 4 — run simultaneously after Phase 2 checkpoint:
T019–T026 (public homepage) || T027–T043 (CMS)

# Phase 6 — run in parallel:
T048, T049 (docs) || T050, T051 (build checks) || T052, T053 (pre-deploy gates)
```

---

## Implementation Strategy

### MVP First (User Story 1 — Public Homepage)

1. Complete **Phase 1**: Read-only diagnosis → document all results
2. Complete **Phase 2**: Fix `app/api/news/route.ts` → verify API returns 200
3. **(Conditional T018)**: Fix miscategorized rows in Supabase if needed
4. Complete **Phase 3**: Wire public homepage → verify in incognito
5. **STOP and VALIDATE**: Public homepage shows institute news from DB → business value delivered
6. Then continue Phase 4 (CMS write path) → Phase 5 → Phase 6

### Full Delivery

1. Phase 1 → Phase 2 → (T018 if needed) → Phases 3 + 4 + 5 in parallel → Phase 6 → Deploy → T056–T061

---

## Notes

- **[P]** tasks = different files or independent operations, no unsatisfied dependencies
- **🔍 READ-ONLY** = safe, no mutations; can be run on production URL
- **⚠️ DATA RISK** = T018 only; targets miscategorized rows only; no deletion; must confirm row content before editing
- **No automated test suite** — all verification is manual and via browser DevTools + curl
- After Phase 2 is complete, commit before starting Phase 3/4 to preserve a known-good API fix
- Do NOT fall back to localStorage for institute or general news at any point in this implementation
- All other localStorage sections (slides, stats, specializations, social media) must remain **untouched**
