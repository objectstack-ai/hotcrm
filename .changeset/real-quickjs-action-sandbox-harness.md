---
'hotcrm': patch
---

Run action and hook bodies through the REAL QuickJS sandbox in tests. The
action side had no sandbox harness at all — `test/global-actions.test.ts` ran
each `body.source` through `new Function`, which proves what a body computes
and is structurally blind to everything the runtime imposes on it: no module
scope, a JSON-only boundary, a capability gate, and a `ctx.api` the engine
builds rather than the author. `test/helpers/action-sandbox.ts` now hands the
same bodies to the runtime's own `QuickJSScriptRunner` +
`actionBodyRunnerFactory` / `hookBodyRunnerFactory`, over an ObjectQL-shaped
recording engine whose update contract is pinned against a real kernel on the
in-memory driver. `test/action-sandbox.test.ts` executes all seven script
action bodies, asserts the capability gate denies an undeclared capability, and
turns `src/objects/_line-item-price-fill.ts`'s comment-only constraint — the
shared factory is safe only while the handler body never reads a factory
parameter — into an executable guard, with a negative control that fails when
it is violated. Refs #575.
