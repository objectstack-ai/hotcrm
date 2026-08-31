---
'hotcrm': patch
---

Document the triage claim gesture, in all three locales.

The claim seam shipped without its documentation half: an unowned case in
**Unassigned — triage** becomes yours when you move it to *In Progress*,
*Waiting on Customer* or *Waiting on Support* — the app stamps you as its Owner
in the same save — after which it leaves that tab and appears in **My Open
Cases**. That was real behaviour with nothing written down, because the PR that
landed it could not touch `content/docs/**`.

`service/cases` now carries the gesture end to end: the three statuses that
claim, the four that deliberately do not (*New* is the state the row is already
in; *Escalated* belongs to the escalation hand-off; resolving or closing a case
is not picking it up, and leaves it ownerless), and the reason the claim cannot
be spelled as an owner edit — a save carrying Owner is refused for an agent
whatever name it holds, so the status move is the only spelling and the only
name it can write is the caller's own.

`administration/sharing-and-security` gains the admin-facing half:
*Unassigned Cases — Triage* is the one shipped rule meant to be **spent** rather
than held — it opens an unowned case to every `service_agent`, and the claim is
what ends the grant. Claiming is added to the list of everyday actions that
write Owner without being transfers, which is why the gesture needs no new
permission.

Two accuracy fixes ride along on the pages being edited. The rule's row said
`service_agent` gets unowned **cases that are not closed**; the rule also
excludes *Resolved*, so the row overstated the grant in all three locales. And
the two Chinese pages' rows are confirmed present — the earlier gap they were
filed for is already closed.
