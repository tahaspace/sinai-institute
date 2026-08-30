# ClientR5 — Student Holds & Blocks (نظام حجب الطلاب)

> Source spec: `ClientR5/شرح نظام حجب الطلاب داخل المعاهد .docx`.
> Built on branch `feat/rbac-multitenant-platform`. Local build + verify done
> (prisma generate ✓, tsc 42-baseline / 0-introduced, eslint 0). **Not yet deployed**
> — needs `prisma db push` (3 additive models) + RBAC sync + `vercel --prod`.

## 1. The rule that shapes everything
A hold **never** deletes or edits a result, and never touches GPA or academic status.
The result stays in the DB exactly as the control (كنترول) approved it. A hold only sets
**visibility/access = blocked** for chosen scopes. Flow: `رصد → اعتماد النتيجة → حجب/إتاحة`.

## 2. Data model (additive — `prisma/schema.prisma`)
- **`StudentHold`** — one hold on a student. `type` (نوع، shown to student), `reasonId`→`HoldReason`,
  `reasonText`, six scope booleans (`blockResult`, `blockRegistration`, `blockEnrollmentLetter`,
  `blockTranscript`, `blockCertificate`, `blockGraduation`), `status`
  (`PENDING|ACTIVE|RELEASED|CANCELLED|EXPIRED`), `source` (`MANUAL|AUTOMATIC`), `startDate`/`endDate`,
  `appliedById`/`approvedById`/`releasedById`/`releasedAt`/`releaseReason`, per-hold `messageAr/En`.
- **`HoldReason`** — configurable reason list (إعدادات الحجب). Distinct from the fixed type.
- **`HoldEvent`** — immutable lifecycle log (`APPLY|APPROVE|RELEASE|CANCEL|EXPIRE` + actor + source + time).
- Legacy `Student.holdStatus/holdReason` are kept in sync (the old ClientR3 "hold" report still works).
- Per-type messages + `autoFinanceHold/Release` toggles live in `Setting["institute.holdSettings"]`.

## 3. Engine — `lib/holds.ts`
`HOLD_TYPES` (8: FINANCIAL/DOCUMENT/DISCIPLINARY/ACADEMIC/ADMINISTRATIVE/GRADUATION/LIBRARY/CUSTOM),
`applyHold`/`applyHoldBulk`, `releaseHold`, `cancelHold`, `approveHold`, `expireDueHolds`;
`holdEffect(studentId)` (OR of active scopes), `scopeBlock(studentId, scope)` (blocked? + message),
`holdMessage` (per-hold override → tenant type-config → built-in default), `outstandingFeesFor`,
`autoHoldCandidates`, `releaseFinancialHoldsIfPaid`. Every mutation writes a `HoldEvent` + `writeAudit`.

## 4. Enforcement (where the hold actually bites)
- **`blockResult`** → hides marks/GPA and shows the hold message in `GET /api/student/grades`,
  `/standing`, `/dashboard` (recent grades + grade notifications). The grades page renders an amber
  "النتيجة غير متاحة حاليًا" card with the per-type message.
- **`blockRegistration`** → `POST /api/student/registration` (save/submit) returns 403 + message;
  the GET surfaces `hold` so the page can warn. Cancel is still allowed.
- Scopes `blockEnrollmentLetter/Transcript/Certificate/Graduation` are **stored and ready** but have
  no student self-service surface yet (those documents are staff-generated), so their enforcement is a
  no-op until such an endpoint exists. Login / schedule / messages are **never** blocked — by design.

## 5. Module UI — `/institute/students/holds`
"إدارة القيود والحجب الطلابية" (linked from the Students module). Tabs:
- **حجب النتائج** — filters (القسم/البرنامج/المستوى/حالة السداد/بحث) + student table with **checkbox bulk
  select** → dialog (نوع + سبب + نطاق + تاريخ انتهاء + ملاحظة) → apply (حجب جماعي).
- **المحجوبون** — all holds (filter status/type) with **رفع/إلغاء/اعتماد** actions + scope badges.
- **معرضون للحجب** — finance candidates (debtors with no active financial hold) → one-click financial hold.
- **الإعدادات** — reasons CRUD + auto-finance toggles.

## 6. APIs — `app/api/institute/holds/*`
`GET/POST /holds` (list + bulk apply), `PATCH /holds/[id]` (release/cancel/approve),
`GET /holds/students` (roster + outstanding + current hold), `GET /holds/candidates`,
`GET/POST/PATCH/DELETE /holds/reasons`, `GET/PATCH /holds/settings`.

## 7. Finance link (semi-automatic, per spec)
- **Candidates:** debtors with no active financial hold surface in "معرضون للحجب"; a staff member confirms
  before any hold is placed (the system never binds a hold on its own).
- **Auto-release:** `POST /api/institute/finance/collection` (record payment) calls
  `releaseFinancialHoldsIfPaid` — when the balance hits zero, active financial holds auto-release
  (source=AUTOMATIC), logged in `HoldEvent`.

## 8. RBAC (`prisma/rbac/catalog.ts`)
New keys: `hold.view/apply/release/cancel/override/config` + `reports.holds.view`.
Grants: **REGISTRAR** (شؤون الطلاب) = view/apply/release/cancel/config + reports; **`hold.override`**
(approve a PENDING hold) stays with **INSTITUTE_ADMIN** (via `ALL_TENANT`) — maker/checker.
Accounts can't edit academics and control can't edit debt (existing role separation, no cross-grants).
⚠️ These grants only take effect after the additive RBAC sync runs on Neon (super-admin `*` works now).

## 9. Reports — `lib/reporting/reports/holds.ts` (new `holds` category «حجب الطلاب»)
`held-results` (المحجوبة نتائجهم), `holds-by-reason` (حسب النوع/السبب + %),
`released-holds` (المرفوع — من/متى), `automatic-holds` (التلقائي). Permission `reports.holds.view`.

## 10. Deploy checklist (held for owner go)
1. `prisma migrate diff` (assert additive / 0 DROP) → `prisma db push` (Neon direct) — adds
   `StudentHold`/`HoldReason`/`HoldEvent` + `StudentHold` relation + no drops.
2. RBAC sync: `prisma/rbac/sync-permissions.ts` (ALLOW_REMOTE_SEED=1, Neon pooled) — grants the 7 new keys.
3. `vercel --prod`. 4. Live-verify APIs (401 unauth), run a `holds` report via tsx, place+release a test hold.
5. (Optional) seed the spec's example reasons (مصروفات غير مسددة / مستندات ناقصة / قرار تأديبي / …).

## Deferred / light polish (not blocking)
- Extra filter dropdowns on the apply screen (الفرع/الكلية/العام/الفصل) — the API already accepts `facultyId`.
- A per-type message editor UI (the `settings` API supports `types[TYPE].messageAr` overrides already).
