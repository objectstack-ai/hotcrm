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

/** Query options accepted by read operations. Drivers accept `filter` or `where`. */
export interface HookQuery {
  filter?: Doc;
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
