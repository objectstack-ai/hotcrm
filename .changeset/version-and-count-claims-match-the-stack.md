---
'hotcrm': patch
---

Say the right protocol version and the right inventory, and gate both (#728, #729).

Two claims the app makes about itself had drifted away from the app, and both
shipped to customers — one in the published artifact, one on the first page a
prospective customer reads.

`objectstack.config.ts` still declared `engines.protocol: "^17.0.0-rc.1"` while
`objectstack.manifest.json` and the `@objectstack/*` dependency line had moved to
`17.0.0-rc.3`. Two platform upgrades in a row bumped the manifest and the
dependencies and left the config behind, so `dist/objectstack.json` advertised a
protocol version the app was not authored against. Only the major participates in
the runtime handshake, so nothing ever failed — which is why it survived two
releases. It now reads `^17.0.0-rc.3`.

The README banner, the "What you get" table, the fork guide and the docs overview
still advertised 15 objects / 23 flows / 4 dashboards. The real inventory is 17
objects, 24 flows, 5 dashboards and 9 datasets: `crm_event` and
`crm_event_attendee` joined the object table, and the getting-started page — which
was a generation further behind at 13 objects — now agrees with the rest. All
three locale faces of every affected page are updated. The `whats-new` page keeps
its numbers: it is a dated record of what v1.0 shipped, not a claim about today.

Both classes are now gated in `test/docs-drift.test.ts` rather than left to a
comment. One rule holds `objectstack.config.ts`, `objectstack.manifest.json` and
the installed `@objectstack/spec` to a single protocol version. The other compares
every count a doc states — English and Chinese spellings alike — against the
counts read from the registered stack at test time, never against a number written
down in the test, so the guard cannot go stale the way the docs did.
