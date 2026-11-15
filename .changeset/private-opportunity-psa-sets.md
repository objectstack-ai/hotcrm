---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A deal flagged Private stays its owner's for finance controllers, project managers, project directors and the PMO** (hotcrm#2489). The Finance Controller and Project Manager permission sets read every opportunity but did not carry the private-deal row filter (ADR-0058) that Sales Manager and Marketing User carry, so their holders listed and opened every private deal. Both sets now carry it, built with the other two from one shared definition (`src/sales/profiles/_private-opportunity.ts`), and a test fails any set that reads every opportunity without it. No grant changes. A project linked to a private deal shows its Opportunity as a restricted record to a reader the deal is held back from.
