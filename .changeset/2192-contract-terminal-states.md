---
'hotcrm': patch
---

A contract's status now follows its route: an expired or terminated contract can no longer be revived

A contract moves **Draft → In Approval → Activated → Expired**. **In Approval** can go back to **Draft**, and a
**Draft**, **In Approval** or **Activated** contract can be **Terminated**. **Expired** and **Terminated** are final:
a renewal is a new contract. That route was declared before, but only as a warning in the server log, so any other
status change saved. An expired contract could be set back to **Activated** with its end date in the past, an
activated one could return to **Draft**, and a draft could be activated without going through approval. Each of
those counted as a live contract again, for the account's *Customer* status, renewal reminders and the billing
hand-off.

- **A status change outside the route is now refused** on the record's Edit form, on the status path and through
  the REST API (`400 VALIDATION_FAILED`, on **Status**), with the message "This status change is not allowed. A
  contract moves Draft → In Approval → Activated → Expired; In Approval can go back to Draft, and Draft, In Approval
  or Activated can be Terminated. Expired and Terminated are final: a renewal is a new contract." The contract
  keeps the status it had. The message is translated into Chinese, Spanish and Japanese.
- **Everything else about an ended contract can still be edited.** Only the status is held: an expired or
  terminated contract still takes changes to its terms, notes, primary contact or any other field.
- **Creating a contract is not checked.** A contract imported or created directly as *Activated* or *Expired*
  still saves, as before.
- **The nightly expiration sweep is unchanged.** It still moves an *Activated* contract past its end date to
  *Expired*.
- **Leads, opportunities, cases and quotes are unchanged.** Their status routes still only warn.
