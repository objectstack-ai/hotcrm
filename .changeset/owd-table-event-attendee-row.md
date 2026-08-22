---
'hotcrm': patch
---

List **Event Attendee** in the Org-Wide Defaults table on Sharing & Security, in
all three locales, and correct the count in the section under it.

`crm_event_attendee` ships `sharingModel: 'controlled_by_parent'` — it arrived
with the activity model (#592) and never reached the OWD table, so an admin
reading `content/docs/administration/sharing-and-security.mdx` (or its zh-Hans /
zh-Hant siblings) to find out how attendee rows are secured found nothing at all,
and the paragraph right below the table went on addressing "the four
parent-derived objects above" while the app shipped five: Contact, Opportunity
Line Item, Quote Line Item, Campaign Member and Event Attendee. The new row names
Event as the parent and points at *Controlled by Parent, in practice* for what
that derivation actually reaches in this release, the same way the Contact and
Campaign Member rows have since #699 — nothing about the shipped access changes
here, only what the page says about it.

The class is now guarded. `test/sharing-coverage.test.ts` derives the OWD table's
parent-derived row set from the compiled stack and checks it against all three
pages in both directions: every `controlled_by_parent` object must have a row,
no row may claim Controlled by Parent for anything the stack does not derive, and
the number word in the prose must equal the number of such objects the app ships.
A sixth parent-derived object now fails CI until all three pages document it,
instead of shipping undocumented for four releases.
