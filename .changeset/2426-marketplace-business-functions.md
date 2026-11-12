---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**HotCRM publishes to the marketplace again.** Since the cloud's marketplace taxonomy release, a listing is classified by its business functions, and the cloud refuses a package that still sends the old single `category` — which kept 6.1.0 off the production marketplace. `objectstack.manifest.json` drops `category: "crm"` and declares `businessFunctions: ["sales", "customer_service", "marketing"]` (Sales first, the primary one), and `scripts/publish-marketplace.mjs` sends them as `business_functions`. The listing's solution type stays the default, `app`. Nothing changes inside an installed HotCRM (#2426).
