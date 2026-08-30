# ClientR6 — New-Student Import + Student Promotion

> Source spec: `ClientR6/تسجيل الطلاب الجدد وترحيل الطلاب الناجحين .docx`.
> Built on `feat/rbac-multitenant-platform` in the clone. Local build + verify done
> (prisma generate ✓, tsc 42-baseline / 0-introduced, eslint 0). **Deploy:** additive
> `db push` (3 models + Student/Guardian fields, 0-DROP) → RBAC sync → `vercel --prod`.

## 1) Student Import (`/institute/students/import`)
Bulk-create new students from Excel/CSV.
- **Cohort selectors** (linked to every student in the file): العام الأكاديمي · البرنامج · المستوى · الفصل.
- **Template**: `GET /api/institute/students/import/template` → `.xlsx` with the exact Arabic columns.
- **Preview + validation** (`POST …/import` action=preview): duplicate studentCode/nationalId (in-file + DB), email/phone format, required fields — errors shown per row before saving.
- **Import** (action=commit): per valid row creates Student + Guardian + FeeAccount (from the level's `FeeStructure`, minus scholarship/discount) + a Draft Registration for the term; sets إحالة القيد / نوع القبول / تاريخ القبول; logs a `StudentImportBatch` + audit.
- Engine: `lib/student-import.ts` (SheetJS `xlsx`). `IMPORT_COLUMNS` is the single source for the template AND the parser (with header aliases). Cohort context comes from the screen, not the file.
- Schema: Student +`gender/nationality/religion/maritalStatus/governorate/city/admissionDate/enrollmentRef`; Guardian +`email/address`.

## 2) Student Promotion (`/institute/students/promotion`)
Roll successful students up a level into the new year, with an approval gate.
- **Filters**: current year/semester → new year/semester + program/department + current level.
- **عرض الطلاب** (`GET /api/institute/promotion`): `evaluateCohort` computes each student's action from `computeStandingForStudents` + status + ClientR5 finance holds:
  - `PROMOTE` (canPromote) · `GRADUATE` (graduationEligible) · `STAY` (راسب/مؤجل/ساعات ناقصة) · `SKIP` (منسحب/مفصول/خريج/محوّل، أو **مديون** when `blockDebtPromotion`).
- Table: code · name · program · level(→new) · التقدير · CGPA · النتيجة · **حالة الترحيل** · reason, with **select-all/pick** checkboxes.
- **Batch flow** (`POST …/promotion` → `PromotionBatch` DRAFT): مراجعة/إنشاء دفعة → **اعتماد** (`PATCH action=approve`, permission `promotion.approve`) → **تنفيذ** (`PATCH action=execute`, requires APPROVED, then **locked**). Buttons also: طباعة كشف الترحيل (print) · تصدير Excel (CSV).
- **Execute** (`lib/promotion.ts executeBatch`): PROMOTE → bump `Student.level` + open new-year Draft Registration; GRADUATE → `status=GRADUATED`; STAY/SKIP → untouched. Prior enrollments stay as immutable history; every step audited; the `PromotionBatch`/`PromotionItem` rows are the archive (who/when/old→new year+level).

## RBAC (`prisma/rbac/catalog.ts`)
`student.import`, `student.promote` (both covered by REGISTRAR's `student.*`), and **`promotion.approve`** — a separate resource so REGISTRAR does NOT get it; the approve gate is INSTITUTE_ADMIN (via `ALL_TENANT`) = maker/checker.

## Settings
`Setting["institute.promotion"]` → `{ blockDebtPromotion: true }` (a student with unpaid fees is held back from promotion; toggle to allow).

## Deploy checklist (held for owner go)
1. `migrate diff` assert 0-DROP → `db push` to Neon direct (3 models + the additive Student/Guardian columns).
2. RBAC sync (`sync-permissions.ts`, ALLOW_REMOTE_SEED=1) — grants `student.import/promote` + `promotion.approve`.
3. `vercel --prod` → live-verify (import template downloads, promotion evaluate runs, approve/execute an eligible batch).

## Notes / light polish
- Faculty selector omitted on the import screen (platform is effectively single-institute; `facultyId` is accepted by the API but not surfaced). Add a faculties dropdown if multi-faculty is needed.
- `xlsx` 0.18.5 carries known low-severity advisories in old versions; acceptable for a trusted-staff, server-side parse of an uploaded file.

---

## Follow-up fixes (ClientR6 notes doc — 2026-08-30)

Client feedback in `ClientR6/ملاحظات علي موديول طلاب جديد وترحيل الطلاب .docx`:

1. **Academic year = managed dropdown, not free-text** (both modules). Added a managed
   academic-years list activated in system settings: `lib/academic-years.ts` (Setting
   `institute.academicYears` `{years,current}`, self-seeds from existing data when unset),
   API `app/api/institute/academic-years` (GET any-staff, PATCH add/remove/setCurrent gated
   `institute.settings.edit`), and settings screen `/institute/settings/academic-years`
   (nav under الإعدادات). Import + promotion year fields are now `<Select>` sourced from it.
2. **Import preview error — FIXED (root cause).** SheetJS read with `raw:false` formatted a
   14-digit national ID as `"3.0001E+13"` (scientific notation), collapsing DISTINCT IDs to
   the same value → false «رقم قومي مكرر» on every row = the "error message" the client saw.
   Fix: `parseImportBuffer` reads `XLSX.read(buf,{cellDates:true})` + `sheet_to_json(ws,{raw:true})`,
   and `norm()` renders integers in full (`toFixed(0)`) and Dates as ISO. Verified: 3 distinct
   numeric IDs → valid=3, errors=0.
3. **Promotion — explicit current + target level + semester from→to.** Added «المستوى المنقول
   إليه» select (defaults current+1, editable), reordered to year→program→dept→level(from/to)→
   semester(from/to); UI now sends `toLevel`.
4. **Promotion batch showed no names / approve didn't activate — FIXED.** The batch card never
   rendered its items. Now `createBatch` fetches `GET /promotion/[id]` and the card renders a
   table of the batch's students (code/name/from→to/action/reason); approve→execute confirmed.
   Verified: batch shows `2024-101 سارة أحمد | PROMOTE | 2→3`, approve → APPROVED.

All additive: 1 new model-less Setting + 1 API + 1 settings page; no schema change (the parser/UI
fixes are code-only). tsc 42-baseline/0-introduced, eslint 0.
