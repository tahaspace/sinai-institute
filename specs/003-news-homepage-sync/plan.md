# Implementation Plan: Institute News Homepage Production Sync Fix

**Branch**: `003-news-homepage-sync` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/003-news-homepage-sync/spec.md`

---

## Summary

The institute news ("أخبار المعهد") entered via the CMS is invisible to normal users on the public homepage because both the CMS editor and the public homepage read/write exclusively to browser `localStorage`. The `/api/news` DB-backed endpoint and the `News` Prisma model exist but are never called by either page. Additionally, `/api/news` is currently broken at the ORM level — all field names in the route (`title`, `content`, `published`, `publishedAt`, `featured`, `showInSlider`, `showInTicker`, `summary`) do not match the actual schema fields (`titleAr`, `titleEn`, `contentAr`, `contentEn`, `isPublished`, `publishDate`, `isFeatured`, `isInTicker`). Every `GET` request throws a P2009 runtime error; every `POST` silently fails.

**Fix approach (minimal, production-safe)**:
1. Fix `/api/news` GET + POST field names to match the real Prisma schema
2. Add `?category` filter support to the GET handler (already partially present, just fix field names)
3. Wire `app/(public)/page.tsx` to `GET /api/news?category=INSTITUTE_NEWS&published=true` (and `GENERAL_NEWS`) on mount
4. Wire `app/(cms)/cms/homepage/page.tsx` institute news section to `GET /api/news?category=INSTITUTE_NEWS` on mount and `POST /api/news` (with `category: "INSTITUTE_NEWS"`) on save
5. Update `docs/known-issues.md` to mark KI-009 partially resolved (institute + general news sections)

No schema migration. No data deletion. No localStorage removal from other sections (slides, stats, specializations — those are out of scope).

---

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 14 App Router (React Server + Client Components)  
**Primary Dependencies**: Next.js 14, Prisma ORM, NextAuth v4, Supabase PostgreSQL  
**Storage**: Production Supabase PostgreSQL (remote, port 6543 pgbouncer) · Cloudinary (media)  
**Testing**: Manual integration testing (no automated test suite in project — pre-existing)  
**Target Platform**: Vercel (production) · Local dev connected to remote Supabase  
**Project Type**: Full-stack Next.js web application (CMS + public site)  
**Performance Goals**: Public homepage institute news visible on all devices within 60s of CMS save  
**Constraints**: No schema change · No data destruction · No destructive DB operation · No new dependencies  
**Scale/Scope**: 3 files modified (`app/api/news/route.ts`, `app/(public)/page.tsx`, `app/(cms)/cms/homepage/page.tsx`) + 1 docs update

---

## Constitution Check

| Gate | Principle | Status |
|------|-----------|--------|
| All Critical KIs in `docs/known-issues.md` are resolved, OR this plan IS the resolution | I. Production Safety First | ✅ — KI-001 through KI-005 all marked resolved 2026-03-29. KI-009 (localStorage) this plan partially resolves. |
| No secret, credential, or connection string in any file this plan touches | II. Secret Handling | ✅ — No secrets touched. Route files and page components only. |
| Every new/modified write endpoint includes `getServerSession()` check returning 401 if null | III. Auth on Mutating Endpoints | ✅ — `POST /api/news` already has `getServerSession()` guard. GET is public read (exempt per constitution §III). |
| If schema changes: Supabase backup + `prisma db pull` diff reviewed before `db push` | IV. Data and Schema Safety | ✅ N/A — No schema change. Existing `News` model fields used as-is. |
| `prisma:seed` MUST NOT target production; no `prisma migrate reset` | IV. Data and Schema Safety | ✅ — No seed or migration in this plan. |
| Relevant `docs/` files updated in same changeset | V. Architectural Integrity | ✅ — `docs/known-issues.md` updated (KI-009 partial resolution). |
| `npx tsc --noEmit` passes before `vercel --prod` | VI. Code Quality | ✅ — TypeScript check required in local verification step before deploy. |
| New content shared across users goes to DB (not localStorage) | VII. Content Persistence | ✅ — This plan IS the fix for the localStorage violation (KI-009 partial). Institute + general news migrated to DB path. |
| OQ-009 answered before portal work; new deps confirmed not already served | VIII. Scope Discipline | ✅ N/A — No portal work. No new dependencies added. |

**Violations**: None.

---

## Phase 0: Research Findings

*(No NEEDS CLARIFICATION items remained after speckit-clarify. Findings below consolidate code inspection results.)*

### R-001: Root Cause — Complete Data Path Disconnect

**Finding**: Both `app/(public)/page.tsx` and `app/(cms)/cms/homepage/page.tsx` read and write institute/general news **exclusively via `localStorage`** (`homepage_institute_news`, `homepage_general_news`). Neither file references `/api/news`. The `News` Prisma model and `/api/news` route exist in isolation, never called by either page.

**Decision**: Wire both pages to `/api/news` endpoint. Replace localStorage reads/writes for these two news types only.  
**Rationale**: Minimal targeted fix. Existing API route and model require no schema change. Addresses root cause directly.  
**Alternatives considered**: Setting table sync (more complex, no benefit here), localStorage export/import (wrong direction, doesn't fix cross-user visibility).

---

### R-002: `/api/news` Field Name Mismatches — Full Inventory

**Finding**: The route uses field names that **do not exist** in the `News` Prisma model. Every ORM call fails silently (caught by try/catch → 500) or is ignored.

| Route code | Schema field | Effect |
|---|---|---|
| `where.published` | `isPublished` | Filter silently ignored — returns all rows regardless of publish state |
| `orderBy: { publishedAt: 'desc' }` | `publishDate` | **P2009 runtime error on every GET** → 500 response |
| POST `title` | `titleAr` | Field doesn't exist → `null` stored or error |
| POST `content` | `contentAr` | Field doesn't exist → `null` stored or error |
| POST `published` | `isPublished` | Flag silently not set |
| POST `featured` | `isFeatured` | Flag silently not set |
| POST `showInSlider` / `showInTicker` | `isFeatured` / `isInTicker` | Wrong field names |
| POST `publishedAt` | `publishDate` | Timestamp silently not set |
| POST `summary` | *(no schema field)* | Causes Prisma `Unknown field` error |

**Decision**: Fix all GET and POST field names to match schema in `app/api/news/route.ts`.  
**Rationale**: GET is broken for all callers today (500 on every request). POST creates invalid records. Fixing both in one atomic change is safer than partial fix.

---

### R-003: Field Mapping for CMS-to-API Writes

**Finding**: The CMS homepage editor stores news items with a flat shape `{ title, description/content, points[], buttonText, buttonLink, imageUrl, order }`. The `News` schema is bilingual (`titleAr`, `titleEn`, `contentAr`, `contentEn`).

**Decision**: Map `title` → `titleAr`, `description/content` → `contentAr`; set `titleEn` and `contentEn` to `""` (empty string). Send `image` from `imageUrl`. Send `category: "INSTITUTE_NEWS"` or `"GENERAL_NEWS"`.  
**Rationale**: Platform is Arabic-first. Empty `titleEn`/`contentEn` strings satisfy schema `NOT NULL` constraint without a migration. Bilingual edit UI is explicitly out of scope.

---

### R-004: Category Distinction

**Finding**: The `category` field already exists in schema with `@default("NEWS")`. The GET handler already has `if (category) where.category = category`. This works correctly once field name errors are resolved.

**Decision**: Use `category: "INSTITUTE_NEWS"` for institute news and `category: "GENERAL_NEWS"` for general news.  
**Rationale**: Zero schema change. Uses existing capability in route. Enables two separate homepage sections to fetch their own data independently.

---

### R-005: Public Homepage Rendering Mode

**Finding**: `app/(public)/page.tsx` is a `'use client'` component. It has no SSR, no ISR, no `generateStaticParams`. All content is fetched client-side via `useEffect` + `localStorage`. There is no Vercel CDN edge cache on this page that needs invalidation.

**Decision**: Replace `localStorage.getItem('homepage_institute_news')` in `useEffect` with a `fetch('/api/news?category=INSTITUTE_NEWS&published=true')` call. Similarly for general news.  
**Rationale**: Client-side fetch is the correct pattern for a `'use client'` page. No revalidation complexity. 60s propagation SLA is satisfied by natural HTTP requests (each page load is a fresh fetch).  
**Alternative**: Convert to RSC with `fetch` + `revalidate`. Deferred — out of scope, higher risk.

---

### R-006: Known Issues Status

**Finding**: All 5 original Critical KIs (001–005) are resolved as of 2026-03-29. KI-009 (localStorage) is marked High and active. This plan is the partial resolution of KI-009 (institute + general news sections only). Slides, stats, specializations remain on localStorage and are explicitly out of scope for this fix.

**Decision**: Update `docs/known-issues.md` after implementation to mark KI-009 partially resolved with date and scope note.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-news-homepage-sync/
├── plan.md              ← this file
├── research.md          ← see Phase 0 above (inline)
├── data-model.md        ← see below
├── contracts/           ← see below
│   └── api-news.md
└── tasks.md             ← generated by /speckit-tasks
```

### Source Code (files modified)

```text
app/api/news/route.ts                        ← MODIFY: fix field names in GET + POST
app/(public)/page.tsx                        ← MODIFY: replace localStorage reads with API fetch
app/(cms)/cms/homepage/page.tsx              ← MODIFY: replace localStorage read/write with API calls
docs/known-issues.md                         ← MODIFY: partial resolution note for KI-009
```

No new files. No new routes. No schema migration.

---

## Implementation Phases

### Phase 1 — Read-Only Pre-Code Verification (MANDATORY, FR-014)

All steps are read-only. Document each result before writing any code.

**1.1 — Verify `/api/news` is broken (confirm root cause)**
- Run locally with Supabase connected: `curl http://localhost:3000/api/news`
- **Expected**: HTTP 500 with `{ "error": "فشل في جلب الأخبار" }` (P2009 from invalid `publishedAt` orderBy)
- Document: actual status code + body received

**1.2 — Verify News rows exist in Supabase**
- Open Supabase dashboard → Table Editor → `News` table
- Check row count and `category` values present
- **Expected**: rows exist (possibly with `category = "NEWS"` default from prior test entries)
- Document: row count + category values seen

**1.3 — Verify public homepage makes no API call for news**
- Open browser DevTools → Network tab
- Load `http://localhost:3000/` (local) or `https://sinaiinstitute.com/`
- Filter by `/api/news`
- **Expected**: zero requests to `/api/news` during page load
- Document: confirmed (or unexpected behaviour)

**1.4 — Verify CMS homepage makes no API call for news**
- Open browser DevTools → Network tab
- Load `/cms/homepage` (authenticated)
- Filter by `/api/news`
- **Expected**: zero requests to `/api/news` during page load
- Document: confirmed (or unexpected behaviour)

---

### Phase 2 — Fix `/api/news` Route (app/api/news/route.ts)

**Scope**: Correct all ORM field name mismatches in GET and POST. No auth change. No new endpoint.

**2.1 — Fix GET handler**

Replace:
```typescript
// WRONG
where.published = published === 'true';
orderBy: { publishedAt: 'desc' }
```

With:
```typescript
// CORRECT
where.isPublished = published === 'true';
orderBy: { publishDate: 'desc' }
```

Result: `GET /api/news?published=true` returns only `isPublished = true` rows, ordered by `publishDate`.  
Result: `GET /api/news?category=INSTITUTE_NEWS&published=true` returns only published institute news.

**2.2 — Fix POST handler**

The current POST body destructures: `{ title, content, summary, category, image, published, featured, showInSlider, showInTicker }` — none of these match schema fields.

Replace `prisma.news.create({ data: { title, content, summary, ... } })` with:

```typescript
prisma.news.create({
  data: {
    titleAr: title,           // required (maps CMS title → Arabic title)
    titleEn: '',              // required, empty string (bilingual UI out of scope)
    contentAr: content || '', // required (maps CMS content/description → Arabic content)
    contentEn: '',            // required, empty string
    image: image || null,
    category: category || 'NEWS',
    isPublished: published !== undefined ? published : true,
    publishDate: published ? new Date() : null,
    isFeatured: featured || false,
    isInTicker: showInTicker || false,
    // Remove: summary (no schema field), showInSlider (no schema field)
  },
})
```

**Safety note**: `summary` and `showInSlider` are in the route but absent from schema. Removing them from the `data` object is safe — they were already causing silent Prisma errors.

**2.3 — Fix PUT handler**

Current PUT passes `data` directly from body to `prisma.news.update`. This is a pass-through that will also silently fail for wrong field names. Scope constraint: fix only the fields the CMS homepage manager will send. At minimum, validate that `id` is present (already done) and that `data` does not contain unknown fields. For now, leave PUT as pass-through — the CMS homepage manager will use POST for new entries and DELETE for removals (no update flow in current CMS UI for homepage news).

**2.4 — Local verification after route fix**

- Restart dev server
- `curl http://localhost:3000/api/news` → **Expected**: HTTP 200, JSON array
- `curl "http://localhost:3000/api/news?published=true"` → **Expected**: only `isPublished = true` rows
- `curl "http://localhost:3000/api/news?category=INSTITUTE_NEWS&published=true"` → **Expected**: filtered list

---

### Phase 3 — Wire Public Homepage to API (app/(public)/page.tsx)

**Scope**: Replace two `localStorage.getItem` calls in the homepage `useEffect` with API fetches. Touch only the institute news and general news sections. Leave all other `localStorage` reads (slides, stats, specializations, social media) **untouched**.

**3.1 — Locate the target useEffect block**

The existing code:
```typescript
const savedInstituteNews = localStorage.getItem('homepage_institute_news');
if (savedInstituteNews) setInstituteNews(JSON.parse(savedInstituteNews));

const savedGeneralNews = localStorage.getItem('homepage_general_news');
if (savedGeneralNews) setGeneralNews(JSON.parse(savedGeneralNews));
```

**3.2 — Replace with API fetch**

```typescript
// Fetch institute news from DB
fetch('/api/news?category=INSTITUTE_NEWS&published=true')
  .then(r => r.ok ? r.json() : [])
  .then((data: any[]) => {
    if (data.length > 0) {
      setInstituteNews(data.map(item => ({
        title: item.titleAr,          // map schema → CMS display shape
        description: item.contentAr,
        imageUrl: item.image || '',
        order: item.order,
        id: item.id,
      })));
    }
  })
  .catch(() => {}); // graceful: section stays empty on network error

// Fetch general news from DB
fetch('/api/news?category=GENERAL_NEWS&published=true')
  .then(r => r.ok ? r.json() : [])
  .then((data: any[]) => {
    if (data.length > 0) {
      setGeneralNews(data.map(item => ({
        title: item.titleAr,
        description: item.contentAr,
        imageUrl: item.image || '',
        order: item.order,
        id: item.id,
      })));
    }
  })
  .catch(() => {});
```

**Safety**: If the API returns an empty array (no news yet), the section renders its existing empty state — no crash. The `.catch(() => {})` prevents a network error from breaking the rest of the homepage.

**3.3 — Local verification**
- Load `http://localhost:3000/` in a private/incognito window
- Open DevTools → Network → filter `/api/news`
- **Expected**: two requests (`?category=INSTITUTE_NEWS&published=true`, `?category=GENERAL_NEWS&published=true`) each returning 200
- **Expected**: institute news and general news sections populated with DB content

---

### Phase 4 — Wire CMS Homepage News Section to API (app/(cms)/cms/homepage/page.tsx)

**Scope**: Replace localStorage read (on mount) and localStorage write (on save) for the institute news and general news sections only. All other CMS homepage sections (slides, stats, specializations, social media) remain on localStorage — **explicitly untouched**.

**4.1 — Replace localStorage READ on mount**

Locate the existing `useEffect` block:
```typescript
const savedInstituteNews = localStorage.getItem('homepage_institute_news');
if (savedInstituteNews) setInstituteNews(JSON.parse(savedInstituteNews));
```

Replace with:
```typescript
fetch('/api/news?category=INSTITUTE_NEWS')
  .then(r => r.ok ? r.json() : [])
  .then((data: any[]) => setInstituteNews(data.map(item => ({
    id: item.id,
    title: item.titleAr,
    description: item.contentAr,
    imageUrl: item.image || '',
    isPublished: item.isPublished,
    order: item.order,
  }))))
  .catch(() => {});
```

*(Same pattern for general news with `category=GENERAL_NEWS`.)*

**4.2 — Replace localStorage WRITE on save**

Locate the existing save handler for institute news (whichever function calls `localStorage.setItem('homepage_institute_news', ...)`).

Replace with:

For **new entries** (no `id`):
```typescript
await fetch('/api/news', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: item.title,           // CMS title → API title → mapped to titleAr in route
    content: item.description,   // CMS description → API content → mapped to contentAr
    category: 'INSTITUTE_NEWS',
    image: item.imageUrl || null,
    published: item.isPublished !== undefined ? item.isPublished : true,
  }),
});
```

For **delete operations** (existing `id`):
```typescript
await fetch(`/api/news?id=${item.id}`, { method: 'DELETE' });
```

After save: re-fetch the list from the API (call the same `GET /api/news?category=INSTITUTE_NEWS`) to refresh the CMS view.

**Authentication note**: POST and DELETE on `/api/news` already require `getServerSession()`. The CMS editor is behind `/cms/*` middleware authentication. The fetch will automatically send the session cookie — no additional auth wiring needed.

**4.3 — Local verification**
- Log into CMS on `http://localhost:3000/cms/homepage`
- Navigate to institute news section
- **Expected**: existing DB entries load (no localStorage required)
- Add a new entry and save
- **Expected**: entry appears in the list without page refresh
- Open an incognito window and load `http://localhost:3000/`
- **Expected**: the new entry appears in the institute news section on the public homepage

---

### Phase 5 — Documentation Update

**5.1 — Update `docs/known-issues.md`**

Update KI-009 to reflect partial resolution:
```
### KI-009 — Homepage content is browser-local (localStorage) 🟠 High ⚠️ PARTIAL

**Partially resolved (2026-04-05 — 003-news-homepage-sync)**:
- ✅ Institute news ("أخبار المعهد"): migrated to /api/news (INSTITUTE_NEWS category)
- ✅ General news: migrated to /api/news (GENERAL_NEWS category)
- ⏳ Remaining: Hero slides, stats, specializations, social media links — still localStorage

**Remaining fix**: Migrate remaining sections to Setting table (GET/PUT /api/settings/:key pattern).
See docs/bootstrap-next-steps.md Phase 3.
```

**5.2 — Update `docs/known-issues.md`** — add new known issue for `/api/news` field fix:

```
### KI-024 — /api/news GET and POST used wrong Prisma field names 🟠 High ✅ (Resolved 2026-04-05)
**Fields fixed**: published → isPublished, publishedAt → publishDate (GET+POST), title → titleAr,
content → contentAr, featured → isFeatured, showInTicker → isInTicker (POST).
```

---

### Phase 6 — Pre-Deploy Local Verification (Full End-to-End)

Before any `vercel --prod`:

- [ ] `npx tsc --noEmit` — zero new TypeScript errors from this changeset
- [ ] `npm run lint` — no new lint violations
- [ ] `curl http://localhost:3000/api/news` → HTTP 200, JSON array ✓
- [ ] `curl "http://localhost:3000/api/news?category=INSTITUTE_NEWS&published=true"` → filtered result ✓
- [ ] Incognito window on `http://localhost:3000/` → institute news visible without prior CMS use ✓
- [ ] CMS news section loads existing DB entries on mount ✓
- [ ] CMS: add new entry → save → incognito homepage reload → entry visible ✓
- [ ] All other homepage sections (slides, stats, etc.) — **not regressed** ✓
- [ ] `vercel.json` contains no `"env"` block ✓
- [ ] No secret in any committed file in this changeset ✓

---

### Phase 7 — Production Deployment

```bash
vercel --prod
```

**Post-deploy production verification**:

- [ ] `curl https://sinaiinstitute.com/api/news` → HTTP 200
- [ ] `curl "https://sinaiinstitute.com/api/news?category=INSTITUTE_NEWS&published=true"` → filtered JSON
- [ ] Open `https://sinaiinstitute.com/` in incognito → institute news section visible
- [ ] Log into production CMS → `/cms/homepage` → institute news section loads from DB
- [ ] Add/save a test entry in CMS → reload public homepage incognito → entry appears
- [ ] Check Vercel logs for any P2009 or 500 errors on `/api/news`

---

## Complexity Tracking

No Constitution Check violations.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Existing `News` rows have `category = "NEWS"` (default) instead of `"INSTITUTE_NEWS"` | Medium | Medium — those rows won't appear in the filtered GET | Check row categories in Phase 1.2; if found, do a targeted one-time UPDATE (read-only alternative: adjust the homepage to also accept `"NEWS"` as a fallback category) |
| PUT handler passes raw body to Prisma — wrong field names could corrupt an update | Low | Medium | CMS homepage manager does not have an update flow; only add + delete. PUT not used in this feature. |
| `titleEn` / `contentEn` empty string violates a NOT NULL constraint not visible in schema | Low | Low | Schema shows both as `String` (not `String?`) with no explicit default, but Prisma will accept `""`. If error occurs, add `@default("")` in schema — additive only. |
| Public homepage component re-renders cause double fetch | Low | Low | Standard React `useEffect` with empty deps `[]` — runs once on mount. No loop risk. |

---

## Data Model

*(See `data-model.md` for entity diagram.)*

**`News` model (existing — no migration)**:

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | Primary key |
| `titleAr` | `String` | **Required** — maps from CMS `title` field |
| `titleEn` | `String` | **Required** — set to `""` in this feature |
| `contentAr` | `String` | **Required** — maps from CMS `description`/`content` |
| `contentEn` | `String` | **Required** — set to `""` in this feature |
| `image` | `String?` | Optional — maps from CMS `imageUrl` |
| `category` | `String @default("NEWS")` | `"INSTITUTE_NEWS"` or `"GENERAL_NEWS"` for this feature |
| `isFeatured` | `Boolean @default(false)` | Not used by this feature (defaults keep) |
| `isInTicker` | `Boolean @default(false)` | Not used by this feature (defaults keep) |
| `isPublished` | `Boolean @default(false)` | Publication flag — must be `true` for public visibility |
| `publishDate` | `DateTime?` | Optional — set to `new Date()` when publishing |
| `order` | `Int @default(0)` | Display order |
| `views` | `Int @default(0)` | Not used by this feature |

**Key clarification**: Existing rows with `category = "NEWS"` (the Prisma default) will **not** appear in `?category=INSTITUTE_NEWS` queries. See Risk Register — check row categories in Phase 1.2 before proceeding.
