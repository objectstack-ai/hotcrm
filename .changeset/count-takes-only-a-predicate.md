---
'hotcrm': patch
---

`ctx.api`'s `count` now has its own query type, `HookCountQuery`, carrying only
`where` — because the engine's legal set for `count` is only `where`, and the
single shared type was blessing two calls that throw on every invocation.

`src/objects/_hook-api.ts` declared all three read methods as one `HookQuery`:

```ts
export interface HookQuery { where?: Doc; fields?: string[]; top?: number }

count:   (q: HookQuery) => Promise<number>;
find:    (q: HookQuery) => Promise<Array<Doc>>;
findOne: (q: HookQuery) => Promise<Doc | null>;
```

The engine does not accept that key set on all three. **Measured against the
pinned `@objectstack` packages (17.3.0)**, on the object the kernel injects as
`ctx.api` — a real `ScopedContext` over a real ObjectQL engine, not the test
harness — by handing each key to the engine and reading the unknown-option
guard, which prints the legal set verbatim:

```
count('crm_account') does not recognise option 'top'. The engine executes none
of it, so the call would succeed with the option silently ignored (#4371).
Legal keys for count: context, where.
```

`fields` produces the same message word for word; the two were measured
separately rather than one inferred from the other. `find` and `findOne` accept
both, and their legal set is far wider — `bypassTenantAudit, context, expand,
fields, limit, offset, orderBy, preserveAudit, search, searchFields, tenantId,
tenantIds, timezone, transaction, where` — with `top` arriving as a declared
alias of `limit`, the same fold that makes `filter` an alias of `where`.

So `count({ where, fields })` and `count({ where, top })` compiled and threw.
That is this file being **wider** than the surface it describes, which is the
one failure it exists to prevent: it is a hand-written description of a surface
the compiler cannot check, and its header already records what that costs —
`update` was declared `(id, doc)` for months while eight hook-side derived
writes were dead in production and the suite stayed green.

**Nothing users see changes, and no call site moved.** All 23 `count()` call
sites under `src/` pass only `where`; the four that pair `fields: ['amount']`
with `top: 5000` are `find()`, in `campaign.hook.ts` and
`campaign_member.hook.ts`, and they keep the unchanged `HookQuery`. The defect
was latent — a wrong call that the types blessed, not a wrong call anyone had
made. `HookQuery` was deliberately **not** narrowed to the three-method
intersection, which would have traded one latent defect for four live ones.

The narrowing is enforced by the compiler, not by a new assertion: reaching for
a projection or a row cap on a call that returns a number is a `tsc` error
again, which is the entire job of this file. `HookCountQuery` reads as the
continuation of the reasoning `HookUpdateOptions` and `HookDeleteOptions`
already carry — deliberately narrow, with excess-property checking rejecting
the rest at the call site — and it records the verbatim engine reading it was
derived from, so the next author does not have to rediscover how to take that
measurement.
