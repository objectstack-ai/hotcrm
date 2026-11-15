---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Executives and sales directors can create and edit their own deals, amount included (#2514).** The Sales Leadership set (`sales_leadership`) named `crm_opportunity.amount` read only, so the own-deal create and edit every member's floor allows answered 403 "Field write denied … [amount]" for a `crm_executive` or `crm_sales_director` holder. The field is now editable in that set. The set still grants no object-level create, edit, delete, transfer or export: a deal another rep owns stays read only, and a holder's edit of its amount still answers 403. The set's description (all four locales) and the Profiles page say what it now allows.
