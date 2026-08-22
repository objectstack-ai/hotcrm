---
'hotcrm': minor
---

**Do Not Call is now enforced.** The `Do Not Call` checkbox on a lead or contact
recorded a person's wishes and nothing acted on it — the app honoured its email
twin, `Email Opt Out`, in three places while the phone flag was a marker only.

HotCRM now refuses to **schedule** a phone touch against a flagged person: an
open **Call** task and a **planned** *Call* calendar event are both rejected on
save. The refusal sits on the write rather than on a button, so it covers every
way in — the Schedule Follow-up screen, a hand-created task, a data import and
the API alike — instead of only the ones that go through the Console.

**Recording a call that already happened is deliberately still allowed.** The
**Log a Call** action, a *Call* task saved as **Completed**, and a *Call* event
saved as **Held** are never blocked: refusing them would hide the evidence of a
call rather than prevent one, and would penalise the rep who logs it honestly.

The flag stays scoped to the phone. Meetings, demos and email are untouched —
**Schedule a Meeting** still books a meeting with a flagged person, because
someone who will not take calls may still meet in person or over video, and
email is governed by its own `Email Opt Out` flag.

Existing records are unaffected; nothing is migrated or rewritten. A team that
has been using the checkbox as a private note will start seeing the new
rejection when they schedule a call, and can clear the flag on the record to
proceed.
