---
'hotcrm': patch
---

Stop hook reads from silently querying the wrong record. Seventeen hook-side
`ctx.api` calls — across eight `*.hook.ts` files and the shared
`_line-item-price-fill.ts` — passed their predicate as `filter:`, a key the
ObjectQL kernel does not accept on every read path, and drops without raising:

- `find` normalizes `filter` → `where`, so those calls were correct by luck.
- `findOne` spreads the query into the AST (`{ ...query, limit: 1 }`) and never
  aliases, so the predicate vanished and the call returned **the object's first
  row** — for any argument, including one matching nothing. It never returned
  `null` and never threw.
- `count` reads `query.where` explicitly, so the predicate vanished and the call
  counted **the entire object**.

Confirmed against a real ObjectQL 16.1.0 engine, not the test harness. The
mis-reads were load-bearing: line-item pricing defaulted `list_price` /
`unit_price` from the first product in the catalog rather than the chosen one;
quote acceptance and won-opportunity / contract-activation account promotion
evaluated their "already in the target state?" gate against an unrelated record
while writing to the correct one; case escalation assigned the follow-up task to
the first account's owner; the account and product delete guards counted every
row in the object, so they blocked deletes that had no real references and
reported an invented number; and campaign ROI snapshots recorded whole-table
opportunity and lead counts as campaign attribution.

`HookQuery` no longer declares `filter?`, so the compiler now rejects the
spelling at authoring time instead of leaving it to be discovered in the data.

The suite could not have caught this: `test/helpers/hook-harness.ts` resolved
its predicate as `q.filter ?? q.where ?? {}`, making the stand-in more
permissive than the kernel it stands in for, so every affected hook tested
green. The harness now throws on `filter`, and `test/hook-query-predicate.test.ts`
pins the contract against a real in-memory kernel — including the kernel's
silent-drop behaviour, so the trap stays documented — plus a source scan over
`src/objects/**.ts` that fails any file reintroducing the key.

That scan deliberately covers the whole directory rather than the `*.hook.ts`
glob: merging `main` brought in the extraction of the two price-fill hooks into
`_line-item-price-fill.ts`, which carried the `filter:` along with it. A guard
keyed to a filename convention would have missed the one instance most likely to
survive a refactor.
