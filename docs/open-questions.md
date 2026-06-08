# Open Questions

**Purpose**: Unresolved decisions and unknowns. Each must be answered before meaningful feature work in that area.  
**Format**: Status = `active` · `resolved` · `needs-decision` (owner decision required)  
**Last updated**: 2026-03-28

---

## Resolved by Audit (no longer open)

| Question | Answer | Source |
|---------|--------|--------|
| Is Supabase the production DB? | **Yes** — `eacpjbbpwonwmthutxow`, eu-west-1 | Code + Vercel API |
| Is the Supabase SDK used in app code? | **No** — Prisma only; `@supabase/supabase-js` not installed | `package.json` |
| Is the hardcoded URL still in `lib/prisma.ts`? | **Yes** — active, port 5432 | Code |
| Does `HomepageSpecialization` exist in schema? | **No** — definitively absent from all 14 models | `prisma/schema.prisma` fully read |
| Does `/api/upload` write to local filesystem? | **No** — uses Cloudinary | Code |
| What does `/[slug]/page.tsx` serve? | GrapesJS page render via `/api/pages` | Code |
| Is git integration active on Vercel? | **No** — `link.type: None` per Vercel API | Vercel API |
| What Node version runs in production? | **24.x** — not 20.x as docs stated | Vercel API |
| Is `NEXTAUTH_URL` set correctly in dashboard? | **No** — not in dashboard; only in `vercel.json` as wrong value | Vercel API env list |
| Does a PWA service worker exist in `public/`? | **No** — absent | `ls public/` |
| Do named routes (`/about` etc.) have `page.tsx`? | **No** — all 404 | Directory listing |

---

## Active — Need Verification (can be resolved without deployment)

### OQ-001 — Does production Supabase have all 14 schema models as tables?
**Why**: `prisma migrate` was never used. GrapesJS models (`PageBlock`, `PageVersion`, `WidgetTemplate`, `Setting`) were added after initial setup. If `db push` was not re-run, tables are missing and routes will crash.  
**Verification**: `npx prisma studio` or `prisma db pull` → compare table list to `schema.prisma`  
**Blocker for**: Knowing whether CMS, pages, and settings are functional in production

---

### OQ-002 — Is the Supabase project active or paused?
**Why**: Supabase free tier pauses projects after ~7 days inactivity. `logs-last-24h.txt` was empty — no recent function calls captured.  
**Verification**: `https://supabase.com/dashboard/project/eacpjbbpwonwmthutxow` — check project health indicator  
**Blocker for**: Any assumption that the production DB is reachable

---

### OQ-003 — What port does `DATABASE_URL` in the Vercel dashboard use?
**Why**: `lib/prisma.ts` hardcodes port 5432. Dashboard `DATABASE_URL` is encrypted — may use port 6543 (pgbouncer) which would be the correct fix if we remove the hardcode.  
**Verification**: Vercel dashboard → `sinai-institute` → Settings → Environment Variables → `DATABASE_URL` → Reveal  
**Blocker for**: Deciding the correct fix for KI-007

---

### OQ-004 — Does `prisma/dev.db` contain real PII?
**Why**: File is 299KB (not empty). Migration scripts read applications with `nationalId`, `phone`, `email` from it.  
**Verification**: `sqlite3 prisma/dev.db .dump | head -200`  
**Blocker for**: KI-011 remediation — determines if `git filter-repo` is needed

---

### OQ-005 — Is `@tanstack/react-query` actually used anywhere?
**Why**: Listed in `package.json`; `project-goals.md` calls it "active". Code audit found no confirmed `useQuery`/`useMutation` calls.  
**Verification**: `grep -r "useQuery\|useMutation\|QueryClient" app/ components/ --include="*.tsx"`  
**Blocker for**: Dependency pruning decision

---

### OQ-006 — What is the `/cms/pages-new/` route, and how does it relate to `/cms/pages/`?
**Why**: Two CMS page management routes exist. Relationship (duplicate? replacement? draft?) is not documented.  
**Verification**: Read `app/(cms)/cms/pages-new/page.tsx` — key differences will be visible in 30 seconds  
**Blocker for**: Understanding whether one should be removed

---

### OQ-007 — Does `next-intl` have any initialization in `app/layout.tsx`?
**Why**: Package installed; locale files exist. Whether it's wired determines if any i18n infrastructure is in place.  
**Verification**: Read `app/layout.tsx` providers block  
**Blocker for**: Language feature scope assessment

---

### OQ-008 — Is the Supabase project on Free or Pro plan?
**Why**: Determines PITR availability, connection limits, backup retention.  
**Verification**: Supabase dashboard → Billing tab  
**Blocker for**: Backup and disaster recovery planning

---

## Needs Decision — Owner Required

### OQ-009 — Are portal pages intended as demo/mock, or should they eventually serve real data?
**Current state**: Student, faculty, institute portals all show hardcoded arrays — no DB.  
**Options**:
- A) Keep as demo (document explicitly, add disclaimer) — no code change needed
- B) Add auth + real data for one portal first (e.g., student grades) — requires Student model + major work
- C) Protect with CMS credentials only — shared admin access to all portals  

**Blocker for**: Any portal feature work. Must decide before adding routes or fetching data.

---

### OQ-010 — What is the intended RBAC model?
**Current state**: `User.role` string field exists. Active auth ignores it — always returns `SUPER_ADMIN`. No role checking anywhere.  
**Minimum needed**: What can `EDITOR` do differently from `ADMIN`? Are portals for separate user types?  
**Blocker for**: KI-004 fix; any multi-user or permission-gated feature

---

### OQ-011 — Should `/about`, `/admission`, `/contact`, `/departments`, `/results` be hardcoded pages or CMS-driven?
**Current state**: Empty directories — all 404. Equivalent content may exist at `/pages/about` etc. via GrapesJS.  
**Options**:
- A) Add `page.tsx` to each with hardcoded content
- B) Add Next.js redirect: `/about` → `/pages/about`
- C) Delete directories; document `/pages/[slug]` as the canonical path for all content  

**Blocker for**: Any public website completion work

---

### OQ-012 — Will the LMS be custom-built or integrated from a third party?
**Current state**: `app/(lms)/` has 9 scaffold files. No DB models. No API routes.  
**Options**: Custom (extensive work), Moodle embed, Google Classroom integration  
**Blocker for**: LMS scope and any L feature in Spec Kit

---

### OQ-013 — Will email notifications be implemented?
**Current state**: `.env.example` has SMTP vars; no mailer library in `package.json`.  
**Decision determines**: Whether to add `nodemailer`/`resend` and templates for applications/complaints  
**Blocker for**: Application status notifications, complaint responses

---

### OQ-014 — When does `test.sinaiinstitute.com` become `sinaiinstitute.com`?
**Current state**: Main domain on A2Hosting (separate site). This app on `test.` subdomain.  
**Decision triggers**: DNS cutover plan, `NEXTAUTH_URL` update, `sinaiinstitute.com` retirement/redirect  
**Blocker for**: Domain configuration work

---

### OQ-015 — Should Vercel Git integration be enabled?
**Current state**: Manual CLI deploys only. Any push to `main` requires a manual `vercel --prod`.  
**Prerequisite if yes**: Fix TypeScript/ESLint suppression — otherwise every push auto-deploys broken code  
**Blocker for**: CI/CD work

---

### OQ-016 — Should the `Setting` table replace `localStorage` for CMS homepage config?
**Current state**: Slides, stats, ticker, social links, specialization cards all in `localStorage`.  
**Decision determines scope of**: migrating CMS homepage so changes are cross-device and server-renderable  
**Estimated effort**: 5 separate tasks (~10–14 hours total)
