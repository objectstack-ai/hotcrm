// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { QuickJSScriptRunner, actionBodyRunnerFactory, hookBodyRunnerFactory } from '@objectstack/runtime';
import { extractHookBody } from '@objectstack/cli/dist/utils/extract-hook-body.js';

/**
 * REAL QuickJS harness for action and hook bodies (issue #575 A1).
 *
 * `test/helpers/hook-harness.ts` runs hook handlers as plain JS functions, and
 * `global-actions.test.ts` used to run action bodies through `new Function`.
 * Both prove what a body COMPUTES; neither can see the constraints that only
 * exist because the runtime evaluates these bodies inside QuickJS:
 *
 *   - a body is shipped **body-only** — it runs with no module scope, so a
 *     reference to an import, a top-level const, or (see
 *     `src/objects/_line-item-price-fill.ts`) a shared factory's parameter is
 *     not a closure at runtime, it is a `ReferenceError`;
 *   - `ctx.api` is not the object the handler was written against — it is the
 *     engine repo facade the runtime builds, whose `update`/`delete` take
 *     `(data, options)` / `(options)`, not an id;
 *   - a capability the body does not declare is denied at call time;
 *   - everything crossing the VM boundary is JSON — functions, `undefined`
 *     and `Date` instances do not survive.
 *
 * So this harness runs nothing of its own: it hands the body to the SAME
 * `QuickJSScriptRunner` + `actionBodyRunnerFactory` / `hookBodyRunnerFactory`
 * the runtime wires at boot, shaped by the same `extractHookBody` pass the CLI
 * build uses to lower a `handler` function into `body.source`. The only stand-in
 * is the engine underneath — {@link makeSandboxEngine}, an ObjectQL-shaped
 * recorder whose contract is pinned against the real kernel in
 * `test/action-sandbox.test.ts`.
 *
 * `extractHookBody` is reached by a deep import because the CLI publishes no
 * export map for it. Both packages are pinned to an exact version in
 * `package.json`, and if a platform upgrade moves the file the import fails at
 * load — loudly, on every test in this harness — rather than degrading to a
 * lookalike check.
 */

export type Rec = Record<string, any>;

/** One engine operation a body performed, in order. */
export interface EngineCall {
  op: 'find' | 'count' | 'insert' | 'update' | 'delete' | 'upsert';
  object: string;
  args: unknown[];
}

export interface SandboxEngine {
  /** The ObjectQL-shaped stub handed to the body-runner factory as `ql`. */
  engine: Rec;
  store: Record<string, Rec[]>;
  calls: EngineCall[];
  /** Rows of one object (creating the collection if absent). */
  rows(object: string): Rec[];
  /** Calls recorded against one object, optionally filtered by op. */
  callsFor(object: string, op?: EngineCall['op']): EngineCall[];
  /** Documents inserted into one object, in order. */
  inserted(object: string): Rec[];
}

/** Does `row` satisfy every key of `where`? Equality only — see `find` below. */
function matches(row: Rec, where: Rec = {}): boolean {
  return Object.entries(where).every(([field, cond]) => row[field] === cond);
}

/** Project `fields` off a row when the caller asked for a subset. */
function project(row: Rec, fields?: string[]): Rec {
  if (!Array.isArray(fields) || fields.length === 0) return { ...row };
  const out: Rec = {};
  for (const f of fields) out[f] = row[f];
  if ('id' in row) out.id = row.id;
  return out;
}

/**
 * An in-memory engine with ObjectQL's method shape — `(objectName, …)` on every
 * operation, exactly what `@objectstack/runtime`'s `buildEngineRepoFacade`
 * expects to wrap.
 *
 * Deliberately NOT a `ctx.api`-shaped object: `buildSandboxApi` hands `ctx.api`
 * straight through when the engine exposes `.object(...)`, and the whole point
 * here is that the runtime builds the repo surface itself. A body therefore
 * meets the real `update(data, options)` / `delete(options)` signatures, not a
 * friendlier invention of this file.
 *
 * Two behaviours are copied from the kernel rather than guessed, and
 * `test/action-sandbox.test.ts` re-verifies both against a real ObjectQL on the
 * in-memory driver so they cannot rot:
 *
 *   1. `update` resolves the target id from `data.id`, falling back to
 *      `options.where.id`, and rejects with `Update requires an ID or
 *      options.multi=true` when neither is present.
 *   2. The read predicate is `where` and only `where`. An unknown key (the
 *      `filter` misspelling `_hook-api.ts` documents) is not an error and not a
 *      synonym — it is ignored, which is how a `findOne` silently degrades to
 *      "the object's first row".
 */
export function makeSandboxEngine(seed: Record<string, Rec[]> = {}): SandboxEngine {
  const store: Record<string, Rec[]> = seed;
  const calls: EngineCall[] = [];
  let seq = 0;
  const rows = (object: string): Rec[] => (store[object] ??= []);
  const record = (op: EngineCall['op'], object: string, args: unknown[]) => {
    calls.push({ op, object, args });
  };
  const resolveId = (data: unknown, options: Rec | undefined): string | undefined => {
    const fromData = (data as Rec | undefined)?.id;
    if (typeof fromData === 'string') return fromData;
    const fromWhere = options?.where?.id;
    return typeof fromWhere === 'string' ? fromWhere : undefined;
  };

  const engine: Rec = {
    async find(object: string, options: Rec = {}) {
      record('find', object, [options]);
      const hits = rows(object).filter((r) => matches(r, options.where ?? {}));
      const limited = typeof options.top === 'number' ? hits.slice(0, options.top) : hits;
      return limited.map((r) => project(r, options.fields));
    },
    async count(object: string, options: Rec = {}) {
      record('count', object, [options]);
      return rows(object).filter((r) => matches(r, options.where ?? {})).length;
    },
    async insert(object: string, data: Rec) {
      record('insert', object, [data]);
      const row = { id: data?.id ?? `${object}_${++seq}`, ...data };
      rows(object).push(row);
      return row;
    },
    async update(object: string, data: Rec, options: Rec = {}) {
      record('update', object, [data, options]);
      const id = resolveId(data, options);
      if (!id && options.multi !== true) {
        throw new Error('Update requires an ID or options.multi=true');
      }
      const row = rows(object).find((r) => r.id === id);
      if (row) Object.assign(row, data, { id: row.id });
      return row ?? null;
    },
    async upsert(object: string, data: Rec, options: Rec = {}) {
      record('upsert', object, [data, options]);
      const id = resolveId(data, options);
      const row = id ? rows(object).find((r) => r.id === id) : undefined;
      if (row) {
        Object.assign(row, data, { id: row.id });
        return row;
      }
      const created = { id: id ?? `${object}_${++seq}`, ...data };
      rows(object).push(created);
      return created;
    },
    async delete(object: string, options: Rec = {}) {
      record('delete', object, [options]);
      const id = resolveId(undefined, options);
      if (!id && options.multi !== true) {
        throw new Error('Delete requires an ID or options.multi=true');
      }
      const list = rows(object);
      const i = list.findIndex((r) => r.id === id);
      if (i >= 0) list.splice(i, 1);
      return { deleted: i >= 0 ? 1 : 0 };
    },
  };

  return {
    engine,
    store,
    calls,
    rows,
    callsFor: (object, op) =>
      calls.filter((c) => c.object === object && (op === undefined || c.op === op)),
    inserted: (object) =>
      calls.filter((c) => c.object === object && c.op === 'insert').map((c) => c.args[0] as Rec),
  };
}

/**
 * One runner for the whole suite. `QuickJSScriptRunner.execute` builds a fresh
 * WASM module and context per invocation, so runs cannot leak state into each
 * other; sharing the instance only avoids re-reading its options.
 */
const runner = new QuickJSScriptRunner();

/** How the dispatcher invoked the action. */
export interface ActionRunOpts {
  /** Modal / toolbar params the user submitted. */
  input?: Rec;
  /** The record the dispatcher pre-loaded for a record-scoped action. */
  record?: Rec;
  /** The object the action was dispatched against. */
  objectName?: string;
  /** Explicit record id; defaults to `record.id`. */
  recordId?: string;
  /** The acting user, as the dispatcher resolves it from the session. */
  user?: Rec;
  /** Reuse an engine across runs (to assert on accumulated state). */
  engine?: SandboxEngine;
}

export interface ActionRunResult {
  /** The body's return value, after its round trip through JSON. */
  result: any;
  engine: SandboxEngine;
}

const DEFAULT_USER = { id: 'usr_1', name: 'Ada Lovelace', email: 'ada@hotcrm.local' };

/**
 * Execute an action's metadata body under the real sandbox.
 *
 * The `actionCtx` built here is the one BOTH dispatch paths in
 * `@objectstack/runtime` build — REST (`handleActions`) and MCP
 * (`invokeBusinessAction`) — which is worth being literal about, because two of
 * its properties are load-bearing and neither is obvious:
 *
 *   - `params` carries `recordId` and `objectName` merged on top of the
 *     submitted params, which is how a body reaches them as `input.*`;
 *   - there is NO `object` key on the context, so `ctx.object` is `undefined`
 *     in the sandbox even though `ScriptContext` declares it. A body that reads
 *     only `ctx.object` to identify its object gets nothing at runtime.
 */
export async function runActionBody(action: Rec, opts: ActionRunOpts = {}): Promise<ActionRunResult> {
  const engine = opts.engine ?? makeSandboxEngine();
  const bind = actionBodyRunnerFactory(runner, { ql: engine.engine, appId: 'hotcrm' });
  const handler = bind(action as never);
  if (!handler) {
    throw new Error(`action ${action.name}: no runnable body (body missing or rejected by HookBodySchema)`);
  }

  const recordId = opts.recordId ?? (typeof opts.record?.id === 'string' ? opts.record.id : undefined);
  // The dispatcher stamps the id onto the record it hands the body even when the
  // record itself could not be loaded.
  const record: Rec = { ...(opts.record ?? {}) };
  if (record.id == null && recordId) record.id = recordId;

  const result = await handler({
    record,
    user: opts.user ?? DEFAULT_USER,
    session: { user: opts.user ?? DEFAULT_USER },
    params: { ...(opts.input ?? {}), recordId, objectName: opts.objectName },
  });
  return { result, engine };
}

/**
 * Lower a `handler` function to the metadata body the CLI build would ship.
 *
 * This is `@objectstack/cli`'s own `extractHookBody` — the pass that peels the
 * function down to its statements, rejects the forbidden tokens (`import`,
 * `require`, `fetch`, `process`, `globalThis`, `eval`, `new Function`), infers
 * the capabilities from the `ctx.api` / `ctx.log` / `ctx.crypto` calls it can
 * see, and THROWS when the handler references an identifier that will not exist
 * at runtime. The build catches that throw and falls back to bundling the
 * closure, so nothing goes red there — which is precisely why a test has to
 * call it directly to find out whether a hook is still shippable body-only.
 */
export function extractSandboxBody(handler: unknown, label: string): {
  source: string;
  capabilities: string[];
} {
  const { source, capabilities } = extractHookBody(handler as never, label);
  return { source, capabilities };
}

export interface HookRunOpts {
  event: string;
  /** The write in flight. Mutations the body makes are written back onto it. */
  input?: Rec;
  previous?: Rec;
  user?: Rec;
  engine?: SandboxEngine;
  /** Override the extracted body (to run a deliberately broken source). */
  source?: string;
  capabilities?: string[];
}

export interface HookRunResult {
  /** `ctx.input` after the runtime wrote the sandbox's mutations back. */
  input: Rec;
  engine: SandboxEngine;
}

/**
 * Execute a hook's SHIPPED body — the lowered `body.source`, not the handler
 * function — under the real sandbox.
 *
 * Running `hook.handler(ctx)` directly (what every other runtime test here
 * does) keeps the closure alive, so it proves the logic and is blind to the
 * body-only constraint. This runs what the artifact actually carries.
 */
export async function runHookBody(hook: Rec, opts: HookRunOpts): Promise<HookRunResult> {
  const engine = opts.engine ?? makeSandboxEngine();
  const extracted = opts.source !== undefined
    ? { source: opts.source, capabilities: opts.capabilities ?? [] }
    : extractSandboxBody(hook.handler, `hook '${hook.name}'`);

  const bind = hookBodyRunnerFactory(runner, { ql: engine.engine, appId: 'hotcrm' });
  const handler = bind({
    name: hook.name,
    object: hook.object,
    events: hook.events,
    body: {
      language: 'js',
      source: extracted.source,
      capabilities: opts.capabilities ?? extracted.capabilities,
      timeoutMs: 5000,
    },
  } as never);
  if (!handler) throw new Error(`hook ${hook.name}: body rejected by HookBodySchema`);

  const input: Rec = opts.input ?? {};
  await handler({
    event: opts.event,
    input,
    previous: opts.previous,
    user: opts.user,
    object: hook.object,
  });
  return { input, engine };
}
