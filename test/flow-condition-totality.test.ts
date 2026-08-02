// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import { RecordChangeTrigger } from '@objectstack/trigger-record-change';
import stack from '../objectstack.config';

/**
 * ═══ HOUSE RULE: record-change flow conditions must be TOTAL ═══════════════
 *
 * **Every `record.x` / `previous.x` read in a record-change flow's condition
 * carries a `has(...)` guard**, and every ordering comparison additionally
 * carries `!= null`. A condition must return a verdict for every record shape
 * the trigger can hand it — never abort. This file enforces it; you do not
 * have to remember it.
 *
 * This is the SAME house rule `test/object-validation-predicates.test.ts`
 * states for object `validations[]`, applied to a **different surface with a
 * different mechanism**. It was not inherited — #633 required all three
 * questions be measured against this path specifically, because the repo's
 * three CEL surfaces do not behave alike:
 *
 *   | surface                  | mechanism                     | absent key ⇒        |
 *   | ------------------------ | ----------------------------- | ------------------- |
 *   | object `validations[]`   | interpreted, per record       | rule SKIPPED (WARN) |
 *   | `sharing` rule condition | COMPILED to a pushdown filter | never interpreted   |
 *   | flow condition (here)    | interpreted, per run          | RUN FAILS (ERROR)   |
 *
 * The sharing row is why `has()` must NOT be added to `src/sharing/`:
 * `compileCelToFilter` rejects the whole function-call class, so a guarded
 * sharing rule becomes untranslatable and `plugin-sharing` silently stops
 * seeding it (#621 / PR #637; pinned in `test/sharing-seeding.test.ts` by
 * `sharing conditions cannot use has()`). That conclusion stops at the sharing
 * boundary. Flow conditions never reach a compiler — measured: the only
 * `compileCelToFilter` consumers in the installed platform are
 * `@objectstack/formula` (which defines it), `plugin-sharing` and
 * `plugin-security`. Neither `service-automation` nor `trigger-record-change`
 * calls it.
 *
 * ### The three questions #633 asked, and what was measured (17.0.0-rc.1)
 *
 * **1. What record shape does a record-change trigger hand the condition?**
 * Not a re-read, and not `{...previous, ...data}`. `RecordChangeTrigger`
 * builds `record` as `{ ...input.data, ...ctx.result }` — the mutation payload
 * with the **driver's post-write row** overlaid. A re-read is merged UNDER it
 * only when the object declares a `formula` field (read-time computed-field
 * hydration), and it can only add keys, never fill them. `previous` is
 * `ctx.previous`, the driver's PRIOR row — sparse in exactly the same way, and
 * `null` on insert and on bulk `updateMany` (ObjectQL reads no prior row
 * there). So on a driver that stores only the columns a row was written with,
 * the condition sees a record with keys genuinely MISSING:
 *
 *   | driver                            | absent column comes back as |
 *   | --------------------------------- | --------------------------- |
 *   | `@objectstack/driver-sql`         | key present, `null`         |
 *   | `@objectstack/driver-sqlite-wasm` | key present, `null`         |
 *   | `@objectstack/driver-memory`      | **key absent**              |
 *   | `@objectstack/driver-mongodb`     | **key absent**              |
 *
 * A field is absent whenever it is neither `required` nor defaulted and the
 * writer did not supply it — and also when its default is a CEL expression
 * that cannot evaluate, which is how `crm_contact.owner` (`os.user.id`) goes
 * missing on every write that carries no user.
 *
 * **2. Interpreted or compiled?** Interpreted, every run.
 * `AutomationEngine.evaluateCondition` hands the source to `ExpressionEngine`
 * as strict CEL. Same evaluator family as validation predicates, so the same
 * abort table holds — `record.f != null` aborts on an absent key exactly like
 * `record.f == "v"` does, and only `has()` is total.
 *
 * **3. What happens on abort?** `evaluateCondition` THROWS. The throw is
 * caught by `AutomationEngine.execute`, which records the run as
 * `status: 'failed'` and returns `{ success: false, error }`; the automation
 * service then logs `Trigger-fired run of flow '<name>' failed: …` at ERROR.
 * The triggering WRITE still succeeds. So this is not the silent skip the
 * validation path performs — it is loud. It is still "declared ≠ enforced":
 * the automation does not happen, and nothing in the UI says so.
 *
 * ### Why nobody noticed: CEL `&&` absorbs errors
 *
 * Measured: `error && false` is `false`, while `error && true` aborts. So an
 * unguarded condition answers correctly for every record that fails some
 * OTHER conjunct — and aborts precisely on the records the flow was written to
 * act on. `case_escalation` skipped ordinary cases perfectly well for months
 * and blew up only on a critical one.
 *
 * ### The three defects this measured (all reproduced end-to-end below)
 *
 *   - `case_escalation_on_create` — a case BORN critical is stored with no
 *     `escalated_date` column; `record.escalated_date == null` aborted with
 *     `No such key: escalated_date`. The flow never ran on its own core
 *     population (a phone-in P1 is the common path, per its own file comment).
 *   - `contact_welcome` — `owner`'s `os.user.id` default cannot evaluate on a
 *     write with no user (seed data, integrations, any system context), so the
 *     row stores no `owner` column; `record.owner != null` aborted with
 *     `No such key: owner`.
 *   - `lead_assignment` — `rating` is neither required nor defaulted;
 *     `record.rating >= 4` on edge `e2` aborted with `No such key: rating`, so
 *     an unrated lead got no SLA stamp and no alert.
 *
 * The other five conditions measured total as authored — but only because
 * `crm_task` / `crm_opportunity` / `crm_case` happen to mark those fields
 * `required` or give them defaults. That is a property of a neighbouring
 * schema, not of the predicate, and it is one `required: false` away from
 * changing. They carry guards too, and this file keeps them honest.
 */

type AnyRec = Record<string, any>;

const flows: AnyRec[] = (stack as any).flows ?? [];
const objects: AnyRec[] = (stack as any).objects ?? [];

/** `P` compiles to `{ dialect: 'cel', source }`; older conditions may be raw strings. */
function celSource(condition: unknown): string {
  if (typeof condition === 'string') return condition;
  if (condition && typeof condition === 'object') return String((condition as AnyRec).source ?? '');
  return '';
}

interface FlowCondition {
  /** `<flow>.<where>` — stable enough to name in a failure message. */
  id: string;
  flow: string;
  source: string;
}

/**
 * Every authored condition in a `record_change` flow that reads the TRIGGER
 * record — start conditions, node conditions, `decision` condition lists and
 * edge conditions alike. All four go through the same
 * `AutomationEngine.evaluateCondition`, and one of the three measured defects
 * (`lead_assignment`) lives on an EDGE, not on a start node: scoping this
 * sweep to start nodes would have left it uncovered.
 *
 * Conditions over flow-local variables (`vars.x`, `oppRecord.x` — the output
 * of a `get_record` node) are deliberately NOT included. They are a different
 * shape with a different failure mode and are owned by
 * `test/flow-variable-conditions.test.ts`, which measured them separately
 * (#643) and found TWO classes with opposite remedies: a field read off a
 * `get_record` output wants `has()` guards like these, while an unbindable
 * VARIABLE wants binding in the flow graph and must NOT be guarded. Do not
 * carry either conclusion across — that file's guards are additionally
 * `vars.`-scoped, because measured, the bare `has(oppRecord.f)` spelling still
 * aborts with `Unknown variable: oppRecord` on an unbound variable while
 * `has(vars.oppRecord)` answers `false`.
 */
const flowConditions: FlowCondition[] = flows
  .filter((f) => f.type === 'record_change')
  .flatMap((f) => {
    const out: FlowCondition[] = [];
    const add = (where: string, condition: unknown) => {
      const source = celSource(condition);
      if (source) out.push({ id: `${f.name}.${where}`, flow: f.name as string, source });
    };
    for (const n of (f.nodes ?? []) as AnyRec[]) {
      add(`node:${n.id}`, n.config?.condition);
      for (const c of (n.config?.conditions ?? []) as AnyRec[]) {
        add(`node:${n.id}[${c?.label}]`, c?.expression);
      }
    }
    for (const e of (f.edges ?? []) as AnyRec[]) add(`edge:${e.id}`, e.condition);
    return out;
  })
  .filter((c) => /\b(record|previous)\./.test(c.source));

/** Fields the condition reads off `scope` without a `has(...)` guard on that read. */
function unguarded(source: string, scope: 'record' | 'previous'): string[] {
  const read = new RegExp(String.raw`\b${scope}\.(\w+)`, 'g');
  const referenced = [...new Set([...source.matchAll(read)].map((m) => m[1]))];
  return referenced.filter(
    (field) => !new RegExp(String.raw`has\(${scope}\.${field}\)`).test(source),
  );
}

/**
 * Operands of an ORDERING comparison (`<`, `<=`, `>`, `>=`).
 *
 * `has()` is not sufficient here: an explicit `null` PASSES `has()` and the
 * comparison then aborts with `no such overload: dyn<null> > int`. Ordering
 * operands need `has(...)` for the absent key and `!= null` for the null
 * value — the second hazard `object-validation-predicates.test.ts` documents.
 */
const OPERAND = String.raw`record\.\w+|previous\.\w+|\w+\([^()]*\)|-?[\d.]+|"[^"]*"`;
const RELATIONAL = new RegExp(String.raw`(${OPERAND})\s*(<=|>=|<|>)\s*(${OPERAND})`, 'g');

function orderedOperands(source: string): string[] {
  const fields = new Set<string>();
  for (const [, lhs, , rhs] of source.matchAll(RELATIONAL)) {
    for (const operand of [lhs, rhs]) {
      if (/^(record|previous)\.\w+$/.test(operand)) fields.add(operand);
    }
  }
  return [...fields];
}

describe('record-change flow conditions guard every field they read', () => {
  it('finds conditions to check at all', () => {
    // Guard the guard: a typo in the extraction above would make every sweep
    // below pass over an empty list.
    expect(flowConditions.length).toBeGreaterThanOrEqual(9);
    expect(flowConditions.some((c) => c.id.endsWith('.node:start'))).toBe(true);
    expect(flowConditions.some((c) => c.id.includes('.edge:'))).toBe(true);
    expect(flowConditions.some((c) => /\bprevious\./.test(c.source))).toBe(true);
  });

  it('reads no record field without has(...)', () => {
    const offenders = flowConditions
      .map((c) => ({ id: c.id, unguarded: unguarded(c.source, 'record') }))
      .filter((c) => c.unguarded.length > 0);

    expect(
      offenders,
      'These flow conditions read a trigger-record field with no has(…) guard. On a ' +
        'record whose post-write shape omits the key — driver-memory and driver-mongodb ' +
        'store only the columns a row was written with — strict CEL aborts, the ' +
        'automation engine records the run as FAILED and the flow does not run. Use ' +
        '`has(record.f) && record.f <op> …` for "f holds a value" and ' +
        '`(!has(record.f) || …)` for "f is absent or …".',
    ).toEqual([]);
  });

  it('reads no previous field without has(...)', () => {
    // `previous` is the driver's PRIOR row — sparse the same way `record` is,
    // and null on insert and on bulk `updateMany`. A bare `previous == null`
    // term does not cover a prior row that simply lacks the key (measured).
    const offenders = flowConditions
      .map((c) => ({ id: c.id, unguarded: unguarded(c.source, 'previous') }))
      .filter((c) => c.unguarded.length > 0);

    expect(offenders).toEqual([]);
  });

  it('null-guards every operand of every ordering comparison', () => {
    const offenders = flowConditions
      .map((c) => ({
        id: c.id,
        // Either polarity counts. `has(f) && f != null && f > 3` is the
        // "f holds a value" shape; `!has(f) || f == null || f < 3` is its
        // complement, used where two branches must PARTITION (lead_assignment).
        // Both are total; demanding only `!=` would reject the correct one.
        unguarded: orderedOperands(c.source).filter(
          (operand) => !new RegExp(String.raw`${operand.replace('.', String.raw`\.`)}\s*[!=]=\s*null`).test(c.source),
        ),
      }))
      .filter((c) => c.unguarded.length > 0);

    expect(
      offenders,
      'An ordering comparison needs `!= null` as well as `has(…)`: an explicit null ' +
        'passes has() and then aborts with `no such overload: dyn<null> > int`.',
    ).toEqual([]);
  });
});

/**
 * The same property, measured on the real engine instead of grepped.
 *
 * The sweeps above are regexes over source text and can be satisfied by a
 * guard sitting in the wrong place. This hands every condition to the real
 * `AutomationEngine.evaluateCondition` — the exact method
 * `AutomationEngine.execute` calls for a start condition and
 * `traverseNext` calls for an edge — across the shapes a sparse driver
 * produces, and fails on any throw.
 *
 * A `false` here is a PASS: the condition reached a verdict. Only an abort is
 * the defect.
 */
describe('flow conditions are TOTAL on the real engine', () => {
  const silent: any = { info() {}, warn() {}, error() {}, debug() {}, trace() {} };
  silent.child = () => silent;
  const engine = new AutomationEngine(silent);

  /** Evaluate exactly as the engine does; return the abort message, or null. */
  function abortOf(source: string, vars: AnyRec): string | null {
    try {
      (engine as unknown as {
        evaluateCondition(e: unknown, v: Map<string, unknown>): boolean;
      }).evaluateCondition({ dialect: 'cel', source }, new Map(Object.entries(vars)));
      return null;
    } catch (err) {
      return String((err as Error).message).split('\n')[0];
    }
  }

  /** Every field name the condition reads off `scope`. */
  const readsOf = (source: string, scope: 'record' | 'previous') => [
    ...new Set([...source.matchAll(new RegExp(String.raw`\b${scope}\.(\w+)`, 'g'))].map((m) => m[1])),
  ];

  /**
   * Plausible values for one field, taken from the condition's OWN literals.
   *
   * Filling a field with an arbitrary value does not test totality, it tests
   * type agreement: `record.amount = "x"` makes `record.amount > 100000` abort
   * with `no such overload: dyn<string> > int`, which is a mis-typed record,
   * not a missing key, and no driver produces it. Drawing the values from the
   * literals the predicate already compares against keeps every probe
   * type-correct while still covering both sides of each comparison — which
   * matters because CEL's `&&` ABSORBS an error beside a false operand, so a
   * probe that leaves some other clause false would hide the abort.
   */
  function candidatesFor(source: string, scope: string, field: string): unknown[] {
    const LITERAL = String.raw`"[^"]*"|-?\d+(?:\.\d+)?|true|false|null`;
    const ref = String.raw`\b${scope}\.${field}\b`;
    const OPS = String.raw`==|!=|>=|<=|>|<`;
    const found = [
      ...source.matchAll(new RegExp(String.raw`${ref}\s*(?:${OPS})\s*(${LITERAL})`, 'g')),
      ...source.matchAll(new RegExp(String.raw`(${LITERAL})\s*(?:${OPS})\s*${ref}`, 'g')),
    ].map((m) => m[1]);

    const values = new Set<unknown>([null]);
    let sawString = false;
    for (const raw of found) {
      if (raw === 'null') continue;
      if (raw === 'true' || raw === 'false') { values.add(raw === 'true'); values.add(raw !== 'true'); continue; }
      if (raw.startsWith('"')) { values.add(raw.slice(1, -1)); sawString = true; continue; }
      const n = Number(raw);
      // Straddle the threshold so both sides of an ordering test are probed.
      values.add(n); values.add(n - 1); values.add(n + 1);
    }
    // A value matching no string literal, so `!=` chains are probed true too.
    if (sawString) values.add('__neither__');
    return [...values];
  }

  /** Cartesian product of per-field candidates, capped so the sweep stays cheap. */
  function shapesFor(source: string, scope: 'record' | 'previous', omit?: string): Record<string, unknown>[] {
    let out: Record<string, unknown>[] = [{}];
    for (const field of readsOf(source, scope)) {
      if (field === omit) continue;
      const next: Record<string, unknown>[] = [];
      for (const base of out) {
        for (const value of candidatesFor(source, scope, field)) next.push({ ...base, [field]: value });
      }
      out = next.slice(0, 400);
    }
    return out;
  }

  it.each(flowConditions.map((c) => [c.id, c] as const))(
    '%s answers on a record with no keys at all',
    (_id, c) => {
      expect(abortOf(c.source, { record: {}, previous: {} })).toBeNull();
    },
  );

  it.each(flowConditions.map((c) => [c.id, c] as const))(
    '%s answers when previous is null (insert, or a bulk updateMany)',
    (_id, c) => {
      const record = Object.fromEntries(readsOf(c.source, 'record').map((f) => [f, null]));
      expect(abortOf(c.source, { record, previous: null })).toBeNull();
    },
  );

  it.each(flowConditions.map((c) => [c.id, c] as const))(
    '%s answers when every field is present but null',
    (_id, c) => {
      const record = Object.fromEntries(readsOf(c.source, 'record').map((f) => [f, null]));
      const previous = Object.fromEntries(readsOf(c.source, 'previous').map((f) => [f, null]));
      expect(abortOf(c.source, { record, previous })).toBeNull();
    },
  );

  it.each(flowConditions.map((c) => [c.id, c] as const))(
    '%s answers when any single referenced key is the one that is missing',
    (_id, c) => {
      // The shape a real write produces: most columns came back, one did not.
      // Sweeping one at a time catches a guard that only appears to work
      // because a neighbouring clause short-circuits first — and CEL's `&&`
      // ABSORBS errors next to a false operand, so a whole-shape test alone
      // would miss it.
      const bad: string[] = [];
      const probe = (scope: 'record' | 'previous', missing: string) => {
        for (const record of shapesFor(c.source, 'record', scope === 'record' ? missing : undefined)) {
          for (const previous of shapesFor(c.source, 'previous', scope === 'previous' ? missing : undefined)) {
            const abort = abortOf(c.source, { record, previous });
            if (abort) {
              bad.push(
                `${scope}.${missing} absent (record=${JSON.stringify(record)} ` +
                `previous=${JSON.stringify(previous)}): ${abort}`,
              );
              return; // one witness per missing key is enough to fail on
            }
          }
        }
      };

      for (const missing of readsOf(c.source, 'record')) probe('record', missing);
      for (const missing of readsOf(c.source, 'previous')) probe('previous', missing);

      expect(bad, `${c.id} aborted when a single key was absent:\n  ${bad.join('\n  ')}`).toEqual([]);
    },
  );

  /**
   * The counterpart to `sharing conditions cannot use has()` in
   * `test/sharing-seeding.test.ts`. That test pins that `has()` is REJECTED on
   * the sharing surface; this one pins that it is ACCEPTED and correct here.
   * Together they stop either conclusion being carried across the boundary —
   * which is the mistake #633 was opened to prevent.
   */
  it('has() evaluates in the flow engine, unlike on the sharing surface', () => {
    const has = (vars: AnyRec) => abortOf('has(record.f)', vars);
    expect(has({ record: { f: 'v' } })).toBeNull();
    expect(has({ record: { f: null } })).toBeNull();
    expect(has({ record: {} })).toBeNull();

    const ev = (source: string, vars: AnyRec) =>
      (engine as unknown as {
        evaluateCondition(e: unknown, v: Map<string, unknown>): boolean;
      }).evaluateCondition({ dialect: 'cel', source }, new Map(Object.entries(vars)));

    expect(ev('has(record.f)', { record: { f: 'v' } })).toBe(true);
    expect(ev('has(record.f)', { record: { f: null } })).toBe(true);
    expect(ev('has(record.f)', { record: {} })).toBe(false);
    // …and on a `previous` that is null outright, rather than throwing.
    expect(ev('has(previous.f)', { previous: null })).toBe(false);
  });

  it('is the reason the guards are needed: the unguarded forms abort', () => {
    // The abort table, re-measured on THIS evaluator rather than inherited
    // from the validation path. If a platform upgrade makes strict CEL
    // tolerant of absent keys, this test fails and the guards can be revisited
    // — that is the intended signal, not a nuisance.
    expect(abortOf('record.f != null', { record: {} })).toMatch(/No such key: f/);
    expect(abortOf('record.f == "v"', { record: {} })).toMatch(/No such key: f/);
    expect(abortOf('record.f > 3', { record: {} })).toMatch(/No such key: f/);
    // `has()` passes an explicit null; the ordering comparison then aborts.
    expect(abortOf('has(record.f) && record.f > 3', { record: { f: null } }))
      .toMatch(/no such overload/);
    expect(abortOf('has(record.f) && record.f != null && record.f > 3', { record: { f: null } }))
      .toBeNull();
    // A bare `previous == null` term does not cover a SPARSE previous row.
    expect(abortOf('previous == null || previous.f != "x"', { previous: {} }))
      .toMatch(/No such key: f/);
  });

  it('CEL && absorbs errors beside a false operand — why this went unnoticed', () => {
    // This is the mechanism that let unguarded conditions look correct: they
    // answer fine for every record that fails some other conjunct, and abort
    // only on the records the flow was written to act on.
    expect(abortOf('record.missing == 1 && record.b == "no"', { record: { b: 'x' } })).toBeNull();
    expect(abortOf('record.missing == 1 && record.b == "x"', { record: { b: 'x' } }))
      .toMatch(/No such key: missing/);
  });
});

/**
 * End-to-end, on the driver that actually produces the sparse record.
 *
 * Everything above evaluates conditions in isolation. This boots a real
 * ObjectQL over `InMemoryDriver`, a real `AutomationEngine`, and the real
 * `RecordChangeTrigger` that wires them together, then performs the ordinary
 * writes that reproduced each of the three defects. Before the guards landed
 * every one of these logged
 * `Trigger-fired run of flow '…' failed: condition failed to evaluate as CEL`
 * and the automation silently did not happen.
 */
describe('conditions answer on a driver whose stored record omits the key', () => {
  const objMap = Object.fromEntries(objects.map((o) => [o.name as string, o]));

  interface Booted {
    ql: AnyRec;
    /** Every trigger-fired run, in order. */
    runs: { flow: string; success: boolean; error?: string }[];
    close(): Promise<void>;
  }

  async function boot(flowNames: string[]): Promise<Booted> {
    const silent: any = { info() {}, warn() {}, error() {}, debug() {}, trace() {} };
    silent.child = () => silent;

    const ql: AnyRec = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: objMap as never,
      // `logger` is honoured at runtime but is not on the published options
      // type. Without it this suite prints every engine INFO line plus the
      // downstream `notify` / `runAs` errors these flows legitimately hit in a
      // user-less harness, which reads as a broken build when it is not.
      ...({ logger: silent } as object),
    })) as never;

    const engine = new AutomationEngine(silent);
    installBuiltinNodes(engine, {
      logger: silent,
      getService: (n: string) =>
        n === 'data' || n === 'objectql'
          ? ql
          : n === 'messaging' || n === 'notification' || n === 'email'
            ? { async emit() { return { notificationId: 'n', delivered: 1, failed: 0 }; } }
            : undefined,
    } as never);

    const runs: { flow: string; success: boolean; error?: string }[] = [];
    const original = engine.execute.bind(engine);
    (engine as unknown as AnyRec).execute = async (name: string, ctx: AnyRec) => {
      const result: AnyRec = await original(name, ctx as never);
      runs.push({ flow: name, success: result?.success !== false, error: result?.error });
      return result;
    };

    for (const name of flowNames) {
      const flow = flows.find((f) => f.name === name);
      expect(flow, `flow ${name} is not registered on the stack`).toBeDefined();
      engine.registerFlow(name, flow as never);
    }
    engine.registerTrigger(new RecordChangeTrigger(ql as never, silent) as never);

    return { ql, runs, close: () => ql.close() };
  }

  /**
   * Runs whose CONDITION could not be evaluated.
   *
   * Deliberately narrower than "runs that failed": these flows also fail
   * downstream in this harness for unrelated reasons (a `notify` node whose
   * `{record.owner}` recipient is empty because the owner default needs a
   * user, a `runAs: 'user'` refusal because a system write carries none).
   * Those are real, separate concerns and are not what this file asserts.
   */
  const conditionAborts = (b: Booted) =>
    b.runs
      .filter((r) => /failed to evaluate as CEL|No such key|no such overload/.test(r.error ?? ''))
      .map((r) => `${r.flow}: ${String(r.error).split('\n')[0]}`);

  it('stores no key for a column it was never given — the precondition', async () => {
    const b = await boot([]);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const row = await api.object('crm_case').insert({
        subject: 'Prod outage', description: 'Everything is down',
        priority: 'critical', status: 'new',
      });
      const stored = await api.object('crm_case').findOne({ where: { id: row.id } });
      // Not `toBeNull()`: the key is ABSENT, which is the whole point. If a
      // platform upgrade makes this driver column-complete, this assertion
      // fails and everything below stops proving anything — intended signal.
      expect('escalated_date' in (stored ?? {})).toBe(false);
      // …and the owner default (`os.user.id`) cannot evaluate without a user,
      // so that column is missing too rather than defaulted.
      expect('owner' in (stored ?? {})).toBe(false);
    } finally {
      await b.close();
    }
  }, 60_000);

  it('case_escalation_on_create: a case BORN critical still evaluates', async () => {
    const b = await boot(['case_escalation_on_create']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      await api.object('crm_case').insert({
        subject: 'Prod outage', description: 'Everything is down',
        priority: 'critical', status: 'new',
      });
      expect(b.runs.map((r) => r.flow)).toContain('case_escalation_on_create');
      expect(conditionAborts(b)).toEqual([]);
    } finally {
      await b.close();
    }
  }, 60_000);

  it('contact_welcome: a contact written with no resolvable owner still evaluates', async () => {
    const b = await boot(['contact_welcome']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const account = await api.object('crm_account').insert({ name: 'Acme Corp' });
      await api.object('crm_contact').insert({
        first_name: 'Ada', last_name: 'Lovelace',
        email: 'ada@acme.com', crm_account: account.id,
      });
      expect(b.runs.map((r) => r.flow)).toContain('contact_welcome');
      expect(conditionAborts(b)).toEqual([]);
    } finally {
      await b.close();
    }
  }, 60_000);

  it('lead_assignment: an unrated lead takes the standard branch instead of aborting', async () => {
    const b = await boot(['lead_assignment']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      await api.object('crm_lead').insert({
        first_name: 'Jo', last_name: 'Smith', company: 'Acme',
        status: 'new', email: 'jo@acme.com',
      });
      expect(b.runs.map((r) => r.flow)).toContain('lead_assignment');
      expect(conditionAborts(b)).toEqual([]);
      // The lead really was routed: the standard branch stamped an SLA on it.
      const stored = await api.object('crm_lead').findOne({ where: { company: 'Acme' } });
      expect(stored, 'the unrated lead vanished').toBeTruthy();
    } finally {
      await b.close();
    }
  }, 60_000);

  it('the remaining record-change flows evaluate across an insert and an update', async () => {
    const b = await boot([
      'case_escalation', 'case_csat_followup',
      'opportunity_approval', 'opportunity_approval_on_create', 'opportunity_won_alert',
      'task_urgent_alert',
    ]);
    try {
      const api = b.ql.createContext({ isSystem: true });

      await api.object('crm_task').insert({ subject: 'Fix the thing', priority: 'urgent' });

      const account = await api.object('crm_account').insert({ name: 'Acme Corp' });
      const opp = await api.object('crm_opportunity').insert({
        name: 'Big Deal', amount: 750_000, stage: 'negotiation',
        close_date: '2026-12-31', crm_account: account.id,
      });
      // `win_reason` is `requiredWhen` stage is closed_won (#593) — the engine
      // rejects the close without it, exactly as it rejects the case close
      // below without a `resolution`. Supplied here so this file keeps testing
      // what it is about (flow-condition totality) rather than failing on a
      // neighbouring object rule.
      await api.object('crm_opportunity').update(
        { stage: 'closed_won', win_reason: 'best_fit' },
        { where: { id: opp.id } },
      );

      const kase = await api.object('crm_case').insert({
        subject: 'Login broken', description: 'Cannot sign in',
        priority: 'high', status: 'new',
      });
      await api.object('crm_case').update(
        { status: 'closed', resolution: 'Reset the session store' },
        { where: { id: kase.id } },
      );

      expect(b.runs.length, 'no flow fired at all — the harness is not wired').toBeGreaterThan(0);
      expect(conditionAborts(b)).toEqual([]);
    } finally {
      await b.close();
    }
  }, 60_000);
});
