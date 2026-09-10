---
'hotcrm': patch
---

Correct the VM-boundary claim inside the **Update Stage** action body, and state the
real reason its catch stays cause-agnostic.

`mass_update_stage` carried a comment telling every future author that a host
rejection crosses the QuickJS boundary as `{ name, message }` only — that `code`,
`status` and `details` are "dropped by the bridge" and that a body therefore
"physically cannot test for RECORD_NOT_FOUND". Two of those three keys are not
dropped on the pinned `@objectstack/runtime` 17.4.0. `hostErrorToVm` builds the
error and then copies `code` (non-empty string), `status` (finite number), `fields`
(array) and `userMessage` (non-empty string) onto it. Measured by driving the real
`QuickJSScriptRunner` with the error ObjectQL's by-id `update` actually throws, a
body's `catch` sees `code === 'RECORD_NOT_FOUND'` and `status === 404`. Only
`details` — and `object`, which the old text never named — really are dropped.

**No behaviour changed.** The catch is still deliberately cause-agnostic; the
comment now gives the reason that is true. Every cause has the same outcome at that
point in the loop — the row did not move, so collect it and keep going — and
narrowing the catch to a roster of known codes would let an unlisted cause abort the
loop, which is the exact failure the paragraph above it forbids. Branching on
`err.code` was considered and deliberately not taken: on an all-or-nothing aggregate
dispatch it buys nothing but error prose, and it would pin a partial hand-copy of
the platform's error-code vocabulary into app metadata.

This ships as a `patch` rather than a "releases nothing" declaration because the
text lives inside the action's `body.source` template literal rather than in a
TypeScript comment. It ships verbatim in `dist/objectstack.json` — twice, once under
`objects[].actions[]` and once in the top-level `actions[]` roster — so the built
artifact moves even though nothing a user can observe does.
