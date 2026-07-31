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

export interface HookObjectApi {
  count: (q: HookQuery) => Promise<number>;
  find: (q: HookQuery) => Promise<Array<Doc>>;
  findOne: (q: HookQuery) => Promise<Doc | null>;
  insert: (doc: Doc) => Promise<unknown>;
  update: (id: string, doc: Doc) => Promise<unknown>;
  updateMany: (q: { where: Doc; doc: Doc }) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
}

export interface HookApi {
  object: (name: string) => HookObjectApi;
}
