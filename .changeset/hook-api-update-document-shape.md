---
'hotcrm': patch
---

Fix every hook-side derived write: opportunity/quote rollups, the campaign
completion snapshot, account promotion, the contract `signed_date` stamp, the
case service rollup and the task activity bubble now actually update their
parent record.

All nine of them called `ctx.api.object(x).update(id, doc)`, but the repository
facade the runtime injects as `ctx.api` takes `update(document, options)` — the
second positional argument is the OPTIONS bag. Every invocation therefore threw
`update('crm_opportunity') does not recognise option 'amount'` and, because
these hooks are all `onError: 'log'`, the only symptom was a parent record that
silently never moved: 96 such throws on one boot of a freshly seeded install,
one per line-item write. Editing a line item did not move the opportunity's
amount or the quote's totals.

The cause was a type that described an API that does not exist:
`src/objects/_hook-api.ts` declared `update(id: string, doc)`, so the compiler
blessed all nine call sites, and both hook stand-ins implemented the
declaration rather than the engine, so the suite stayed green. `HookObjectApi`
now describes the real surface — `update({ id, …fields }, { where: { id } })`,
`delete({ where })`, and no `updateMany` (a method neither injected shape has)
— which makes the old spelling a compile error rather than a runtime one. The
hook harness rejects the broken shape instead of quietly honouring it, and the
new `test/hook-write-shape.test.ts` asserts the argument list that reaches the
engine for all nine writes, running each hook's shipped body through the real
QuickJS sandbox. Refs #616.
