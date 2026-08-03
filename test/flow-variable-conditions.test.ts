// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import stack from '../objectstack.config';

/**
 * ═══ HOUSE RULE: flow conditions over FLOW VARIABLES ═══════════════════════
 *
 * `test/flow-condition-totality.test.ts` owns the **trigger record** scope
 * (`record.x` / `previous.x`, #633). This file owns the other scope a flow
 * condition can read: **flow-local variables** — `vars.x`, or the bare name of
 * a `get_record` / `assignment` / loop output. Same evaluator, same abort, same
 * consequence; a different source of the sparse shape, and — this is the part
 * that must not be collapsed — **two classes with OPPOSITE remedies**:
 *
 *   | class                                  | remedy                        |
 *   | -------------------------------------- | ----------------------------- |
 *   | field read off a `get_record` OUTPUT   | `has()` guards (as #633)      |
 *   | the VARIABLE ITSELF may be unbound     | bind it in the graph, NOT `has()` |
 *
 * A `has()` guard on an unbound variable would encode a policy ("a missing
 * answer means No") inside a predicate, hiding the real defect: the graph left
 * the variable unbound. So this file asserts the two properties separately —
 * `has(...)` coverage for field reads, and a structural **binding** proof for
 * variable roots — and its failure messages tell you which one you broke.
 *
 * ### What was measured on 17.0.0-rc.1, and how
 *
 * **Where conditions actually evaluate.** Three sites, not four:
 *   - the START node's `config.condition` (`AutomationEngine.execute`);
 *   - a `decision` node's `config.conditions[]` — the PLURAL, each entry an
 *     `{ label, expression }`;
 *   - every out-edge's `condition` (`AutomationEngine.traverseNext`).
 *
 * A `decision` node's SINGULAR `config.condition` is **never read by the
 * engine**. The branch is decided entirely by the edge copies, which is why the
 * reproductions below all abort on an EDGE.
 *
 * This repo used to author the node copy too, as a statement of intent kept in
 * sync with the edge. It no longer does: 17.0.0-rc.2's `flow-inert-node-condition`
 * (#4414) flags exactly that copy, on the grounds that a second statement of a
 * predicate which no reader can tell apart from the live one is worse than no
 * statement at all — and a copy that drifts is a lie about what the flow does.
 * Every `decision` node here now carries no condition, and the sweeps below run
 * over the edges that decide. (The node arm stays in the collector: it costs
 * nothing and catches a re-introduced copy.)
 *
 * **How variables reach CEL.** `evaluateCondition` flattens the run's variable
 * Map into one object and evaluates with `{ extra: { ...vars, vars }, record: vars }`
 * — so a variable `X` is readable BOTH bare (`X.f`) and scoped (`vars.X.f`).
 * They are not equally safe:
 *
 *   | expression          | X unbound                   | X = null | X = {} (sparse) | X = {f:1} |
 *   | ------------------- | --------------------------- | -------- | --------------- | --------- |
 *   | `X.f == 1`          | ABORT `Unknown variable: X` | ABORT `No such key: f` | ABORT `No such key: f` | verdict |
 *   | `vars.X.f == 1`     | ABORT `No such key: X`      | ABORT `No such key: f` | ABORT `No such key: f` | verdict |
 *   | `vars.X != null`    | ABORT `No such key: X`      | `false`  | `true`          | `true`    |
 *   | `has(X.f)`          | **ABORT `Unknown variable: X`** | `false` | `false`      | `true`    |
 *   | `has(vars.X)`       | `false`                     | `true`   | `true`          | `true`    |
 *   | `has(vars.X.f)`     | ABORT `No such key: X`      | `false`  | `false`         | `true`    |
 *
 * Two consequences, both load-bearing and both pinned below:
 *   - **Only `has(vars.X)` survives an unbound variable.** The bare `has(X.f)`
 *     form — the obvious one to reach for — still aborts. Guards in this repo
 *     are therefore written `vars.`-scoped, and always lead with `has(vars.X)`
 *     before `has(vars.X.f)`.
 *   - **No guard makes an unbound variable mean anything.** `has(vars.X)`
 *     answers `false`, which is a verdict, not a fix — see the class table
 *     above.
 *
 * **What binds a variable.** `get_record` runs
 * `if (outputVariable) variables.set(outputVariable, record)` unconditionally,
 * and `findOne` answers a miss with `null` (measured against `InMemoryDriver`
 * below) — so after a `get_record`, the variable IS bound, possibly to `null`.
 * `assignment` sets every key of `config.assignments`. A `loop` binds its
 * `iteratorVariable` inside the body region, which runs in the ENCLOSING
 * variable scope. A failed node throws and the run stops, so a node that could
 * not bind its output never reaches a downstream reader.
 *
 * **What does NOT bind a variable — the trap.** Declaring it in
 * `flow.variables` does nothing at runtime. `FlowVariableSchema` is strict
 * `{ name, type, isInput, isOutput }` with **no `defaultValue`**, and
 * `AutomationEngine.execute` binds a declared input only when
 * `context.params[name] !== undefined`. A `screen` node's collected values
 * arrive only in the RESUME SIGNAL, from the client. So a declared,
 * screen-collected input is unbound on any run whose runner did not send it
 * back — which is exactly how `lead_conversion` aborted.
 *
 * ### The defects this measured (both reproduced end-to-end below)
 *
 *   - `campaign_enrollment` — CLASS 1. `vars.campaignRecord.status` on edge
 *     `e4`. A campaign deleted (or hidden by sharing) between the action click
 *     and the flow run leaves `campaignRecord` bound to `null`, and the read
 *     aborted with `No such key: status`. The run was recorded `failed` and not
 *     one lead was enrolled. `crm_campaign.status` is `required`, so the
 *     sparse-COLUMN variant was already closed — the null-RECORD variant was
 *     not, and no amount of reasoning from #633 would have found it.
 *   - `lead_conversion` — CLASS 2. `vars.createOpportunity` on edges `e16` /
 *     `e17`. A runner that posts only the fields the user touched leaves the
 *     untouched checkbox unbound; the read aborted with
 *     `No such key: createOpportunity` and the lead was never marked converted.
 *     Fixed by an `assignment` node ahead of the screen, NOT by a guard.
 *
 * ### What measured CLEAN, and why that is not the same as safe
 *
 *   - `demo_bootstrap` (`vars.firstUser`) — `get_user` dominates every read and
 *     binds `null` when the org has no users yet; the whole flow completes on a
 *     zero-user org (reproduced below). Nothing to fix.
 *   - `lead_conversion`'s `vars.matchedAccount` / `vars.matchedContact` — same
 *     shape, same reason: a `get_record` dominates each read. Nothing to fix,
 *     and deliberately NOT guarded — a guard here would be the papering-over
 *     the class table warns about.
 *   - `quote_generation` (`oppRecord.stage`) and `opportunity_approval`
 *     (`oppRecord.amount`) — reachable only with a bound, non-null `oppRecord`
 *     TODAY, because two neighbouring schemas close the gap: `stage` / `amount`
 *     are `required` on `crm_opportunity`, and `crm_quote.crm_account` is
 *     `required` so a null `oppRecord` fails `create_quote` one node earlier.
 *     That is a property of the neighbours, not of the predicate, and it is one
 *     `required: false` away from changing. They carry guards too.
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

// ═══════════════════════════════════════════════════════════════════════════
// Extraction — every condition site, and every flow-variable read in it
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scopes this file does NOT own.
 *
 * `record` / `previous` are the trigger record — `flow-condition-totality.test.ts`
 * sweeps those. `$`-prefixed names are engine internals the engine always binds.
 */
const FOREIGN_ROOTS = new Set(['record', 'previous', 'vars', 'true', 'false', 'null']);

/** Source with string literals blanked, so a literal's contents never parse as a read. */
const withoutStrings = (source: string) => source.replace(/"[^"]*"|'[^']*'/g, '""');

/**
 * Every `<root>` a condition reads out of the flow-variable scope, whether it
 * was written bare (`oppRecord.stage`) or scoped (`vars.oppRecord.stage`).
 * Identifiers immediately followed by `(` are CEL functions (`has`, `size`, …),
 * not variables.
 */
function variableRoots(source: string): string[] {
  const bare = withoutStrings(source);
  const roots = new Set<string>();
  for (const [, root] of bare.matchAll(/\bvars\.([A-Za-z_]\w*)/g)) roots.add(root);
  // `(?<!\.)` is load-bearing: without it the FIELD of a foreign read parses as
  // a root of its own (`record.rating` would yield a variable `rating`), and
  // the sweep then probes a shape no engine ever produces.
  for (const [, root, next] of bare.matchAll(/(?<!\.)\b([A-Za-z_]\w*)\b\s*(\(?)/g)) {
    if (next === '(') continue;
    if (FOREIGN_ROOTS.has(root) || root.startsWith('$')) continue;
    roots.add(root);
  }
  // `vars.X` also matches the bare pattern at `vars`; FOREIGN_ROOTS drops it.
  return [...roots];
}

/** Every `<root>.<field>` FIELD read in the flow-variable scope, both spellings. */
function variableFieldReads(source: string): { root: string; field: string }[] {
  const bare = withoutStrings(source);
  const out = new Map<string, { root: string; field: string }>();
  const add = (root: string, field: string) => {
    if (FOREIGN_ROOTS.has(root) || root.startsWith('$')) return;
    out.set(`${root}.${field}`, { root, field });
  };
  for (const [, root, field] of bare.matchAll(/\bvars\.([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g)) add(root, field);
  for (const [, root, field] of bare.matchAll(/(?<!\.)\b([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g)) add(root, field);
  return [...out.values()];
}

interface Site {
  /** `<flow>.<where>` — stable enough to name in a failure message. */
  id: string;
  flow: string;
  source: string;
  /** Node the condition is attached to (a node site), or an edge's SOURCE node. */
  at: string;
  /** Where the engine reads this condition from. `node:condition` is INERT — see the header. */
  kind: 'start' | 'node:condition' | 'node:conditions' | 'edge';
}

/** A flow's nodes and edges, with every `loop` body region flattened in. */
function graphOf(flow: AnyRec): { nodes: AnyRec[]; edges: AnyRec[] } {
  const nodes: AnyRec[] = [];
  const edges: AnyRec[] = [];
  const walk = (ns: AnyRec[], es: AnyRec[]) => {
    for (const n of ns ?? []) {
      nodes.push(n);
      const body = n.config?.body;
      if (body) walk(body.nodes ?? [], body.edges ?? []);
    }
    edges.push(...(es ?? []));
  };
  walk(flow.nodes ?? [], flow.edges ?? []);
  return { nodes, edges };
}

/** Every condition site in every flow that reads at least one flow variable. */
const sites: Site[] = flows.flatMap((f) => {
  const { nodes, edges } = graphOf(f);
  const out: Site[] = [];
  const add = (where: string, at: string, kind: Site['kind'], condition: unknown) => {
    const source = celSource(condition);
    if (source) out.push({ id: `${f.name}.${where}`, flow: f.name as string, source, at, kind });
  };
  for (const n of nodes) {
    add(`node:${n.id}`, n.id, n.type === 'start' ? 'start' : 'node:condition', n.config?.condition);
    for (const c of (n.config?.conditions ?? []) as AnyRec[]) {
      add(`node:${n.id}[${c?.label}]`, n.id, 'node:conditions', c?.expression);
    }
  }
  for (const e of edges) add(`edge:${e.id}`, e.source, 'edge', e.condition);
  return out;
}).filter((s) => variableRoots(s.source).length > 0);

// ═══════════════════════════════════════════════════════════════════════════
// CLASS 1 — field reads off a `get_record` output need has(...) guards
// ═══════════════════════════════════════════════════════════════════════════

describe('flow-variable conditions guard every FIELD they read', () => {
  it('finds conditions to check at all', () => {
    // Guard the guard: a typo in the extraction above would make every sweep
    // below pass over an empty list.
    expect(sites.length).toBeGreaterThanOrEqual(10);
    expect(sites.some((s) => s.kind === 'edge')).toBe(true);
    expect(sites.some((s) => s.kind === 'node:condition')).toBe(true);
    expect(sites.some((s) => variableFieldReads(s.source).length > 0)).toBe(true);
  });

  it('leads every field read with has(vars.<root>) and has(vars.<root>.<field>)', () => {
    const offenders = sites
      .map((s) => ({
        id: s.id,
        unguarded: variableFieldReads(s.source)
          .filter(({ root, field }) =>
            !new RegExp(String.raw`has\(vars\.${root}\)`).test(s.source) ||
            !new RegExp(String.raw`has\(vars\.${root}\.${field}\)`).test(s.source))
          .map(({ root, field }) => `${root}.${field}`),
      }))
      .filter((s) => s.unguarded.length > 0);

    expect(
      offenders,
      'These conditions read a FIELD off a flow variable without both guards. A ' +
        '`get_record` output is a driver row: `findOne` answers a miss with null, and a ' +
        'sparse driver (driver-memory / driver-mongodb) omits any column the row was ' +
        'never written with. Strict CEL then aborts, the engine records the run FAILED ' +
        'and the automation does not happen. Write ' +
        '`has(vars.X) && has(vars.X.f) && vars.X.f <op> …`, or the opposite polarity ' +
        '`!has(vars.X) || !has(vars.X.f) || …` where two branches must partition. Note ' +
        'the `vars.` scope is required: bare `has(X.f)` still aborts with ' +
        '`Unknown variable: X` when X is unbound.',
    ).toEqual([]);
  });

  it('null-guards every operand of every ordering comparison', () => {
    // `has()` is not sufficient here: an explicit null PASSES has() and the
    // comparison then aborts with `no such overload: dyn<null> > int`.
    const OPERAND = String.raw`(?:vars\.)?\w+(?:\.\w+)*|-?[\d.]+`;
    const RELATIONAL = new RegExp(String.raw`(${OPERAND})\s*(?:<=|>=|<|>)\s*(${OPERAND})`, 'g');
    const offenders = sites
      .map((s) => {
        const operands = new Set<string>();
        for (const [, lhs, rhs] of withoutStrings(s.source).matchAll(RELATIONAL)) {
          for (const operand of [lhs, rhs]) {
            const m = /^(?:vars\.)?([A-Za-z_]\w*)\.([A-Za-z_]\w*)$/.exec(operand);
            if (m && !FOREIGN_ROOTS.has(m[1])) operands.add(`${m[1]}.${m[2]}`);
          }
        }
        return {
          id: s.id,
          // Either polarity counts: `has(…) && … != null && … > n` is the
          // "holds a value" shape, `!has(…) || … == null || … <= n` its
          // complement, used where two branches must PARTITION. Both are total.
          unguarded: [...operands].filter(
            (operand) =>
              !new RegExp(String.raw`vars\.${operand.replace('.', String.raw`\.`)}\s*[!=]=\s*null`).test(s.source),
          ),
        };
      })
      .filter((s) => s.unguarded.length > 0);

    expect(
      offenders,
      'An ordering comparison needs `!= null` as well as `has(…)`: an explicit null ' +
        'passes has() and then aborts with `no such overload: dyn<null> > int`.',
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CLASS 2 — every variable a condition reads must be BOUND by the graph
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The variables a node binds for everything downstream of it.
 *
 * Deliberately NOT included: a `screen` node's collected fields. They arrive
 * only in the resume signal, from the client, so the graph cannot guarantee
 * them — which is the whole defect this check exists to catch. Also not
 * included: `flow.variables` declarations, which bind nothing at runtime (see
 * the header).
 */
function binds(node: AnyRec): string[] {
  const cfg = node.config ?? {};
  const out: string[] = [];
  if (typeof cfg.outputVariable === 'string' && cfg.outputVariable) out.push(cfg.outputVariable);
  if (typeof cfg.iteratorVariable === 'string' && cfg.iteratorVariable) out.push(cfg.iteratorVariable);
  if (typeof cfg.idVariable === 'string' && cfg.idVariable) out.push(cfg.idVariable);
  const a = cfg.assignments;
  if (Array.isArray(a)) {
    for (const item of a) {
      const name = item?.variable ?? item?.name ?? item?.key;
      if (typeof name === 'string' && name) out.push(name);
    }
  } else if (a && typeof a === 'object') {
    out.push(...Object.keys(a));
  }
  return out;
}

/**
 * For every node, the variables guaranteed bound when the engine ENTERS it.
 *
 * Standard intersection dataflow over the flow DAG: a variable is guaranteed at
 * `v` only if every path into `v` binds it first. A `loop` body region runs in
 * the enclosing variable scope, entered from its container, so it is seeded
 * with the container's exit set (plus the iterator).
 */
function boundOnEntry(flow: AnyRec): Map<string, Set<string>> {
  const { nodes, edges } = graphOf(flow);
  const universe = new Set(nodes.flatMap(binds));
  const byId = new Map(nodes.map((n) => [n.id as string, n]));
  const incoming = new Map<string, AnyRec[]>();
  for (const e of edges) {
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target)!.push(e);
  }

  const entry = new Map<string, Set<string>>();
  /** Region entries: the container's exit set flows into the region's entry node. */
  const seeds = new Map<string, () => Set<string>>();
  for (const n of nodes) {
    const body = n.config?.body;
    if (!body) continue;
    const bodyIds = new Set<string>((body.nodes ?? []).map((b: AnyRec) => b.id as string));
    const bodyTargets = new Set<string>((body.edges ?? []).map((b: AnyRec) => b.target as string));
    for (const id of bodyIds) {
      if (!bodyTargets.has(id)) seeds.set(id, () => new Set([...(entry.get(n.id) ?? []), ...binds(n)]));
    }
  }

  for (const n of nodes) {
    entry.set(n.id, n.type === 'start' ? new Set() : new Set(universe));
  }
  for (let pass = 0; pass < nodes.length + 2; pass++) {
    let changed = false;
    for (const n of nodes) {
      if (n.type === 'start') continue;
      const preds = incoming.get(n.id) ?? [];
      let next: Set<string>;
      if (seeds.has(n.id) && preds.length === 0) {
        next = seeds.get(n.id)!();
      } else if (preds.length === 0) {
        next = new Set(); // unreachable node — nothing is guaranteed
      } else {
        next = null as unknown as Set<string>;
        for (const e of preds) {
          const u = byId.get(e.source);
          const exit = new Set([...(entry.get(e.source) ?? []), ...(u ? binds(u) : [])]);
          next = next === null ? exit : new Set([...next].filter((v) => exit.has(v)));
        }
      }
      const prev = entry.get(n.id)!;
      if (prev.size !== next.size || [...next].some((v) => !prev.has(v))) {
        entry.set(n.id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return entry;
}

/** The variables guaranteed bound where `site`'s condition is evaluated. */
function guaranteedAt(flow: AnyRec, site: Site): Set<string> {
  const entry = boundOnEntry(flow);
  const node = graphOf(flow).nodes.find((n) => n.id === site.at);
  const base = new Set(entry.get(site.at) ?? []);
  // An EDGE condition is evaluated after its source node has run, so the source
  // node's own bindings count. A NODE condition is evaluated on entry.
  if (site.kind === 'edge' && node) for (const v of binds(node)) base.add(v);
  return base;
}

describe('every variable a flow condition reads is BOUND on every path to it', () => {
  const unbound = sites.flatMap((s) => {
    const flow = flows.find((f) => f.name === s.flow)!;
    const have = guaranteedAt(flow, s);
    return variableRoots(s.source)
      .filter((root) => !have.has(root))
      .map((root) => `${s.id}: reads \`${root}\`, which no node on every path to it binds`);
  });

  it('has no condition reading a variable the graph may leave unbound', () => {
    expect(
      unbound,
      'A flow condition reads a variable that some path reaching it never binds. On ' +
        'that path strict CEL aborts (`No such key: <var>`, or `Unknown variable: <var>` ' +
        'for the bare spelling), the engine records the run FAILED and the automation ' +
        'does not happen.\n\n' +
        'Do NOT fix this with `has(...)`. A guard would bury a policy ("a missing ' +
        'answer means No") inside a predicate and leave the graph defect in place. Bind ' +
        'the variable instead — an `assignment` node upstream of every reader, or a ' +
        '`get_record` whose `outputVariable` is that name. Declaring it in ' +
        '`flow.variables` does NOT bind it: FlowVariableSchema has no `defaultValue` and ' +
        'the engine binds a declared input only when the caller passed it in ' +
        '`context.params`.',
    ).toEqual([]);
  });

  it('the analysis has teeth: an unbound read on a synthetic flow is caught', () => {
    // Without this, a bug in `binds()` or the dataflow above would silently
    // make the sweep vacuous — it would report "all bound" for everything.
    const synthetic: AnyRec = {
      name: 'synthetic',
      type: 'screen',
      variables: [{ name: 'answer', type: 'boolean', isInput: true, isOutput: false }],
      nodes: [
        { id: 'start', type: 'start', label: 'Start', config: {} },
        { id: 'ask', type: 'screen', label: 'Ask', config: { fields: [{ name: 'answer', type: 'boolean' }] } },
        { id: 'yes', type: 'end', label: 'Yes' },
      ],
      edges: [
        { id: 's1', source: 'start', target: 'ask', type: 'default' },
        { id: 's2', source: 'ask', target: 'yes', type: 'default', condition: { dialect: 'cel', source: 'vars.answer == true' } },
      ],
    };
    const site: Site = {
      id: 'synthetic.edge:s2', flow: 'synthetic', at: 'ask', kind: 'edge',
      source: 'vars.answer == true',
    };
    // Declared in `flow.variables` AND collected by a screen — and still not
    // guaranteed, which is precisely the trap.
    expect(guaranteedAt(synthetic, site).has('answer')).toBe(false);

    // …and an `assignment` ahead of the screen fixes it, which is the remedy
    // `lead_conversion` now uses.
    const fixed: AnyRec = {
      ...synthetic,
      nodes: [
        synthetic.nodes[0],
        { id: 'init', type: 'assignment', label: 'Defaults', config: { assignments: { answer: false } } },
        ...synthetic.nodes.slice(1),
      ],
      edges: [
        { id: 's0', source: 'start', target: 'init', type: 'default' },
        { id: 's1', source: 'init', target: 'ask', type: 'default' },
        synthetic.edges[1],
      ],
    };
    expect(guaranteedAt(fixed, site).has('answer')).toBe(true);
  });

  it('binds `createOpportunity` before lead_conversion reads it', () => {
    // The concrete defect, named: an `assignment` node ahead of the screen, not
    // a `has()` guard on the edges.
    const flow = flows.find((f) => f.name === 'lead_conversion')!;
    const init = (flow.nodes as AnyRec[]).find((n) => n.type === 'assignment' && 'createOpportunity' in (n.config?.assignments ?? {}));
    expect(init, 'lead_conversion no longer seeds createOpportunity').toBeDefined();
    expect(init!.config.assignments.createOpportunity).toBe(false);
    for (const s of sites.filter((x) => x.flow === 'lead_conversion')) {
      expect(
        /has\(vars\.(createOpportunity|matchedAccount|matchedContact)\)/.test(s.source),
        `${s.id} guards a flow VARIABLE with has(...) — bind it in the graph instead`,
      ).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// The same properties, measured on the real engine instead of grepped
// ═══════════════════════════════════════════════════════════════════════════

describe('flow-variable conditions are TOTAL on the real engine', () => {
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
  const ev = (source: string, vars: AnyRec) =>
    (engine as unknown as {
      evaluateCondition(e: unknown, v: Map<string, unknown>): boolean;
    }).evaluateCondition({ dialect: 'cel', source }, new Map(Object.entries(vars)));

  it('is the reason the guards are needed: the unguarded forms abort', () => {
    // The abort table from the header, re-measured on THIS evaluator rather
    // than inherited from the record scope. If a platform upgrade makes strict
    // CEL tolerant, this test fails and the guards can be revisited — that is
    // the intended signal, not a nuisance.
    expect(abortOf('vars.X.f == 1', { X: {} })).toMatch(/No such key: f/);
    expect(abortOf('vars.X.f == 1', { X: null })).toMatch(/No such key: f/);
    expect(abortOf('vars.X.f == 1', {})).toMatch(/No such key: X/);
    expect(abortOf('X.f == 1', {})).toMatch(/Unknown variable: X/);
    expect(abortOf('vars.X != null', {})).toMatch(/No such key: X/);
    // A variable bound to `undefined` reads exactly like an unbound one.
    expect(abortOf('vars.X != null', { X: undefined })).toMatch(/No such key: X/);
    // has() passes an explicit null; the ordering comparison then aborts.
    expect(abortOf('has(vars.X) && has(vars.X.f) && vars.X.f > 3', { X: { f: null } }))
      .toMatch(/no such overload/);
    expect(abortOf('has(vars.X) && has(vars.X.f) && vars.X.f != null && vars.X.f > 3', { X: { f: null } }))
      .toBeNull();
  });

  it('only the vars.-scoped guard survives an UNBOUND variable', () => {
    // The single most important row of the table: the obvious bare spelling of
    // the guard does not protect, so guards in `src/flows/` are `vars.`-scoped.
    expect(abortOf('has(X.f)', {})).toMatch(/Unknown variable: X/);
    expect(abortOf('has(vars.X)', {})).toBeNull();
    expect(ev('has(vars.X)', {})).toBe(false);
    expect(ev('has(vars.X)', { X: null })).toBe(true);
    expect(ev('has(vars.X)', { X: { f: 1 } })).toBe(true);
    // …and `has(vars.X.f)` alone does NOT cover the unbound root.
    expect(abortOf('has(vars.X.f)', {})).toMatch(/No such key: X/);
    expect(ev('has(vars.X) && has(vars.X.f)', {})).toBe(false);
  });

  it.each(sites.map((s) => [s.id, s] as const))(
    '%s answers on every shape a get_record output can take',
    (_id, s) => {
      const roots = variableRoots(s.source);
      const fields = variableFieldReads(s.source);
      /** Values a root can hold: unbound is modelled by omitting the key. */
      const shapes: AnyRec[] = [{}];
      for (const root of roots) {
        const own = fields.filter((f) => f.root === root).map((f) => f.field);
        const candidates: unknown[] = [null, {}, Object.fromEntries(own.map((f) => [f, null]))];
        // Literal-derived values keep the probes TYPE-correct: filling a field
        // with an arbitrary value tests type agreement, not totality.
        for (const own1 of own) {
          // Values are drawn from the condition's OWN literals. Filling a field
          // with an arbitrary value would not test totality, it would test type
          // agreement: `amount = "x"` makes `amount > 500000` abort with
          // `no such overload: dyn<string> > int`, which is a mis-typed record
          // no driver produces. Straddling each numeric literal probes both
          // sides of an ordering test, which matters because CEL's `&&`
          // ABSORBS an error beside a false operand.
          const LITERAL = String.raw`"[^"]*"|-?\d+(?:\.\d+)?|true|false`;
          const ref = String.raw`(?:vars\.)?${root}\.${own1}\b`;
          const found = [
            ...s.source.matchAll(new RegExp(String.raw`${ref}\s*(?:==|!=|>=|<=|>|<)\s*(${LITERAL})`, 'g')),
            ...s.source.matchAll(new RegExp(String.raw`(${LITERAL})\s*(?:==|!=|>=|<=|>|<)\s*${ref}`, 'g')),
          ].map((m) => m[1]);
          let sawString = false;
          for (const raw of found) {
            if (raw.startsWith('"')) { candidates.push({ [own1]: raw.slice(1, -1) }); sawString = true; continue; }
            if (raw === 'true' || raw === 'false') { candidates.push({ [own1]: true }); candidates.push({ [own1]: false }); continue; }
            const n = Number(raw);
            candidates.push({ [own1]: n }, { [own1]: n - 1 }, { [own1]: n + 1 });
          }
          // Only where the field is compared to a STRING — so `!=` chains are
          // probed true as well, without mis-typing a numeric column.
          if (sawString) candidates.push({ [own1]: '__neither__' });
        }
        // Whole-variable candidates too, for `vars.X != null` style reads.
        candidates.push({ id: 'x' });
        const next: AnyRec[] = [];
        for (const base of shapes) for (const value of candidates) next.push({ ...base, [root]: value });
        shapes.splice(0, shapes.length, ...next.slice(0, 400));
      }
      const bad: string[] = [];
      for (const shape of shapes) {
        const abort = abortOf(s.source, shape);
        if (abort) { bad.push(`${JSON.stringify(shape)}: ${abort}`); break; }
      }
      expect(bad, `${s.id} aborted:\n  ${bad.join('\n  ')}`).toEqual([]);
    },
  );

  it('CEL && absorbs errors beside a false operand — why this went unnoticed', () => {
    // The same mechanism `flow-condition-totality.test.ts` documents for the
    // record scope, re-measured here: an unguarded condition answers fine for
    // every run that fails some OTHER conjunct and aborts precisely on the runs
    // the flow was written to act on.
    expect(abortOf('vars.missing == 1 && vars.b == "no"', { b: 'x' })).toBeNull();
    expect(abortOf('vars.missing == 1 && vars.b == "x"', { b: 'x' })).toMatch(/No such key: missing/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// End-to-end, on the engine + driver that actually produce the shapes
// ═══════════════════════════════════════════════════════════════════════════

describe('the two defects, reproduced end-to-end', () => {
  const objMap = Object.fromEntries(objects.map((o) => [o.name as string, o]));

  interface Booted {
    ql: AnyRec;
    engine: AnyRec;
    close(): Promise<void>;
  }

  async function boot(flowNames: string[]): Promise<Booted> {
    const silent: any = { info() {}, warn() {}, error() {}, debug() {}, trace() {} };
    silent.child = () => silent;

    const ql: AnyRec = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: objMap as never,
      // `logger` is honoured at runtime but is not on the published options
      // type — without it this suite prints every engine INFO line.
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
    // `approval` ships in `plugin-approvals` and is registered by the runtime,
    // not by `installBuiltinNodes`. Stubbed to the `approve` branch so the run
    // reaches the tier gate — the approval DECISION is not what is under test.
    (engine as unknown as AnyRec).registerNodeExecutor({
      type: 'approval',
      descriptor: { type: 'approval', version: '1.0.0', name: 'Approval (test stub)', category: 'approval', source: 'builtin' },
      async execute() { return { success: true, branchLabel: 'approve' }; },
    });

    for (const name of flowNames) {
      const flow = flows.find((f) => f.name === name);
      expect(flow, `flow ${name} is not registered on the stack`).toBeDefined();
      engine.registerFlow(name, flow as never);
    }
    return { ql, engine: engine as unknown as AnyRec, close: () => ql.close() };
  }

  /** The invocation contract the console's flow-action trigger sends. */
  const asUser = (params: AnyRec) => ({ userId: 'u1', user: { id: 'u1' }, params });

  it('findOne answers a miss with null — the precondition for class 1', async () => {
    const b = await boot([]);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const miss = await api.object('crm_account').findOne({ where: { name: '__nothing__' } });
      // Not `toBeFalsy()`: `null` specifically is what `get_record` then binds,
      // and `vars.X.f` on a null X aborts with `No such key: f`.
      expect(miss).toBeNull();
      // …while `crm_campaign.status` IS required, so the sparse-COLUMN variant
      // was never the exposure here. If that changes this assertion fails and
      // the guard's second clause starts earning its keep.
      const camp = await api.object('crm_campaign').insert({
        name: 'Spring', type: 'email', status: 'planning',
        start_date: '2026-01-01', end_date: '2026-03-01',
      });
      const stored = await api.object('crm_campaign').findOne({ where: { id: camp.id } });
      expect('status' in (stored ?? {})).toBe(true);
    } finally {
      await b.close();
    }
  }, 60_000);

  it('campaign_enrollment: a campaign that vanished still reaches a verdict', async () => {
    const b = await boot(['campaign_enrollment']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const camp = await api.object('crm_campaign').insert({
        name: 'Spring', type: 'email', status: 'planning',
        start_date: '2026-01-01', end_date: '2026-03-01',
      });
      // Deleted (or hidden by sharing) between the action click and the run.
      await api.object('crm_campaign').delete({ where: { id: camp.id } });

      const started = await b.engine.execute('campaign_enrollment', asUser({ recordId: camp.id }));
      expect(started.status).toBe('paused');
      const done = await b.engine.resume(started.runId, { variables: { leadStatus: 'new' } });
      // Before the guard: `condition failed to evaluate as CEL: No such key: status`.
      expect(done.error ?? null).toBeNull();
      expect(done.success).not.toBe(false);
    } finally {
      await b.close();
    }
  }, 60_000);

  it('campaign_enrollment: an OPEN campaign still enrols, so the guard did not close the door', async () => {
    const b = await boot(['campaign_enrollment']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const camp = await api.object('crm_campaign').insert({
        name: 'Spring', type: 'email', status: 'planning',
        start_date: '2026-01-01', end_date: '2026-03-01',
      });
      await api.object('crm_lead').insert({
        first_name: 'Jo', last_name: 'Smith', company: 'Acme',
        status: 'new', email: 'jo@acme.com', email_opt_out: false, is_converted: false,
      });
      const started = await b.engine.execute('campaign_enrollment', asUser({ recordId: camp.id }));
      const done = await b.engine.resume(started.runId, { variables: { leadStatus: 'new' } });
      expect(done.error ?? null).toBeNull();
      const members = await api.object('crm_campaign_member').find({ where: { crm_campaign: camp.id } });
      expect(members.length, 'the guard suppressed a legitimate enrolment').toBe(1);
    } finally {
      await b.close();
    }
  }, 60_000);

  it('lead_conversion: a resume signal that omits the untouched checkbox still converts', async () => {
    const b = await boot(['lead_conversion']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const lead = await api.object('crm_lead').insert({
        // `company_normalized` is authored here because this harness registers
        // FLOWS but no hooks — in production `lead_duplicate_check` derives it
        // from `company` on the insert (#626). Without it the conversion's
        // account lookup has no filter value and `get_record` refuses to run,
        // which is a fixture gap, not the defect this test is about.
        first_name: 'Sam', last_name: 'Doe', company: 'Globex',
        company_normalized: 'globex',
        status: 'qualified', email: 'sam@globex.com',
      });
      const started = await b.engine.execute('lead_conversion', asUser({ recordId: lead.id }));
      expect(started.status).toBe('paused');
      // The runner posts only what the user touched — the checkbox was left
      // alone, so `createOpportunity` is absent from the signal.
      const done = await b.engine.resume(started.runId, { variables: {} });
      // Before the binding: `condition failed to evaluate as CEL: No such key: createOpportunity`.
      expect(done.error ?? null).toBeNull();
      const stored = await api.object('crm_lead').findOne({ where: { id: lead.id } });
      expect(stored?.is_converted, 'the lead was never marked converted').toBe(true);
      // …and the default really is "no opportunity", matching the screen field.
      expect(stored?.converted_opportunity ?? null).toBeNull();
    } finally {
      await b.close();
    }
  }, 60_000);

  it('lead_conversion: an explicit yes still creates the opportunity', async () => {
    const b = await boot(['lead_conversion']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const lead = await api.object('crm_lead').insert({
        // See the note on the previous test: hook-derived key, hand-authored
        // because this harness has no hooks (#626).
        first_name: 'Jo', last_name: 'Smith', company: 'Acme',
        company_normalized: 'acme',
        status: 'qualified', email: 'jo@acme.com',
      });
      const started = await b.engine.execute('lead_conversion', asUser({ recordId: lead.id }));
      const done = await b.engine.resume(started.runId, {
        variables: { createOpportunity: true, opportunityName: 'Acme Deal', opportunityAmount: 50_000 },
      });
      expect(done.error ?? null).toBeNull();
      const opp = await api.object('crm_opportunity').findOne({ where: { name: 'Acme Deal' } });
      expect(opp, 'the seeded default overrode the user answer').toBeTruthy();
    } finally {
      await b.close();
    }
  }, 60_000);

  it('demo_bootstrap: a zero-user org completes instead of aborting', async () => {
    // The `vars.firstUser` reads measured CLEAN — `get_user` dominates them and
    // binds `null`. This pins that, so a future edit that moves the read above
    // the `get_record` is caught here rather than on a demo org.
    const b = await boot(['demo_bootstrap']);
    try {
      const done = await b.engine.execute('demo_bootstrap', {});
      expect(done.error ?? null).toBeNull();
      expect(done.success).not.toBe(false);
    } finally {
      await b.close();
    }
  }, 60_000);

  it('quote_generation: an ordinary run still advances the stage', async () => {
    const b = await boot(['quote_generation']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const account = await api.object('crm_account').insert({ name: 'Acme Corp' });
      const opp = await api.object('crm_opportunity').insert({
        name: 'Big Deal', amount: 750_000, stage: 'prospecting',
        close_date: '2026-12-31', crm_account: account.id,
      });
      const started = await b.engine.execute('quote_generation', asUser({ recordId: opp.id }));
      const done = await b.engine.resume(started.runId, {
        variables: { quoteName: 'Q-1', expirationDays: 30, discount: 0 },
      });
      expect(done.error ?? null).toBeNull();
      const stored = await api.object('crm_opportunity').findOne({ where: { id: opp.id } });
      expect(stored?.stage, 'the guard suppressed a legitimate stage advance').toBe('proposal');
    } finally {
      await b.close();
    }
  }, 60_000);

  it('opportunity_approval: both tiers still route correctly through the guarded gate', async () => {
    const b = await boot(['opportunity_approval_on_create']);
    try {
      const api = b.ql.createContext({ isSystem: true });
      const account = await api.object('crm_account').insert({ name: 'Acme Corp' });
      const run = async (amount: number) => {
        const opp = await api.object('crm_opportunity').insert({
          name: `Deal ${amount}`, amount, stage: 'negotiation',
          close_date: '2026-12-31', crm_account: account.id,
        });
        const fresh = await api.object('crm_opportunity').findOne({ where: { id: opp.id } });
        const res = await b.engine.execute('opportunity_approval_on_create', {
          record: fresh, previous: null, userId: 'u1', user: { id: 'u1' }, params: {},
        });
        return { res, id: opp.id };
      };
      for (const amount of [750_000, 200_000]) {
        const { res } = await run(amount);
        // Deliberately narrower than "the run succeeded": this flow also fails
        // downstream in a user-less harness (`notify` addressed to
        // `{oppRecord.owner}`, which the owner default cannot fill without a
        // user). That is a real but SEPARATE concern; what is asserted here is
        // that the tier gate reached a verdict.
        expect(
          /failed to evaluate as CEL|No such key|no such overload|Unknown variable/.test(res.error ?? ''),
          `tier gate aborted at ${amount}: ${res.error}`,
        ).toBe(false);
        expect(res.output?.skipped ?? false, `flow did not fire at ${amount}`).toBe(false);
      }
    } finally {
      await b.close();
    }
  }, 60_000);
});
