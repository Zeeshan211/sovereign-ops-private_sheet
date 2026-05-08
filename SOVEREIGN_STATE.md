## Current Boot Routing — 2026-05-08

After `boot vault` passes Secure Boot, offer two active paths and wait for operator choice.

### PATH A — Finance Audit Correction / Recovery

Status: Active but partially verified. Continue from verification and recovery, not from scratch.

Current Finance state:
- Emergency D1 repair completed for `debt_yusra`.
- `/api/balances` v0.5.3 confirmed live.
- `/api/transactions` v0.1.4 confirmed live.
- Manual snapshots endpoint `/api/snapshots` v0.2.0 confirmed working.
- `snapshots.html` manual snapshot UI confirmed working.
- `transactions.html` semantic alignment confirmed working.
- `js/add.js` v0.3.3 deployed/provided to stop phantom category fallback.
- Categories table confirmed empty.
- Category schema confirmed:
  - id TEXT primary key
  - name TEXT not null
  - icon TEXT
  - type TEXT
  - parent_id TEXT
  - monthly_budget REAL default 0
  - color TEXT
  - display_order INTEGER default 0

Known Finance values from `/api/balances?debug=1`:
- Liquid cash: Rs 8,636.32
- CC outstanding: Rs 79,626.33
- Payable debt: Rs 123,500
- Receivables: Rs 18,320
- All active debt remaining: Rs 141,820 diagnostic only
- True burden: -Rs 176,170.01

Finance corrections completed:
- Debt/receivable split fixed.
- Transaction account FK guards added.
- Transaction UI semantics fixed.
- Snapshot endpoint and UI created.
- Add Transaction no longer shows fake D1 categories.

Finance items provided but still need final verification:
- `/api/debts` v0.3.1 FK guard
- `/api/cc` v0.3.1 liability semantics
- `/api/snapshots` v0.2.1 snapshot detail honesty
- `js/nav.js` v1.0.19 emoji navigation restore
- `index.html` v0.1.4 alive Finance Hub restore

Next safe Finance actions:
1. Verify live site visual recovery:
   - `https://sovereign-finance.pages.dev/`
   - Expected: emoji nav visible, alive Hub restored, balances v0.5.3 numbers correct.
2. Seed D1 categories using confirmed schema.
3. Verify Add Transaction can save Rs 159.99 Meezan transaction with category `Groceries`.
4. Verify `/api/cc` matches `/api/balances` CC outstanding.
5. Verify `/api/snapshots?id=snap-2026-05-08T10-30-13` exposes snapshot scope fields.
6. Finalize Finance audit report and update state again.

Finance hard rules:
- Do not touch Salah while in Finance path unless operator explicitly switches.
- No fake ledger smoke tests unless operator explicitly approves.
- Full-file rewrites only for code.
- Prefer guarded D1 SQL only for known data-state corrections.
- Do not bulk mutate real ledger rows casually.

---

### PATH B — Salah Today-Live Cleanup

Status: Active but not fully verified. Continue from deployed-version verification, not from scratch.

Completed:
- Salah D1 schema/table foundation created earlier.
- Bulk month export abandoned because SQL copy friction and future-row risk made it unsafe.
- Real source tab identified: `🕌 Salah`.
- Today-only D1 seed path chosen.
- D1 seed for `2026-05-08` succeeded.
- `/api/salah/log` v0.2.0 confirmed working by browser console POST.
- `/api/salah/today` v0.2.0 confirmed returning live data for `2026-05-08`.

Verified live Salah state from `/api/salah/today?day=2026-05-08`:
- Fajr: Masjid, normalized `M`, score `2`, logged_at `2026-05-08T17:03:19+05:00`
- Dhuhr: Masjid, normalized `M`, score `2`, logged_at `2026-05-08T16:59:56+05:00`
- Asr: Home, normalized `H`, score `0.5`, logged_at `2026-05-08T17:00:24+05:00`
- Maghrib: Home Udhr, normalized `HU`, score `0.8`
- Isha: Home Udhr, normalized `HU`, score `0.8`
- Jumuah: Yes, normalized `YES`, score `0.5`, logged_at `2026-05-08T16:59:42+05:00`
- API reported total score: `6.6`
- logged_count: `5`
- masjid_count: `2`
- home_count: `3`
- udhr_count: `2`
- qaza_count: `0`

Salah product correction agreed:
- Fard score must be separated from bonus prayers.
- Fard = core `/10` from five daily prayers only:
  - Fajr
  - Dhuhr
  - Asr
  - Maghrib
  - Isha
- Bonus = Jumuah, Tahajjud, Witr, Ishraq, Duha, Awwabin, Nafl.
- Qaza = recovery state.
- Udhr = attribute, not location/category.
- Charts must not double-count Udhr as a location slice.
- Bonus prayers must never inflate the main Fard `/10` score.

Provided but not confirmed deployed:
- `functions/api/salah/log.js` v0.3.0 implementing corrected Fard / Bonus / Qaza / Udhr model.
- `salah.html` v0.8.0 titled `Overflow-safe responsive cockpit`.
- `functions/api/salah/today.js` still needs read-model cleanup.

Next safe Salah actions:
1. Verify currently deployed versions:
   - `functions/api/salah/log.js`
   - `functions/api/salah/today.js`
   - `salah.html`
2. Confirm whether `log.js v0.3.0` is actually deployed.
3. If not deployed, deploy `log.js v0.3.0` full-file rewrite first.
4. Rewrite/clean `functions/api/salah/today.js` so output includes:
   - `fard_score`
   - `fard_logged_count`
   - `bonus_logged_count`
   - `qaza_count`
   - `udhr_count`
   - clean chart data where Udhr is attribute, not location
5. Verify `salah.html` has no horizontal scrollbar on operator screen.
6. Only after logic is clean, continue UI inspiration polish.

Salah hard rules:
- Do not touch Finance while in Salah path unless operator explicitly switches.
- Do not bulk-import future month rows.
- Do not fake streaks/charts.
- Full-file rewrites only for code changes.
- Today-first verification before month expansion.

---

## Boot Vault Response Contract

When Secure Boot passes, respond with:
