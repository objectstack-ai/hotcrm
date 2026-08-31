---
---

Prose only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No assertion, no hook and no guard changed; the two
edited files are `test/` header notes.

The reference-cleanup note at the top of
`test/freeze-guard-reference-cleanup.test.ts` recorded a cascade-vs-hand-clear
comparison as behaviour of 17.1.0. Its cascade column was a **rig artefact**: it
was measured with a `DELETE` that carried no caller identity. The engine builds
its cleanup write as
`{ ...callerContext, transaction, __referentialFieldClear: true }` — it
**inherits** whatever identity the caller supplied — so `updated_by`, `ctx.user`
and `ctx.session` are facts about the `DELETE`, not about the engine.

Re-measured here, in this repo's own kernel rig, with a probe hook at priority
199 ahead of each guard on `crm_opportunity`, `crm_quote` and `crm_lead`, varying
**only** the context handed to the `DELETE`:

| context on the `DELETE` | cascade input | `ctx.user` | `ctx.session` | `api.executionContext` |
| --- | --- | --- | --- | --- |
| `{ userId, isSystem }` — a REST `DELETE` | `{ id, LINK: null, updated_at, updated_by }` | the caller | `{ userId, isSystem }` | `{ userId, isSystem, transaction, __referentialFieldClear }` |
| `{ isSystem }` | `{ id, LINK: null, updated_at }` | `undefined` | `{ isSystem }` | `{ isSystem, transaction, __referentialFieldClear }` |
| none at all | `{ id, LINK: null, updated_at }` | `undefined` | `undefined` | `{ transaction, __referentialFieldClear }` |

A user's hand-clear of the same lookup, run at the top row's context, produces
`{ id, LINK: null, updated_at, updated_by }`, the caller in `ctx.user`, and the
same `ctx.session` — identical to the cascade in everything a guard can read.
The note now carries all three rows plus the hand-clear, labels the identity-less
reading as the rig variant it is, and states the `DELETE`'s context beside the
numbers so the next reader can tell a platform fact from a rig setting.

The conclusion drawn from the old column — *"shape only separates these two
writes at all because the engine happens to omit `updated_by` on the cascade"* —
is replaced. It was false twice over: `updated_by` is in every guard's
`SYSTEM_FIELDS` set, so no predicate here has ever read it, and on this app's
path it does not vary anyway. Shape does not separate the two writes and never
did. The yield lets **any** caller clear a declared link on a settled record —
the trade the 2026-08-11 ruling on #720 accepted, not a side effect of it.

`test/lead-duplicate-link-cleanup.test.ts` already recorded the correct reading,
so the repo answered one question two ways in two files, both labelled as
measurements. The two now cross-reference each other and say why they once
diverged: one varied the caller context and one did not.

That falsified reading had propagated into the upstream ask,
`objectstack-ai/objectstack#13644`. The correction **strengthens** it — the old
reading implied an app had a shape fallback that was unsound but failed safe;
the truth is that on the real path there is no discriminator available to an app
at all except the operation-private key it has been ruled against reading. The
#1165 ruling (2026-08-25) is untouched: the guards keep sniffing write shape and
keep not reading `__referentialFieldClear`.
