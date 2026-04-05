# Domain Model

**Source**: `prisma/schema.prisma` — 301 lines, fully read 2026-03-28  
**DB**: Supabase PostgreSQL · ORM: Prisma 5  
**Strategy**: `prisma db push` only — no migration files exist

> `HomepageSpecialization` does NOT exist in the schema despite a chat session claiming it was added.  
> Current model count: **14**

---

## Entity Map

```
User                  ← CMS admin only; 1 record; auth BYPASSES this table

Department            ← 6 records (seeded, active in production)
  ├── Specialization[]  [onDelete: Cascade]
  ├── Result[]          [onDelete: Cascade]  ← POST route is broken
  │     └── StudentResult[]  [onDelete: Cascade]
  └── Schedule[]         [onDelete: Cascade]
        └── Lecture[]    [onDelete: Cascade]

Page                  ← CMS pages (GrapesJS content)
  ├── Page[]            (children — self-ref) [onDelete: Cascade]
  ├── PageBlock[]       [onDelete: Cascade]
  └── PageVersion[]     [onDelete: Cascade]

News                  ← standalone; ✅ GET filter fixed 2026-04-05 (see R-04 resolved)
Application           ← standalone; nationalId UNIQUE
Complaint             ← standalone
ContactMessage        ← standalone
WidgetTemplate        ← standalone; NO API route; likely unused
Setting               ← key/value store; underused — homepage news now wired to /api/news (✅ fixed 2026-04-05); other sections still localStorage
```

---

## Model Reference

### `User`

| Field | Type | Notes |
|-------|------|-------|
| id | CUID | PK |
| name | String | |
| email | String | unique |
| password | String | bcrypt hash — **NOT used for login** |
| role | String | default `"EDITOR"` · seed writes `"SUPER_ADMIN"` · auth ignores this field |

> **Auth bypass**: `lib/auth.ts` performs a hardcoded string comparison. The `password` field in this table is irrelevant to production login. Role is always hardcoded `'SUPER_ADMIN'` in the session.

---

### `Department`

| Field | Type | Notes |
|-------|------|-------|
| nameAr / nameEn | String | bilingual |
| description | String? | |
| image | String? | Cloudinary URL |
| head | String? | head's name only |
| order | Int | display sort |
| isActive | Boolean | default true |

**Cascade risk**: Deleting a Department destroys ALL its Results (+ StudentResults), Schedules (+ Lectures), and Specializations simultaneously. No soft-delete pattern.

---

### `Specialization`

| Field | Type | Notes |
|-------|------|-------|
| departmentId | String | FK Department |
| nameAr / nameEn | String | |
| year | Int | academic year |
| order / isActive | Int / Boolean | |

---

### `Result` ⚠️ API Broken

| Schema field | Schema type | API sends | Match? |
|-------------|-------------|-----------|-------|
| departmentId | String | ✅ | ✅ |
| year | Int | parseInt(year) | ✅ |
| semester | **String** | parseInt(semester) | ❌ type mismatch |
| academicYear | String (required) | not sent | ❌ missing |
| pdfUrl | String? | ✅ | ✅ |
| isVisible | Boolean | sends `published` | ❌ wrong field name |
| allowDownload | Boolean | ✅ | ✅ |
| publishDate | DateTime? | sends `publishedAt` | ❌ wrong field name |
| — | — | sends `title` | ❌ field doesn't exist |

**Result**: `POST /api/results` throws Prisma P2009 at runtime — cannot create results.  
**GET also broken**: `orderBy: { publishedAt: 'desc' }` references non-existent field.

---

### `StudentResult`

| Field | Type | Notes |
|-------|------|-------|
| resultId | String | FK Result |
| studentId | String | external — no FK to User or any student table |
| studentName | String | denormalized |
| gpa | Float | |
| grade / status | String | no enum constraint |

---

### `Schedule`

Same structure as `Result` for `semester` (String vs API parseInt). Schedule POST likely works — `isVisible` field name matches schema (unlike Result's `published` mismatch).

---

### `Lecture`

Day/time/course/instructor/room as plain strings. No validation, no FK to any person model.

---

### `News` ✅ Fixed 2026-04-05 (`003-news-homepage-sync`)

| Field | Notes |
|-------|-------|
| titleAr / titleEn | bilingual |
| contentAr / contentEn | rich text |
| image | Cloudinary URL |
| **isPublished** | Boolean — ✅ GET route: `isPublished` (correct, fixed 2026-04-05) |
| **publishDate** | DateTime? — ✅ GET orderBy: `publishDate` (correct, fixed 2026-04-05) |
| isFeatured | Boolean |
| isInTicker | Boolean |
| category | String — `INSTITUTE_NEWS` / `GENERAL_NEWS` / `EVENTS` / `ANNOUNCEMENTS` |

**POST**: `title→titleAr`, `content→contentAr`, `published→isPublished` (correct, fixed 2026-04-05)  
**PUT**: explicit field mapping — no raw body spread (fixed 2026-04-05, prevents Prisma P2009)  
**Homepage**: both `/` and `/cms/homepage` now fetch from `/api/news` — not `localStorage`

---

### `Application`

| Field | Type | Notes |
|-------|------|-------|
| nationalId | String | UNIQUE — DB-enforced deduplication |
| highSchoolGrade | Float | 0–410 scale (Egyptian) — no constraint |
| firstChoice | String | Dept name, **not FK** — denormalized |
| status | String | `"PENDING"` / `"ACCEPTED"` / `"REJECTED"` — no enum |

No FK to Department. Historical application records retain department name even if dept is renamed.

---

### `Complaint`

Free-text fields. `attachments` stored as String (URL — format ambiguous). Status lifecycle via PUT.

---

### `Page` (CMS)

| Field | Notes |
|-------|-------|
| slug | UNIQUE |
| parentId | Self-referential FK (Cascade) — supports 3 nav levels |
| level | Int (1=root, 2=child, 3=grandchild) |
| customCSS / customJS | Free-form code — XSS risk when rendered server-side |
| contentAr / contentEn | Raw HTML — `dangerouslySetInnerHTML` |
| currentVersion | Int incremented on block save |
| metaTitle / metaDesc / metaKeywords | String? — SEO fields |

**Cascade risk**: Deleting parent page deletes all child pages + their blocks + versions.

---

### `PageBlock`

All content/settings as serialized JSON strings. `parentBlockId` is a loose string reference — no Prisma relation defined. Block save via `deleteMany` + `create` is **non-atomic** (no `prisma.$transaction`).

---

### `PageVersion`

| Field | Notes |
|-------|-------|
| pageId + version | `@@unique` composite — enforced |
| blocksData | JSON snapshot |
| title | String (required) |

No restore API observed. Versions captured but unrestorable through any current UI.

---

### `WidgetTemplate`

Complete model; complete fields. Zero `prisma.widgetTemplate` calls in any API route. **Dead model** — UI never built.

---

### `Setting`

```prisma
model Setting {
  key   String @unique
  value String
}
```

Intended as homepage config store. Currently underused — homepage content still in `localStorage`. One reference found in CMS settings page (uncertain depth).

---

## Schema Risks Summary

| Risk | Details |
|------|---------|
| R-01 | No enum constraints — any status string can be inserted |
| R-02 | `semester` String vs API parseInt — type mismatch, unreliable filtering |
| R-03 | `Result` API uses 3 wrong field names — POST broken at runtime |
| R-04 | ~~`News` GET filter uses `published` instead of `isPublished` — filter silently ignored~~ **✅ RESOLVED 2026-04-05** (`003-news-homepage-sync`) — GET filter, orderBy, POST, and PUT all corrected |
| R-05 | Cascade deletes across Department, Result, Page — irreversible without backups |
| R-06 | `PageBlock` save is non-atomic — partial failure causes data loss |
| R-07 | `prisma/dev.db` committed to git — may contain real PII |

---

## No Migration History

```
prisma/
├── schema.prisma   ✅
├── seed.ts         ⚠️ runs deleteMany() on departments + news
├── dev.db          ⚠️ committed, 299KB, possible PII
└── migrations/     ❌ does not exist
```

All schema changes have been applied with `prisma db push`. No rollback mechanism exists. Before any schema work: take a Supabase manual backup.
