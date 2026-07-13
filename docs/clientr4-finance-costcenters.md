# ClientR4 · R4a — Cost-Centre Profitability (SHIPPED & LIVE)

**Deployed 2026-07-13** → `sinai-rbac`/Neon (commit `85235a8`). Additive schema (0 DROP). tsc 42 baseline (0 introduced), ESLint 0.

## What it does
Turns the pre-existing `CostCenter` into a live profitability dimension and adds the profitability
reports the client's finance spec draws (`ClientR4/الفرق بين حسابات طلاب وحسابات عامة…docx`).

## Schema (additive)
- **`Branch`** — new location dimension `{ code, nameAr, nameEn, isActive }`.
- **`CostCenter`** — added `type` (`ACADEMIC|ADMIN|OPERATIONAL|BRANCH`), `branchId`, `programId`, `facultyId` (soft refs) for roll-up.
- **`costCenterId` + `branchId`** added to `Invoice`, `Receipt`, `Bill`, `PayRun`, `ExpenseClaim`.

## Posting (dimension flows into the GL)
`JournalLine.costCenterId` already existed. Now threaded from the operational record at posting time:
- `lib/finance/billing.ts` — `issueInvoice` **auto-derives** the centre from the student's programme (a `CostCenter` whose `programId` matches) when none is passed, so revenue self-attributes; `recordReceipt`/`issueCreditNote` inherit the invoice's centre.
- `lib/finance/ap.ts` — `createBill`/`approveBill` + expense claims tag their expense legs.
- `lib/finance/payroll.ts` — `createPayRun`/`approvePayRun` stamp the salary expense.

## Engine + reports
- **`lib/finance/profitability.ts`** — reads POSTED `JournalLine`s on REVENUE/EXPENSE accounts, groups by `costCenterId` (revenue = credit−debit, expense = debit−credit, profit = revenue−expense); program/faculty/branch roll-ups map centres via their link fields; unmapped → `غير موزّع`. `studentUnitCost` = total expense ÷ active-student headcount.
- **5 reports** in `lib/reporting/reports/financial.ts` (existing family, reuse hub/CSV/Excel/print): `fin-profitability-costcenter`, `-program`, `-faculty`, `fin-branch-comparison`, `fin-student-cost` (KPI).

## UI + API + RBAC
- **`/institute/finance/cost-centers`** page (manage branches + cost centres, link to program/faculty/branch). Nav entry added.
- APIs: `GET/POST/PATCH /api/institute/finance/cost-centers` + `.../branches`; cost-centre pickers wired into bill + pay-run create.
- RBAC: `finance.costcenter.view|edit` (CFO via `finance.*`; added to `ACCOUNTANT`).

## Operator setup (to make reports populate)
1. Create branches + cost centres; link each academic centre to its programme (and set faculty/branch).
2. New invoices auto-tag their centre from the student's programme; tag expenses (bills/claims) + pay-runs with a centre.
3. Run the profitability reports in `/institute/reporting` (financial family). Existing/pre-tag data shows under `غير موزّع` until re-tagged — no back-fill performed (honest).

## Live verification (2026-07-13)
`/api/institute/finance/cost-centers` + `/branches` → 401 (exist); reports `fin-profitability-costcenter`/`fin-student-cost` → 401 registered (unknown-id control → 404). App root 200.

## Next in ClientR4
R4b (detailed result sheets) → R4c (HR module, phased-core). See `docs/reporting-analytics-plan.md` and the R4 plan.
