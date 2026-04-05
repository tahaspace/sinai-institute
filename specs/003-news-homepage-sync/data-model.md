# Data Model: Institute News Homepage Production Sync Fix

**Feature**: `003-news-homepage-sync` | **Date**: 2026-04-05

---

## Entity: News (existing model — no migration required)

```prisma
model News {
  id          String    @id @default(cuid())
  titleAr     String                          // Arabic title (required) ← CMS "title" maps here
  titleEn     String                          // English title (set to "" in this feature)
  contentAr   String                          // Arabic content ← CMS "description/content" maps here
  contentEn   String                          // English content (set to "" in this feature)
  image       String?                         // Media URL (Cloudinary or external)
  category    String    @default("NEWS")      // "INSTITUTE_NEWS" | "GENERAL_NEWS" | "NEWS"
  isFeatured  Boolean   @default(false)
  isInTicker  Boolean   @default(false)
  isPublished Boolean   @default(false)       // Publication gate — public GET filters on this
  publishDate DateTime?                       // Set to now() when isPublished = true
  order       Int       @default(0)           // Display order within category
  views       Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([isPublished])
  @@index([isFeatured])
  @@index([isInTicker])
}
```

---

## Category Values (canonical for this feature)

| Value | Used by | Description |
|---|---|---|
| `"INSTITUTE_NEWS"` | CMS institute news section + public homepage | أخبار المعهد section |
| `"GENERAL_NEWS"` | CMS general news section + public homepage | General news section |
| `"NEWS"` | Legacy default (may exist in DB from prior test data) | Check in Phase 1.2 |

---

## Field Mapping: CMS → API → Schema

| CMS Storage Field | API Request Body | Schema Field |
|---|---|---|
| `title` | `title` | `titleAr` (mapped in route) |
| `description` or `content` | `content` | `contentAr` (mapped in route) |
| `imageUrl` | `image` | `image` |
| `isPublished` | `published` | `isPublished` (mapped in route) |
| *(implicit)* | `category: "INSTITUTE_NEWS"` | `category` |
| — | `""` | `titleEn` (defaulted in route) |
| — | `""` | `contentEn` (defaulted in route) |

---

## State Transitions: News Entry Lifecycle

```
[CMS SAVE]
  POST /api/news { ..., isPublished: true, category: "INSTITUTE_NEWS" }
       ↓
  News row created in Supabase (isPublished=true)
       ↓
[PUBLIC HOMEPAGE LOAD]
  GET /api/news?category=INSTITUTE_NEWS&published=true
       ↓ (returns rows where isPublished=true AND category="INSTITUTE_NEWS")
  Homepage renders institute news section ← visible to ALL visitors

[CMS DELETE]
  DELETE /api/news?id={id}
       ↓
  News row deleted from Supabase
       ↓
[PUBLIC HOMEPAGE NEXT LOAD]
  Entry no longer returned → no longer visible
```

---

## Validation Rules

- `titleAr`: required, non-empty string
- `contentAr`: required (empty string acceptable)
- `category`: must be set; never omit (defaults to `"NEWS"` which is not matched by either homepage filter)
- `isPublished`: must be `true` for entry to appear on public homepage
- `image`: optional; null is acceptable; homepage renders graceful fallback

---

## Notes on Existing Data

At time of spec: the `News` table may contain rows with `category = "NEWS"` from prior development/testing. These rows will **not** appear in `?category=INSTITUTE_NEWS` queries. This is a known risk documented in the Risk Register. Operator should check the table in Phase 1.2 and decide whether to update those rows' categories manually via Supabase dashboard (safe, targeted UPDATE — no data loss).
