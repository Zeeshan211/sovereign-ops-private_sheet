# SOVEREIGN_STATE.md

Last updated: 2026-05-09 PKT  
State style: short dashboard  
Durable truth: this file + linked session archives  
Glean memory: routing/governance only, not history dump  

---

## Current Status

Active path: PATH A — Sovereign Finance Command Centre / finance safety gate

Current chunk: Command Centre Authority Rollout

Current phase:
- Phase 4 complete
- Phase 5 live
- Phase 6 route gates next

Live backend:
- `/api/finance-command-center`
- version: `0.2.0`
- enforcement.version: `0.2.0`
- verdict: `ready_with_warnings`
- trial_gate.status: `soft_ready`
- hard_blocker_count: `0`
- write_safety: `0`
- runtime: `0`

Next work:
1. Rewrite/update `GLEAN_OPERATING_SYSTEM.md` governor file.
2. Keep boot vault lightweight.
3. Memory cleanup already started; continue removing stale Sovereign memories if needed.
4. Resume with Phase 6 route gates after governor cleanup.

---

## Phase Tree

Command Centre Authority Rollout

- Phase 0 — Architecture / policy
  - Status: complete

- Phase 1 — Backend audit + enforcement schema
  - Status: complete

- Phase 2 — Command Centre enforcement display
  - Status: complete

- Phase 3 — Shared enforcement loader + nav markers
  - Status: complete

- Phase 4 — Page-level soft blocks / page obedience
  - Status: complete

- Phase 5 — Central Command Centre action policy + lift criteria
  - Status: live through `/api/finance-command-center v0.2.0`

- Phase 6 — Route gates
  - Status: next, not started

- Phase 7 — Backend mutating API enforcement
  - Status: not started

- Phase 8 — Override system + audit trail
  - Status: not started

---

## Live Versions / Known Files

Finance repo: `Zeeshan211/sovereign-finance`

Core:
- `functions/api/finance-command-center.js` — `v0.2.0`
- `/js/enforcement.js` — `v0.1.0`
- `/js/nav.js` — `v1.2.0`

Phase 4 pages:
- Add Transaction — complete
- Bills — complete
- Debts — `window.SovereignDebts.version === "v0.6.1"`; blocked confirmed
- Reconciliation — `window.SovereignReconciliation.version === "v0.4.3"`; blocked confirmed
- Salary — shipped as `salary.html v0.9.1`; backend salary proof passes; `salary.save` remains blocked by write safety
- Credit Card — `cc.html v0.4.2`; live confirmed
- Forecast — `window.SovereignForecast.version === "v0.3.2"`; blocked confirmed

---

## Current Blockers

Hard blockers:
- none

Write safety unknown:
- `transaction.save`
- `bill.save`
- `debt.save`
- `reconciliation.declare`
- `salary.save`

Credit Card proof unknown:
- `credit_card.plan_payment`
- `cc.use_for_decision`
- `cc.use_for_forecast`

Forecast precision unknown:
- `forecast.generate`
- `forecast.mark_ready`

Permanent block:
- `money_contracts.use_as_truth_source`

---

## Current Source Status

APIs passing:
- `/api/balances?debug=1`
- `/api/accounts`
- `/api/transactions`
- `/api/bills`
- `/api/debts`
- `/api/categories`
- `/api/reconciliation`
- `/api/salary`
- `/api/forecast`

D1 required tables passing:
- `accounts`
- `transactions`
- `bills`
- `debts`
- `categories`
- `reconciliation`

Optional tables present:
- `audit_log`
- `salary`
- `settings`

Known data issue:
- Credit Card account exists.
- Credit Card source proof remains unknown because current account schema does not expose a verified realtime balance column.
- Do not infer Credit Card outstanding from lifetime spend.
- Do not treat missing CC source as zero.

---

## Active Guardrails

Repo / delivery:
- Manual copy-paste only.
- No direct GitHub writes by Glean.
- No token storage or token echoing.
- No downloadable files or Canvas unless operator explicitly requests.
- For code files, use full-file rewrites.
- For large files, split into numbered placeholders.
- Verify file size/shape before rewriting.
- Do not replace large files with compressed rewrites.

Finance:
- No `/api/money-contracts` as truth source.
- Unknown never becomes Ready.
- No D1 writes from audit/enforcement.
- No ledger-polluting smoke tests.
- Command Centre blocks unsafe action but does not hide diagnostic truth.
- No route gates until Phase 6.
- No backend mutating API enforcement until Phase 7.
- No overrides until Phase 8.

Verification:
- If something appears wrong, verify first.
- Check live version, backend JSON, current file shape, visible behavior, and console output before fixing.
- Classify as bug, expected behavior, cache/deploy mismatch, backend policy issue, UI/copy issue, or operator misunderstanding.

---

## Boot Vault Behavior

`boot vault` is lightweight now.

Do not require Secure Boot ceremony by default.

Expected boot response:
- Current chunk
- Current phase
- Next phase
- Top blockers only

Do not dump history unless asked.

---

## PATH B — Salah Parked State

Salah remains parked unless operator explicitly switches to PATH B.

Known state:
- Salah D1 today-live foundation exists.
- `/api/salah/log v0.2.0` had worked.
- `/api/salah/today v0.2.0` had returned live data for 2026-05-08.
- Product correction agreed:
  - Fard score is separate from bonus prayers.
  - Fard = Fajr, Dhuhr, Asr, Maghrib, Isha only.
  - Bonus = Jumuah, Tahajjud, Witr, Ishraq, Duha, Awwabin, Nafl.
  - Qaza = recovery.
  - Udhr = attribute, not location/category.

If PATH B resumes:
1. Verify live versions for `functions/api/salah/log.js`, `functions/api/salah/today.js`, and `salah.html`.
2. Finish today.js read model cleanup.
3. Validate no horizontal scrollbar.
4. Do not touch Finance unless operator switches back to PATH A.

---

## Archive Links

Detailed history moved out of this dashboard:

- `/sessions/2026-05-09_command-centre-phase4-phase5.md`
- `/sessions/2026-05-08_salah-today-live.md`

---

## Next Work Order

1. Save this shortened state file.
2. Rewrite/update `GLEAN_OPERATING_SYSTEM.md`.
3. Keep governor concise and current.
4. Finish memory cleanup.
5. Resume Phase 6 route gates only after governor cleanup.
