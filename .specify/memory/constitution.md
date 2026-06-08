<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned) → 1.0.0
Type: Initial ratification — MAJOR (first formal version; all content new)

Constitution changes:
  Added sections:
    - I.  Production Safety First
    - II. Secret Handling and Credential Discipline
    - III. Auth and Authorization on Mutating Endpoints
    - IV. Data and Schema Safety
    - V.  Architectural Integrity and Documentation
    - VI. Code Quality and Build Discipline
    - VII. Content and State Persistence
    - VIII. Dependency and Scope Discipline
  - Operational Constraints (Section 2)
  - Development Workflow (Section 3)
  - Governance

Templates updated:
  ✅ .specify/memory/constitution.md  — this file
  ✅ .specify/templates/plan-template.md — Constitution Check gates updated
  ⚠  .specify/templates/spec-template.md — no change needed; security/auth assumptions
     should be added manually when writing specs for auth-touching features
  ⚠  .specify/templates/tasks-template.md — Foundational phase examples updated
     in plan-template; tasks-template needs no structural change

Deferred items:
  - RATIFICATION_DATE: set to today (2026-03-29, first formal ratification)
  - No test runner exists in project — TDD clause deferred until test infrastructure added
  - OQ-009 (portal auth model) unresolved — portal-specific auth principles deferred
  - Supabase plan unknown — connection limit specifics marked as TODO in principle IV
-->

# Sinai Institute Platform Constitution

## Core Principles

### I. Production Safety First (NON-NEGOTIABLE)

No new feature work, refactor, schema change, or deployment MAY begin while
any Critical-severity issue from `docs/known-issues.md` remains unresolved.
This is an absolute gate, not a judgment call.

**Rules:**
- The current 5 critical issues (KI-001 through KI-005) MUST be resolved before
  any new functionality is added to the codebase.
- Any change that affects a production credential, a deployed secret, or the
  `lib/prisma.ts` connection string MUST rotate the affected credential in the
  Vercel dashboard before or simultaneously with the code change.
- Every pull request or commit set that touches a security-sensitive file
  (`lib/auth.ts`, `lib/prisma.ts`, `middleware.ts`, `vercel.json`, any `.env*`)
  MUST include an explicit security impact statement in the commit message.
- Live production behavior MUST be verified (via `vercel logs`, Supabase dashboard,
  or browser test) before and after any risky change. "Risky" means: schema change,
  auth change, deployment config change, or secret rotation.

**Rationale**: The codebase has 4 active Critical security issues including an
unauthenticated XSS write endpoint, a forgeable session secret, and a DB password
in source. Building features before closing these risks compounds the attack surface
with every line of new code.

---

### II. Secret Handling and Credential Discipline (NON-NEGOTIABLE)

No secret, credential, connection string, API key, or auth token MAY appear in
any committed file. Production secrets live exclusively in the Vercel dashboard
Environment Variables.

**Rules:**
- The `vercel.json` file MUST NOT contain an `"env"` block. All environment
  variables are set in the Vercel dashboard → Project Settings → Environment
  Variables and propagate automatically on next deploy.
- `lib/prisma.ts` MUST NOT contain a hardcoded connection string. The production
  Prisma client MUST read from `process.env.DATABASE_URL` exactly like all other
  environments.
- `.env`, `.env.production`, `.env.production.local`, `.env.vercel.check` MUST be
  listed in `.gitignore`. These files MUST NOT be committed under any circumstances.
- When a credential is discovered in git history, rotation is mandatory and
  immediate. Redacting from history is secondary and MUST use `git filter-repo`,
  not `git filter-branch`.
- Credential rotation requires: (1) rotate in external service dashboard,
  (2) update Vercel dashboard env var, (3) verify app works, (4) update any
  code reference (e.g., `lib/prisma.ts` hardcode), (5) deploy with `vercel --prod`.
- Git remote URLs MUST NOT contain tokens (e.g., `https://<TOKEN>@github.com/...`).
  Use SSH or token-less HTTPS.

**Rationale**: Multiple production credentials are currently in git history.
History is permanent. Rotation is the only remedy; discipline prevents recurrence.

---

### III. Auth and Authorization on Mutating Endpoints (NON-NEGOTIABLE)

Every API route that writes, updates, or deletes data MUST verify a valid server
session before executing. Unauthenticated writes are a security violation.

**Rules:**
- Every `POST`, `PUT`, `PATCH`, `DELETE` handler in `app/api/*/route.ts` MUST
  call `const session = await getServerSession(authOptions)` as its first
  substantive action and return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`
  if `session` is null.
- `GET` endpoints that return sensitive or admin-only data MUST also check session.
  Public read endpoints (e.g., `/api/departments`, `/api/schedules`) are exempt.
- The three currently-open write endpoints — `POST /api/upload-image`,
  `POST /api/pages`, `PATCH /api/pages` — MUST be secured before any other
  API work proceeds.
- Middleware (`middleware.ts`) MUST be expanded before portal auth work begins.
  Current matcher (`/cms/:path*`, `/login`) is insufficient for a multi-portal app.
- `lib/auth.ts` MUST NOT contain hardcoded credential bypasses. DB-backed
  bcrypt authentication MUST be enabled before any portal goes live with real data.
- Role checks (`User.role`) MUST be enforced in code — not just stored in the DB
  — before multi-user or role-differentiated access is implemented.

**Rationale**: `/api/pages POST` currently allows any internet user to inject
arbitrary JavaScript into public-facing CMS pages (persistent XSS). This is a
critical vulnerability and the pattern MUST not be repeated.

---

### IV. Data and Schema Safety (NON-NEGOTIABLE)

No schema change, seed operation, or migration command MAY target the production
database without an explicit, manual confirmation step and a prior backup.

**Rules:**
- Before ANY `prisma db push` or `npx prisma migrate deploy`: take a Supabase
  manual backup (Supabase dashboard → Database → Backups → Download).
- Run `prisma db pull` before any schema work and diff the result against the
  local `schema.prisma`. Changes that exist in production but not in the local
  schema MUST be reconciled before pushing.
- `npm run prisma:seed` (`prisma/seed.ts`) MUST NOT run against production. The
  seed script runs `deleteMany()` on critical tables. It MUST only execute when
  `DATABASE_URL` explicitly points to a non-production database.
  Until a dev database exists, `prisma:seed` is FORBIDDEN.
- `prisma migrate reset` is FORBIDDEN on any database that contains real data.
- All writes to the database MUST go through the Prisma client in `app/api/*/route.ts`.
  No Supabase SDK, no raw SQL, no direct DB access from page components.
- Multi-step writes that must succeed or fail together MUST use `prisma.$transaction()`.
  Non-atomic `deleteMany()` + `createMany()` sequences (currently in PageBlock save)
  are a bug, not a pattern.
- The production Prisma client MUST use port 6543 (`pgbouncer=true&connection_limit=1`)
  once the hardcoded connection string is removed. Session mode (port 5432) is
  acceptable only for schema migration operations (`prisma db push`).
- `prisma/dev.db` MUST NOT be committed. Add `prisma/*.db` to `.gitignore`.
  Inspect the file for PII before removing.

**Rationale**: `prisma db push` is irreversible — it can silently drop columns.
The seed script destroys production data. The hardcoded connection string prevents
credential rotation. These are existential risks to live data.

---

### V. Architectural Integrity and Documentation

All architectural changes, security posture changes, and deployment changes MUST
be reflected in the `docs/` directory before or simultaneously with the code change.

**Rules:**
- No new route, model, API endpoint, or authentication change may be merged
  without updating the appropriate `docs/` file:
  - New route → `docs/current-architecture.md` + `docs/route-inventory.md`
  - New Prisma model or field → `docs/domain-model.md` + `docs/database-and-prisma-audit.md`
  - New API endpoint → `docs/feature-inventory.md` (API table)
  - Bug fixed → `docs/known-issues.md` (mark resolved with date)
  - Architecture decision → new `docs/adrs/adr-00N-*.md`
  - Open question answered → `docs/open-questions.md` (mark resolved)
  - Deployment changed → `docs/deployment-vercel.md`
- `CLAUDE.md` MUST remain the accurate single-source orientation document for
  new AI sessions. Update it when critical code realities change.
- No broad refactors (renaming modules, restructuring `app/`, changing middleware
  behavior, changing Prisma client init) may proceed without:
  1. A written plan reviewed against this constitution
  2. The relevant audit docs updated to describe the new intended state
  3. A verified backup of production data

**Rationale**: The audit exposed severe drift between code reality and documentation.
Without discipline here, future sessions start from a false foundation.

---

### VI. Code Quality and Build Discipline

TypeScript and ESLint errors MUST be resolved before features can be considered
complete. Suppression of build-time checks is a temporary escape hatch, not a
permanent practice.

**Rules:**
- `next.config.ts` `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` MUST
  be removed as part of Phase 5 stabilization. New feature work MUST NOT introduce
  new TypeScript type errors (`any` casts require explicit justification in a comment).
- Before every `vercel --prod`: run `npx tsc --noEmit` and `npm run lint` locally.
  If errors exist, either fix them or document them as pre-existing in the commit message.
- All new `app/api/*/route.ts` files MUST have explicit return types.
- Unused dependencies MUST be removed before features in their domain are built
  (e.g., confirm `@tanstack/react-query` usage before writing data-fetching code
  that duplicates its role).
- No additional `console.log` statements may be added to production code.
  Existing debug logs in `app/(public)/[slug]/page.tsx` (15+ statements) MUST be
  removed before the slug route is considered production-ready.

**Rationale**: TypeScript suppression masks an unknown number of bugs currently
deployed to production. Adding new features on top of this without baseline
type correctness compounds the debt non-linearly.

---

### VII. Content and State Persistence

Content that must be consistent across users and devices MUST be stored in the
database. `localStorage` is permitted only for per-user UI preferences (theme,
sidebar state, language selection) with no cross-user implications.

**Rules:**
- No CMS-managed content (slides, links, stats, navigation items, specializations)
  may use `localStorage` as its primary store. Each MUST migrate to the `Setting`
  table (or a dedicated model) with a `GET` + `PUT /api/settings/:key` pattern.
- All user-uploaded media MUST go through an upload API route (`/api/upload`,
  `/api/upload-image`, or `/api/upload-media`) which stores to Cloudinary.
  Writing to `public/` at runtime is FORBIDDEN — Vercel's filesystem is ephemeral.
- The `Setting` model exists for this purpose. Use it before adding any new Prisma
  model for simple key/value configuration.

**Rationale**: Homepage configuration is currently browser-local — changes made
in the CMS on one machine are invisible on all others. This is a functional bug
that makes the CMS unfit for purpose.

---

### VIII. Dependency and Scope Discipline

No new dependency may be added without confirming the need is not already served
by an existing installed package. Portal work requires an owner decision before
any code is written.

**Rules:**
- Verify existing packages before installing new ones: confirm whether
  `@tanstack/react-query`, `next-intl`, `better-sqlite3` are used before
  installing alternatives.
- Portal authentication (`/student/*`, `/faculty/*`, etc.) MUST NOT be built
  until OQ-009 is answered: are portals intended for live data, or demo/display?
  This decision gates all portal model and auth work.
- No `Student`, `Faculty`, `Exam`, or `Course` Prisma model may be added without
  a Spec Kit spec that is reviewed against this constitution.
- LMS work requires OQ-012 to be resolved (custom build vs. third-party integration).
- The multi-portal monolith architecture (ADR-001) is accepted. No micro-service
  split or separate Next.js application should be proposed without explicit
  performance or isolation evidence that the monolith cannot satisfy.

**Rationale**: Scope creep in portal work (adding Student, Faculty models without
a backing auth system) will create a larger version of the current hardcoded-data
problem. Decisions first; code second.

---

## Operational Constraints

### Environment Separation

| Concern | Rule |
|---------|------|
| Dev vs. prod database | Local dev MUST use a separate Supabase project or a `.env.local` override pointing to a dev database. Connecting local dev to the production Supabase database is FORBIDDEN once a dev database is available. |
| Deployment config | `vercel.json` MUST contain no `"env"` block. Build/output configuration only. |
| Node version | Production runs Node 24.x. Local dev SHOULD match. Add `.node-version: 24` to repo root. Vercel project settings SHOULD pin to a specific major version. |
| Preview environments | Before enabling Vercel Git integration, add `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, all `CLOUDINARY_*` vars to the Preview environment in Vercel dashboard. |

### Deployment Gate Checklist

Every `vercel --prod` MUST pass these before execution:

- [ ] `npx tsc --noEmit` — zero new errors introduced by this change
- [ ] `npm run lint` — no new unresolved lint violations
- [ ] `NEXTAUTH_URL` is set to `https://test.sinaiinstitute.com` in Vercel dashboard
- [ ] `NEXTAUTH_SECRET` is a strong random value set only in Vercel dashboard
- [ ] `vercel.json` contains no `"env"` block
- [ ] No plaintext credential in any committed file in this changeset
- [ ] If schema changed: `prisma db pull` diff reviewed + Supabase backup taken
- [ ] Relevant `docs/` file updated to reflect the change

### Brownfield Stabilization Sequence

Feature work in the following areas is BLOCKED until the preceding phase is
complete. This is a one-time sequencing constraint that expires once all phases
are done.

```
Phase 0 (Security Triage) → Phase 1 (Bug Fixes) → Phase 2 (DB Verification)
    ↓ Only after Phase 0+1+2 complete:
Phase 3 (localStorage Migration) + Phase 4 (Routing) + Phase 5 (Build Quality)
    ↓ Only after Phase 5 complete:
Phase 6 (Auth + Portal Architecture) +  Spec Kit feature work
```

Reference: `docs/bootstrap-next-steps.md` for phase task lists.

---

## Development Workflow

### Pre-Code Checklist (Every Change)

Before writing any code, verify:

1. Read `CLAUDE.md` — confirm understanding of the 15 critical code realities
2. Read the relevant `docs/` section for the area being touched
3. Confirm: where does data go? (DB via Prisma API route / Cloudinary / localStorage — only for UI prefs)
4. Confirm: does this write endpoint have a session check?
5. Confirm: no secret, credential, or connection string is being added to any file

### Spec Kit Usage

All non-trivial feature work (any change touching > 2 files or adding a new API
route or Prisma model) MUST follow the Spec Kit workflow:

```
@speckit-specify → @speckit-plan → @speckit-tasks → @speckit-implement
```

The Constitution Check in `plan-template.md` MUST be completed before Phase 1
research in every plan. A plan with Constitution Check violations MUST NOT proceed
to implementation without documented justification in the Complexity Tracking table.

### Commit Discipline

- Commit after each logical task — do not accumulate unrelated changes
- Commit messages for security-touching files MUST include: `[SECURITY]` prefix
  and a one-line impact statement
- After Phase 5 complete: no commit may introduce new TypeScript errors
- Tag each phase completion: `git tag phase-N-complete`

---

## Governance

This constitution supersedes all prior conventions, chat-established patterns, and
informal decisions (including those documented in `docs/bootstrap-input/old-ai-conversations-summary.md`).
Where a historical decision contradicts this constitution, this constitution wins.

When this constitution conflicts with an ADR in `docs/adrs/`, the constitution
wins unless the ADR is explicitly ratified to override a named principle, which
requires updating both the ADR and this document.

**Amendment procedure**:
1. Identify the principle(s) to amend and the reason.
2. Draft the amendment with rationale.
3. Update this file — increment version per semantic versioning rules.
4. Update any templates in `.specify/templates/` that reference the changed principle.
5. Commit: `docs: amend constitution to vX.Y.Z — [brief description]`
6. Update `CLAUDE.md` if the amendment changes any "critical code reality."

**Versioning policy**:
- MAJOR: Principle removed, renamed, or fundamentally redefined.
- MINOR: New principle or section added; material expansion of existing principle.
- PATCH: Clarifications, wording, non-semantic refinements, date updates.

**Compliance review**: Every Spec Kit spec and plan MUST include a Constitution
Check section. Constitution Check violations that are accepted MUST be recorded
in the plan's Complexity Tracking table with explicit justification.

**Runtime guidance**: `CLAUDE.md` is the fast-access orientation for AI sessions.
`docs/known-issues.md`, `docs/contradictions-and-gaps.md`, and `docs/open-questions.md`
are the living operational records. Keep them current.

**Version**: 1.0.0 | **Ratified**: 2026-03-29 | **Last Amended**: 2026-03-29
