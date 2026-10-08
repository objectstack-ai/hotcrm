// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { FLOW_REGION_SLOTS_BY_TYPE } from '@objectstack/spec/automation';
import { CrmFlows as allFlows } from './helpers/src-roster';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

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
/**
 * The runtime half, on the shipped app booted by `@objectstack/verify`: each
 * sweep is started through the trigger door as the admin (`flows.run`) — a
 * schedule run carries no organization of its own — over rows written by the
 * system into organizations created for the purpose, and what the sweep wrote
 * is read back off the engine.
 */
let verify: VerifyStack;
let admin: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
}, 120_000);

/** A fresh organization row, written as the system. */
const organization = async (label: string): Promise<string> =>
  String((await verify.seed('sys_organization', [{ name: `${label} ${++k}`, slug: `${label}-${k}` }]))[0]!.id);

/** A person — the owner of the rows below. */
const owner = (): Promise<Person> =>
  signUpPerson(verify, `owner${++k}@flow-scheduled-org-partition.test`, { name: `Owner ${k}` });

/**
 * UTC calendar throughout — `setUTCDate`, not `setDate`. Mixing
 * local-calendar arithmetic with UTC rendering lands one UTC day late across
 * a DST spring-forward, and no `TZ=UTC` run can tell the two spellings apart.
 * `test/helpers/verify-stack.ts`'s `daysFromNow` carries the full reasoning.
 */
const day = (offset: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

/** Today's calendar-quarter start, the window `forecast.hook.ts` derives. */
const quarterStart = (): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** An account of `who`'s inside `org`. */
const accountIn = async (org: string, who: Person): Promise<Rec> =>
  (await verify.seed('crm_account', [{ name: `Partitioned Co ${++k}`, organization_id: org, owner_id: who.id }]))[0]!;

describe('the declared organization_id actually resolves (#700)', () => {
  it('contract_renewal stamps the contract’s org on the task and the renewal deal', async () => {
    const org = await organization('alpha');
    const who = await owner();
    const acct = await accountIn(org, who);
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Cara', last_name: `Signer ${k}`, email: `cara${k}@flow-scheduled-org-partition.test`,
      crm_account: acct.id, organization_id: org, owner_id: who.id,
    }]);
    const [contract] = await verify.seed('crm_contract', [{
      status: 'activated', crm_account: acct.id, crm_contact: contact!.id, owner_id: who.id, organization_id: org,
      contract_type: 'subscription', contract_value: 90_000, auto_renewal: true, renewal_notice_days: 30,
      contract_term_months: 12, start_date: day(-345), end_date: day(+20), billing_frequency: 'monthly', payment_terms: 'net_30',
    }]);
    await verify.flows.run('contract_renewal', {}, { as: admin });

    const tasks = await verify.rows('crm_task', {
      related_to_account: acct.id, subject: `Renewal due: contract ${contract!.contract_number}`,
    });
    const deals = await verify.rows('crm_opportunity', { crm_account: acct.id, type: 'existing_renewal' });
    expect(tasks, 'the sweep created no task').toHaveLength(1);
    expect(deals, 'the sweep opened no renewal deal').toHaveLength(1);
    expect(tasks[0]!.organization_id).toBe(org);
    expect(deals[0]!.organization_id).toBe(org);
  });

  it('opportunity_stagnation stamps the deal’s org on the nudge task', async () => {
    const org = await organization('alpha');
    const who = await owner();
    const acct = await accountIn(org, who);
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Stalled Deal ${++k}`, stage: 'proposal', stage_entry_date: day(-30), amount: 50_000,
      close_date: '2030-06-30', crm_account: acct.id, owner_id: who.id, organization_id: org,
    }]);
    await verify.flows.run('opportunity_stagnation', {}, { as: admin });

    const tasks = await verify.rows('crm_task', { related_to_opportunity: deal!.id });
    expect(tasks, 'the sweep created no nudge task').toHaveLength(1);
    expect(tasks[0]!.organization_id).toBe(org);
  });

  it('forecast_snapshot resolves the org from the pipeline, not from sys_user', async () => {
    // The real platform object: `sys_user` declares NO `organization_id`.
    // Binding the node to `{currentOwner.organization_id}` interpolates to
    // `undefined` and the assertion below goes red.
    const org = await organization('alpha');
    const who = await owner();
    const acct = await accountIn(org, who);
    await verify.seed('crm_opportunity', [{
      name: `Forecast Deal ${++k}`, owner_id: who.id, stage: 'negotiation', amount: 200_000, approval_status: 'approved',
      close_date: quarterStart(), crm_account: acct.id, organization_id: org,
    }]);
    await verify.flows.run('forecast_snapshot', {}, { as: admin });

    const rows = await verify.rows('crm_forecast', { owner_id: who.id });
    expect(rows, 'the sweep opened no snapshot row').toHaveLength(1);
    expect(
      rows[0]!.organization_id,
      'the snapshot row carries no org — the declared token named a source that\n'
        + 'does not carry the column (sys_user has none), so it interpolated to\n'
        + 'undefined and the row is born outside every partition.',
    ).toBe(org);
  });
});

/**
 * The pin on the bucket fetches, RUN rather than read (#1372).
 *
 * The metadata half below proves the four totals are now derived from a fetch
 * the analyser can prove. It cannot prove the pin selects the right rows: a
 * `filter` key is inert metadata until an engine applies it. So this runs the
 * real sweep over the one shape the defect needs and nothing less — ONE owner,
 * TWO organizations. A single-organization seed cannot tell the fix from the
 * bug, because both readings produce the same four numbers there; that is
 * asserted below rather than trusted.
 */
describe('forecast_snapshot sums only the target row\u2019s organization (#1372)', () => {
  /** The four buckets inside the first organization alone — what the pin should produce. */
  const OWN_ORG_TOTALS = { pipeline: 250_000, best_case: 200_000, commit: 200_000, closed: 90_000 };
  /** …and summed across both organizations — what the defect produced. */
  const CROSS_ORG_TOTALS = { pipeline: 950_000, best_case: 900_000, commit: 900_000, closed: 390_000 };

  /**
   * One human owning deals in two tenants — the shape `sys_user` makes
   * reachable, since identity is global and the per-owner loop item therefore
   * narrows nothing. The first organization's deals are written FIRST so
   * `find_any_deal` binds `ownerAnyDeal` there and the row is born in that
   * partition. Returns the owner and the two organizations.
   */
  const crossOrganizationOwner = async () => {
    const orgA = await organization('alpha');
    const orgB = await organization('beta');
    const who = await owner();
    const close = quarterStart();
    const acctA = await accountIn(orgA, who);
    const acctB = await accountIn(orgB, who);
    const deal = (acct: Rec, org: string, stage: string, amount: number, extra: Rec = {}): Rec => ({
      name: `Cross-org ${stage} ${++k}`, owner_id: who.id, stage, amount, close_date: close,
      crm_account: acct.id, organization_id: org, ...extra,
    });
    await verify.seed('crm_opportunity', [
      deal(acctA, orgA, 'negotiation', 200_000, { approval_status: 'approved' }),
      deal(acctA, orgA, 'qualification', 50_000),
      deal(acctA, orgA, 'closed_won', 90_000, { win_reason: 'better_price' }),
    ]);
    await verify.seed('crm_opportunity', [
      deal(acctB, orgB, 'negotiation', 700_000, { approval_status: 'approved' }),
      deal(acctB, orgB, 'closed_won', 300_000, { win_reason: 'better_price' }),
    ]);
    return { who, orgA, orgB };
  };

  it('is a seed the fix and the defect disagree on', () => {
    // Anti-vacuity. If these two readings ever coincided, the case below would
    // pass with the pin deleted and would be measuring nothing at all.
    expect(OWN_ORG_TOTALS).not.toEqual(CROSS_ORG_TOTALS);
  });

  it('writes its own organization\u2019s totals, not the sum across both', async () => {
    const { who, orgA } = await crossOrganizationOwner();
    await verify.flows.run('forecast_snapshot', {}, { as: admin });

    const rows = await verify.rows('crm_forecast', { owner_id: who.id });
    expect(rows, 'the sweep opened no snapshot row').toHaveLength(1);
    const row = rows[0]!;
    expect(row.organization_id, 'the snapshot row is outside every partition').toBe(orgA);

    expect(
      {
        pipeline: row.pipeline_amount,
        best_case: row.best_case_amount,
        commit: row.commit_amount,
        closed: row.closed_amount,
      },
      'The four bucket fetches are not pinned to the snapshot row\u2019s organization, so\n'
        + 'this row reports the owner\u2019s deals in EVERY organization — the second org\u2019s\n'
        + 'pipeline inside the first org\u2019s forecast. Nothing is NULL-partitioned and no\n'
        + 'index is violated; the numbers are simply another tenant\u2019s. Pin the fetches\n'
        + 'to `{currentForecast.organization_id}` (#1372).',
    ).toEqual(OWN_ORG_TOTALS);
  });

  it('still reports only ONE row for a cross-organization owner', async () => {
    // The half deliberately NOT undertaken (#1372, ruling 2026-08-31 item 3):
    // `crm_forecast` stays keyed by (owner, period), so such an owner gets one
    // row reporting one organization — true but INCOMPLETE, and strictly better
    // than the cross-tenant total above. Pinned here so a later change to that
    // key has to edit this expectation deliberately rather than drift past it.
    const { who, orgA } = await crossOrganizationOwner();
    await verify.flows.run('forecast_snapshot', {}, { as: admin });

    expect((await verify.rows('crm_forecast', { owner_id: who.id })).map((r) => r.organization_id)).toEqual([orgA]);
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
 * `{firstUser.id}` — the shape of the retired `demo_bootstrap` sweep (#1892),
 * kept below as {@link CROSS_ROW_SWEEP_FIXTURE} — is none of those: it is one
 * specific foreign row's id, stamped across every partition.
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
 * mechanical it should also be MEASURED, by a test that reads the fact the
 * argument rests on rather than believing the entry's prose. The register is
 * empty today: its one entry, `demo_bootstrap`, left with the flow (#1892).
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

const ORGANIZATION_NEUTRALITY_EXEMPTIONS: OrganizationNeutralityExemption[] = [];

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
