---
'hotcrm': patch
---

Reconcile the Activities documentation with the activity model that actually
ships, and list every sales page in the Sales Cloud index.

`content/docs/sales/activities.mdx` (and its zh-Hans / zh-Hant siblings) still
described the pre-#592 world, where an activity was a `crm_task` record and
nothing else:

- **"An activity (stored as a Task record) … a meeting to attend"** — since #592
  an activity is two objects: `crm_task` (what you still owe somebody, anchored
  on a due date) and `crm_event` (a meeting or call that takes a calendar slot,
  anchored on a start and an end, with attendees as real records). The page now
  states the division of labour and links to **Meetings & Calls**, which carries
  the full comparison; the task types *Call* and *Meeting* are labelled as what
  they are — to-dos, not calendar entries — and the rep tip that told everyone to
  log every customer call as a *Call* task now points at **Log a Call**.
- **"Opportunity last activity date"** — `crm_opportunity` has no such field, and
  never had one (`quote-generation.flow.ts` still carries the incident note from
  the flow node that failed on the unknown column). Readers were being sent to
  look for a field that does not exist. The bullet is replaced by what really
  surfaces a quiet deal: **Days in Stage**, derived from the stage entry date,
  plus the daily Stalled Deal Alert.
- **"Account last activity date — stamped whenever a task on the account is
  completed"** — a completed task is one of four writers (an event turning
  *Held*, a task completed, *Send Email* on a contact, a case set to *Resolved*),
  and the stamp walks **up** the chain from the opportunity / contact / case to
  the account behind it. Stamping only the directly-named record is precisely the
  behaviour #592 fixed, because it left the account clock frozen through an
  entire sales cycle. The page now says so and links to the measured table.

Also: the **What's included** table on `content/docs/sales/index.mdx` listed 7 of
the section's 9 pages — `forecasting` (which ships and is registered in
`meta.json`) and the new `meetings-and-calls` were missing, in all three locales.

Fixes #739.
