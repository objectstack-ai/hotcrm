---
"hotcrm": minor
---

Clause-②: no
Metadata-protocol: none

**HotCRM runs on ObjectStack 18.4.0.** Every `@objectstack/*` package moves from 18.3.0 to 18.4.0 together, and every package manifest and `objectstack.manifest.json` declare `^18.4.0`. Upgrade the host to ObjectStack 18.4.0 first. On PostgreSQL or MySQL, run `os migrate apply` with the upgrade, as the platform's release notes ask. An installed organization also runs `scripts/migrate-position-holders.ts` once, for the `crm_` position names (#2437).

What 18.4.0 changes for HotCRM users, each with its own entry: the List Price by Category chart is on the Product Catalog dashboard (#2436); a record a person links to must be one they can open (#2440); a seed row an administrator deleted stays deleted across restarts, and a reseed brings it back (#2439). `objectstack.manifest.json` no longer carries `name`, `specVersion` or `skills`, which 18.4.0's manifest schema refuses (ADR-0049); the marketplace listing sends the same values as before (#2420). The test harness composes the artifact the way 18.4.0 requires (#2450).
