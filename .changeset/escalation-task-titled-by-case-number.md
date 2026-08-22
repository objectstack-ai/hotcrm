---
'hotcrm': patch
---

Title the escalation follow-up task with the case number instead of the record
id. Escalating a case creates an urgent task for the account owner, and that
task was subjected `Escalated case EMtmaScoa3I-uYFG needs attention` — the
primary key. On a demo org with nine seeded escalations, **All Tasks** opened
on nine urgent rows, all due tomorrow, differing only in a 16-character opaque
string that appears nowhere else in the product: case pages, list views and
breadcrumbs all name a case `CASE-00039`. A support agent could not tell which
customer was on fire without opening every one.

The task now reads:

```
Escalated: CASE-00039 · Login SSO failure after password reset
```

Identifier first, so the task list's truncating Subject column still tells the
rows apart; then the case subject for human context. The record id has not been
dropped — it travels in the task's `related_to_case` relationship, where a
relationship belongs, and the task still opens the right case.

Both halves come from the case the hook already has in hand, so escalation
performs no extra read. Composed titles are capped at 255 characters — the
length `crm_task.subject` declares and the engine enforces — with the tail
trimmed, so a maximum-length case subject can no longer push the insert past
the limit and lose the escalation task to a swallowed validation error.
