---
'hotcrm': patch
---

**The lead's Activity tab shows the calls, meetings and emails you logged — not
the audit trail.**

Opening a lead and clicking **Activity** used to return the system's own
bookkeeping: `Created Lead "Wei Zhang"`, `Updated Lead "Wei Zhang"`, one row per
save. The interactions a rep had actually logged against that lead were nowhere
on the tab, and the audit rows duplicated what the neighbouring **History** tab
already showed.

The tab now lists exactly the interactions: every call logged with **Log Call**,
every meeting logged with **Log Meeting**, and every email sent from the record.
Field changes stay on **History**, where they belong, and the lead's follow-up
tasks stay on **Related Records → Open Tasks**.

Two authoring mistakes produced the old behaviour, and both were invisible:

- the timeline was filtered by an object name (`crm_task`) where the component
  filters by *kind of activity* (`task`, `event`, `comment`, …). An unrecognised
  kind is discarded and the leftover empty filter reads as "no filter", so the
  tab quietly showed everything;
- logged calls and meetings arrive as *completed* activity, which the timeline
  hides unless asked to include it. Naming the right kind without also asking
  for completed items would have swung the tab from showing everything to
  showing nothing.

Nothing about your data changes, and no other page is affected. Scheduled (not
yet held) meetings still do not appear on any activity timeline — that is a
platform-side gap, tracked upstream.
