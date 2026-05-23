# LEGACY FINANCE INVENTORY
**Sovereign Ops — Apps Script Finance Suite**
Last read: 2026-05-23 | Version captured: Finance_Pro v3.3 ELITE BANKING-GRADE

---

## Section 1: System Map

The legacy finance system is a Google Apps Script suite deployed inside a Google Spreadsheet ("sovereign-ops-private_sheet"). It provides a complete personal finance operating system for a single user in Pakistan, denominated in PKR with USD support. The system manages 11 bank/card accounts across 5 Pakistani banks and 3 mobile wallets, tracks transactions in a 200-row append-only ledger, handles international subscriptions with tax decomposition, manages personal debts (snowball strategy), tracks nano-loans from fintech apps, reconciles bank statements, logs ATM withdrawals as transfer pairs, maintains a salary forecast with tax tracking, and provides a Finance Hub dashboard with real-time KPI cards.

The system is accessed primarily through Google Sheets UI (checkboxes trigger write paths) and a Telegram bot (command dispatcher calls finance functions directly). A lightweight web app (`WebApp.gs`) provides a secondary mobile dashboard for non-finance metrics (habits, Salah, weight). All finance writes are lock-protected via Apps Script `LockService`, audit-logged to a WORM-protected "Audit Log" hidden tab, and snapshotted before destructive operations. The system is built over ~13,900 lines of Google Apps Script (JavaScript ES6 subset) across 20 files.

---

## Section 2: File Index

| File | Size | Lines | Version | Purpose | Key Public Functions |
|------|------|-------|---------|---------|---------------------|
| Finance_Pro.gs | 140 KB | 2,632 | v3.3 | Master controller: QE form, transfer form, bills, goals, accounts tab, hub tab, all core data structures | `rebuildFinanceCockpit`, `submitTxnFromQuickEntry`, `submitIntlFromQuickEntry`, `submitTransferFromForm`, `markBillPaid`, `allocateToGoal`, `performReversal`, `buildHubTab`, `buildTransactionsTab`, `buildAccountsTab`, `buildBudgetTab`, `buildBillsTab`, `buildGoalsTab`, `setOpeningBalances`, `generateTxnId`, `_validateBalanceConstraint`, `_captureFxRate`, `_acquireFinLock`, `_logAuditFast` |
| Finance_ATM.gs | 65 KB | 1,330 | v1.2 | ATM withdrawal: transfer pair writes (source OUT + Cash IN), fee tracking with 10-day pending reversal window, Hub panel embed rows 32-46 | `cmdAtm`, `uiATMLogWithdraw`, `_atmCreateWithdrawTransferPair`, `_atmCreateFee`, `embedATMPanelInHub`, `listPendingATMReversals`, `auditLegacyATMWithdrawRows` |
| Finance_NanoLoan.gs | 62 KB | 1,214 | v1.1 | Nano-loan tracker (Smart Qarza, Paisayaar, Barwaqt, EasyLoan, FinjaPay, Sarmaya), Shape A/B loan types, CC push flow, Hub panel rows 47-54 | `rebuildNanoLoansTab`, `submitLoanFromQuickEntry`, `pushTodaysLoansToCC`, `_logNanoLoanIn`, `listActiveNanoLoans`, `getNanoLoopFeesMTD` |
| Finance_Merchants.gs | 61 KB | 753 | v1.0 | Smart merchant DB: 150+ pre-mapped merchants with category, PRA flag, FX flag; learned merchant store in PropertiesService | `lookupMerchant`, `learnMerchant`, `listMerchants`, `cmdMerchantAdd` |
| Finance_Salary.gs | 47 KB | 870 | v1.6 | Payslip-accurate salary forecast, live tax tracker, multi-anchor auto-detect (3 anchors ±10%), payday countdown, YTD summary, bonus history | `buildSalaryTabUI`, `buildSalaryTab`, `installSalaryEditHandler`, `logSalaryFromForecast` |
| Finance_Debts.gs | 45 KB | 841 | v1.1 | Debt management center: 6 creditors (snowball order), 5 receivables, installment payment via ledger write, verify/backfill sync | `rebuildDebtsTab`, `buildDebtsTab`, `payInstallment`, `verifyDebtsLedgerSync`, `backfillMissingDebtRows` |
| Finance_Audit.gs | 34 KB | 727 | v1.5 | Full audit trail viewer, WORM tab protection, SHA-256 hash chain integrity, 46-action whitelist, Hub panel embed rows 76-97, CSV export | `buildFinanceAuditTab`, `refreshFinanceAudit`, `verifyAuditIntegrity`, `protectAuditLogTab`, `exportAuditToCSV`, `embedAuditPanelInHub` |
| Finance_BillsSmart.gs | 29 KB | 651 | v1.0 | Smart bills handler: zero-amount skip (no ledger write), CC payment variable-amount popup, cycle-awareness via DocumentProperties | `_smartBillsOnEdit`, `_handleSkippedBill`, `_handleCCPayment`, `_logCCPaymentInLedger` |
| Finance_BankReconciler.gs | 28 KB | 618 | v1.0 | Bank statement diff: paste-pad approach, parse statement text, diff vs ledger with date/amount tolerance, render 📋 Bank Diff tab | `bankReconcilerUI`, `parseBankStatement`, `diffBankVsLedger`, `renderDiffReport` |
| Finance_CrossTabAuditor.gs | 25 KB | 576 | unknown | Cross-tab integrity audit: validates consistency across Finance tabs | `runCrossTabAudit` (and related validators) |
| Finance_PDFParser.gs | 24 KB | 639 | unknown | PDF statement parsing for bank/CC statements | `parsePDFStatement` (and helpers) |
| Finance_Kite.gs | 24 KB | 470 | v1.0 | CC cash advance ("kite") tracker: 3-txn atomic write (Cash IN + CC OUT + CC fee), Hub panel rows 99-118, form in Hub row 101 | `buildKiteTrackerUI`, `renderKiteTrackerInHub`, `logKite`, `installKiteEditHandler` |
| Finance_Intl.gs | 15 KB | 351 | v1.0 | International purchase: 5-component fee decomposition, 4-5 linked ledger rows per purchase, 1-Biller charge logging, Telegram `/intl` command | `logIntlPurchase`, `logBillerCharge`, `cmdIntl`, `cmdBillerFee`, `refreshIntlCategoryDropdowns` |
| Finance_Vaccine.gs | 23 KB | 519 | unknown | Diagnostics + self-healing: schema repair, orphan row detection, ledger integrity checks | `diagnoseFinanceSuite`, `vaccinateFinance` (and helpers) |
| Finance_DoubleEntryAuditor.gs | 18 KB | 439 | v1.0 | Banking-grade balance proof: 8 validators (transfer pairs, intl sets, reversal pairs, orphan links, TxnID coverage, duplicates, account proof), read-only | `runDoubleEntryAudit`, `_validateTransferPairs`, `_validateReversalPairs`, `_validateOrphanedLinks`, `_validateTxnIdCoverage`, `_validateDuplicateTxnIds`, `_validateAccountBalanceProof` |
| Finance_Reconciliation.gs | 14 KB | 309 | v1.0 | Real-balance drift detection in Accounts tab rows 26-42: user declares real bank balance vs computed balance, flags drift >1000 PKR | `rebuildAccountsReconciliation`, `verifyAccountsReconciliation` |
| Finance_Snapshot.gs | 13 KB | 328 | v1.0 | Auto-backup + rollback: snapshots 6 Finance tabs before any rebuild, retention policy (last 5 always + 1 per month), prune old snaps | `snapFinanceSuite`, `restoreFinanceSnapshot`, `showSnapshotsMenu`, `pruneFinanceSnapshots` |
| Finance_CCAudit.gs | 9 KB | 214 | v1.0 | CC forensic chronological audit: lists every CC-touching ledger row with running balance, largest payments/charges, Bills tab cross-check | `auditCCActivity` |
| Finance_Charts.gs | 16 KB | 307 | unknown | Finance chart embeds in Hub rows 55-74 | `embedFinanceCharts` |
| Finance_TxnIdRepair.gs | 5 KB | 130 | unknown | One-shot TxnID backfill/repair for legacy rows missing IDs | `repairTxnIds` |

**Total: 20 .gs files · ~13,918 lines · ~749 KB**

---

## Section 3: Data Model

### Tab: 💸 Transactions (core ledger)

| Column | Name | Type | Notes |
|--------|------|------|-------|
| A (1) | Date | Date | format `dd MMM yyyy` |
| B (2) | Account | String | from FIN2_ACCOUNTS dropdown |
| C (3) | Type | String | Income / Expense / Transfer / Debt Out / Debt In |
| D (4) | Category | String | from FIN2_CATEGORIES dropdown |
| E (5) | Amount | Number | format `#,##0.00`, original currency |
| F (6) | Currency | String | PKR or USD |
| G (7) | PKR Equiv | Number/Formula | `=IF(F="USD",E*IF(O>0,O,$H$1),IF(F="PKR",E,""))` |
| H (8) | Counterparty | String | person, merchant, or account name |
| I-L (9-12) | Notes | String | merged 4-column cell, free text |
| M (13) | ↩️ Reverse | Checkbox | triggers `performReversal()` on check |
| N (14) | TxnID | String | `TXN-YYYYMMDD-HHmmss-NNNNN` (5-digit suffix), hidden |
| O (15) | FX_Rate_At_Commit | Number | USD/PKR rate at write time; 1.0 for PKR; hidden |

- **Ledger rows:** 14–213 (200 rows max)
- **Write policy:** append-only (row pointer cached in PropertiesService)
- **Row 1:** USD/PKR rate in H1 (live lookup from `open.er-api.com`)
- **Rows 2-5:** Quick Entry form (row 4 = active form, row 3 = labels)
- **Rows 7-10:** Intl Quick Entry form (row 9 = active form)
- **Rows 12-13:** Ledger header + column labels
- **Reserved zone:** rows 5-13 (forms, headers — never written as ledger rows)

### Tab: 💰 Finance Hub

| Zone | Rows | Content | Owner |
|------|------|---------|-------|
| Title + date | 1-2 | Banner + live date/rate formula | Finance_Pro |
| KPI cards | 4-5 | Spent Today/Week/Month, Net MTD (SUMIFS formulas) | Finance_Pro |
| Net position | 7-8 | Liquid / Liability / Net Worth (from Accounts tab) | Finance_Pro |
| Recent txns | 10-21 | Last 10 transactions (LARGE+INDEX+MATCH formulas) | Finance_Pro |
| How-to hints | 23-30 | Static workflow hints | Finance_Pro |
| ATM panel | 32-46 | Pending ATM fee reversals + net 30-day fees | Finance_ATM |
| Charts panel | 55-74 | Embedded charts | Finance_Charts |
| Audit panel | 76-97 | Last 20 audit actions (from Audit Log) | Finance_Audit |
| Kite panel | 99-118 | CC kite form (row 101) + kite history | Finance_Kite |
| NanoLoan panel | 47-54 | Active nano-loans summary | Finance_NanoLoan |

### Tab: 🏦 Accounts

| Zone | Rows | Content |
|------|------|---------|
| Transfer form | 3 | From / To / Amount / Notes / ✅ checkbox in G3 |
| Assets table | 5-16 | 10 asset accounts: Name, Kind, MTD Income, MTD Expense, Balance (SUMIFS), Last Txn, Visual bar |
| Total liquid | 16 | SUM(E7:E15) |
| Liabilities | 18-21 | Alfalah CC: Limit, Outstanding, Available, Utilization%, Status, Days-till-Due, Days-till-Close, Min-Pay |
| Net Worth | 23-24 | Assets total – CC outstanding |
| Reconciliation | 26-42 | Per-account declared vs computed drift detection (Finance_Reconciliation) |

### Tab: 📊 Budget

| Zone | Rows | Content |
|------|------|---------|
| Headers | 1-4 | Title + column headers |
| Budget rows | 5-15 | Per-category: Budget (editable), Actual MTD (SUMIFS), Used%, Progress bar, Status, Remaining |
| Total | 16 | SUM row |

### Tab: 📅 Bills

| Zone | Rows | Content |
|------|------|---------|
| Headers | 1-4 | Title + column headers |
| Bill rows | 5-14 | Bill Name, Day, Amount, Account, Next Due (formula), Days Until (formula), Status (formula), Last Paid, Notes, ✅ checkbox |

### Tab: 🎯 Goals (hidden until debts cleared)

| Zone | Rows | Content |
|------|------|---------|
| Headers | 1-4 | Title + column headers |
| Goal rows | 5-9 | Goal Name, Target, Current, Progress bar, Deadline, Days Left, From Account, Allocate Amt, /Day Need, ✅ checkbox |

### Tab: 💳 Debts

| Zone | Rows | Content |
|------|------|---------|
| I Owe header | 4 | Section header |
| Creditor rows | 6-11 | #, Name, Original, Paid, Remaining (formula), Due Day, Days Left (formula), Status (formula), From Account, Pay Amt, Notes, ✅ checkbox |
| Total owed | 12 | SUM(E6:E11) |
| Owed-to-me header | 14 | Section header |
| Receivable rows | 16-20 | #, Debtor, Expected, Received, Remaining, Exp Date, Days, Status, To Account, Receive Amt, Notes, ✅ checkbox |
| Total receivables | 21 | SUM(E16:E20) |

### Tab: 💼 Salary

Multi-section: Payday Countdown (rows 4-6), Live Forecast (rows 7-24), Payslip Breakdown, YTD Summary, Tax Tracker, Bonus History. Yellow input cells (B-column) hold editable salary component values.

### Tab: 📱 Nano Loans

| Zone | Rows | Content |
|------|------|---------|
| Quick Add form | 4-7 | Form row 5 (Date/App/Principal/Cool-Off/Shape/Source/Notes/Status/✅), Push button row 7 |
| Active loans | 12-33 | 20 rows: app, principal, status, shape, repayment, etc. |
| Closed loans | 35-56 | 20 rows: closed loan archive |

### Tab: Audit Log (hidden, WORM-protected)

| Col | Name | Type |
|-----|------|------|
| A | Timestamp | DateTime |
| B | Action | String (whitelisted 46 types) |
| C | Detail | String |
| D | User | String |
| E | Hash | SHA-256 hex (chain integrity, v1.5+) |

**Write policy:** append-only. WORM warning-only protection. Direct edits detected via `_onAuditLogEdit` trigger and logged.

### Tab: 📜 Finance Audit (visible)

Display-only rendering of Audit Log with color-coded action types. 46 action categories tracked.

### Tab: 📋 Bank Diff (created on demand)

Rendered by Finance_BankReconciler when user runs diff. Shows matched/missing/extra rows side by side.

### Tab: 📋 Paste Pad (created on demand)

Temporary input pad for bank statement paste (column A, row 5+). Account name in B2.

---

## Section 4: Quick Entry (QE) — Standard Transaction Recording

### Form layout (Transactions tab row 4)

| Col | Cell | Field | Type | Validation |
|-----|------|-------|------|------------|
| A (1) | A4 | Date | Date | `requireDate()`, allow invalid |
| B (2) | B4 | Account | Dropdown | `FIN2_ACCOUNTS` list |
| C (3) | C4 | Type | Dropdown | `FIN2_TXN_TYPES` = [Income, Expense, Transfer, Debt Out, Debt In] |
| D (4) | D4 | Category | Dropdown | `FIN2_CATEGORIES` list (31 categories) |
| E (5) | E4 | Amount | Number | user enters raw amount |
| F (6) | F4 | Currency | Dropdown | [PKR, USD] |
| G (7) | G4 | PKR Equiv | Formula | `=IFERROR(IF(F4="USD",E4*$H$1,E4),"")` (live preview) |
| H (8) | H4 | Counterparty | String | free text |
| I-J (9-10) | I4:J4 merged | Notes | String | free text |
| K (11) | K4 | Status | String | auto-updated by system (e.g. "✓ 5,000 PKR", "🛑 blocked") |
| L (12) | L4 | ✅ Submit | Checkbox | triggers `submitTxnFromQuickEntry()` on check |

**Submission trigger:** `_financeOnEdit` → `submitTxnFromQuickEntry(sh)` fired when L4 = TRUE.

### Validation pipeline (in order)

1. **Lock acquisition** — `_acquireFinLock('submitTxnFromQuickEntry')`, 30s timeout. Fail → uncheck L4, show error, abort.
2. **Form read** — batch read row 4 cols 1-9.
3. **Field validation** — date must be Date instance, account non-empty, type non-empty, amount must be a positive number. Fail → uncheck + status warning.
4. **FX rate capture** — `_captureFxRate(currency)`. PKR → 1.0. USD → reads H1 (live rate). Computes pkrEquiv.
5. **Balance constraint check** — `_validateBalanceConstraint(account, type, pkrEquiv)`. For asset accounts: computes projected balance; if projected < -0.01 → YES/NO popup. For Alfalah CC (liability): computes projected outstanding; if > 100,000 + 1.0 → YES/NO popup. YES → audit BALANCE_CONSTRAINT_OVERRIDE + proceed. NO → audit BALANCE_CONSTRAINT_BLOCK + uncheck + abort. Headless context → auto-block.
6. **CC validation gate** — if amount ≥ 500 PKR and `validateCCPayment()` loaded: check CC-specific rules, popup if warning. User NO → audit CC_VALIDATION_BLOCK + abort. User YES → audit CC_VALIDATION_OVERRIDE + proceed.
7. **Salary auto-detection** — `_detectSalaryPattern(date, account, type, amount, currency)`. If match: popup "Override to Salary?". YES → category corrected, audit SALARY_CATEGORY_CORRECTED. NO → audit SALARY_PATTERN_IGNORED.
8. **Find next ledger row** — `_findNextLedgerRow(s)`. Uses PropertiesService cache first, scans rows 14-213 as fallback. Full → abort.
9. **TxnID generation** — `generateTxnId()` → `TXN-YYYYMMDD-HHmmss-NNNNN` (5-digit suffix, `Math.random()*100000`). `Utilities.sleep(5)` for ms-tick uniqueness.
10. **Write** — batch `setValues` cols 1-8, then notes merge cols 9-12, TxnID col 14, FX rate col 15.
11. **Form clear** — A4 = today, E4/H4/I4:J4 = empty, L4 = false.
12. **Status update** — K4 = "✓ {amount} {currency}".
13. **Row pointer bump** — `_bumpRowPointer(nextRow)`.
14. **Audit log** — `_logAuditFast('TXN_LOGGED', ...)`.
15. **Salary post-actions** — if salary detected: auto-fill counterparty with employer name if blank, show popup alert with blessing.
16. **Lock release** — always in `finally` block.

### Edge cases

- **Salary auto-detection:** Account=Meezan + Type=Income + Currency=PKR + Amount 110k-200k + Day in [28,29,30,31,1,2,3,4,5] → triggers. Employer default: "ABS-Labs (Private) Limited".
- **CC overlimit:** Alfalah CC outstanding > 100,000 PKR → popup with YES/NO override.
- **Asset overdraft:** Asset account projected balance < -0.01 PKR → popup with current/projected values.
- **Headless context (Telegram/batch):** If `SpreadsheetApp.getUi()` throws, balance constraint auto-blocks.
- **Ledger full:** Row 213 reached → status "⚠ ledger full", abort.

---

## Section 5: International Purchase Recording

### Form layout (Transactions tab row 9, cols 1-12)

| Col | Field | Notes |
|-----|-------|-------|
| A (1) | Date | date validation |
| B (2) | Account | FIN2_ACCOUNTS dropdown; default Alfalah CC |
| C (3) | Base PKR | positive number, format `#,##0.00` |
| D (4) | Merchant | free text |
| E (5) | +PRA? | Checkbox (col 5 = FIN2_INTL_PRA_COL) |
| G-K (7-11) | Notes | merged, free text |
| L (12) | ✅ Submit | Checkbox (col 12 = FIN2_INTL_SUBMIT_COL) |

**Submission trigger:** `_financeOnEdit` → `submitIntlFromQuickEntry(sh)` when row 9, col 12 = TRUE.

### 5-component fee breakdown (all amounts in PKR, paisa precision)

```
Base          = user input (e.g. 479.00 PKR for YouTube Premium)
FX Fee        = Base × 4.5%           (Bank Alfalah foreign transaction fee)
Excise Duty   = FX Fee × 16%          (Federal Excise on bank charges)
Adv Tax 236Y  = Base × 5%             (Income tax on non-filer foreign transactions)
PRA IT Tax    = Base × 5%  (opt-in)   (Punjab Revenue Authority IT services tax)
─────────────────────────────────────────────────────────────
Total         = Base + FX Fee + Excise + Adv Tax [+ PRA Tax]
```

Rounding: `Math.round(n * 100) / 100` per component.

### Write sequence

1. **Balance check** on estimated total (base × 1.25) against account.
2. Find N **consecutive** empty ledger rows (4 without PRA, 5 with PRA) starting from scan of rows (ledger start to end).
3. Generate `parentId` (TxnID for base row). Sleep 20ms between each row.
4. Write rows in order:
   - Row 0: Expense · 🌐 Intl Subscription · `base` · note: "Base · {merchant}"
   - Row 1: Expense · 🏦 FX Fee (4.5%) · `fxFee` · note: "FX Fee · linked to {parentId}"
   - Row 2: Expense · 🏛️ Excise Duty (16% on FX) · `excise` · note: "Excise Duty · linked to {parentId}"
   - Row 3: Expense · 🏛️ Adv Tax 236Y (5%) · `advTax` · note: "Adv Tax 236Y · linked to {parentId}"
   - Row 4 (if +PRA): Expense · 🏛️ PRA IT Tax (5%) · `praTax` · note: "PRA IT Tax · linked to {parentId}"
5. Each row: TxnID in col 14. No col 15 FX rate written by Finance_Intl v1.0 (fallback to H1).
6. Audit log: `INTL_PURCHASE` (via logAuditAction) or `INTL_PURCHASE_SHEET` (via `_logAuditFast`).
7. Clear form: date=today, C9/D9/E5(PRA)/G9-K9/L9 = reset.

### User confirmation flow

Merchant DB lookup (`lookupMerchant`) determines default account and PRA flag before form submission. User can override by changing form fields or using `+pra` Telegram flag. Sheet form shows "+PRA?" checkbox. After submission, popup shows full fee breakdown with total.

### Telegram entry point

`cmdIntl(args)` — parses `/intl {amount} {merchant} [account] [+pra]`. Calls `logIntlPurchase()` directly (not via sheet form). Returns formatted message with fee table.

---

## Section 6: Transfer Recording

### Form layout (Accounts tab row 3)

| Col | Field |
|-----|-------|
| A (1) | From Account (dropdown, FIN2_ACCOUNTS) |
| B (2) | To Account (dropdown, FIN2_ACCOUNTS) |
| C (3) | Amount (number) |
| D-F (4-6) | Notes (merged, optional) |
| G (7) | ✅ Submit (checkbox) |

**Trigger:** `_financeOnEdit` → `submitTransferFromForm(sh)` when Accounts tab, row 3, col 7 = TRUE.

### Linked pair logic

1. Validate From ≠ To, amount > 0.
2. Balance constraint check on FROM account (type = Transfer).
3. Find next empty ledger row (`outRow`).
4. Generate `outId`, sleep 5ms, generate `inId`.
5. Write OUT leg: `[today, fromAcc, 'Transfer', cat, amount, 'PKR', amount, 'To: {toAcc}']` + note `"... (OUT) [linked: {inId}]"` + TxnID = outId + FX rate col 15 = 1.0.
6. Bump row pointer. Find next empty row (`inRow`).
7. Write IN leg: `[today, toAcc, 'Income', cat, amount, 'PKR', amount, 'From: {fromAcc}']` + note `"... (IN) [linked: {outId}]"` + TxnID = inId + FX rate = 1.0.
8. Bump row pointer.
9. Clear form: C3 = 0, D3:F3 = "Notes (optional)", G3 = false.
10. Audit: `TRANSFER` with both TxnIDs.

### CC-aware behavior

If `toAcc === 'Alfalah CC'` or `fromAcc === 'Alfalah CC'`:
- `isCCTransfer = true`
- Category becomes `'💳 CC Payment'` instead of `'💱 Transfer'`
- Notes prefix: "CC payment: {from} → {to}" or "CC cash advance: {from} → {to}"

### Notes tagging convention

OUT leg note: `"{noteText} (OUT) [linked: {inId}]"`
IN leg note: `"{noteText} (IN) [linked: {outId}]"`
This `[linked: TXN-XXX]` pattern is the hook for atomic reversal detection.

---

## Section 7: Accounts System

### Full account list

| Account | Type | Kind | Special Notes |
|---------|------|------|---------------|
| Cash | Asset | Liquid | Default ATM destination; petty cash |
| JazzCash | Asset | Mobile | Food delivery, ride-hailing primary |
| Easypaisa | Asset | Mobile | Default nano-loan landing account |
| UBL | Asset | Bank | General bank |
| UBL Prepaid | Asset | Bank | Prepaid card |
| Meezan | Asset | Bank · Salary | Salary landing account; CC payment source |
| Mashreq Bank | Asset | Bank | Default ATM source (35 PKR fee); own ATM = no fee |
| JS Bank | Asset | Bank | General bank |
| Naya Pay | Asset | Mobile | Mobile wallet |
| Bank Alfalah | Asset | Bank | General bank (note: different from Alfalah CC) |
| Alfalah CC | Liability | Credit Card | Limit: 100,000 PKR; Due Day: 6; Close Day: 12; Min payment: 5% of outstanding |

### How accounts are referenced

- `FIN2_ACCOUNTS` array (constant) — ordered list used for dropdowns.
- `FIN2_ACCOUNT_TYPES` map — `'Asset'` or `'Liability'` per account.
- `FIN2_ACCOUNT_KIND` map — descriptive kind string.
- `FIN2_CC_ACCOUNT = 'Alfalah CC'` — specific CC constant used in all CC logic.
- `_isAsset(account)` / `_isLiability(account)` — helper functions.

### Account-specific logic

- **Meezan:** Salary auto-detection uses this account. CC payments originate from Meezan (Bills Smart + transfer form UX default).
- **Alfalah CC:** Special liability handling throughout — CC overlimit gate (100k), CC kite cash-advance, CC payment category, WORM-cycle awareness in BillsSmart, CC forensic audit module, outstanding computed as `MAX(0, -(SUMIFS balance formula))`.
- **Mashreq Bank:** ATM default source; ATM fee 35 PKR applies unless ATM machine matches `/mashreq/i` (own ATM, no fee).
- **Easypaisa:** Default nano-loan source account.

---

## Section 8: Categories System

### Full category list (FIN2_CATEGORIES)

```
💰 Opening Balance
💳 CC Payment       (used when transferring to Alfalah CC)
💳 CC Spend         (manual CC usage category)
🪁 CC Kite Withdraw (CC cash advance withdrawal leg)
🪁 CC Kite Fee      (CC cash advance fee)
💰 Salary
💱 Transfer         (generic transfer between accounts)
🍔 Food
🚗 Transport
🏠 Bills
💊 Health
📚 Learning
👕 Personal
🎁 Sadqah/Zakat
💝 Family
📱 Tech
🎯 Other
🏘️ Rent
🌐 Internet
📞 Mobile Plan
💸 Debt Payment     (used when paying installments to creditors)
🌐 Intl Subscription
🏦 FX Fee (4.5%)
🏛️ Excise Duty (16% on FX)
🏛️ Adv Tax 236Y (5%)
🏛️ PRA IT Tax (5%)
🏦 Biller Charge    (1-Biller fee for cross-bank CC payment: 31.25 PKR)
🏧 ATM Withdraw     (legacy — no longer written by v1.2+)
🏧 ATM Fee          (ATM fee pending reversal)
🏧 ATM Fee Reversal (when bank reverses the ATM fee)
```

### Budget defaults per category (FIN2_DEFAULT_BUDGET)

| Category | Budget (PKR/month) |
|----------|--------------------|
| 💝 Family | 15,000 |
| 🌐 Internet | 4,000 |
| 🍔 Food | 5,000 |
| 🚗 Transport | 3,000 |
| 👕 Personal | 1,000 |
| 🎁 Sadqah/Zakat | 2,000 |
| 💊 Health | 2,000 |
| 🏠 Bills | 1,000 |
| 📚 Learning | 1,000 |
| 📱 Tech | 500 |
| 🎯 Other | 500 |

Budget tab uses SUMIFS on Transactions G column (PKR Equiv) filtered by category, Expense type, and current month date range.

### Special-cased categories in business logic

- **💰 Salary** — salary auto-detect corrects to this; salary module logs with this.
- **💱 Transfer** — both legs of transfer use this (or CC Payment for CC transfers).
- **💳 CC Payment** — CC transfer special-casing in `submitTransferFromForm`.
- **🪁 CC Kite Withdraw / Fee** — Finance_Kite uses these specifically.
- **💸 Debt Payment** — reversal logic `_restoreDebtSourceFromReversal` checks for this category to trigger debt-tab sync.
- **🏧 ATM Fee** — `listPendingATMReversals` scans for this category to find pending reversals.
- **🏧 ATM Fee Reversal** — used to mark resolved ATM fee.
- **🏦 Biller Charge** — logBillerCharge uses this; amount fixed at 31.25 PKR.
- **💰 Opening Balance** — `setOpeningBalances` writes this category; excluded from ongoing balance formulas in spirit (counted as Income/Expense respectively).

---

## Section 9: Salary Auto-Detection

### Exact heuristic (SALARY_RULES)

All conditions must be true simultaneously:

| Condition | Value |
|-----------|-------|
| Account | `'Meezan'` (exact match) |
| Type | `'Income'` |
| Currency | `'PKR'` (or null/undefined — treated as PKR) |
| Amount range | 110,000 ≤ amount ≤ 200,000 |
| Day of month | One of: [28, 29, 30, 31, 1, 2, 3, 4, 5] |

Function: `_detectSalaryPattern(date, account, type, amount, currency)` returns `true`/`false`.

### User prompt flow

If `_detectSalaryPattern` returns true and category is NOT already `'💰 Salary'`:

1. Show popup: "Looks like salary. Account: {acc} · Amount: {amount} PKR · Day: {day} · Your category: {cat} · Override to 💰 Salary?"
2. **User YES:** old category replaced with `'💰 Salary'`, audit `SALARY_CATEGORY_CORRECTED`.
3. **User NO:** category unchanged, `salaryDetected = false`, audit `SALARY_PATTERN_IGNORED`.
4. **Headless context (no UI):** if category is a placeholder (`'🍔 Food'`, `'🎯 Other'`, blank, null) → silently corrects to Salary. Otherwise keeps original.

If category was already `'💰 Salary'` → no prompt, proceeds directly.

### Post-write salary actions

- If counterparty blank → auto-fill with `SALARY_RULES.defaultEmployer = 'ABS-Labs (Private) Limited'`.
- Audit `SALARY_AUTO_DETECTED` regardless of override outcome.
- Status set to "💰 Salary detected".
- Shows popup: "💰 Salary auto-detected. Rizq from Allah ﷻ. May He bless it for you, akhi."

### Multi-anchor auto-detect (Finance_Salary v1.6)

Additional salary auto-detection in the Salary tab (`_salaryOnEdit`) uses 3 anchors with ±10% tolerance:
- **Anchor 1:** Forecast Net B24 (bonus months).
- **Anchor 2:** Lean baseline (Contract Base + WFH − tax, no-bonus months).
- **Anchor 3:** March 2026 historical Net = 123,851 PKR.
If any anchor matches → transaction tagged as salary for salary tab tracking.

---

## Section 10: CC Validation Gate

### Trigger conditions

- Amount ≥ `CC_VALIDATION_MIN_AMOUNT = 500 PKR`.
- Function `validateCCPayment` is loaded (defined somewhere — likely Finance_Pro or CCAudit).
- Called from `submitTxnFromQuickEntry` after balance constraint check.

### Validation rules

`validateCCPayment(account, type, category)` returns a warning string or falsy. The exact rules are in that function (implementation in Finance_Pro or a sibling module — the call is guarded with `typeof validateCCPayment === 'function'`). Common patterns inferred from audit action names:
- `CC_VALIDATION_BLOCK` — validation found an issue and user rejected.
- `CC_VALIDATION_OVERRIDE` — user acknowledged warning and proceeded.

### Override mechanism

User sees popup "⚠️ CC Validation: {warning message}". Clicks YES → audit `CC_VALIDATION_OVERRIDE`, write proceeds. Clicks NO → audit `CC_VALIDATION_BLOCK`, write aborted, checkbox unchecked, status set.

Headless (no UI): code catches exception silently and proceeds without CC validation.

---

## Section 11: Balance Constraint Check

### Algorithm

`_validateBalanceConstraint(account, type, pkrEquiv)`:

1. If pkrEquiv ≤ 0 or no account/type → allow silently.
2. Get Transactions tab.
3. `_computeAccountBalanceFromLedger(tx, account)` — batch reads all 200 ledger rows (cols 1-7), filters to matching account, sums: Income + Debt In as credits, Expense + Debt Out + Transfer as debits. Returns `{balance, txnCount}`.
4. Compute projected balance after this write: Income/Debt In → `+pkrEquiv`; Expense/Debt Out/Transfer → `-pkrEquiv`.

### Asset overdraft rules

If `isAsset` and `projected < -0.01` (FIN2_BALANCE_TOLERANCE):
- Show popup with current/projected values.
- YES → audit BALANCE_CONSTRAINT_OVERRIDE, return `{allow: true, override: true}`.
- NO → audit BALANCE_CONSTRAINT_BLOCK, return `{allow: false}`.
- Headless → auto-block, return `{allow: false}`.

### CC overlimit rules

If account = Alfalah CC (liability):
- `projOutstanding = -projected` (outstanding grows on Expense to CC).
- If `projOutstanding > 100,000 + 1.0` (FIN2_CC_OVERLIMIT_TOLERANCE):
  - Popup showing limit/current/projected.
  - YES → audit CC_LIMIT_OVERRIDE, allow.
  - NO → audit BALANCE_CONSTRAINT_BLOCK, block.

### What gets blocked vs warned

**Blocked (hard stop, no write):** User clicks NO on popup, or headless context.
**Warned + allowed:** User clicks YES on popup → write proceeds, override audit trail written.
**Silent pass:** Balance projection stays within limits → no popup.

---

## Section 12: Transaction Reversal

### Mechanism

Triggered when user checks checkbox in column M (col 13) of any ledger row (rows 14-213).
`_financeOnEdit` → `performReversal(ledger, row)`.

### Reversal logic

1. Acquire lock.
2. Read source row cols 1-15.
3. Check idempotency guards:
   - If notes contain `[REVERSED BY …]` → already reversed, abort.
   - If notes contain `[REVERSAL PENDING-…]` → in-progress, abort.
4. **Linked pair detection:** if notes contain `[linked: TXN-XXX]`:
   - Search ledger col 14 for matching TxnID.
   - If found: mark both legs with pending reservation token.
   - `SpreadsheetApp.flush()`.
   - Reverse both legs atomically via `_reverseSingleRow()` × 2.
   - Alert: "Transfer reversed atomically. Both legs cancelled."
   - If partner already reversed: reverse only this row, warn.
5. **Single row reversal:** `_reverseSingleRow(ledger, row)`.

### How reversed rows are marked

**Original row:** Notes updated to `"... | [REVERSED BY {newTxnId}]"`. Row background set to grey (`T.bgReversed`), font struck-through, checkbox unchecked.

**Reversal row:** New row written with opposite type (`Income↔Expense`, `Debt Out↔Debt In`, Transfer→Income). Notes: `"[REVERSAL OF {originalTxnId}]"`. New TxnID generated. FX rate from original row (col 15) inherited. Background set to amber (`T.bgReversal`).

### Debt source restoration on reversal

If reversed row was `category='💸 Debt Payment'`:
- `_restoreDebtSourceFromReversal()` finds counterparty name in Debts tab.
- Subtracts reversed amount from `paid` column (D) of matching creditor/receivable row.
- Adds restoration note to Debts tab cell.
- Audit: `DEBT_RESTORE`.

### Balance computation and reversed rows

Balance formulas (SUMIFS on Transactions tab col G) include ALL rows including reversals. Reversals cancel out the original row because they write the opposite type (e.g., original Expense gets reversed as Income → net = 0). The [REVERSED BY] note in original row does NOT exclude it from SUMIFS — the reversal row cancels it instead.

---

## Section 13: FX Rate Capture

### Source of live rate

Cell `H1` of "💸 Transactions" tab. Populated by `fetchUSDPKR()` which calls `https://open.er-api.com/v6/latest/USD`. Falls back to PropertiesService cached value (`fin2_usd_pkr`), then hardcoded 280 if both unavailable.

### When captured

At **commit time** — `_captureFxRate(currency)` called during `submitTxnFromQuickEntry()` before any write, after reading H1 at that exact moment.

### Where stored

Column 15 (O) of 💸 Transactions ledger, hidden. Per-row, alongside the transaction data.

- PKR transactions: `1.0` stored (or blank for legacy rows).
- USD transactions: H1 value at commit time.
- Falls back to PropertiesService `fin2_usd_pkr` if H1 unavailable, then 280 hardcoded.

### Usage in PKR equivalent

G column formula: `=IF(F="USD", E*IF(O>0, O, $H$1), IF(F="PKR", E, ""))`

If col O has a value > 0 → uses the per-row snapshot. If col O is blank (legacy) → falls back to live H1. This means historical PKR equivalents are frozen after the v3.3 backfill runs.

### FX rate backfill

`backfillFxRateAtCommit(ledger)` — one-shot run during rebuild. Fills col 15 for all rows missing it. USD rows get current H1. PKR rows get 1.0. Audited as `FX_RATE_BACKFILL`.

---

## Section 14: Goal Allocation

### Goals data model (FIN2_DEFAULT_GOALS)

| Goal | Target (PKR) | Deadline |
|------|-------------|----------|
| AI Node Hardware | 200,000 | 2026-08-01 |
| Emergency Fund | 100,000 | 2026-12-31 |
| Hajj Savings | 1,500,000 | 2030-12-31 |
| Marriage Fund | 800,000 | 2027-12-31 |

Tab columns: Goal Name, Target, Current (cumulative allocated), Progress bar (formula), Deadline, Days Left (formula), From Account (dropdown), Allocate Amt, /Day Need (formula), ✅ checkbox.

### Allocation trigger

Checkbox in col J (col 10), rows 5-9 of Goals tab. `_financeOnEdit` → `allocateToGoal(s, row)`.

### Deduction logic

1. Read goal name, from account, allocation amount from form.
2. Balance constraint check on from account (Expense type).
3. Write ledger row: `[today, fromAcc, 'Expense', '🎯 Other', allocAmt, 'PKR', allocAmt, 'Goal: {goalName}']`.
4. Notes: "Savings allocation · auto-logged".
5. Increment Goals tab col C (Current) by allocation amount.
6. Reset allocation amount cell (col H) to 0.
7. Audit `GOAL_ALLOCATE`.

Note: Goals tab is hidden until personal debts (232k PKR) + CC (92k PKR) are cleared per system notes.

---

## Section 15: Bill Payment & Recurring Bills

### Recurring bill definitions (FIN2_DEFAULT_BILLS)

| Bill Name | Day | Amount (PKR) | Account |
|-----------|-----|-------------|---------|
| Family Contribution | 1 | 15,000 | Meezan |
| Maid (Cloth Washing) | 1 | 2,000 | Cash |
| Internet Bill | 1 | 4,000 | Meezan |
| Hair Cutting | 0 (variable) | 1,000 | Cash |
| Personal Hygiene | 0 (variable) | 1,000 | Cash |
| Alfalah CC Payment | 6 | 5,000 | Meezan |

Day 0 = variable/no fixed due date. Status formula: 0-day bills show "🔵 Variable".

### Mark-paid mechanism (basic — Finance_Pro)

1. Checkbox in col J (col 10) of Bills tab, rows 5-14 triggers `markBillPaid(s, row)`.
2. Read bill name, amount, account.
3. Balance constraint check.
4. Write ledger row: `[today, account, 'Expense', '🏠 Bills', amount, 'PKR', amount, billName]`.
5. Notes: "Bill payment · auto-logged".
6. Set Bills tab col H (Last Paid) = today.
7. Uncheck col J.
8. Audit `BILL_PAID`.

### Smart mark-paid (Finance_BillsSmart v1.0)

Intercepts via `_smartBillsOnEdit` before delegating to basic `markBillPaid`:

- **Zero-amount skip:** amount = 0 → set Last Paid = today, audit `BILL_SKIPPED_ZERO`, no ledger write.
- **CC payment:** bill name contains "CC" or account = Alfalah CC → read CC outstanding from Accounts tab C20 → popup with options: full clear / 5% minimum / custom amount / skip cycle. CC cycle awareness tracked in DocumentProperties (`bills_cc_last_cycle_paid`).
- **Normal bills:** delegate to `markBillPaid()`.

### Finance_BillsSmart — Smart Bills tab

`Finance_BillsSmart.gs` (29 KB) is separate from the built-in Bills tab flow. It also provides `_logCCPaymentInLedger(amount, billRow)` which creates a full transfer pair (Meezan OUT → Alfalah CC IN) using Finance_Pro primitives.

---

## Section 16: ATM Withdrawal Tracking

### ATM withdrawal structure (Finance_ATM v1.2)

Each ATM withdrawal creates **2-3 ledger rows**:

| Row | Account | Type | Category | Notes |
|-----|---------|------|----------|-------|
| OUT | Source (default: Mashreq Bank) | Transfer | 💱 Transfer | "Transfer {src} → {dest} (OUT · ATM withdraw at {atm}) [linked: {inId}]" |
| IN | Destination (default: Cash) | Income | 💱 Transfer | "Transfer {src} → {dest} (IN · ATM withdraw at {atm}) [linked: {outId}]" |
| FEE | Source account | Expense | 🏧 ATM Fee | "PENDING reversal · linked to {outId} · auto-flag if not reversed in 10 days" |

### Cash position calculation

Cash balance = sum of all Income rows on Cash account minus all Expense/Transfer rows on Cash account (standard SUMIFS formula in Accounts tab). ATM IN row increases Cash balance correctly.

### ATM fee tracking

Default fee: 35 PKR (ATM_DEFAULT_FEE_PKR). Auto-no-fee if source account matches `/mashreq/i` (Mashreq Bank own ATM). Fee row written as Expense on source account with "PENDING reversal" note. Reversal window: 10 days (ATM_REVERSAL_WINDOW_DAYS).

Fee pending reversals surfaced in Hub panel (rows 32-46) via `listPendingATMReversals()` which scans for category = '🏧 ATM Fee' and notes containing 'PENDING'.

### ATM fee reversal pattern

When bank reverses fee: user logs it via `/atm fee {amount} {bank}` Telegram command or `uiATMReverse()` menu. Writes new ledger row: Source account, Income, '🏧 ATM Fee Reversal', links to original fee TxnID. Removes "PENDING" marker.

Legacy pre-v1.2 rows: `auditLegacyATMWithdrawRows()` scans for old single-Expense format (category = '🏧 ATM Withdraw', type = Expense) and lists them for manual column-M reversal.

### Default accounts

- `ATM_DEFAULT_FROM_ACCOUNT = 'Mashreq Bank'`
- `ATM_DEFAULT_DEST_ACCOUNT = 'Cash'`
- Source/destination overridable via `/atm {amount} {bank} from={acc} to={acc}` Telegram syntax.

---

## Section 17: Debt Tracking

### Owed + owed-to-you model

**I Owe (creditors):** 6 slots, rows 6-11 of Debts tab. Snowball order (smallest first):

| # | Creditor | Original (PKR) | Pre-paid (PKR) | Priority |
|---|----------|---------------|----------------|----------|
| 1 | Zain Cousin | 1,300 | 0 | 🥇 #1 Snowball |
| 2 | Mother in Law | 1,500 | 0 | 🥈 #2 Snowball |
| 3 | Shahbaz | 1,500 | 0 | 🥉 #3 Snowball |
| 4 | Yusra | 17,500 | 12,500 | #4 Snowball |
| 5 | Mashal | 8,500 | 0 | #5 Snowball |
| 6 | Imran Bhai | 285,000 | 70,000 | #6 Snowball — Boss |

**Owed to Me (receivables):** 5 slots, rows 16-20. Currently empty defaults.

### Counterparty registry

Names are hardcoded in FIN_DEBTS_DEFAULT array. Name matching in reversal restoration uses exact match first, then case-insensitive contains-match for resilience.

### Payment history

Each payment creates a ledger row (type = Debt Out, category = 💸 Debt Payment, counterparty = creditor name). The Debts tab tracks cumulative paid in col D. `verifyDebtsLedgerSync()` cross-checks Debts tab paid totals vs SUMIFS of Debt Out transactions by counterparty in ledger.

### Debt In / Debt Out transaction types

`Debt Out`: money you're paying to a creditor. Reduces asset account balance.
`Debt In`: money received from a debtor who owes you. Increases asset account balance.
Both included in account balance formula (Debt In = credit, Debt Out = debit).

---

## Section 18: Nano Loan Tracking

### Loan providers (NL_APPS)

| Code | App Name | Default Shape |
|------|----------|---------------|
| SQ | Smart Qarza | B |
| PA | Paisayaar | A |
| BW | Barwaqt | A |
| EL | EasyLoan | A |
| FP | FinjaPay | A |
| SR | Sarmaya | A |

### Repayment shapes

- **Shape A (Refinance Loop):** Repay via HBL Pay funded by CC. Cash flow: loan IN → CC OUT to fund repayment → CC kite next cycle.
- **Shape B (Salary-Redeemed):** Repay via salary cash. Real paydown.

### Transaction categories

- `📱 Nano Loan In` — when loan proceeds arrive in account.
- `📱 Nano Loan Repay` — when loan is repaid.
- `📱 Nano Loop Fee` — fee for using the refinance loop.

### Cool-Off fee

Entered as separate field. Represents the interest/processing fee charged by nano-loan app.

### Push Today's Loans to CC

`pushTodaysLoansToCC()` — button in row 7 of Nano Loans tab. Aggregates all today's loans not yet marked `[PUSHED]`. Calls `_logCCPaymentFromSource()` which creates 3 ledger rows: Meezan OUT → Alfalah CC IN + 1-Biller fee row. Uses `_nlBillerFee(amount)` which calls `getBillerFeeForAmount()` (Finance_Intl v1.1) — tiered 1-Biller fee structure. Marks each pushed loan with [PUSHED] tag in notes.

### Loan tracking layout

Active loans tab rows 14-33 (20 slots), Closed loans rows 37-56 (20 slots). Status values: Active, Closed, Defaulted.

### Hub embed

Nano loans summary panel in Finance Hub rows 47-54 via `renderNanoLoanPanelInHub()`.

---

## Section 19: Bank Reconciliation

### Match algorithm (`Finance_BankReconciler.gs`)

1. User pastes statement into "📋 Paste Pad" tab (col A rows 5+, account name in B2).
2. `parseBankStatement(text)` — regex parses each line for date + description + amount. Skips headers, totals, and unparseable lines.
3. `diffBankVsLedger(account, parsed)` — for each parsed statement row:
   - Scans ledger rows 14-213 for same account.
   - Match condition: date within **±2 days** AND amount within **±5 PKR OR ±1%** of statement amount.
   - If match found → `matched[]`.
   - If no match → `missing[]` (in statement but not ledger).
4. Ledger rows for that account with no statement match → `extra[]`.
5. `renderDiffReport()` builds "📋 Bank Diff" tab: matched/missing/extra rows side-by-side.

### Confidence scoring

Binary match/no-match (no explicit confidence score). Tolerance is `BR_DATE_TOLERANCE_DAYS = 2` and `BR_AMOUNT_TOLERANCE_PKR = 5` or `BR_AMOUNT_TOLERANCE_PCT = 0.01`.

### Unmatched flagging

`missing[]` rows surfaced in Bank Diff tab with action button to add to ledger. `extra[]` rows flagged as "In ledger but not in statement — possible duplicate or uncleared txn."

### Separate drift-detection tool

`Finance_Reconciliation.gs` — different from bank reconciler. In Accounts tab rows 26-42. User declares real bank balance in yellow cells. System shows computed balance (from ledger SUMIFS), drift (declared − computed), and status (🟢 <100 PKR, 🟡 <1000, 🚨 ≥1000 PKR).

---

## Section 20: Merchant Intelligence

### Merchant registry structure

`FIN_MERCH_HARDCODED` — 150+ hardcoded merchants (lowercase keys). Each entry:

```javascript
'merchant_name': {
  account: 'Alfalah CC',      // default account
  category: '🌐 Intl Subscription', // default category
  pra: true/false,            // PRA IT Tax applies?
  fxFee: true/false,          // International FX fees apply?
  intl: true/false,           // International transaction?
  notes: 'context note'
}
```

`fin2_merchant_learned` — PropertiesService key storing JSON of user-added merchants.

### Text matching algorithm

`lookupMerchant(name)`:
1. Normalize input: `.toLowerCase().trim()`.
2. Exact match in `FIN_MERCH_HARDCODED`.
3. Exact match in learned store.
4. No partial/fuzzy matching at the DB layer — exact key lookup only.

Used by `logIntlPurchase()` to auto-apply PRA flag and default account before user override.

### Merchant categories by type

- **International subscriptions:** Google/YouTube (no PRA), Netflix/Spotify/OpenAI/Anthropic/Claude (PRA yes), Dev infra/GitHub/AWS/Cloudflare (no PRA), Learning platforms (PRA yes), Microsoft/Adobe/Notion (PRA yes).
- **Local food delivery:** Foodpanda, Cheetay (JazzCash). Fast food chains (Alfalah CC).
- **Transport:** Careem/Uber/Bykea (JazzCash). Fuel stations (Cash).
- **Shopping:** Daraz, Priceoye, Telemart, Naheed, Krave Mart (Alfalah CC).
- **Banks/wallets:** JazzCash, Easypaisa, UBL, Meezan, HBL (transfers, no FX).
- **Telcos:** PTCL, Zong, Jazz, Telenor, Ufone (Bills category).
- **Fuel:** PSO, Shell, Total Parco, Attock, Go Fuel, Caltex.
- **Marketplaces:** Daraz, ishopping, Goto.
- **Nano-loan providers:** Barwaqt, Paisayaar etc. — tracked via Finance_NanoLoan.

### Learning mechanism

`learnMerchant(name, profile)` — saves to `fin2_merchant_learned` in PropertiesService. No `learned_count` or `auto_apply_allowed` in v1.0 — simple key-value store with manual add via `cmdMerchantAdd` Telegram command.

---

## Section 21: Audit Trail

### Buffered fast audit log (FIN2_AUDIT_BUFFER)

- Key: `fin2_audit_buffer` in PropertiesService.
- Whitelisted actions (FIN2_FAST_LOG_ACTIONS): TXN_LOGGED, TXN_REVERSED, TRANSFER, BILL_PAID, GOAL_ALLOCATE, OPENING_BALANCE, CC_OPENING, INTL_PURCHASE_SHEET, CC_VALIDATION_BLOCK/OVERRIDE, SALARY_AUTO_DETECTED/CATEGORY_CORRECTED/PATTERN_IGNORED, LOCK_TIMEOUT, DEBT_RESTORE, BALANCE_CONSTRAINT_BLOCK/OVERRIDE, CC_LIMIT_OVERRIDE, FX_RATE_BACKFILL.
- `_logAuditFast(action, detail)`: whitelisted → `_bufferAuditEntry()`. Non-whitelisted → `logAuditAction()` directly.
- Buffer flushed: when buf.length ≥ 20 (`FIN2_AUDIT_BUFFER_FLUSH_AT`) or ≥ 100 (hard cap). Auto-flush via time-based trigger every 5 minutes.

### Direct audit log (logAuditAction in Code.gs)

Non-buffered writes to "Audit Log" hidden tab. Called for system-level events (FINANCE_REBUILD, DEBTS_REBUILD, SNAPSHOT ops, etc.) and for non-whitelisted actions via buffer fallback.

### What gets logged

46 action types tracked in `FIN_AUDIT_ACTION_CATEGORIES`. Every transaction write, every reversal, every transfer, every bill payment, every goal allocation, every salary detection, every balance constraint block/override, every CC validation block/override, every FX backfill, every snapshot/restore, every rebuild, every phantom/guardian event, every WORM edit detection.

### Audit Log schema

Cols: Timestamp | Action | Detail | User | Hash (v1.5).

### Retention / rotation

No automatic deletion of "Audit Log" entries. Audit Display tab shows last 500 entries max. Hub panel shows last 20. CSV export available via menu.

### WORM compliance (Finance_Audit v1.5)

- Warning-only sheet protection with description `'WORM_AUDIT_PROTECTION'`.
- `_onAuditLogEdit` trigger: fires on any edit to Audit Log tab, logs `AUDIT_LOG_DIRECT_EDIT_DETECTED` with cell address and old/new values.
- SHA-256 hash chain: col 5 = SHA256(`ts + '|' + action + '|' + detail + '|' + user + '|' + prevHash`). `verifyAuditIntegrity()` walks chain, reports first break.

---

## Section 22: Double-Entry Auditor

### Linked transfer pair verification

`Finance_DoubleEntryAuditor.gs` performs 8 read-only checks on the ledger:

1. **Transfer pairs:** Each row with `[linked: TXN-XXX]` in notes → finds partner by TxnID → verifies OUT pkr + IN pkr = 0 (net zero). Tolerance: 0.01 PKR.
2. **Intl purchase sets:** Parent row (parentId) + child rows `[linked to parentId]` → verifies sum of all pkr amounts = expected total (base + fees).
3. **Reversal pairs:** `[REVERSAL OF TXN-XXX]` → finds original → verifies net = 0.
4. **Reversed transfer pairs (4-row sets):** 2 original linked legs + their 2 reversals → verifies all 4 sum to 0.
5. **Orphaned links:** `[linked: TXN-XXX]` references where TXN-XXX not found in col 14 → orphan flagged.
6. **Missing TxnIDs:** Rows with valid date but empty col 14.
7. **Duplicate TxnIDs:** Two rows sharing same TxnID (collision detection).
8. **Per-account balance proof:** Sum all credits − debits per account. Expected sign: asset = positive, CC liability = negative (outstanding owed).

### Imbalance detection

Any check failing produces a finding in the report. Report rendered as popup + written to a display tab. Audit entry `DOUBLE_ENTRY_SCAN` logged with count of issues found.

---

## Section 23: Hub / Dashboard Aggregates

### Finance Hub metrics

| Metric | Formula | Source |
|--------|---------|--------|
| Spent Today | SUMIFS(G, A>=TODAY, A<TODAY+1, C="Expense") | 💸 Transactions |
| Spent This Week | SUMIFS(G, A>=week-start, A<week-end, C="Expense") | 💸 Transactions |
| Spent This Month | SUMIFS(G, A>=month-start, A<=month-end, C="Expense") | 💸 Transactions |
| Net MTD | SUMIFS(Income MTD) − SUMIFS(Expense MTD) | 💸 Transactions |
| Liquid Total | SUM(E7:E15) of Accounts tab | 🏦 Accounts |
| CC Outstanding | MAX(0, −ccBalFormula) | 🏦 Accounts |
| Net Worth | Liquid Total − CC Outstanding | 🏦 Accounts |
| Recent Transactions | LARGE(A:A, 1..10) + INDEX/MATCH | 💸 Transactions |
| ATM Panel | listPendingATMReversals() + getATMNet30DayFees() | Finance_ATM |
| Audit Panel | _readAuditEntries(20) | Finance_Audit |
| Kite Panel | Form + list of recent kites | Finance_Kite |
| NanoLoan Panel | listActiveNanoLoans() | Finance_NanoLoan |

### Refresh frequency

Hub formulas are live Google Sheets SUMIFS — recalculate automatically on every sheet open and after every transaction write. Hub panel sections (ATM, Audit, Charts, Kite, NanoLoan) require explicit re-embed calls (`embedATMPanelInHub()`, `embedAuditPanelInHub()`, etc.) or a full `rebuildFinanceCockpit()`.

---

## Section 24: Forecast / Cash Flow Projection

### Salary Forecast (Finance_Salary v1.6)

**Projection horizon:** Next salary payment (monthly).

**Structure:** Payslip-accurate live formula sheet.

**Input cells (editable yellow):**
- Basic: 74,226 PKR
- HRA: 25,979 PKR
- Medical: 7,423 PKR (non-taxable)
- Utility: 3,705 PKR
- WFH Allowance: 8,377 PKR (30 USD × ~280 rate)
- Overtime: days × rate (default 3 days × 7,000 = 21,000)
- MBO bonus: 37,500 PKR (variable)
- Referral bonus: 0 (one-time)
- Tax rate: 2.75%

**Formula derivation:**
- Contract Base = Basic + HRA + Medical + Utility (= 111,333 PKR)
- Total Gross = Contract Base + WFH + Overtime + MBO + Referral + Spot + Kitty
- Tax = Total Gross × taxRate%
- Net = Total Gross − Tax − EOBI (400 PKR)

**Tax Tracker section (live):** FY taxable income, FY tax total, FY tax paid, remaining tax, effective rate. Auto-recalcs as forecast inputs change.

**Multi-anchor auto-detect in salary tab:** When a Meezan Income transaction is detected via `_salaryOnEdit` trigger, it's compared against 3 anchors (see Section 9) and logged.

**Historical reference (March 2026):** Gross 126,893, Net 123,851 PKR stored as constant FIN_SAL_MARCH_2026 for anchor 3 detection.

### Cash Flow Forecast (referenced in SOVEREIGN_STATE.md)

A cash flow forecast feature (`forecast.generate`) is referenced in the Command Centre state as having "precision unknown" status. This is the **new system (sovereign-finance)** forecast API, not a legacy Apps Script module. The legacy sheet does not have a dedicated cash flow projection module in the 20 .gs files analyzed — forecast in legacy is salary-only via Finance_Salary.gs.

---

## Section 25: Governance Rules

Compiled from GLEAN_OPERATING_SYSTEM.md, SOVEREIGN_GOVERNANCE.md, SOVEREIGN_OPS_PATTERNS.md, and SOVEREIGN_STATE.md:

### Finance Safety Rules (always active)
1. **No `/api/money-contracts` as finance truth source.** Permanently blocked.
2. **Unknown never becomes Ready.** Unverified write_safety, CC proof, or forecast precision stays blocked — not promoted to ready.
3. **No fake balances.** Balances must be computable from real transactions only.
4. **No lifetime Credit Card spend as outstanding.** CC outstanding = ledger balance, not total historical spend.
5. **Do not treat missing Credit Card source as zero.** If CC proof is unavailable, treat as unknown.
6. **No D1 writes from audit/enforcement endpoints.** Read-only audit tools must never trigger write paths.
7. **No ledger-polluting smoke tests.** Test harnesses must not write to production ledger.
8. **Command Centre blocks unsafe actions but must not hide diagnostic truth.** Block the action, but surface the reason clearly.

### Data / Schema Rules
9. **FX rate snapshot per row at commit time** (col 15). Never lookup-time FX conversion.
10. **TxnID must have 5-digit suffix** (collision risk at 3-digit).
11. **Timezone: Asia/Karachi** (PKT) for all timestamps.
12. **Ledger writes only to rows 14-213.** Never write to reserved zone (rows 5-13).
13. **ms-precise timestamps require sleep separation** in batch contexts.
14. **No silent category overrides.** User must be prompted.
15. **No negative balance writes without override audit trail.**

### Code Delivery Rules
16. **Full file rewrites only.** No surgical patches.
17. **7-Layer pre-deployment audit** on every code file (L1-L7).
18. **Mental trace minimum 3-4 scenarios** before delivery.
19. **STOP if any layer flags a problem.** Fix before delivery.

### Banking-Grade Code Standards (Finance hot paths)
20. **LockService.getDocumentLock().tryLock(30000)** with finally release — required on all write paths.
21. **Pre-write balance constraint check** (asset overdraft / CC overlimit) — required before every ledger write.
22. **FX rate snapshot per row** at commit time (col 15) — required for USD transactions.
23. **TxnID generation with 5-digit suffix** — required for every row.
24. **Audit trail** via `_logAuditFast` (buffered) or `logAuditAction` (direct) — required.
25. **Snapshot before destructive ops** via `snapFinanceSuite()` — required.
26. **Idempotency guards on reversal** (notes regex check for [REVERSED BY] / [REVERSAL PENDING]).
27. **User prompt before silent overrides** (salary detect, CC validation).

### Anti-Patterns (NEVER DO)
28. ❌ Surgical patches in chat.
29. ❌ Skip the 7-layer audit.
30. ❌ Skip mental trace.
31. ❌ Lookup-time FX conversion.
32. ❌ Silent category overrides.
33. ❌ Negative balance writes without override audit.
34. ❌ Cross-module rebuild calls without source verification.
35. ❌ Apply-to-all destructive ops without 5-fold defense (pre-flight + auto-snap + confirmation + atomic + undo).
36. ❌ Invent new safety patterns — reuse canonical Finance_Pro Snapshot + Vaccine pattern.
37. ❌ TxnID with 3-digit suffix.
38. ❌ ms-precise timestamps without sleep in batch.

### Command Centre Authority Rules (SOVEREIGN_STATE.md)
39. **Guardrails lift centrally from Command Centre only.** Pages obey — they do not decide authority.
40. **Bad path:** Edit page to remove disabled button. **Good path:** Fix source/checklist → Command Centre returns `allowed:true` → page obeys.
41. **Phase ordering is non-skippable:** Phase 4 → 5 → 6 → 7 → 8. No skipping.
42. **No route gates until Phase 6.**
43. **No backend mutating API enforcement until Phase 7.**
44. **No override system until Phase 8.**

### State File Rules
45. **SOVEREIGN_STATE.md stays short** (80-150 lines, dashboard only).
46. **Long history goes to /sessions/ archive files.**
47. **If memory conflicts with state file, state file wins.**

### Source of Truth Order
48. Live repo/file/API output → SOVEREIGN_STATE.md → session archives → Glean memory → chat context.
49. **Never treat old chat memory as durable project truth when repo/state is available.**

---

## Section 26: Suspected Hidden Logic

Items that appear important but require human review or deeper investigation:

1. **`validateCCPayment(account, type, category)` — location unclear.** Called in `submitTxnFromQuickEntry()` with `typeof validateCCPayment === 'function'` guard. Not found in Finance_Pro.gs or Finance_CCAudit.gs during this read. May be in Finance_Vaccine.gs, Finance_CrossTabAuditor.gs, or an unread core module (Code.gs). The CC validation gate logic is therefore partially opaque — the exact conditions that generate a warning string are unknown. **Flag for: find this function and document its CC logic precisely.**

2. **`getBillerFeeForAmount(amount)` — tiered 1-Biller fee structure.** Referenced in Finance_NanoLoan `_nlBillerFee()` as "Finance_Intl v1.1" but Finance_Intl.gs v1.0 only defines a fixed `INTL_BILLER_CHARGE = 31.25`. A v1.1 with tiered fee tiers may exist in memory but not in the file read. Nano-loan push uses this for accurate 1-Biller fees. **Flag for: verify if tiered fee logic exists anywhere in codebase.**

3. **Finance_CrossTabAuditor.gs (25KB, 576 lines) — not fully read.** Purpose and function signatures are partly unknown. Cross-tab integrity is a critical invariant for the rebuild — this module may validate column positions, formula references, and tab interdependencies. **Flag for: full read of Finance_CrossTabAuditor.gs before porting.**

4. **Finance_Vaccine.gs (23KB, 519 lines) — not fully read.** The "Vaccine" system is the canonical diagnostic + self-healing pattern referenced in governance docs ("Finance_Pro Snapshot + Vaccine = canonical"). It likely contains `diagnoseFinanceSuite()`, `vaccinateFinance()`, and possibly `snapFinanceSuite()` replication detection. **Flag for: full read — critical for understanding what a "healthy" sheet state looks like.**

5. **Finance_PDFParser.gs (24KB, 639 lines) — not read.** Parses bank PDF statements. Whether it outputs the same format as `parseBankStatement()` (text-based) or a different format is unknown. Used by bank reconciler flow or manually. **Flag for: read to understand PDF-to-ledger parsing pipeline.**

6. **WebApp.gs `getDashboardData()` reads legacy Finance tab (not Finance_Pro tabs).** The `FIN` variable reads `SHEETS.FINANCE` (likely '💰 Finance' legacy tab) and reads cells `B85, B86, B88, B89` for debt metrics. These are legacy formula cells, not the Finance_Pro v3.3 tabs. The new LiquidityOS backend must understand that the webapp dashboard was pointing at the OLD finance tab, not the new Hub/Transactions/Accounts structure. **Flag for: webapp finance data sourced from legacy tab only, not current ledger.**

7. **`appendFinanceMenu()` — complete menu structure not captured.** Finance_Pro builds menus but the full menu tree (all items, all sub-menus, all function assignments) was not captured in the read. The LiquidityOS rebuild should expose equivalent actions via API endpoints. **Flag for: run the sheet or read the menu builder section (~lines 2350+ of Finance_Pro.gs) to capture full action inventory.**

8. **PropertiesService as cache layer — race condition potential.** Row pointer cache (`fin2_next_row_cache`), audit buffer (`fin2_audit_buffer`), last account (`fin2_last_account`), USD rate (`fin2_usd_pkr`), CC cycle marker (`bills_cc_last_cycle_paid`), merchant learned store (`fin2_merchant_learned`), family tracker (`familyTracker`) all live in PropertiesService. In a distributed / concurrent replacement system, these need either a real cache layer or rethought architecture. **Flag for: architectural change required — PropertiesService does not translate to D1.**

9. **Finance_TxnIdRepair.gs (5KB, 130 lines) — not read.** Likely a one-shot repair tool for TxnID gaps. May contain logic for row validation or ID format verification. **Flag for: read before finalizing TxnID schema in new system.**

10. **`_onAuditLogEdit` trigger and concurrency.** The `_onAuditLogEdit` trigger fires on any Audit Log edit and logs to the same Audit Log — creating a potential recursive loop. The code guards with `if (newValue === oldValue) return` but a concurrent write race could still cause duplicate entries. **Flag for: new system should use a separate audit write endpoint with no recursive hooks.**

---

*Inventory complete. File covers 20 .gs files, 4 governance docs, 1 webapp, 26 documented sections.*
*Next action: review this inventory, then proceed to Prompt 1b on sovereign-finance repo.*
