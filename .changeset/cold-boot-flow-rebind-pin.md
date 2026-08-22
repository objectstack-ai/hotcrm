---
'hotcrm': patch
---

Pin the cold-boot flow re-bind: every authored flow must register through the
real automation engine, in `pnpm test`, with the whole validation error.

Through 17.0.0-rc.1 every boot of this app emitted **24 warnings — one per
flow** — from the automation service's `kernel:ready` re-bind, and each one
printed the single character `[`. The re-bind is additive, and the boot pull
had already registered the flows, so automations kept firing and the noise read
as cosmetic. It was not: any host that boots from the stored view alone (a
metadata reload, a `sys_metadata`-first host) has only that path, and would
have inherited a flow set of **zero**, silently.

Both halves were platform-side, and only one of them is fixed.

`registerFlow` parses with `FlowSchema`, which #4001 closed — an unrecognized
key throws instead of being dropped. `err.message` was therefore a Zod issue
array, and interpolating it into a one-line `logger.warn` left only its opening
bracket. The full text, once read, named a key **this app never wrote**:

```
[ { "code": "unrecognized_keys", "keys": [ "_diagnostics" ], "path": [], … } ]
```

`getMetaItems({ type: 'flow' })` decorates every served item with
`_diagnostics`, and the bind fed that served document straight back into the
strict schema — the read path failing its own output. 17.0.0-rc.2 fixed it at
the read seam (`stripReadDecorations`, cloud#971) rather than by loosening
`FlowSchema`, so the upgrade in #663 already cleared all 24 warnings here; on
current `main` the boot reports `Bound 24 flow(s) from the protocol at
kernel:ready`. **No HotCRM metadata was ever at fault, and none is changed.**

The truncated warning itself is still live in rc.2 — the next flow that fails
to bind reports the same unreadable `[` — and is filed upstream, because a log
line in `@objectstack/service-automation` is not this app's to fix.

What *is* this app's to fix is never being the thing that log line hides. Adds
`test/flow-cold-boot-rebind.test.ts`, which runs every flow in `allFlows`
through the exact `AutomationEngine.registerFlow` call the re-bind makes —
JSON-round-tripped first, since the re-bind sees the stored document and not
the TypeScript object — and reports the **complete** Zod issue array on
failure. It also reconstructs the #653 class directly: a read-decorated flow
must still be rejected (proving the schema stays closed, so a genuine authoring
error cannot hide either) and must become registrable again after
`stripReadDecorations` (proving the rc.2 remedy is still the remedy, keyed off
`METADATA_READ_DECORATIONS` so a decoration added later is covered too).

Refs #653.
