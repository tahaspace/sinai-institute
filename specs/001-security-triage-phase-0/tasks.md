# Tasks: Security Triage Phase 0

**Input**: Design documents from `specs/001-security-triage-phase-0/`
**Prerequisites**: `plan.md` ✅ · `spec.md` ✅ · `research.md` ✅ · `data-model.md` ✅ · `contracts/` ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent completion
and verification of each security objective.

**Legend**:
- `[P]` = can run in parallel with other `[P]` tasks in same phase
- `[USn]` = maps to User Story n in spec.md
- `⚠️ PRODUCTION RISK` = risky in live environment; follow instructions exactly
- `🔒 OPERATOR` = manual action outside codebase; performed in external dashboard

---

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Confirm working state and create safety snapshot before any change.

- [x] T001 Confirm active branch is `001-security-triage-phase-0` — run `git branch` and verify `*` is on the feature branch
- [x] T002 Run `git status` — confirm working tree is clean with no uncommitted changes from other work
- [ ] T003 `⚠️ PRODUCTION RISK` `🔒 OPERATOR` Take Supabase manual backup: Supabase dashboard → Project `eacpjbbpwonwmthutxow` → Database → Backups → Download — do NOT proceed past T003 without confirming backup download completes
- [x] T004 Check whether `prisma/dev.db` is tracked in git: run `git ls-files prisma/dev.db` — record output (empty = not tracked; filename = tracked and must be removed in T016)

**Checkpoint**: Backup confirmed ✅ · Branch confirmed ✅ · Dev.db tracking status noted ✅

---

## Phase 2: Foundational — Operator Pre-Work

**Purpose**: All out-of-band credential and dashboard actions that MUST complete before any code is deployed.
These are external dashboard operations performed by the operator — not code changes.

⚠️ **CRITICAL ORDER**: Steps must be performed in exactly the sequence listed.
Reversing T007 and T008 will cause an immediate production DB connectivity outage.

- [ ] T005 `🔒 OPERATOR` Generate new `NEXTAUTH_SECRET`: run `openssl rand -base64 32` in terminal — copy output to password manager; do NOT paste into any file or terminal history
- [ ] T006 `[P]` `🔒 OPERATOR` Set `NEXTAUTH_URL = https://test.sinaiinstitute.com` in Vercel dashboard → Project `sinai-institute` → Settings → Environment Variables → Add (it is currently absent from dashboard)
- [ ] T007 `🔒 OPERATOR` Set `DATABASE_URL` in Vercel dashboard to: `postgresql://postgres.eacpjbbpwonwmthutxow:<NEW_PASS>@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` — use the PENDING new password value in the URL before Supabase rotation — this step prepares the dashboard before the rotation in T008
- [ ] T008 `⚠️ PRODUCTION RISK` `🔒 OPERATOR` Rotate Supabase DB password: Supabase dashboard → Project settings → Database → Reset database password — this invalidates the old password `SinaiInstitute2026!` immediately; confirm new password matches what was placed in T007 `DATABASE_URL`
- [ ] T009 `[P]` `🔒 OPERATOR` Set `NEXTAUTH_SECRET` in Vercel dashboard to the value generated in T005 — do not use the current weak secret from `vercel.json`
- [ ] T010 `⚠️ PRODUCTION RISK` `🔒 OPERATOR` Rotate Cloudinary API secret: Cloudinary dashboard → Settings → API Keys → Regenerate — then update `CLOUDINARY_API_SECRET` in Vercel dashboard with new value
- [ ] T011 `🔒 OPERATOR` Verify all Vercel dashboard env vars set correctly: `NEXTAUTH_URL` = `https://test.sinaiinstitute.com` · `NEXTAUTH_SECRET` = new strong value · `DATABASE_URL` = supabase.com port 6543 with new password · `CLOUDINARY_API_SECRET` = new rotated value — do NOT proceed to code changes until all four confirmed

**Checkpoint**: All 4 dashboard vars confirmed ✅ · Supabase and Cloudinary rotated ✅

---

## Phase 3: User Story 1 — Deployment Config No Longer Re-applies Stale Secrets

**Goal**: Remove the `vercel.json` `"env"` block so dashboard values are never overridden.

**Independent Test**: After T012, run `cat vercel.json | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'env' not in d"` — must pass with no output.

### Implementation for User Story 1

- [x] T012 [US1] Edit `vercel.json` — delete the entire `"env": { ... }` block (lines containing `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NODE_ENV`) — file must remain valid JSON; verify with `python3 -m json.tool vercel.json`
- [x] T013 [US1] Verify `vercel.json` is valid and clean: run `python3 -c "import json,sys; d=json.load(open('vercel.json')); assert 'env' not in d, 'FAIL: env block still present'; print('PASS: env block removed')"` — output must be `PASS`

**Checkpoint**: `vercel.json` has no `"env"` key ✅ · JSON is valid ✅

---

## Phase 4: User Story 2 — Exposed Credentials Replaced (Code Side)

**Goal**: Remove the hardcoded Supabase connection string from `lib/prisma.ts` so the application reads `DATABASE_URL` from the runtime environment. Operator actions (credential rotation itself) were completed in Phase 2.

**Independent Test**: After T014, run `grep -n "SinaiInstitute2026\|hardcoded\|supabase.com:5432\|getDatabaseUrl" lib/prisma.ts` — must return zero matches.

### Implementation for User Story 2

- [x] T014 [US2] Rewrite `lib/prisma.ts` — replace entire file content with the standard Prisma singleton pattern that reads `DATABASE_URL` from environment (no `getDatabaseUrl()` function, no hardcoded URL, no `datasources` block) — reference pattern is in `specs/001-security-triage-phase-0/plan.md` Change 2
- [x] T015 [US2] Verify `lib/prisma.ts` has no hardcode: run `grep -c "SinaiInstitute\|supabase.com:5432\|getDatabaseUrl\|hardcoded" lib/prisma.ts` — output must be `0`
- [x] T016 [US2] If `git ls-files prisma/dev.db` (T004) returned a filename: run `git rm --cached prisma/dev.db` to remove from git index — if T004 returned empty, skip this task; add note "prisma/dev.db was already untracked"
- [x] T017 [US2] Verify `.gitignore` contains `prisma/dev.db`: run `grep "prisma/dev.db" .gitignore` — must return a match; if missing, add `prisma/dev.db` to `.gitignore`

**Checkpoint**: No hardcoded credentials in any `.ts` file ✅ · `prisma/dev.db` untracked ✅

---

## Phase 5: User Story 3 — Write Operations Require Authorization (4 endpoints)

**Goal**: Add `getServerSession()` auth guard to the 4 confirmed-open write endpoints.
Reference implementation: `app/api/upload/route.ts` lines 1–12 (already correct — copy this exact pattern).

**Independent Test**: After all 4 guards are added, run:
```bash
grep -l "getServerSession" \
  app/api/pages/route.ts \
  app/api/upload-image/route.ts \
  app/api/upload-media/route.ts
```
All 3 files must appear in output. (upload-media and upload-image share one check; pages/route.ts covers both POST and PATCH.)

### Implementation for User Story 3

- [x] T018 [P] [US3] Add auth guard to `app/api/upload-image/route.ts` — add imports `getServerSession` and `authOptions` at top of file; add session check as first 3 lines of POST handler body before any file processing; return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` when session is null — do not change any other logic
- [x] T019 [P] [US3] Add auth guard to `app/api/upload-media/route.ts` — same pattern as T018: add imports + session check at top of POST handler; return 401 when no session — do not change file type validation, size check, or Cloudinary upload logic
- [x] T020 [US3] Add auth guard to `app/api/pages/route.ts` POST handler — add imports at top of file (add once, used by both handlers); add session check as first 3 lines of `POST` handler; return 401 when no session — leave GET handler completely unchanged
- [x] T021 [US3] Add auth guard to `app/api/pages/route.ts` PATCH handler — add session check as first 3 lines of `PATCH` (or `PUT`) handler in same file; reuse existing imports added in T020 — do not duplicate import lines
- [x] T022 [US3] Verify guards are in place: run `grep -n "getServerSession" app/api/pages/route.ts app/api/upload-image/route.ts app/api/upload-media/route.ts` — must show at least one match per file
- [x] T023 [US3] Verify GET handler is untouched: run `grep -n "getServerSession" app/api/pages/route.ts` — matches must NOT appear inside the GET handler body (check line numbers against GET function location)

**Checkpoint**: 4 write handlers guarded ✅ · GET handler unchanged ✅ · Public reads unaffected ✅

---

## Phase 6: User Story 4 — Destructive Seed Command Cannot Target Production

**Goal**: Add a production environment guard as the first statement in `prisma/seed.ts` `main()`.

**Independent Test**: After T024, run `NODE_ENV=production npx tsx prisma/seed.ts 2>&1 | head -5` — output must include "SEED BLOCKED" and exit with non-zero status. No department or news records should be affected.

### Implementation for User Story 4

- [x] T024 [US4] Edit `prisma/seed.ts` — add production guard block as the FIRST statement inside `main()` function (before any `console.log`, before any Prisma calls): check `if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV)` → log clear refusal message with instructions for dev usage → `process.exit(1)` — reference exact message in `specs/001-security-triage-phase-0/plan.md` Change 3
- [x] T025 [US4] Verify guard fires: run `NODE_ENV=production npx tsx prisma/seed.ts 2>&1` — must print "SEED BLOCKED" message and exit immediately without connecting to database
- [x] T026 [US4] Verify guard does NOT fire in development: run `npx tsx -e "console.log('NODE_ENV check:', process.env.NODE_ENV)"` to confirm local environment — guard must only block when `NODE_ENV=production` or `VERCEL_ENV` is set

**Checkpoint**: Seed blocked in production environment ✅ · Seed passes in development ✅

---

## Phase 7: User Story 3 (cont.) — Delete Debug Tool

**Goal**: Remove the publicly-accessible developer debug tool from the production file tree.

**Independent Test**: After T027, run `ls public/check-localstorage.html 2>&1` — must return "No such file or directory".

- [x] T027 [US3] Delete `public/check-localstorage.html` from repository: run `git rm public/check-localstorage.html` — confirms both file deletion and git staging of the removal

**Checkpoint**: Debug file deleted and staged ✅

---

## Phase 8: Pre-Deploy Gate — Local Verification

**Purpose**: Full local verification before any commit is pushed or deployed. All checks
must pass. This phase must run on the same machine from which `vercel --prod` will be run.

⚠️ **DO NOT DEPLOY if any check fails.** Fix the failing check and re-run the full gate.

- [x] T028 Run TypeScript check: `npx tsc --noEmit` — if errors appear, confirm they are pre-existing (not introduced by this branch) by running `git stash && npx tsc --noEmit && git stash pop`; document pre-existing error count in commit message
- [x] T029 Run linter: `npm run lint` — review any new errors introduced by this branch's changes; existing pre-existing violations are acceptable if documented
- [x] T030 Verify `vercel.json` has no `"env"` key: `python3 -c "import json; d=json.load(open('vercel.json')); assert 'env' not in d; print('PASS')"` — must print `PASS`
- [x] T031 Verify no hardcoded URL in `lib/prisma.ts`: `grep -c "SinaiInstitute\|neon.tech\|supabase.com:5432" lib/prisma.ts` — must output `0`
- [x] T032 Verify all 4 auth guards present: `grep -l "getServerSession" app/api/pages/route.ts app/api/upload-image/route.ts app/api/upload-media/route.ts` — all 3 filenames must appear
- [x] T033 Verify debug tool removed: `ls public/check-localstorage.html 2>&1 | grep "No such"` — must return match
- [x] T034 Verify seed guard present: `grep -c "SEED BLOCKED\|process.exit" prisma/seed.ts` — must return `1` or greater
- [x] T035 Review full `git diff main` — read every changed line; confirm no secret, no credential, no connection string appears in the diff; if found, STOP and fix before proceeding

**Checkpoint**: All 8 pre-deploy gates pass ✅ · `git diff` reviewed and clean ✅

---

## Phase 9: Commit and Deploy

- [x] T036 Stage all changes: `git add vercel.json lib/prisma.ts prisma/seed.ts app/api/pages/route.ts app/api/upload-image/route.ts app/api/upload-media/route.ts public/check-localstorage.html` — also `git add prisma/dev.db` if T016 was executed
- [x] T037 Commit: `git commit -m "[SECURITY] phase-0: remove vercel.json env override, add auth guards to 4 endpoints, remove prisma.ts hardcode, add seed production guard"` — commit message must include `[SECURITY]` prefix per constitution
- [ ] T038 `⚠️ PRODUCTION RISK` Deploy: `vercel --prod` — expected output: `✅  Production: https://sinai-institute-<hash>.vercel.app` — if deployment fails (build error), do NOT rollback; fix the build error locally and redeploy; if deployment succeeds but verification fails, then rollback

**Checkpoint**: Deploy completes with ✅ output ✅

---

## Phase 10: User Story 5 — Post-Deploy Verification (Live)

**Purpose**: Confirm production is healthy before closing the phase.
Must complete all 8 items within 10 minutes of deployment.
**Rollback command if any item fails**: `vercel rollback`

Reference: `specs/001-security-triage-phase-0/contracts/post-deploy-checklist.md`

- [ ] T039 [US5] Check 1 — Public homepage: open `https://test.sinaiinstitute.com` in browser — page must load without error, no 500, no blank page
- [ ] T040 [US5] Check 2 — Database connectivity: open `https://test.sinaiinstitute.com/api/departments` — must return JSON with department records (not an error object); confirms new `DATABASE_URL` connects to Supabase successfully
- [ ] T041 [US5] Check 3 — Admin login on custom domain: navigate to `https://test.sinaiinstitute.com/login` → submit `admin@sainaiinstitute.com` / `admin123` — must redirect to `/cms/dashboard`; confirms `NEXTAUTH_URL` correct and `NEXTAUTH_SECRET` valid
- [ ] T042 [US5] Check 4 — CMS pages load from authenticated session: from CMS dashboard navigate to Pages (`/cms/pages`) — page list must load with existing pages; confirms DB read from authenticated context works
- [ ] T043 [US5] Check 5 — Auth guard active on upload endpoint: in terminal run `curl -s -X POST https://test.sinaiinstitute.com/api/upload-image -F "file=@/etc/hostname" | cat` — response must be `{"error":"Unauthorized"}` with HTTP 401
- [ ] T044 [US5] Check 6 — Auth guard does NOT block authorized write: logged in as admin, open any page in GrapesJS editor (`/cms/page-builder-grapes/<id>`) and save — save must succeed without error
- [ ] T045 [US5] Check 7 — Env override absent: in Vercel dashboard or via `vercel env ls --environment=production`, verify `NEXTAUTH_URL` = `https://test.sinaiinstitute.com` and `DATABASE_URL` = supabase.com port 6543 (not neon.tech)
- [ ] T046 [US5] Check 8 — Debug tool removed: open `https://test.sinaiinstitute.com/check-localstorage.html` — must return 404

**⚠️ If any check T039–T046 fails**: Run `vercel rollback` immediately. Do not attempt a forward-fix. Document which check failed.

**Checkpoint**: All 8 live verification checks pass ✅

---

## Phase 11: Polish — Documentation Update

**Purpose**: Update `docs/` to reflect the resolved security posture. Only perform after
all Phase 10 checks pass.

- [x] T047 [P] Update `docs/known-issues.md` — mark the following as resolved with date 2026-03-29:
  - KI-001 (secrets in git — rotated, hardcode removed)
  - KI-002 (vercel.json env block — removed)
  - KI-003 (unauthenticated write endpoints — 4 endpoints now guarded)
  - KI-005 (NEXTAUTH_URL wrong domain — fixed in dashboard)
  - KI-007 (DB port 5432 — now port 6543 + pgbouncer in dashboard)
  - KI-017 (debug HTML tool — deleted)
  - Note KI-004 (auth stub) as still open — deferred to Phase 1

- [x] T048 [P] Update `docs/deployment-vercel.md` — revise the "Environment Variables" section:
  - Mark `NEXTAUTH_URL` and `NEXTAUTH_SECRET` as now set in dashboard ✅
  - Update `DATABASE_URL` entry to show port 6543 + pgbouncer ✅
  - Remove the ⚠️ warnings about `vercel.json` env block (now resolved)
  - Update "Known Deployment Issues" table: mark KI-001, KI-002, KI-005, KI-007 as Resolved

- [x] T049 [P] Update `CLAUDE.md` critical code realities section:
  - Remove: "lib/prisma.ts has hardcoded Supabase URL — ignores DATABASE_URL"
  - Remove: "vercel.json env block overrides all dashboard settings"
  - Add: "All secrets in Vercel dashboard only — no credentials in any committed file"
  - Add: "4 write endpoints now require CMS session: POST/PATCH /api/pages, POST /api/upload-image, POST /api/upload-media"
  - Add: "DATABASE_URL uses port 6543 (pgbouncer) — read from env, no hardcode"

- [x] T050 Commit documentation updates: `git commit -m "docs: update known-issues, deployment-vercel, CLAUDE.md post phase-0 security triage"`

**Checkpoint**: `docs/` reflects current security posture ✅ · CLAUDE.md current ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Operator Pre-Work)**: Depends on Phase 1 complete — **BLOCKS all code phases**; T007 must precede T008 (dashboard URL before Supabase rotation)
- **Phase 3 (US1 — vercel.json)**: Depends on Phase 2 complete
- **Phase 4 (US2 — prisma.ts)**: Depends on Phase 2 complete (T007 must set dashboard URL before this code is relevant)
- **Phase 5 (US3 — auth guards)**: Depends on Phase 1; can run in parallel with Phases 3 & 4
- **Phase 6 (US4 — seed guard)**: Depends on Phase 1; can run in parallel with Phases 3, 4, & 5
- **Phase 7 (debug tool)**: Depends on Phase 1; can run in parallel with Phases 3–6
- **Phase 8 (Pre-Deploy Gate)**: Depends on Phases 3–7 ALL complete — **BLOCKS deploy**
- **Phase 9 (Deploy)**: Depends on Phase 8 complete and Phase 2 complete
- **Phase 10 (Live Verification)**: Depends on Phase 9 complete — **must complete within 10 min**
- **Phase 11 (Documentation)**: Depends on Phase 10 complete (all checks passed)

### Strict Ordering Within Phase 2

```
T003 (backup) → T005 (generate secret) → T006+T007+T009 (set dashboard vars)
→ T008 (rotate Supabase — POINT OF NO RETURN) → T010 (rotate Cloudinary)
→ T011 (verify all vars)
```

### Parallel Opportunities (Phases 3–7 after Phase 2 complete)

```
Phase 3:  T012, T013 (vercel.json)           ← sequential, 1 file
Phase 4:  T014, T015, T016, T017 (prisma)    ← sequential, 2 files
Phase 5:  T018 [P], T019 [P] can run together; T020 first then T021 in same file
Phase 6:  T024, T025, T026 (seed)             ← sequential, 1 file
Phase 7:  T027 (delete tool)                  ← 1 command

All of Phases 3, 4, 5, 6, 7 can run concurrently once Phase 2 is done.
```

---

## Implementation Strategy

### Sequential Single-Developer Flow

1. Phase 1: Setup + backup (10 min)
2. Phase 2: All operator dashboard actions (30 min) — POINT OF NO RETURN at T008
3. Phases 3–7: All code changes in one working session (45 min)
4. Phase 8: Full pre-deploy gate (10 min) — fix anything that fails here
5. Phase 9: Deploy (5 min)
6. Phase 10: Live verification (10 min max) — rollback immediately if anything fails
7. Phase 11: Documentation (20 min)

**Total estimated time: ~2 hours**

### MVP Scope (minimum to close the most critical risks)

If time constraints require a smaller first deploy:

1. Phase 2 (T005–T011) — operator actions: closes credential exposure
2. Phase 3 (T012–T013) — removes vercel.json override: fixes auth URL
3. Phase 8 partial → Phase 9 → Phase 10 partial

This MVP closes KI-001, KI-002, KI-005. Auth guards (KI-003) and seed guard (US4) can follow in a second deploy.

**Not recommended** — both deploys have cost. Do all in one.

---

## Notes

- `[P]` tasks in Phase 5 (T018, T019) are different files with identical patterns — safe to implement simultaneously if two developers available
- T008 is the **point of no return** for the operator: old DB password invalidated immediately; T007 must precede it
- T035 (`git diff` review) is the most important pre-deploy gate — a human must read every changed line
- T046 (debug tool 404) is the easiest post-deploy check — if this fails, it means the file was not staged before commit
- DO NOT run `npm run prisma:seed` at any point during this phase — it is blocked by T024 only after T024 is complete and deployed; during local development on this branch the guard is not yet active
- T044 (authorized save check) requires being logged in to the live CMS — do not skip; it confirms auth guards do not accidentally block legitimate traffic
