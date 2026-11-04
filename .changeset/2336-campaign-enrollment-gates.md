---
"hotcrm": patch
---

**Add to Campaign now refuses a closed campaign and a person who opted out of email, and a campaign member holds a Lead or a Contact, not both (#2336).**

Until now only **Enroll Members** checked these two rules. **Add to Campaign** on a lead or a contact did not, so it could add a lead to a *Completed* campaign and change the sent, lead and response figures that campaign had closed with. It could also add a person who had opted out of email.

- **Add to Campaign** refuses a campaign that is not *Planning* or *In Progress*, and a person whose **Email Opt Out** is ticked. Nobody is added, the campaign's numbers do not move, and the message names the closed campaign or the person who opted out. This holds from a row's ⋮ menu and from the selection toolbar.
- The campaign picker on a row's ⋮ menu lists only *Planning* and *In Progress* campaigns.
- **Enroll Members** works as before: opted-out people are left out of the segment, and they are not counted as refused.
- A campaign member can no longer be saved with both a Lead and a Contact. The save is refused with `VALIDATION_FAILED` (400). Converting a lead still promotes its campaign members to *Converted*, because that promotion changes only the member's status.

**FROM → TO.** Members already enrolled stay as they are. A member that already holds both a Lead and a Contact is refused on its next save until one of the two is cleared. No data migration is needed.
