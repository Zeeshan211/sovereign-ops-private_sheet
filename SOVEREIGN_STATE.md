# SOVEREIGN_STATE.md — Session Update 2026-05-06 PKT

## Current Chunk

Chunk 1 — FINANCE COMPLETE

## Current Status

Cloudflare finance app is live behind Cloudflare Access. Layer 5B ATM, Layer 5C Nano Loans, and Layer 5D Reconciliation received verified updates in this session.

## Coding Ledger

```text
Window start: 2026-05-06 8:40 PM PKT
Time basis: literal operator/device time only
Coding cap: 120 minutes per rolling 12-hour window
Coding used: 73 / 120 minutes
Remaining: 47 minutes
Ships used: 8 / 8
Current window status: code shipments closed
```

## Completed Ships This Window

```text
1. Reconciliation backend save fix
   - functions/api/reconciliation/[[path]].js v0.1.1
   - Fixed D1 UNIQUE constraint failure for existing account_id.
   - Existing declarations now update instead of failing.

2. Reconciliation modal UX fix
   - reconciliation.html v0.3.1
   - Declare Real Balance modal opens centered and usable.

3. Mobile bottom nav fixed-bottom guard
   - js/nav.js v1.0.4
   - Mobile bottom nav remains fixed at viewport bottom.

4. Nano Loans global navigation
   - js/nav.js v1.0.5
   - Nano Loans added to desktop/sidebar nav.
   - Mobile bottom nav remains daily-core only.

5. Nano Loans Hub integration
   - index.html v0.9.7
   - Hub hero and daily tools now show Nano Loans.

6. Reconciliation nav cache alignment
   - reconciliation.html v0.3.2
   - Loads nav.js v1.0.5.

7. ATM nav cache alignment
   - atm.html v0.1.1
   - Loads nav.js v1.0.5.

8. CC Planner nav cache alignment
   - cc.html v0.2.1
   - Loads nav.js v1.0.5.
```

## Verified Live State

```text
Reconciliation backend save: fixed
Reconciliation modal: fixed
Mobile bottom nav: fixed
Nano Loans nav: fixed
Nano Loans Hub card/pill: fixed
Reconciliation cache: fixed
ATM cache: fixed
CC cache: fixed
```

## Parked Backlog

```text
P0 - Snapshot / rollback verification
- Snapshots may be broken or incomplete.
- Must verify snapshot rows, snapshot_data payloads, restore path, and actual rewind capability.

P0 - Bills logic
- Maid Bill is paid in sheet but Cloudflare shows overdue.
- Bill payment account must not be constant.
- Bills must be payable from any selected account.
- Paid status must come from real payment events or linked transactions.

P1 - ATM ledger audit
- ATM UI looks strong.
- Need verify ledger invariants:
  bank out, cash/wallet in, optional pending fee, reversal once only, audit trail.

P1 - Nano Loans ledger audit
- Need verify create, repay, and push-to-CC update ledger, balances, status, and audit correctly.
- No fake loan smoke tests during build phase unless explicitly approved.

P1 - Salary rebuild
- Current salary page is too simple.
- Needs salary components, dropdowns, tax adjustments, deductions, allowances, received amount, destination account, and variance logic.

P1 - Goals rebuild
- Goals page shows 0 active goals.
- Needs useful goal engine: target, current amount, funding account, monthly contribution, due date, progress, shortfall.

P2 - Charts upgrade
- Charts look good.
- Need live moving bars and circular animations using real API values only.
- No fake numbers.
- Fix lower box where longest bars hide date labels.

P2 - Premium UI upgrade
- Side navigation is going into scroll.
- Needs premium fixed/collapsible side rail, animation, active glow, real-data cards, mobile drawer/bottom-nav split.
- Whole-site UI should move toward 3D/5D/8D feel without sacrificing usability or truth.
```

## Production Deadline Framework v0.2

### Non-Negotiables

```text
120-minute coding cap remains active inside a rolling 12-hour window.
Coding debit is literal operator/device time only.
Estimates are planning ceilings only, never automatic debits.
Ship count cannot be silently expanded mid-window.
```

### Normal Mode

```text
Activation: default
Coding cap: 120 minutes / 12 hours
Ship cap: 8 ships
Mutating ships: max 2
Tree report: every 5 ships
```

### Production Deadline Mode

Activation phrase:

```text
activate production deadline mode
```

Required declaration:

```text
Objective:
Must finish:
Must not touch:
Max risk:
Rollback/snapshot status:
```

Limits:

```text
Coding cap: 120 minutes / 12 hours
Ship cap: 12 ships
Mutating ships: max 3
Tree report: every 4 ships
Mandatory stop after 2 same-class failures
Must be activated before Ship 8
```

Allowed:

```text
- completing already-started layer branches
- cache alignment
- low-risk UI completion
- small backend fixes tied to active broken behavior
- verification-driven cleanup
```

Not allowed:

```text
- broad redesign
- speculative polish
- fake-data smoke tests
- risky schema work without snapshot proof
```

### Emergency Repair Mode

Activation phrase:

```text
activate emergency repair mode
```

Required condition:

```text
Live production behavior is broken, blocking, or corrupting user trust.
```

Limits:

```text
Coding cap: 120 minutes / 12 hours
Ship cap: 16 ships
Mutating ships: max 4
One module at a time
No feature expansion
Tree report: every 3 ships
```

Allowed:

```text
- broken save paths
- live navigation/access breakage
- ledger corruption risks
- payment/bill/account logic bugs
- safety control restoration
```

Not allowed:

```text
- visual upgrades
- new features
- broad redesigns
- non-essential improvements
```

### Satisfaction Work Lane

When ship cap is reached but coding time remains, allowed work continues as read-only planning.

Allowed:

```text
- read-only audits
- root-cause investigation
- next-session ship queue
- file-by-file inspection
- acceptance criteria
- UI design direction
- logic invariants
- test plans
- rollback planning
- risk ranking
```

Not allowed:

```text
- full-file rewrites
- SQL mutations
- deploy instructions
- new code blocks
- hidden small fixes
```

## Enforcement Rule

```text
Casual override language does not count.

Invalid:
- continue
- go
- do it
- override
- production grade override
- deadline pressure

Valid override after cap:
- exact override command repeated 10 times for the same blocked action
- or correct mode activated before the cap is reached
```

## Recommended Next Session Mode

```text
Mode: Production Deadline Mode
Objective: Finance logic reliability before premium UI
Must finish:
1. Snapshot/rollback proof
2. Bills paid-state + payment-account fix
3. ATM ledger invariant audit/fix
4. Nano Loans ledger invariant audit/fix

Must not touch:
- broad UI redesign before logic proof
- fake-data smoke tests
- schema mutations without rollback proof

Max risk:
- Red allowed only for bills/ledger safety fixes
```

## Recommended Next Ship Order

```text
1. Snapshot/rollback proof
2. Bills paid-state and payment-account fix
3. ATM ledger invariant audit/fix
4. Nano Loans ledger invariant audit/fix
5. Salary engine foundation
6. Goals engine foundation
7. Charts label collision fix
8. Charts real-value motion
9. Premium side navigation
10. Whole-site polish pass
11. Final cache/version sweep
12. Read-only acceptance audit
```

## Final Principle

Move fast, but never let speed hide uncertainty.

If logic is not proven, mark it not proven.

If rollback is not proven, treat safety as weak.

If UI is beautiful but finance truth is wrong, logic wins first.

If ship cap is closed, continue through audits, specs, and acceptance planning instead of forcing rushed code.
