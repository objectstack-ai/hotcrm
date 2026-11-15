---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A converted lead's new opportunity is credited to the campaign the lead last responded to (#2515).** `crm_lead` has no campaign field and Lead Conversion never read the lead's campaign memberships, so the opportunity it created had no Campaign: win it and the campaign still showed 0 opportunities, 0 won, revenue 0 and ROI −100% unless a rep filled Campaign by hand. The conversion's opportunity branch now reads the lead's responded memberships (`has_responded`, as the converting user) and writes the most recently responded one's campaign onto the new opportunity. A lead with no responded membership gets no Campaign; the flow writes the field only on the opportunity it creates and updates no opportunity afterwards. The Leads guide, the Campaigns attribution section (all three locales) and the in-app Leads book say so.

The `crm_executive` and `crm_sales_director` position descriptions (all four locales) no longer say "read only": since #2514 their holders create and edit their own deals.
