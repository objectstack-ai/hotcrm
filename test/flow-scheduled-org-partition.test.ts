// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { FLOW_REGION_SLOTS_BY_TYPE } from '@objectstack/spec/automation';
import * as allFlows from '../src/flows';
import { ContractRenewalFlow } from '../src/flows/contract-renewal.flow';
import { OpportunityStagnationFlow } from '../src/flows/opportunity-stagnation.flow';
import { ForecastSnapshotFlow } from '../src/flows/forecast-snapshot.flow';
import forecastDerive from '../src/objects/forecast.hook';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';
import { COMPOSITION_ENV_VAR } from '../src/data/index';

/**
 * Scheduled sweeps must declare `organization_id` on every `create_record` (#700).
 *
 * ─── Why the app owns this, and not the platform ───────────────────────────
 *
 * A schedule trigger carries no acting user and no organization. Upstream
 * objectstack#5494 (shipped in `@objectstack/service-automation@17.0.0`) made a
 * `runAs:'system'` `create_record` stamp `created_by` / `owner_id` /
 * `organization_id` from the TRIGGER identity — which fixes user-triggered
 * system runs and, by construction, cannot fix a genuinely user-less one.
 *
 * The follow-up ruling (objectstack#6155, 2026-08-07, Q1=B / Q2=A / Q3=A) split
 * what remains in two:
 *
 *  - `created_by` / `owner_id` stay NULL on a user-less run. Settled contract
 *    (ADR-0118 D1): there is no acting user, and a pseudo-user sentinel is the
 *    banned alternative. NOT a defect, and nothing here asserts otherwise.
 *  - `organization_id` DOES have an answer, and Q2=A puts it in the flow
 *    author's hands: declare it in the `create_record` node's `fields`.
 *    Fill-only precedence (objectstack#6153) guarantees an author-set value
 *    wins over the engine's.
 *
 * A NULL `organization_id` is not untidy, it is a partition escape: an
 * `(organization_id, …)` unique index does not constrain across NULL, and
 * org-scoped reads never see the row.
 *
 * ─── Why a metadata sweep AND a runtime resolution test ─────────────────────
 *
 * These two halves fail in different directions and neither implies the other.
 *
 * `declares_the_key` walks every flow the app ships, using the PLATFORM's own
 * region map (`FLOW_REGION_SLOTS_BY_TYPE`) and the same schedule-binding test
 * the publish guard applies — so it covers the fifth sweep someone adds next
 * month, which is exactly how the original four came to differ from each other.
 *
 * `the_key_resolves` is the half a spelling check cannot do. The publish guard
 * only asks whether the key is DECLARED and non-empty; it cannot know whether
 * the token names a row that carries the column. Measured on 17.0.0: a token
 * whose source key is ABSENT interpolates to `undefined` and lands as NULL —
 * so a declaration reading `'{currentOwner.organization_id}'` would turn the
 * guard green over rows still born outside every partition. That is not
 * hypothetical for this app: `sys_user` declares NO `organization_id` (identity
 * is global; it carries `primary_business_unit_id` instead), and `sys_user` is
 * precisely the loop item of `forecast_snapshot`. Its declaration therefore
 * binds `{ownerAnyDeal.organization_id}` — the `crm_opportunity` the
 * `find_any_deal` gate already proved non-null — and the case below seeds a
 * user WITHOUT the column on purpose, so the wrong source fails here.
 */

/** A record-writing node reached anywhere inside a flow, with its path. */
interface WriteNode {
  flow: string;
  path: string;
  nodeId: string;
  type: 'create_record' | 'update_record';
  fields: Rec;
  /** The node's own `config.filter`. On an `update_record` it names the swept row. */
  filter: Rec;
}

const isRec = (v: unknown): v is Rec =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Walk a flow's nodes INCLUDING every structured control-flow region, resolved
 * through the platform's own slot map rather than a hand-listed
 * `loop.config.body`. All four nodes at issue sit inside a `loop`, and a walk
 * that only knew about `loop` would silently stop covering a sweep the day one
 * is authored inside `parallel` or `try_catch`.
 */
function walkNodes(flow: Rec, flowName: string): WriteNode[] {
  const out: WriteNode[] = [];
  const visit = (nodes: unknown, basePath: string, depth: number): void => {
    if (!Array.isArray(nodes) || depth > 16) return;
    nodes.forEach((raw, index) => {
      if (!isRec(raw)) return;
      const path = `${basePath}[${index}]`;
      if (raw.type === 'create_record' || raw.type === 'update_record') {
        const config = isRec(raw.config) ? raw.config : {};
        out.push({
          flow: flowName,
          path,
          nodeId: typeof raw.id === 'string' ? raw.id : `#${index}`,
          type: raw.type,
          fields: isRec(config.fields) ? config.fields : {},
          filter: isRec(config.filter) ? config.filter : {},
        });
      }
      const slots = typeof raw.type === 'string'
        ? FLOW_REGION_SLOTS_BY_TYPE.get(raw.type)
        : undefined;
      if (!slots || !isRec(raw.config)) return;
      for (const slot of slots) {
        const value = (raw.config as Rec)[slot.key];
        if (slot.arity === 'many') {
          if (!Array.isArray(value)) continue;
          value.forEach((branch, b) => {
            if (!isRec(branch)) return;
            visit(branch.nodes, `${path}.config.${slot.key}[${b}].nodes`, depth + 1);
          });
          continue;
        }
        if (!isRec(value)) continue;
        visit(value.nodes, `${path}.config.${slot.key}.nodes`, depth + 1);
      }
    });
  };
  visit(flow.nodes, 'nodes', 0);
  return out;
}

/**
 * Does this flow bind to a schedule trigger? Mirrors the shipped guard
 * (`platform-schedule-create-record-org-missing`,
 * `@objectstack/metadata-protocol`): a `record-*` trigger or a `timeRelative`
 * config resolves an organization from the triggering ROW and is excluded; what
 * remains is `type: 'schedule'` or a `start` node carrying a cron.
 */
function bindsToScheduleTrigger(flow: Rec): boolean {
  const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
  const start = nodes.find((n) => isRec(n) && n.type === 'start');
  const config = isRec((start as Rec | undefined)?.config) ? ((start as Rec).config as Rec) : {};
  const triggerType = config.triggerType;
  if (typeof triggerType === 'string' && triggerType.startsWith('record-')) return false;
  if (Array.isArray(triggerType)
    && triggerType.some((t) => typeof t === 'string' && t.startsWith('record-'))) return false;
  if (isRec(config.timeRelative)) return false;
  return config.schedule != null || flow.type === 'schedule';
}

/** Every schedule-bound flow this app ships. */
const scheduledFlows: Rec[] = Object.values(allFlows as Record<string, unknown>)
  .filter((f): f is Rec => isRec(f) && Array.isArray(f.nodes))
  .filter((f) => bindsToScheduleTrigger(f));

const flowName = (f: Rec): string => (typeof f.name === 'string' ? f.name : '(unnamed)');

/** …and every record-writing node on one of them, from a single walk. */
const scheduledWriteNodes: WriteNode[] = scheduledFlows
  .flatMap((f) => walkNodes(f, flowName(f)));

/** Every `create_record` node this app ships on a schedule-bound flow. */
const scheduledCreateNodes: WriteNode[] = scheduledWriteNodes
  .filter((n) => n.type === 'create_record');

/** Every `update_record` one (#1363). */
const scheduledUpdateNodes: WriteNode[] = scheduledWriteNodes
  .filter((n) => n.type === 'update_record');

describe('scheduled create_record declares organization_id (#700)', () => {
  it('finds the scheduled create_record nodes at all', () => {
    // Guards the guard. Every assertion below is over this list, so a walk that
    // silently stopped matching (a renamed region key, a restructured flow)
    // would otherwise pass by asserting nothing at all.
    expect(
      scheduledCreateNodes.length,
      'the region walk found no scheduled create_record nodes — it is broken, not clean',
    ).toBeGreaterThan(0);
  });

  it('declares a non-empty organization_id on every one of them', () => {
    const missing = scheduledCreateNodes
      .filter((n) => {
        const v = n.fields.organization_id;
        if (v === undefined || v === null) return true;
        return typeof v === 'string' && v.trim() === '';
      })
      .map((n) => `${n.flow} · ${n.nodeId} (${n.path}.config.fields.organization_id)`);

    expect(
      missing,
      'A schedule trigger carries no organization, so these nodes create rows with\n'
        + 'organization_id NULL — outside every org partition, where an\n'
        + '(organization_id, …) unique index does not constrain and org-scoped reads\n'
        + 'never see the row. Declare the owning org on the node (objectstack#6155 Q2=A);\n'
        + 'the source must be a row that CARRIES the column — see the header:\n  '
        + missing.join('\n  '),
    ).toEqual([]);
  });
});

/**
 * The half a spelling check cannot do: run the real `AutomationEngine` and read
 * the column off the row it actually wrote.
 */
describe('the declared organization_id actually resolves (#700)', () => {
  const ORG = 'org_alpha';

  const day = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  it('contract_renewal stamps the contract’s org on the task and the renewal deal', async () => {
    const h = makeFlowHarness({ contract_renewal: ContractRenewalFlow }, {
      crm_contract: [{
        id: 'k1', contract_number: 'CTR-1', status: 'activated', crm_account: 'acc1',
        owner_id: 'rep1', contract_value: 90_000, auto_renewal: true,
        renewal_notice_days: 30, end_date: day(+20), organization_id: ORG,
      }],
      crm_task: [],
      crm_opportunity: [],
    });
    await h.run('contract_renewal', {}, { event: 'schedule' });

    expect(h.store.crm_task, 'the sweep created no task').toHaveLength(1);
    expect(h.store.crm_opportunity, 'the sweep opened no renewal deal').toHaveLength(1);
    expect(h.store.crm_task[0].organization_id).toBe(ORG);
    expect(h.store.crm_opportunity[0].organization_id).toBe(ORG);
  });

  it('opportunity_stagnation stamps the deal’s org on the nudge task', async () => {
    const h = makeFlowHarness({ opportunity_stagnation: OpportunityStagnationFlow }, {
      crm_opportunity: [{
        id: 'o_stalled', name: 'Stalled Deal', stage: 'proposal',
        stage_entry_date: day(-30), owner_id: 'rep1', organization_id: ORG,
      }],
      crm_task: [],
    });
    await h.run('opportunity_stagnation', {}, { event: 'schedule' });

    expect(h.store.crm_task, 'the sweep created no nudge task').toHaveLength(1);
    expect(h.store.crm_task[0].organization_id).toBe(ORG);
  });

  it('forecast_snapshot resolves the org from the pipeline, not from sys_user', async () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const isoUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const now = new Date();
    const qStart = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));

    const h = makeFlowHarness(
      { forecast_snapshot: ForecastSnapshotFlow },
      {
        // Faithful to the real platform object: `sys_user` declares NO
        // `organization_id`. Binding the node to `{currentOwner.organization_id}`
        // interpolates to `undefined` here and the assertion below goes red —
        // which is the whole reason this seed omits the key rather than
        // setting it to null.
        sys_user: [{ id: 'rep1', name: 'Rep One' }],
        crm_opportunity: [{
          id: 'o1', owner_id: 'rep1', stage: 'negotiation', forecast_category: 'commit',
          amount: 200_000, close_date: isoUtc(qStart), organization_id: ORG,
        }],
        crm_forecast: [],
      },
      { hooks: [forecastDerive] },
    );
    await h.run('forecast_snapshot', {}, { event: 'schedule' });

    expect(h.store.crm_forecast, 'the sweep opened no snapshot row').toHaveLength(1);
    expect(
      h.store.crm_forecast[0].organization_id,
      'the snapshot row carries no org — the declared token named a source that\n'
        + 'does not carry the column (sys_user has none), so it interpolated to\n'
        + 'undefined and the row is born outside every partition.',
    ).toBe(ORG);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// #1363 — the same walk, extended from `create_record` to `update_record`
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The `create_record` half above asks whether the OWNING organization is
 * declared. This half asks the other question, and it is the one the node type
 * alone cannot answer: where did the WRITTEN VALUE come from?
 *
 * ─── Why `update_record` needs a different question ─────────────────────────
 *
 * Every scheduled sweep here runs `runAs: 'system'`, and a system execution
 * context is the one context the driver's organization predicate does not
 * constrain — that is the platform's design (ADR-0049), not a defect, and
 * nothing here asks the platform to change. `test/saas-composition.test.ts`
 * MEASURES it on a real engine: a system context selecting ownerless rows
 * across a two-organization database returns rows from both, and an
 * `update_record` against either is accepted.
 *
 * So a scheduled `update_record` can write, into tenant B's row, a value that
 * came from tenant A. Nothing is NULL-partitioned and no index is violated —
 * the data simply becomes wrong, silently, with nothing to catch it but a
 * reviewer's eye. This repo is a template AI reads from, and "a reviewer
 * notices" is not a control it can rely on.
 *
 * ─── The criterion is the SOURCE, not the node type ─────────────────────────
 *
 * What separates the safe sweeps from the unsafe one is where the written
 * value came from. `status: 'completed'`, `{NOW()}` and `{currentCase.id}` are
 * organization-neutral however many organizations the read spanned: a literal
 * carries no tenant, a template function reads no row, and a value taken off
 * the swept row is by construction already in that row's organization.
 * `{firstUser.id}` is none of those — it is one specific foreign row's id,
 * stamped across every partition.
 *
 * So the rule is: every interpolation token in an `update_record`'s
 * `config.fields` must resolve to the swept row — the row the node's own
 * `filter.id` names — or to a row PROVEN to be in that row's organization.
 * The proof half has one mechanism and one only, the inversion of
 * `forecast_snapshot`'s `{ownerAnyDeal.organization_id}` precedent: a fetch is
 * cleared when its own filter pins `organization_id` to an already-proven
 * source. A second mechanism is deliberately not invented here.
 *
 * Provenance resolves TRANSITIVELY rather than by matching a token's spelling,
 * because the interesting cases are never one hop: `{firstUser.id}` is an
 * `assignment` off `{userList.0}` off a `get_record` on `sys_user`, and
 * `{pipelineTotal}` is an accumulator over a loop over an independently
 * fetched `crm_opportunity` collection. A spelling check sees two ordinary
 * local variables; the walk below names the whole chain.
 *
 * ─── Exemptions are written down, and measured where they can be ────────────
 *
 * A flagged node is not automatically a defect — but it must be ARGUED in
 * `ORGANIZATION_NEUTRALITY_EXEMPTIONS`, never waved through. The register is
 * held from both sides: an unexplained violation fails, and so does an
 * exemption that has stopped matching anything, so it cannot rot into a list
 * of claims about flows that have since changed. Where the argument is
 * mechanical it is also MEASURED — `demo_bootstrap`'s exemption rests on its
 * absence from the multi-organization composition, and the test below reads
 * that absence out of the composition rather than believing this comment.
 */

/** How a variable came to hold what it holds. */
interface Binding {
  kind: 'loop' | 'query' | 'assignment';
  nodeId: string;
  /** `loop`: the collection template. `assignment`: the right-hand side. */
  template?: unknown;
  /** `query` only — the fetch this variable came out of. */
  objectName?: string;
  filter?: Rec;
}

/**
 * Every variable a flow binds, and how.
 *
 * Three constructs bind, measured rather than assumed: across `src/flows/` the
 * only binding keys are `outputVariable`, `iteratorVariable` and `assignments`.
 * A node type binding through some fourth key would leave its variable UNBOUND
 * here, which the classifier reports as unproven — the conservative direction,
 * and a loud one.
 */
function collectBindings(flow: Rec): Map<string, Binding[]> {
  const out = new Map<string, Binding[]>();
  const add = (name: unknown, binding: Binding): void => {
    if (typeof name !== 'string' || name.trim() === '') return;
    out.set(name, [...(out.get(name) ?? []), binding]);
  };
  const visit = (nodes: unknown, depth: number): void => {
    if (!Array.isArray(nodes) || depth > 16) return;
    nodes.forEach((raw) => {
      if (!isRec(raw)) return;
      const config = isRec(raw.config) ? raw.config : {};
      const nodeId = typeof raw.id === 'string' ? raw.id : '(anonymous)';
      if (raw.type === 'loop') {
        add(config.iteratorVariable, { kind: 'loop', nodeId, template: config.collection });
      }
      if (typeof config.outputVariable === 'string') {
        add(config.outputVariable, {
          kind: 'query',
          nodeId,
          objectName: typeof config.objectName === 'string' ? config.objectName : undefined,
          filter: isRec(config.filter) ? config.filter : {},
        });
      }
      if (isRec(config.assignments)) {
        for (const [name, template] of Object.entries(config.assignments)) {
          add(name, { kind: 'assignment', nodeId, template });
        }
      }
      const slots = typeof raw.type === 'string'
        ? FLOW_REGION_SLOTS_BY_TYPE.get(raw.type)
        : undefined;
      if (!slots || !isRec(raw.config)) return;
      for (const slot of slots) {
        const value = (raw.config as Rec)[slot.key];
        if (slot.arity === 'many') {
          if (!Array.isArray(value)) continue;
          value.forEach((branch) => { if (isRec(branch)) visit(branch.nodes, depth + 1); });
          continue;
        }
        if (!isRec(value)) continue;
        visit(value.nodes, depth + 1);
      }
    });
  };
  visit(flow.nodes, 0);
  return out;
}

/** The inner expression of every `{…}` interpolation in a value, recursively. */
function interpolationsIn(value: unknown): string[] {
  if (typeof value === 'string') return [...value.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
  if (Array.isArray(value)) return value.flatMap((v) => interpolationsIn(v));
  if (isRec(value)) return Object.values(value).flatMap((v) => interpolationsIn(v));
  return [];
}

/**
 * The ROOT variables an interpolation expression reads.
 *
 * A name followed by `(` is a template function — `{NOW()}`, `{TODAY()}` — and
 * reads no row at all, so it is organization-neutral by construction and is not
 * a variable reference. Only the head of a dotted path is a variable:
 * `current_pipeline.amount` reads `current_pipeline`.
 */
function rootVariablesIn(expression: string): string[] {
  const roots: string[] = [];
  for (const match of expression.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z0-9_$]+)*/g)) {
    const path = match[0];
    if (expression.slice((match.index ?? 0) + path.length).trimStart().startsWith('(')) continue;
    roots.push(path.split('.')[0]);
  }
  return roots;
}

interface Verdict { safe: boolean; because: string }

/** Every root variable a template reads must itself be proven. */
function classifyTemplate(
  template: unknown,
  target: string,
  bindings: Map<string, Binding[]>,
  seen: Set<string>,
): Verdict {
  for (const expression of interpolationsIn(template)) {
    for (const root of rootVariablesIn(expression)) {
      const verdict = classifyVariable(root, target, bindings, seen);
      if (!verdict.safe) return verdict;
    }
  }
  return { safe: true, because: 'reads no foreign row' };
}

/**
 * The "or a row proven to be in the same organization" half — one mechanism,
 * the `{ownerAnyDeal.organization_id}` precedent inverted: a fetch is cleared
 * when its own filter pins `organization_id` to a source already proven for
 * this write.
 */
function organizationProof(
  binding: Binding,
  target: string,
  bindings: Map<string, Binding[]>,
  seen: Set<string>,
): Verdict {
  const pin = (binding.filter ?? {}).organization_id;
  if (pin === undefined) return { safe: false, because: 'its filter pins no `organization_id`' };
  const verdict = classifyTemplate(pin, target, bindings, seen);
  return verdict.safe
    ? { safe: true, because: 'its filter pins `organization_id` to a proven source' }
    : { safe: false, because: `its \`organization_id\` pin is itself unproven — ${verdict.because}` };
}

/** Can `variable` only ever hold something safe to write into `target`'s row? */
function classifyVariable(
  variable: string,
  target: string,
  bindings: Map<string, Binding[]>,
  seen: Set<string>,
): Verdict {
  if (variable === target) return { safe: true, because: `taken off the swept row \`${target}\`` };
  // An accumulator reads itself (`{total + current.amount}`). That self-edge
  // proves nothing either way; the binding's OTHER reads decide.
  if (seen.has(variable)) return { safe: true, because: `\`${variable}\` (already resolved)` };

  const own = bindings.get(variable);
  if (!own || own.length === 0) {
    return { safe: false, because: `\`${variable}\` is never bound in this flow` };
  }

  const next = new Set(seen).add(variable);
  // Conservative: a variable is proven only when EVERY binding of it is.
  for (const binding of own) {
    if (binding.kind === 'query') {
      const proof = organizationProof(binding, target, bindings, next);
      if (proof.safe) continue;
      return {
        safe: false,
        because: `\`${variable}\` is an independently-fetched `
          + `${binding.objectName ?? 'external'} collection (\`${binding.nodeId}\`) — ${proof.because}`,
      };
    }
    const verdict = classifyTemplate(binding.template, target, bindings, next);
    if (!verdict.safe) {
      return { safe: false, because: `\`${variable}\` <- \`${binding.nodeId}\` : ${verdict.because}` };
    }
  }
  return { safe: true, because: `\`${variable}\` derives only from the swept row` };
}

interface Violation {
  flow: string;
  nodeId: string;
  field: string;
  token: string;
  reason: string;
}

/**
 * The variable an `update_record` writes INTO. The node's `filter.id` names it
 * — every scheduled `update_record` in this app filters by id, because the node
 * calls `data.update()` without `options.multi` and a filter matching more than
 * one row fails outright.
 */
function sweptRowVariable(node: WriteNode): string | undefined {
  const [expression] = interpolationsIn(node.filter.id);
  if (expression === undefined) return undefined;
  return rootVariablesIn(expression)[0];
}

/** Every field token of one `update_record` that is not proven for its target. */
function analyseUpdate(node: WriteNode, flow: Rec): Violation[] {
  const target = sweptRowVariable(node);
  if (target === undefined) {
    return [{
      flow: node.flow,
      nodeId: node.nodeId,
      field: '(filter)',
      token: JSON.stringify(node.filter),
      reason: 'the node names no swept row — `filter.id` interpolates no variable, so no '
        + 'written value can be checked against the row being written',
    }];
  }
  const bindings = collectBindings(flow);
  const out = new Map<string, Violation>();
  for (const [field, value] of Object.entries(node.fields)) {
    for (const expression of interpolationsIn(value)) {
      for (const root of rootVariablesIn(expression)) {
        const verdict = classifyVariable(root, target, bindings, new Set());
        if (verdict.safe) continue;
        out.set(`${field} ${expression}`, {
          flow: node.flow,
          nodeId: node.nodeId,
          field,
          token: `{${expression}}`,
          reason: verdict.because,
        });
      }
    }
  }
  return [...out.values()];
}

/**
 * A written, argued reason that one flagged write is nevertheless
 * organization-safe. `nodeId: '*'` covers every node of the flow; the field
 * list never widens to `'*'`, so a NEW column written by an exempted node is
 * still a red.
 *
 * An entry here is a claim someone has to defend at review. It is not a way to
 * make a red go green — a genuine cross-organization write is a defect in the
 * flow, and it gets fixed in the flow.
 */
interface OrganizationNeutralityExemption {
  flow: string;
  nodeId: string;
  fields: string[];
  reason: string;
}

const ORGANIZATION_NEUTRALITY_EXEMPTIONS: OrganizationNeutralityExemption[] = [
  {
    flow: 'demo_bootstrap',
    nodeId: '*',
    fields: ['owner_id'],
    reason:
      'This sweep stamps `{firstUser.id}` — one identity — onto every row it claims, '
      + 'under a system context that spans organizations. That is a real crossing, and '
      + 'it is precisely why the flow is NOT registered in the multi-organization '
      + 'composition (#1361/#1362). The shape it does ship in is the community/demo '
      + 'one, which has a single organization, where "the first user" is the only user '
      + 'there is. The claim is not taken on trust: the test below reads the flow\'s '
      + 'absence out of the SaaS composition, so re-registering it revokes this '
      + 'exemption automatically.',
  },
  {
    flow: 'forecast_snapshot',
    nodeId: 'write_snapshot',
    fields: ['pipeline_amount', 'best_case_amount', 'commit_amount', 'closed_amount'],
    reason:
      'The four totals are accumulators over `crm_opportunity` rows fetched by '
      + '`owner_id = {currentOwner.id}` inside the target row\'s own period window — the '
      + '"swept row\'s own aggregates" reading, and exactly right in the '
      + 'single-organization shape this sweep was written for. It is NOT proven in the '
      + 'general case: `sys_user` is a GLOBAL identity carrying no `organization_id` '
      + '(see the header), so an owner holding deals in two organizations would sum '
      + 'both into one snapshot row. That residual is a property of the flow, not of '
      + 'this guard, and is filed separately rather than quietly fixed here. Narrow on '
      + 'purpose: a FIFTH column added to this node is a fresh red.',
  },
];

const exemptionCovers = (
  e: OrganizationNeutralityExemption,
  v: Violation,
  field: string = v.field,
): boolean =>
  e.flow === v.flow && (e.nodeId === '*' || e.nodeId === v.nodeId) && e.fields.includes(field);

const flowsByName = new Map(scheduledFlows.map((f) => [flowName(f), f]));

const updateViolations: Violation[] = scheduledUpdateNodes
  .flatMap((n) => analyseUpdate(n, flowsByName.get(n.flow) ?? {}));

describe('scheduled update_record writes only organization-neutral values (#1363)', () => {
  it('finds the scheduled update_record nodes at all', () => {
    // Guards the guard, the same way the `create_record` half does. Every
    // assertion below is over this list; a walk that silently stopped matching
    // would otherwise pass by asserting nothing whatsoever.
    expect(
      scheduledUpdateNodes.length,
      'the region walk found no scheduled update_record nodes — it is broken, not clean',
    ).toBeGreaterThan(0);
  });

  it('reads the tokens, rather than finding nodes and looking at nothing', () => {
    // The second way to be vacuous: locate the nodes, then classify no token.
    const tokens = scheduledUpdateNodes
      .flatMap((n) => Object.values(n.fields))
      .flatMap((v) => interpolationsIn(v));
    expect(tokens.length, 'no update_record field interpolates anything').toBeGreaterThan(0);
    expect(
      tokens.some((t) => rootVariablesIn(t).length > 0),
      'every token parsed as a bare function call — the variable reader is broken',
    ).toBe(true);
  });

  it('writes only what the swept row carries — or what an exemption argues for', () => {
    const unexplained = updateViolations
      .filter((v) => !ORGANIZATION_NEUTRALITY_EXEMPTIONS.some((e) => exemptionCovers(e, v)))
      .map((v) => `${v.flow} · ${v.nodeId} · fields.${v.field} = ${v.token}\n      ${v.reason}`);

    expect(
      unexplained,
      'A scheduled sweep runs `runAs: system`, so its reads span every organization and\n'
        + 'its writes are accepted against any of them. These `update_record` nodes write\n'
        + 'a value whose source is NOT the row being written and is not proven to share\n'
        + "its organization — so on a multi-organization install they can stamp one\n"
        + "tenant's data into another tenant's row, silently, with no index to stop it.\n"
        + 'Bind the value from the swept row, or pin the source fetch to the target row\n'
        + "'s `organization_id` (the `{ownerAnyDeal.organization_id}` precedent). If it\n"
        + 'is genuinely safe, argue why in ORGANIZATION_NEUTRALITY_EXEMPTIONS — do not\n'
        + 'widen this rule:\n  '
        + unexplained.join('\n  '),
    ).toEqual([]);
  });

  it('carries no exemption that has stopped matching anything', () => {
    // Held from the other side, so the register cannot rot into claims about
    // flows that have since changed. Checked per FIELD, not per entry: an entry
    // naming four columns of which three still violate is three-quarters live
    // and one-quarter stale, and the stale quarter is the one that lies.
    const stale = ORGANIZATION_NEUTRALITY_EXEMPTIONS.flatMap((e) =>
      e.fields
        .filter((field) => !updateViolations.some((v) => exemptionCovers(e, v, field)))
        .map((field) => `${e.flow} · ${e.nodeId} · fields.${field}`));

    expect(
      stale,
      'These exemptions no longer describe anything the app does. The write each one\n'
        + 'argued for is gone, or is now proven on its own — delete the entry, so the\n'
        + 'register keeps meaning what it says:\n  ' + stale.join('\n  '),
    ).toEqual([]);
  });

  it('states a real argument in every exemption, not a shrug', () => {
    for (const e of ORGANIZATION_NEUTRALITY_EXEMPTIONS) {
      expect(e.reason.length, `${e.flow} · ${e.nodeId} exempts without arguing`).toBeGreaterThan(120);
      expect(e.fields, `${e.flow} · ${e.nodeId} exempts no named column`).not.toEqual([]);
      expect(e.fields, `${e.flow} · ${e.nodeId} may not exempt a whole node`).not.toContain('*');
    }
  });
});

/**
 * The half that keeps `demo_bootstrap`'s exemption honest.
 *
 * Its argument is not "this write is safe" — the write is a real crossing.
 * The argument is "this flow does not run where there is more than one
 * organization", and that is a fact about the COMPOSITION, which is readable.
 * So it is read, rather than asserted in a comment that nothing rechecks.
 */
describe('the demo_bootstrap exemption is backed by the composition (#1363)', () => {
  let communityFlowNames: string[] = [];
  let saasFlowNames: string[] = [];

  const loadFlowNames = async (composition: string): Promise<string[]> => {
    const previous = process.env[COMPOSITION_ENV_VAR];
    process.env[COMPOSITION_ENV_VAR] = composition;
    vi.resetModules();
    try {
      const stack = ((await import('../objectstack.config')) as Rec).default as Rec;
      return (Array.isArray(stack.flows) ? (stack.flows as Rec[]) : []).map((f) => String(f.name));
    } finally {
      if (previous === undefined) delete process.env[COMPOSITION_ENV_VAR];
      else process.env[COMPOSITION_ENV_VAR] = previous;
      vi.resetModules();
    }
  };

  beforeAll(async () => {
    communityFlowNames = await loadFlowNames('default');
    saasFlowNames = await loadFlowNames('saas');
  }, 60_000);

  it('keeps demo_bootstrap out of the multi-organization shape', () => {
    // A sentinel first: `not.toContain` on an empty list passes for the wrong
    // reason, and an empty list is exactly what a broken load returns.
    expect(saasFlowNames, 'the SaaS composition registered no flows at all').not.toEqual([]);
    expect(
      saasFlowNames,
      'demo_bootstrap is now registered in the multi-organization composition, so the\n'
        + 'exemption in ORGANIZATION_NEUTRALITY_EXEMPTIONS has stopped being true:\n'
        + "`{firstUser.id}` would stamp one tenant's user across every other tenant's\n"
        + 'rows. Either drop it from that composition again, or fix the flow and delete\n'
        + 'the exemption.',
    ).not.toContain('demo_bootstrap');
  });

  it('and still ships it in the single-organization shape it is exempted for', () => {
    // The other direction. An exemption argued from "it only runs where there is
    // one organization" says nothing once the flow runs nowhere — and then the
    // honest move is to delete the entry, which the staleness test forces.
    expect(communityFlowNames).toContain('demo_bootstrap');
  });
});

// ─────────────────────────────────────────── PROVING THE RULE CAN GO RED ──

/**
 * A sweep built to be caught.
 *
 * Without this, "the app is clean" and "the rule matches nothing" are the same
 * observation, and the second one survives every refactor silently. This flow
 * is the shape the card describes — a scheduled `update_record` stamping a
 * value fetched from somewhere other than the row it is updating — and it is
 * held against the same analyser the shipped flows go through, reached through
 * the same `walkNodes` and `bindsToScheduleTrigger` rather than by calling the
 * classifier directly, so a walk that stopped reaching `update_record` nodes
 * fails here too.
 *
 * It also pins the NEGATIVE direction. A rule that flagged every token would
 * pass a red-only test while being useless; the literal and the template
 * function in the same node must come back clean.
 */
const CROSS_ROW_SWEEP_FIXTURE: Rec = {
  name: 'cross_row_sweep_fixture',
  label: 'Cross-row sweep (fixture)',
  type: 'schedule',
  status: 'active',
  runAs: 'system',
  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { schedule: '0 4 * * *' } },
    {
      id: 'get_user',
      type: 'get_record',
      label: 'First User',
      config: { objectName: 'sys_user', limit: 1, outputVariable: 'userList' },
    },
    {
      id: 'pick_user',
      type: 'assignment',
      label: 'Pick the first user',
      config: { assignments: { chosenUser: '{userList.0}' } },
    },
    {
      id: 'find_leads',
      type: 'get_record',
      label: 'Ownerless leads',
      config: { objectName: 'crm_lead', filter: { owner_id: null }, outputVariable: 'leadList' },
    },
    {
      id: 'loop_leads',
      type: 'loop',
      label: 'For Each Lead',
      config: {
        collection: '{leadList}',
        iteratorVariable: 'currentLead',
        body: {
          nodes: [
            {
              id: 'stamp_owner',
              type: 'update_record',
              label: 'Stamp Owner',
              config: {
                objectName: 'crm_lead',
                filter: { id: '{currentLead.id}' },
                fields: {
                  // The crossing: one identity, fetched independently of the
                  // row being written, stamped into whatever organization the
                  // system context happened to select.
                  owner_id: '{chosenUser.id}',
                  // Must NOT be flagged — a literal carries no tenant.
                  status: 'working',
                  // Must NOT be flagged — a template function reads no row.
                  last_touched: '{NOW()}',
                  // Must NOT be flagged — taken off the swept row itself.
                  company: '{currentLead.company}',
                },
              },
            },
          ],
          edges: [],
        },
      },
    },
  ],
};

describe('the rule goes red on a cross-row write (#1363)', () => {
  const nodes = walkNodes(CROSS_ROW_SWEEP_FIXTURE, 'cross_row_sweep_fixture')
    .filter((n) => n.type === 'update_record');
  const found = nodes.flatMap((n) => analyseUpdate(n, CROSS_ROW_SWEEP_FIXTURE));

  it('reaches the fixture through the same walk the shipped flows go through', () => {
    expect(bindsToScheduleTrigger(CROSS_ROW_SWEEP_FIXTURE)).toBe(true);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].nodeId).toBe('stamp_owner');
  });

  it('flags the value sourced outside the swept row', () => {
    expect(found.map((v) => v.field)).toEqual(['owner_id']);
    expect(found[0].token).toBe('{chosenUser.id}');
  });

  it('names the whole provenance chain, not just the token', () => {
    // The diagnostic is the deliverable: `chosenUser` is two hops from the
    // fetch that makes it foreign, and a message naming only the token would
    // send the next reader looking in the wrong node.
    expect(found[0].reason).toContain('pick_user');
    expect(found[0].reason).toContain('userList');
    expect(found[0].reason).toContain('sys_user');
    expect(found[0].reason).toContain('get_user');
  });

  it('leaves the literal, the template function and the swept row alone', () => {
    // Anti-overreach. A rule that flagged these would be red on every sweep in
    // the app and would be turned off within the week.
    const flagged = found.map((v) => v.field);
    expect(flagged).not.toContain('status');
    expect(flagged).not.toContain('last_touched');
    expect(flagged).not.toContain('company');
  });

  it('is not quietly covered by an exemption', () => {
    // The register must not be able to swallow a fixture it was never written
    // for — otherwise this whole block could pass while proving nothing.
    expect(
      found.filter((v) => ORGANIZATION_NEUTRALITY_EXEMPTIONS.some((e) => exemptionCovers(e, v))),
    ).toEqual([]);
  });

  it('clears the same node once the fetch is pinned to the target organization', () => {
    // The escape the rule offers authors, exercised rather than described: pin
    // the source fetch to the row being written and the same node comes back
    // clean, through the same code path. Without this the only documented way
    // out of a red would be the exemption register.
    const pinned = JSON.parse(JSON.stringify(CROSS_ROW_SWEEP_FIXTURE)) as Rec;
    const getUser = (pinned.nodes as Rec[])[1];
    (getUser.config as Rec).filter = { organization_id: '{currentLead.organization_id}' };

    const cleared = walkNodes(pinned, 'cross_row_sweep_fixture')
      .filter((n) => n.type === 'update_record')
      .flatMap((n) => analyseUpdate(n, pinned));
    expect(cleared).toEqual([]);
  });
});
