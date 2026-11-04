---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A campaign member created by hand now meets the same two rules as Add to Campaign and Enroll Members (#2344).**

Since #2336, **Add to Campaign** and **Enroll Members** refuse a campaign that is not *Planning* or *In Progress* and a person whose **Email Opt Out** is ticked. A member created any other way skipped both rules: **New** on a campaign's Campaign Members list, a data import, and `POST /api/v1/data/crm_campaign_member` all saved a member of a *Completed* campaign naming an opted-out lead, and that campaign's closed figures moved.

- Saving a new member on a campaign that is not *Planning* or *In Progress*, or that no longer exists, is refused with `VALIDATION_FAILED` (400). The message is the one Add to Campaign shows, naming the campaign.
- Saving a new member for a Lead or Contact whose **Email Opt Out** is ticked is refused with `FORBIDDEN` (403), the code a Do Not Call refusal uses. The message is the one Add to Campaign shows, naming the person.
- Moving an existing member to another campaign, Lead or Contact is checked the same way. Editing a member without moving it is not: marking a *Completed* campaign's member *Responded*, or a member *Unsubscribed*, still saves.
- System writes still pass: seed data, imports run as the system, and the promotion of a converting lead's members to *Converted*.

These two messages are in English in every language for now, because a refusal raised while saving a record has no translation key yet. The same refusals from Add to Campaign stay translated.

**FROM → TO.** Members already stored stay as they are. No data migration is needed.
