// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { FLOW_REGION_SLOTS_BY_TYPE } from '@objectstack/spec/automation';
import * as allFlows from '../src/flows';
import { ContractRenewalFlow } from '../src/flows/contract-renewal.flow';
import { OpportunityStagnationFlow } from '../src/flows/opportunity-stagnation.flow';
import { ForecastSnapshotFlow } from '../src/flows/forecast-snapshot.flow';
import forecastDerive from '../src/objects/forecast.hook';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

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

/** A `create_record` node reached anywhere inside a flow, with its path. */
interface CreateNode {
  flow: string;
  path: string;
  nodeId: string;
  fields: Rec;
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
function walkNodes(flow: Rec, flowName: string): CreateNode[] {
  const out: CreateNode[] = [];
  const visit = (nodes: unknown, basePath: string, depth: number): void => {
    if (!Array.isArray(nodes) || depth > 16) return;
    nodes.forEach((raw, index) => {
      if (!isRec(raw)) return;
      const path = `${basePath}[${index}]`;
      if (raw.type === 'create_record') {
        const config = isRec(raw.config) ? raw.config : {};
        out.push({
          flow: flowName,
          path,
          nodeId: typeof raw.id === 'string' ? raw.id : `#${index}`,
          fields: isRec(config.fields) ? config.fields : {},
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

/** Every `create_record` node this app ships on a schedule-bound flow. */
const scheduledCreateNodes: CreateNode[] = Object.values(allFlows as Record<string, unknown>)
  .filter((f): f is Rec => isRec(f) && Array.isArray(f.nodes))
  .filter((f) => bindsToScheduleTrigger(f))
  .flatMap((f) => walkNodes(f, typeof f.name === 'string' ? f.name : '<unnamed>'));

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
