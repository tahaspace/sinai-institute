# Database and Prisma Audit

**Source**: `prisma/schema.prisma` (full read), `prisma/seed.ts` (full read), all `app/api/*/route.ts` files  
**Last updated**: 2026-03-28

---

## 1. Configuration

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Runtime override**: `lib/prisma.ts` bypasses `env("DATABASE_URL")` in production by passing a hardcoded URL directly to the `PrismaClient` constructor's `datasources.db.url` option. The `schema.prisma` `url = env("DATABASE_URL")` is irrelevant at production runtime.

**Actual production connection string** (from `lib/prisma.ts`, committed to git):
```
postgresql://postgres.eacpjbbpwonwmthutxow:SinaiInstitute2026!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```
- Host: `aws-1-eu-west-1.pooler.supabase.com` (Supabase Frankfurt pooler)
- Port: **5432** (session/direct mode — NOT transaction pooler port 6543)
- Database: `postgres`
- No `?pgbouncer=true` parameter

**Logging**: `log: ['error', 'warn']` — errors and warnings only (no query logging)

---

## 2. Migration Posture

**Strategy**: `prisma db push` only — no migration files.

```
prisma/
├── schema.prisma   ✅
├── seed.ts         ✅
├── dev.db          ✅ (SQLite, 299KB, committed to git)
└── migrations/     ❌ Does not exist
```

**Implications**:
- No rollback capability — a destructive schema change cannot be undone
- No deployment history — impossible to know what schema version is in production
- No `prisma migrate deploy` possible — switching to migrations later requires a baseline migration
- `db push` is safe for additive changes (new models, new optional fields)
- `db push` with deletions (dropping columns, renaming fields) will attempt to drop without warning in non-interactive mode
- `prisma db pull` can be used to generate a snapshot of the current production schema for comparison

**To diagnose schema drift** (production vs. local):
```bash
DATABASE_URL="postgresql://...5432/postgres" npx prisma db pull
diff prisma/schema.prisma prisma/schema.prisma.backup
```

---

## 3. Data Model Summary

### 14 Models

```
User                (1 record expected — single admin)
Department          (6 seeded — immutable categories)
  └── Specialization[] CASCADE
  └── Result[]         CASCADE
       └── StudentResult[] CASCADE
  └── Schedule[]       CASCADE
       └── Lecture[]        CASCADE
News                (standalone)
Application         (standalone, nationalId unique)
Complaint           (standalone)
ContactMessage      (standalone)
Page                (self-referential tree)
  └── PageBlock[]      CASCADE
  └── PageVersion[]    CASCADE
WidgetTemplate      (standalone — no API, likely unused)
Setting             (key-value store — underused)
```

### Model Field Inventory

#### User
| Field | Type | Constraint |
|-------|------|-----------|
| id | CUID | PK |
| name | String | required |
| email | String | UNIQUE |
| password | String | bcrypt hash (in seed); NOT used in active auth |
| role | String | default `"EDITOR"`; seed writes `"SUPER_ADMIN"` |

> No FK relations. Standalone. Auth bypasses this table entirely.

#### Department
| Field | Type | Notes |
|-------|------|-------|
| nameAr / nameEn | String | bilingual |
| description | String? | nullable |
| image | String? | Cloudinary URL or relative path |
| head | String? | dept head name only |
| order | Int | display sort |
| isActive | Boolean | soft filter (`where: { isActive: true }` in API) |

**Cascade risk**: Deleting a Department cascades to ALL Specializations, Results (+ StudentResults), and Schedules (+ Lectures).

#### Specialization
| Field | Type | Notes |
|-------|------|-------|
| departmentId | String | FK Department [CASCADE] |
| nameAr / nameEn | String | |
| year | Int | academic year number |
| order / isActive | Int / Boolean | |

#### Result ⚠️
| Field | Type | API sends | Match? |
|-------|------|-----------|-------|
| departmentId | String | departmentId | ✅ |
| year | Int | parseInt(year) | ✅ |
| semester | **String** | parseInt(semester) | ❌ Type mismatch (int sent, string stored) |
| academicYear | String | not in POST body | ❌ Required but missing |
| pdfUrl | String? | pdfUrl | ✅ |
| isVisible | Boolean | sends `published` | ❌ Wrong field name |
| allowView | Boolean | not sent | missing (uses default) |
| allowDownload | Boolean | allowDownload | ✅ — but mapped wrong |
| publishDate | DateTime? | sends `publishedAt` | ❌ Wrong field name |
| — | — | sends `title` | ❌ Field doesn't exist in model |

**Result**: `POST /api/results` throws `Prisma P2009: Unknown field 'title' in record creation, Unknown field 'published'`. **The CMS cannot create results.** GET still works (returns empty array or any existing records).

**GET ordering bug**: `orderBy: { publishedAt: 'desc' }` — `publishedAt` does not exist in the Result model. Prisma will throw or fall back; behavior at runtime is a silent failure or error.

#### StudentResult
| Field | Type | Notes |
|-------|------|-------|
| resultId | String | FK Result [CASCADE] |
| studentId | String | external — no FK to User or any student model |
| studentName | String | denormalized |
| gpa | Float | |
| grade / status | String | no enum constraint |

#### Schedule
Same structure as Result; same `semester` String vs. API parseInt() mismatch. POST sends `isVisible` correctly (matching schema) — schedule creation likely works, unlike results.

#### Lecture
Day/time/course/instructor/room as strings. All text — no validation.

#### News ⚠️
| Field | Type | API sends | Match? |
|-------|------|-----------|-------|
| isPublished | Boolean | sends `published` | ❌ Wrong field name |
| — | — | `publishedAt` | ❌ No `publishedAt` field in News model |

**Note**: `prisma.news.findMany({ where: { published: ... } })` in GET also uses wrong field name. However the TypeScript compiler would catch this if not suppressed. The build ships with this error silently.

#### Application
| Field | Type | Notes |
|-------|------|-------|
| nationalId | String | UNIQUE — deduplication enforced at DB level |
| highSchoolGrade | Float | expected 0–410 (Egyptian grading), no constraint |
| firstChoice | String | department name denormalized (not FK) |
| status | String | `"PENDING"`, `"ACCEPTED"`, `"REJECTED"` — no enum |

No FK to Department. Department choice is stored as a free-text string — if a department is renamed, historical applications show the old name.

#### Complaint
Free-text fields. `attachments` stored as String (URL or serialized path — ambiguous). Status lifecycle: `"PENDING"` → string value via PUT.

#### Page (CMS)
| Field | Type | Notes |
|-------|------|-------|
| slug | String | UNIQUE — enforced at DB and API level |
| parentId | String? | self-referential FK [CASCADE] — supports 3 nav levels |
| level | Int | 1=root, 2=child, 3=grandchild — maintained by API |
| customCSS / customJS | String? | Free-form code executed in public pages — XSS risk |
| contentAr / contentEn | String? | Raw HTML — rendered via `dangerouslySetInnerHTML` |
| createdBy / updatedBy | String? | Not FK to User; never populated by any observed code |
| currentVersion | Int | Incremented by blocks API when `createVersion=true` |

**Cascade warning**: `parentId` uses `onDelete: Cascade`. Deleting a parent page deletes all child and grandchild pages silently.

#### PageBlock
All content/settings stored as raw strings (serialized JSON). `parentBlockId` enables nesting — but no Prisma relation is defined for `parentBlockId`; it's a loose string reference only.

#### PageVersion
| Field | Type | Notes |
|-------|------|-------|
| pageId + version | Int | `@@unique([pageId, version])` — composite unique |
| blocksData | String | JSON snapshot of blocks at save time |
| title | String | required — populated from `page.titleAr` |

No restore API observed. Versions are captured but cannot be restored through any documented UI flow.

#### WidgetTemplate
Complete model with `name`, `type`, `thumbnail`, `data`, `category`, `isActive`. No `prisma.widgetTemplate` call found in any API route. **Likely unused.**

#### Setting
```prisma
model Setting {
  key   String @unique
  value String
}
```
Intended as global config store. Only 1 `prisma.setting` method call found in codebase (in CMS settings page — uncertain depth). Homepage config (social media, slides, stats, specializations) is in `localStorage` instead of this table.

---

## 4. Indexes

All models have relevant indexes. Summary of notable ones:

| Model | Indexed fields |
|-------|---------------|
| News | `isPublished`, `isFeatured`, `isInTicker` |
| Application | `status`, `email` |
| Complaint | `status` |
| ContactMessage | `isRead` |
| Page | `slug`, `isPublished`, `parentId`, `showInHeader`, `showInFooter` |
| PageBlock | `pageId`, `order`, `type` |

No composite indexes. All are single-column `@index`. For `Page`, the `slug` index is redundant with the `@@unique([slug])` constraint — unique constraints imply an index.

---

## 5. Risky Schema Areas

### R-01 — No enum constraints on status fields (High)
`Application.status`, `Complaint.status`, `News.category`, `Result.semester` (String), `User.role` — all plain strings. Any value can be inserted. No DB-level validation.

**Example**: If API sends `status: 'APPROVED'` instead of `'ACCEPTED'`, it persists and the CMS filter for `'ACCEPTED'` never matches.

### R-02 — `semester` typed as String but APIs send Integer (High)
Both `Result` and `Schedule` models define `semester` as `String`. Both POST handlers do `parseInt(semester)` and pass the result to Prisma. Prisma with `postgresql` provider will coerce `Int` to `String` at the DB level in some cases, but this is unreliable and type-checking would catch it if not suppressed. Filtering by `semester` uses `parseInt` again — if stored as `"1"` and queried as `1`, the comparison may fail.

### R-03 — `Result` API uses non-existent fields (Critical)
Fully documented above. `POST /api/results` is broken at runtime. `GET /api/results` uses non-existent `orderBy: { publishedAt: 'desc' }` — will throw Prisma P2009 or silently fail.

### R-04 — `News` GET filter uses wrong field name (Medium)
`GET /api/news` where filter uses `{ published: ... }` — correct field is `isPublished`. Filter is silently ignored, returning all news regardless of published status when `?published=` query param is passed.

### R-05 — Cascade deletes are irreversible (High)
Three cascade chains:
- Delete Department → all Results, Schedules, Specializations gone
- Delete Result → all StudentResults gone  
- Delete Page → all child pages, PageBlocks, PageVersions gone

No soft-delete pattern exists. No confirmation gate in the schema. Data recovery requires Supabase Point-in-Time Recovery (only available on Pro plan).

### R-06 — `PageBlock` save is non-atomic (Medium)
`POST /api/pages/[id]/blocks` does:
1. `prisma.pageBlock.deleteMany({ where: { pageId } })`
2. `Promise.all(blocks.map(b => prisma.pageBlock.create(b)))`

If any `create` fails after `deleteMany` succeeds, the page loses all its blocks with no recovery path. The operations are not wrapped in a `prisma.$transaction()`.

Atomic fix:
```typescript
await prisma.$transaction([
  prisma.pageBlock.deleteMany({ where: { pageId } }),
  ...blocks.map(b => prisma.pageBlock.create({ data: b })),
]);
```

### R-07 — `prisma/dev.db` committed with data (Medium)
The SQLite file (299KB) was used for local development and migration. `migrate-data.ts` reads Users, Departments, Specializations, Pages from it — confirming it contains real data. Likely includes Application records (with `nationalId`, `birthDate`, `phone`, `email`). This is git-tracked PII.

---

## 6. Code Paths Tightly Coupled to Prisma

All Prisma calls are in `app/api/*/route.ts`. No page component imports Prisma directly.

| Access pattern | Files | Method |
|---------------|-------|--------|
| `prisma.page.*` | `api/pages/route.ts`, `api/pages/[id]/route.ts`, `api/pages/[id]/blocks/route.ts` | findMany, findUnique, create, update, delete |
| `prisma.department.*` | `api/departments/route.ts` | findMany, create, update, delete |
| `prisma.news.*` | `api/news/route.ts` | findMany, create, update, delete |
| `prisma.application.*` | `api/applications/route.ts` | findMany, findUnique, create, update |
| `prisma.complaint.*` | `api/complaints/route.ts` | findMany, create, update |
| `prisma.result.*` | `api/results/route.ts` | findMany, create ❌, update, delete |
| `prisma.schedule.*` | `api/schedules/route.ts` | findMany, create, update, delete |
| `prisma.pageBlock.*` | `api/pages/[id]/blocks/route.ts` | deleteMany, create |
| `prisma.pageVersion.*` | `api/pages/[id]/blocks/route.ts` | create |
| `prisma.user.*` | `api/auth/[...nextauth]/route.ts` via PrismaAdapter | findUnique (never called — auth bypassed) |
| `prisma.department.*` | `prisma/seed.ts` | deleteMany ⚠️, create |
| `prisma.news.*` | `prisma/seed.ts` | deleteMany ⚠️, create |

**`prisma.$transaction()`**: Not used anywhere in the codebase. All multi-step operations are non-atomic.

**Prisma error handling**: All API routes catch errors with a generic `try/catch` and return a 500. No Prisma-specific error code handling (e.g., P2002 for unique constraint violation — the `nationalId` duplicate case in applications returns a proper 409 only because there's an explicit pre-check, not Prisma error matching).

---

## 7. Seed Script Safety

`npm run prisma:seed` runs `prisma/seed.ts` via `tsx`.

**Safe operations in seed**:
- `prisma.user.upsert({ where: { email: '...' }, update: {}, create: { ... } })` — idempotent for admin user

**Destructive operations in seed**:
```typescript
await prisma.department.deleteMany({});  // line ~35 — WIPES ALL DEPARTMENTS
// (cascade deletes all Results, Schedules, Specializations)
await prisma.news.deleteMany({});        // ~line 65 — WIPES ALL NEWS
```

**Target DB**: `DATABASE_URL` from `.env` → currently production Supabase.

**Do not run** unless `DATABASE_URL` is overridden to a safe local/test DB and you accept wiping departments and news.
