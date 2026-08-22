---
'hotcrm': patch
---

Assert that the configured driver can **execute** every seeded sharing rule, not
merely that its condition compiles.

`test/sharing-seeding.test.ts` proved each rule's CEL condition compiles to a
pushdown-able filter. Nothing proved the driver could run the filter it compiled
to — and that gap is not theoretical. Two opportunity leadership rules shipped
compiling cleanly and granting nothing, because the driver refused their filter
and `plugin-sharing`'s evaluator caught the error and carried on:

```
ERROR Find operation failed {"object":"crm_opportunity",
  "error":{"message":"unknown top level operator: $not"}}
WARN  [sharing-rule] criteria query failed {"rule":"opportunity_sales_sharing", …}
INFO  SharingServicePlugin: boot rule backfill done {"rules":9,"reconciled":9}
```

`reconciled: 9` — success, reported over two rules that reached nobody.

Each rule now carries a **witness**: one record it must reach and records it must
not. The rule's compiled filter runs against a real ObjectQL engine on the real
driver and must return exactly the witness. The assertion is on grants
materialised rather than on a thrown error, because the error is precisely what
the boot path swallows — a test waiting for one would be testing the harness.
Both halves of the failure now fail at PR time: a filter the driver refuses, and
a filter it executes into nothing. Two guards-on-the-guard keep it honest — a
rule added without a witness fails, and a witness for a retired rule fails.

The operator matrix is extended the same way, from "compiles" to "and these are
the rows the driver returns", against a fixed fixture. The expected sets are
measured, including the null-sensitive rows, rather than reasoned about.

No metadata changed: measured on `@objectstack/driver-memory` 17.1.0, `$not` is
now a declared combinator refused-or-executed rather than passed through to
mingo, so the failure above does not reproduce and the rules' authoring stands
as written. Tests only. Refs #695.
