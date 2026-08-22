---
'hotcrm': minor
---

Service agents can now take a case out of the **Unassigned — triage** tab, completing the queue-pull story #1134 opened.

Moving an unowned, open case into a worked status (**In Progress**, **Waiting on Customer**, **Waiting on Support**) now makes the person who moved it its owner. The case leaves the triage tab, the triage share that made it visible evaporates, and it appears in **My Cases** — no admin hand-off in between.

The claim is deliberately narrow. It fires only on a case that currently has no owner and is not closed, and the owner written is always the caller: assigning a case to somebody else, or taking one that already has an owner, remains refused as before and needs the transfer grant that service agents do not hold. Escalation is unaffected — that transition still routes the case to the service-manager pool. Automated and system writes never claim, so an ownerless case stays in triage until a person picks it up.
