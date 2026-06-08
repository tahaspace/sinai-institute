# API Contract: `/api/news`

**Feature**: 003-news-homepage-sync  
**Route file**: `app/api/news/route.ts`  
**Auth**: POST / PUT / DELETE require a valid server session. GET is public (no auth).  
**Date**: 2026-04-05

---

## GET `/api/news`

Fetch news records. Public — no session required.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `category` | `string` (optional) | Filter by category (`INSTITUTE_NEWS`, `GENERAL_NEWS`, `EVENTS`, `ANNOUNCEMENTS`) |
| `published` | `"true"` \| `"false"` (optional) | Filter by `isPublished`. Pass `"true"` for public homepage. |

### Response — 200 OK

```json
[
  {
    "id": "cmkx1oyfs0008cwzgx9wlj9w7",
    "titleAr": "عنوان الخبر",
    "titleEn": "",
    "contentAr": "محتوى الخبر",
    "contentEn": "",
    "image": "https://res.cloudinary.com/...",
    "isPublished": true,
    "publishDate": "2026-04-05T00:00:00.000Z",
    "isFeatured": false,
    "isInTicker": false,
    "category": "INSTITUTE_NEWS",
    "order": null,
    "createdAt": "2026-04-05T00:00:00.000Z",
    "updatedAt": "2026-04-05T00:00:00.000Z"
  }
]
```

**Ordered by**: `publishDate DESC`.

### Response — 500

```json
{ "error": "فشل في جلب الأخبار" }
```

**Public homepage usage**:
```
GET /api/news?category=INSTITUTE_NEWS&published=true
GET /api/news?category=GENERAL_NEWS&published=true
```

---

## POST `/api/news`

Create a new news record. **Requires valid session.**

### Request Body

```json
{
  "title": "عنوان الخبر",
  "content": "محتوى الخبر",
  "category": "INSTITUTE_NEWS",
  "image": "https://res.cloudinary.com/...",
  "published": true
}
```

| Field | Required | Type | Maps to |
|-------|----------|------|---------|
| `title` | ✅ Yes | string | `titleAr` |
| `content` | ✅ Yes | string | `contentAr` |
| `category` | No | string | `category` (default: `"NEWS"`) |
| `image` | No | string \| null | `image` |
| `published` | No | boolean | `isPublished` (default: `true`) |

### Response — 201 Created

Full `News` object (same shape as GET array item).

### Response — 400

```json
{ "error": "العنوان والمحتوى مطلوبان" }
```

### Response — 401

```json
{ "error": "غير مصرح" }
```

### Response — 500

```json
{ "error": "فشل في إضافة الخبر" }
```

---

## PUT `/api/news`

Update an existing news record. **Requires valid session.**

### Request Body

```json
{
  "id": "cmkx1oyfs0008cwzgx9wlj9w7",
  "title": "العنوان المحدث",
  "content": "المحتوى المحدث",
  "category": "INSTITUTE_NEWS",
  "image": "https://res.cloudinary.com/...",
  "published": true
}
```

> ⚠️ **Current bug (pre-fix)**: Raw body spread passes `title`, `content`, `published` directly to Prisma — field names unknown to schema → P2009 runtime error.  
> **After FR-019 fix**: Explicit mapping applied (same as POST).

| Field | Required | Maps to |
|-------|----------|---------|
| `id` | ✅ Yes | `where: { id }` |
| `title` | No | `titleAr` |
| `content` | No | `contentAr` |
| `category` | No | `category` |
| `image` | No | `image` |
| `published` | No | `isPublished` |

### Response — 200 OK

Full updated `News` object.

### Response — 400

```json
{ "error": "معرف الخبر مطلوب" }
```

### Response — 401 / 500

Same pattern as POST.

---

## DELETE `/api/news?id={id}`

Delete a news record. **Requires valid session.**

### Query Parameter

| Param | Required | Description |
|-------|----------|-------------|
| `id` | ✅ Yes | CUID of the record to delete |

### Response — 200 OK

```json
{ "message": "تم حذف الخبر بنجاح" }
```

### Response — 400 / 401 / 500

Same pattern as POST.
