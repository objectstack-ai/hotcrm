---
'hotcrm': patch
---

A case submitted through the public support form can no longer arrive carrying
an escalation reason, and the hook no longer claims to give those cases a
priority it never gave them.

**The escalation reason.** The web-to-case branch already replaced the internal
fields a public submitter must not write — the owner, the internal notes, the
resolution and the escalated flag. It did not replace `escalation_reason`, so a
submission could plant one and it would land on a case whose escalated flag had
just been correctly cleared. The record then contradicted itself in a single
place: the **Escalation** group on the case page renders the flag and the reason
side by side, so a service agent opening that case read a stated reason for an
escalation that had not happened. The reason is now blanked with the flag it
explains.

This is a deliberate widening of what that branch protects, not a repair, so the
reasoning is on the record: an escalation reason is a statement about our
pipeline rather than about the submitter's own problem, which is the line this
branch draws. Every real writer of the column is internal — the escalation flow,
the SLA monitor sweep and the **Escalate Case** action — and the public form
collects only subject, description, type and priority, so no information a
customer actually supplies is lost. Nothing changes for staff: an agent
escalating a case still writes the reason exactly as before, and the validation
requiring one when a case is escalated is untouched.

**The priority default.** The same branch carried a line setting a submitted
case to medium priority when none was given. It never ran. The priority field
declares **Low** as its own default and the platform applies field defaults
before this hook is reached, so the slot was always already filled — a case
submitted without a priority has always been stored as Low, with the 168-hour
Low SLA clock to match. The line is removed. It described behaviour the app did
not have, which is worse than no comment at all for anyone reading the hook to
learn how intake works. Whether a web-submitted case ought to start above Low is
a separate product question and is left open rather than settled by dead code.

`test/case-guest-branch-leftovers.test.ts` pins both against a real engine, on
the values that end up stored: the blanked reason, the untouched staff write,
and — for the priority — the rank and the SLA deadline the hook derives, which
are what show which priority the hook actually saw.
