# SOVEREIGN_STATE.md

## 2026-05-09 — Command Centre Authority Rollout Progress

### Active branch

Sovereign Finance Command Centre is moving from frontend QA cockpit toward authoritative safety gate.

Core rule agreed:
- Command Centre full authority means blocking unsafe actions, routes, and later backend writes based on explicit backend policy.
- Command Centre must not hide truth.
- Command Centre must not rely on frontend-only scores.
- Unknown must never become Ready.
- Command Centre blocks unsafe action, not diagnostic visibility.
- If Command Centre blocks anything, Command Centre must show why inside Command Centre:
  - what is blocked
  - block type
  - reason
  - source/rule/check
  - required fix
  - override allowed/not allowed
  - backend enforced/frontend enforced status

### Current verified architecture

Command Centre now has these layers:

- Backend audit endpoint: /api/finance-command-center
- Command Centre frontend display: monthly-close.html
- Shared enforcement loader: /js/enforcement.js
- Navigation authority markers: /js/nav.js
- Page-level soft blocks started with Add Transaction and Bills

Backend authority is currently schema/display/soft-block authority only. Backend mutating API enforcement is not active yet.

### Completed

#### Phase 0 — Architecture / policy

Status: complete.

Completed:
- Honest audit architecture agreed.
- Full authority principle agreed.
- Command Centre blocks unsafe action, not diagnostic visibility.
- Unknown cannot become Ready.
- Every block requires visible explanation in Command Centre.

#### Phase 1 — Backend audit + enforcement schema

Status: complete through /api/finance-command-center v0.1.2.

Completed:
- /api/finance-command-center created.
- Backend endpoint is read-only.
- No D1 writes.
- No ledger tests.
- No /api/money-contracts.
- v0.1.0 went live as backend audit truth endpoint.
- v0.1.1 went live with stronger trial gate, source proofs, read-only guardrails, coverage, and next actions.
- v0.1.2 went live with enforcement schema.

v0.1.2 includes:
- enforcement
- global_status
- global_level
- routes
- actions
- blocked_actions
- view_only_routes
- block_explanations
- override policy disabled

Important:
- Backend enforcement is schema-only right now.
- It does not yet reject mutating API calls.
- It defines what should be blocked and why.
- It does not perform D1 writes.
- It does not run ledger tests.

#### Phase 2 — Command Centre enforcement display

Status: complete through monthly-close.html v0.7.3.

Completed:
- monthly-close.html v0.7.3 live.
- Displays Enforcement Authority.
- Displays Why Things Are Blocked.
- Displays Route Gates.
- Displays Action Gates.
- Displays Blocked Actions.
- Displays View-Only Routes.
- Displays Override Policy.
- Command Centre remains the authority/explanation surface.

Important:
- Command Centre explains enforcement.
- It does not hide truth.
- It must remain accessible even when other routes/actions are blocked.

#### Phase 3 — Shared enforcement loader + nav markers

Status: complete through /js/enforcement.js v0.1.0 and js/nav.js v1.2.0.

Completed:
- /js/enforcement.js v0.1.0 created.
- js/nav.js v1.2.0 live.
- window.SovereignEnforcement available.
- Nav reads /api/finance-command-center.
- Nav shows enforcement markers:
  - Pass
  - Warning
  - View only
  - Blocked
- Nav does not block routes yet.
- Command Centre must always remain accessible.

#### Phase 4A — Add Transaction soft block

Status: complete.

Completed:
- add.html updated to load:
  - /js/nav.js?v=1.2.0
  - /js/enforcement.js?v=0.1.0
  - /js/add.js?v=0.4.3
- js/add.js v0.4.3 live.
- transaction.save soft block added.
- Add page remains viewable.
- Fields remain editable.
- Save button disabled when Command Centre blocks transaction.save.
- Soft block is frontend-only.
- Backend API enforcement is not active yet.

Expected Add verification:
- window.SovereignAdd.version returns v0.4.3
- window.SovereignAdd.enforcement().saveGate.allowed is false while write safety is unknown
- window.SovereignAdd.enforcement().saveGate.action is transaction.save

Important correction from this phase:
- If user reports something looks wrong, verify live source/version/output and compare expected vs actual before proposing fixes.
- Do not immediately accept the claim and ship fixes.
- Classify the issue first:
  - real bug
  - expected soft-block behavior
  - UX/copy ambiguity
  - stale cache/deploy mismatch
  - backend policy issue
  - frontend rendering issue
  - operator misunderstanding

#### Phase 4B — Bills soft block

Status: shipment provided, live confirmation pending.

Provided:
- bills.html v0.8.2
- js/bills.js v0.5.2

Scope:
- Bills remains viewable.
- bill.save blocked when Command Centre blocks it.
- Save controls disabled when write safety is unknown.
- Block reason/source/fix/override/backend status shown.
- /api/money-contracts dependency removed from provided Bills JS.
- Reads /api/bills and /api/accounts.
- No D1 writes from audit/enforcement system.
- No ledger tests.
- No route blocking.

Next session must verify:
- window.SovereignBills.version
- expected v0.5.2
- window.SovereignBills.enforcement()
- expected saveGate.allowed === false
- expected saveGate.action === "bill.save"

If Bills v0.5.2 is live and soft block works, mark Phase 4B complete.

### Current tree

Command Centre Authority Rollout

- Phase 0 — Architecture / policy: complete
- Phase 1 — Backend enforcement schema: complete through /api/finance-command-center v0.1.2
- Phase 2 — Command Centre enforcement display: complete through monthly-close.html v0.7.3
- Phase 3 — Shared enforcement loader + nav markers: complete through js/enforcement.js v0.1.0 + nav.js v1.2.0
- Phase 4 — Page-level soft blocks:
  - Phase 4A Add Transaction / transaction.save: complete
  - Phase 4B Bills / bill.save: provided, live verification pending
  - Phase 4C Debts / debt.save: pending
  - Phase 4D Reconciliation / reconciliation.declare: pending
  - Phase 4E Salary / salary.save: pending
  - Phase 4F Credit Card / cc.use_for_decision + cc.use_for_forecast: pending
  - Phase 4G Forecast / forecast.generate + forecast.mark_ready: pending
- Phase 5 — Route gates: not started
- Phase 6 — Backend API enforcement: not started
- Phase 7 — Override system: not started

### Next safest action next session

1. Verify Bills live state first.
2. If Bills v0.5.2 is live and soft block works, mark Phase 4B complete.
3. Then proceed to Phase 4C: Debts soft block for debt.save.
4. Do not start route gates yet.
5. Do not start backend API enforcement yet.
6. Do not build overrides yet.

### Guardrails still active

- Full-file rewrites only for code files.
- Manual copy-paste only.
- Glean must not write directly to personal GitHub.
- No /api/money-contracts.
- No D1 writes from audit/enforcement work.
- No ledger-polluting smoke tests.
- No route blocking until soft blocks are proven.
- No backend mutating API enforcement until action policy is stable.
- Command Centre must remain accessible at all times.
- Diagnostic visibility must stay available.
- If blocked, show why in Command Centre.
- If user reports a problem, verify before proposing fixes.
- Unknown must stay Unknown.
- Do not infer Credit Card outstanding from lifetime spend.
- Do not fake balances.
- Do not use frontend-only scores as final authority.

### Current known backend truth state

Latest known backend audit state before close:
- Backend audit endpoint exists.
- Required APIs were passing in latest pasted JSON.
- Required D1 tables were passing in latest pasted JSON.
- Write safety remains unknown.
- Runtime remains manual/unknown.
- Credit Card source proof remained unknown because accounts table did not expose a realtime balance column.
- Forecast precision remained unknown.
- Add write safety remained unknown.
- Money Contracts is banned and intentionally not called.
- Backend enforcement schema v0.1.2 is live.
- Frontend enforcement display v0.7.3 is live.
- Nav enforcement markers v1.2.0 are live.
- Add soft block v0.4.3 is live.
- Bills soft block v0.5.2 needs live verification.

### Important process correction

When the operator reports something is wrong, do not jump directly to fixes.

Required process:
1. Verify live state first:
   - current version
   - loaded script URLs
   - backend JSON
   - visible behavior
   - console output if available
   - file state if repo read is available
2. Separate verified facts from interpretation.
3. Compare intended behavior against actual behavior.
4. Classify:
   - real defect
   - expected behavior
   - copy/UX issue
   - stale cache/deploy mismatch
   - backend policy issue
   - frontend rendering issue
   - operator misunderstanding
5. Only then propose a fix or shipment.

This correction exists because premature solutioning caused drag during Add Transaction soft-block review.

### Next likely branch after Bills verification

If Bills soft block passes:
- Phase 4C: Debts soft block for debt.save

Expected Phase 4C behavior:
- Debts page remains viewable.
- debt.save disabled if backend enforcement blocks it.
- Block reason/source/fix/override/backend status visible.
- No route blocking.
- No backend API enforcement yet.
- No D1 writes from audit/enforcement system.
- No ledger tests.

### Do not start yet

Do not start Phase 5 route gates until page-level soft blocks are proven.

Do not start Phase 6 backend API enforcement until:
- action policy names are stable
- page-level soft blocks are verified
- Command Centre explanations are complete

Do not start Phase 7 overrides until backend enforcement is mature.

### Boot reminder for next session

Start with Secure Boot.

After Secure Boot:
1. Verify Bills live state.
2. Confirm whether Phase 4B is complete.
3. Continue with Phase 4C only if Bills passes.
4. Keep Command Centre visible and authoritative.
