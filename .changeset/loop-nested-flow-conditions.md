---
'hotcrm': patch
---

Make loop-nested flow conditions actually evaluate — three scheduled/screen
flows were inert past their first gate.

`AutomationEngine.registerFlow` runs `applyConversionsToFlow`, which rewrites a
bare string `condition` into a `{ dialect: 'cel', source }` envelope. That pass
walks a flow's **top-level** `edges` only; it does not recurse into the
ADR-0031 control-flow regions (`loop.config.body`). A bare string left in there
falls through to the engine's legacy template path, which substitutes `{var}`
templates (there are none) and then string-compares the leftover expression
text — `'existingStallTask' === 'null'` → false. The gate never opens.

The failure was silent in the worst way: the sweep ran, queried correctly,
selected exactly the right records, and then did nothing.

- `opportunity_stagnation` found every stalled deal and nudged nobody.
- `contract_renewal` never booked a renewal task, notification or opportunity.
- `campaign_enrollment` enrolled no leads at all.

All loop-nested conditions in those three flows are now explicit CEL envelopes.

`contract_renewal`'s notice-window gate carried a **second** defect that only
became reachable once the first was fixed: `timestamp(currentContract.end_date)`
throws `timestamp() requires a string in ISO 8601 format`, because `end_date` is
a DATE field and arrives as `YYYY-MM-DD`. It now appends `T00:00:00Z`. Verified
discriminating: a contract ending in 20 days is in window at
`renewal_notice_days` 30 or 90, and out of window at 10.

Two guards keep this fixed. `test/flow-scheduled.test.ts` pins the engine
asymmetry that makes the envelope necessary — so an upstream fix that makes bare
strings work surfaces as a deliberate review rather than a silent behaviour
change — and walks every registered flow, failing if any loop body ever
reintroduces a bare string condition. `campaign_enrollment` gains a runtime
suite (eligibility, opt-out, cross-campaign dedupe, closed-campaign refusal) and
leaves the `PENDING_FLOWS` list.

This changes what these flows DO in production: the sweeps will now create the
tasks, notifications and renewal opportunities they were always meant to. Their
idempotency gates — the very gates that were broken — are what stop a daily
sweep from piling up duplicates, and each is covered by a repeated-sweep test.
