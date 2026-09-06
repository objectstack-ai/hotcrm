---
'hotcrm': patch
---

Document the case intake round-robin in the Setup checklist, in all three doc locales.

`case_auto_assign` assigns every ownerless new case to the holder of the
`service_agent` position with the fewest open cases, and no page said so. The lead
twin was documented twice over — once in the Setup checklist and again in the FAQ —
while for cases the docs carried only the escalation hand-off, which is a different
hook on a different trigger routing to a different pool. What the pages did state was
the *consequence*: the **Unassigned — triage** tab is described as where a web-to-case
submission lands when nobody holds the Service Agent position, which is the no-op
branch of a hook the reader had never been told exists.

**Setup checklist → Case routing — nothing to configure** now states the mechanism
itself: the pool, the least-loaded pick (not a rotation, not territory, no queue),
that it fires on insert only and only on a case that arrives with no owner, that it
never blocks intake even when the pool cannot be read at all, and that an unstaffed
pool leaves the case ownerless for the triage tab — so staffing `service_agent` is a
behaviour change in itself. Like the lead section it carries the "there is no settings
screen for this" note, and it says in as many words that this is not the escalation
hand-off to `service_manager`.

Documentation only — no metadata, hook or seed change.
