// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import type * as Automation from '@objectstack/spec/automation';
import type { Hook } from '@objectstack/spec/data';

type Flow = Automation.Flow;

/**
 * In-memory harness for running REAL flows through the REAL automation engine.
 *
 * `flow-conversion`, `flow-quote` and `flow-followup` each carried their own
 * copy of this data engine, and every copy matched with `===` only. That is
 * fine for the record-triggered flows they cover, but it makes the SCHEDULED
 * sweeps untestable: every one of them selects with `$lt` / `$nin` / `$lte`
 * over a date or status, so an equality-only engine returns an empty set and
 * the flow "passes" by doing nothing at all. This engine implements the
 * operators, so an empty result set means the flow really selected nothing.
 */

export type Rec = Record<string, any>;

function matchCondition(value: unknown, cond: unknown): boolean {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
    return Object.entries(cond as Rec).every(([op, operand]) => {
      switch (op) {
        case '$in': return Array.isArray(operand) && operand.includes(value as never);
        case '$nin': return Array.isArray(operand) && !operand.includes(value as never);
        case '$ne': return value !== operand;
        case '$gt': return compare(value, operand) > 0;
        case '$gte': return compare(value, operand) >= 0;
        case '$lt': return compare(value, operand) < 0;
        case '$lte': return compare(value, operand) <= 0;
        default:
          throw new Error(`flow-harness: unsupported query operator "${op}"`);
      }
    });
  }
  return value === cond;
}

/**
 * Order two values. Date-shaped strings are compared as instants so that
 * `'2026-01-02' > '2026-01-01T23:00:00Z'` behaves the way the driver does;
 * everything else falls back to native comparison.
 */
function compare(a: unknown, b: unknown): number {
  const da = toTime(a);
  const db = toTime(b);
  if (da !== undefined && db !== undefined) return da - db;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

const DATE_ISH = /^\d{4}-\d{2}-\d{2}([T ]|$)/;
function toTime(v: unknown): number | undefined {
  if (typeof v !== 'string' || !DATE_ISH.test(v)) return undefined;
  const t = Date.parse(v.length === 10 ? `${v}T00:00:00.000Z` : v);
  return Number.isNaN(t) ? undefined : t;
}

export function matches(row: Rec, where: Rec = {}): boolean {
  return Object.entries(where).every(([field, cond]) => matchCondition(row[field], cond));
}

export interface DataEngine {
  store: Record<string, Rec[]>;
  insert(object: string, data: Rec): Promise<Rec>;
  find(object: string, opts?: Rec): Promise<Rec[]>;
  findOne(object: string, opts?: Rec): Promise<Rec | null>;
  update(object: string, data: Rec, opts?: Rec): Promise<{ modified: number }>;
  delete(object: string, opts?: Rec): Promise<{ deleted: number }>;
  count(object: string, opts?: Rec): Promise<number>;
}

export function makeDataEngine(seed: Record<string, Rec[]> = {}): DataEngine {
  const store: Record<string, Rec[]> = seed;
  let seq = 0;
  const rows = (o: string) => (store[o] ??= []);
  const whereOf = (opts: Rec = {}) => opts.where ?? opts.filter ?? {};

  return {
    store,
    async insert(object, data) {
      const rec = { id: data.id ?? `${object}_${++seq}`, ...data };
      rows(object).push(rec);
      return rec;
    },
    async find(object, opts = {}) {
      const hits = rows(object).filter((r) => matches(r, whereOf(opts)));
      const limit = opts.limit ?? opts.top;
      return typeof limit === 'number' ? hits.slice(0, limit) : hits;
    },
    async findOne(object, opts = {}) {
      return rows(object).find((r) => matches(r, whereOf(opts))) ?? null;
    },
    async update(object, data, opts = {}) {
      const affected = rows(object).filter((r) => matches(r, whereOf(opts)));
      for (const r of affected) Object.assign(r, data);
      return { modified: affected.length };
    },
    async delete(object, opts = {}) {
      const list = rows(object);
      const doomed = list.filter((r) => matches(r, whereOf(opts)));
      for (const r of doomed) list.splice(list.indexOf(r), 1);
      return { deleted: doomed.length };
    },
    async count(object, opts = {}) {
      return rows(object).filter((r) => matches(r, whereOf(opts))).length;
    },
  };
}

/**
 * Wrap a data engine so registered `beforeInsert` / `beforeUpdate` hooks run
 * against the mutating payload, exactly as the real runtime does before a
 * write reaches the driver.
 *
 * `previous` for an update is the first matching row — the flows here update
 * by `id`, and `update_record` cannot fan out anyway (no `options.multi`).
 */
function withHooks(engine: DataEngine, hooks: Hook[]): DataEngine {
  const run = async (
    object: string,
    event: 'beforeInsert' | 'beforeUpdate',
    input: Rec,
    previous?: Rec,
  ) => {
    for (const hook of hooks) {
      if (hook.object !== object) continue;
      if (!(hook.events ?? []).includes(event as never)) continue;
      await (hook.handler as (ctx: Rec) => unknown)({
        event, object, input, previous, user: undefined, logger: silentLogger,
      });
    }
  };

  return {
    ...engine,
    store: engine.store,
    async insert(object, data) {
      const input = { ...data };
      await run(object, 'beforeInsert', input);
      return engine.insert(object, input);
    },
    async update(object, data, opts = {}) {
      const input = { ...data };
      const previous = await engine.findOne(object, opts);
      await run(object, 'beforeUpdate', input, previous ?? undefined);
      return engine.update(object, input, opts);
    },
  };
}

/**
 * A notification captured from a `notify` node.
 *
 * The builtin notify node calls `messaging.emit({ topic, audience, payload,
 * severity, source, actorId, channels })` and — critically — treats a MISSING
 * messaging service as `{ success: true, skipped: true }`. So a harness without
 * one lets the flow "succeed" while delivering nothing, which is precisely the
 * blind spot these tests exist to close.
 */
export interface SentNotification {
  /** Resolved recipient list (the node's `to` / `recipients`, interpolated). */
  to: string[];
  title?: unknown;
  body?: unknown;
  url?: unknown;
  severity?: unknown;
  topic?: unknown;
  channels?: unknown;
  [key: string]: unknown;
}

interface MessagingEmit {
  topic?: string;
  audience?: string[];
  payload?: Record<string, unknown>;
  severity?: string;
  channels?: string[];
  [key: string]: unknown;
}

export const silentLogger: any = {
  info() {}, warn() {}, error() {}, debug() {}, trace() {},
  child() { return silentLogger; },
};

/** A read a flow issued, captured so tests can assert on selection. */
export interface RecordedQuery {
  op: 'find' | 'findOne' | 'count';
  object: string;
  where: Rec;
}

export interface FlowHarness {
  engine: AutomationEngine;
  data: DataEngine;
  store: Record<string, Rec[]>;
  /** Everything a `notify` node emitted during the run. */
  notifications: SentNotification[];
  /**
   * Every read the flow issued. For a sweep whose work happens inside a `loop`,
   * the per-iteration reads are the only externally visible proof of WHICH
   * records the top-level query actually selected.
   */
  queries: RecordedQuery[];
  /** Start a flow and return its runId. */
  run(flowName: string, params?: Rec, opts?: Rec): Promise<string | undefined>;
  /**
   * Fire a record-change flow.
   *
   * `record` / `previous` are TOP-LEVEL keys on the execute context, not
   * members of `params` — the engine binds them (and spreads `record`'s own
   * fields) into the variable map before evaluating the start condition. Pass
   * them through `params` and the condition sees no `record` at all and the
   * flow silently reports `skipped: condition_not_met`.
   */
  trigger(flowName: string, record: Rec, previous?: Rec): Promise<string | undefined>;
  /** Resume a paused (screen) run with the given variables. */
  resume(runId: string, variables: Rec): Promise<unknown>;
}

/**
 * Register `flows` on a fresh engine bound to an in-memory data service.
 *
 * `notify` nodes are captured rather than delivered: the messaging service is
 * out of scope here, and asserting on the captured payload is what proves the
 * recipient/severity/template contract (the class of bug where a notify targets
 * `{record.owner.manager}` and silently interpolates to "undefined").
 */
export interface FlowHarnessOptions {
  /**
   * Object hooks to run around the data engine's writes.
   *
   * Off by default, because most flow tests want to assert exactly what the
   * FLOW wrote. But a flow that relies on a `beforeInsert` hook to complete
   * the record it creates — `forecast_snapshot` hands `crm_forecast` a bare
   * `period` and lets `forecast_derive_period` compute the calendar window —
   * is only half-tested without them: the flow would look fine while writing a
   * row no consumer can find.
   *
   * `beforeInsert` / `beforeUpdate` only; the flows under test have no
   * after-hook dependencies.
   */
  hooks?: Hook[];
}

export function makeFlowHarness(
  flows: Record<string, Flow>,
  seed: Record<string, Rec[]> = {},
  options: FlowHarnessOptions = {},
): FlowHarness {
  const base = makeDataEngine(seed);
  const hooks = options.hooks ?? [];
  const raw: DataEngine = hooks.length === 0 ? base : withHooks(base, hooks);
  const notifications: SentNotification[] = [];
  const queries: RecordedQuery[] = [];

  const record = <T>(op: RecordedQuery['op'], object: string, opts: Rec, result: T): T => {
    queries.push({ op, object, where: opts.where ?? opts.filter ?? {} });
    return result;
  };

  const data: DataEngine = {
    ...raw,
    store: raw.store,
    find: async (o, opts = {}) => record('find', o, opts, await raw.find(o, opts)),
    findOne: async (o, opts = {}) => record('findOne', o, opts, await raw.findOne(o, opts)),
    count: async (o, opts = {}) => record('count', o, opts, await raw.count(o, opts)),
  };

  const messaging = {
    async emit(msg: MessagingEmit) {
      const { title, body, url, ...rest } = msg.payload ?? {};
      notifications.push({
        to: msg.audience ?? [],
        title, body, url,
        severity: msg.severity,
        topic: msg.topic,
        channels: msg.channels,
        ...rest,
      });
      return {
        notificationId: `notif_${notifications.length}`,
        delivered: (msg.audience ?? []).length,
        failed: 0,
      };
    },
  };

  const ctx: any = {
    logger: silentLogger,
    getService: (name: string) => {
      if (name === 'data' || name === 'objectql') return data;
      if (name === 'messaging' || name === 'notification' || name === 'email') return messaging;
      return undefined;
    },
  };

  const engine = new AutomationEngine(silentLogger);
  installBuiltinNodes(engine, ctx);
  for (const [name, flow] of Object.entries(flows)) engine.registerFlow(name, flow);

  return {
    engine,
    data,
    store: data.store,
    notifications,
    queries,
    async run(flowName, params = {}, opts = {}) {
      const started: any = await engine.execute(flowName, {
        params, userId: 'user_1', event: 'manual', ...opts,
      } as any);
      return started?.runId ?? started?.run?.id;
    },
    async trigger(flowName, record, previous) {
      const started: any = await engine.execute(flowName, {
        params: {}, userId: 'user_1', event: 'record_change', record, previous,
      } as any);
      return started?.runId ?? started?.run?.id;
    },
    async resume(runId, variables) {
      return engine.resume(runId, { variables } as any);
    },
  };
}
