# Live Production Audit

**Evidence sources** (highest-to-lowest trust):
1. Vercel API (live, queried 2026-03-28): project config, deployments, env var names, aliases
2. `docs/bootstrap-input/audit-raw/vercel/` — pre-captured Vercel CLI snapshots
3. `docs/bootstrap-input/chats-raw/` — historical deployment session records
4. Repository source code (`lib/prisma.ts`, `vercel.json`, `middleware.ts`)

---

## 1. Production Project Identity

| Field | Value | Source |
|-------|-------|--------|
| Vercel project name | `sinai-institute` | Vercel API live |
| Vercel project ID | `prj_uIVrMsaHP2QUaYkzsg38Iggl4DlC` | Vercel API live |
| Vercel account | `tahaspace` (team: `team_XSGK9WqXGmUOOUJxN83U3XvK`) | Vercel API live |
| Framework | `nextjs` (App Router) | Vercel API live |
| Node version | **24.x** (Vercel API) vs 20.x (historical docs) | ⚠️ Discrepancy — Vercel API is authoritative |
| Git integration | **None** (no `link.repo`, no `link.org` on project) | Vercel API live |
| Build command | `npm run build` | Vercel project config |
| Output directory | `.next` | Vercel project config |
| Second inactive project | `edusaas-smart-innovation` | Vercel alias list |

> **Note on Node version**: Vercel API returns `nodeVersion: 24.x`. Historical notes said 20.x. The live Vercel project setting takes precedence — the application is running on Node 24 in production.

---

## 2. Domains and Aliases

**Production deployment URL**: `sinai-institute-3a1twtdm9-tahaspaces-projects.vercel.app`  
**Age**: 57 days old as of audit date (deployed ~2026-01-30)

**All active aliases pointing to this production deployment**:

| Alias | Age |
|-------|-----|
| `test.sinaiinstitute.com` | 57d |
| `sinai-institute.vercel.app` | 57d |
| `sinai-institute-tahaspaces-projects.vercel.app` | 57d |
| `sinai-institute-tahaspace-tahaspaces-projects.vercel.app` | 57d |

**DNS**: `test.sinaiinstitute.com` → `CNAME → 70c132ac131a8ac5.vercel-dns-017.com`  
**DNS host**: A2Hosting nameservers (ns1–ns4.a2hosting.com); domain registrar: Hostgator  
**Parent domain**: `sinaiinstitute.com` is NOT on Vercel; served from A2Hosting (separate server)

**Legacy inactive project**: `edusaas-smart-innovation` (88 days old) — no longer active; all aliases orphaned

---

## 3. Latest Production Deployment Summary

**Current live deployment**: `sinai-institute-3a1twtdm9-tahaspaces-projects.vercel.app`  
**Promoted to production**: ~2026-01-30 (57 days before audit)  
**Git integration**: NONE — deployment was done via Vercel CLI (`vercel --prod`)

**Git commit on production** (from local `git log`):
```
ff29e76  fix: add key prop to Dialog to force re-render
```

**Full commit history on `main`** (all 4 commits — confirmed by local git):
```
ff29e76  fix: add key prop to Dialog to force re-render
a045e58  fix: force dynamic rendering for CMS pages to show edit dialog
f9a23f9  fix: تحديث Supabase connection للـ production
fea33b8  feat: نظام إدارة معهد سيناء العالي - SaaS Education Platform
```

**20 deployments** are listed in `deployments-ready.txt` — all in READY state — indicating frequent CLI-based deploys over the development period. None appear to be Git-triggered (no `gitCommitRef` in deployment metadata).

**Historical build stats** (from `DEPLOYMENT_2026-02-04.md`):
- Build time: ~45 seconds
- Files uploaded: 975.6 KB
- Static pages: 133
- Build location: Washington, D.C. (East)

---

## 4. Environment Variables — Production Live State

Source: `docs/bootstrap-input/audit-raw/vercel/env-production-names.txt` (Vercel CLI snapshot)

**Confirmed set in Vercel production environment** (names only, values encrypted):

| Variable | Set age | Notes |
|----------|---------|-------|
| `DATABASE_URL` | 47 days ago | Supabase connection string — confirmed Supabase by project ID in URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 47 days ago | Supabase admin JWT |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 47 days ago | Client-accessible Supabase key |
| `NEXT_PUBLIC_SUPABASE_URL` | 47 days ago | `https://eacpjbbpwonwmthutxow.supabase.co` |
| `CLOUDINARY_API_SECRET` | 52 days ago | Set ~2026-02-04 |
| `CLOUDINARY_API_KEY` | 52 days ago | |
| `CLOUDINARY_CLOUD_NAME` | 52 days ago | |

**NOT SET in Vercel production dashboard** (confirmed absent from env-production-names.txt):
- `NEXTAUTH_URL` — not in dashboard; only in `vercel.json` env block (wrong value)
- `NEXTAUTH_SECRET` — not in dashboard; only in `vercel.json` env block (weak value)
- `NODE_ENV` — not in dashboard; set in `vercel.json` env block

**Preview environment** has only `DATABASE_URL` — no auth or Cloudinary vars set.

---

## 5. Critical Runtime Observation: `vercel.json` env Block vs Dashboard

`vercel.json` env block **overrides** dashboard values. The stale `vercel.json` values that shipped to production:

| Variable | `vercel.json` value | Actual needed value |
|----------|---------------------|---------------------|
| `DATABASE_URL` | Dead Neon URL (quota exceeded) | Supabase URL (in dashboard) |
| `NEXTAUTH_URL` | `https://sinai-institute.vercel.app` | `https://test.sinaiinstitute.com` |
| `NEXTAUTH_SECRET` | Weak plaintext string | Strong random secret |
| `NODE_ENV` | `production` | Redundant — Vercel sets this |

**However**: `lib/prisma.ts` bypasses `DATABASE_URL` entirely in production by hardcoding the Supabase URL. So the dead Neon URL in `vercel.json` does not break DB connectivity — but the wrong `NEXTAUTH_URL` **may** be causing auth call-back issues.

---

## 6. Notable Runtime/Build Findings

### Node Version Drift
Vercel project reports `nodeVersion: 24.x`. Local development notes and historical docs said 20.x. The repo has no `.node-version` or `.nvmrc` file. The production Node version is higher than expected.

### No Git Integration
The Vercel project has zero git connection (`link.type = None`). All 20 historical deployments were CLI-only. If the repo is pushed to GitHub, it does NOT trigger an automatic Vercel deploy.

### Logs File Empty
`docs/bootstrap-input/audit-raw/vercel/logs-last-24h.txt` is empty — no function invocations captured. Either: (a) no traffic in the 24h window when captured, or (b) Hobby plan log retention was already expired (1 day).

### Last Project Update
`updatedAt: 2026-02-09 22:22 UTC` — the project config was last modified ~47 days before the audit. No deployments since then (the active production deployment is 57 days old).

---

## 7. Confidence Notes

| Area | Confidence | Basis |
|------|-----------|-------|
| Domains and aliases | 🟢 High | Vercel API + alias list, cross-verified |
| Production deployment URL | 🟢 High | Vercel API targets.production |
| Node version 24.x | 🟢 High | Vercel API live |
| No git integration | 🟢 High | Vercel API link=None |
| Env var names in dashboard | 🟢 High | Vercel CLI snapshot file |
| DATABASE_URL points to Supabase | 🟢 High | Supabase project ref `eacpjbbpwonwmthutxow` in multiple files |
| NEXTAUTH_URL value in production | 🟡 Medium | `vercel.json` confirmed, unclear if overridden in dashboard |
| Port 5432 vs 6543 in production | 🟡 Medium | `lib/prisma.ts` hardcoded uses 5432; `vercel-production-notes.md` claims 6543 — contradiction |
| Node 24 compatibility risks | 🟡 Medium | No test evidence |
| Current DB schema vs production | 🔴 Low | No `prisma db pull` run against production |
