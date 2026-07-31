---
'hotcrm': patch
---

Make flow conditions actually evaluate (#562). Every `decision` node and
conditional edge in `src/flows/` authored its condition as a bare string, and
`AutomationEngine.evaluateCondition` only routes an `Expression` envelope
(`{ dialect, source }`) to the CEL engine. A bare string fell through to a
legacy template path that substitutes `{var}` braces and then compares both
sides as strings — so no condition in the app was ever evaluated as an
expression.

The failure mode was not a uniform no-op, which is what made it dangerous.
`existingStallTask == null` compared `'existingStallTask'` to `'null'` and was
always false, so `opportunity_stagnation` selected the right stalled deals (once
#489 was fixed) and then silently dropped every one of them at the idempotency
gate — no notification, no follow-up task, and a `success` run record either
way. In the other direction `record.rating >= 4` compared `'record.rating'` to
`'4'`, and `'r' > '4'` is true, so `lead_assignment` pinned the Hot branch open
and never took the Standard path.

All 41 condition sites are now authored with the `P` tagged template from
`@objectstack/spec`, which emits the envelope at authoring time. The condition
sources are unchanged: they were already valid CEL — flow variables resolve by
bare name and `record` is the triggering record, because the engine merges its
variable map onto the CEL scope via `ctx.extra`. Only the envelope was missing.

Note that `defineFlow()` would not have been enough on its own: it normalizes
the typed edge `condition`, but a node's `config` is `z.record(z.unknown())`, so
every start-node trigger gate would have stayed a bare string.

A guard in `test/metadata-references.test.ts` fails on any condition that is not
a CEL envelope, at either site, so the bare form cannot come back silently.
