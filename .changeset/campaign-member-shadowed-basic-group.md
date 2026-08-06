---
'hotcrm': patch
---

Campaign Member detail pages now show the **Basic Information** section again.

Every field in that group was already on display in the page header — the member
number is the record title, and Campaign / Lead / Contact are the first three
entries of the highlight strip — so the group had nothing left to render below
the header and disappeared from detail pages while still appearing on forms.
The **Added Date** enrollment stamp moves from *Response Tracking* into *Basic
Information*, where it reads better anyway: it records when the membership was
created, not how the person responded. *Response Tracking* keeps the response
lifecycle (First Opened, First Clicked, Response Date, Has Responded).

Nothing changes in the campaign's Members list or in the member header — the
highlight strip is deliberately untouched, because those same fields are what
give the members panel on a campaign its Lead / Contact / Status / Response Date
columns.
