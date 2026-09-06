// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { REFERENCE_VALUE_TYPES, isMultiValueField, AUDIT_PROVENANCE_FIELDS } from '@objectstack/spec/data';
import { wrapDeclarativeHook } from '@objectstack/objectql';
import * as appObjects from '../../src/objects/index';
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

// ──────────────────────────────────── reference columns hold RECORD IDS ────

/**
 * ADR-0104 value shapes, mirrored from the engine's MEASURED behaviour.
 *
 * Both harnesses used to store a write verbatim, so a hook could put `false`,
 * `42` or `{}` into a lookup column and every test stayed green — which is
 * exactly how #714 shipped a boolean into `crm_contract.crm_contact` and was
 * only caught in a release-candidate acceptance run.
 *
 * ### What the engine actually does (measured on the pinned 17.3.0, not guessed)
 *
 * First taken on 17.1.0; RE-TAKEN 2026-09-03 on 17.2.0 (#1460, after the
 * #1442 bump) and RE-TAKEN AGAIN on 17.3.0 — the version `package.json` now
 * pins and `node_modules` installs (#1676, after the #1577 bump) — and every
 * row below still holds, in BOTH postures.
 * `test/harness-lookup-shape.test.ts` is that re-measurement: it drives each
 * probe value against a real `ObjectQL` and requires the harness verdict to
 * match the engine's, field by field.
 *
 * A real `ObjectQL` on `InMemoryDriver` was driven with each value below, on a
 * declared `Field.lookup` and on the app's real `crm_contract`, under both
 * ADR-0104 postures:
 *
 * | value in a single-valued reference column | warn-first (default) | strict |
 * | --- | --- | --- |
 * | `'acc_1'` · `''` · `null` · `undefined` | accepted | **accepted** |
 * | `false` · `true` · `0` · `42` · `{}` · `[]` · `NaN` · `Date` | accepted + `[value-shape]` warning, **value PERSISTED** | **refused** |
 *
 * Strict is `OS_DATA_VALUE_SHAPE_STRICT_ENABLED=1`, or any deployment that has
 * run `os migrate value-shapes --apply`. The refusal reads
 * `<Label> has an invalid <type> value: Invalid input: expected string,
 * received <received>`.
 *
 * Neither posture makes a junk value *correct*: strict rejects the write
 * outright, and warn-first keeps it — writing a boolean into a reference
 * column and, via the admitted-violation tally, revoking the deployment's
 * ADR-0104 certificate. So the harness refuses it in both cases, and the
 * refusal is what a test sees.
 *
 * ### The line this must NOT cross
 *
 * The boundary is copied from the engine, never tightened past it. Four
 * measurements a guessed "a lookup must be a non-empty record id" would get
 * wrong, turning working code red:
 *
 *  - `null` and `undefined` are **accepted** — clearing a link is legal;
 *  - `''` is **accepted** — the engine's empty-value skip runs before the
 *    shape check, so an empty string is not a shape violation (that it is
 *    nonetheless a poor value is a different assertion, and belongs to the
 *    test that cares — see `test/quote-accepted-lookups.test.ts`);
 *  - a `multiple: true` lookup takes an **array**, and its elements are
 *    **not** checked — `[false]` is accepted by the real engine, so it is
 *    accepted here too;
 *  - a `system` or `readonly` column is **never validated at all**, which on
 *    this app means every `owner_id` — see {@link ENGINE_SKIPPED_FIELDS}.
 *
 * The first draft of this file got the last one wrong, and the differential in
 * `test/harness-lookup-shape.test.ts` is what caught it: 33 field × value
 * combinations where the harness refused a write the real engine accepts.
 * That test compares the two verdicts directly, so the boundary cannot drift
 * from the engine without going red.
 *
 * The field set is not a hand-maintained list — the issue's own objection to
 * one was that it rots. It is derived from the app's real `src/objects`
 * metadata, classified by the platform's own `REFERENCE_VALUE_TYPES` and
 * `isMultiValueField` from `@objectstack/spec/data`. A new lookup column, or a
 * new reference-valued field type on the platform, is covered the day it
 * lands, with nothing to update here.
 *
 * ### What this does NOT close
 *
 * Value shape is one dimension of fidelity. DISPATCH shape is another, and it
 * is still wrong here: {@link makeCtx} builds a fresh `input` per handler call,
 * so a test drives N per-row calls with N independent payload objects. A real
 * predicate update builds exactly ONE payload shared by every per-row dispatch
 * (ADR-0058 Addendum II D3) — which is why a rewrite conditioned on `previous`
 * widens to the whole batch, and why tests written against this harness pass
 * before and after any fix to that class.
 *
 * Deliberately not fixed here (#1265). A body-only hook cannot yet detect the
 * per-row path at all — the sandbox context carries no dispatch signal — so a
 * harness that modelled batch dispatch today would turn hooks red with no
 * app-side fix available: the same "instrument that lies" failure, pointed the
 * other way. Blocked on objectstack#11552.
 */
type FieldDef = {
  type?: string;
  label?: string;
  multiple?: boolean;
  system?: boolean;
  readonly?: boolean;
};

/** `objectName` → its reference-valued fields, built once, lazily. */
let referenceFields: Map<string, Map<string, FieldDef>> | undefined;

function referenceFieldsOf(object: string): Map<string, FieldDef> | undefined {
  if (!referenceFields) {
    referenceFields = new Map();
    for (const candidate of Object.values(appObjects as Record<string, unknown>)) {
      const def = candidate as { name?: unknown; fields?: Record<string, FieldDef> };
      if (!def || typeof def.name !== 'string' || !def.fields) continue;
      const refs = new Map<string, FieldDef>();
      for (const [field, fieldDef] of Object.entries(def.fields)) {
        if (fieldDef && typeof fieldDef.type === 'string' && REFERENCE_VALUE_TYPES.has(fieldDef.type)) {
          refs.set(field, fieldDef);
        }
      }
      referenceFields.set(def.name, refs);
    }
  }
  return referenceFields.get(object);
}

/**
 * The columns the engine's `validateRecord` never even looks at — so neither
 * may this. Measured, and NOT a detail worth guessing: `owner_id` is declared
 * `system: true` on nearly every object here, the ownership hooks write it
 * constantly, and a harness that policed it would have turned a large part of
 * this suite red over values the real engine accepts without comment. That is
 * the exact failure mode a value-shape check is supposed to prevent, pointed
 * the other way.
 *
 * `id` plus the four audit columns is the engine's own `SKIP_FIELDS`;
 * `AUDIT_PROVENANCE_FIELDS` comes from the platform so the set cannot drift.
 */
const ENGINE_SKIPPED_FIELDS = new Set<string>(['id', ...AUDIT_PROVENANCE_FIELDS]);

function engineValidatesField(field: string, def: FieldDef): boolean {
  if (ENGINE_SKIPPED_FIELDS.has(field)) return false;
  return def.system !== true && def.readonly !== true;
}

/** Name the received value the way the engine's own diagnostic names it. */
function describeReceived(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'Date';
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  return typeof value;
}

/**
 * The engine's verdict on one reference-column value, or `null` when it would
 * be accepted. Exported so a test can pin this against a real ObjectQL.
 */
export function referenceValueShapeError(
  field: string,
  def: FieldDef,
  value: unknown,
): string | null {
  if (!engineValidatesField(field, def)) return null;
  // Empty values skip the shape check in the engine — measured, see above.
  if (value === null || value === undefined || value === '') return null;
  const label = def.label ?? field;
  if (isMultiValueField(def as never)) {
    // Elements are deliberately unchecked: the real engine does not check them.
    return Array.isArray(value) ? null : `${label} must be an array of values`;
  }
  if (typeof value === 'string') return null;
  return `${label} has an invalid ${def.type} value: Invalid input: expected string, received ${describeReceived(value)}`;
}

/**
 * Throw if `doc` puts a value in a reference column that the engine refuses.
 * Unknown objects (platform `sys_*`, a fixture's invented name) carry no
 * metadata here, so they are skipped — the harness cannot be stricter than
 * what it knows.
 */
export function assertReferenceValueShapes(harness: string, op: string, object: string, doc: Rec): void {
  const refs = referenceFieldsOf(object);
  if (!refs || refs.size === 0 || !doc || typeof doc !== 'object') return;
  const problems: string[] = [];
  for (const [field, value] of Object.entries(doc)) {
    const def = refs.get(field);
    if (!def) continue;
    const problem = referenceValueShapeError(field, def, value);
    if (problem) problems.push(problem);
  }
  if (problems.length === 0) return;
  throw new Error(
    `${harness}: ${op}('${object}', …) would be refused by the engine — ${problems.join('; ')}. ` +
      'A reference column holds a RECORD ID; an absent link is an ABSENT KEY, never `false`/`0`/`{}` ' +
      '(ADR-0104 value shapes, measured on 17.1.0: strict refuses this write, and the warn-first ' +
      'default persists the junk into a reference column instead).',
  );
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
          // Recorded BEFORE the refusal so a test can still inspect the
          // document that was attempted — the engine would have stored
          // nothing, but "what did the hook try to write" is the question a
          // failing value-shape assertion sends you to ask.
          calls.push({ op: 'insert', object: name, args: [doc] });
          assertReferenceValueShapes('hook-harness', 'insert', name, doc);
          const rec = { id: doc.id ?? `${name}_${++seq}`, ...doc };
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
          assertReferenceValueShapes('hook-harness', 'update', name, doc);
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

// ──────────────────────────────── `ctx.input` is the ENGINE's shape, not a plain object ────

/**
 * The name the probe hook carries. Not load-bearing — it appears only in
 * `@objectstack/objectql`'s own log lines, which are routed to a noop logger
 * here — but a searchable one beats an anonymous frame if it ever surfaces.
 */
const FLAT_INPUT_PROBE = '__hook_harness_flat_input__';

/**
 * A wrapped no-op handler, built ONCE. Calling it installs the engine's
 * flat-record Proxy on whatever ctx it is handed; see {@link engineFlatInput}.
 */
const installFlatInputProbe = wrapDeclarativeHook(
  { name: FLAT_INPUT_PROBE } as never,
  (async () => {}) as never,
);

/**
 * Wrap a flat record in the object the ENGINE hands a hook as `ctx.input`.
 *
 * ### The gap this closes (#1295, the card that would have prevented #1133)
 *
 * This harness used to pass a hook handler a **plain object** as `ctx.input`.
 * The real engine never does. ObjectQL hands a hook `{ data, options }` with a
 * flat-record **Proxy** over it (`installFlatInput`, `@objectstack/objectql`
 * `src/hook-wrappers.ts`). The two behave identically for reads and
 * assignments — and differently for everything else, so any hook defect living
 * in that difference was structurally invisible here **while the assertions
 * reported success**.
 *
 * That is not a hypothesis. #1133: fifteen `delete` statements across two
 * intake hooks were silent no-ops against the real engine, and the tests
 * asserting that strip passed the entire time, because on a plain object
 * `delete` genuinely works. They were not merely failing to catch the defect;
 * they were actively certifying the opposite of what production did, for as
 * long as the defect existed.
 *
 * ### Why this calls the real wrapper instead of reimplementing it
 *
 * `installFlatInput` is **not exported** — first measured on 17.1.0,
 * RE-MEASURED 2026-09-03 on 17.2.0 (#1460) and RE-MEASURED on the pinned
 * 17.3.0 (#1676): it still appears in `dist/index.mjs` and `dist/core.mjs` as
 * an internal function and in **neither** `.d.ts` nor `.d.mts`, and the
 * runtime export list does not carry it. `wrapDeclarativeHook` — the route
 * this harness takes instead, below — IS still exported there.
 *
 * ⚠️ One number in that reading MOVED and is therefore re-stated rather than
 * carried over: the runtime export list is **147 names on 17.3.0**, where the
 * 17.2.0 taking counted 103. It is a CONTROL for "the list does not carry
 * `installFlatInput`", not a fact this file depends on, and the load-bearing
 * half — absent from the export list and from both `.d.*` files — is
 * unchanged.
 *
 * The two obvious routes from there are both bad. A faithful local
 * reimplementation buys speed and then rots: the moment upstream adds a trap,
 * changes `ownKeys` ordering, or extends the reserved-key set, the copy keeps
 * answering with yesterday's engine — a *second* way to be confidently wrong,
 * and a harder one to notice than the plain object was, because a
 * wrapper-shaped lie reads as fidelity. Routing every one of these tests
 * through a real kernel costs exactly the speed that makes the harness worth
 * having (`test/guest-submission-sanitisation.test.ts` boots one, and is the
 * slow file in this suite).
 *
 * There is a third route, and it is strictly better than both: the function
 * that *calls* `installFlatInput` — `wrapDeclarativeHook` — **is** exported.
 * Driving it gives us the genuine Proxy, constructed by the shipped engine
 * code, with **no kernel and no copy**. There is nothing to drift: if upstream
 * changes the wrapper, this harness changes with it on the next dependency
 * bump, and the pins in `test/hook-input-shape.test.ts` report the change
 * instead of silently absorbing it.
 *
 * ### Two measured facts this relies on
 *
 * 1. `wrapDeclarativeHook` installs the Proxy **synchronously**, before its
 *    first `await` — so the wrapped object can be read straight back off the
 *    probe ctx, with no async plumbing forced onto the ~270 call sites.
 * 2. The wrapper `restore()`s `ctx.input` to the raw object when its promise
 *    settles. That is why the probe ctx is a **throwaway**: the restore lands
 *    on an object nobody holds, while the Proxy we captured stays valid (it
 *    targets `raw`, which does not move).
 *
 * ### `data` is the caller's own object, on purpose
 *
 * `record` is installed AS `data`, not copied into it, so a test that holds a
 * reference to the input it passed still sees every write a hook makes —
 * `expect(input.priority_rank).toBe(2)` keeps working, unchanged, at every
 * existing call site. Assignment routes through the `set` trap into `data`,
 * and `data` *is* `input`.
 *
 * `id` is additionally hoisted onto the wrapper because that is where the
 * engine puts it: the Proxy's `get` answers `id` from the WRAPPER, never from
 * `data`, so an `id` left only in the record reads back as `undefined`
 * (measured). Seven hooks here read `ctx.input.id`; without the hoist they
 * would go red against a harness that is wrong, not against a defect.
 *
 * ### The residual divergence, stated rather than hidden
 *
 * Because `id` is hoisted by COPY (deleting it would mutate the caller's
 * object), a record that carried `id` has it in both places, so
 * `Object.keys(ctx.input)` lists `id` where a real per-row update dispatch
 * would not. Reads and writes of `id` are unaffected — both sides hold the
 * same value. This is the one place the shape is still approximate, and it is
 * approximate in the enumerable direction only.
 *
 * Dispatch shape remains out of scope and still wrong here; see the
 * batch-payload note on {@link referenceValueShapeError}'s block above (#1265,
 * blocked on objectstack#11552).
 */
export function engineFlatInput(record: Rec): Rec {
  const raw: Rec = { data: record, options: {} };
  // The engine binds `id` on the wrapper for id-addressed dispatch, and the
  // `get` trap reads it from there — see the block above.
  if ('id' in record) raw.id = record.id;

  const probe: Rec = { event: 'beforeInsert', input: raw };
  const settled = installFlatInputProbe(probe as never) as unknown as Promise<void>;
  // Read BEFORE the promise settles: the install is synchronous, the restore
  // is not. The probe handler cannot throw, but an unhandled rejection would
  // fail the run for the wrong reason, so it is absorbed explicitly.
  const wrapped = probe.input as Rec;
  void settled.catch(() => {});

  if (wrapped === raw || typeof wrapped !== 'object' || wrapped === null) {
    throw new Error(
      'hook-harness: @objectstack/objectql no longer installs a flat-input Proxy through ' +
        '`wrapDeclarativeHook`, so this harness has silently reverted to handing hooks a ' +
        'PLAIN OBJECT — the exact under-approximation #1295 removed and #1133 shipped under. ' +
        'Do NOT delete this check to get green: re-read `installFlatInput` in the installed ' +
        '@objectstack/objectql and re-point the probe, or the whole suite goes back to ' +
        'certifying behaviour production does not have.',
    );
  }
  return wrapped;
}

/**
 * Build a `HookContext`-shaped object for a handler call.
 *
 * `input` is the engine's wrapper shape, not a plain object — see
 * {@link engineFlatInput} for why, and `test/hook-input-shape.test.ts` for the
 * pins that hold it there.
 */
export function makeCtx(opts: CtxOptions): Rec {
  return {
    event: opts.event,
    input: engineFlatInput(opts.input ?? {}),
    previous: opts.previous,
    user: opts.user,
    session: opts.session,
    api: opts.api,
  };
}

/** Today as `YYYY-MM-DD`, matching what the hooks stamp. */
export const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * `YYYY-MM-DD` `days` from now (negative for the past), on the **UTC calendar
 * throughout** — the same calendar `today()` above renders on, and the one the
 * platform resolves a bare `{TODAY()}` token to. That second half was
 * re-measured here rather than inherited: driving a real `AutomationEngine`
 * (`@objectstack/service-automation` 17.3.0) at a pinned instant returns the
 * same `$lt` day in `UTC`, `America/New_York`, `Europe/Berlin` and
 * `Australia/Sydney`, so bare `{TODAY()}` is UTC everywhere.
 *
 * ⚠️ The arithmetic must NOT go through `setDate`/`getDate`. Those read and
 * write the **local** calendar, and rendering the result with `toISOString()`
 * then mixes two calendars inside one expression. Across a DST spring-forward
 * the local day is 23 h long, so a `setDate` shift preserves wall-clock time and
 * the instant lands one UTC day late. No run at `TZ=UTC` can catch that — there
 * the two calendars coincide and both spellings are behaviourally identical.
 */
export const daysFromNow = (days: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
