# Dual Academic System + Ministry Result Sheets — Feature Documentation

> Authoritative record of the ClientR4 result-sheet work: the dual academic system
> (credit-hours **and** traditional/annual), and the official ministry result sheets
> (screen view = the institute photo style; export = the exact وزارة PDF matrix).
> Last updated: 2026-07-16. Live on **sinai-rbac.vercel.app** (Neon DB).

---

## 1. What this feature is

The platform originally ran a **credit-hour system only** (نظام الساعات المعتمدة). This work added, in parallel:

1. **A second academic system** — the Egyptian **traditional/annual system** (النظام العادي/السنوي): year-groups (فِرَق) instead of hour-based levels, **percentage → تقدير** (ممتاز/جيد جداً/جيد/مقبول/راسب), **no GPA**, and year results (منقول / له دور ثانٍ / باقٍ للإعادة). Scoped **per program** — each `Program` is either `CREDIT_HOURS` or `ANNUAL`; one institute can run both.
2. **Official ministry result sheets** with **two renderings**:
   - **On-screen** = the clean web/photo style (what staff view in the system).
   - **On export** («طباعة رسمية للوزارة») = the exact landscape **students × courses matrix** the Ministry of Higher Education certifies and signs, including each course's **internal mark split** (أعمال السنة · نصفي · عملي · تحريري).

---

## 2. Academic systems (per program)

- `Program.academicSystem` — `"CREDIT_HOURS"` (default) or `"ANNUAL"`. Additive, nullable-safe; existing programs stay credit-hour.
- `lib/academic-system.ts` — `getProgramSystem`, `resolveStudentSystem`, `normalizeSystem`, `ACADEMIC_SYSTEM_LABELS`.
- **Set a program's system:** الإعدادات → «النظام الأكاديمي للبرامج» (`/institute/settings/academic-system`).
- **Header context switch:** the top-header chip («نظام الساعات المعتمدة» / «النظام السنوي (العادي)») lets staff pick the working program; it persists `activeProgramId` + `activeProgramSystem` in `localStorage` and fires `academic-system-changed`. Workflow screens (academic standing / graduation / grades) branch on it via `lib/use-active-program-system.ts`.

### Engines
| | Credit-hours | Annual |
|---|---|---|
| Module | `lib/gpa.ts` + `lib/standing.ts` | `lib/annual.ts` |
| Grade | letter + quality points (A/B+/…), CGPA | percentage **تقدير** band, no points |
| Progress | earned hours + levels | فرقة result: منقول / له دور ثانٍ / باقٍ للإعادة / قيد الرصد |
| Marks source | **same** `Enrollment.midterm/final/practical/homework` + `Course.*Max` | same |

Both systems read the **same** recorded marks; only the interpretation differs.

---

## 3. Data model additions (all additive, 0-DROP)

- `Program.academicSystem String @default("CREDIT_HOURS")`.
- `Student` ministry/bio fields (nullable): `seatNumber` (رقم الجلوس — falls back to `studentCode`), `birthPlace`, `priorSchool`, `priorQualTotal`, `priorQualYear`, `admissionType`. (`birthDate`, `address`, `nationalId`, `entryQualification` already existed.)
- No new result fields — the ministry sheet reuses `Enrollment` marks + `Course.midtermMax/finalMax/practicalMax/homeworkMax`.

---

## 4. The reports & the reporting hub

**Hub:** `/institute/reporting` («التقارير والتحليلات»). Left panel lists report **categories**; pick a report → set filters (required marked `*`) → **«عرض»** renders the screen view → **«طباعة رسمية (للوزارة)»** (top-right, appears only for sheets that have a ministry version) → browser print → **Save as PDF**.

> The hub shows **all** result families at once (credit-hour + annual) — it no longer hides a family by the active system.

### Result sheets that carry the ministry export (`meta.ministrySheet.matrix`)
| Report | Category (left panel) | System | Required filters |
|---|---|---|---|
| **كشف نتيجة المستوى الدراسي** (`level-result-sheet`) | بيانات الحالة وكشوف النتائج | credit-hours | المستوى · العام · الفصل |
| **كشف نتيجة الخريجين (مصفوفة)** (`graduates-result-sheet`) | بيانات الحالة وكشوف النتائج | credit-hours | العام (دفعة التخرج — اختياري) |
| **كشف النتيجة السنوية** (`annual-result-sheet`) | النتائج السنوية (النظام العادي) | annual | الفرقة · العام |
| **بيان حالة الطالب** (`student-transcript`) | بيانات الحالة وكشوف النتائج | credit-hours | رقم الطالب (screen only; bio block) |
| **بيان حالة سنوي** (`annual-transcript`) | النتائج السنوية | annual | رقم الطالب |

Other annual rosters: `annual-second-round` (الدور الثاني), `annual-repeaters` (الباقون).

### Cohort isolation (important)
`academicSystemWhere(system)` in `lib/reporting/filters.ts` scopes every sheet to its program's system, so on a **shared level/فرقة number** a credit-hour cohort and an annual cohort never mix. `CREDIT_HOURS` includes null-program students; `ANNUAL` requires an explicit ANNUAL program.

---

## 5. The ministry export sheet (the certified document)

Rendered by `MinistryResultMatrix` in `app/(institute)/institute/reporting/page.tsx`, print-only, inline styles, landscape.

**Layout (faithful to the client PDFs):**
- **Letterhead** — institute (+ optional faculty line) + sheet title + context (القسم / المستوى-الفرقة / العام / الفصل).
- **Grade-scale legend box** (top-left).
- **Matrix** — rows = students (م · رقم الجلوس · الاسم); columns = **each course expanded into its component sub-columns**:
  - **أعمال السنة · نصفي · عملي · تحريري** (only the parts a course actually has, each sub-header shows its **max**) → **المجموع** (/course total) → **التقدير**.
  - Two-row header: the course code spans its sub-columns on row 1; the part labels + maxes on row 2.
- **Trailing summary columns** — credit-hours: س.مسجلة · مكتسبة · نقاط الجودة · المعدل الفصلي · التراكمي · التقدير العام · الحالة · الترتيب. Annual: النسبة المئوية · التقدير العام · الحالة · الترتيب (no GPA).
- **Distribution box** + **grade-scale legend** + **signature block**.

**Paper:** auto **A3** landscape when the component columns exceed what A4 can hold (>18 leaf columns); otherwise A4. Set on the page via `@page { size: <A4|A3> landscape }`.

**Payload:** `lib/reporting/ministry-matrix.ts` — `buildMinistryMatrix()` assembles `{ leadingCols, courses[{code,name,components[],totalMax}], rows[{serial,seat,name,leading,cells{code→{parts,total,grade}},summary}], summaryCols, scale, distribution, signatures, paper }`. `courseComponents(maxes)` + `MARK_COMPONENTS` map the `Course.*Max` / `Enrollment.*` fields to the Arabic labels. `rankByDesc()` computes الترتيب. `leadingCols` = columns rendered BEFORE the course block (used by the graduation board for prior-year totals).

**Graduation board (`graduates-result-sheet`) special layout:** the **final year** (الفرقة النهائية) shows the full per-course component detail; **each prior year** shows as **one معدل column** (الفرقة 1..n, via `leadingCols`); trailing = المعدل التراكمي · تقدير التخرج · الترتيب. Final year = the `academicYear` filter if given, else the latest recorded year; prior years are auto-derived from each graduate's enrollment history.

---

## 6. Configuration (no redeploy needed)

- **Annual grade bands** — الإعدادات → لوائح المعهد → «النظام السنوي (العادي)»: `annualPassPercent` (50) · `annualGoodMin` (65) · `annualVeryGoodMin` (75) · `annualExcellentMin` (85). Stored in the `institute.regulations` Setting JSON; read by `lib/regulations.ts` / `lib/annual.ts` (`getAnnualBands`).
- **Ministry sheet presentation** — Setting key `institute.ministrySheet` (`lib/ministry-sheet.ts`): `faculty` (extra letterhead line), `controlTitle` (لجنة الكنترول), `signatures[]` (default 5 roles: أمين/أعضاء/رئيس لجنة الكنترول · وكيل المعهد · العميد), `paper` (A4/A3 default before the auto-widen), `showQualityPoints`. Edit the JSON to match the institute's official wording.

---

## 7. Demo data (labeled «(عينة)» / coded; reset before handover)

| Cohort | Codes | Seat # | Where |
|---|---|---|---|
| Credit-hour level 2 | `2024-101`…`2024-107` | 10001–10007 | 6 courses (CS201-204, MA201, EN201), 2024-2025/first, full component marks, grade spread ممتاز→راسب |
| Annual فرقة 2 | `ANN-9001`…`ANN-9005` | 20001–20005 | برنامج النظام السنوي (عينة), 4 courses (ANN-C1..4), 2024-2025 |
| Graduates | `GRAD-9001`…`GRAD-9003` | 40001–40003 | level 4, GRADUATED |

Course splits: CS201-204 = أعمال20 / نصفي50 / عملي30 / تحريري100 (=200); MA201/EN201 no عملي (=170); ANN-C1..4 = نصفي40 / تحريري60 (=100).

**Try:** level sheet → المستوى **2** · **2024-2025** · **الأول**; annual sheet → الفرقة **2** · **2024-2025**. Any other combo → «لا توجد بيانات» (expected — demo data lives only there).

---

## 8. Deployment & verification discipline

- **Platform:** Vercel project **sinai-rbac** → alias `sinai-rbac.vercel.app`; DB = **Neon** (`ep-sweet-cherry-...`). Local `.env` Supabase is the OLD/wrong DB — do not use.
- **Deploy:** `vercel --prod` (token). Schema changes: `prisma migrate diff` (assert 0 DROP) → `prisma db push --skip-generate` to Neon **direct** URL (non-pooled) → deploy → live-verify → **rotate/shred credentials**.
- **Gates:** `tsc --noEmit` (42-error baseline — 0 introduced) · `eslint` (0) · execute report `run()` via `npx tsx` against live Neon before shipping.
- **Login (platform admin, sees all):** `admin@sainaiinstitute.com` / `admin123` (universityId = null). Note the typo "sainai" in that hardcoded email.

---

## 9. Build history (commits)

- Dual-system Phases 1-4 (`10b6df6`, `30ffae8`, `01f1cd8`, `64f67ef`) — program flag + switch, annual engine, annual reports, mode-aware screens.
- Configurable annual bands (`edd472b`).
- Ministry-faithful sheets — screen vs export decoupled + Student fields + `academicSystemWhere` (`7620a4c`).
- Hub shows both families + clearer empty-state.
- Per-course component sub-columns + A3 auto-widen (this doc's headline feature).

---

## 10. Pending / in progress

- ✅ **Graduates sheet — multi-year layout:** DONE — final year in full component detail, each prior year as one معدل column. Demo graduates (`GRAD-9001..3`) seeded with a 4-year history (فرقة 1-3 = 2021-2022/2022-2023/2023-2024 lower courses; final فرقة 4 = 2024-2025 courses CS401-404 with full components).
- Confirm the institute's exact ministry **letterhead wording** + **signature roles** → set `institute.ministrySheet`.
- Remove all «(عينة)» / coded demo data at handover.

See also: `docs/clientr4-result-sheets.md`, `docs/reporting-analytics-plan.md`, and memory `credit-hour-system-only`, `clientr4-report-formatting`.
