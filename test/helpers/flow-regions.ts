// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { FLOW_REGION_SLOTS_BY_TYPE } from '@objectstack/spec/automation';
import type { AnyRec } from './metadata-fixtures';

/**
 * The region descent, once — resolved through the platform's own slot map.
 *
 * ## Why this exists
 *
 * A dozen suites in this directory hand-rolled the same walk over a flow's
 * nodes, and every one of them knew about exactly one region: `loop`'s
 * `config.body`. That was enough while a loop body held its work directly.
 * Since `src/flows/_guarded-iteration.ts` the work sits one region deeper — a
 * body is one `try_catch` guard whose `try` region holds what used to be the
 * body — and a walk that stops at `config.body.nodes` finds the guard and
 * nothing under it.
 *
 * Half those walks went RED, which is the good failure. The other half stayed
 * GREEN and stopped inspecting anything: `demo-staffing`'s "ships no flow node
 * that writes an identity table" and `flow-variable-conditions`' condition
 * census both answer questions of the form "nothing in this tree does X", and a
 * walk that reaches an empty tree answers them vacuously. That is the failure
 * mode this module exists to make structural rather than remembered.
 *
 * ## Why the platform's slot map rather than a hand-written key list
 *
 * `FLOW_REGION_SLOTS_BY_TYPE` is the same table the engine's `runRegion`, the
 * spec's `collectFlowGraphs` and `objectstack lint` all read: `loop.body`,
 * `parallel.branches` (many), `try_catch.try` and `try_catch.catch`. Reading it
 * rather than restating it means the day a fifth region slot is added, these
 * suites descend into it without anybody remembering they exist — which is the
 * failure this repo has now had twice.
 *
 * `collectFlowGraphs` itself is typed on `FlowNodeParsed`, i.e. on POST-parse
 * flows; these suites read the authored `AnyRec` metadata straight out of
 * `src/flows/**`, so calling it would need a cast in both directions at every
 * site. This module is that same descent over the authored shape.
 */

/**
 * The regions a node declares, in slot order. A node type with no regions
 * (everything but `loop` / `parallel` / `try_catch`) yields none.
 */
export const regionsOf = (node: AnyRec): AnyRec[] => {
  const out: AnyRec[] = [];
  for (const slot of FLOW_REGION_SLOTS_BY_TYPE.get(String(node?.type)) ?? []) {
    const value = (node?.config ?? {})[slot.key];
    const regions = slot.arity === 'many' ? (Array.isArray(value) ? value : []) : [value];
    for (const region of regions) {
      if (region && Array.isArray(region.nodes)) out.push(region as AnyRec);
    }
  }
  return out;
};

/** Every node nested inside `node`'s regions, at any depth. `node` itself is NOT included. */
export const nodesUnder = (node: AnyRec): AnyRec[] =>
  regionsOf(node).flatMap((region) =>
    (region.nodes as AnyRec[]).flatMap((child) => [child, ...nodesUnder(child)]));

/** Every edge declared by `node`'s regions, at any depth. `node`'s own out-edges are NOT included. */
export const edgesUnder = (node: AnyRec): AnyRec[] =>
  regionsOf(node).flatMap((region) => [
    ...((region.edges ?? []) as AnyRec[]),
    ...(region.nodes as AnyRec[]).flatMap(edgesUnder),
  ]);

/** Every node of a flow, its own and every node in every region, at any depth. */
export const flowNodesDeep = (flow: AnyRec): AnyRec[] =>
  ((flow?.nodes ?? []) as AnyRec[]).flatMap((n) => [n, ...nodesUnder(n)]);

/**
 * Every node AND every edge of a flow, regions flattened into one graph.
 *
 * Flattening edges the way the nodes are flattened is what the suites reading
 * this want: a region's edges connect region nodes, and a walker asking "which
 * edge carries this predicate" has no use for the region boundary.
 */
export const flowGraphDeep = (flow: AnyRec): { nodes: AnyRec[]; edges: AnyRec[] } => {
  const nodes: AnyRec[] = [];
  const edges: AnyRec[] = [...((flow?.edges ?? []) as AnyRec[])];
  const visit = (ns: AnyRec[]) => {
    for (const n of ns ?? []) {
      nodes.push(n);
      for (const region of regionsOf(n)) {
        edges.push(...((region.edges ?? []) as AnyRec[]));
        visit(region.nodes as AnyRec[]);
      }
    }
  };
  visit((flow?.nodes ?? []) as AnyRec[]);
  return { nodes, edges };
};
