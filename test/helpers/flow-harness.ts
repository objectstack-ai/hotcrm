// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import { applySystemFields } from '@objectstack/objectql';
import * as PlatformObjects from '@objectstack/platform-objects';
import type * as Automation from '@objectstack/spec/automation';
import type { Hook } from '@objectstack/spec/data';
import stack from '../../objectstack.config';

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

/**
 * The DECLARED columns of every object this repo can name, derived from the
 * platform's own registry rather than from a hand-written list.
 *
 * ### Why the store has to know them (#1458)
 *
 * A real driver returns every declared column, system columns included, with
 * `null` where nothing set one. This store used to be schemaless — `insert`
 * did `{ id, ...data }` and the array held exactly what was written — so a
 * column nobody wrote was **absent**, and an absent key is not a null one to a
 * filter. That cost real work in both directions:
 *
 *  - a CORRECT change to `forecast_snapshot` (pinning its bucket queries to
 *    `{currentForecast.organization_id}`) went red across two files, describing
 *    a sweep abort no install can have; and, the expensive direction,
 *  - a flow whose filter is WRONG against real rows passes here, because the
 *    fixture happens not to carry the column the filter names.
 *
 * ### Measured, not assumed — the shape is derivable, so nothing is hand-listed
 *
 * `['id', ...Object.keys(applySystemFields(schema, opts).fields)]` reproduces a
 * materialising driver's row shape EXACTLY. Measured on ObjectStack 17.2.0 over
 * `SqliteWasmDriver` through `ObjectQL`, one row inserted per object from a
 * system context: for all twelve of the eighteen app objects whose validations
 * admit a minimal row, `declared === returned`, with no column missing and none
 * extra (`crm_lead` 43, `crm_case` 34, `crm_account` 32, `crm_task` 31,
 * `crm_contact` / `crm_opportunity` 30 …). That is what makes this a derivation
 * and not the hand-maintained column list #1314 warns about: adding a field to
 * an object under `src/objects/` moves this map with it, and nothing here has
 * to be remembered.
 *
 * ### Which driver shape is "faithful"
 *
 * Both shapes ship. `driver-memory` and `driver-mongodb` store only the columns
 * a row was written with and hand back the SPARSE shape — the same measurement
 * above returns 10 of `crm_account`'s 32 columns over `InMemoryDriver`, and
 * `test/sla-at-risk-live-work.test.ts` already runs its predicate over both on
 * purpose. This harness models the MATERIALISING shape, for two reasons:
 * it is what the shipped app runs on (`objectstack start` over SQLite), and it
 * is the shape under which a wrong filter fails loudly instead of passing by
 * accident, which is the whole point of a flow test.
 *
 * ### Tenancy posture
 *
 * The column SET is posture-independent, measured: `applySystemFields` returns
 * byte-identical field descriptors for `{ multiTenant: false }` and
 * `{ multiTenant: true }`, `organization_id` included — the tenant column is a
 * uniform platform capability, injected either way. What the posture decides is
 * whether the WRITE is allowed: under `OS_TENANCY_POSTURE=isolated` a system
 * write carrying no organization is refused outright
 * (`SystemWriteOrganizationRequiredError`), so the organization-less row this
 * harness serves cannot exist there at all. This harness therefore models the
 * `single` (default) posture — the one the community app ships in, and the one
 * `test/helpers/tenancy-probe.ts` measured `objectstack start` running under.
 * `multiTenant: false` below is the matching flag; it is inert for the column
 * set, and stated rather than defaulted so the choice is readable.
 */
const DECLARED_COLUMNS: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, readonly string[]>();
  const register = (schema: unknown): void => {
    const obj = schema as { name?: unknown; fields?: unknown } | null;
    if (!obj || typeof obj.name !== 'string') return;
    if (!obj.fields || typeof obj.fields !== 'object') return;
    // First registration wins: `@objectstack/platform-objects` exports two
    // shapes under the name `sys_metadata`, and app objects take precedence
    // over a platform object of the same name by construction (this repo has
    // no such collision today — `crm_` vs `sys_` — and if one appears, the
    // app's own declaration is the one its flows are written against).
    if (map.has(obj.name)) return;
    const shaped = applySystemFields(schema as never, { multiTenant: false }) as {
      fields?: Record<string, unknown>;
    };
    // `id` is deliberately excluded from the fill: `insert` always sets one,
    // and a real row's id is never null. A seeded row without an id is a
    // fixture bug, not a shape to invent a null for.
    map.set(obj.name, Object.keys(shaped.fields ?? {}).filter((c) => c !== 'id'));
  };
  for (const object of ((stack as { objects?: unknown[] }).objects ?? [])) register(object);
  for (const exported of Object.values(PlatformObjects as Record<string, unknown>)) register(exported);
  return map;
})();

/** Rows already brought to their declared shape — materialising is idempotent. */
const MATERIALISED = new WeakSet<Rec>();

/**
 * Fill a row's unset DECLARED columns with `null`, in place.
 *
 * An object with no declaration is passed through untouched: a flow test may
 * exercise a node against a synthetic object name (`crm_audit` in
 * `test/flow-decision-authority.test.ts`), and there is no declared shape to be
 * faithful to. Absence is the honest answer there, not an invented one.
 */
function fillDeclared(object: string, row: Rec): Rec {
  const columns = DECLARED_COLUMNS.get(object);
  if (!columns) return row;
  for (const column of columns) if (!(column in row)) row[column] = null;
  return row;
}

/**
 * Bring a STORED row to its declared shape, in place.
 *
 * In place because `store` is the INSPECTION surface and it is LIVE: `update`
 * mutates the stored row with `Object.assign`, and a fixture reads the result
 * back through `store[object]` — which, for a seeded row, is the very object it
 * seeded. Filling into a copy here would fork the store from the seed.
 *
 * ⚠️ This governs the STORE. It says nothing about what a caller of the data
 * engine gets back: `insert` / `find` / `findOne` hand out DETACHED rows, see
 * {@link detach}. #1490 was filed reading this paragraph as the reason those
 * three returned references — it is not. The two contracts are independent, and
 * measured across all 19 suites that back onto this harness, detaching the reads
 * costs the store contract nothing.
 */
function materialise(object: string, row: Rec): Rec {
  if (MATERIALISED.has(row)) return row;
  MATERIALISED.add(row);
  return fillDeclared(object, row);
}

/**
 * The row a caller of the DATA ENGINE gets back — a copy, detached from `store`.
 *
 * ### The defect this closes (#1490)
 *
 * `insert` / `find` / `findOne` used to hand out the stored row object itself,
 * and `update` mutates that same object with `Object.assign`. So a variable an
 * earlier node bound — a `get_record` output, a `create_record` output — was
 * RETRO-MUTATED by a later write in the same run, and any guard evaluated after
 * that write read POST-write state.
 *
 * Measured on `quote_generation`, whose `check_stage` edges are written as an
 * exact partition (`e4a` advance / `e4b` keep-stage, opposite polarity): the
 * advance branch writes `stage: 'proposal'` into the very object `vars.oppRecord`
 * points at, so the keep-stage guard then reads `proposal` and is satisfied too.
 * Both edges are taken and `notify_owner` runs TWICE — against a flow whose
 * author got the partition right. That is the cheap direction, because something
 * visible is wrong. The expensive direction is silent: any predicate reading a
 * field an earlier node in the same run wrote was being evaluated against state
 * no driver would ever show it.
 *
 * ### What a real driver does — measured, not assumed
 *
 * ObjectStack 17.2.0, one object, one write, over BOTH shipped driver shapes
 * (`InMemoryDriver` and `SqliteWasmDriver`), through `ObjectQL`: an earlier
 * `findOne` result still reads `qualification` after a write set `proposal`; the
 * `insert` result is detached the same way; two reads of one row are two
 * objects; and mutating any returned row never reaches the store. All four now
 * hold here too, and `test/flow-harness-declared-columns.test.ts` pins them.
 *
 * ### Shallow, deliberately
 *
 * The measured defect is ROW identity, and every write path here replaces
 * top-level keys (`update` is `Object.assign`), so a shallow copy is total
 * against it. A deep clone would additionally have to preserve `Date`, which is
 * a further step and should be a deliberate one — taken when something needs it,
 * not on speculation.
 */
const detach = (row: Rec): Rec => ({ ...row });

/**
 * The row a materialising driver returns for `row` — a COPY, with every unset
 * declared column filled with `null`.
 *
 * For the expectation side of a whole-row `toEqual`. A fixture that builds its
 * expected row by hand would otherwise have to hand-declare the columns the
 * flow never wrote, one at a time — the accreting workaround #1458 exists to
 * retire. Derived from the same registry the store is, so it cannot drift from
 * it, and it moves when an object under `src/objects/` gains a field.
 *
 * A copy rather than an in-place fill so a fixture template can be reused: the
 * seeded row and the expected row must be separate objects, or a whole-row
 * comparison compares the row the flow just mutated against itself.
 */
export function declaredRow(object: string, row: Rec = {}): Rec {
  return fillDeclared(object, { ...row });
}

function matchCondition(value: unknown, cond: unknown): boolean {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
    return Object.entries(cond as Rec).every(([op, operand]) => {
      switch (op) {
        case '$in': return Array.isArray(operand) && operand.includes(value as never);
        case '$nin': return Array.isArray(operand) && !operand.includes(value as never);
        case '$ne': return value !== operand;
        case '$gt': return range(value, operand, (c) => c > 0);
        case '$gte': return range(value, operand, (c) => c >= 0);
        case '$lt': return range(value, operand, (c) => c < 0);
        case '$lte': return range(value, operand, (c) => c <= 0);
        default:
          throw new Error(`flow-harness: unsupported query operator "${op}"`);
      }
    });
  }
  return value === cond;
}

/**
 * Apply one of the four ORDERING operators, with NULL's three-valued semantics
 * (#1480).
 *
 * ### What was wrong
 *
 * The four operators went straight to {@link compare}, whose fallback is
 * `String(a) < String(b)`. `String(null)` is `"null"`, so `compare(null, 0)`
 * compared `"null"` against `"0"` — and lexicographically `"n" > "0"`. The
 * answer was not merely wrong, it was ASYMMETRIC: the same null row was
 * ADMITTED by `$gt` / `$gte` and REJECTED by `$lt` / `$lte`, and `"null"` sorts
 * above any `2xxx` date string too, so a date window was wrong the same way.
 * Which half a given sweep got wrong depended only on the direction its window
 * happened to be written in. A symmetric bug gets noticed because everything
 * shifts; this one stayed invisible until someone wrote the filter that
 * happened to point the wrong way — and a sweep that wrongly includes undated
 * or unpriced records passes while computing plausible-looking numbers.
 *
 * `#1490` raised the REACH rather than moving the rule: materialising declared
 * columns means many more rows now carry an explicit `null` here to misjudge.
 *
 * ### Measured, not assumed — both shipped drivers, through real ObjectQL
 *
 * Three `crm_case` rows over ObjectStack 17.2.0 — `c_val`
 * (`resolution_time_hours: 5`, `closed_date: '2024-06-01'`), `c_absent` (key
 * omitted), `c_null` (key written as an explicit `null`) — under all four
 * operators, on `SqliteWasmDriver` AND `InMemoryDriver`. Both drivers returned
 * `[c_val]` for every predicate `c_val` satisfies and NOTHING for the rest:
 * neither the null row nor the absent-key row was selected by ANY of the four,
 * in EITHER direction. The two drivers agree, so this is settled rather than a
 * platform question, and `undefined` and `null` are not distinguishable here —
 * `SqliteWasmDriver` materialises the omitted key to `null` and
 * `InMemoryDriver` leaves it sparse, and the two shapes answer identically.
 *
 * Hence: an unorderable VALUE never satisfies any of the four. That is what
 * this repo's own flow authors already wrote down — `knowledge_article.view.ts`
 * states "`$lt` matches neither null nor an absent key", and
 * `opportunity-stagnation.flow.ts` relies on it to leave unstamped rows out of
 * a stagnation sweep. The harness was the one place that disagreed.
 *
 * ### The null OPERAND, where the two drivers DIVERGE
 *
 * Same probe, with `null` on the operand side (`{ rth: { $gte: null } }`):
 * `SqliteWasmDriver` returned `[]` for all four (SQL's three-valued logic);
 * `InMemoryDriver` returned `[]` for `$gt` / `$lt` but `[c_null]` for `$gte` /
 * `$lte` (Mongo/mingo orders BSON null as a VALUE). ⚠️ That divergence is a
 * platform question and is reported as one, not decided here. It does not
 * reach this file's choice, because the two cases it could bear on are already
 * settled by the rule above: they need a null on the VALUE side too, and a
 * null value satisfies none of the four on either driver.
 *
 * What the operand guard does settle is the case the drivers AGREE on and this
 * helper used to get wrong on its own: `compare(5, null)` was `"5" < "null"`,
 * so `{ rth: { $lt: null } }` selected `c_val` — a row BOTH drivers exclude.
 *
 * ⛔ Not fixed by teaching {@link compare} about `null`: the coercion is the
 * bug, not its spelling. An unorderable operand has no place in an ordering at
 * all, so it never reaches the comparison.
 */
function range(
  value: unknown,
  operand: unknown,
  satisfied: (ordering: number) => boolean,
): boolean {
  if (!orderable(value) || !orderable(operand)) return false;
  return satisfied(compare(value, operand));
}

/** Whether a value can take part in an ordering at all. NULL cannot. */
function orderable(v: unknown): boolean {
  return v !== null && v !== undefined;
}

/**
 * Order two values. Date-shaped strings are compared as instants so that
 * `'2026-01-02' > '2026-01-01T23:00:00Z'` behaves the way the driver does;
 * everything else falls back to native comparison.
 *
 * Only ever reached through {@link range}, so both sides are orderable and the
 * `String()` fallback can never see a `null` or an `undefined`.
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

/**
 * The in-memory data service a flow runs against.
 *
 * Two surfaces, with OPPOSITE contracts, on purpose:
 *
 *  - the METHODS are the DRIVER surface. Every row they hand back is DETACHED
 *    ({@link detach}), the way a real driver's is, so a variable an earlier node
 *    bound cannot be retro-mutated by a later write in the same run (#1490).
 *  - `store` is the INSPECTION surface, and it is LIVE. `update` mutates the
 *    stored row in place, so a fixture reads the result back through
 *    `store[object]` — or through the object it seeded, which is that same one.
 *
 * ⛔ Do not assert IDENTITY across the two (`await findOne(…)` `toBe`
 * `store[o][0]`). A real driver offers no such identity, and the point of the
 * split is that this harness no longer does either. Assert on CONTENT.
 */
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
  // Seeded rows are brought to their declared shape up front, so `store` reads
  // faithfully even in a case that asserts on it before running a flow.
  for (const [object, list] of Object.entries(store)) for (const row of list) materialise(object, row);
  let seq = 0;
  /**
   * The single accessor for a table — and therefore the single place the
   * declared shape has to be applied.
   *
   * Materialising HERE rather than only at construction is what covers rows a
   * fixture pushes straight into `store` after the harness is built: the
   * seed-replay cases in `test/flow-scheduled.test.ts` do exactly that to
   * model a warm boot, and before #1458 they had to hand-declare
   * `owner_id: null` on every pushed row to be visible to the sweep that
   * filters on it. Every read and every write goes through here, so a row is
   * in its declared shape before anything can observe it.
   */
  const rows = (o: string) => {
    const list = (store[o] ??= []);
    for (const row of list) materialise(o, row);
    return list;
  };
  const whereOf = (opts: Rec = {}) => opts.where ?? opts.filter ?? {};

  return {
    store,
    async insert(object, data) {
      const rec = materialise(object, { id: data.id ?? `${object}_${++seq}`, ...data });
      rows(object).push(rec);
      return detach(rec);
    },
    async find(object, opts = {}) {
      const hits = rows(object).filter((r) => matches(r, whereOf(opts)));
      const limit = opts.limit ?? opts.top;
      return (typeof limit === 'number' ? hits.slice(0, limit) : hits).map(detach);
    },
    async findOne(object, opts = {}) {
      const hit = rows(object).find((r) => matches(r, whereOf(opts)));
      return hit ? detach(hit) : null;
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

/**
 * One durable outbound-HTTP delivery an `http` node enqueued (#600).
 *
 * The builtin `http` node takes the durable path ONLY when the messaging
 * service answers `isHttpDeliveryReady()` truthily; otherwise it logs a warning
 * and silently degrades to a real inline `fetch`. A harness whose messaging stub
 * carries `emit` alone therefore lets a `durable: true` node "pass" while firing
 * a live network request off the test runner — which is both a flake and the
 * exact blind spot a hand-off test exists to close. Capturing these is what
 * makes "the deal was enqueued for delivery, once" an assertable fact.
 *
 * Mirrors the `enqueueHttp` input `@objectstack/service-messaging` accepts.
 */
export interface EnqueuedHttpDelivery {
  source?: string;
  refId?: string;
  dedupKey?: string;
  label?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  signingSecret?: string;
  timeoutMs?: number;
  payload?: unknown;
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
  /**
   * Every durable delivery an `http` node enqueued during the run — the outbox
   * rows the platform's dispatcher would drain with retry / dead-letter.
   */
  deliveries: EnqueuedHttpDelivery[];
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
 * `{record.owner_id.manager}` and silently interpolates to "undefined").
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
  const deliveries: EnqueuedHttpDelivery[] = [];

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
    /**
     * Stand in for a wired `sys_http_delivery` outbox. Answering `true` is what
     * keeps a `durable: true` node ON the durable path — see
     * {@link EnqueuedHttpDelivery} for what a `false` here would silently do.
     */
    isHttpDeliveryReady() {
      return true;
    },
    async enqueueHttp(input: EnqueuedHttpDelivery) {
      deliveries.push(input);
      return `delivery_${deliveries.length}`;
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
    deliveries,
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
