---
"hotcrm": patch
---

Enroll Members: the "Enroll" choice now honours what the caller asked for

The Campaign Enrollment flow seeded its `memberSource` default with an
assignment node that ran unconditionally ahead of the screen. That node
overwrote a value supplied by whoever launched the flow, so a caller who
started the enrollment on the Contacts side got a dialog pre-set to Leads and,
if the run was resumed without an answer, the Leads branch. The default is now
declared on the flow variable itself, which the engine seeds before the run
starts and which defers to a supplied value — so the dialog opens on the side
the caller chose.

The default is also written once now instead of twice. The screen field derives
its prefill from the variable rather than restating the literal, so the two can
no longer drift apart.
