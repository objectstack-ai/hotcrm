---
'hotcrm': patch
---

A lead becomes Converted only through Convert Lead, and a lead stuck at Converted with nothing converted can be edited again

Picking **Converted** in a lead's **Status** (in the Edit or the New Lead form, or through the REST API) used to save
the lead at Converted with no account or contact behind it: **Converted** stayed unticked and the converted
account, contact and opportunity stayed empty. From then on every edit was refused with "Cannot edit converted lead
… Make changes on the converted records instead", although there were no converted records, so the lead was frozen
for good. A lead created as Converted also broke the lead assignment automation that runs on every new lead.

- **Setting Status to Converted by hand is now refused** when you create or edit a lead, with the message "Only
  Convert Lead sets a lead to Converted, because it creates the account and contact the lead becomes. Choose
  another Status, then use Convert Lead." The lead keeps its status and stays editable. The REST API refuses the
  same write with `400 VALIDATION_FAILED`.
- **Convert Lead works as before.** It creates or reuses the account and contact, optionally creates the
  opportunity, marks the lead Converted, and the converted lead stays locked.
- **Leads already stuck are released.** A lead that was set to Converted by hand before this release (Status
  Converted, **Converted** unticked) is no longer locked: it can be edited again. Set its Status back to where the
  lead really is, for example Qualified, and use **Convert Lead** to convert it. No data migration is needed.
