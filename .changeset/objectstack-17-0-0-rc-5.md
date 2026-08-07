---
'hotcrm': patch
---

Upgrade the platform to ObjectStack 17.0.0-rc.5, and declare the matching
`^17.0.0-rc.5` protocol range in the app config and manifest.

**Nothing in this app had to change to absorb it.** That is the finding, not an
omission — rc.5 ships three breaking changes and all three land outside what
HotCRM authors:

- **CSV `import` is no longer a `system-data` bucket default** (spec, #4671).
  Objects in that bucket now opt into the import wizard one at a time, so the
  three RBAC join tables that decide who can do what — user↔position,
  user↔permission set, position↔permission set — lose their bulk-grant entry
  unless a platform object asks for it back. HotCRM declares no `system-data`
  object of its own and no page of its admin documentation points an
  administrator at CSV for those bindings, so no HotCRM surface moves. The
  authorization boundary was never the thing being changed: import was only ever
  an affordance, and every row a CSV wrote already went through the same
  delegated-admin, RLS and permission-set adjudication as a row typed by hand.
- **Transaction handles no longer leak across data sources** (objectql, #5351).
  A business write that crosses data sources inside one `transaction()` is now
  refused outright, and append-only system ledgers are carved out to commit on
  their own connection. This only bites deployments that register a second data
  source; HotCRM registers none — `Tenancy: single`, one
  `SqlDriver(better-sqlite3)` — so the path is unreachable here. Verified on a
  fresh boot: 242 `sys_audit_log` rows landed alongside the seed.
- **`subscribeMetadata` narrowed its `type` parameter** (client, #4627). HotCRM
  does not depend on `@objectstack/client` or `@objectstack/client-react`.

Also new and also inapplicable: `os migrate summary-nulls` backfills roll-up
`count` / `sum` columns left `NULL` by pre-fix inserts. HotCRM has no platform
roll-ups to backfill — its line items and campaign members reach their parents
through `lookup`, not `master_detail`, and the aggregates it displays are plain
number fields written by its own hooks. `docs/MAINTENANCE.md` §3.2 now records
why, and what would change that answer.

Verified on rc.5 rather than assumed: the full gate is green (validate,
typecheck, lint, hygiene, build, and 1886 tests including the
`parent-derived-reach` pins rc.4 established), and a reset-and-reseed boots the
server clean and seeds all 17 objects with 342 rows.
