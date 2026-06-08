# Bootstrap Next Steps

**Purpose**: Prioritized action list for stabilizing this brownfield project before feature work.  
**Last updated**: 2026-03-28 — consolidated from full audit including live Vercel API evidence  
**Branch for this work**: `speckit-bootstrap`  
**Rule**: Complete Phase 0 before touching any other phase.

---

## Phase 0 — Security Triage (Non-Negotiable, Do First)

Credentials are in git history. Rotation is mandatory regardless of other work.

| # | Action | Evidence | Effort |
|---|--------|---------|--------|
| 0.1 | Rotate Supabase DB password — set NEW value in Vercel dashboard only | `lib/prisma.ts:7`, `.env` | 10 min |
| 0.2 | Update `lib/prisma.ts` with new password after rotation | `lib/prisma.ts:7` | 5 min |
| 0.3 | Remove entire `"env": {}` block from `vercel.json` | `vercel.json` (KI-002) | 2 min |
| 0.4 | Generate new `NEXTAUTH_SECRET`: `openssl rand -base64 32` → Vercel dashboard | `vercel.json` (KI-001) | 5 min |
| 0.5 | Set `NEXTAUTH_URL = https://test.sinaiinstitute.com` in Vercel dashboard | Vercel API confirms absent (KI-005) | 2 min |
| 0.6 | Rotate Cloudinary API secret → Vercel dashboard | `.env` (KI-001) | 10 min |
| 0.7 | `git remote set-url origin https://github.com/tahaspace/sinai-institute.git` | KI-015 | 1 min |
| 0.8 | Add `getServerSession()` check to `POST /api/upload-image` | `app/api/upload-image/route.ts` (KI-003) | 20 min |
| 0.9 | Add `getServerSession()` check to `POST /api/pages` and `PATCH /api/pages` | `app/api/pages/route.ts` (KI-003) | 20 min |
| 0.10 | Delete `public/check-localstorage.html` | (KI-017) | 1 min |
| 0.11 | Deploy Phase 0 changes: `vercel --prod` | — | 5 min |

---

## Phase 1 — Immediate Bug Fixes

Confirmed broken by code inspection. All are blocking real use of the system.

| # | Action | Evidence | Effort |
|---|--------|---------|--------|
| 1.1 | Fix `/api/results`: `published`→`isVisible`, `publishedAt`→`publishDate`, remove `title` or add to schema, fix `orderBy` in GET | `app/api/results/route.ts` (KI-006) | 1–2 hr |
| 1.2 | Fix `/api/news` GET filter: `published`→`isPublished` | `app/api/news/route.ts` (KI-024) | 15 min |
| 1.3 | Enable DB authentication in `lib/auth.ts` — remove hardcoded bypass, uncomment DB path, fix MySQL→PostgreSQL reference, test bcrypt | `lib/auth.ts:30–38` (KI-004) | 2–3 hr |
| 1.4 | Inspect `prisma/dev.db` for PII; if present: `git rm --cached`, add `prisma/*.db` to `.gitignore` | `prisma/dev.db` (KI-011) | 20 min |
| 1.5 | Delete stale migration scripts: `migrate-data.ts`, `migrate-simple.ts`, `neon-data-export.js`, `sync-to-supabase.js` | KI-022 | 5 min |

---

## Phase 2 — Production Database Verification

Do before any schema-touching feature work.

| # | Action | Cmd | Effort |
|---|--------|-----|--------|
| 2.1 | Take Supabase manual backup | Supabase dashboard → Database → Backups | 5 min |
| 2.2 | Pull current production schema: `prisma db pull` — diff against `schema.prisma` | OQ-001 | 20 min |
| 2.3 | If GrapesJS tables missing: `prisma db push` | OQ-001 | 10 min |
| 2.4 | Change Vercel Node version from 24.x to 20.x in project settings | KI-018 | 2 min |
| 2.5 | Fix DB connection: change port 5432→6543, add `?pgbouncer=true&connection_limit=1`, use env var instead of hardcode | `lib/prisma.ts` (KI-007) | 30 min |
| 2.6 | Check Supabase connection count | Supabase dashboard → Database → Connection Pooling | 5 min |

---

## Phase 3 — Content Data Migration (localStorage → DB)

Required before CMS homepage is usable across devices.

| # | Task | Approach | Effort |
|---|------|----------|--------|
| 3.1 | Social media links → `Setting` table | Key: `social_links`, value: JSON | 2 hr |
| 3.2 | Hero Slider config → `Setting` table | Key: `hero_slides`, value: JSON | 2 hr |
| 3.3 | News ticker config → `Setting` table | Key: `ticker_news`, value: JSON | 1 hr |
| 3.4 | Homepage stats → `Setting` table | Key: `homepage_stats`, value: JSON | 1 hr |
| 3.5 | Specialization cards → `Setting` table | Key: `homepage_specializations`, value: JSON | 2 hr |

Each task: add `GET /api/settings/:key` + `PUT /api/settings/:key` (session-guarded); update CMS tab; update public page fetch.

---

## Phase 4 — Routing Reconciliation

| # | Action | Decision required | Effort |
|---|--------|------------------|--------|
| 4.1 | Answer OQ-011: what happens to `/about`, `/admission`, `/contact`, `/departments`, `/results`? | Owner | — |
| 4.2 | Implement chosen strategy (redirects, hardcoded pages, or delete dirs + use `/pages/[slug]`) | Depends on 4.1 | 2–8 hr |
| 4.3 | Clarify `/cms/pages-new/` vs `/cms/pages/` — read file, resolve or remove (OQ-006) | — | 30 min |

---

## Phase 5 — Build Quality

| # | Action | Evidence | Effort |
|---|--------|---------|--------|
| 5.1 | `npx tsc --noEmit` — count errors | KI-013 | 20 min |
| 5.2 | Fix TypeScript errors; remove `ignoreBuildErrors: true` from `next.config.ts` | KI-013 | 4–12 hr |
| 5.3 | `npm run lint` — fix violations; remove `ignoreDuringBuilds: true` | KI-013 | 2–4 hr |
| 5.4 | Prune unused deps: confirm `@tanstack/react-query` (OQ-005), `next-intl`, `better-sqlite3` | OQ-005 | 1 hr |
| 5.5 | Add Sentry: `npx @sentry/wizard@latest -i nextjs` | KI-014 | 30 min |
| 5.6 | Rewrite `README.md` | KI-021 | 20 min |
| 5.7 | Tag current state: `git tag v0.1.0-audit` | — | 2 min |

---

## Phase 6 — Auth and Portal Architecture

Requires owner decisions (OQ-009, OQ-010) before starting.

| # | Action | Decision | Effort |
|---|--------|---------|--------|
| 6.1 | Answer OQ-009: portals — demo vs live vs CMS-auth | Owner | — |
| 6.2 | Answer OQ-010: RBAC model | Owner | — |
| 6.3 | Implement portal strategy from 6.1 | — | Varies widely |
| 6.4 | Add password reset flow | — | 3 hr |
| 6.5 | Enforce `User.role` in middleware | OQ-010 | 2 hr |

---

## Phase 7 — Feature Work (Spec Kit Entry Point)

**Only start after Phases 0–2 are complete.** Use `@speckit-specify` → `@speckit-plan` → `@speckit-tasks` → `@speckit-implement` for each.

| Feature | Blockers | OQ |
|---------|----------|----|
| Results management fix | Phase 1.1 | — |
| Student portal live data | No Student model; no auth | OQ-009, OQ-010 |
| Faculty portal live data | No Faculty model; no auth | OQ-009, OQ-010 |
| Homepage localStorage → DB migration | Phase 3 | OQ-016 |
| Named public routes | — | OQ-011 |
| Email notifications | No mailer | OQ-013 |
| Language switch (AR/EN) | `next-intl` not wired | — |
| LMS | No DB models | OQ-012 |
| Error monitoring | Phase 5.5 | — |
| CI/CD pipeline | Phase 5 first + add preview env vars (NEXTAUTH, Cloudinary) to Vercel dashboard | OQ-015 |
| Domain cutover | DNS planning | OQ-014 |

---

## Recommended Reading Order for New AI Sessions

1. [`CLAUDE.md`](../CLAUDE.md) — always first
2. [`docs/known-issues.md`](./known-issues.md) — confirmed bugs
3. [`docs/contradictions-and-gaps.md`](./contradictions-and-gaps.md) — where docs differ from code
4. [`docs/current-architecture.md`](./current-architecture.md) — system reality
5. [`docs/domain-model.md`](./domain-model.md) — schema source of truth
6. [`docs/feature-inventory.md`](./feature-inventory.md) — feature status
7. [`docs/open-questions.md`](./open-questions.md) — pending decisions
8. [`docs/deployment-vercel.md`](./deployment-vercel.md) — deploy runbook

---

## Spec Kit Quick Reference

```bash
@speckit-specify    → create docs/spec.md for a new feature
@speckit-plan       → create docs/plan.md from spec
@speckit-tasks      → create docs/tasks.md from plan
@speckit-implement  → implement from tasks (TDD where applicable)
```

Include `CLAUDE.md` + relevant `docs/` files in context for every Spec Kit session.
