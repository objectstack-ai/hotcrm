---
'hotcrm': patch
---

Make the Org-Wide Defaults table on Sharing & Security the app's registered-object
list — in all three locales — and bring the two Chinese pages up to what
Controlled by Parent actually reaches in this release.

The OWD table disagreed with the app in two directions at once. It listed
**Competitor**, an object that no longer exists: `crm_competitor` went with the
demo-only competitor module, taking four dangling profile grants with it, and the
row stayed behind sending admins into Setup to look for a baseline they cannot
find. And it had no row for **Event** at all, even though `crm_event` has shipped
`private` since the activity model landed — so the one place an admin goes to
learn how meeting records are secured answered nothing. Both are fixed here, and
the same stale Competitor battlecard wording is gone from the Profiles page in all
three locales.

The Chinese pages were also six weeks behind the English one on a load-bearing
claim. Both still promised "读：你能看到其父记录你能看到的那些行" — you see the rows
whose parent you can see — which is the intent of Controlled by Parent, not what
this release computes. As measured against the shipped stack, the derivation
resolves accessible parents from the parent object's row-level policies alone, so
a rep who can read one account reads both accounts' contacts, and a rep who can
read no quote still reads every quote's line items. Every place the two pages
carried the old promise now says what the English page has said since that
measurement: the reach section, the OWD rows for Contact / Campaign Member /
Event Attendee, the related-list table, the manual-share section, the layer
summary, and the user tips. The related-list tables also gained the `Events` row
the English page has had since the activity model shipped.

Guards, both widened rather than added alongside: `test/sharing-coverage.test.ts`
now derives the whole OWD row set from the compiled stack instead of only its
parent-derived subset — every registered object must have exactly one row stating
the `sharingModel` it really ships, and no row may name an object the app does not
register, on each of the three pages. Two further rules cover what the Chinese
pages were missing: their related-list tables must name the same account children
the English one does, and all three pages must state the same measured reach and
point at `test/parent-derived-reach.test.ts`, which is what pins that reach
against the engine. A page that drifts on any of it now fails CI naming both the
object and the locale.
