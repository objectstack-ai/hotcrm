---
'hotcrm': patch
---

Correct the lock-file prose in the source-hygiene scan-surface suite, and keep
the `package-lock.json` exclusion on a measurement rather than on appearance.

`test/source-hygiene-scan-surface.test.ts` still argued about "the two lock
files ... they sit at the root", which stopped being true when the StackBlitz
demo and the `package-lock.json` it existed for were retired. The gate's own
documentation was corrected in that same change; only the suite lagged, and no
test run could have caught it — the case builds its fixtures from its own list
and never reads the real tree, so deleting the file could not turn it red.

The exclusion entry itself is KEPT, because the assumption behind keeping it was
tested rather than assumed: adding `package-lock.json` back to the gate's
`ROOT_TEXT_FILES` turns that case red on the byte it plants, so the entry is a
live guard and dropping it would drop a guard. What was actually wrong is the
prose around it, which described an inventory of the tree instead of the
property being pinned — that the byte check's whitelist carries no lock-file
name, whether or not such a file is at the root today. The three comment sites
now say that, and record that the two entries no longer rest on the same
reason: `pnpm-lock.yaml` is present and excluded by a live decision, while
`package-lock.json` is a name held out of the whitelist against its return.
