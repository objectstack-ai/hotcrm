---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Sales: a framework contract shows its quota, and an order that goes over it warns (#2807).** A framework contract's value is now a ceiling its orders count against. A new **Order Totals** section on the contract shows **Order Amount** — the total of every order linked to the contract, tax included — and, on a framework contract, **Remaining Quota**: the contract value less the Order Amount, below zero once the orders have gone over. Linking an order to a framework contract, or raising a linked order's total, so that the orders under it total more than the contract value saves the order and shows a warning; an edit that does not add to the order's total, or lowers it, gives none. An order line that takes its order over saves without the warning, and the contract's Remaining Quota shows it. Order Amount and **Differs from the Order Amount** move from the Contract Value section to Order Totals, which the printed contract does not include. Labels and the warning are in English, Chinese, Spanish and Japanese, and the Contracts and Orders help describes the quota. Blocking an over-limit order instead of warning is not part of this release.
