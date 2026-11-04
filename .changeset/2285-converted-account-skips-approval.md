---
"hotcrm": minor
---

**An account created by Convert Lead no longer goes to account approval (#2285).**

Converting a lead used to send the new account to the Sales Manager's approval inbox, without telling the rep who converted it. Qualifying the lead is already the check, so converting it is not a second application.

- An account that **Convert Lead** creates starts no approval. Its **Approval Status** stays blank and nothing reaches the approval inbox.
- The account gets a new field, **Converted From Lead**, which links back to the lead. It shows only on converted accounts.
- Every other new account goes to approval as before: the New form, an import, a REST create. A conversion that reuses an existing account leaves that account's approval status unchanged.

**Only the conversion can set Converted From Lead.** A create or edit that tries to fill it in by hand, from a form or through the API, is refused with `VALIDATION_FAILED` (400). Once it is set it cannot be pointed at another lead. Without this, filling the field in would skip the approval.

**FROM → TO.** Accounts converted before this release keep the approval request they already have, and that request is decided as before. No data migration is needed.
