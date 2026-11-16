---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Order to Cash now ships demo data, so 订单与回款 / Order to Cash is no longer empty on a fresh install.** The demo story's two signed contracts get a collection plan, invoices and payments: Initech's expired quarterly agreement has four steps of 15,000, two paid in full, one paid 9,000, and one unpaid. Both of the last two are past due, so Overdue Invoices lists them and the receivable reads 21,000. Acme's activated subscription has its year-one step invoiced today for 220,000, unpaid and not yet due, so it shows in Planned This Month. No payment exceeds its invoice. The rows ship in English for en, ja-JP and es-ES, with a Simplified Chinese twin for zh-CN. They are registered by the Order to Cash package, after the contracts they bill (#2529).

On hosted, a tenant receives them once the install path loads a composed bundle's per-package seeds (objectstack#34336).
