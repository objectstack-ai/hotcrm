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
 * Query options accepted by read operations.
 *
 * The predicate key is `where` — and ONLY `where`. An earlier version of this
 * type also allowed `filter`, on the belief that "drivers accept either". They
 * do not, and the mismatch fails SILENTLY:
 *
 *   - `find`   normalizes `filter` → `where`, so it happens to work.
 *   - `findOne` spreads the query straight into the AST (`{...query, limit: 1}`)
 *     and never aliases. An unknown `filter` key is dropped by the driver, so
 *     the query degrades to "first row of the object" — no error, no null, just
 *     the wrong record.
 *   - `count`  reads `query.where` explicitly, so `filter` is dropped and the
 *     call counts the WHOLE object.
 *
 * `filter` is therefore deliberately absent: a hook that reaches for it must
 * fail at compile time rather than silently compute against a stranger's row.
 * (See `test/hook-query-predicate.test.ts`, which pins this against the real
 * kernel rather than the test harness.)
 */
export interface HookQuery {
  where?: Doc;
  fields?: string[];
  top?: number;
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
  count: (q: HookQuery) => Promise<number>;
  find: (q: HookQuery) => Promise<Array<Doc>>;
  findOne: (q: HookQuery) => Promise<Doc | null>;
  insert: (doc: Doc) => Promise<unknown>;
  update: (doc: HookUpdateDoc, options: HookUpdateOptions) => Promise<unknown>;
  delete: (options: HookDeleteOptions) => Promise<unknown>;
}

export interface HookApi {
  object: (name: string) => HookObjectApi;
}
