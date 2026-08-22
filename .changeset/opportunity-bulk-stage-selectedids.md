---
'hotcrm': patch
---

Restore the opportunity list's bulk "Update Stage" button, and move a whole
selection in one dispatch.

Selecting several deals and moving them to a new stage has not worked in this
app since the button was pulled from the list in #588. It was pulled for a good
reason — it reported success and wrote nothing — and the failure was then
attributed to the platform: no REST shape appeared to deliver a multi-row
selection to an action, and the console refused a multi-row selection in the
browser without issuing a request. Both readings were wrong in the same small
way. The declared channel is `params._selectedIds`, a built-in action param with
a **leading underscore**, and every probe had spelled it without one. A
top-level `selectedIds` is never merged into the params bag; a
`params.selectedIds` is correctly refused by the strict params gate as
undeclared. The
platform verified the declared channel end to end and closed its mirror issue as
works-as-declared (objectstack-ai/objectstack#5568).

The console's own "This action runs on a single record" toast was the clearest
evidence of the real cause: it fires exactly when `_selectedIds` was **not**
injected, and nothing injects it for a list that declares no bulk action. So all
three symptoms trace to one missing declaration in this repo.

`src/views/opportunity.view.ts` now declares the action as an aggregate bulk
def — `{ name: 'mass_update_stage', operation: 'custom', execution: 'aggregate' }`
— which dispatches it **once** for the whole selection rather than once per row,
and `src/actions/opportunity.actions.ts` reads `input._selectedIds`. The
single-record path (`ctx.recordId`) is unchanged; the write signature it depends
on was fixed separately in #777. `execution: 'aggregate'` is not decoration: an
`operation: 'custom'` def without it has no dispatcher, and the spec refuses that
shape at parse time.

The body no longer counts iterations, either. An id matching no row resolves to
`null` instead of throwing, so the previous loop would have counted a stale or
deleted id as updated and toasted success for a write that never happened —
re-introducing #588's silent failure through a different door. It now counts only
rows the engine returned and rejects a run it cannot cover in full, which is what
the aggregate contract requires: there is no per-row retry, so a partial result
must be an error. Rows already moved keep their new stage, and re-running the
action over the selection is the retry (setting a stage is idempotent).

Verified against a real dev server: the same request that answers
`400 mass_update_stage: no opportunity selected` before the change answers `200
{"stage":"proposal","updated":2}` after it, with both rows re-read from the store
at the new stage.

The guard in `test/metadata-references.test.ts` that forbade this wiring is
inverted rather than deleted — its premise expired, but the risk it named is real
— and moved to `test/bulk-action-dispatch.test.ts`, since the old file sits one
edit from the repo's 100KB source-hygiene ceiling. The new pins cover the
declaration, the underscore, and a hole nothing else saw: an aggregate def naming
an action that does not exist parses cleanly and dispatches nothing.

Fixes #508.
