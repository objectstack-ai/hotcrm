---
'hotcrm': patch
---

Drop the raw salutation value from Contact and Lead name formulas so records no longer render as "ms Emily Davis".

`crm_contact.full_name` (and `crm_lead.full_name` / `display_title`) joined `record.salutation` ahead of the name fields. `salutation` is a picklist, so a formula sees the stored VALUE (`mr`, `ms`, `dr`) rather than the label, and every contact and lead rendered with a lowercase prefix in list views, detail titles, and lookups. The formula language offers no proper-case or option-label lookup, and hardcoding `"Ms."` would bake English into a stored value, so the name is now built from `first_name` + `last_name` alone (the Salesforce convention); `salutation` remains its own field and keeps its translated label on forms and detail pages.
