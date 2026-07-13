# ClientR4 · R4c-5 — HR Predictive Analytics (SHIPPED & LIVE)

**Deployed 2026-07-13** → `sinai-rbac` (commit `225903b`, deploy under explicit user auth — deferred scope). **Reports-only:** no schema change, no new RBAC keys, no sync — just `vercel --prod`. tsc 42 baseline (0 introduced), ESLint 0.

## What it is
Four **transparent, rule-based** estimates in the `hr` reporting category (`lib/reporting/reports/hr-predictive.ts`) — explicitly labelled decision-support, **not ML**; each row carries the reason behind its score; `NO_DATA` when there's no signal. Same honesty contract as the ClientR3 predictive reports.

| Report | Basis |
|---|---|
| `hr-predict-attrition` | leave-risk score from 90-day absences + 180-day penalties + contract-nearing-end + low last performance score; each row lists its factors |
| `hr-predict-absence` | ranked by 90-day absence+late rate |
| `hr-predict-retirement` | real age vs retirement age (60) from `birthDate` |
| `hr-predict-payroll-cost` | 1-year / 3-year projection from the latest pay run (flat-workforce assumption, labelled estimate) |

Permissions reuse `hr.employee.view` / `hr.attendance.view` / `payroll.view`.

## Live verification (2026-07-13)
All four → 401 registered (unknown-id control → 404). App root 200.

## Remaining deferred (need external deps / decisions)
- **Live biometric-device import** — needs a real device/vendor API + creds (would stay inert until provided, like the payment gateway). Manual + CSV import already shipped in R4c-2.
- **ML upgrade for predictive scores** — the platform's deliberate choice is transparent rule-based estimates; a real ML model needs a data/modelling decision and training data.
