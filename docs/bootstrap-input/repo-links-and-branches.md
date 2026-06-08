# Repo Links and Branches

**Evidence sources**: `git remote -v`, `git branch -a`, `git log --oneline`, `.vercel/`, `.env.vercel.check`, `ARCHITECTURE.md`

---

## 1. Repository

| Field | Value |
|-------|-------|
| Remote name | `origin` |
| Provider | GitHub |
| Owner | `tahaspace` |
| Repo name | `sinai-institute` |
| URL | `https://github.com/tahaspace/sinai-institute` |
| Visibility | *Uncertain* (likely private — PAT in remote URL) |
| Auth method | Personal Access Token (PAT) embedded in remote URL: `ghp_REDACTED_ROTATED` |

> ⚠️ The PAT is embedded in the git remote URL (`git remote -v` output). If this is a shared machine, rotate this token.

---

## 2. Branches

| Branch | Type | Notes |
|--------|------|-------|
| `main` | Production | HEAD at commit `ff29e76` — deployed to Vercel |
| `speckit-bootstrap` | Local work branch | Current HEAD (created 2026-03-28), tracks `origin/main` |
| `remotes/origin/main` | Remote tracking | Latest: `ff29e76` |

**No feature branches, staging branches, or release branches exist.** All work has been committed directly to `main`.

---

## 3. Git Commit History

Only 4 commits in total (full repo history as of 2026-03-28):

```
ff29e76  (HEAD → speckit-bootstrap, origin/main, main)
         fix: add key prop to Dialog to force re-render

a045e58  fix: force dynamic rendering for CMS pages to show edit dialog

f9a23f9  fix: تحديث Supabase connection للـ production

fea33b8  feat: نظام إدارة معهد سيناء العالي - SaaS Education Platform
```

> **Note**: The entire project development history is compressed into a single "init" commit (`fea33b8`). All work from the Cursor sessions was force-pushed or squashed. There is no granular commit history of feature development.

---

## 4. Vercel Project

| Field | Value |
|-------|-------|
| Project name | `sinai-institute` |
| Vercel team | `tahaspace` |
| Dashboard URL | `https://vercel.com/tahaspace/sinai-institute` *(inferred)* |
| Vercel project ID | `prj_uIVrMsaHP2QUaYkzsg38Iggl4DlC` |
| Auto-deploy from GitHub | ❌ Not active (`VERCEL_GIT_COMMIT_REF` is empty in `.env.vercel.check`) |
| Deploy method | Manual Vercel CLI (`vercel --prod`) |

---

## 5. External Services

| Service | Account / Project | URL |
|---------|------------------|-----|
| Supabase (primary DB) | `tahaspace` / `eacpjbbpwonwmthutxow` | https://supabase.com/dashboard/project/eacpjbbpwonwmthutxow |
| Cloudinary (media) | Cloud name: `dyz4dc6n7` | https://cloudinary.com/console |
| Neon (old DB — inactive) | Project ref: `ep-shy-fire-ag4sxzsm` (eu-central-1) | https://console.neon.tech *(quota exceeded)* |
| Hostgator (domain registrar) | Domain: `sinaiinstitute.com` | — |
| A2Hosting (DNS + main site) | NS: ns1–ns4.a2hosting.com | — |

---

## 6. Production URLs

| Environment | URL | Backend |
|------------|-----|---------|
| Production (Vercel) | https://test.sinaiinstitute.com | This repo on Vercel |
| Production (Vercel default) | https://sinai-institute.vercel.app | This repo on Vercel |
| Main institute website | https://sinaiinstitute.com | A2Hosting (separate — not this repo) |
| Local dev | http://localhost:3000 (or 3001, 3002 per session) | `npm run dev` |
| Prisma Studio (local) | http://localhost:5555 | `npm run prisma:studio` |

---

## 7. Key File Locations

| Purpose | Path |
|---------|------|
| App router root | `app/` |
| Public pages | `app/(public)/` |
| CMS panel | `app/(cms)/` |
| Institute admin | `app/(institute)/` |
| Student portal | `app/(student)/` |
| Faculty portal | `app/(faculty)/` |
| Parent portal | `app/(parent)/` |
| Teaching assistant | `app/(assistant)/` |
| Admin portals | `app/(admin-portals)/` |
| LMS | `app/(lms)/` |
| API routes | `app/api/` |
| DB schema | `prisma/schema.prisma` |
| Local SQLite (dev) | `prisma/dev.db` |
| Seed script | `prisma/seed.ts` |
| Auth middleware | `middleware.ts` |
| Global styles | `app/globals.css` |
| Tailwind config | `tailwind.config.ts` |
| Next.js config | `next.config.ts` |
| Vercel config | `vercel.json` |
| Prod env (local) | `.env.production` |
| Vercel env snapshot | `.env.vercel.check` |
| i18n locales | `i18n/locales/ar.json`, `i18n/locales/en.json` |
| Repomix packed source | `repomix-project.xml` (1.07 MB) |

---

## 8. Branch Strategy Recommendation

As of now there is no branch strategy. Suggested minimum:

```
main          ← protected; auto-deploys to production
develop       ← integration branch
feature/*     ← feature work
fix/*         ← bug fixes
```

> Given the current 4-commit history, the first practical step is to ensure `main` is protected on GitHub (require PR, no force push).
