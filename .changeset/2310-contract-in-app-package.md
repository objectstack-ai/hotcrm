---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**Contracts now belong to the HotCRM app package, not the revenue module (#2310).** The contract object (`crm_contract`) keeps its name, its fields and every record. What changes is which package of the HotCRM artifact owns it: `app.objectstack.hotcrm` instead of `app.objectstack.hotcrm.revenue`, as `GET /api/v1/packages` and Studio now report. Everything built on the contract moved with it: its activation hook, its list views, the expiry, renewal and billing hand-off flows, the shared **Payment Terms** option list, the two contract notification emails and the demo contracts. An installed tenant takes the move in this one upgrade, while HotCRM still ships as one artifact.

Why: every add-on package is to depend on the HotCRM app package and nothing else (module-split plan, items 10 and 11, ruled 2026-10-26). The planned order-to-cash and project-delivery add-ons both hang off the contract, so leaving it in revenue would have made them depend on revenue too. The contract only points at app-package objects (account, contact, opportunity, user), so the move adds no reference back into a module. Accepting a quote still drafts its contract, and the account and contact delete guards still count activated contracts.

One visible change in the sidebar: under **Sales**, **Contracts** now comes right after **Sales Performance** and before **Quotes**, because it is the app's own entry now and the revenue module's **Quotes** and **Products** follow the app's entries. The Contracts guide moved from the Revenue section of the documentation to the Sales section (English, Simplified and Traditional Chinese).
