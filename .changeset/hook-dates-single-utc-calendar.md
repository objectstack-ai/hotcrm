---
'hotcrm': patch
---

Five lifecycle hooks computed a persisted date on the **local** calendar and
rendered it on the **UTC** one. Each is now spelled on one calendar — UTC
throughout (`getUTCDate` / `setUTCDate` / `setUTCMonth`), matching the calendar
the engine resolves a bare `{TODAY()}` to and the calendar these dates are
rendered on.

**This changes what gets written, and it is meant to.** In any deployment whose
server clock is not UTC, the dates below moved by one day in the cases named.
No deployment running at UTC sees any change at all — there the two calendars
coincide, which is why the defect survived: nothing in CI could see it.

| hook | field | what a non-UTC deployment wrote before |
| --- | --- | --- |
| `lead_automation` | the qualified-lead follow-up task's `due_date` | one day early when the two-day window crossed a DST spring-forward |
| `case_status_side_effects` | the escalation follow-up task's `due_date` | one day early — a one-day follow-up landed on the day of the escalation itself |
| `opportunity_promote_account` | the close-won activation task's `due_date` | one day early when the three-day window crossed a spring-forward |
| `quote_workflow` | `crm_quote.expiration_date` | one day early for **every** quote whose `quote_date + 30` span crosses a transition — measured on 60 of 730 consecutive quote dates in `America/New_York`, `Europe/Berlin`, `America/Santiago`, `Australia/Sydney` and `Pacific/Auckland` |
| `quote_on_accepted` | the drafted `crm_contract.end_date` | one day early when the offset at the end of the term differs from the offset at its start — 9 of 730 consecutive acceptance dates in `America/New_York` |
| `task_recurrence` | the next occurrence's `due_date` and `reminder_date` | one day early on month and year steps, and the error compounds: each occurrence is computed from the previous one, so a monthly series drifted a further day per occurrence |

The two date-string sites are not the same edit as the three "advance now by N
days" ones, and the difference is why their exposure is wider. `quote.hook.ts`
and `task.hook.ts` advance a stored `YYYY-MM-DD`, which the date-only parse
anchors at **UTC midnight** — so the local reading of that anchor is already
the previous evening west of Greenwich, independently of what the clock says.
Their exposure is therefore every base date whose span crosses a transition,
not the one-hour window of instants the three "now" sites have.

No test was changed. The previously-red assertions go green because the
producer now agrees with the calendar its output is rendered on.
