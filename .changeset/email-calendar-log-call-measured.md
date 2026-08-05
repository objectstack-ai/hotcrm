---
'hotcrm': patch
---

Docs: rewrite the Email & Calendar guide against what the app actually writes.

The "Log a Call" section still described the pre-event behaviour — a lone
`sys_activity` row of kind *call*. Logging a call has written three things
since the activity model landed: a real Event record, one attendee row per
person (you as organizer, plus the contact/lead and anyone you picked), and a
timeline entry that points at the event. The section now says so and hands off
to **Meetings & Calls** for the full model instead of repeating it.

Two further claims on the page were measured and corrected:

- Activity metrics are counted on the **Sales Activity** dashboard
  (Interactions Logged, Customer Minutes, Activity by Rep, Activity Mix), not
  on the Sales / Service dashboards, which carry pipeline and case metrics and
  no activity tiles.
- The inbox and calendar **connector** sections — connecting Gmail/Outlook,
  two-way email and calendar sync, open/click tracking, scheduled send,
  inbound case email, email templates — describe an integration the app does
  not ship. Each is now marked *(not shipped yet)* and points at the roadmap,
  and the sections that do ship (Send Email, AI drafting, call/meeting
  logging, privacy) are restated from the metadata: Send Email exists on the
  contact record, moves through queued → sent / failed, and delivers only if
  the deployment configures an email transport; the AI skill drafts and stops.

zh-Hans and zh-Hant pages updated with the same content.
