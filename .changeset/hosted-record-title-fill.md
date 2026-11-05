---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Contacts, leads, cases and forecasts saved before 6.1.0 get their stored title on their own, with no script (#2414).** 6.1.0 made these four record titles stored fields, and every record saved before it held none, so on an upgraded environment an opportunity's Primary Contact showed the contact's job title instead of the name, and lists and lookups showed ids. The fix was a script that signs in with a password, which a hosted environment (SSO only) cannot run. Now the first time a list, a record page or a lookup shows such a record, it is titled in the background, at most ten records per screen: that screen may still show the old value, the next one shows the name. A hosted environment needs no step; `scripts/backfill-record-titles.ts` still titles every record at once on a server you can sign in to.

The title is stored by re-saving one of the record's own fields unchanged, so the record's Last Modified moves and its history shows the title being set. Case Escalation sits out that one write: an open Critical case that was never escalated is titled and left unescalated, and its next edit escalates it as before. No other automation on these records acts on it.
