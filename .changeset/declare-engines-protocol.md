---
'hotcrm': patch
---

Declare the `engines.protocol` compatibility range (fixes #529, ADR-0087).

The app never declared the metadata/runtime protocol range it is authored
against, so ObjectStack 17.0 loaded it unchecked and warned:
`package 'app.objectstack.hotcrm' declares no engines.protocol range; loading
under protocol 17.0.0 without a compatibility check (ADR-0087)`.

The stack manifest in `objectstack.config.ts` — the manifest the ADR-0087
load-time handshake reads — and `objectstack.manifest.json` now both declare
`engines.protocol: "^16.0.0"`, matching the installed `@objectstack/*` 16.x
line. A runtime on a different protocol major now refuses the load up front
with the structured `OS_PROTOCOL_INCOMPATIBLE` diagnostic (naming the
`objectstack migrate meta --from 16` replay command) instead of failing deep
in a schema parse. The platform-upgrade checklist (`docs/MAINTENANCE.md` §3)
now includes bumping this range alongside `specVersion`.
