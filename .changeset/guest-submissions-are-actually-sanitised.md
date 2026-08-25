---
'hotcrm': patch
---

Anonymous web-to-case and web-to-lead submissions are now actually sanitised.
Until now the control read as enforced and did nothing.

Both intake hooks open with a guest branch — `case_sla_defaults` on `crm_case`,
`lead_automation` on `crm_lead` — that stamps a few defaults and then removes
the fields a public submitter must not write. On a case: the internal notes, the
resolution, the escalation flag, the closed flag and the case owner. On a lead:
the entire conversion surface (`is_converted` and the four `converted_*`
columns), the owner, and the duplicate link and verdict.

Both branches expressed the removal as `delete input.<field>`, and **measured
against the real engine, every one of those deletes was a silent no-op** — while
the assignments two lines above them (`origin = 'web'`, `lead_source = 'web'`)
landed on the same object in the same call. A submission that carried
`internal_notes` and `resolution` stored them verbatim; one that carried
`is_escalated: true` claimed the outcome of the escalation path without ever
entering it; one that carried `is_converted: true` arrived pre-converted, which
is a state the converted-lead lock then refuses to let anyone edit out. A
submitter who posted `duplicate_status: 'confirmed'` switched the intake dedupe
off for their own submission, because that check stands down on a record that
already carries a verdict.

Each removal is now an overwrite with the safe value — `null`, or `false` for
the two flags — because assignment is the operation that survives. `null`
specifically: an empty string is a real value in a lookup column, and an
explicit `undefined` stores the *key* rather than omitting it. The downstream
hooks that depend on the strip still behave as intended, which is why the safe
value matters — `case_auto_assign` and `lead_auto_assign` treat a nulled
`owner_id` as ownerless and go on to assign a real one, and `lead_duplicate_check`
treats a nulled verdict as blank and runs.

**`is_closed` on a case is now derived on every write, a guest's included.** It
used to be recomputed only for trusted writes, on the assumption that a guest
could not state it — so once the strip became real, a guest-submitted
`status: 'closed'` would have stored `is_closed: false` beside it. The two
contradict each other, and every consumer keyed on the flag reads such a case as
open backlog: the pinned **Unassigned — triage** view and the
`case_unassigned_triage_sharing` rule would both have held it forever.

One consequence worth stating: a guest submission that names `status: 'closed'`
is now **rejected**, by the pre-existing "Resolution is required when closing a
case" rule, because the resolution it planted no longer survives to satisfy that
rule. Previously such a submission was accepted and stored the contradiction
above. An ordinary submission — which names no status — is unaffected and
defaults to `new` exactly as before.

`test/guest-submission-sanitisation.test.ts` pins all of it against the shipped
stack, asserting the **stored row** in each case rather than the absence of an
error, with a positive control that fails if the guest branch stops running at
all and a trusted-write control that fails if the sanitisation ever stops being
guest-scoped.
