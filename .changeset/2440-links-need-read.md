---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A record a person links to must be one they can open (#2440).** From ObjectStack 18.4.0 a person's save, import or API write may link a record (an account, a case, a file) only to one that person can read (objectstack#29029); HotCRM accepts that rule and its docs now say so. Two things change for users:

- **Logging a call on a case you cannot open.** FROM: through the API or an import, a person who could not open a case could still log a held call against it, and the case's **First Response Date** was stamped. TO: that call is refused (*Related Case: no crm_case record has id …*). Anyone who can open the case logs the call and the stamp is written as before, including a reader who may not edit the case, such as a Sales Manager. Nothing changes on the screens, where Log a Call sits on a case you have open.
- **An organization admin creating a large won deal.** FROM: an organization admin with no other permission set could create a deal of $100K or more already at *Closed Won* on any account. TO: on an account they can open, which without another permission set means one they own. The person who loads historical won deals across every account holds **System Administrator** (the revenue approvals guide and the in-app Opportunities page say so).

The data import guide adds that a reference naming a record the importer cannot open is refused as matching nothing. The Attachments panel is unchanged for users: on 18.4.0 it attaches a file in the same call that completes its upload.
