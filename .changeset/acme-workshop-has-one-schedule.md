---
'hotcrm': patch
---

Give the Acme AI governance workshop **one** schedule. It was seeded three
different ways across three records, and the task to book it was due a day
after the meeting it asked someone to book.

### Three records, three answers

One workshop, read off the seed book:

| record | said | resolved to |
|:--|:--|:--|
| `crm_opportunity` *Acme Platform Upgrade* `next_step` | "Schedule the AI governance workshop for the week of `close_date - 14d`" | `close_date` is `daysFromNow(30)`, so **`daysFromNow(16)`** |
| `crm_event` *Acme — AI agent governance workshop* | `status: 'planned'`, `daysAgo: -6` | **`daysFromNow(6)`** |
| `crm_task` *Acme — schedule AI governance workshop* | `status: 'not_started'`, `due_date: daysFromNow(7)` | **`daysFromNow(7)`** — a day *after* the workshop |

The task was not merely inconsistent, it was self-defeating: an open
"schedule it" task for a meeting that, on the same seed load, was already
booked and already invited.

### The event is the record that gets to be right

The workshop's date is now authored **once**, on the event, and the other two
records were rewritten to agree with it rather than to restate it.

The event won on evidence, not on preference. It is the only one of the three
that carries a real instant in the world — a start, a 90-minute length, a
location, an attendee — and it is the only one another record derives from:
the attendee builder dates the invitation
`daysAgo(max(daysAgo + invitedDaysBefore, 0))`, which for this row is
`max(-6 + 9, 0)` = **`daysAgo(3)`**. The invitation went out three days before
the demo boots, and `john.smith@acme.example.com` has already answered
`tentative`. That is an act that has happened and been replied to; a date you
cannot un-send outranks two dates nobody has acted on. By contrast `next_step`
had no anchor of its own — its value was entirely parasitic on `close_date`,
which #1646 has just made load-bearing for the account description — and the
task's due date was an authored number that nothing else read.

### What changed

- **The task is completed, not re-dated.** Sending the invitation *is* the act
  of booking the workshop, so the task was finished the day that happened:
  `status: 'completed'`, `completed_date` and `due_date` both `daysAgo(3)`,
  with `is_completed` and `progress_percent` mirrored the way the seed book
  already mirrors what `task_completion` would stamp on a real write. Re-dating
  it would have kept the contradiction and only moved it: an open task to book
  a meeting whose invitations are already out is the contradiction itself.
- **`next_step` no longer carries a date at all.** It states what is still
  true however the event is scheduled — the workshop is booked and the
  invitation is out — and leads with the work that is genuinely still open,
  the revised proposal for Jordan Park, which the seed book already tracks as
  its own `not_started` task. The clamp at `daysAgo(0)` in the attendee builder
  means a planned event's invitation is never in the future, so "the
  invitation is out" cannot go stale either.
- **The event is untouched.** So is the opportunity's `close_date`.

The story a reader now gets, opening the three records in any order: the
workshop was booked three days ago, Acme has tentatively accepted, it happens
in six days, and the only thing still owed on the deal is the proposal.

### Movement this causes

Two counts move by one, both intended and neither pinned: the *Tasks
Completed* tile on the Activity dashboard reads 2 instead of 1, and
*My Priority Tasks* lists 3 open high/urgent tasks instead of 4. The completed
task now bubbles `last_activity_date` onto Acme Corporation, which was already
`today()` from a held event two days ago, so no activity clock and no churn
band moves. No object, view, dashboard, report or test changed.
