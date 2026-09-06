// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Shared structural type for the ObjectQL data API exposed on `ctx.api`
 * inside L2 hook handlers.
 *
 * The SDK types `HookContext.api` as `unknown` (it is injected by the runtime
 * and intentionally not coupled to the spec package). Each hook previously
 * hand-rolled its own narrow shape, which drifted (`filter` vs `where`, missing
 * methods, etc.). This module is the single source of truth for that shape so
 * every `*.hook.ts` can `import type { HookApi }` and stay consistent.
 *
 * Methods are the superset actually used across the CRM hooks. Cast with
 * `ctx.api as HookApi | undefined` and guard for `undefined` before use.
 *
 * ⚠️ This file is a HAND-WRITTEN description of a surface the compiler cannot
 * check for us (`HookContext.api` is `unknown`), which makes it the one place
 * in the app where a type can be confidently WRONG. It was: `update` was
 * declared `(id, doc)` for months while the runtime's second positional
 * parameter is options, so the compiler blessed a call the engine rejects on
 * every invocation — eight hook-side derived writes (rollups, the campaign
 * snapshot, account promotion) were dead in production while the suite stayed
 * green (#616). Every signature here must therefore be justified against the
 * REAL implementation, and pinned by a test that runs the shipped body against
 * a real engine rather than against a friendlier stand-in
 * (`test/hook-write-shape.test.ts`).
 */

type Doc = Record<string, unknown>;

/**
 * Query options accepted by `find` and `findOne`.
 *
 * NOT by `count` — see `HookCountQuery` below, whose legal set is smaller and
 * was measured rather than assumed. The predicate reasoning in the rest of this
 * block governs both types.
 *
 * The predicate key is `where` — and ONLY `where`. `filter` is deliberately
 * absent so a hook that reaches for it fails at COMPILE time.
 *
 * ⚠️ The RULE is unchanged; the REASON below is not the one this block used to
 * give, and the old one is still quoted around the repo, so it is named rather
 * than quietly replaced (#1229). This block used to say that `filter` "fails
 * SILENTLY" — that `findOne` dropped the key and degraded to "first row of the
 * object", and that `count` counted the WHOLE object. That described a real
 * kernel. It does not describe this one, and the two readings have OPPOSITE
 * safety consequences: believing the stale one makes an author over-estimate
 * the blast radius of every `filter` call site, in the unsafe direction.
 *
 * MEASURED per method against the pinned `@objectstack` packages (17.2.0), on
 * the object the kernel actually injects as `ctx.api`. Every line is pinned by
 * an assertion in `test/hook-query-predicate.test.ts`, against a real engine
 * rather than the test harness:
 *
 *   - `find`    — `filter` is ALIASED to `where`; the predicate is applied.
 *   - `findOne` — `filter` is ALIASED to `where`; the predicate is applied.
 *   - `count`   — `filter` is ALIASED to `where`; the predicate is applied.
 *   - `update` / `delete` — the same fold on the options bag.
 *
 * Nothing is silently dropped on this version: the engine REJECTS any option it
 * does not recognise, so `filters` (plural) and every misspelling throw, and
 * `findOne` with no predicate at all throws rather than returning an arbitrary
 * row. A bad predicate key can no longer produce an unscoped read here.
 *
 * So the reason for `where`-only is ONE IDIOM, not silent data loss — and it is
 * still a real reason, because MIXING the spellings is what breaks. A query
 * assembled in two places that ends up carrying both keys with different values
 * throws `Conflicting options … 'where', 'filter' are spellings of the same
 * parameter (canonical 'where')`, and an empty `where: {}` counts as a
 * different value, so a base predicate plus a `filter:` override is a runtime
 * throw rather than a merge. One spelling in this repo makes that unreachable.
 */
export interface HookQuery {
  where?: Doc;
  fields?: string[];
  top?: number;
}

/**
 * Query options accepted by `count`.
 *
 * Deliberately narrow, in the same sense as `HookUpdateOptions` below — except
 * that this one is not a policy choice about what a hook SHOULD reach for. It
 * is the engine's own legal set, and `count`'s really is just the predicate.
 *
 * This type exists because the alternative was measured wrong. All three read
 * methods were declared `HookQuery`, so the compiler blessed
 * `count({ where, fields })` and `count({ where, top })` — and the engine
 * throws on both, on every call. That is this file being WIDER than the surface
 * it describes, which is the failure it exists to prevent and the one it is
 * worst at noticing: nothing here is machine-checked, so a declaration is only
 * as true as the last person to measure it (#1528, the same class as #616).
 * Reaching for a projection or a row cap on a call that returns a NUMBER is a
 * compile error again.
 *
 * MEASURED against the pinned `@objectstack` packages (17.3.0), on the object
 * the kernel injects as `ctx.api`, by handing each key to the engine and
 * reading its unknown-option guard — which prints the legal set verbatim, and
 * is the cheapest authoritative reading of it:
 *
 *   count('crm_account') does not recognise option 'top'. The engine executes
 *   none of it, so the call would succeed with the option silently ignored
 *   (#4371). Legal keys for count: context, where.
 *
 * `fields` produces the same message, word for word; the two were measured
 * separately rather than one inferred from the other. `find` / `findOne` accept
 * both — their legal set is `bypassTenantAudit, context, expand, fields, limit,
 * offset, orderBy, preserveAudit, search, searchFields, tenantId, tenantIds,
 * timezone, transaction, where`, and `top` reaches them as a declared alias of
 * `limit`, the same fold that makes `filter` an alias of `where` above. So the
 * asymmetry is real and belongs in the types, not in a comment asking the
 * reader to remember it.
 *
 * `context` is legal on the engine and omitted here on purpose, exactly as
 * `HookUpdateOptions` omits `multi`: a hook has no business rebuilding the
 * scope the kernel already handed it. Excess-property checking rejects it at
 * the call site.
 */
export interface HookCountQuery {
  where?: Doc;
}

/**
 * The document handed to `update` — the target `id` travels INSIDE it.
 *
 * `ctx.api.object(x)` is a repository facade, not an id-addressed CRUD client:
 * both surfaces the runtime can inject (`ObjectRepository` from
 * `@objectstack/objectql`, and `buildEngineRepoFacade` from
 * `@objectstack/runtime` for a sandboxed body) forward straight to
 * `engine.update(object, data, options)`, and the engine resolves the row from
 * `data.id` (falling back to `options.where.id`). There is no `(id, doc)`
 * overload anywhere on that path.
 *
 * Requiring `id` here is what makes the old `update(id, doc)` spelling a
 * COMPILE error rather than a runtime one: an id string is not a document.
 */
export type HookUpdateDoc = Doc & { id: string };

/**
 * Options accepted by `update`.
 *
 * Deliberately narrow. The engine's legal set is larger (`multi`, `upsert`,
 * `returning`, `transaction`, `timezone`, …) but every extra key is a way for a
 * hook to do something a hook should not — `multi` in particular turns a
 * single-row derived write into a bulk one. Anything a hook legitimately needs
 * is added here on purpose; excess-property checking rejects the rest at the
 * call site, which is how the `amount`-as-an-option throw this type used to
 * produce (#616) stays impossible.
 *
 * `where` is REQUIRED and duplicates `doc.id` on purpose: the row scope a write
 * runs under is the thing worth being explicit about, and it is the shape the
 * rest of the app already uses (`src/actions/contact.actions.ts`, pinned in
 * `test/action-sandbox.test.ts`). One idiom, not two.
 */
export interface HookUpdateOptions {
  where: Doc;
}

/** Options accepted by `delete` — again a predicate, never a bare id. */
export interface HookDeleteOptions {
  where: Doc;
}

/**
 * The write surface. Only the methods that exist on BOTH injected shapes are
 * declared: `ObjectRepository` has `updateById`/`deleteById`/`aggregate` that
 * the sandbox facade does not, and NEITHER has `updateMany` (this type used to
 * declare it — a method call that would have thrown `is not a function`).
 * Declaring only the intersection means a hook cannot compile against a method
 * that may not be there at runtime.
 */
export interface HookObjectApi {
  count: (q: HookCountQuery) => Promise<number>;
  find: (q: HookQuery) => Promise<Array<Doc>>;
  findOne: (q: HookQuery) => Promise<Doc | null>;
  insert: (doc: Doc) => Promise<unknown>;
  update: (doc: HookUpdateDoc, options: HookUpdateOptions) => Promise<unknown>;
  delete: (options: HookDeleteOptions) => Promise<unknown>;
}

export interface HookApi {
  object: (name: string) => HookObjectApi;
}
