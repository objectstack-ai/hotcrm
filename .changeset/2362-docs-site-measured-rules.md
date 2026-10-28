---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**The documentation site now states four rules the way the app enforces them.** Nothing in the app changes; the pages were wrong, in English and both Chinese versions.

- **Setup checklist, lead routing:** only a lead from the public web-to-lead form goes to the sales-rep round-robin. A lead created in the app, sent through the API, or imported from a CSV or JSON file is owned by the person who put it in, and the page links the import guide's section on owners.
- **Products:** a List Price of zero is accepted and only a negative one is refused; a Cost above the List Price is refused rather than warned about.
- **Campaigns:** the End Date must be after the Start Date, so a campaign that ends on the day it starts is refused.
- **Campaigns, attribution:** converting a lead does not set the Campaign on the opportunity it creates, even when the lead is a member of a campaign, so the deal is credited only once someone sets Campaign on it. The field is named by its real label, *Campaign*, instead of *Source Campaign*.
