---
'hotcrm': patch
---

Teach the selection key the platform can actually deliver, and drop the one
remaining limb in the app that read the key it cannot.

`docs/developers/code_examples.md` is the copy-paste surface for the next author
of an action — human or AI — and its "Add An Action" example was a bulk
enrolment body reading `input.selectedIds`. No underscore, and therefore
undeliverable: a top-level `selectedIds` is never merged into the params bag, so
the body reads `undefined` and the author's own "nothing selected" guard fires;
a `params.selectedIds` is refused by the strict params gate (ADR-0104) with
`400 Unknown action param "selectedIds" — not declared on this action`. Both
refusals are correct, and together they read as proof that the platform has no
multi-select channel. It has one — `_selectedIds`, a built-in action param with
a leading underscore — and this example is where the wrong conclusion kept
getting re-derived. It cost #508 two release candidates and a bulk button that
shipped removed.

The example now reads `input._selectedIds`, and — because a handler is only half
the contract — it also shows the view-side declaration that injects the key:
`bulkActionDefs: [{ name, operation: 'custom', execution: 'aggregate' }]`. A new
section sets the two dispatch contracts side by side, since they are not two
spellings of one thing: a bare-string `bulkActions: ['x']` entry is a per-record
fan-out (N rows, N requests, each carrying that row's `recordId` and no
selection array), while an aggregate def is ONE dispatch carrying every id in
`params._selectedIds` and no `recordId`. The underscore trap is written up as an
explicit callout with both 400s quoted, and the section points at the live
reference implementation landed for #508 — `mass_update_stage` in
`src/actions/opportunity.actions.ts` plus its def in
`src/views/opportunity.view.ts`.

Two further corrections the example needed to be runnable at all: it was
`type: 'modal'` carrying a `body`, and a modal action has no server dispatch —
the renderer just opens its `target` and the runtime refuses it over REST, so
that body could never have executed. It is now `type: 'script'`, and the
now-redundant `target` is gone.

`create_campaign` in `src/actions/lead.actions.ts` carried the same
no-underscore read as a selection-first branch with a `ctx.recordId` fallback
behind it. That branch never executed: the lead list wires the action as the
bare-string form, and the per-record fan-out delivers a `recordId` and no
selection array on every dispatch. Its comment nevertheless promised, in the
present tense, that the bulk path would "light up" once the runtime started
passing `selectedIds` — it would not have, under that spelling, on either
contract. The dead limb is removed and the body now reads `ctx.recordId` alone,
which is exactly what its wiring delivers. **No behaviour change**: multi-lead
enrolment worked before and works now, one lead per dispatch. Whether it should
instead move to the aggregate contract is a product decision (one audit entry
and one dedupe read per run instead of per lead, plus all-or-nothing failure
semantics) and is deliberately left open.

New pins: `test/docs-drift.test.ts` guards the teaching surface — the example
must show `input._selectedIds`, must not show the no-underscore spelling, must
show both view-side declarations, and must keep the trap callout. Text-matched
deliberately, because a fenced code block is prose to `os validate`, `pnpm lint`
and every metadata assertion in this repo. `test/bulk-action-dispatch.test.ts`
pins the lead half as one contract: the body reads `ctx.recordId` and no
undeliverable key, AND the lead list keeps the bare-string wiring that makes
that read correct — flip either half alone and the button breaks silently, so
either half alone turns it red. `test/action-sandbox.test.ts` gains the positive
behaviour nail that was missing: a dispatch carrying only a `recordId` writes
exactly one `crm_campaign_member` row for that lead.
