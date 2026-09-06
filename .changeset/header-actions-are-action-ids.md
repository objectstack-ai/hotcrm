---
'hotcrm': patch
---

Name page-header buttons by action id, which is what the protocol asks for.
The four record pages — Account, Case, Lead, Opportunity — authored whole
`ActionDef` objects in their `page:header` `actions` array, imported from
`src/actions/`. `PageHeaderProps.actions` is `z.array(z.string())`, described
as "Action IDs to show in header" (`@objectstack/spec` 17.3.0), so all sixteen
entries were rejected by the props schema and reported by `objectstack lint` as
`component-props-invalid`. They now read as ids — `convert_lead`,
`generate_quote`, `escalate_case`, `close_case`, `clone_opportunity`,
`schedule_followup` and the `log_call` / `log_meeting` / `schedule_meeting`
activity trio — and the rule reports zero.

Nothing a user is offered changes: the same sixteen buttons are named on the
same four headers, in the same order. What changes is that the source now says
it the way the contract says it.

The conversion trades a compile-checked reference for a plain string, so the
resolution the type system used to perform for free is now asserted instead.
Every id was checked against the app's own registry — all sixteen name an
action that exists AND is reachable from the page's object, since the runtime
registers a body action under `<objectName>:<action.name>` and the dispatcher
probes `<objectName>` first. A new guard in `test/action-references.test.ts`
keeps that true, and pins that its resolver still refuses both ways an id can
dangle: a name no action carries, and a real name scoped to a different object.

Two records that described the old state are retired with it. The four
`KNOWN_UNCONFORMING` exemptions in `test/metadata-references.test.ts` are gone,
and the note above them — which argued that the source should follow objectui's
current `page:header` renderer rather than the spec — is replaced by what
settled it. This is a pure metadata application; it declares no `@object-ui/*`
dependency at all, so a renderer's behaviour was never its authority and cannot
be measured from here. Metadata conforms to the protocol. Renderer-side id
resolution belongs to the renderer's own repo.
