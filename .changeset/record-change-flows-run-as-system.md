---
'hotcrm': patch
---

Give the record-change flows the execution identity the scheduled ones already
had, so system-driven writes stop silently losing their automation — including
an approval gate that a machine-created deal could walk straight through.

A flow's `runAs` decides who its data operations execute as. Under the schema
default `'user'`, a run that resolved **no trigger user** has no identity to
scope to, so the engine refuses its data operations rather than run them
unscoped. The part that was missed here is that "no trigger user" is not a
schedule-only condition: a record-change flow is fired by a **write**, and a
write made without a session — seed loading, an integration or webhook, or
another `runAs: 'system'` flow's own write — carries no user into the run it
triggers. Ten scheduled flows had already been given `runAs: 'system'`, each
with an authored comment saying exactly that; all seven record-change flows
were left on the default. The platform's build-time lint cannot close the gap,
because whether a record-change trigger carries a user is only knowable at run
time.

Measured on `@objectstack/*` 17.0.0-rc.2, driving the real automation engine
with no trigger user:

- **`case_escalation`** (and its insert-time twin) died at its first data node
  with `[runAs] refusing a data operation`. A case raised by the seed loader or
  an integration kept its critical priority forever — a freshly seeded org had
  never once run this automation over its own data.
- **`opportunity_approval`** (and its twin) died the same way, at
  `get_opportunity`, before the approval request was ever opened. A $150K
  renewal created by the `runAs: 'system'` contract_renewal sweep therefore sat
  at `approval_status: 'not_required'`, unlocked, with no approval on record.
  An approval control that engages only for logged-in writers is not a control.
- **`lead_assignment`** died at its SLA stamp, so a lead arriving from
  web-to-lead, a CSV import or a partner integration got no follow-up date and
  no alert at all.

All seven record-change flows now declare `runAs: 'system'` with a per-flow
rationale in source. The declaration elevates the **user-driven** runs too, so
that is argued per flow rather than assumed: every data node in these flows is
keyed to `{record.id}` — the row that just fired the trigger — so user scope
adds no restriction that matters while adding a failure mode (a rep who may
create a lead, or an agent who may raise a case, is not thereby granted edit
rights on it), and for `opportunity_approval` the submitter's own scope is
positively the wrong identity for a gate that exists to constrain the
submitter. No flow in this set relies on the triggering user's restricted scope.

The issue's premise held for three of the seven; the remaining four
(`contact_welcome`, `task_urgent_alert`, `opportunity_won_alert`,
`case_csat_followup`) were measured **not** refused, and that measurement is
recorded rather than papered over. They are notify-only, the refusal covers
`get`/`create`/`update`/`delete` record nodes, and `notify` dispatches through
the messaging service without a run data context — so a user-less run of those
completes and delivers today. They carry the declaration anyway because the
decision worth recording is "record-change automation runs as the platform",
not "this flow currently happens to have no data node": the day one gains a
data node it inherits an elevation that was reasoned about, instead of
discovering a refusal in production.

Pinned two ways so the gap cannot return. `test/actions-flows-integrity.test.ts`
enumerates record-change flows **from the compiled stack** — not a hand-kept
import list — and requires each to declare `runAs: 'system'` with an authored
rationale beside it. `test/flow-record-change.test.ts` runs the real engine
with no trigger user and asserts the writes land, with the pre-fix shape
reproduced on demand (`runAs` stripped) so the assertions cannot pass by
producing nothing. Refs #684, ADR-0049.
