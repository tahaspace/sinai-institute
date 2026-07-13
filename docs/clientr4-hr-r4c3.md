# ClientR4 · R4c-3 — HR Module: Payroll Integration + HR Reports (SHIPPED & LIVE)

**Deployed 2026-07-13** → `sinai-rbac`/Neon (commit `d52609a`). Additive schema (1 new table `Loan`, 0 DROP). tsc 42 baseline (0 introduced), ESLint 0. **No new RBAC keys** (reused existing hr.* / payroll.view — no sync needed).

## Scope — final HR sub-phase; closes ClientR4.
Wires attendance/leave/adjustments into payroll and adds the HR reporting family.

## Payroll integration (`lib/finance/payroll.ts`)
`computeFor(employee, cfg, month, universityId)` + `createPayRun` now pull the pay month's:
- **Attendance** → absence deduction (days × dailyRate) + late deduction (lateMinutes/60 × hourlyRate). dailyRate = base/30, hourlyRate = base/30/8.
- **Approved/posted overtime** → taxable earning (hours × hourlyRate).
- **Penalties** → deduction (deductDays × dailyRate).
- **Loans** → monthly installment deduction; `remaining` decremented after the run, auto-CLOSED at zero.
All appear as payslip lines; insurance/tax recompute on the adjusted taxable base.

## Schema
New **`Loan`** (amount / monthlyAmount / remaining / status; `Employee.loans`). Additive.

## Reports (`lib/reporting/reports/hr.ts`) — new `hr` category «الموارد البشرية»
`hr-staff-list`, `hr-staff-by-department`, `hr-new-hires` (dateFrom/dateTo), `hr-attendance-summary` (present/absent/late per employee), `hr-leave-balances`, `hr-payroll-latest` (last run's payslips), `hr-payroll-by-department`, `hr-kpi-center` (workforce/attendance/payroll/loans KPIs; NO_DATA where no source). Registered in the hub; reuse `hr.employee.view`/`hr.attendance.view`/`hr.leave.view`/`payroll.view`.

## UI
`hr/adjustments` API + the attendance page's adjustments card gained a **loan** kind (amount + monthly installment) and a loans column.

## Live verification (2026-07-13)
`hr-staff-list`, `hr-attendance-summary`, `hr-payroll-latest`, `hr-kpi-center` → 401 registered (unknown-id control → 404). App root 200.

---
## ClientR4 — COMPLETE
R4a (finance cost-center profitability) · R4b (detailed result sheets) · R4c-1 (HR org + 360 profile) · R4c-2 (attendance + leave) · R4c-3 (payroll integration + HR reports) — all shipped & live on `sinai-rbac`/Neon. Deferred (inert until later): HR performance management, predictive analytics, live biometric-device import; ML upgrade for predictive reports.
