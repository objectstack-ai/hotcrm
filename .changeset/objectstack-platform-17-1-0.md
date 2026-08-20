---
'hotcrm': patch
---

Upgrade the ObjectStack platform to 17.1.0 across all `@objectstack/*` packages
(from 17.0.0). `specVersion` and `engines.protocol` follow to `^17.1.0` in
lockstep (the docs-drift guard requires the two manifest fields to state one
version).

The build compiles unchanged: 17.1's 33 parse-time accept-set narrowings all
target declared-but-inert keys, and this app authors none of them. Two runtime
behaviours changed and are green in the suite — objectql no longer strips a
hook-derived value on a `readonlyWhen`-locked field (#9107), and automation
answers 409 for a disabled trigger with per-retry input validation. The new
`ActionSchema.onSuccess` action navigation is available but not adopted.
