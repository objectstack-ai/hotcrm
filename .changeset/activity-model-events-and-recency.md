---
'hotcrm': minor
---

Make the CRM able to answer "what happened with this customer, and when?".

**A meeting is now a record.** The new `crm_event` object holds one row per
interaction that occupies a slot on someone's calendar — subject, start and end,
duration, location, type (meeting / call / demo / webinar / onsite visit),
status, owner, and the same five polymorphic `related_to_*` lookups `crm_task`
carries. It ships with a calendar view, a team-schedule timeline, a personal
calendar, an upcoming queue and an interaction-history list, all reachable from
a new **Activity** section in the navigation.

**Attendees are records, not a sentence.** `log_meeting` used to write the
attendee list into a JSON string inside `sys_activity.metadata`, where no view
could filter it, no dataset could group by it and no report could count it. The
new `crm_event_attendee` junction stores one row per person — contact, lead,
colleague or named external guest — each with its own response
(accepted / declined / tentative) and organiser flag. "Meetings this rep
attended" and "contacts who declined twice this quarter" are now ordinary
queries.

**A rep can log a call on anything they sell to.** `log_call`, `log_meeting`
and the new `schedule_meeting` are registered on **lead, contact, account,
opportunity and case** instead of on cases alone, and each one writes a real
`crm_event` plus its attendee rows. The `sys_activity` row survives as the
unified-timeline pointer, now with an ADR-0052 `source_object`/`source_id` drill
to the event itself. `schedule_meeting` books a `planned` event; only a `held`
one counts as contact.

**Interaction recency finally has a writer — it had none.** `at_risk_accounts`
and `customer_churn_signals` are built entirely on
`crm_account.last_activity_date`, and that column was permanently null, for two
independent reasons that both had to be fixed:

- The only writer bubbled to the record the task *named*. A rep names the
  opportunity or the contact, never the account, so the account's clock never
  moved. Both bubbles now walk **up** from a contact, opportunity or case to the
  account above it.
- Even a direct write was silently discarded. `last_activity_date` and
  `crm_lead.last_contacted_date` were `readonly`, and the engine strips a
  readonly key from every non-system write whose caller supplied it (#2948) — a
  hook runs as the acting user, so every bubble the app ever performed was
  dropped with a warning nobody read. **Migration:** both fields are now
  writable metadata rather than readonly; they remain absent from every form
  section, so nothing about the editing surface changes.

`crm_contact` gains `last_contacted_date` for the same reason — the record a rep
actually calls had no recency of its own — and `send_email` now stamps it, along
with the account above the recipient.

**Activity has numbers for the first time.** A new `event_metrics` dataset
(activities, minutes, average duration, by rep / type / week / related record)
powers a new **Sales Activity** dashboard: interactions logged, meetings booked,
customer minutes, activity by rep, weekly volume, activity mix, interactions on
deals, and accounts quiet for 30 / 60 / 90 days. The dashboard is also the first
consumer of the `task_metrics` dataset, which had shipped with no widget using
it at all.
