// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { P } from '@objectstack/spec';
import { OpportunityStagnationFlow } from '../src/flows/opportunity-stagnation.flow';
import { allFlows } from '../src/flows/index';
import { makeFlowHarness } from './helpers/flow-harness';

/**
 * ═══ HOUSE RULE: a `decision` node's OUT-EDGES are the only branch site ═════
 *
 * A `decision` node in this repo carries **no predicate of its own**. It is a
 * bare gateway; the branching lives entirely on its out-edges' `condition`.
 * This file enforces that, so you do not have to remember it.
 *
 * ### The defect this closes (#650)
 *
 * `@objectstack/service-automation` evaluates a flow condition in exactly
 * three places, and a `decision` node's SINGULAR `config.condition` is not one
 * of them:
 *
 *   | site                              | read by                              |
 *   | --------------------------------- | ------------------------------------ |
 *   | START node `config.condition`     | `AutomationEngine.execute`           |
 *   | `decision` `config.conditions[]`  | the decision executor (PLURAL)       |
 *   | every out-edge's `condition`      | `AutomationEngine.traverseNext`      |
 *   | `decision` `config.condition`     | **nobody — inert metadata**          |
 *
 * Measured against the installed engine and spec:
 *
 *   - `service-automation/dist/index.js` — the decision executor reads
 *     `const conditions = config?.conditions ?? []` and returns
 *     `{ success: true }` with NO `branchLabel` when that array is empty. (The
 *     issue described it as returning `branchLabel: 'default'`; that was the
 *     pre-#4414 behaviour and no longer holds. The singular key is inert
 *     either way — only the mechanism differs.)
 *   - `spec/dist/automation/index.js` — `DecisionConfigSchema` declares
 *     exactly ONE key, `conditions`. There is no singular `condition` in a
 *     decision node's contract at all.
 *   - `FlowNodeSchema.config` is an open `z.record`, and `decision` publishes
 *     no descriptor `configSchema`, so the engine's undeclared-config-key
 *     rejection (#4277) explicitly EXEMPTS it. Nothing at any layer rejects
 *     the key.
 *
 * So 8 `decision` nodes across 4 flows authored a predicate that read like the
 * decision and decided nothing. Behaviour was correct only because every one
 * of those predicates was duplicated onto the out-edge, with nothing enforcing
 * the duplication: editing the node copy alone changed nothing, silently. The
 * node copy is the one a reader is most likely to edit, because it is the one
 * that reads like the decision.
 *
 * ### Why the EDGES were made authoritative, and not the node (#650, 2b)
 *
 * The other option was to convert every node to the engine-supported plural
 * `config.conditions: [{ label, expression }]` and let the edges follow its
 * labels — one authoritative site, no duplication. That was measured on the
 * real engine and REJECTED, because it fails open on this repo's dominant gate
 * shape. `decisionFailsOpenWithoutADefaultSink` below is that measurement,
 * kept executable:
 *
 * 7 of the 8 sites are single-out-edge SKIP gates ("already nudged? then do
 * nothing") whose false branch goes nowhere. Give such a node `conditions[]`
 * and drop the now-redundant edge predicate, and when the condition is FALSE
 * the executor returns `branchLabel: 'default'`; `traverseNext` finds no
 * out-edge labelled `'default'` and none marked `isDefault`, logs an advisory
 * warning, and then — by design, so a run mid-flight cannot die on a metadata
 * error — falls back to evaluating THE FULL EDGE SET. The surviving edge no
 * longer carries a condition, so it is unconditional and runs. The gate
 * silently inverts: the flow performs the action the decision just said not to.
 *
 * Making that safe needs an `isDefault` sink edge per gate, pointing at a
 * no-op node invented purely to satisfy routing. That is a workaround, and it
 * makes the node-authoritative shape a trap: forget the sink and the gate
 * reverses. Edge-authoritative has no such failure mode (an unmatched edge
 * simply does not traverse), needs no invented nodes, and was already the
 * shape 9 of the repo's 17 decision nodes used. Fewer moving parts, and the
 * mistake is structurally unavailable rather than merely tested for.
 *
 * The cost of 2b is real and is priced in: two branches that must partition
 * carry hand-written complementary predicates (`lead_assignment`'s
 * `rating >= 4` / `rating < 4`), which can drift apart. That is a DIFFERENT
 * invariant — totality/partition — and it is owned by
 * `test/flow-condition-totality.test.ts` and
 * `test/flow-variable-conditions.test.ts`, which already sweep edge
 * conditions. This file owns only "the node states no predicate".
 */

type AnyRec = Record<string, any>;

/** A flow's nodes and edges with every `loop` body region flattened in. */
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

interface DecisionSite {
  /** `<flow>.<nodeId>` — stable enough to name in a failure message. */
  id: string;
  node: AnyRec;
  outEdges: AnyRec[];
}

const decisions: DecisionSite[] = (allFlows as AnyRec[]).flatMap((flow) => {
  const { nodes, edges } = graphOf(flow);
  return nodes
    .filter((n) => n.type === 'decision')
    .map((node) => ({
      id: `${flow.name}.${node.id}`,
      node,
      outEdges: edges.filter((e) => e.source === node.id),
    }));
});

describe('decision nodes state no predicate of their own', () => {
  it('finds decision nodes to check at all', () => {
    // Guard the guard: a typo in the walk above would make every sweep below
    // pass over an empty list. The loop-body arm matters especially — most of
    // this repo's gates are nested inside a `loop`, and a top-level-only walk
    // would silently skip them.
    expect(decisions.length).toBeGreaterThanOrEqual(15);
    expect(
      decisions.some((d) => d.id.includes('opportunity_stagnation')),
      'the loop-body arm of the walk found nothing',
    ).toBe(true);
  });

  it('no decision node carries the inert singular `config.condition`', () => {
    const offenders = decisions
      .filter((d) => d.node.config?.condition !== undefined)
      .map((d) => d.id);

    expect(
      offenders,
      'These `decision` nodes declare `config.condition`, which NO reader in ' +
        '@objectstack/service-automation ever evaluates — the decision executor reads ' +
        'the PLURAL `config.conditions[]`, and nothing else. The key is not in ' +
        "`DecisionConfigSchema` either, and `decision` publishes no descriptor " +
        'configSchema, so the engine\'s undeclared-key rejection exempts it: nothing ' +
        'at any layer will tell you. The branch is decided entirely by the out-edge ' +
        "`condition`s, so a copy here is inert metadata that reads like the live " +
        'predicate and is free to drift away from it. Delete it and author the ' +
        'predicate on the out-edge (#650).',
    ).toEqual([]);
  });

  it('every decision node actually decides something', () => {
    // A `decision` whose out-edges carry no conditions and which declares no
    // `conditions[]` is an unconditional fan-out wearing a gateway's label:
    // every successor runs. That is the shape #650 would have produced had the
    // inert node copies been deleted without checking the edges first.
    const inert = decisions
      .filter(
        (d) =>
          !d.outEdges.some((e) => e.condition !== undefined) &&
          !Array.isArray(d.node.config?.conditions),
      )
      .map((d) => d.id);

    expect(
      inert,
      'These `decision` nodes branch on nothing: no out-edge carries a `condition` ' +
        'and the node declares no `conditions[]`, so EVERY successor runs on every ' +
        'pass. Put the predicate on the out-edges.',
    ).toEqual([]);
  });

  it('a decision that does declare `conditions[]` is routable and has a default sink', () => {
    // Nothing in the repo takes this shape today, and the executable proof
    // below shows why it is a trap. But the plural key IS the engine-supported
    // form, so if someone adopts it deliberately, these are the two conditions
    // that keep it from failing open — checked here rather than re-derived
    // after the next incident.
    const broken: string[] = [];
    for (const d of decisions) {
      const declared = d.node.config?.conditions;
      if (!Array.isArray(declared) || declared.length === 0) continue;

      const labels = new Set(d.outEdges.map((e) => e.label));
      for (const c of declared as AnyRec[]) {
        if (!labels.has(c?.label)) {
          broken.push(`${d.id}: no out-edge carries label ${JSON.stringify(c?.label)}`);
        }
      }
      const hasSink = d.outEdges.some((e) => e.isDefault === true || e.label === 'default');
      if (!hasSink) {
        broken.push(
          `${d.id}: declares conditions[] but has no default sink out-edge ` +
            '(`isDefault: true`, or `label: \'default\'`)',
        );
      }
    }

    expect(
      broken,
      'A `decision` declaring `conditions[]` selects a branch LABEL, and ' +
        '`traverseNext` restricts traversal to the out-edge carrying it. When every ' +
        "declared condition is false the label is `'default'`. If no out-edge claims " +
        'the selected label, the engine logs a warning and falls back to evaluating ' +
        'EVERY out-edge — so an out-edge with no `condition` of its own runs anyway ' +
        'and the gate inverts. See the executable proof in this file.',
    ).toEqual([]);
  });
});

describe('the mechanism, on the real engine', () => {
  /**
   * The issue's core claim, reproduced end to end on a REAL repo flow: edit
   * the node condition alone and the flow keeps its old routing, silently.
   *
   * `opportunity_stagnation` is the vehicle because its gate is the plain
   * idempotency shape — a second sweep must not re-nudge. We inject the
   * INVERSE of the live edge predicate onto the node. Were the node copy read
   * at all, the gate would flip and the second sweep would duplicate. It does
   * not: the run is byte-identical to the control.
   */
  const seedOpps = () => {
    const day = (n: number) =>
      new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    return [
      { id: 'o_stalled', name: 'Stalled Deal', stage: 'proposal', stage_entry_date: day(-30), owner_id: 'rep1' },
    ];
  };

  const sweepTwice = async (flow: AnyRec) => {
    const h = makeFlowHarness(
      { opportunity_stagnation: flow as never },
      { crm_opportunity: seedOpps(), crm_task: [] },
    );
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });
    return { tasks: h.store.crm_task.length, notifications: h.notifications.length };
  };

  it('a decision node`s singular `config.condition` changes NOTHING', async () => {
    const control = await sweepTwice(OpportunityStagnationFlow as AnyRec);

    // Same flow, with the inverse of the live edge predicate planted on the
    // gate node. `existingStallTask != null` is exactly "nudge only when a
    // nudge already exists" — the opposite of what the flow does.
    const tampered = structuredClone(OpportunityStagnationFlow) as AnyRec;
    const gate = graphOf(tampered).nodes.find((n) => n.id === 'check_not_nudged');
    expect(gate, 'check_not_nudged not found — the flow was restructured').toBeDefined();
    gate!.config = { ...(gate!.config ?? {}), condition: P`existingStallTask != null` };

    const injected = await sweepTwice(tampered);

    expect(control, 'the control sweep did not nudge exactly once').toEqual({
      tasks: 1,
      notifications: 1,
    });
    expect(
      injected,
      'Planting the INVERSE predicate on the decision node changed the flow\'s ' +
        'routing. If this ever fails, the engine gained a reader for the singular ' +
        '`config.condition` on a decision node and this whole file needs re-deriving.',
    ).toEqual(control);
  });

  /**
   * Why the node was NOT made authoritative (#650, option 2a rejected).
   *
   * Reverse verification, direction decided before running: converting a
   * single-out-edge skip gate to `conditions[]` and removing the now-redundant
   * edge predicate should make the CLOSED gate run its action anyway. It does.
   */
  it('a node-authoritative decision with no default sink FAILS OPEN', async () => {
    const gateFlow = (nodeAuthoritative: boolean): AnyRec => ({
      name: 'probe',
      label: 'Probe',
      type: 'autolaunched',
      status: 'active',
      runAs: 'system',
      variables: [],
      nodes: [
        { id: 'start', type: 'start', label: 'Start' },
        {
          id: 'find', type: 'get_record', label: 'Already nudged?',
          config: { objectName: 'crm_task', filter: { subject: 'stall' }, outputVariable: 'existingStallTask' },
        },
        {
          id: 'gate', type: 'decision', label: 'First Nudge?',
          ...(nodeAuthoritative
            ? { config: { conditions: [{ label: 'First nudge', expression: 'existingStallTask == null' }] } }
            : {}),
        },
        {
          id: 'act', type: 'create_record', label: 'Nudge',
          config: { objectName: 'crm_audit', fields: { note: 'NUDGED' } },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'find', type: 'default' },
        { id: 'e2', source: 'find', target: 'gate', type: 'default' },
        {
          id: 'e3', source: 'gate', target: 'act', type: 'conditional', label: 'First nudge',
          // Node-authoritative means the predicate lives ONLY on the node —
          // that is the whole point of the shape, and the whole trap.
          ...(nodeAuthoritative ? {} : { condition: P`existingStallTask == null` }),
        },
      ],
    });

    // Gate CLOSED: a stall task already exists, so the action must NOT run.
    const runClosed = async (nodeAuthoritative: boolean) => {
      const h = makeFlowHarness(
        { probe: gateFlow(nodeAuthoritative) as never },
        { crm_task: [{ id: 't1', subject: 'stall' }], crm_audit: [] },
      );
      await h.run('probe', {}, { event: 'schedule' });
      return (h.store.crm_audit ?? []).map((r: AnyRec) => r.note);
    };

    expect(
      await runClosed(false),
      'the edge-authoritative shape this repo uses must gate correctly',
    ).toEqual([]);

    expect(
      await runClosed(true),
      'If this is now [] the engine stopped falling back to the full edge set when ' +
        'no out-edge claims the selected branch label, and making a decision node ' +
        'authoritative became safe. Re-open the 2a/2b choice in #650 — do not just ' +
        'delete this case.',
    ).toEqual(['NUDGED']);
  });
});
