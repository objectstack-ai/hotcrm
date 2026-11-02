---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The List Price by Category tile is left out when the revenue module is disabled (#2383).** The tile on the CRM Overview dashboard reads revenue's product catalogue. When revenue is disabled, the platform stops serving that module's objects and datasets, and the tile drew a red "Dataset "product_metrics" is not defined in this environment" error. It now asks for the product object first, so the dashboard simply leaves it out and the other tiles fill the page. With revenue enabled, nothing changes: the tile draws as before.

The other screens of the app that reach a disabled module were measured on ObjectStack 18.2.0 too. The Campaign lookup on the opportunity form and the Related Case lookup on tasks and events show their value on the record page. On the edit form they read empty, with an empty picker, and saving keeps the stored value. The related lists (campaign members on a lead, quotes and line items on an opportunity) read empty. None of these raises an error. **Add to Campaign** on leads and contacts and **Generate Quote** on opportunities still show when their module is off and fail when used. Hiding them needs a platform change, because the permission check those buttons read still grants a disabled module's objects. That change is reported to the platform.
