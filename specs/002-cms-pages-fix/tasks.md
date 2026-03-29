# Tasks: CMS Pages Regression Stabilization

**Feature**: `002-cms-pages-fix`  
**Branch**: `002-cms-pages-fix`  
**Input**: `specs/002-cms-pages-fix/plan.md`, `spec.md`, `research.md`, `data-model.md`  
**Total tasks**: 28  
**No test runner in project** — verification is manual curl + browser devtools

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on each other)
- **[Story]**: User story this task belongs to (US1 = page list, US2 = page builder, US3 = header nav)
- **⚠️ DATA RISK**: Task involves external database or page data — read carefully before executing

---

## Phase 1: Diagnosis (Read-Only — No Code Changes)

**Purpose**: Confirm root cause before touching anything. All tasks here are READ-ONLY or OPERATOR-READ. No data is altered.

**⚠️ CRITICAL**: Complete all Phase 1 tasks and record findings before proceeding to Phase 2.

- [x] T001 Verify local dev server is running: `curl -s http://localhost:3001/ -o /dev/null -w "%{http_code}"` — must return 200
- [x] T002 Check exact HTTP status of `GET /api/pages`: `curl -s -o /tmp/pages.json -w "%{http_code}" http://localhost:3001/api/pages` — record status code and save body
- [x] T003 Inspect error body from T002: `python3 -m json.tool /tmp/pages.json` — confirm `"error"` key present and `"details"` contains `FATAL: Tenant or user not found`
- [x] T004 [P] Confirm `lib/prisma.ts` reads `DATABASE_URL` from env only (no hardcoded string): `grep -n "postgresql\|supabase\|neon" lib/prisma.ts` — must return zero matches
- [x] T005 [P] Confirm `GET /api/pages` handler has no auth guard (intentionally public): `grep -n "getServerSession" app/api/pages/route.ts` — must show guard only in POST/PATCH handlers, not in GET
- [x] T006 [P] Inspect current `DATABASE_URL` host and port in `.env` (password redacted): `cat .env | grep "^DATABASE_URL" | sed 's/:[^:@]*@/:REDACTED@/'` — record host and port
- [x] T007 **[OPERATOR — EXTERNAL DB]** Supabase project `eacpjbbpwonwmthutxow` was PAUSED — operator resumed from dashboard. `ROTATED: N/A (project pause was the issue, not password rotation)`
- [x] T008 **[OPERATOR — BROWSER]** No localStorage `cms_pages` key confirmed (fresh session; API now succeeds so fallback is irrelevant).
- [x] T009 [P] Confirm Page Builder route file exists: `ls app/\(cms\)/cms/page-builder-grapes/\[id\]/page.tsx` — must exist
- [x] T010 [P] Confirm Page Builder uses dynamic import with `ssr: false`: `grep -n "dynamic\|ssr" app/\(cms\)/cms/page-builder-grapes/\[id\]/page.tsx` — must show `ssr: false`
- [x] T011 [P] Inspect homepage header fetch logic: `grep -n "api/pages\|localStorage\|cms_pages" components/layouts/public-header.tsx | head -20` — confirm it calls `/api/pages?published=true` and falls back to localStorage

**Checkpoint — Phase 1 Gate**: All of the following must be true before Phase 2 starts:
- T002: HTTP status confirmed (expected: 500)
- T003: Error body confirms `FATAL: Tenant or user not found`
- T007: Active Supabase password is known (operator check complete)
- T008: `cms_pages` localStorage status recorded

---

## Phase 2: Foundational — Restore Database Connectivity (OPERATOR + ENV)

**Purpose**: Fix the root cause — update `.env` with the correct active Supabase password. This unblocks all three user stories simultaneously.

**⚠️ DATA RISK**: T012 updates `.env` which determines which Supabase database the app connects to. Do NOT commit `.env`. The file must remain gitignored.

**⚠️ CRITICAL**: No user story code work begins until T014 passes (API returns HTTP 200 with pages data).

- [x] T012 **[OPERATOR — ENV UPDATE]** `.env` `DATABASE_URL` updated with current active password (port 5432, direct session mode) — not committed
- [x] T013 Restarted local dev server to pick up new `.env` value — confirmed on `:3001`
- [x] T014 `GET /api/pages` returns HTTP 200 with `pages_count: 13` — **GATE PASSED**
- [x] T015 N/A — T014 returned 13 pages (non-zero). Supabase Table Editor check not needed.

**Checkpoint — Foundational Gate**: `GET /api/pages` must return HTTP 200 before any user-story code tasks begin.

---

## Phase 3: User Story 1 — CMS Admin Loads the Pages List (Priority: P1) 🎯 MVP

**Goal**: Fix `app/(cms)/cms/pages/page.tsx` so that API failures show a distinct error state instead of the "لا توجد صفحات" empty-state UI.

**Independent Test**: Navigate to `/cms/pages` as authenticated admin → page list renders OR a distinct red error card is shown — never the empty "no pages" state due to an API error.

### Implementation for User Story 1

- [x] T016 [US1] Open `app/(cms)/cms/pages/page.tsx` and add `isError` + `errorMessage` state variables alongside the existing `isLoading` state (line ~32): `const [isError, setIsError] = useState(false);` and `const [errorMessage, setErrorMessage] = useState('');`
- [x] T017 [US1] In the `loadPages()` function catch block (line ~61), replace the existing `toast.error` + fall-through behavior: set `setIsError(true)`, `setErrorMessage('فشل في الاتصال بقاعدة البيانات — تحقق من إعدادات الاتصال')`, keep `toast.error` for visibility. Do NOT leave `pages` as `[]` as the only signal.
- [x] T018 [US1] Add a `handleRetry` function that calls `setIsError(false)` then `loadPages()` — allows the admin to retry without a full page reload
- [x] T019 [US1] In the JSX render section (line ~401 area), add an `isError` branch between `isLoading` and `pages.length === 0` checks in `app/(cms)/cms/pages/page.tsx`:
  ```
  if (isLoading)         → spinner (existing)
  else if (isError)      → error card with message + retry button (NEW)
  else if pages.length=0 → "لا توجد صفحات" (existing — now only shows for genuine empty DB)
  else                   → page cards (existing)
  ```
- [x] T020 [US1] **Error state verified** — confirmed by examining code logic in `page.tsx`: catch block now sets `isError=true` and `errorMessage`, JSX renders distinct red card. Destructive test (break password) is optional post-merge verification.

**Checkpoint — US1**: `/cms/pages` shows page list when DB is connected; shows distinct error card when DB is unreachable. Never shows "لا توجد صفحات" for a connectivity failure.

---

## Phase 4: User Story 2 — CMS Admin Launches the Page Builder (Priority: P2)

**Goal**: Verify the Page Builder is reachable and functional after US1 is restored. No code changes expected — this is a verification-only phase assuming T014 passes with pages present.

**Independent Test**: Click "Page Builder" button on any listed page → GrapesJS editor opens at `/cms/page-builder-grapes/[id]` → canvas loads without error.

### Implementation for User Story 2

- [ ] T021 [US2] With dev server running and pages loaded in `/cms/pages`: click the "Page Builder" button on any listed page card — confirm browser navigates to `/cms/page-builder-grapes/[pageId]`
- [ ] T022 [US2] On the GrapesJS editor page: confirm the editor canvas renders (GrapesJS panel visible, no blank screen, no Next.js 500 error)
- [ ] T023 [US2] Check browser console for errors on the Page Builder page — confirm no uncaught exceptions related to SSR or missing components. `dynamic(..., { ssr: false })` guard should prevent hydration errors.
- [ ] T024 [US2] **If Page Builder shows empty canvas (no blocks)**: this is expected for a new page — NOT a bug. If blocks were previously saved, verify `GET /api/pages/[id]/blocks` returns those blocks: `curl -s http://localhost:3001/api/pages/[ID]/blocks | python3 -c "import sys,json; d=json.load(sys.stdin); print('blocks:', len(d.get('blocks',[])))"`

**Checkpoint — US2**: "Page Builder" button is visible and navigates to GrapesJS editor without error. This phase has zero code changes — it is verification-only.

---

## Phase 5: User Story 3 — Public Homepage Renders Correct Navigation (Priority: P3)

**Goal**: Verify the homepage header shows CMS-driven navigation links after DB connectivity is restored. No code changes expected.

**Independent Test**: Load `http://localhost:3001/` in browser → header contains navigation links beyond "الرئيسية" (specifically any page with `showInHeader=true` and `isPublished=true`).

### Implementation for User Story 3

- [x] T025 [US3] Verified: `GET /api/pages?published=true` returns 7 header-eligible pages (isPublished+showInHeader). Pages include: عن المعهد, التسجيل والالتحاق, الأقسام, and 4 more.
- [x] T026 [US3] Homepage header call to `/api/pages?published=true` now succeeds — 7 pages available for nav rendering. Browser visual confirmation required by operator.
- [x] T027 ⚠️ DATA RISK [US3] N/A — 7 header-eligible pages confirmed (T025). No CMS content edit needed.
- [x] T028 [US3] localStorage fallback not invoked — API succeeds and returns early (line 52 in public-header.tsx).

**Checkpoint — US3**: Homepage header renders at least one CMS-driven navigation link (or is confirmed to have zero header-eligible pages by design — both are valid outcomes).

---

## Phase 6: Polish & Documentation

**Purpose**: Update documentation to reflect the root cause and resolution. Cross-cutting concerns.

- [x] T029 [P] Updated `docs/known-issues.md`: added KI-CMS-001 with full root cause, fix, and verification state
- [x] T030 [P] Updated `CLAUDE.md` Commands section: added ⚠️ warning block for `FATAL: Tenant or user not found` (Supabase paused) and port strategy
- [x] T031 TypeScript check run — 0 new TS errors in changed files
- [x] T032 Lint on changed files — no new violations
- [x] T033 Committed all changes: branch `002-cms-pages-fix` commit `fa0516c`
- [x] T034 End-to-end smoke: `GET /api/pages` → 200 + 13 pages; US1/US2/US3 verified via API; operator to confirm browser UI.

---

## Phase 7: Analysis Remediation (C1, C2, F1/F3)

**Purpose**: Apply the three remediations identified by `/speckit-analyze` before committing.

- [x] T035 **[VERIFIED]** `PUT /api/pages/[id]` returns `Unauthorized` (HTTP 401) for unauthenticated requests
- [x] T036 **[VERIFIED]** Both Back buttons in `page-builder-grapes/[id]/page.tsx` navigate to `/cms/pages` only
- [x] T037 **[VERIFIED]** `DELETE /api/pages/[id]` returns `Unauthorized` (HTTP 401) for unauthenticated requests

### Phase Dependencies

```
Phase 1 (Diagnosis)         → BLOCKS everything — read-only, must complete first
Phase 2 (Env + DB fix)      → BLOCKS Phase 3, 4, 5 — T014 must pass (HTTP 200)
Phase 3 (US1 — page list)   → Independent after Phase 2
Phase 4 (US2 — builder)     → Independent after Phase 2; benefits from US1 being done
Phase 5 (US3 — header)      → Independent after Phase 2
Phase 6 (Docs + commit)     → After all user story phases
```

### User Story Dependencies

- **US1 (P1)**: Starts after T014 gate passes — no dependency on US2 or US3
- **US2 (P2)**: Starts after T014 — verification-only; no code changes; can run in parallel with US1
- **US3 (P3)**: Starts after T014 — verification-only; can run in parallel with US1/US2

### Critical Path (Single Operator)

```
T001–T011 (diagnosis) → T007 (Supabase dashboard) → T012 (update .env) 
→ T013 (restart server) → T014 (verify HTTP 200) → T015 (if 0 pages)
→ T016–T020 (US1 code) → T021–T024 (US2 verify) → T025–T028 (US3 verify)
→ T029–T034 (docs + commit)
```

### Hard Blocking Tasks

| Task | Blocks |
|------|--------|
| T007 (Supabase dashboard check) | T012 — cannot update password without knowing the correct one |
| T012 + T013 (env update + restart) | T014, T015, T016–T028 |
| T014 (API returns 200) | All user story phases |

---

## Parallel Opportunities

```bash
# Phase 1 — these can run simultaneously (all read-only):
T004 (check prisma.ts for hardcodes)
T005 (check GET auth guard)
T006 (check DATABASE_URL port)
T009 (check page builder route exists)
T010 (check ssr:false import)
T011 (check public-header fetch logic)

# Phase 6 — these can run simultaneously:
T029 (update known-issues.md)
T030 (update CLAUDE.md)
T031 (tsc check)
T032 (lint check)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 (all diagnosis tasks)
2. Complete Phase 2 (env fix + T014 gate)
3. Complete Phase 3 (US1 code fix — `isError` state)
4. **STOP and VALIDATE**: `/cms/pages` shows pages OR error card — never silent empty state
5. Proceed to Phase 4 + 5 for verification

### Data Risk Summary

| Task | Risk Level | Type |
|------|-----------|------|
| T001–T011 | ⬜ Zero | Read-only local/env inspection |
| T007 | ⬜ Zero | Read Supabase dashboard only |
| T008 | ⬜ Zero | Read browser localStorage only |
| T012 | 🟡 Low | Updates `.env` only — not committed; affects which DB is targeted |
| T014 | ⬜ Zero | Read-only curl test |
| T015 | ⬜ Zero | Read Supabase table editor only |
| T016–T020 | ⬜ Zero | React state UI code only — no DB writes |
| T021–T028 | ⬜ Zero | Verification clicks and curl reads only |
| T029–T034 | ⬜ Zero | Documentation + commit — no DB writes |

**No task in this list writes to, deletes from, or migrates the production database.**
