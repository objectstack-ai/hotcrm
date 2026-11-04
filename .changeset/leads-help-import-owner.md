---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The Leads help page no longer says imported leads are spread across the sales reps (#2360).** It listed CSV import and API capture among the ways a lead arrives without an owner and is round-robined to the least-loaded rep. Measured on ObjectStack 18.2.0, only a web-to-lead form submission arrives ownerless and reaches the round-robin. A lead created in the UI, sent through the API under a sign-in or API key, or imported from a file is owned by the person who put it in. For an import that is the person who ran it. The English and Chinese pages now say so, and they link the Admin Manual's *Importing Data* page, which already described this. Lead assignment itself is unchanged.
