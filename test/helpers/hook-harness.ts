// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type {
  HookApi,
  HookDeleteOptions,
  HookQuery,
  HookUpdateDoc,
  HookUpdateOptions,
} from '../../src/objects/_hook-api';

/**
 * In-memory harness for running REAL hook handlers.
 *
 * L2 hook bodies are sandboxed code the kernel executes; the metadata-contract
 * tests can only prove a hook is *wired*. This harness proves it *behaves*: it
 * implements the `ctx.api` surface (`src/objects/_hook-api.ts`) over plain
 * arrays, so a test can call `hook.handler(ctx)` with real inputs and assert
 * real outputs — no kernel, no server, no timing, nothing flaky.
 *
 * It supports the query operators the hooks actually use (`$in`, `$nin`, `$ne`
 * and the range comparisons). The earlier ad-hoc `makeApi` in
 * hooks-runtime.test.ts compared with `===` only, which silently matched
 * NOTHING for the `stage: { $nin: [...] }` filters in account/contact
 * protection — so those guards could not have been tested against it.
 */

export type Rec = Record<string, any>;

/**
 * A recorded write, for asserting that a hook did (or did not) touch the data.
 *
 * `args` is the ARGUMENT LIST as the engine would have received it, not a
 * friendly re-packaging of it: `update` records `[doc, options]`. A test that
 * only checks the resulting row cannot tell a correctly-shaped call from one
 * the real engine would have thrown on, which is exactly how the `(id, doc)`
 * spelling survived eight call sites (#616).
 */
export interface RecordedCall {
  op: 'insert' | 'update' | 'delete';
  object: string;
  args: unknown[];
}

/** Does `value` satisfy a single Mongo-style condition? */
function matchCondition(value: unknown, cond: unknown): boolean {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
    return Object.entries(cond as Rec).every(([op, operand]) => {
      switch (op) {
        case '$in': return Array.isArray(operand) && operand.includes(value as never);
        case '$nin': return Array.isArray(operand) && !operand.includes(value as never);
        case '$ne': return value !== operand;
        case '$gt': return (value as number) > (operand as number);
        case '$gte': return (value as number) >= (operand as number);
        case '$lt': return (value as number) < (operand as number);
        case '$lte': return (value as number) <= (operand as number);
        default:
          throw new Error(`hook-harness: unsupported query operator "${op}"`);
      }
    });
  }
  return value === cond;
}

/** Does `row` satisfy every key of `where`? */
export function matches(row: Rec, where: Rec = {}): boolean {
  return Object.entries(where).every(([field, cond]) => matchCondition(row[field], cond));
}

/** Project `fields` off a row, when the caller asked for a subset. */
function project(row: Rec, fields?: string[]): Rec {
  if (!fields || fields.length === 0) return row;
  const out: Rec = {};
  for (const f of fields) out[f] = row[f];
  // `id` is load-bearing for nearly every caller; never project it away.
  if ('id' in row) out.id = row.id;
  return out;
}

export interface Harness {
  api: HookApi;
  store: Record<string, Rec[]>;
  calls: RecordedCall[];
  /** Rows of one object (creating the collection if absent). */
  rows(object: string): Rec[];
  /** Writes recorded against one object, optionally filtered by op. */
  callsFor(object: string, op?: RecordedCall['op']): RecordedCall[];
}

/**
 * Build a `ctx.api` over `store`.
 *
 * `find`/`findOne` return the LIVE row objects (not clones) when no `fields`
 * projection is requested, so a handler that mutates what it read is visible to
 * the test — matching the driver's read-modify-write semantics closely enough
 * for these assertions.
 */
export function makeHarness(store: Record<string, Rec[]> = {}): Harness {
  const calls: RecordedCall[] = [];
  let seq = 0;
  const rows = (object: string): Rec[] => (store[object] ??= []);
  /**
   * Extract the predicate — from `where`, and ONLY from `where`.
   *
   * This used to read `q.filter ?? q.where ?? {}`, which made the harness
   * MORE permissive than the kernel and turned it into a liar: the real
   * `findOne` ignores an unknown `filter` key and returns the object's first
   * row, and the real `count` ignores it and counts everything, but every test
   * here went green because the harness quietly honoured both spellings. A
   * fake replacement that accepts inputs the real thing rejects cannot prove
   * anything — so `filter` is now a loud failure, not a silent alias.
   */
  const whereOf = (q: HookQuery = {}): Rec => {
    if ('filter' in (q as Rec)) {
      throw new Error(
        "hook-harness: query key \"filter\" is not a predicate — the kernel silently " +
          'ignores it on findOne/count and reads the wrong record. Use "where".',
      );
    }
    return (q.where ?? {}) as Rec;
  };

  const api: HookApi = {
    object(name: string) {
      return {
        async find(q: HookQuery = {}) {
          const hits = rows(name).filter((r) => matches(r, whereOf(q)));
          const limited = typeof q.top === 'number' ? hits.slice(0, q.top) : hits;
          return limited.map((r) => project(r, q.fields));
        },
        async findOne(q: HookQuery = {}) {
          const hit = rows(name).find((r) => matches(r, whereOf(q)));
          return hit ? project(hit, q.fields) : null;
        },
        async count(q: HookQuery = {}) {
          return rows(name).filter((r) => matches(r, whereOf(q))).length;
        },
        async insert(doc: Rec) {
          const rec = { id: doc.id ?? `${name}_${++seq}`, ...doc };
          calls.push({ op: 'insert', object: name, args: [doc] });
          rows(name).push(rec);
          return rec;
        },
        /**
         * `update(doc, options)` — the engine's shape, enforced at runtime and
         * not merely declared.
         *
         * TypeScript alone cannot hold this line: hooks reach `ctx.api` through
         * a `ctx.api as HookApi` cast on an `unknown`, and every test builds its
         * ctx with `as any`. So the checks below are the ones that actually
         * fire. They mirror what the kernel does with a mis-shaped call — throw
         * on an id where a document belongs (`update('opp_1', {...})` reaches
         * `rejectUnknownEngineOptions` as `update('opp_1' , {amount})` and dies
         * with "does not recognise option 'amount'") — so a hook that regresses
         * fails here rather than silently no-op'ing in production.
         */
        async update(doc: HookUpdateDoc, options: HookUpdateOptions) {
          if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
            throw new Error(
              `hook-harness: update(${JSON.stringify(doc)}, …) was called with an id where the ` +
                'repository facade takes a DOCUMENT. The kernel reads the target from `data.id` ' +
                "and rejects the second positional document as an unknown option (#616). " +
                'Use `update({ id, …fields }, { where: { id } })`.',
            );
          }
          if (typeof doc.id !== 'string' || !doc.id) {
            throw new Error(
              'hook-harness: update() document carries no `id` — the kernel would have nothing ' +
                'to resolve the row from. Use `update({ id, …fields }, { where: { id } })`.',
            );
          }
          if (!options || typeof options.where !== 'object' || options.where === null) {
            throw new Error(
              'hook-harness: update() was called without `{ where: { id } }`. The row scope a ' +
                'derived write runs under is not optional in this app (see `_hook-api.ts`).',
            );
          }
          const scoped = (options.where as Rec).id;
          if (scoped !== undefined && scoped !== doc.id) {
            throw new Error(
              `hook-harness: update() targets '${doc.id}' but scopes to '${String(scoped)}'. The ` +
                'kernel prefers `data.id` and would silently write the wrong row.',
            );
          }
          calls.push({ op: 'update', object: name, args: [doc, options] });
          const row = rows(name).find((r) => r.id === doc.id);
          if (row) Object.assign(row, doc);
          return row;
        },
        async delete(options: HookDeleteOptions) {
          if (!options || typeof options.where !== 'object' || options.where === null) {
            throw new Error(
              'hook-harness: delete() takes `{ where: … }` — the facade has no id-addressed ' +
                'overload (#616).',
            );
          }
          calls.push({ op: 'delete', object: name, args: [options] });
          const list = rows(name);
          const i = list.findIndex((r) => matches(r, options.where as Rec));
          if (i >= 0) list.splice(i, 1);
          return { deleted: i >= 0 ? 1 : 0 };
        },
      };
    },
  };

  return {
    api,
    store,
    calls,
    rows,
    callsFor: (object, op) =>
      calls.filter((c) => c.object === object && (op === undefined || c.op === op)),
  };
}

/**
 * An api whose every read throws — the anonymous / permission-denied shape.
 * Hooks that enhance a write (auto-assignment, activity bubbling) must swallow
 * this rather than reject the write.
 */
export function makeDeniedApi(message = "Access denied: not 'find'"): HookApi {
  const boom = () => { throw new Error(message); };
  return {
    object() {
      return {
        count: boom, find: boom, findOne: boom,
        insert: boom, update: boom, delete: boom,
      } as never;
    },
  };
}

/** Pick a named hook out of a `*.hook.ts` default export (one hook or many). */
export function hookNamed(mod: unknown, name: string): Rec {
  const list = (Array.isArray(mod) ? mod : [mod]) as Rec[];
  const hook = list.find((h) => h?.name === name);
  if (!hook) {
    throw new Error(
      `hook "${name}" not found (module exports: ${list.map((h) => h?.name).join(', ')})`,
    );
  }
  return hook;
}

export interface CtxOptions {
  event: string;
  input?: Rec;
  previous?: Rec;
  /**
   * The authenticated user. Several hooks treat a MISSING user as the
   * "system / seed / backfill write" signal and deliberately relax their
   * guards, so tests must be explicit about which they are simulating.
   */
  user?: { id: string; organizationId?: string } | undefined;
  /**
   * The session, for hooks that must scope a lookup by the caller's active
   * organization. A SYSTEM write (the seed loader, a backfill) has neither a
   * `user` nor a session organization, and hooks that reach across tenants
   * only misbehave in exactly that case — so a test that cannot express it
   * cannot catch the bug (`contact_integrity`, the org-blind dedupe).
   */
  session?: { userId?: string; organizationId?: string; isSystem?: boolean } | undefined;
  api?: HookApi;
}

/** Build a `HookContext`-shaped object for a handler call. */
export function makeCtx(opts: CtxOptions): Rec {
  return {
    event: opts.event,
    input: opts.input ?? {},
    previous: opts.previous,
    user: opts.user,
    session: opts.session,
    api: opts.api,
  };
}

/** Today as `YYYY-MM-DD`, matching what the hooks stamp. */
export const today = (): string => new Date().toISOString().slice(0, 10);

/** `YYYY-MM-DD` `days` from now (negative for the past). */
export const daysFromNow = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
