# Feature Specification: Institute News Homepage Production Sync Fix

**Feature Branch**: `003-news-homepage-sync`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "Diagnose and fix why institute news entered from CMS is not reliably appearing on the public homepage for normal users, while preserving all existing production data in Supabase."

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

- **FR-001**: The public homepage MUST display institute news entries from a shared, persistent data store that is accessible by any visitor on any device or browser, without requiring prior browser state.

- **FR-002**: The CMS "أخبار المعهد" management section MUST read institute news entries from the same shared, persistent data store used by the public homepage — not from browser-local state.

- **FR-003**: The CMS "أخبار المعهد" management section MUST write (create, update, delete) institute news entries to the shared, persistent data store, such that changes are immediately visible to all users system-wide.

- **FR-004**: Institute news entries MUST be retrievable and displayable on the public homepage without requiring the visitor to have ever interacted with the CMS on that browser.

- **FR-005**: The read path for institute news MUST correctly apply any publication/visibility filters (e.g., only showing published or active entries to public visitors). The filter logic MUST use the correct field name as defined in the data schema — no silent filtering failures are acceptable.

- **FR-006**: All existing institute news entries currently persisted in the production data store MUST be preserved intact; no destructive data operation (deletion, overwrite, schema reset) is permitted as part of this fix.

- **FR-007**: The homepage news display MUST be consistent across browsers, devices, and sessions — no person should see different institute news than another person at the same time unless the data itself differs (i.e., a publish/unpublish action occurred between their visits).

- **FR-008**: When the admin saves changes to institute news via the CMS, the updated information MUST become visible to public homepage visitors within 60 seconds, without requiring any manual deployment, cache clearing, or server restart.

- **FR-009**: If no institute news entries exist or are published, the homepage MUST display a graceful empty state (not a broken layout or an unhandled error).

- **FR-010**: The fix MUST NOT introduce regressions to any other currently working section of the homepage or CMS.

### Key Entities

- **Institute News Entry**: A content item representing a single news article or announcement for the institute. Key attributes: title, body/content, publication status, display order, associated media. Must be persisted in the shared production data store.
- **Publication Status**: A flag or field on each news entry that controls whether it appears to public visitors. Must be correctly evaluated when fetching entries for the public homepage.
- **Shared Data Store**: The central persistent storage system (production database) that holds authoritative institute news data accessible to both the CMS and the public homepage, independent of any individual browser or device.

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

- The production database (Supabase) is currently active and accessible. If it is paused, the operator will resume it before testing (as documented in CLAUDE.md and KI-CMS-001).
- Institute news entries are strongly believed to already exist in the production database. This spec does not require creating new data — only fixing the read/write path so existing data is visible.
- The CMS authentication is operational for the admin user (using the current credentials as documented). This spec does not change or fix the authentication system.
- "Shared, persistent data store" refers to the production Supabase PostgreSQL database accessed via the platform's data access layer.
- The fix will not require a schema migration that adds new columns or tables — the existing schema is assumed to have all required fields for news persistence. If a non-destructive schema change is discovered to be strictly necessary, it will be explicitly justified and limited to additive changes only.
- The fix will require a production deployment to take effect on `sinaiinstitute.com`. The operator controls the deployment timing.
- The production deployment is currently stale (~57+ days) and two bug-fix commits are pending. This fix will be an additional commit; a combined deployment is acceptable.
- No new third-party services, CDN configurations, or infrastructure changes are required—the fix is confined to application code and/or data layer configuration.
- Image/media URLs for news entries may be stored as external URLs (Cloudinary). Image display issues are considered a separate concern unless they are directly causing news entries to be invisible.
