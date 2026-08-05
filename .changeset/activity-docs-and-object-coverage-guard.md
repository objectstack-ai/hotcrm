---
'hotcrm': patch
---

Meetings and calls are documented for the people who use them, and a CI rule now
requires a docs page for every business object.

**The activity model shipped undocumented.** #592 / PR #670 added `crm_event` and
`crm_event_attendee` with a navigation group, six list views, a dashboard, a dataset
and grants in four permission sets — and neither object was named anywhere under
`content/docs/`. AGENTS.md has always required a user-facing page for every new
object; nothing checked, so the requirement held right up until a busy PR.

`content/docs/sales/meetings-and-calls.mdx` (plus `zh-Hans` / `zh-Hant`) now covers
the model as it actually ships:

- **Log a Call / Log a Meeting / Schedule a Meeting** on a lead, contact, account,
  opportunity or case — what each form collects, and the three things one click
  writes (the event, its attendee rows, the timeline entry that drills to the event).
  The UTC wall-clock entry on a scheduled meeting is stated up front, because a rep
  in UTC+8 who types `15:00` books the wrong slot.
- **Planned vs Held**, and why only *Held* refreshes the customer's contact clock:
  a meeting booked for next quarter is not an interaction that happened, and letting
  a booking reset the clock is how an at-risk report learns to lie. The page gives
  reps the habit that follows from it — go back and set the status.
- **What actually refreshes `last_activity_date` / `last_contacted_date`**, read off
  the hooks rather than assumed: a held event, a completed task, `send_email` from a
  contact, and a case reaching *Resolved* — with the walk-up from contact /
  opportunity / case to the account behind them, which is the part that makes the
  signal real. The account-owner / account-type edit that also stamps the date is
  called out as the non-interaction it is.
- **Attendees are queryable records**, with the response and organiser fields a JSON
  string could never carry, and the shipped deletion behaviour: deleting a person
  takes their attendee rows and leaves the meeting standing (#711/#718), while
  deleting a meeting that still has attendees is refused until those rows are gone.
- Where events live in the app, who can see them, and the attendee-row read scope
  that is org-wide today (#694) rather than derived from the meeting.

The Sales Activity dashboard's tile list is **not** repeated here — it belongs to
`content/docs/analytics/dashboards.mdx` (#610) and is linked instead.

**The rule is now enforced.** A new `test/docs-object-coverage.test.ts` derives every
`crm_*` object from the compiled stack and requires each to have a docs page: the
page must exist in all three locales, be registered in its section's `meta.json` so
the sidebar can reach it, name the object, and not be a developer page — the API
reference tabulates nearly every object, so "mentioned under content/docs" would
otherwise have been satisfied by a table row. Registering a new object without
writing its page now fails at PR time. The ledger needs no known-gaps allowlist:
after this page lands, every registered object is covered.
