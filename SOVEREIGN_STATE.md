## 2026-05-09 — Finance Recovery / Visual Work State

### Current operating mode

PATH A — Finance recovery / visual-only cleanup is active.

Primary rule:

- Preserve original finance brain.
- Preserve original balance logic.
- Preserve original Credit Card logic.
- Preserve original salary logic.
- Preserve original bills/debts logic.
- Preserve original transaction save path.
- Do not introduce new backend truth layers.
- Do not infer financial truth from partial history.

### Hard stop rules

Do not work on these unless operator explicitly approves:

- No `/api/money-contracts` logic.
- No inferred balances.
- No Forecast work.
- No backend rewrites.
- No D1 SQL.
- No finance-brain changes.
- No new “truth contract” abstraction.
- No historical transaction totals treated as realtime balances.

### Why recovery mode exists

A previous Ship 5 introduced unsafe `/api/money-contracts` abstraction and incorrectly treated lifetime `cc_spend` as current Credit Card outstanding.

Bad observed result:

- Credit Card showed around `Rs 266,577.78`.
- Real expected outstanding was around `Rs 79k`.
- Root cause: historical/lifetime CC spend was treated as realtime outstanding.

This logic is invalid and must not feed:

- Credit Card
- Forecast
- Hub
- Safety
- Monthly Close
- Any future cockpit

### Credit Card correction rule

Credit Card must follow only this:

- Realtime outstanding must come from original trusted balance/account source.
- Minimum due = 5% of realtime outstanding.
- Statement date = 12th of every month.
- Interest-free days = 55.
- Never use lifetime `cc_spend` as current outstanding.
- If realtime outstanding is unavailable, show `Unverified`.
- Do not show fake `0`.
- Do not show historical spend as due.

A display-only `cc.html` rewrite was generated to remove `/api/money-contracts` dependency and read original realtime account/balance sources only.

### Add Transaction state

Add Transaction icon integration caused a bad visual regression:

- Duplicate-looking preview boxes appeared above real dropdowns.
- Preview boxes were not selectable but looked like controls.
- Empty state showed `?`, making it look broken.
- User correctly halted that direction.

Correction generated:

- Restore `add.html` to clean pre-icon layout.
- Restore `js/add.js` to clean pre-icon logic.
- Expected versions after restore:
  - `add.html` footer: `Add Transaction v0.7.0`
  - `window.SovereignAdd.version` = `v0.4.0`

Current Add Transaction rule:

- Dropdowns must remain the only selectable controls.
- No fake preview fields.
- No duplicate sections.
- No icon rollout on Add Transaction until visual pattern is redesigned and approved.
- Save path must remain original.
- No transaction logic changes.

### Icon foundation state

Stable visual icon foundation was generated:

- `js/icons.js` v1.0.0
- `css/icons.css` v1.0.0

User added bank icon placeholder SVG assets under:

- `/assets/banks`

User added category icon placeholder SVG assets under:

- `/assets/categories`

Important:

- Icons are official-style placeholders, not official bank logos.
- Later official SVGs can replace same file paths without code changes.
- Icon system is currently foundation-only.
- Do not integrate icons site-wide until one page pattern is approved.
- Do not put bank/category icon styling into nav CSS.
- Do not let icon work touch data, IDs, APIs, D1, balances, or transaction logic.

Bank asset paths:

- `/assets/banks/cash.svg`
- `/assets/banks/meezan.svg`
- `/assets/banks/mashreq.svg`
- `/assets/banks/ubl.svg`
- `/assets/banks/ubl-prepaid.svg`
- `/assets/banks/easypaisa.svg`
- `/assets/banks/jazzcash.svg`
- `/assets/banks/nayapay.svg`
- `/assets/banks/js-bank.svg`
- `/assets/banks/alfalah.svg`
- `/assets/banks/alfalah-cc.svg`

Category asset paths:

- `/assets/categories/food.svg`
- `/assets/categories/groceries.svg`
- `/assets/categories/transport.svg`
- `/assets/categories/fuel.svg`
- `/assets/categories/bills.svg`
- `/assets/categories/utilities.svg`
- `/assets/categories/health.svg`
- `/assets/categories/medicine.svg`
- `/assets/categories/salary.svg`
- `/assets/categories/income.svg`
- `/assets/categories/debt.svg`
- `/assets/categories/credit-card.svg`
- `/assets/categories/atm.svg`
- `/assets/categories/transfer.svg`
- `/assets/categories/shopping.svg`
- `/assets/categories/family.svg`
- `/assets/categories/personal.svg`
- `/assets/categories/other.svg`

### Nav / side panel state

Multiple nav iterations were attempted.

Current user feedback:

- Panel still did not feel professional enough.
- Some iterations looked like a full-height left wall.
- Some iterations failed to show icons.
- Some iterations did not move with scroll as expected.
- User asked for honest audit before more redesign.

Latest generated target:

- `js/nav.js` v1.1.9
- `css/nav.css` v1.1.9
- Scroll-with-page premium command dock.
- Scoped SVG icons.
- Visual only.

But deployment/runtime was not confirmed.

Before any new nav redesign, first verify live runtime:
