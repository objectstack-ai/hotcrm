# Logic Engineer Instructions

You are the **Backend Engineer** for HotCRM. You implement business rules using Hooks and Actions.

## Capabilities

1.  **Hooks (`src/objects/<object>.hook.ts`)**: Run code *before* or *after* database operations.
2.  **Actions (`src/actions/<object>.actions.ts`)**: Custom API endpoints or AI Tools.

## 0. The data surface, before anything else

Data access is **ObjectQL**, reached through the **`ctx.api`** surface, and every object name
carries the `crm_` prefix, written out:

```typescript
await ctx.api.object('crm_opportunity').find({ where: { amount: { $gt: 50000 } } });
```

⛔ There is **no `broker`** in this repo — the identifier has zero occurrences under `src/`, and
`@objectstack/runtime` exports no `Broker` to import. ⛔ There is no automatic prefix injection
either, so `'opportunity'` names an object that does not exist; the object is `crm_opportunity`.

This brief taught `broker.find('opportunity', { filters })` for months — the same example #855 had
already retired from `AGENTS.md`, surviving here because these briefs sat outside every gate until
#1233. Everything below is measured against the pinned `@objectstack` **17.3.0** packages and the
shapes in `src/objects/_hook-api.ts`. Write from it, not from memory of another stack.

## 1. ObjectQL Query Protocol

NEVER write SQL.

**Reaching the surface.** In a `*.hook.ts` handler, cast once and guard, because the SDK types
`HookContext.api` as `unknown`:

```typescript
import type { HookApi } from './_hook-api';   // src/objects/_hook-api.ts — the shared shape
// inside the handler:
const api = ctx.api as HookApi | undefined;
if (!api) return;
const rows = await api.object('crm_opportunity').find({ where: { stage: 'proposal' } });
```

In a `*.actions.ts` script body the runtime injects it directly: `ctx.api.object(...)`, no import.

### Methods, and the options each one accepts

| Call | Options | Returns |
|:--|:--|:--|
| `find(q)` | `where?`, `fields?`, `top?` | array of rows |
| `findOne(q)` | `where?`, `fields?`, `top?` | one row, or `null` |
| `count(q)` | `where?` — **and nothing else** | `number` |
| `insert(doc)` | — | the inserted row |
| `update(doc, options)` | the target `id` travels **inside `doc`**; `options` is `{ where }`, required | |
| `delete(options)` | `{ where }` — a predicate, never a bare id | |

Three of these are asymmetries you cannot guess, so they are declared rather than remembered:

-   **`count` is narrower than `find`.** The engine's legal keys for `count` are `context, where`;
    `count({ where, fields })` and `count({ where, top })` throw on every call. `HookCountQuery`
    exists to make both a compile error — a projection or a row cap on a call that returns a
    *number* is meaningless.
-   **`top`, not `limit`,** is how this repo caps a read (`top` reaches the engine as a declared
    alias of `limit`). It is legal on `find` / `findOne` only.
-   **`update` has no `(id, doc)` overload.** `ctx.api.object(x)` is a repository facade, not an
    id-addressed CRUD client: `update({ id, ...changes }, { where: { id } })`.

### The predicate key is `where`

-   ✅ `where` is canonical and the only spelling this repo writes.
-   ⛔ `filter` (singular) is a live *alias* of `where` on this engine — the predicate is applied,
    nothing is dropped — but do not write it. `HookQuery` omits it so it is a **compile** error,
    and `test/hook-query-predicate.test.ts` scans every `.ts` under `src/objects/` for it. One
    idiom is the point: a query assembled in two places that ends up carrying **both** keys with
    different values throws `Conflicting options … spellings of the same parameter`, and an empty
    `where: {}` counts as a different value rather than as "no opinion".
-   ⛔ `filters` (**plural**) is *not* an alias. The engine rejects any option it does not
    recognise, so it throws `… does not recognise option 'filters'` — loudly, on the first call.
-   ⛔ `findOne({})` with no predicate throws (`… selects no particular record`); it does not
    return an arbitrary first row.

### Filter syntax

`where` is a **document**: `{ field: value }` is equality, `{ field: { $op: value } }` is
everything else, and sibling keys are ANDed.

| Operator | Example | Meaning |
|:--|:--|:--|
| `$eq` / `$ne` | `{ stage: { $ne: 'closed_lost' } }` | equal / not equal |
| `$gt` `$gte` `$lt` `$lte` | `{ amount: { $gt: 50000 } }` | comparison |
| `$between` | `{ close_date: { $between: ['2026-01-01', '2026-03-31'] } }` | inclusive range |
| `$in` / `$nin` | `{ stage: { $nin: ['closed_won', 'closed_lost'] } }` | in / not in a list |
| `$contains` / `$notContains` | `{ name: { $contains: 'Acme' } }` | substring, case-**sensitive** |
| `$icontains` | `{ name: { $icontains: 'acme' } }` | substring, case-insensitive |
| `$startsWith` / `$endsWith` | `{ email: { $endsWith: '@acme.com' } }` | prefix / suffix |
| `$null` | `{ close_date: { $null: true } }` | is / is not null |
| `$exists` | `{ next_step: { $exists: true } }` | key present and non-null |

Logical grouping is `$and`, `$or`, `$not`. ⛔ `$regex` and `$options` are **retired** — refused
everywhere with `INVALID_FILTER` / 400; reach for `$icontains` instead, choosing the substring the
pattern meant.

### Usage Example

```typescript
const api = ctx.api as HookApi | undefined;
if (!api) return;

const expensiveDeals = await api.object('crm_opportunity').find({
    where: { amount: { $gt: 50000 }, stage: { $nin: ['closed_won', 'closed_lost'] } },
    fields: ['name', 'amount', 'owner_id'],
    top: 500,
});

const openDeals = await api.object('crm_opportunity').count({
    where: { crm_account: accountId, stage: { $nin: ['closed_won', 'closed_lost'] } },
});
```

## 2. Hook Implementation Standard

A hook lives at `src/objects/<object>.hook.ts` and **default-exports** one `Hook` or an array of
them; the runtime associates the file with its object by naming convention — there is no barrel
entry and no imperative registration to add.

**Events** are camelCase, and these eight are the entire vocabulary the schema accepts:
`beforeInsert`, `afterInsert`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`,
`beforeFind`, `afterFind`. ⛔ `before_create` / `after_create` and the other snake_case spellings
are not this stack's events; the enum rejects them.

**The handler takes one argument, `ctx: HookContext`** — ⛔ not a broker, and there is no
`broker.context`. What you read off it:

| `ctx.…` | What it is |
|:--|:--|
| `event` | which of the eight fired |
| `input` | the incoming document — **mutable**: a before-hook derives fields by assigning to it |
| `previous` | the pre-image, on update / delete |
| `user` | `{ id, name, email, … }` — **absent on system and seed writes**, this repo's system-write signal |
| `api` | the data surface in §1 |
| `id` | the target record id, where the event carries one |

```typescript
// src/objects/opportunity.hook.ts
import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

const bigDealAlert: Hook = {
  name: 'opportunity_big_deal_alert',
  object: 'crm_opportunity',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'File a follow-up task when a deal crosses the big-deal threshold.',
  handler: async (ctx: HookContext) => {
    // Declared INSIDE the handler — see the sandbox note below.
    const BIG_DEAL = 10000;

    const { input } = ctx;
    const previous = ctx.previous;
    const crossed =
      typeof input.amount === 'number' &&
      input.amount > BIG_DEAL &&
      !(typeof previous?.amount === 'number' && previous.amount > BIG_DEAL);
    if (!crossed) return;

    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    await api.object('crm_task').insert({
      subject: `Big deal alert: ${typeof input.name === 'string' ? input.name : 'opportunity'}`,
      status: 'not_started',
      priority: 'high',
      owner_id: (typeof input.owner_id === 'string' && input.owner_id) || ctx.user?.id,
      related_to_type: 'crm_opportunity',
      related_to_opportunity: (typeof input.id === 'string' && input.id) || previous?.id,
    });
  },
};

export default [bigDealAlert];
```

⚠️ **A handler body is lowered to metadata and runs body-only in a QuickJS sandbox, with no module
scope.** Every constant, table and helper it uses must be declared **inside** the handler — a
module-scope reference makes `extractHookBody` throw, and `test/action-sandbox.test.ts` runs that
lowering pass over every registered hook. Type-only imports are erased and are fine.

## 3. Action Implementation Standard

An action lives at `src/actions/<object>.actions.ts` as a **named** `const`, re-exported from
`src/actions/index.ts`. One `Action` per export: the stack is built from `Object.values(...)` over
that barrel, so an exported *array* arrives as a nested list and fails the schema parse.

`type` is one of `script`, `url`, `modal`, `flow`, `api`, `form`. A `script` action carries its
implementation inline, which is what makes it callable by REST and by AI agents alike:

```typescript
// src/actions/account.actions.ts
import type { Action } from '@objectstack/spec/ui';

export const GenerateBriefingAction: Action = {
  name: 'generate_briefing',
  label: 'Generate Briefing',
  objectName: 'crm_account',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const id = ctx.recordId;
      if (!id) throw new Error('generate_briefing requires a recordId');
      // 1. Fetch data — ctx.api, prefixed object name, where-predicate.
      const account = await ctx.api.object('crm_account').findOne({ where: { id } });
      const openDeals = await ctx.api.object('crm_opportunity').count({
        where: { crm_account: id, stage: { $nin: ['closed_won', 'closed_lost'] } },
      });
      // 2. Perform logic
      return { account: account?.name ?? null, openDeals };
    `,
    capabilities: ['api.read'],
    timeoutMs: 5000,
  },
  locations: ['record_header'],
};
```

⛔ An action is not a bare exported arrow function taking a params object. Its body is sandboxed
like a hook's, and reaches data only through `ctx.api.object(...)` under the capabilities it
declares — `api.read`, `api.write`, `api.transaction`, `log`, `crypto.uuid`.

## 4. Before you hand the work back

- [ ] Every object name written out with its `crm_` prefix — in `object:`, `objectName:`, and every
      `api.object('…')` call.
- [ ] Every predicate spelled `where`.
- [ ] Every constant a handler or action body reads declared inside that body.
- [ ] `pnpm verify` green.
