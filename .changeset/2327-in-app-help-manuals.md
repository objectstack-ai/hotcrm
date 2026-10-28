---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**In-app manuals under a new Help group.** The last entry of the HotCRM sidebar is now **Help** (collapsed), with the **User Manual** for every member, the **Admin Manual** for administrators only, and the **Revenue Manual**, which the revenue module adds and takes with it when it is uninstalled. Every persona still opens the app where it did.

The four package docs are split into nine pages by topic, each with a Chinese version that opens when the user's language is Chinese:

- User Manual: Overview; Leads; Opportunities (including the approval rules for rejected and recalled deals); Contracts; Cases & SLAs; Knowledge.
- Admin Manual: Access (positions, sharing rules, permission sets); Automation (where every threshold lives).
- Revenue Manual: Quotes.

The Admin Manual is published to the System Administrator permission set (Tenant Administrator in the multi-organization composition): other members neither see the entry nor can read its pages. The lifecycle diagrams of leads, opportunities, contracts, quotes and cases are drawn from each object's real state machine.

Removed doc names: `crm_sales`, `crm_admin` and `crm_service` are replaced by the pages above. A link to one of them now shows "not found".
