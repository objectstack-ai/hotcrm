---
'hotcrm': patch
---

Make `AGENTS.md`'s only ObjectQL example match the repo's real read path.

The example under §"Tech Stack & Protocol" item 2 read
`broker.find('opportunity', { filters: [['amount', '>', 50000]] })`, and every part of
it was wrong for this codebase:

- **`broker`** has zero occurrences in `src/`. The data surface an agent actually gets
  is `ctx.api`: 43 call sites in `*.hook.ts` (cast once as `HookApi`, then
  `api.object('crm_x')`) and 17 in action script bodies (`ctx.api.object('crm_x')`).
- **`filters`** is not a key of the in-process query object at all. It is the
  *deprecated plural alias* of the `filter` HTTP query-param, whose value is a JSON
  string. Used in process it fails silently, which is the failure mode this repo has
  already paid for once — `.changeset/hook-query-where-not-filter.md` records seventeen
  hook calls whose predicate vanished: `findOne` returned the object's first row and
  `count` counted the whole object, with no error and no `null`. `HookQuery` in
  `src/objects/_hook-api.ts` now omits the alias precisely so the compiler rejects it.
- **`'opportunity'`** violated the `crm_` prefix rule stated five lines above it in the
  same file. The object is `crm_opportunity`.

The predicate *value* changed shape too: `[['amount', '>', 50000]]` is a legal filter
AST at the platform level, but it is not assignable to `HookQuery['where']`, and no
`ctx.api` call site uses it — every predicate on that surface is written as an object.
So the example now does: `where: { amount: { $gt: 50000 } }`.

The rule is stated *scoped to `ctx.api`* on purpose, because two other surfaces spell
their predicate differently and an unscoped rule would have invited the next agent to
"fix" them:

- A flow node's `config` is a schema-unvalidated bag (`config: z.record(z.string(),
  z.unknown())`) and `*.flow.ts` query/update nodes use `filter:` — 44 occurrences across
  17 of the 21 flow files, `where:` in none.
- A page component config uses `filter:` in the AST-array form, the one spelling of that
  form in `src/` (`src/pages/lead_detail.page.ts:217`).

Documentation only — no runtime, metadata, or dependency change.
