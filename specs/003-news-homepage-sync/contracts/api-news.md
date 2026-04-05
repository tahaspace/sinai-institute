# API Contract: /api/news

**Feature**: `003-news-homepage-sync` | **Date**: 2026-04-05  
**Route file**: `app/api/news/route.ts`  
**Auth**: GET is public (no session required). POST, PUT, DELETE require valid `getServerSession()`.

---

## GET /api/news

Returns a list of news entries. Supports optional filtering by `category` and `published` status.

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `category` | `string` | No | Filter by category value. E.g. `INSTITUTE_NEWS`, `GENERAL_NEWS`, `NEWS` |
| `published` | `"true"` \| `"false"` | No | Filter by `isPublished` field. Omit to return all. |

### Usage by this feature

| Consumer | Query | Expected result |
|---|---|---|
| Public homepage — institute section | `GET /api/news?category=INSTITUTE_NEWS&published=true` | `isPublished=true` rows with `category="INSTITUTE_NEWS"`, ordered by `publishDate DESC` |
| Public homepage — general section | `GET /api/news?category=GENERAL_NEWS&published=true` | Same, for `GENERAL_NEWS` |
| CMS homepage — institute section (load) | `GET /api/news?category=INSTITUTE_NEWS` | All rows (published + unpublished) for admin management |
| CMS homepage — general section (load) | `GET /api/news?category=GENERAL_NEWS` | All rows for `GENERAL_NEWS` |

### Response (200 OK)

```json
[
  {
    "id": "clxxxxxxxxxx",
    "titleAr": "عنوان الخبر",
    "titleEn": "",
    "contentAr": "محتوى الخبر",
    "contentEn": "",
    "image": "https://res.cloudinary.com/...",
    "category": "INSTITUTE_NEWS",
    "isFeatured": false,
    "isInTicker": false,
    "isPublished": true,
    "publishDate": "2026-04-05T17:00:00.000Z",
    "order": 0,
    "views": 0,
    "createdAt": "2026-04-05T17:00:00.000Z",
    "updatedAt": "2026-04-05T17:00:00.000Z"
  }
]
```

### Response (500 — before fix)

```json
{ "error": "فشل في جلب الأخبار" }
```

Caused by `orderBy: { publishedAt: 'desc' }` — field does not exist. Fixed in Phase 2.

---

## POST /api/news

Creates a new news entry. **Requires authentication** (session cookie).

### Request Body

```json
{
  "title": "string (required)",
  "content": "string (required)",
  "category": "INSTITUTE_NEWS | GENERAL_NEWS | NEWS",
  "image": "string | null (optional)",
  "published": "boolean (optional, default: true)",
  "featured": "boolean (optional, default: false)",
  "showInTicker": "boolean (optional, default: false)"
}
```

> **Note**: `summary` and `showInSlider` are accepted by the route body but have no schema field. They are stripped from the `prisma.news.create` call.

### Field Mapping in Route (after Phase 2 fix)

| Body field | Schema field |
|---|---|
| `title` | `titleAr` |
| `content` | `contentAr` |
| *(implicit `""`)* | `titleEn` |
| *(implicit `""`)* | `contentEn` |
| `image` | `image` |
| `category` | `category` |
| `published` | `isPublished` |
| `featured` | `isFeatured` |
| `showInTicker` | `isInTicker` |

### Response (201 Created)

Returns the created `News` object (same shape as GET response item).

### Response (401 Unauthorized)

```json
{ "error": "غير مصرح" }
```

### Response (400 Bad Request)

```json
{ "error": "العنوان والمحتوى مطلوبان" }
```

---

## DELETE /api/news?id={id}

Deletes a news entry by ID. **Requires authentication**.

### Query Parameters

| Parameter | Required | Description |
|---|---|---|
| `id` | Yes | The `cuid` ID of the news entry to delete |

### Response (200 OK)

```json
{ "message": "تم حذف الخبر بنجاح" }
```

### Response (401 / 400)

Standard error shapes as above.

---

## Errors / Edge Cases

| Scenario | Behaviour |
|---|---|
| No rows match the filter | Returns `[]` (empty array, 200 OK) — consumers show empty state gracefully |
| DB unavailable (Supabase paused) | Returns 500 — consumers catch error and show empty section |
| Unauthenticated POST/DELETE | Returns 401 — CMS should display error toast |
| Missing `title` or `content` on POST | Returns 400 |
| `category` omitted on POST | Defaults to `"NEWS"` in Prisma — **this will cause the entry to not appear in homepage filters**; always send `category` explicitly |
