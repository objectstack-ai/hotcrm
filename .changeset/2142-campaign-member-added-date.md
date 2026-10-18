---
'hotcrm': patch
---

**Every campaign member now gets an Added Date, however it was added.** Until this release only **Enroll Members** on a campaign filled in a member's Added Date. A member added with **New** on a campaign's Campaign Members panel, or with **Add to Campaign** on a lead or contact list, was saved with a blank Added Date. Those members showed an empty Added Date column on the campaign's members panel and on the lead's Campaign Members list, and that list sorts by Added Date.

Now Added Date is filled in at the moment the membership is saved, whichever way it was added: Enroll Members, Add to Campaign, New on the members panel, or a REST create. It is still read-only. A create that sends its own Added Date over the REST API still succeeds, but the sent date is ignored and the moment of saving is stored, so a membership cannot be back-dated. The demo data keeps the dates it was written with.

Members saved with a blank Added Date before this release stay blank.
