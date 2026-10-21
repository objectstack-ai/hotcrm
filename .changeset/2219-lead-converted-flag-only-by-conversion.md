---
'hotcrm': patch
---

Ticking a lead's Converted switch no longer freezes the lead with nothing converted

On a lead's **Details** tab, the **Conversion** section draws **Converted** as a switch. Ticking it and saving (or
sending `is_converted: true` through the REST API) used to save the lead as converted with no account, contact or
opportunity behind it. From then on every edit was refused with "Cannot edit converted lead … Make changes on the
converted records instead", although there were no converted records, so the lead was frozen for good. This is the
same dead end that choosing **Converted** in the **Status** field led to before the previous release, reached
through the switch instead.

- **Ticking Converted by hand is now refused** when you edit or create a lead, with the message "Only Convert Lead
  marks a lead as Converted, because it creates the account and contact the lead becomes. Use Convert Lead instead of
  ticking Converted." The lead keeps its values and stays editable. The REST API refuses the same write with
  `400 VALIDATION_FAILED`.
- **Convert Lead works as before.** It creates or reuses the account and contact, optionally creates the opportunity,
  marks the lead Converted, and the converted lead stays locked. A conversion approval that is pending or rejected
  still refuses it.
- **Converted leads keep working.** Deleting the account or contact a converted lead became is not refused, and the
  lead stays converted.
