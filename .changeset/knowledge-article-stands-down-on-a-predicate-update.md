---
'hotcrm': patch
---

A bulk update that matches knowledge articles is no longer refused outright, and
the seeded articles are owned from the first boot.

`knowledge_article_publish_timestamps` decided both of its payload writes from
the row in front of it. A predicate update — `update(object, payload,
{ multi: true, where })` — sends **one** `SET` clause for every matched row and
hands each row's `beforeUpdate` that same payload rather than a per-row copy
(ADR-0058 Addendum II D3), so those writes did not stay on the rows they were
decided on. Measured on the pinned `@objectstack/* 17.4.0`, on a fresh
`pnpm dev`: the platform's own seed-ownership claim (one payload of
`{ owner_id }`, `where: { owner_id: null }`) matched all four seeded articles;
the three published ones stamped `last_reviewed_at` and the one draft stamped
nothing, and a diverging key set makes the engine refuse the whole batch —

```
Refusing a multi-record update on 'crm_knowledge_article': its 'beforeUpdate'
handlers wrote 'last_reviewed_at' for some of the 4 matched records and not for
others … Nothing was written.
```

So **no** article was claimed, all four stayed ownerless, and the **My Drafts**
list view — which filters `owner_id = {current_user_id}` — was empty for the
admin until the `demo_bootstrap` sweep repaired the rows by id ten minutes
later. The same refusal stands in front of any bulk edit whose matched articles
do not all agree on publication state.

The hook now stands down on the predicate path: `ctx.previous` is supplied there
so a guard can **refuse** a write, not so a rewrite can be aimed at one row, and
stamping is per-record work. Deriving still happens on every per-record path —
which is every writer this app has. After the change, on a fresh database: the
boot banner carries no `claimSeedOwnership` warning, `crm_knowledge_article` is
4 rows with 0 unowned, the draft article carries no review timestamp it did not
earn, and each published article keeps its own historical `published_at`.

Both halves of the guard are load-bearing. A batch **insert** also reports
`dispatch.mode === 'per-row'`, and there each row does carry its own payload, so
the stand-down is scoped to `beforeUpdate`; the seed load still stamps each
article's timestamps individually.

This also corrects the record on why the defect stood open. It was parked on the
belief that a hook body could not see which path it was on — that the sandbox
context carried `input`, `previous`, `user`, `session`, `event`, `object`, `api`,
`log` and `crypto` and nothing else. That was true when it was measured and is
false on the current pin: `@objectstack/runtime@17.4.0` marshals `ctx.dispatch`
(`{ mode, index }`) and an `inputOptions` projection into the body sandbox
(objectstack#11552), so the guard that would once have lowered cleanly and then
evaluated `false` on every production dispatch now answers truthfully.
`ctx.input.id` is still absent; a body that needs the row reads `ctx.previous.id`.
