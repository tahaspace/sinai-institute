# Feature Specification: Institute News Homepage Production Sync Fix

**Feature Branch**: `003-news-homepage-sync`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "Diagnose and fix why institute news entered from CMS is not reliably appearing on the public homepage for normal users, while preserving all existing production data in Supabase."

---

## Clarifications

### Session 2026-04-05

- Q: Should the fix wire both the CMS homepage manager and the public homepage to the existing news API endpoint (DB-backed), replacing all localStorage reads/writes for institute news? → A: **Yes — Option A**: wire both to the existing `/api/news` endpoint; replace `localStorage` reads and writes for `homepage_institute_news` / `homepage_general_news` with API calls.
- Q: Should the fix correct **all** field name mismatches in the news data service (GET filter, GET orderBy, POST create) or only the GET read path? → A: **Option A — fix all**: correct `published` → `isPublished` in GET filter, `publishedAt` → `publishDate` in GET orderBy, and align POST field names (`published` → `isPublished`, `publishedAt` → `publishDate`) to the schema in the same change. The `titleAr`/`titleEn` shape reconciliation is deferred to planning (Option C baseline applied).
- Q: How should the CMS flat field shape (`title`, `description`) be reconciled with the bilingual schema fields (`titleAr`, `titleEn`, `contentAr`, `contentEn`) when wiring CMS writes to the news API? → A: **Option A**: map CMS `title` → `titleAr`, CMS `description` → `contentAr`; set `titleEn` and `contentEn` to empty strings as defaults. No schema change, no new UI fields required. Platform is Arabic-first.
- Q: Which read-only verification checks must be performed before any code change? → A: **Option A — all four**: (1) `GET /api/news` to confirm endpoint returns error/500, (2) direct Supabase DB read to confirm news rows exist, (3) browser network tab on `/` to confirm no `/api/news` request fires, (4) browser network tab on `/cms/homepage` to confirm no `/api/news` request fires from the CMS editor.
- Q: How should institute news and general news be distinguished in the shared data service when both are stored in the same `News` table? → A: **Option A**: use the existing `category` field. CMS sends `category: "INSTITUTE_NEWS"` for institute news and `category: "GENERAL_NEWS"` for general news on POST. Public homepage fetches each section with `GET /api/news?category=INSTITUTE_NEWS&published=true` and `GET /api/news?category=GENERAL_NEWS&published=true` respectively. No schema change required.
- Q: What is the exact HTTP status code and failure layer when the CMS attempts to save (POST/PUT) a news item on production? → A: **Option A — HTTP 401 (Unauthorized)**. `getServerSession(authOptions)` returns `null` on production, causing the handler to return `{ error: 'غير مصرح', status: 401 }` before any Prisma/Supabase write is attempted. Root cause: `NEXTAUTH_URL` environment variable in Vercel is wrong or missing, preventing session cookie validation. This is a separate failure from the GET 500 (Prisma field mismatch). Both must be resolved before CMS save works end-to-end.
- Q: What is the state of `NEXTAUTH_URL` in the Vercel production environment? → A: **Option C — exists but wrong**. `NEXTAUTH_URL` is present in Vercel environment variables but points to an incorrect URL (e.g., a localhost address, old domain, or Vercel preview URL) instead of `https://sinaiinstitute.com`. This causes `getServerSession` to reject all CMS session cookies on production, returning 401 on every write even when the user is visually logged in to the CMS.
- Q: What is the correct deployment sequence for the code fix and the `NEXTAUTH_URL` environment variable correction? → A: **Option B — deploy code fix first, then fix `NEXTAUTH_URL`**. Because the GET handler has no auth guard, deploying the code fix (Prisma field corrections, pages wired to API) immediately restores public homepage news visibility for all visitors without touching Vercel env vars. The `NEXTAUTH_URL` correction in Vercel dashboard is applied as a separate, subsequent step to unblock CMS write operations. No additional redeploy is needed after the env var update — it takes effect on the next request.
- Q: Should the PUT (edit) handler in the news API also receive the same field mapping fix as the POST (create) handler in the same commit? → A: **Option A — yes, fix in the same commit**. The PUT handler currently spreads the raw CMS body (`{ title, content, image, category, published }`) directly into `prisma.news.update({ data })`. Prisma will reject `title`, `content`, and `published` as unknown fields (P2009), causing HTTP 500 on every edit attempt once auth is working. The fix maps each field identically to POST: `title → titleAr`, `content → contentAr`, `published → isPublished`, `image → image`. Must be included in the same commit to prevent a new regression surfacing immediately after NEXTAUTH_URL is corrected.
- Q: What is the correct read-only method to verify all 3 existing Supabase records are intact before deploying the fix? → A: **Option D — both Supabase dashboard AND local curl**. (1) Supabase Table Editor → News table: confirms raw DB rows by ID, category, and `isPublished` without any API dependency; (2) `curl http://localhost:3100/api/news` against the local dev server connected to remote Supabase: confirms the fixed API correctly reads and returns all 3 records. Together these provide a read-only, pre-deployment data integrity proof. Neither step modifies data. The production API cannot be used pre-deploy as it currently returns HTTP 500.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Visitor Sees Institute News on Homepage (Priority: P1)

A normal visitor opens the public homepage (`sinaiinstitute.com/`) on any browser or device and sees the "أخبار المعهد" (Institute News) section populated with the news entries that the CMS admin has published. The visitor has never been to the CMS and has no prior state stored in their browser.

**Why this priority**: This is the primary production symptom. Most visitors arrive cold — no prior browser state. If news is invisible to them, the section is effectively broken for the majority of the audience. This is the highest-impact user-facing failure.

**Independent Test**: Can be verified by opening an **incognito/private browser window** and loading `sinaiinstitute.com/`. If the institute news section is visible and populated without any prior CMS interaction on that browser, this story is satisfied.

**Acceptance Scenarios**:

1. **Given** a visitor opens the homepage in a fresh browser with no prior state, **When** the page finishes loading, **Then** the "أخبار المعهد" section displays the same institute news entries that have been published by the CMS admin.
2. **Given** a visitor opens the homepage on a different device than the one used for CMS edit, **When** the page loads, **Then** the news entries are visible and identical to what a visitor on any other device would see.
3. **Given** a visitor refreshes the homepage, **When** the page reloads, **Then** the news entries remain consistent and do not disappear or change unless the admin has made a new change.

---

### User Story 2 — CMS Admin Sees Published News in CMS Homepage Manager (Priority: P2)

A CMS admin opens `/cms/homepage` and navigates to the "أخبار المعهد" tab or section. They see all institute news entries that currently exist in the system — including any entries that were previously saved. The view reflects the persisted, shared state, not only what was entered on the current browser or device session.

**Why this priority**: If the admin cannot see existing entries in the CMS management view, they may duplicate them or believe none exist. This compounds the problem and risks data inconsistency. Secondary only to P1 because the admin at least has indirect knowledge of what should exist.

**Independent Test**: Admin logs in on a second device/browser (not the one previously used to enter news). Opens `/cms/homepage`. Sees the previously entered institute news without re-entering it. Story is satisfied if the data appears.

**Acceptance Scenarios**:

1. **Given** news entries have been previously saved by an admin, **When** any admin opens the CMS homepage manager on any device or browser, **Then** the "أخبار المعهد" section displays all previously saved entries.
2. **Given** the CMS admin adds a new institute news entry and saves it, **When** a different admin opens the CMS homepage manager, **Then** the new entry is visible to them as well.
3. **Given** the CMS homepage manager is opened in a fresh browser session (no prior CMS usage on that browser), **When** the page loads, **Then** the existing news entries are shown — not an empty list.

---

### User Story 3 — News Changes Propagate to Homepage Without Manual Intervention (Priority: P3)

When a CMS admin adds, updates, or removes an institute news entry and saves it, the public homepage reflects that change for all visitors without requiring a server restart, cache purge, or other manual operator action.

**Why this priority**: Once P1 and P2 are fixed, this story ensures the fix is durable and self-maintaining. A fix that works once but requires manual cache clearing on every update is not acceptable long-term.

**Independent Test**: Admin adds a new news entry via `/cms/homepage` and saves. Within a reasonable time (under 60 seconds), a visitor on a fresh browser sees the new entry on the public homepage, without any manual intervention.

**Acceptance Scenarios**:

1. **Given** the public homepage is loaded and shows existing news, **When** an admin adds a new institute news entry and saves it, **Then** a visitor who reloads or newly opens the homepage sees the updated news within 60 seconds without clearing caches.
2. **Given** an admin removes an institute news entry, **When** a visitor loads the homepage, **Then** the removed entry is no longer visible.

---

### Edge Cases

- What happens if the institute news section in the database is empty? The homepage must show an appropriate empty state or graceful fallback — not a broken section or an error.
- What happens if the network or database is temporarily unavailable when a visitor loads the homepage? The page must still load; the news section should either show a fallback or a graceful empty state without a crash.
- What if an admin saved news entries on Device A, then Device B (with no local state) opens the CMS — the CMS must still show the entries from the shared store, not Device B's empty local state.
- What happens if old locally-stored data conflicts with the newly persisted server data? The server-persisted data must take precedence over any locally cached state.
- What if a previously entered entry had an image that is no longer accessible? The news item should still be displayed with a graceful image fallback.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The public homepage MUST fetch and display institute news entries from the centralised news data service — not from any browser-local storage — so that all visitors on any device or browser see the same content without requiring prior browser state. The fetch MUST filter by `category=INSTITUTE_NEWS` and `published=true` to show only the correct, published entries. *[Clarified 2026-04-05: replaces current `localStorage` read of `homepage_institute_news`; category filter added Q5.]*

- **FR-002**: The CMS "أخبار المعهد" management section MUST load institute news entries from the centralised news data service on page mount, replacing the current `localStorage` read. The displayed list MUST reflect the shared, server-persisted state. *[Clarified 2026-04-05.]*

- **FR-003**: The CMS "أخبار المعهد" management section MUST persist new, updated, and deleted institute news entries to the centralised news data service (create/update/delete operations), replacing the current `localStorage` write. Changes MUST be immediately visible to all users system-wide after save. *[Clarified 2026-04-05.]*

- **FR-004**: Institute news entries MUST be retrievable and displayable on the public homepage without requiring the visitor to have ever interacted with the CMS on that browser.

- **FR-005**: The read path for institute news MUST correctly apply the publication visibility filter using the canonical schema field `isPublished` — not the incorrect alias `published`. The `GET ?published=true` query MUST return only entries where `isPublished = true`. No silent filtering bypass is acceptable. *[Clarified 2026-04-05: current code uses `where.published` which is silently ignored by the data layer.]*

- **FR-011**: The news data service GET handler MUST order results by the canonical date field `publishDate` (descending) — not `publishedAt`, which does not exist in the schema and causes a runtime error on every request. *[Clarified 2026-04-05: current `orderBy: { publishedAt: 'desc' }` throws a data layer error (P2009) on every GET, making the endpoint non-functional.]*

- **FR-012**: The news data service POST (create) handler MUST write the publication flag to the canonical schema field `isPublished` and the publication timestamp to `publishDate` — replacing the current incorrect field names `published` and `publishedAt` respectively. *[Clarified 2026-04-05.]*

- **FR-016**: The production Vercel deployment MUST have `NEXTAUTH_URL` set **exactly** to `https://sinaiinstitute.com` (no trailing slash, no port, correct protocol). The current value in Vercel is incorrect — it exists but points to a wrong URL — causing `getServerSession` to reject all CMS session cookies on production, returning 401 on every write even when the user is visually logged in to the CMS. `NEXTAUTH_SECRET` must also be present and non-empty. **No redeploy is required** after updating the env var — see FR-018. *[Clarified 2026-04-05 — Q6/Q7: 401 failure confirmed; NEXTAUTH_URL present but wrong value. I1 fix: removed stale "trigger a redeploy" instruction 2026-04-05.]*

- **FR-017**: The read-only pre-deployment verification checklist MUST include: (1) navigate to Vercel dashboard → project → Settings → Environment Variables; (2) locate `NEXTAUTH_URL`; (3) confirm it does NOT contain `localhost`, a Vercel preview URL (`.vercel.app`), or any domain other than `sinaiinstitute.com`; (4) confirm `NEXTAUTH_SECRET` is present. These checks are non-destructive and require no code or database changes. *[Clarified 2026-04-05 — Q7.]*

- **FR-018**: The fix MUST be applied in two sequential, independent steps: **(1) Code deploy first** — commit + push the three modified source files to trigger a Vercel deployment; this immediately restores `GET /api/news` (no auth required) and makes the public homepage news section visible to all visitors; **(2) `NEXTAUTH_URL` correction second** — in the Vercel dashboard, update `NEXTAUTH_URL` to `https://sinaiinstitute.com` (exact, no trailing slash); no additional redeploy is required; this unblocks CMS POST/PUT/DELETE operations. These two steps are independent and may be performed in this order without risk of data loss or regression. *[Clarified 2026-04-05 — Q8: GET has no auth guard; code fix and env var fix are decoupled.]*

- **FR-019**: The PUT (update) handler in the news data service MUST apply the same field mapping as the POST (create) handler in the same commit: incoming `title` → `titleAr`, `content` → `contentAr`, `published` → `isPublished`, `image` → `image`, `category` → `category`. The current raw-body spread (`const { id, ...data } = body; prisma.news.update({ data })`) passes non-schema field names to Prisma and will throw a P2009 runtime error on every edit once session auth is restored. The handler MUST use explicit field assignment (matching FR-012 and FR-013 conventions) and MUST NOT use raw body spread. *[Clarified 2026-04-05 — Q9: latent PUT bug identified; must be included in the same fix commit.]*

- **FR-020**: Before the code fix is committed, the implementer MUST perform both of the following read-only data integrity checks and record the output: (1) **Supabase dashboard** — open Table Editor → `News` table and confirm all 3 known record IDs (`cmkx1oyfs0008cwzgx9wlj9w7`, `cmkx1oyga0009cwzgclf0fbnt`, `cmkx1oyfb0007cwzgvio444ee`) are present with their correct categories (`INSTITUTE_NEWS`, `EVENTS`, `ANNOUNCEMENTS`) and `isPublished = true`; (2) **local curl** — `curl http://localhost:3100/api/news` confirms the fixed local API returns all 3 records from the remote Supabase DB. The production API MUST NOT be used for pre-deploy integrity verification as it currently returns HTTP 500. No write, delete, or schema operations are permitted during this phase. *[Clarified 2026-04-05 — Q10: both verification paths required together; production API unavailable pre-deploy.]*

- **FR-013**: When the CMS homepage manager sends a new institute news entry to the news data service, it MUST map its internal field shape to the canonical schema fields as follows: CMS `title` → `titleAr`, CMS `description` or `content` → `contentAr`; `titleEn` and `contentEn` MUST be sent as empty strings; `category` MUST be set to `"INSTITUTE_NEWS"` for institute news or `"GENERAL_NEWS"` for general news. No schema migration is required. *[Clarified 2026-04-05: Arabic-first mapping; category distinction added Q5; bilingual UI is out of scope for this fix.]*

- **FR-014**: Before any code change is made, the implementer MUST perform all of the following read-only verification steps and document the result: (1) send `GET /api/news` and confirm the HTTP status and error type; (2) read the `News` table in the production DB directly and confirm whether rows exist; (3) open a browser network tab on the public homepage `/` and confirm that no request to the news data service is fired during page load; (4) open a browser network tab on `/cms/homepage` and confirm that no request to the news data service is fired during page load. *[Clarified 2026-04-05: all four checks required; each is read-only and safe.]*

- **FR-015**: The news data service GET handler MUST support a `category` query parameter filter. When `?category=INSTITUTE_NEWS` is passed, it MUST return only entries where `category = "INSTITUTE_NEWS"`. When `?category=GENERAL_NEWS` is passed, it MUST return only `category = "GENERAL_NEWS"` entries. This MUST be combinable with the `?published=true` filter. No schema change is required — the `category` field already exists. *[Clarified 2026-04-05: enables the two separate homepage news sections (institute vs. general) to each fetch their own data independently.]*

- **FR-006**: All existing institute news entries currently persisted in the production data store MUST be preserved intact; no destructive data operation (deletion, overwrite, schema reset) is permitted as part of this fix.

- **FR-007**: The homepage news display MUST be consistent across browsers, devices, and sessions — no person should see different institute news than another person at the same time unless the data itself differs (i.e., a publish/unpublish action occurred between their visits).

- **FR-008**: When the admin saves changes to institute news via the CMS, the updated information MUST become visible to public homepage visitors within 60 seconds, without requiring any manual deployment, cache clearing, or server restart.

- **FR-009**: If no institute news entries exist or are published, the homepage MUST display a graceful empty state (not a broken layout or an unhandled error).

- **FR-010**: The fix MUST NOT introduce regressions to any other currently working section of the homepage or CMS.

### Key Entities

- **Institute News Entry**: A content item representing a single news article or announcement. Canonical schema fields: `titleAr` (Arabic title), `titleEn` (English title, defaults to empty string), `contentAr`, `contentEn` (defaults to empty string), `image` (URL), `isPublished` (Boolean), `publishDate` (timestamp), `order` (Integer), `isFeatured`, `isInTicker`, `category`. Must be persisted in the production database. *[Field names confirmed from schema — Q2.]*
- **Publication Status**: The `isPublished` Boolean field on each news entry. Controls whether the entry appears to public visitors. The data service filter MUST reference this exact field name. `publishDate` is the associated timestamp field.
- **News Category**: The `category` String field distinguishes news types. Canonical values used by this feature: `"INSTITUTE_NEWS"` (for أخبار المعهد section) and `"GENERAL_NEWS"` (for the general news section). *[Clarified 2026-04-05 — Q5.]*
- **Shared Data Store**: The production database (`News` model) accessed via the news data service endpoint, independent of any individual browser or device.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor with no prior browser state opens the public homepage and sees institute news entries within the normal page load time — 100% of the time, regardless of which device or browser is used.

- **SC-002**: A CMS admin who has never previously opened the CMS on their current browser opens `/cms/homepage` and sees all previously created institute news entries — 100% of the time.

- **SC-003**: After an admin saves a new institute news entry via the CMS, the entry becomes visible to any visitor on the public homepage within 60 seconds, with no manual operator intervention required.

- **SC-004**: Zero existing institute news entries are lost, modified, or made inaccessible as a result of the fix.

- **SC-005**: The public homepage institute news section renders correctly on all major browsers (Chrome, Firefox, Safari, Edge) and on both desktop and mobile viewports.

- **SC-006**: The publication visibility filter functions correctly — unpublished entries are not shown to public visitors, and published entries are always shown.

---

## Assumptions

- **Confirmed root cause (Q1)**: Both `app/(cms)/cms/homepage/page.tsx` and `app/(public)/page.tsx` currently read and write institute news exclusively via `localStorage` (`homepage_institute_news`, `homepage_general_news`). Neither file calls the news data service. The news data service endpoint and the `News` database model exist independently and are unused by both pages. The fix wires both pages to the data service, replacing localStorage.
- **Colleague visibility explained**: The colleague who sees news is the person (or is on the same browser) that previously entered news via the CMS on that specific device — the data was written to that browser's `localStorage` only, making it visible only there.
- The production database (Supabase) is currently active and accessible. If it is paused, the operator will resume it before testing (as documented in CLAUDE.md and KI-CMS-001).
- Institute news entries are strongly believed to already exist in the production database (from direct DB writes or prior admin entry). This spec does not require creating new data — only fixing the read/write path.
- The CMS authentication is operational for the admin user (using the current credentials as documented). This spec does not change or fix the authentication system.
- The fix will not require a schema migration — the existing `News` model has all required fields. If a non-destructive additive change is discovered to be strictly necessary, it will be explicitly justified.
- The fix will require a production deployment to take effect on `sinaiinstitute.com`. The operator controls the deployment timing.
- The production deployment is currently stale (~57+ days). This fix will be an additional commit; a combined deployment is acceptable.
- No new third-party services or infrastructure changes are required — the fix is confined to application code.
- Image/media URLs for news entries may be stored as external URLs (Cloudinary). Image display issues are a separate concern unless they are directly causing news entries to be invisible.
