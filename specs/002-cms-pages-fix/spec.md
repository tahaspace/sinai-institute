# Feature Specification: CMS Pages Regression Stabilization

**Feature Branch**: `002-cms-pages-fix`  
**Created**: 2026-03-29  
**Status**: Draft  
**Input**: User description: "cms-pages-regression-stabilization — stabilize CMS pages loading and homepage header rendering before any deployment"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — CMS Admin Loads the Pages List (Priority: P1)

The CMS administrator navigates to the page management screen and expects to see a list of all pages that have been created. Currently, the screen shows "لا توجد صفحات" (no pages) even when pages are known to exist in the production database. The administrator cannot manage, edit, or launch the Page Builder for any existing page because the list fails to populate.

**Why this priority**: This is the entry point for all CMS page management. Without a working page list, the Page Builder, page editing, and navigation management are all inaccessible. This is the most visible regression affecting the admin's core workflow.

**Independent Test**: Can be fully tested by navigating to `/cms/pages` as an authenticated admin and confirming the page list renders with at least the known pages from the database — without any error toast or "no pages" empty state.

**Acceptance Scenarios**:

1. **Given** pages exist in the database and the admin is authenticated, **When** the admin opens `/cms/pages`, **Then** the page list renders with one card per page showing title, slug, status badge, and action buttons.
2. **Given** the database has pages, **When** the client fetches `/api/pages`, **Then** the response is a successful JSON object with a `pages` array containing the stored pages.
3. **Given** the admin is not authenticated, **When** `/cms/pages` is accessed, **Then** the user is redirected to the login screen (not an error page).
4. **Given** a transient database connectivity error, **When** the admin opens `/cms/pages`, **Then** a descriptive error message is shown — not a silent empty state.

---

### User Story 2 — CMS Admin Launches the Page Builder (Priority: P2)

After the page list loads correctly, the CMS administrator clicks "Page Builder" on an existing page and expects the GrapesJS visual editor to open and be functional. Currently, no page cards appear so the Page Builder is effectively unreachable.

**Why this priority**: The Page Builder is the primary tool for managing website content. Its inaccessibility is a direct consequence of the page list regression and must be restored as part of the same stabilization slice.

**Independent Test**: Can be fully tested by clicking the "Page Builder" button on any listed page and confirming GrapesJS editor loads with the page's existing block content displayed.

**Acceptance Scenarios**:

1. **Given** the page list loads correctly, **When** the admin clicks "Page Builder" on a page, **Then** the GrapesJS editor opens at `/cms/page-builder-grapes/[id]` without error.
2. **Given** a page with existing saved block content, **When** the editor opens, **Then** the previously saved blocks are visible in the canvas.
3. **Given** a brand-new page with no blocks, **When** the editor opens, **Then** an empty editable canvas is shown.

---

### User Story 3 — Public Homepage Renders Correct Navigation (Priority: P3)

A public visitor loading the homepage (`/`) expects to see the full site navigation in the header — including links to all published pages configured to appear in the header (e.g., About, Admission, Departments, Contact). Currently the header renders only a static fallback label "الرئيسية" and all other CMS-driven navigation links are missing.

**Why this priority**: This affects every public visitor. The navigation is driven by pages loaded from the database. Fixing the page loading failure (P1) is expected to restore this rendering as well — but it must be explicitly verified as part of this stabilization.

**Independent Test**: Can be fully tested by opening the homepage and confirming navigation links (beyond "الرئيسية") appear in the header — with links that correspond to pages marked `showInHeader = true` in the database.

**Acceptance Scenarios**:

1. **Given** pages with `showInHeader = true` exist in the database, **When** a public visitor loads `/`, **Then** those page titles appear as navigation links in the site header.
2. **Given** no pages with `showInHeader = true` exist in the database, **When** the homepage loads, **Then** only the fallback/static navigation is shown — no error, no crash.
3. **Given** a page is marked unpublished but `showInHeader = true`, **Then** it does NOT appear in the public header.

---

### Edge Cases

- What happens when the database is reachable but the `Page` table is empty (zero rows)? → The CMS "no pages" state should render as expected (empty state is valid when genuinely empty, not just on error).
- What happens when the database credentials are invalid or the external database is unreachable? → Both the CMS page list and homepage header should fail gracefully with a clear error — not a silent empty state that looks like "no data".
- What happens when a page exists in the database but was never published? → It should appear in the CMS list but not in the public header or public slug route.
- What happens when the homepage component can't reach the pages API due to auth misconfiguration? → The header should not strip existing links — it should degrade gracefully to a static fallback.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The page list endpoint MUST return all stored pages as a successful response when the database is reachable and credentials are valid.
- **FR-002**: The CMS page list screen MUST display a distinct, visually differentiated error state (e.g., an error card with retry option) when the pages API returns a non-2xx response — it MUST NOT render the same "لا توجد صفحات" empty-state for both genuine zero rows and an API failure. This requires a code change to the CMS component in addition to the credential fix.
- **FR-003**: The CMS page list screen MUST display all pages returned by the API when the API succeeds, without requiring any additional interaction.
- **FR-004**: When the pages API succeeds and returns pages, each page card MUST show: Arabic title, slug, published status, and a link to open the Page Builder.
- **FR-005**: Opening the Page Builder for an existing page MUST load the correct page's content (blocks, if any) without error.
- **FR-006**: The public homepage header MUST render navigation links for every page that exists in the database with `showInHeader = true` and `isPublished = true`.
- **FR-007**: The system MUST NOT perform any destructive database operations (delete, reset, truncate) as part of this stabilization.
- **FR-008**: The local development environment MUST be configurable to connect to the database without requiring a code change — connectivity is restored through environment configuration, not code modification where possible.
- **FR-009**: Any error encountered by the pages API MUST surface a distinguishable error response that the client can use to render a distinct error state (versus an authentic empty list).
- **FR-010**: After this stabilization, the database connectivity verification described in the local pre-deployment verification plan MUST pass all checks without manual intervention beyond environment configuration.
- **FR-011**: All component-level changes MUST be scoped to `app/(cms)/cms/pages/page.tsx` only. The duplicate route at `app/(cms)/cms/pages-new/page.tsx` is explicitly OUT OF SCOPE for this stabilization.

### Key Entities

- **Page**: Represents a website page. Key attributes: `id`, `titleAr`, `titleEn`, `slug`, `isPublished`, `showInHeader`, `showInFooter`, `level`, `order`, `customCSS`, `customJS`. Blocks are related children.
- **PageBlock**: A content block within a page. Belongs to one Page. Has `type`, `content` (JSON), `order`, `isVisible`.
- **Navigation**: A derived view — the ordered list of published Pages with `showInHeader = true`, used to populate the site header.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When database credentials are correctly configured, the CMS administrator can view all existing pages within 3 seconds of opening the page management screen — with zero "no pages" false negatives.
- **SC-002**: 100% of pages stored in the database with `showInHeader = true` and `isPublished = true` appear as navigation links in the public homepage header.
- **SC-003**: The administrator can open the GrapesJS Page Builder for any listed page within 2 seconds of clicking the button — without encountering an error page or blank screen.
- **SC-004**: When a database connectivity error occurs, the CMS admin sees a distinct error message (not the "no pages" empty state) within 5 seconds — enabling diagnosis without guessing.
- **SC-005**: No data is deleted from or altered in the external production database during or after this stabilization work.

---

## Clarifications

### Session 2026-03-29

- Q: Has the Supabase database password been rotated (operator task T008), or does the original password still apply? → A: Unsure — Supabase dashboard must be checked to determine current password status before `.env` can be corrected. The correct password to use in `.env` is whichever is currently active in Supabase, which cannot be determined from the codebase alone.
- Q: Is the homepage header showing only "الرئيسية" because the `localStorage['cms_pages']` fallback is empty, or because the fallback is not being read? → A: Not verified yet — the browser's localStorage has not been inspected. Verification must be performed in a browser devtools session before implementation to determine whether the fallback has pre-existing page data or is genuinely empty.
- Q: How should the CMS page list behave when the API returns an error — and should a code fix accompany the credential fix? → A: Both fixes required. Restore `.env` credentials to resolve root cause (primary fix); also add a distinct error state to the CMS component so the admin sees "API error" not "no pages" for any future transient failure (secondary fix). Both are in scope for this slice.
- Q: Which pages management route is canonical — `/cms/pages` or `/cms/pages-new`? → A: `/cms/pages` is canonical. `/cms/pages-new` is a duplicate and is out of scope for this stabilization. All component-level fixes apply only to `app/(cms)/cms/pages/page.tsx`.
- Q: Should local `.env` switch to port 6543 + pgbouncer to match production, or keep port 5432 for local dev tools? → A: Use port 5432 (direct session mode) in local `.env`. Port 6543 + pgbouncer is for Vercel serverless production only. Local development uses 5432 so that `prisma db pull`, `prisma studio`, and schema tools work without restriction.

---

## Assumptions

- The external production database (Supabase PostgreSQL, eu-west-1) is active and reachable. If it is paused or the project is deleted, connectivity cannot be restored through code changes alone.
- The database schema already contains the `Page` and `PageBlock` tables. If these tables do not exist in production, a schema migration will be needed — but no migration is performed by default in this spec without explicit evidence.
- Pages with content already exist in the production database based on historical context (seeding and migration operations were performed in prior sessions per chat history).
- **The Supabase database password status is unconfirmed** — the operator must verify in the Supabase dashboard whether T008 (password rotation) was completed. If rotated, the new password must be placed in `.env`; if not rotated, the original password `SinaiInstitute2026!` is still active and must be placed in `.env`.
- **Local `.env` `DATABASE_URL` must use port 5432** (direct session mode) for local development. Port 6543 with `pgbouncer=true` is reserved for the Vercel dashboard `DATABASE_URL` (production serverless). The two environments intentionally use different connection strings. Pattern: `postgresql://postgres.PROJECTREF:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`.
- The root cause of the "لا توجد صفحات" symptom is confirmed as a database credential mismatch — the API returns HTTP 500 with `FATAL: Tenant or user not found`, meaning authentication against Supabase fails. The code path itself is not structurally broken.
- The homepage header (`components/layouts/public-header.tsx`) fetches `/api/pages?published=true` and falls back to `localStorage['cms_pages']` on error. Restoring DB connectivity will restore the header. The localStorage fallback is why only "الرئيسية" appears — it is a hardcoded fallback, not DB data.
- The GrapesJS Page Builder route exists at `app/(cms)/cms/page-builder-grapes/[id]/page.tsx` with correct dynamic import (`ssr: false`). It is inaccessible only because the page list fails to render page cards — a cascading failure, not a routing or flag bug.
- Only the single CMS administrator user (`admin@sainaiinstitute.com`) uses the CMS. No multi-user access control is involved in this stabilization.
- This spec does not require schema changes. If schema changes become necessary during investigation, they will be out of scope and require a separate spec.
