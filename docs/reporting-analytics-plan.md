# Reporting & Analytics Platform — Full Plan (ClientR3)

> **Source:** `ClientR3/تقارير السيستم المطلوبه لنظام المعاهد والجامعات .docx` (1,071 lines, read end-to-end).
> **Goal:** a single, powerful **Reporting & Analytics** center covering the 11 report families the client
> drew + audit, with ministry-grade official sheets, executive dashboards, a KPI center, strategic multi-year
> analytics, and predictive analytics — built ON the existing engines, deployed to `sinai-rbac`/Neon.
> Date: 2026‑06‑17. Status: **plan only.**

---

## 0. The key insight — most of it already exists

This is mostly a **surfacing + aggregation** project, not a greenfield build. Already in the repo:

| Capability | Where |
|---|---|
| Result classification, pass/fail/withdrawn/incomplete, reasons | `lib/reports.ts` (`classify`, `courseResults`, `passFailRoster`, `failReasons`, `absenceReasons`, `openActions`) |
| Ministry sheets (transitional/final/deprived), grade sheet, success stats | `lib/reports.ts` (`ministrySheet`, `gradeSheet`, `successStats`, `ministryPrep`) |
| Academic standing — probation (GPA<2.0 ×3 consec / ×4 separate, summer-excluded), honor (CGPA≥3.0 + no mandatory fail), level promotion, graduation eligibility, repeated-failure | `lib/standing.ts` (`computeAcademicStanding`) |
| CGPA / term GPA / earned hours / letter mapping | `lib/gpa.ts` |
| Attendance %, 3-stage warning, deprivation (>25%) | `lib/attendance.ts` |
| Full double-entry finance + statements + AR aging + budget-vs-actual + student statement | `lib/finance/{statements,billing,budget,treasury}.ts` |
| ClientR2 result-state engine (statuses, reasons, **attemptNo**, pending) | `Enrollment.gradeStatusCode/attemptNo/reasonCode` |
| Existing report UI (15 types) | `/institute/reports` + `/api/institute/reports` |
| Data models for nearly every report | Student, Course, Enrollment, Program, Department, Faculty, Section, CourseOffering, RegistrationRequest, Attendance, Application, TransferRequest, StudentWarning, GraduationRequest, Scholarship, Guardian, Complaint, Borrowing, MarketingCampaign, Instructor, Invoice/Payment/Budget/Payroll/ExpenseClaim |
| Audit trail | `AuditLog` + `lib/audit.ts writeAudit` |

So the work is: a **report platform** (registry, filters, export, snapshots), **fill ~7 small data gaps**, build the **new analytical/predictive engines**, and assemble the **11-category hub + dashboards**.

## 1. Data gaps to close (small, additive)

| Gap | Needed by | Fix |
|---|---|---|
| Student has no **Hold** flag | "الطلاب الذين لديهم Hold" | `Student += holdStatus Boolean, holdReason String?` |
| Student has no **source** | marketing/source analytics ("مصدر الطالب") | `Student += source String?` |
| Student/Application has no **entry qualification type** | filter ثانوية عامة / مدارس فنية | `Application += qualificationType`; `Student += entryQualification` |
| Application has no **rejection reason** / **completeness** | "أسباب الرفض الأكثر تكراراً", "عدد الملفات غير المكتملة" | `Application += rejectionReason String?, documentsComplete Boolean @default(false)` |
| Guardian has no **bank account** | "بيانات ولي أمر … الحساب البنكي" | `Guardian += bankAccount String?` |
| `AuditLog` has no **device/userAgent** + no **login events** | login audit report ("الجهاز") | `AuditLog += userAgent String?`; log `auth.login` in NextAuth callback |
| No **survey/evaluation** data | Faculty/Student Satisfaction, Teaching Effectiveness, Research Productivity KPIs | `FacultyEvaluation` + `SurveyResponse` models (or mark KPI "awaiting data source" — **never fabricated**) |
| No **historical snapshot** facility | multi-year trends + KPI history that aren't reconstructable (headcount-at-date, balances-at-date) | `KpiSnapshot` model + a nightly cron capture |

> **No-fake-data rule (enforced):** any KPI with no backing data (satisfaction, research productivity, strategic-objective achievement) is shown as **"يتطلب مصدر بيانات"**, not invented. Most academic/financial/operational KPIs ARE computable from existing data.

## 2. Architecture — a unified Report Platform

```
                       /institute/reporting  (the 11-category hub)
                                   │
   ┌───────────────────────────────┴────────────────────────────────┐
   │  Report Runner API   /api/institute/reporting/[reportId]        │
   │   requirePermission(report.permission) → validate filters →     │
   │   report.run(filters, ctx) → { columns, rows, totals, meta }    │
   └───────────────────────────────┬────────────────────────────────┘
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        │ REPORT REGISTRY  lib/reporting/registry.ts            │
        │  each report = { id, category, nameAr, filters[],     │
        │   permission, output: table|kpi|chart|statement|sheet,│
        │   run() }  — ~120 definitions across 11 families      │
        └──────────────────────────┬───────────────────────────┘
                                   │ run() delegates to engines:
   ┌──────────┬──────────┬─────────┴──────┬───────────┬───────────────┐
   │ reports.ts│standing.ts│ attendance.ts │ finance/* │ NEW engines:  │
   │ gpa.ts    │           │               │statements │ analytics.ts  │
   │ (reuse)   │ (reuse)   │  (reuse)      │ billing   │ predict.ts    │
   │           │           │               │ budget    │ kpi.ts        │
   └──────────┴──────────┴────────────────┴───────────┴───────────────┘
                                   │
        Filters framework · Export engine (PDF print-layout + Excel/CSV) · Snapshots (KpiSnapshot)
```

**Core pieces to build (R0):**
- `lib/reporting/registry.ts` — the report catalogue (id → definition + runner). One source of truth; the hub UI and the runner both read it.
- `lib/reporting/filters.ts` — shared filter schema (academicYear, semester, facultyId, departmentId, programId, level, courseId, advisorId, instructorId, dateFrom/To, status) + validation + tenant scoping.
- `app/api/institute/reporting/[reportId]/route.ts` — generic runner (permission + filter validate + run + shape). Optional `?format=xlsx|csv|pdf`.
- `lib/reporting/export.ts` — table → CSV/Excel (`exceljs`) and the **official ministry sheet** HTML layout (header: institute/program/level/term; footer: grade-scale table) for print-to-PDF.
- `app/(institute)/institute/reporting/` — the hub: left tree of 11 families, a report picker, dynamic filter bar, result table/sheet/chart, print + export buttons.
- RBAC: a `reports.<family>.view` + `reports.export` permission set; map to roles (Registrar→student-affairs/ministry/results; CFO→financial; Dean/Board→executive+KPI; Quality→analytical; etc.).
- Charts via a light client lib (recharts) for dashboards/analytics.

## 3. The 11 report families → phases

Each report below is tagged **[reuse]** (engine exists), **[extend]** (small addition), or **[new]**.

### R1 — Ministry · Student Affairs · Results (highest value; mostly reuse)
**Admissions / قبول الطلاب:** accepted-by-department, accepted-by-qualification **[extend Application]**, most-common rejection reasons **[extend]**, incomplete-files count **[extend]**.
**Student Affairs rosters:** enrolled (مقيدين, filter year/institute/dept/program/level) **[reuse Student]**, graduates **[reuse standing]**, withdrawn / transferred / deferred / dismissed / incoming(وافدين) / new(مستجدين) **[reuse Student.status + TransferRequest]**, registered-this-term **[reuse RegistrationRequest/Enrollment]**, **not-registered** (enrolled but no courses) **[new query]**, **Hold list** **[extend Student]**. Guardian data (name/phone/**bank**) **[extend Guardian]**. Student credentials per level/program **[reuse User]**.
**Results / official sheets (the 10 layouts in the doc):** level-results sheet (header+footer grade-scale), course-grades sheet, **ناجحين / راسبين / أوائل المستوى / أوائل الدفعة / خريجين** (with honor class), statistical-results sheet (total/pass/fail/transferred/graduate/withdrawn/deprived/absent), grade-distribution, program/level statistics. Mostly **[reuse]** `reports.ts`+`standing.ts`; add the **official print layouts** + **أوائل/ranking** + **graduates-by-completion-years (4/5/6/7)** **[new]**.
**Control follow-up / متابعة الرصد:** un-graded courses, incomplete grades, result-approval & course-lock **[reuse Enrollment.resultLocked/gradeStatusCode]**.

### R2 — Academic · Attendance · Faculty · Advisor
**Academic:** most-registered programs, students-per-program (+CGPA+hours), per-course grade sheet (+#students+levels+**attempts**) **[reuse attemptNo]**, avg GPA per program, doctor-per-course + teaching load, programs with most warnings, pass-rate by program, highest/lowest success courses, most/least requested course, **waiting-list** course, course capacity, absence by course/dept, **per-course lifecycle analysis** (study duration, #fails/#withdrawals/#excuses/#warnings/#deprivations/#deferrals/#retakes, earned/registered/repeated/dropped hours) **[new aggregation over Enrollment history]**.
**Attendance:** today present/absent/late (filter day/month/dept/program/course), absence by course/section/dept, deprivation list (>25%) + near-deprivation, absence rate, most-absent days/times/courses, **retention level→level** (1→2,2→3,3→4); indicators Attendance/Absence/Warning/Deprivation Rate **[reuse attendance.ts + new aggregations]**.
**Faculty:** teaching load, schedules, pass-count per doctor, fail-count per doctor, student evaluation **[extend: FacultyEvaluation]**, cross-department comparison for the same course **[new]**.
**Advisor / المرشد:** students-per-advisor, registration-delay, withdrawal rate per advisor, graduation-speed per advisor, registration-rejection reasons, failing students per advisor, top students per advisor **[reuse Student.advisorId + RegistrationRequest + standing]**.

### R3 — Financial reports (reuse the finance system we just built)
Student Financial Analysis (per-student full statement: fees/due/paid/discounts/interest/late/installments/avg-delay/remaining) **[reuse billing.statementOfAccount + extend]**; Revenue Analytics by program/term/level/student **[new aggregation over Invoice/Receipt]**; collection follow-up (due-this-week, overdue, daily, monthly) **[reuse]**; defaulters / owing / payment-method split / fully-paid **[reuse]**; institute books — journal, GL, **subsidiary ledger**, Trial Balance, P&L, Balance Sheet, Cash Flow **[reuse statements.ts; add subsidiary ledger]**; receivables aging 0-30/31-60/61-90/90+ **[reuse arAging]**; payment-behavior (committed/late/defaulter) **[new scoring]**; **Cost-Center analytics** (cost per dept/program/student) **[new — uses CostCenter + GL]**; budget-vs-actual + variance **[reuse budgetVsActual]**; revenue-by-fee-type **[new]**; cash-flow daily/monthly + treasury/bank movement + liquidity **[reuse treasury]**; **Profitability** (program/dept/branch/term = revenue − cost-center expense) **[new]**; Expense analysis by dept/cost-center/item; Payroll cost by admin/dept/job **[reuse Payroll]**; **Cost per Student/Program/Credit-Hour/Graduate** **[new]**; Comparative (year/term/program/dept/cost-center) **[new — multi-year]**.

### R4 — Executive Dashboard + KPI Center
**Executive (Board) dashboard:** Academic KPIs (headcount, pass%, fail%, avg CGPA), Financial KPIs (revenue, expense, profitability, cash flow), HR KPIs (staff count, turnover), Student KPIs (Retention, Dropout, Graduation Rate), Predictive KPIs (at-risk-of-dismissal count, at-risk-of-default, enrollment forecast, revenue forecast).
**KPI Center:** Academic (Success/Graduation/Retention/Dropout/Avg-GPA/Honor rate), Faculty (satisfaction/teaching-effectiveness/attendance-commitment/research **[need survey data]**), Student (satisfaction/complaint-resolution **[reuse Complaint]**/service-quality), Financial (revenue growth/collection rate/cost-per-student/profitability), **Operational** (registration completion time, service completion time, **exam/result processing time**) **[reuse timestamps]**, Strategic (objectives/initiatives/projects **[need data source]**).
Engine: `lib/reporting/kpi.ts` computes each KPI from the engines + `KpiSnapshot` for history/trend arrows.

### R5 — Analytical / Strategic (multi-year)
Student growth across years (by dept/program/level), top programs by demand/revenue/success over years, graduates trend, exam-quality over years (same course pass-rate across years), retake-count over years, treasury/bank movement over years, optimal advisor load, struggling-students over years, dept/program profitability, most-borrowed library books **[reuse Borrowing]**, student source **[extend]**, marketing campaign efficiency **[reuse MarketingCampaign]**, training revenue. Engine: `lib/reporting/analytics.ts` — aggregates over `academicYear`-stamped data + `KpiSnapshot`.

### R6 — Predictive Analytics + Early Warning (heuristic, clearly labeled)
**Student Risk Prediction:** failure / withdrawal / dismissal risk %, with **reason + suggested action**, scored from GPA + attendance + coursework + past-fail-count (+ payment-delay + complaints for withdrawal). Rule-based weighted scoring (transparent, auditable) — labeled an **estimate**, not a verdict.
**Enrollment Forecast** (next term/year/3yr/5yr; by program/college/branch) + capacity needs (halls/faculty/labs) — trend extrapolation over history.
**Graduation Prediction** + **Graduation Funnel** (accepted→registered→continuing→expected).
**Financial Forecast** (revenue/expense/cash-flow next month/term/year; bad-debt) — trend + AR-aging based.
**Faculty need / deficit forecast** (professors/TAs/labs) from forecast enrolment ÷ load.
**Early Warning System:** alerts on declining pass-rate, rising failure/dropout, declining collection, faculty shortage, capacity overflow, delayed results. Engine: `lib/reporting/predict.ts`. (Pure-statistical/heuristic now; an ML upgrade is a later option.)

### R7 — Audit / login report + delivery polish
Login & action audit (user, time, **device/userAgent**, edit/delete) — extend `AuditLog` + log `auth.login`. Saved reports + scheduled email/PDF exports (`SavedReport`/`ScheduledReport` + a Vercel cron). Export polish (Excel styling, official ministry letterhead).

## 4. Phasing, effort & sequencing

| Phase | Theme | Size | Notes |
|---|---|---|---|
| **R0** | Report platform (registry, filters, runner API, export, hub UI, snapshot model, audit device, RBAC keys, charts) | 1.5–2 sprints | enabler for all |
| **R1** | Ministry · Student Affairs · Results (official sheets) | 2 sprints | highest value; ~70% reuse |
| **R2** | Academic · Attendance · Faculty · Advisor | 2 sprints | course-lifecycle aggregation is the heavy bit |
| **R3** | Financial reports | 1.5 sprints | ~80% reuse of finance engines |
| **R4** | Executive Dashboard + KPI Center | 1.5 sprints | needs R1–R3 |
| **R5** | Strategic multi-year analytics | 1.5 sprints | needs snapshots + academicYear aggregation |
| **R6** | Predictive + Early Warning | 2 sprints | heuristic; honest "estimate" labeling |
| **R7** | Audit/login + scheduling/export polish | 1 sprint | |

**Critical path:** R0 → R1 (ministry/results) delivers the most institutional value fastest; R3 is near-free (reuses finance); R4/R5/R6 stack on top once the report engines exist.

## 5. Cross-cutting rules
- **Reuse first** — wrap the existing engines in registry runners before writing new aggregation.
- **Tenant-scoped + permission-guarded** every report (`requirePermission`, `universityId`).
- **No fabricated metrics** — KPIs without data show "يتطلب مصدر بيانات".
- **Official ministry layouts** — exact header/footer (institute/program/level/term + grade-scale footer) for the printable sheets the ministry accepts.
- **Performance** — heavy multi-year/dashboard aggregations cached via `KpiSnapshot` (nightly cron) so dashboards are instant; live reports paginate.
- **Additive, feature-flagged, no-downtime** rollout on `sinai-rbac`/Neon (same discipline as the finance phases): additive migrations, `prisma db push` → seed → `vercel --prod`, verify live.
- **Predictive = estimates** — transparent rule-based scoring, labeled, auditable; never presented as certainty.

## 6. Open decisions for the owner
1. **Satisfaction/evaluation KPIs** — add survey/evaluation capture (Faculty/Student satisfaction, teaching effectiveness, research) now, or ship those KPIs as "awaiting data source"?
2. **Export stack** — Excel via `exceljs` + PDF via print-CSS (recommended, no heavy dep) vs a server PDF renderer?
3. **Predictive depth** — heuristic rule-based (ship now, transparent) vs a later ML model (needs more history)?
4. **Snapshots cron** — nightly KPI snapshot via Vercel Cron (for trends/dashboards) — confirm OK to add a cron.
5. **Ranking ties** — أوائل (toppers) tie-break rule (CGPA → earned hours → fewer attempts?).
6. **Branches** — is the institute multi-branch (الفروع) now, or single-branch (defer branch-level profitability)?

---
*Grounded in the real repo: ~80% of inputs + engines already exist (lib/reports, standing, gpa, attendance, finance/*). This plan adds a report platform, ~7 small data fields, the new analytical/predictive engines, and the 11-family hub + dashboards. No code yet — awaiting go-ahead + the §6 decisions.*

---

## 7. Delivery log — reporting system SHIPPED & LIVE (2026-06-18)

All 12 report families (the exact tree the client drew) built and deployed to `sinai-rbac`/Neon.
**63 reports** registered. Each report is one `ReportDef` in the registry → the hub UI, permission
guard, filters, runner, and CSV export all work automatically. tsc 0-introduced (42 baseline),
ESLint 0 across all phases.

| Phase | Commit | Families / reports |
|---|---|---|
| R0 platform + R1 | `a37b2cf` | registry/filters/export/runner/hub + schema gaps; Ministry(3), Student-Affairs(14), Results(7) |
| R2 | `0114d9d` | Academic(7), Attendance(6), Faculty(2), Advisor(3) |
| R3 + R7 | `f1dcbdf` | Financial(8) — reuse finance engines; Audit/login(1) + login-event capture |
| R4 + R5 + R6 | `70125ab` | Executive+KPI(4), Analytical/strategic(5), Predictive(3) |

**Architecture:** `lib/reporting/{types,filters,export,registry,kpi}.ts` + `reports/<family>.ts`
modules; API `/api/institute/reporting` (catalogue filtered by permission) + `/[id]` (run +
`?format=csv`); hub `/institute/reporting` (11-category tree, dynamic filters, run/print/CSV).
Reuses `lib/reports`, `lib/standing`, `lib/gpa`, `lib/attendance`, `lib/finance/*`.

**Honesty:** predictive risk is a transparent **rule-based estimate** (score + reason, labeled),
not a black box. Satisfaction/research/strategic KPIs with no data source show **"يتطلب مصدر بيانات"** — never fabricated.

**Remaining enhancements (optional):** nightly `KpiSnapshot` Vercel cron for trend history;
Excel (.xlsx) export via `exceljs`; survey/evaluation capture to power the satisfaction KPIs;
the official ministry print-letterhead layout for the result sheets; ML upgrade for predictions.
