# Finance Upgrade Plan — Professional, Accounting‑Grade Finance for `institute/finance`

> **Goal:** turn the current *operational* finance layer (loose fee/payment tables, money in `Float`, no
> ledger) into a **professional, double‑entry, multi‑tenant financial system** — without a greenfield rewrite
> and without breaking the live `sinai-rbac` deployment.
> **Scope (locked with owner):** Hybrid double‑entry **GL + statements** · **full institutional finance** (phased)
> · **Egyptian payment gateway** · **full ETA e‑invoicing**.
> **Method:** designed via a 5‑architect + critic workflow grounded in the real repo; consolidated here.
> Date: 2026‑06‑16. **Status: ALL 8 PHASES SHIPPED & LIVE on `sinai-rbac` (2026‑06‑17) — see §12 Delivery log.**

---

## 1. Executive summary

We keep the existing operational tables as **sub‑ledgers** (AR, AP, Payroll, Treasury) and add a **double‑entry
General Ledger** underneath them. Every business event (invoice issued, payment received, refund, expense,
payroll run, bank transfer) posts **one balanced journal entry** through a single **posting engine**. Financial
statements (Trial Balance / P&L / Balance Sheet / Cash Flow) are **computed from the ledger** — never fabricated.
On top sit an **Egyptian payment gateway** (Paymob/Fawry/Kashier behind a provider abstraction) and **ETA
e‑invoicing** (e‑invoice/e‑receipt submission + VAT/withholding).

Two foundational defects are fixed first because everything else depends on them:
1. **Money is `Float`** (29 fields, 0 `Decimal`) → migrate to **`Decimal(18,4)`** with a money helper.
2. **`FeeAccount`/`FeeItem`/`Payment` are not tenant‑scoped** → add `universityId` everywhere + backfill.

---

## 2. Target architecture

```
            STUDENT / PARENT PORTAL            INSTITUTE FINANCE / CFO / ACCOUNTANT UI
                   │                                          │
   ┌───────────────┴───────────────── API (requirePermission + inScope + featureEnabled) ───────────────┐
   │                                                                                                     │
   │   SUB‑LEDGERS (operational, per‑document)                                                           │
   │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
   │   │ AR (billing) │ │ AP (expense) │ │  Payroll v2  │ │   Treasury   │ │  Budgeting   │             │
   │   │ Invoice/     │ │ Vendor/Bill/ │ │ Employee/    │ │ Bank/Cash/   │ │ Budget/      │             │
   │   │ Installment/ │ │ ExpenseClaim │ │ PayRun/      │ │ Reconcile/   │ │ CostCenter   │             │
   │   │ Receipt/CN   │ │              │ │ Payslip      │ │ Transfer     │ │              │             │
   │   └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
   │          │                │                │                │                │                     │
   │          └────────────────┴──────── lib/finance/ledger.ts (postEvent) ──────┴─────────────────────┤
   │                          POSTING ENGINE — resolves event→Dr/Cr via configurable PostingMap         │
   │                          enforces: debits==credits · period OPEN · idempotent(sourceType,sourceId) │
   │                                              │                                                      │
   │                               ┌──────────────▼───────────────┐                                     │
   │                               │  GENERAL LEDGER (double‑entry)│   ChartOfAccount (tenant tree)      │
   │                               │  JournalEntry → JournalLine   │   FiscalYear → AccountingPeriod     │
   │                               └──────────────┬───────────────┘                                     │
   │                                              │                                                      │
   │                    lib/finance/statements.ts │ (computed from JournalLine aggregates)               │
   │             Trial Balance · Income Statement · Balance Sheet · Cash Flow · AR/AP aging              │
   └─────────────────────────────────────────────────────────────────────────────────────────────────-┘

   EXTERNAL:  Payment Gateway (Paymob/Fawry/Kashier)  ──webhook(HMAC, fail‑closed)──►  Receipt + GL post
              ETA e‑invoicing (sign → submit → status)  ◄── EInvoiceDocument (Invoice/Receipt/CreditNote)
```

**Principle:** sub‑ledger documents are the operational truth; the GL is the accounting truth; they must
**reconcile** (e.g. sum of open invoices == balance of the AR control account `1100`). Divergence is a hard
error surfaced by a reconciliation report, never a silently wrong number (honors the repo's no‑fake‑data rule).

---

## 3. Current state & gaps (baseline)

| Area | Today | Gap to professional |
|---|---|---|
| Money | `Float` (29 fields) | rounding‑bug class → `Decimal(18,4)` |
| Tenancy | `FeeAccount`/`FeeItem`/`Payment` un‑scoped | add `universityId` + backfill |
| Ledger | none | Chart of Accounts + double‑entry GL |
| Documents | loose `Payment` rows | `Invoice`/`Receipt`/`CreditNote` with legal numbering |
| Installments | `installments: Int` | `InstallmentPlan` + dated `Installment` + late fees |
| Statements | operational aggregates | TB / P&L / Balance Sheet / Cash Flow from ledger |
| AP / expenses | none | `Vendor`/`Bill`/`ExpenseClaim` + approval |
| Payroll | flat `Payroll` rows | `Employee`/components/`PayRun`/`Payslip` + tax |
| Treasury | `BankAccount`/`BankTransaction` | + reconciliation + transfers + petty cash |
| Tax / e‑invoice | none | VAT/withholding + ETA submission |
| Payments | `method` string | gateway + verified webhook + reconciliation |
| Controls | RBAC perms exist | maker‑checker workflow + period close |
| Engine | inline in routes | `lib/finance/*` engine (like `gpa.ts`) |

**Solid to build on:** RBAC roles `CFO`/`FINANCE`/`ACCOUNTANT` + granular `finance.*`/`accounting.*`/`payroll.*`/
`banking.*` permissions; `requirePermission`/`inScope`/`featureEnabled`/`writeAudit`; `Setting`‑JSON config
pattern (`lib/regulations.ts`); Prisma/Neon; the deployed `sinai-rbac` platform.

---

## 4. Cross‑cutting foundations (Phase 0 decisions)

### 4.1 Money → `Decimal(18,4)` (decided)
Use Prisma **`Decimal @db.Decimal(18,4)`**, **not** BigInt piastres. Rationale specific to this repo:
- **`db push`‑only, no migration files, live shared Neon DB** → re‑interpreting integers ×100 is dangerous and
  hard to verify; `Decimal` keeps human‑readable magnitude so a bad backfill is visually obvious and reversible.
- **ETA + VAT** need fractional unit prices and per‑line tax math (≥4 dp) → minor‑units would need a second
  scaling layer anyway.
- Existing inline `reduce((s,p)=>s+p.amount,0)` aggregates migrate to a `Money` helper with minimal churn.
- **Rule:** no JS `+`/`Number()` on money ever again. All arithmetic via **`lib/finance/money.ts`** (a `Money`
  wrapper over `decimal.js`, half‑up rounding at 2 dp for display, 4 dp stored). `Decimal` serializes as string
  over JSON — API layer formats explicitly.

### 4.2 Multi‑tenant scoping
Add `universityId String?` + `@@index([universityId])` to **every** finance row (mirrors `Payroll`/`BankAccount`).
Backfill `FeeAccount`/`FeeItem`/`Payment` from `Student → Department → University`. **Open decision (gate before
backfill):** is this effectively **single‑tenant (Sinai only)** or genuinely multi‑tenant? If single, backfill to
one default `University`; if multi, resolve per row and handle students whose `departmentId` is null (route to a
holding tenant + flag) — a `NOT NULL` flip must not orphan rows.

### 4.3 `lib/finance/*` engine layout (reconciled naming)
```
lib/finance/money.ts        Money helper (decimal.js), parse/format/round, sum, allocate
lib/finance/settings.ts     finance.* Setting loaders (config, posting.map, billing, gateway…) — regulations.ts style
lib/finance/coa.ts          Chart‑of‑Accounts helpers + default COA template seed
lib/finance/periods.ts      fiscal year/period resolution; assertOpen(periodId)
lib/finance/close.ts        period soft/hard close, opening balances, year‑end roll
lib/finance/ledger.ts       postEvent(sourceType, sourceId, lines) — assertBalanced, idempotent, audited
lib/finance/posting-rules.ts resolve event → Dr/Cr account codes from PostingMap (Setting)
lib/finance/statements.ts   trialBalance / incomeStatement / balanceSheet / cashFlow / aging
lib/finance/numbering.ts    DocumentSequence atomic gap‑free legal numbers
lib/finance/billing.ts      fee structures → invoices → installments → receipts → credit notes
lib/finance/approvals.ts    maker‑checker Approval workflow
lib/finance/payments/{provider.ts,paymob.ts,fawry.ts,kashier.ts,reconcile.ts}
lib/finance/eta/{client.ts,document.ts,sign.ts}
lib/finance/payroll.ts, lib/finance/ap.ts, lib/finance/treasury.ts, lib/finance/budget.ts
```

### 4.4 RBAC additions (append to `prisma/rbac/catalog.ts`)
New keys (grant to `CFO` via `finance.*`/`accounting.*` wildcards; scope `ACCOUNTANT`/`FINANCE` per duty):
`finance.gl.account.view/edit`, `finance.gl.journal.view/create/post/reverse`, `finance.period.view/manage/close`,
`finance.invoice.view/issue/void`, `finance.receipt.view/create`, `finance.creditnote.create`,
`finance.payment.create` (initiate checkout), `finance.einvoice.view/create/submit/cancel`,
`finance.vendor.view/edit`, `finance.expense.view/edit/approve`, `finance.payroll.run/approve` (have `payroll.*`),
`finance.budget.view/edit`, `banking.reconciliation.view/edit`. **Maker‑checker** = split `create`/`edit` from
`post`/`approve`/`close` so no single user does both (enforced by the `Approval` workflow).

### 4.5 Finance settings (per‑tenant `Setting` JSON)
`finance.config` (currency EGP, vatPercent 14, withholding per vendor type, tax registration no., rounding),
`finance.posting.map` (event→account‑code rules), `finance.billing` (late‑fee %, grace days, numbering formats,
default tariff per program, aging buckets), `finance.fiscal.calendar` (FY start month + granularity),
`finance.payment.gateway` (active provider, mode), `finance.payment.<provider>.config` (non‑secret ids).
Secrets (gateway API keys, ETA cert) live in **Vercel env**, never in `Setting`.

### 4.6 Controls, audit, fiscal periods
`FiscalYear → AccountingPeriod` gate posting (`assertOpen`); posted entries are **immutable** — corrections are
**reversing entries** only. `Approval` (generic maker‑checker) for journal‑post, payment‑approve, refund,
payroll‑approve, period‑close. Every mutation calls `writeAudit`. Idempotent posting keyed on
`(universityId, sourceType, sourceId)` so retries/webhooks never double‑post.

---

## 5. Data model (new + changed)

**GL core:** `ChartOfAccount` (tree; type ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE; normalSide; `@@unique([universityId,code])`),
`FiscalYear`, `AccountingPeriod`, `JournalEntry` (entryNo, periodId, sourceType/sourceId, status DRAFT/POSTED/REVERSED,
createdById/postedById, reversesEntryId), `JournalLine` (accountId, debit/credit `Decimal(18,4)`, costCenterId?).

**AR (sub‑ledger):** `FeeStructure` + `FeeStructureItem` (reusable tariff per program/level/cohort/year),
`Invoice` + `InvoiceLine` (sequential number, VAT‑aware, ETA fields), `InstallmentPlan` + `Installment`,
`Receipt` + `ReceiptAllocation` (one receipt settles many invoices/installments), `CreditNote`.

**Shared:** `DocumentSequence` (per tenant/doc‑type/fiscal‑year, atomic, gap‑free), `Approval`, `CostCenter`.

**Payments/Tax/ETA:** `PaymentProviderConfig`, `PaymentIntent`, `PaymentTransaction`, `WebhookEvent`,
`TaxRate`, `TaxLine`, `EInvoiceDocument`, `EInvoiceLine`.

**AP:** `Vendor`, `Bill` + `BillLine`, `ExpenseCategory`, `ExpenseClaim` + `ExpenseClaimLine`.

**Payroll v2:** `Employee` (link User/Instructor), `SalaryComponent` + `EmployeeSalaryComponent`, `PayRun`,
`Payslip` + `PayslipLine`.

**Treasury/Budget:** `BankReconciliation` + `ReconciliationLine`, `FundTransfer`, `PettyCash`,
`Budget` + `BudgetLine`.

**Changed existing:** `FeeAccount` → per‑student/year **AR control envelope** (+`universityId`, Decimal);
`FeeItem`/`Payment` (+`universityId`, Decimal; `Payment` becomes a Receipt allocation source); `Payroll`
(superseded by Payroll v2 — keep as read‑only legacy until migrated); `BankAccount`/`BankTransaction` (Decimal);
`Scholarship` (applies to invoices as a discount/credit line).

---

## 6. Phase‑by‑phase plan

Each phase is **independently shippable, additive‑only migration, feature‑flagged** (`featureEnabled('finance.v2.*')`),
and runs **in parallel** with the existing finance pages until cut over.

### Phase 0 — Foundations *(blocks everything; ~1 sprint)*
- **Schema (additive):** shadow `Decimal` columns on the 7 money models; `universityId` on AR tables;
  `FiscalYear`/`AccountingPeriod`; `Approval`; `DocumentSequence`; `CostCenter`.
- **Migration scripts (idempotent, prod‑guarded, backup‑first):** `backfill-money-decimal.ts` (Float→Decimal in
  batches; prints per‑batch Expected/Actual/Δ; halts on tolerance breach), `backfill-finance-tenant.ts`
  (universityId from Student chain; handles nulls), `seed-fiscal-periods.ts`, `seed-coa.ts` (default COA),
  `seed-posting-map.ts`.
- **Lib:** `money.ts`, `settings.ts`, `periods.ts`, `numbering.ts`, `approvals.ts`, `coa.ts`.
- **RBAC + settings** added.
- **Deliverable/verify:** money helper + tests; reconcile Float‑sum vs Decimal‑sum per tenant = 0 Δ; periods seeded;
  no UI change yet (zero user‑visible risk). **Riskiest item in the whole plan** → backup + dry‑run + parallel cols.

### Phase 1 — General Ledger core *(~1–1.5 sprints)*
- **Schema:** `ChartOfAccount`, `JournalEntry`, `JournalLine`.
- **Lib:** `ledger.ts` (`postEvent`/`assertBalanced`/`reverse`), `posting-rules.ts`, `statements.ts`, `close.ts`.
- **APIs:** `…/finance/gl/accounts`, `…/gl/journal` (+`/[id]/post`, `/[id]/reverse`), `…/gl/posting-map`,
  `…/finance/statements/{trial-balance,income-statement,balance-sheet,cash-flow}`, `…/periods` (+`/[id]/close`).
- **UI:** `finance/gl/accounts`, `finance/gl/journal`, `finance/statements`, `finance/periods`, `finance/settings/posting-map`.
- **Deliverable:** post a manual journal entry → see it in Trial Balance/Balance Sheet; period close blocks posting.
- **Critic‑driven invariants:** per‑entry debits==credits enforced in a DB transaction; idempotency key; reversal‑only corrections.

### Phase 2 — AR / student billing *(~2 sprints; highest user value)*
- **Schema:** `FeeStructure`/`FeeStructureItem`, `Invoice`/`InvoiceLine`, `InstallmentPlan`/`Installment`,
  `Receipt`/`ReceiptAllocation`, `CreditNote`; migrate `FeeAccount`→control envelope.
- **Lib:** `billing.ts` (+ GL posting on issue/receipt/credit‑note).
- **APIs:** `…/finance/fee-structures`, `…/invoices` (+`/[id]/issue`,`/void`), `…/installments`, `…/receipts`,
  `…/credit-notes`, `…/scholarships/[id]/apply`, `…/aging`, `…/statements?student=`; extend `/api/{student,parent}/fees`.
- **UI:** `finance/fee-structures`, `finance/invoices` (+detail), `finance/installments`, `finance/receipts`,
  `finance/statements`; student/parent **statement of account** + pay buttons.
- **Migration:** reconstruct invoices from existing `FeeItem`, or post one **opening‑balance invoice** per
  `FeeAccount.totalFees` that doesn't itemize (decision flagged). Existing `Payment`s become `Receipt`s.
- **Deliverable:** issue invoice → installment plan → record receipt → student sees statement; AR aging report;
  **AR control account reconciles to GL `1100`.**

### Phase 3 — Payment gateway *(~1.5 sprints)*
- **Schema:** `PaymentProviderConfig`, `PaymentIntent`, `PaymentTransaction`, `WebhookEvent`.
- **Lib:** `payments/provider.ts` (interface: createCheckout/verifyWebhook/mapStatus/refund/fetchTransaction)
  + `paymob.ts`/`fawry.ts`/`kashier.ts` + `reconcile.ts`.
- **APIs:** `…/payments/checkout` & `/api/student/fees/checkout` (create intent → hosted URL),
  **`/api/payments/webhook/[provider]`** (public, Node runtime, raw‑body HMAC verify → idempotent → post receipt+GL),
  `…/payments/intents`, `…/payments/[id]/refund`, `…/payments/reconcile`, `…/payments/config`.
- **Security (critic blocker):** webhook is the trust boundary — verify signature on the **raw body before any
  DB write**, **reconcile amount/currency against the stored `PaymentIntent`** (never trust the callback amount),
  dedup on `providerTxnId`, **fail‑closed**, log every event to `WebhookEvent`. Secrets in Vercel env only.
- **Deliverable:** student pays tuition online → webhook → receipt auto‑created → GL posted → statement updates.

### Phase 4 — ETA e‑invoicing + tax *(~2 sprints; compliance)*
- **Schema:** `TaxRate`, `TaxLine`, `EInvoiceDocument`, `EInvoiceLine`.
- **Lib:** `eta/client.ts` (auth + submit/cancel), `eta/document.ts` (build canonical JSON), `eta/sign.ts` (CMS/cert signing).
- **APIs:** `…/einvoice` (+`/[id]/submit`,`/cancel`,`/webhook`), `…/tax/rates`, `…/tax/vat-return`.
- **Flow:** issued `Invoice`/`Receipt`/`CreditNote` → build `EInvoiceDocument` (UUID, internalId) → sign → submit
  → poll/receive status (submitted/valid/rejected) → store ETA UUID + official number. Handle **rejections &
  cancellations** explicitly (critic gap). VAT 14% + withholding modeled on lines; gap‑free legal numbering via
  `DocumentSequence`.
- **Needs:** ETA credentials + signing certificate (intermediary cert / USB token strategy) — **owner decision**.

### Phase 5 — AP / expenses / vendors *(~1.5 sprints)*
- **Schema:** `Vendor`, `Bill`/`BillLine`, `ExpenseCategory`, `ExpenseClaim`/`ExpenseClaimLine`.
- **Lib:** `ap.ts` (+ GL posting on bill approve/pay).
- **APIs:** `…/ap/vendors`, `…/ap/bills` (+approve/pay), `…/ap/expenses` (claim + maker‑checker approve).
- **UI:** `finance/ap/vendors`, `finance/ap/bills`, `accounting/expenses`, `accounting/approvals` (the maker‑checker queue).
- **Deliverable:** record a vendor bill → approve → pay → GL (Dr expense, Cr AP, then Cr cash on pay).

### Phase 6 — Payroll v2 *(~2 sprints)*
- **Schema:** `Employee`, `SalaryComponent`/`EmployeeSalaryComponent`, `PayRun`, `Payslip`/`PayslipLine`.
- **Lib:** `payroll.ts` (compute earnings/deductions, income tax + social insurance, net; post to GL).
- **APIs:** `…/payroll/employees`, `…/payroll/components`, `…/payroll/runs` (+`/[id]/approve`,`/post`), `…/payroll/payslips/[id]`.
- **Deliverable:** create a pay run for a month → review payslips → approve → post to GL → mark paid; migrate legacy `Payroll` rows.

### Phase 7 — Treasury, reconciliation & budgeting *(~2 sprints)*
- **Schema:** `BankReconciliation`/`ReconciliationLine`, `FundTransfer`, `PettyCash`, `Budget`/`BudgetLine` (CostCenter from P0).
- **Lib:** `treasury.ts`, `budget.ts`.
- **APIs:** `…/banking/reconciliation` (import statement + match), `…/banking/transfers`, `…/budgets`, `…/budgets/vs-actual`.
- **Deliverable:** bank reconciliation (statement vs ledger matching); budget‑vs‑actual by cost center; cash‑flow statement.

> **Capstone (continuous):** every phase contributes to the **statements** suite (P&L/BS/Cash Flow/TB), which
> becomes complete once AP+Payroll+Treasury post to the GL.

---

## 7. Egyptian compliance (ETA + VAT)
- **Documents:** e‑invoice (sales/tuition), e‑receipt (B2C student payments), e‑credit‑note (refunds/withdrawals).
- **Data:** tax registration number, activity/GS1 codes, UUID + internalId per doc, signed payload, ETA status.
- **Tax:** VAT 14% (configurable) on taxable fee items; withholding on certain vendor payments; VAT‑return report.
- **Numbering:** gap‑free legal sequences (`DocumentSequence`, atomic in a transaction) — auditors require no gaps.
- **Secrets/owner decisions:** ETA client id/secret + **signing certificate** (how it's provisioned in a serverless
  env — likely an external signing service or a long‑lived token), sandbox first, then production onboarding.

## 8. Payment gateway
- **Provider abstraction** so Paymob/Fawry/Kashier are swappable via `finance.payment.gateway` Setting; first
  adapter chosen by which gateway is **contracted** (owner decision). Sandbox credentials needed to build/test.
- **Reconciliation sweep** (`/payments/reconcile`) polls provider for intents stuck `PENDING` and repairs state.
- **Refunds** go through `finance.payment.refund` + a `CreditNote` + GL reversal + (if applicable) ETA e‑credit‑note.

## 9. Data migration & rollout on the live `sinai-rbac` / Neon deploy
1. **Backup Neon first** (mandatory; `db push` has no rollback).
2. **Additive‑only** schema: shadow Decimal cols + new tables; never `ALTER` Float→Decimal in place; never drop a
   column until a reconcile window passes.
3. **Production‑guarded backfill scripts** (refuse unless explicit `CONFIRM_PROD`), batched, idempotent, with
   Δ‑reconciliation that **halts on mismatch**.
4. **Feature flags** (`featureEnabled('finance.v2')`) — new finance UI ships dark; old pages keep working.
5. **Parallel‑run:** new ledger posts alongside the old aggregates; compare reports before cutover.
6. **Cut over** per phase; only after stability, retire legacy fields/pages.
7. Deploy via the established path (`prisma db push` to Neon → `vercel --prod` to `sinai-rbac`; see
   `clientr2-implementation.md` / `deploy-topology-sinai-rbac` memory — target the **Neon** DB, not local‑`.env` Supabase).

## 10. Effort & sequencing summary

| Phase | Theme | Rough size | Risk | Ships value |
|---|---|---|---|---|
| 0 | Foundations (money, tenant, periods) | 1 sprint | **High** (money migration) | enabler |
| 1 | GL core + statements | 1–1.5 | Med | TB/BS visible |
| 2 | AR / student billing | 2 | Med | **high** (invoices, statements, portal) |
| 3 | Payment gateway | 1.5 | Med‑High (webhook) | online tuition payment |
| 4 | ETA e‑invoicing + tax | 2 | High (external) | compliance |
| 5 | AP / expenses | 1.5 | Low‑Med | expense control |
| 6 | Payroll v2 | 2 | Med | payslips + tax |
| 7 | Treasury / reconciliation / budgeting | 2 | Med | bank rec + budgets |

**Critical path:** P0 → P1 → P2 unlock the most value; P3/P4 can parallelize after P2; P5–P7 are independent
sub‑ledgers gated only on P1.

## 11. Open decisions for the owner (gate before Phase 0)
1. **Tenancy:** single‑institute (Sinai only) or genuinely multi‑tenant? (drives the `universityId` backfill).
2. **Fiscal calendar:** Egyptian statutory **Jan–Dec** for tax vs **academic Aug→Jul** for budgeting — one or both?
3. **Chart of Accounts template:** Egyptian Unified Accounting System numbering vs IFRS‑lite education template.
4. **Payment gateway:** which provider is contracted first (Paymob / Fawry / Kashier)?
5. **ETA onboarding:** do you have ETA credentials + a signing certificate, and a preferred signing approach?
6. **Historical balances:** reconstruct invoices from `FeeItem`, or post one opening‑balance invoice per `FeeAccount`?

---
*Plan produced from a 5‑architect design workflow (foundations, GL, AR, payments+ETA grounded in the repo) +
the AP/payroll/treasury/budgeting domain and the integrity/completeness/sequencing critic lenses applied
directly. No code written yet — awaiting go‑ahead and the Phase‑0 decisions above.*

---

## 12. Delivery log — all phases shipped (2026‑06‑17)

Built and deployed phase-by-phase to the live `sinai-rbac` Vercel project + Neon deploy DB
(`ep-sweet-cherry-ap6hyt81`). Every phase: additive-only migration (0 data-loss drops, backup-safe),
tsc 0-introduced (42 pre-existing baseline), ESLint 0, verified live (pages 307 login-gate, APIs 401
guarded). Double-entry invariants (debits==credits, open-period, idempotent posting, reversal-only
corrections) proven live in P1; AR posts reconcile to GL control account 1100.

| Phase | Commit | Live surface |
|---|---|---|
| P0 Foundations (Decimal money, tenant scoping, fiscal periods, engine: money/settings/periods/numbering/approvals) | `e5bf847` | backfilled Float→Decimal (Δ=0), universityId on AR, FY2025+12 periods |
| P1 General Ledger (COA, JournalEntry/Line, posting engine, statements) | `cec3efb` | `/institute/finance/gl`, `/statements` — TB/P&L/BS/Cash Flow |
| P2 AR / student billing (FeeStructure/Invoice/Installment/Receipt/CreditNote, aging, statement) | `b4e545b` | `/institute/finance/billing` |
| P5 AP / expenses (Vendor/Bill/ExpenseClaim) | `7547e4c` | `/institute/finance/ap` |
| P6 Payroll v2 (Employee/Component/PayRun/Payslip) | `d291bc7` | `/institute/finance/payroll` |
| P7 Treasury & budgeting (FundTransfer/BankReconciliation/Budget) | `600668b` | `/institute/finance/treasury` |
| P3 Payment gateway (Paymob adapter + secure webhook) | `f3e668c` | `/institute/finance/payments` — **inert until merchant creds** |
| P4 ETA e-invoicing + VAT (document build + submission flow) | `ef00bd0` | `/institute/finance/einvoice` — **build works; submit inert until ETA creds** |

### Remaining to activate (external dependencies — not code)
- **P3 online payments:** create a Paymob/Fawry/Kashier merchant account → set `PAYMENT_PROVIDER` +
  `PAYMOB_API_KEY/HMAC_SECRET/INTEGRATION_ID/IFRAME_ID` in Vercel env → verify in the gateway sandbox.
  Proven safe while unconfigured: a forged webhook callback returns 503 (inert); when live the webhook
  verifies HMAC on the raw body, dedups on txn id, reconciles amount vs the stored PaymentIntent, fail-closed.
- **P4 ETA submission:** set `ETA_CLIENT_ID/ETA_CLIENT_SECRET` + a signing cert (`ETA_SIGNING_MODE=remote`
  + `ETA_SIGNING_URL/TOKEN`) in Vercel env → verify on ETA preprod. Document build + VAT already work live.

### RBAC
Finance v2 permission keys in `prisma/rbac/catalog.ts`; **ACCOUNTANT = maker** (create drafts/docs),
**CFO = checker** (post/approve/close/submit) via the `finance.*` wildcard. Backfill/seed scripts in
`scripts/` are production-guarded (dry-run unless `CONFIRM_PROD=1`).
