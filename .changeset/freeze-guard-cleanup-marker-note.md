---
---

Correct the load-bearing note in `test/freeze-guard-reference-cleanup.test.ts` that explained why the three freeze guards sniff the write shape instead of reading a marker. The note asserted that no reference-cleanup marker reaches a hook, so the write shape "is the only evidence there is". Measured on the 17.1.0 platform line this repo pins, that is false: the engine's marker is readable at `ctx.api.executionContext.__referentialFieldClear` (`true` on the engine's cleanup write, absent on a user's hand-clear of the same lookup, on all three guarded objects).

The guards are unchanged and still sniff shape — deliberately, for the two reasons the note now records: the key is operation-private (`__`-prefixed, so an undeclared dependency), and reachability through the shipped QuickJS path is unproven, since `buildSandboxApi` can hand a hook body an `api` shim carrying no `executionContext` at all. The note's stale 17.0.0-rc.6 context table is re-measured alongside it, and it now points at the upstream ask for a declared `ctx.referentialFieldClear` (objectstack-ai/objectstack#13644).

Comments and test documentation only: no runtime behaviour changes and nothing ships to users.
