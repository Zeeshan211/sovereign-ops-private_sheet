# Sovereign Ops Governance v0.4

## Purpose

This governance document exists for one reason:

Move the project forward fast without letting speed hide uncertainty.

The old problem was not ambition.

The old problem was uncontrolled execution:

    too many rushed changes
    weak proof
    unclear rollback
    ship counts treated like emotion instead of operating limits
    long coding sessions that disturbed sleep and off-day recovery
    unnecessary tool spikes caused by repeated context rebuilding
    insufficient separation between Motive work systems and personal project execution

The new model protects all sides:

    Discipline must stay strong enough to prevent damage.
    Productivity must stay high enough to finish the project.
    Off-days must allow heavier output because available operator capacity is different.
    Safety gates must scale with risk, not blindly throttle every small improvement.
    Personal repo work must remain manual-write and low-noise.
    PAT stays available as a controlled read key because repo scanning and comparison are operationally necessary.

This document replaces rigid ship limits with a flexible capacity system.

## Current Foundation

Sovereign Ops uses OS v1.2 as the active binding operating contract.

OS v1.2 owns:

    Secure Boot First
    PAT Policy
    Secure Boot Guard
    boot read order
    Session Control Card
    timing mechanism
    confidence protocol
    pre-flight checklist
    7-layer audit
    ship gate
    post-ship contract
    stop conditions
    state rules
    low-noise usage hygiene

Governance v0.4 owns:

    operating modes
    ship caps
    off-day throughput
    mutating ship limits
    usage hygiene framework
    session shape
    dissatisfaction control
    durable implementation expectations

State owns:

    current chunk
    current layer
    current backlog
    completed ships
    current ledger
    known blockers
    next-session queue

Core relationship:

    OS = how Glean behaves
    Governance = how much we can do
    State = where the project is now

## Core Principle

The project is governed by proof, not fear.

Speed is allowed.

Blind speed is not.

If a change is read-only, visual, cache-only, copy-only, or low-blast-radius, it should not be treated the same as a schema migration, ledger mutation, payment logic change, or destructive operation.

Ship count controls volume.

Risk class controls danger.

Coding ledger controls time.

All three must be tracked.

---

# 1. Definitions

## 1.1 Ship

A ship is any completed operator action that changes the durable project state.

Examples:

    GitHub file rewrite
    GitHub new file
    D1 SQL mutation
    schema migration
    Cloudflare config change
    state file update
    governance file update
    OS file update
    version/cache alignment deployed to production

## 1.2 Non-Ship Work

These do not count as ships:

    reading repo files
    reading docs
    inspecting live behavior
    diagnosing root cause
    planning next ship queue
    writing acceptance criteria
    writing rollback plans
    building invariants
    comparing logic against sheet behavior
    UI direction without deploy instructions
    governance discussion without file rewrite

Non-ship work can continue even after ship caps are reached.

## 1.3 Mutating Ship

A mutating ship changes live data, ledger behavior, business logic, account balances, bill status, loan status, debt status, audit logs, or schema.

Examples:

    Bills payment logic
    ATM ledger behavior
    Nano Loans repay/push-to-CC logic
    balance computation
    snapshot restore logic
    D1 INSERT / UPDATE / DELETE
    ALTER TABLE
    audit_log writes

## 1.4 Non-Mutating Ship

A non-mutating ship changes UI, navigation, copy, cache references, display order, version numbers, read-only behavior, governance text, or state metadata.

Examples:

    navigation cache alignment
    UI layout update
    side rail improvement
    charts label fix
    visual animation using existing real data
    page footer/version bump
    read-only endpoint
    help text correction
    governance version alignment
    state file metadata correction

## 1.5 Safety Ship

A safety ship restores or proves trust.

Examples:

    snapshot proof
    rollback proof
    restore path fix
    ledger invariant fix
    paid-state correction
    account selection bug fix
    corruption prevention
    secure boot hardening
    PAT policy hardening

Safety ships receive priority over polish.

---

# 2. Operating Modes

## 2.1 Normal Workday Mode

Use this on Motive shift days, low-energy days, or mixed-responsibility days.

The operator's regular Motive shift is:

    4 PM - 1 AM PKT

Limits:

    Ship cap: 8 ships per calendar day
    Mutating ships: max 2
    High-risk ships: max 1
    Coding cap: 120 literal coding minutes per rolling 12 hours
    Tree report: every 5 ships

Best for:

    small fixes
    cache alignment
    one or two logic fixes
    read-only audits
    controlled progress while work responsibilities exist

Normal Workday Mode is the default.

## 2.2 Off-Day Sprint Mode

Use this on the operator's actual off-days:

    Tuesday
    Wednesday

These days are structurally different from Motive shift days.

Activation phrase:

    activate off-day sprint mode

Required declaration:

    Objective:
    Must finish:
    Must not touch:
    Max risk:
    Rollback/snapshot status:
    Off-day ship target:

Limits:

    Eligible days: Tuesday and Wednesday PKT by default
    Ship cap: up to 20 ships per calendar day
    Mutating ships: max 5
    High-risk ships: max 2
    Schema ships: max 1 unless rollback proof is already verified
    Coding cap: 120 literal coding minutes per rolling 12 hours
    Second coding window allowed only after the rolling 12-hour reset
    Tree report: every 5 ships
    Mandatory stop after 2 same-class failures

Important rule:

    20 ships per day does not mean 20 risky changes.

It means the day can contain up to 20 completed production movements if the risk mix stays controlled.

A healthy 20-ship off-day looks like:

    5 logic/safety ships max
    5 UI/read-only ships
    5 cache/version/documentation ships
    5 verification/acceptance/state ships

A bad 20-ship off-day looks like:

    10 ledger rewrites
    3 schema mutations
    4 unverified restore changes
    3 broad UI redesigns

That is not sprinting.

That is gambling.

Off-day mode gives capacity.

It does not force all 20 ships.

## 2.3 Production Deadline Mode

Use this when a specific branch must be finished before the operator can consider the layer complete.

Activation phrase:

    activate production deadline mode

Required declaration:

    Objective:
    Must finish:
    Must not touch:
    Max risk:
    Rollback/snapshot status:

Limits:

    Ship cap: 12 ships per calendar day
    Mutating ships: max 3
    High-risk ships: max 1
    Coding cap: 120 literal coding minutes per rolling 12 hours
    Tree report: every 4 ships
    Mandatory stop after 2 same-class failures
    Must be activated before the normal ship cap is reached

Best for:

    already-started layer completion
    cache alignment
    low-risk UI completion
    small backend fixes tied to active broken behavior
    verification-driven cleanup

Not for:

    broad redesign
    speculative polish
    fake-data smoke tests
    risky schema work without rollback proof

## 2.4 Emergency Repair Mode

Use this only when live production behavior is broken, blocking, or corrupting trust.

Activation phrase:

    activate emergency repair mode

Required declaration:

    Broken behavior:
    Affected module:
    User impact:
    Must not touch:
    Rollback/snapshot status:

Limits:

    Ship cap: 16 ships per calendar day
    Mutating ships: max 4
    High-risk ships: max 2
    One module at a time
    No feature expansion
    Coding cap: 120 literal coding minutes per rolling 12 hours
    Tree report: every 3 ships
    Mandatory stop after 2 same-class failures

Allowed:

    broken save paths
    navigation/access breakage
    ledger corruption risks
    payment/bill/account logic bugs
    safety control restoration

Not allowed:

    visual upgrades
    new features
    broad redesign
    non-essential improvements

## 2.5 Ultra-Secure Boot Mode

Use only when the operator wants maximum isolation.

Activation phrase:

    activate ultra-secure boot

Behavior:

    no PAT
    no raw URL read
    operator pastes OS + Governance + State manually
    Glean uses only pasted files for that session
    Glean does not supplement from memory

Ultra-secure mode is safer but slower.

It is not the default because PAT is operationally necessary for normal repo scanning and comparison.

## 2.6 Satisfaction Work Lane

This lane stays open even when the ship cap is reached.

Allowed:

    read-only audits
    RCA
    file inspection
    next-session ship queue
    acceptance criteria
    UI direction
    logic invariants
    test plans
    rollback planning
    risk ranking
    governance/spec writing

Not allowed:

    full-file rewrites
    SQL mutations
    deploy instructions
    new code blocks
    hidden small fixes

---

# 3. Time Budget

## 3.1 Coding Time

The coding budget remains:

    120 literal coding minutes per rolling 12-hour window

Only real operator/device time counts.

Estimates are planning ceilings only.

If a coding block starts at 8:40 PM and ends at 8:52 PM, the debit is 12 minutes.

Not 30.

Not 45.

Not whatever was guessed earlier.

## 3.2 Automatic Timing Mechanism

The operator must not be asked to type time every message.

Timing hierarchy:

    1. Assistant-visible message timestamps if available.
    2. Current system date/time if available.
    3. One operator-provided anchor time only when needed.
    4. Operator time confirmation only if timestamp is unavailable, ambiguous, or block crosses a date/window boundary.

Coding ledger starts only when Glean begins a CODE or SHIP block.

Read-only diagnosis, repo inspection, planning, audit, verification, and backlog parking do not count unless they lead directly into code generation in the same block.

## 3.3 Coding Block Ledger

Before any CODE/SHIP action, Glean must show:

    CODING LEDGER

    Window start:
    Time basis:
    Actual coding minutes used:
    Remaining minutes:
    Current action classification:
    Will this debit budget:
    Ships used:
    Ships remaining:
    Mutating ships used:
    Mutating ships remaining:

After any CODE/SHIP action, Glean must close with:

    BLOCK CLOSEOUT

    Block start:
    Block stop:
    Debit:
    New coding used:
    New coding remaining:
    Ships used:
    Ships remaining:

## 3.4 What Counts Against Coding Time

Counts:

    writing production code
    preparing full-file rewrites
    writing SQL mutation blocks
    preparing deploy instructions
    live implementation decisions that directly produce code

Does not count:

    reading files
    searching docs
    auditing
    planning
    governance discussion
    acceptance criteria
    invariant design
    explaining status
    waiting for Cloudflare deploy
    waiting for operator testing
    conversation gaps between blocks

## 3.5 Off-Day Time Handling

Off-Day Sprint Mode does not erase the 120-minute/12-hour coding cap.

Instead, it uses the day better.

The operator can run:

    Window A: 120 coding minutes max
    Window B: another 120 coding minutes only after rolling 12-hour reset

This allows a real Tuesday or Wednesday off-day to reach 20 shipments without turning one coding window into a blur.

The ship cap expands by day.

The coding cap remains enforced by rolling window.

---

# 4. Ship Risk Classes

## 4.1 Green Ship

Low risk.

Examples:

    cache bump
    version alignment
    footer update
    copy fix
    visual-only UI polish
    read-only display fix
    navigation link correction

Requirements:

    file read this turn
    consumer impact checked
    rollback path stated
    post-ship visual verification

Green ships can be batched when they touch separate files and have no shared contract risk.

## 4.2 Yellow Ship

Medium risk.

Examples:

    form validation
    API read behavior
    display logic based on real API data
    non-ledger business calculation
    UI state management
    modal behavior
    governance/state file alignment
    OS policy update

Requirements:

    file read this turn
    consumer files read if relevant
    RCA if fixing a bug
    rollback path stated
    post-ship pass/fail criteria

Yellow ships should usually ship one at a time.

## 4.3 Red Ship

High risk.

Examples:

    bills paid-state logic
    payment account selection
    ATM ledger update
    Nano Loans repayment logic
    balance mutation
    snapshot restore
    D1 mutation
    audit log writes

Requirements:

    full pre-flight
    schema verified this turn
    file state verified this turn
    consumer impact mapped
    blast radius declared
    rollback/snapshot path verified or honestly marked weak
    post-ship contract pre-declared
    no fake-data smoke test unless explicitly approved

Red ships are never bundled.

## 4.4 Black Ship

Critical/destructive.

Examples:

    ALTER TABLE
    DELETE
    bulk data rewrite
    restore from snapshot
    migration with data backfill
    cross-module destructive operation

Requirements:

    full pre-flight
    7-layer audit
    snapshot proof
    rollback proof
    one ship only
    operator explicit confirmation

Black ships should be rare.

On off-days, the higher ship cap does not make Black ships safer.

---

# 5. Daily Ship Budgets

## 5.1 Normal Workday Budget

    Total ships: 8
    Green: up to 8
    Yellow: up to 4
    Red: up to 2
    Black: 0-1
    Mutating total: max 2

## 5.2 Production Deadline Budget

    Total ships: 12
    Green: up to 8
    Yellow: up to 5
    Red: up to 3
    Black: max 1
    Mutating total: max 3

## 5.3 Emergency Repair Budget

    Total ships: 16
    Green: as needed inside affected module
    Yellow: up to 6
    Red: up to 4
    Black: max 2
    Mutating total: max 4

## 5.4 Off-Day Sprint Budget

    Total ships: 20
    Green: up to 12
    Yellow: up to 8
    Red: up to 5
    Black: max 2
    Mutating total: max 5

## 5.5 Off-Day Recommended Mix

Default mix:

    1-5: Logic/safety foundation
    6-10: UI/read-only improvements
    11-15: Cache/version/page alignment
    16-20: Acceptance audit, state update, final cleanup

This gives the project real movement without putting all 20 ships in the most dangerous category.

---

# 6. Activation Rules

## 6.1 Normal Mode

No activation needed.

Default mode.

## 6.2 Production Deadline Mode

Must use exact phrase:

    activate production deadline mode

Must include:

    Objective:
    Must finish:
    Must not touch:
    Max risk:
    Rollback/snapshot status:

## 6.3 Off-Day Sprint Mode

Must use exact phrase:

    activate off-day sprint mode

Must include:

    Objective:
    Must finish:
    Must not touch:
    Max risk:
    Rollback/snapshot status:
    Off-day ship target:

Allowed target:

    Up to 20 ships per calendar day

## 6.4 Emergency Repair Mode

Must use exact phrase:

    activate emergency repair mode

Must include:

    Broken behavior:
    Affected module:
    User impact:
    Must not touch:
    Rollback/snapshot status:

## 6.5 Ultra-Secure Boot

Must use exact phrase:

    activate ultra-secure boot

Must include pasted files:

    GLEAN_OPERATING_SYSTEM.md
    SOVEREIGN_GOVERNANCE.md
    SOVEREIGN_STATE.md

---

# 7. Ship Count Rules

## 7.1 Ship Count Is Not Equal to Effort

A one-line cache bump and a ledger mutation are both ships, but they are not equal risk.

Ship count controls volume.

Risk class controls danger.

Both must be tracked.

## 7.2 Ship Count Must Be Visible

Before every ship, show:

    Mode:
    Ship count used:
    Ships remaining:
    Mutating ships used:
    Mutating ships remaining:
    Coding minutes used:
    Coding minutes remaining:
    Current action classification:
    Will this debit coding time:

## 7.3 Tree Report

Normal Mode:

    every 5 ships

Production Deadline Mode:

    every 4 ships

Emergency Repair Mode:

    every 3 ships

Off-Day Sprint Mode:

    every 5 ships

Tree report format:

    Current layer:
    Completed branches:
    Active branch:
    Remaining branches:
    Risk remaining:
    What is needed for 100%:

---

# 8. Secure Boot and PAT Governance

## 8.1 Boot Phrase

`boot vault` is a public wake word.

It is not authentication.

It only starts Secure Boot Guard.

## 8.2 Identity and Authorization

Before revealing state, Glean must pass:

    identity check when available
    fresh authorization check
    scope check
    no-peek check

If identity is not the operator:

    This boot command is operator-bound. I cannot load or disclose Sovereign Ops state from this account.

If identity is unknown or authorization is missing:

    Need fresh GitHub PAT to read the required Sovereign Ops files — paste it, or paste the files directly.

No backlog, repo detail, state, architecture, ledger, or prior memory may be revealed before Secure Boot passes.

## 8.3 PAT Policy

PAT remains allowed and necessary.

PAT is not a write key.

PAT is a controlled read key.

Rules:

    fresh per session
    fine-grained
    read-only
    repo-scoped
    never stored
    never echoed
    never written to files
    never used for direct repo writes
    used only for read / scan / compare / analyze

Operating model:

    PAT = controlled read key
    Glean = scanner / analyzer / planner / full-file rewrite drafter
    Operator = only committer / writer

## 8.4 Manual Paste Mode

Manual paste mode exists for ultra-sensitive work.

It is not the default.

Default remains session-only read-only PAT because repository scanning, analysis, and comparison are too painful without it.

---

# 9. Off-Day Productivity Rules

## 9.1 Off-Day Is a Throughput Mode

Off-day mode exists because the operator has more usable project capacity.

It is not a loophole.

It is not chaos mode.

It is a structured sprint.

## 9.2 The 20-Ship Day Must Have a Spine

Every off-day sprint must start with a spine:

    Objective:
    Top 5 outcomes:
    Risk budget:
    Ship sequence:
    Stop conditions:

Example:

    Objective: Finance logic reliability before premium UI

    Top 5 outcomes:
    1. Snapshot proof
    2. Bills payment account fix
    3. ATM ledger invariant proof
    4. Nano Loans ledger proof
    5. Final state update

    Risk budget:
    Red max 5
    Black max 1 unless rollback proof is strong

    Ship sequence:
    Safety first, then logic, then UI, then cache, then acceptance

    Stop conditions:
    2 same-class failures
    rollback proof missing for Red/Black
    ledger uncertainty unresolved

## 9.3 Off-Day Work Must Still Prioritize Logic Before Beauty

Off-day priority:

    1. Safety proof
    2. Ledger truth
    3. Payment/account correctness
    4. Logic completion
    5. UI upgrade
    6. Cache/version polish
    7. Acceptance audit

If UI is beautiful but finance truth is wrong, logic wins first.

---

# 10. Stop Conditions

Stop conditions are engineering brakes.

Stop if:

    1. Operator says halt or stop.
    2. Same root-cause class fails twice.
    3. Pre-flight has an unchecked required box.
    4. A decision depends on an assumption.
    5. Red/Black ship lacks rollback path.
    6. Live data contradicts expected logic.
    7. Snapshot/restore proof is weak but mutation depends on it.
    8. Operator reports production behavior worse after ship.
    9. Personal/Motive scope becomes mixed.
    10. Secure Boot Guard has not passed.
    11. PAT policy would be violated.
    12. State file is stale and decision depends on it.

---

# 11. Override Rules

## 11.1 Casual Override Does Not Count

These do not override governance:

    continue
    go
    do it
    override
    push
    ship it
    deadline pressure
    production grade override

## 11.2 Valid Override

A valid override requires one of:

    1. Correct mode activated before cap breach.
    2. Exact override command repeated 10 times for the same blocked action.
    3. Emergency Repair Mode activated for live broken/blocking/corrupting behavior.

## 11.3 Never Casually Override

Never casually override:

    no rollback proof for Red/Black mutation
    unknown schema
    unverified file state
    assumption-dependent decision
    two same-class failures
    live ledger corruption risk
    Secure Boot failure
    PAT policy violation
    personal/Motive scope mixing

---

# 12. Enforcement Stack

Governance is only useful if it is enforced in every session.

## 12.1 The Files

    GLEAN_OPERATING_SYSTEM.md
    Role: discipline contract
    Owns: Secure Boot, PAT Policy, gates, confidence protocol, pre-flight, ship gate, post-ship contract, halt rules

    SOVEREIGN_GOVERNANCE.md
    Role: capacity and mode policy
    Owns: Normal / Production Deadline / Emergency Repair / Off-Day Sprint limits, usage hygiene, session framework

    SOVEREIGN_STATE.md
    Role: current project state
    Owns: active chunk, active layer, backlog, completed ships, ledger, known risks, next queue

    sessions/YYYY-MM-DD_session.md
    Role: optional audit trail
    Owns: longer closeout notes when state file would become too large

## 12.2 Boot Order

Every boot session must load in this order:

    1. Run Secure Boot Guard.
    2. Read GLEAN_OPERATING_SYSTEM.md.
    3. Read SOVEREIGN_GOVERNANCE.md.
    4. Read SOVEREIGN_STATE.md.
    5. Render Session Control Card.
    6. Wait for operator mode confirmation.

No coding starts before this.

No ship count starts from memory alone.

No governance mode activates from intention alone.

## 12.3 Session Control Card

At the start of every properly booted session, Glean must render:

    SESSION CONTROL CARD

    Date / day:
    Operator context:
    Shift window:
    Eligible mode:
    Active mode:

    Active chunk:
    Active layer:
    Top 3 active items:
    Known blockers:

    Ship cap today:
    Ships used:
    Ships remaining:
    Mutating ships used:
    Mutating ships remaining:

    Coding window start:
    Coding window reset:
    Coding used:
    Coding remaining:
    Timing basis:

    Gates active:
    7-layer audit required for Red/Black:
    State file update required at close:
    Secure Boot passed:
    PAT policy active:

If this card is missing, the session is degraded.

Degraded sessions can continue for read-only work.

Degraded sessions cannot ship Red or Black changes.

## 12.4 Before Every Ship

Before every ship, Glean must show:

    SHIP GOVERNANCE CHECK

    Mode:
    Ship number:
    Risk class:
    Mutating:
    Layer fit:
    Pre-flight required:
    7-layer audit required:
    State file impact:
    Coding debit:
    Timing basis:
    Stop condition check:

If any required field is unclear, the ship does not proceed.

## 12.5 After Every Ship

After every ship, Glean must close with:

    POST-SHIP CLOSEOUT

    Ship result:
    Verification result:
    Coding debit:
    Ships used:
    Mutating ships used:
    Strike count:
    State file update needed:
    Next safest action:

No ship should disappear into chat without being counted.

No failure should disappear without becoming RCA, strike, or parked risk.

---

# 13. 7-Layer Audit Preservation

The 7-layer audit remains mandatory for Red and Black ships.

Off-Day Sprint Mode increases output capacity.

It does not weaken audit requirements.

## 13.1 Full 7-Layer Audit Required For

    schema mutation
    destructive SQL
    audit_log behavior
    snapshot restore
    ledger mutation
    bills payment logic
    ATM movement logic
    Nano Loans repayment / push-to-CC logic
    balance computation changes
    cross-module contract changes
    secure boot changes
    PAT policy changes

## 13.2 Reduced Audit Allowed For

    cache bump
    version alignment
    visual-only layout change
    copy update
    nav link correction
    read-only display improvement
    governance wording cleanup
    state metadata alignment

Reduced audit still needs:

    file read this turn
    consumer impact checked
    rollback path stated
    verification step declared

## 13.3 Audit Rule

The audit scales with risk.

It never disappears.

A Green ship gets a small audit.

A Red ship gets a full audit.

A Black ship gets the full audit plus explicit operator confirmation.

---

# 14. Usage Hygiene and Low-Noise Operation

The goal is not stealth.

The goal is disciplined, normal-volume, low-waste usage.

Personal project work must not create abnormal spikes, unnecessary tool storms, or messy crossover with Motive systems.

Rules:

    1. Use durable state files so context is not repeatedly rebuilt from scratch.
    2. Prefer one clean boot and one clean closeout over many scattered mini-sessions.
    3. Avoid unnecessary searches once the needed file is known.
    4. Use targeted reads, not broad tool spam, unless exhaustive scan is truly required.
    5. Keep personal repo work manual-copy based.
    6. Do not use Motive GitHub authorization for personal repos.
    7. Do not use Code Writer for personal Sovereign Ops repo changes.
    8. Do not paste secrets into artifacts, state files, or logs.
    9. Do not turn governance into a monitoring-bypass system.
    10. Lower the actual workload instead of trying to hide a workload spike.
    11. Split off-day sprints into clean blocks.
    12. Avoid repeated reads of the same file unless file changed.

This is not about evading admins.

This is about not creating the spike in the first place.

Less waste.

Fewer repeated reads.

Cleaner sessions.

Clearer state.

Normal usage profile because the system is efficient, not because anything is hidden.

---

# 15. Dissatisfaction Control

The system must avoid dissatisfaction at both ends.

## 15.1 Operator Dissatisfaction

Operator dissatisfaction happens when governance blocks useful work even though risk is low and capacity exists.

Fix:

    Off-Day Sprint Mode allows up to 20 ships.
    Green/Yellow ships can move faster.
    Read-only planning remains open after caps.
    Low-risk batches are allowed when contracts do not overlap.
    PAT remains available for practical repo scanning.

## 15.2 Safety Dissatisfaction

Safety dissatisfaction happens when speed creates uncertainty, broken logic, weak rollback, or ledger doubt.

Fix:

    Red/Black ships never bypass full gates.
    7-layer audit remains mandatory where risk demands it.
    State file records unresolved risk honestly.
    Two same-class failures stop that class.
    Rollback weakness is declared, not hidden.

## 15.3 Usage Dissatisfaction

Usage dissatisfaction happens when workflow creates abnormal volume, repeated context pulling, unnecessary tool activity, or long uncontrolled coding runs.

Fix:

    one boot per session
    durable state file
    targeted file reads
    no personal repo direct writes through Motive tools
    no unnecessary tool loops
    no massive unplanned coding runs
    closeout state after meaningful work

The answer is not to hide activity.

The answer is to reduce waste and make the activity naturally smaller, cleaner, and more normal.

---

# 16. Definitive Session Framework

Every session must follow this sequence:

    PHASE 1 - BOOT
    Secure Boot Guard.
    Read OS, Governance, State.
    Render Session Control Card.

    PHASE 2 - DECLARE MODE
    Normal / Production Deadline / Emergency Repair / Off-Day Sprint.
    No mode means Normal.

    PHASE 3 - DECLARE OBJECTIVE
    One objective.
    Top outcomes.
    Must not touch.
    Risk budget.

    PHASE 4 - BUILD SHIP QUEUE
    List ships in order.
    Classify each Green / Yellow / Red / Black.
    Mark mutating yes/no.

    PHASE 5 - EXECUTE WITH GATES
    Before each ship: governance check.
    During each ship: code ledger active.
    After each ship: post-ship closeout.

    PHASE 6 - TREE REPORT
    Every 5 ships in Normal / Off-Day.
    Every 4 ships in Production Deadline.
    Every 3 ships in Emergency Repair.

    PHASE 7 - CLOSEOUT
    Update state file.
    Record completed ships.
    Record unresolved risks.
    Record next session queue.
    Record coding ledger.
    Run security closeout.

If any phase is skipped, the session is degraded.

Degraded sessions can continue for read-only work.

Degraded sessions cannot ship Red or Black changes.

---

# 17. Implementation Status

Durable implementation is active.

Completed:

    /SOVEREIGN_GOVERNANCE.md created
    /GLEAN_OPERATING_SYSTEM.md hardened to v1.2
    /SOVEREIGN_STATE.md updated to mark governance active

Current alignment target:

    Governance version: v0.4
    OS version expected: v1.2
    Secure Boot: active
    PAT policy: active
    Session Control Card: mandatory

Future boot flow:

    1. Operator types boot vault.
    2. Glean runs Secure Boot Guard.
    3. Glean requests fresh PAT or pasted files if needed.
    4. Glean reads GLEAN_OPERATING_SYSTEM.md.
    5. Glean reads SOVEREIGN_GOVERNANCE.md.
    6. Glean reads SOVEREIGN_STATE.md.
    7. Glean renders Session Control Card.
    8. Operator declares mode.
    9. Work begins.

---

# 18. Recommended Next Session Governance

If next session is Tuesday or Wednesday PKT and operator wants heavier throughput:

    activate off-day sprint mode

Suggested declaration:

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
    - personal/Motive system mixing

    Max risk:
    - Red allowed for bills/ledger safety
    - Black only if snapshot/restore proof is already clear

    Rollback/snapshot status:
    - currently weak until verified

    Off-day ship target:
    - up to 20 ships
    - max 5 mutating ships

If next session is not an off-day:

    use Normal Workday Mode by default

If a specific branch must finish before layer completion:

    activate production deadline mode

If live behavior is broken/blocking/corrupting:

    activate emergency repair mode

---

# 19. Recommended Off-Day Ship Queue

The next strong 20-ship day should not be 20 random ships.

Recommended sequence:

    1. Snapshot table/read proof
    2. Snapshot_data payload proof
    3. Restore path inspection
    4. Snapshot rollback acceptance criteria
    5. State update: rollback status confirmed or weak

    6. Bills source-of-truth diagnosis
    7. Bills payment account contract
    8. Bills paid-state logic fix
    9. Bills UI account selector alignment
    10. Bills acceptance verification

    11. ATM ledger invariant read-through
    12. ATM ledger fix if needed
    13. ATM reversal/audit proof
    14. Nano Loans create/repay/push-to-CC read-through
    15. Nano Loans ledger fix if needed

    16. Salary engine spec/foundation
    17. Goals engine spec/foundation
    18. Charts date-label collision fix
    19. Premium side-nav design pass
    20. Final cache/version/state sweep

If any Red ship fails, the sequence pauses for RCA.

If two same-class failures happen, the sprint stops for that class.

---

# 20. Governance Summary

Normal Workday:

    8 ships
    2 mutating max
    120 coding minutes per rolling 12 hours

Production Deadline:

    12 ships
    3 mutating max
    120 coding minutes per rolling 12 hours

Emergency Repair:

    16 ships
    4 mutating max
    120 coding minutes per rolling 12 hours

Off-Day Sprint:

    20 ships
    5 mutating max
    120 coding minutes per rolling 12 hours
    second coding window only after rolling reset

Implementation stack:

    OS file = discipline
    Governance file = capacity
    State file = continuity
    Session log = audit trail
    Session Control Card = live enforcement

Final rule:

    The project must finish.
    The governance exists to make finishing safer, not slower.
    If the cap blocks low-risk progress on an off-day, the cap is wrong.
    If the sprint hides ledger uncertainty, the sprint is wrong.
    If the workflow creates abnormal usage spikes, the workflow is wasteful.

The correct system is simple:

    High output.
    Visible risk.
    Real verification.
    Low noise.
    No fake certainty.
    No productivity sacrificed to fear.
    No safety sacrificed to momentum.
    No personal project chaos spilling into work-system usage.

---

## Change Log

v0.4 — 2026-05-07

    Aligned governance with OS v1.2.
    Removed outdated v1.0/v1.1 implementation-plan language.
    Added explicit PAT policy alignment.
    Added ultra-secure boot mode.
    Clarified that PAT remains necessary as a controlled read key.
    Strengthened low-noise usage hygiene.
    Marked durable implementation active.
    Kept Tuesday/Wednesday Off-Day Sprint with up to 20 ships/day.

v0.3 — 2026-05-06

    Added flexible governance modes, off-day sprint capacity, secure boot guard, automatic timing, enforcement stack, Session Control Card, and low-noise session framework.
