// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import { cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import stack from './helpers/composed-stack';
import { OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow } from '../src/sales/flows/opportunity-approval.flow';
import { CampaignEnrollmentFlow } from '../src/marketing/flows/campaign-enrollment.flow';
import {
  CampaignLeadMemberEnrollFlow,
  CampaignContactMemberEnrollFlow,
} from '../src/marketing/flows/campaign-member-enroll.flow';

/** The engine's logger, silenced: these suites read results, not log lines. */
const silentLogger: any = {
  info() {}, warn() {}, error() {}, debug() {}, trace() {},
  child() { return silentLogger; },
};

/**
 * THE AUDIT STAMPS ARE DECLARED `readonly`, AND BOTH HALVES ARE MEASURED
 * (#1666, #1667 — director seat, decision batch #74, 2026-09-07).
 *
 * `test/readonly-write-semantics.test.ts` measures the PLATFORM rule on a
 * purpose-built probe object: the strip is one branch in the engine's UPDATE
 * path, `if (!opCtx.context?.isSystem)`, and INSERT is exempt from it outright.
 * This file is the other half — it applies that rule to the three SHIPPED
 * columns the ruling moved, using the SHIPPED field definitions and the
 * SHIPPED flow nodes, so a flag flip is not taken on faith:
 *
 *   • `crm_opportunity.approval_status` / `approved_date` (#1666) — every
 *     writer is the `runAs: 'system'` approval flow or an insert.
 *   • `crm_campaign_member.added_date` (#1667) — its one writer is the
 *     field's own write-moment `defaultValue` (#2142), which the engine
 *     applies to every insert, a user-context one included. Before #2142 the
 *     writers were the two `runAs: 'system'` enrollment callees
 *     (`campaign_lead_member_enroll` / `campaign_contact_member_enroll`),
 *     because objectql 17.4.0 strips a static readonly column from a
 *     non-system INSERT; every other door stored the column blank. This file
 *     follows the stamp to the object, and still runs the callees' node.
 *
 * ⭐ A declaration without these pins is just a flag. What has to stay true is
 * a CONJUNCTION, and each half fails in a different direction:
 *   1. the legitimate writer STILL LANDS its write — otherwise the declaration
 *      silently broke the approval flow / the enrollment flow, and the symptom
 *      is a null audit stamp nobody notices for a quarter;
 *   2. an ordinary user-context UPDATE IS STRIPPED — otherwise the declaration
 *      is decorative and "declared = enforced" is false on the audit surface.
 *
 * ⛔ There is deliberately NO test that "keeps" an escape hatch for a stuck
 * approval. The ruling gave that up on purpose: "a stuck approval is a platform
 * or flow defect to be fixed as one, not a reason to keep an audit stamp
 * hand-editable."
 */

type AnyRec = Record<string, any>;
type Flow = Automation.Flow;

const objects: AnyRec[] = (stack as any).objects ?? [];
const objectByName = new Map(objects.map((o) => [o.name as string, o]));

/**
 * The shipped FIELD definitions, not a stand-in: whether the strip fires is
 * decided by `field.readonly` on the real schema. Validations and hooks are
 * deliberately left off — this file measures the strip, and a validation
 * rejecting the write would confound the reading.
 */
const shippedFields = (name: string): AnyRec => ({
  name,
  fields: objectByName.get(name)?.fields ?? {},
});

let ql: any;

beforeAll(async () => {
  ql = await ObjectQL.create({
    datasources: { default: new SqliteWasmDriver({ filename: ':memory:' }) },
    objects: {
      crm_account: shippedFields('crm_account'),
      crm_opportunity: shippedFields('crm_opportunity'),
      crm_campaign: shippedFields('crm_campaign'),
      crm_lead: shippedFields('crm_lead'),
      crm_campaign_member: shippedFields('crm_campaign_member'),
    } as never,
  });
  await ql.syncSchemas();
});

afterAll(async () => {
  await ql?.close();
});

/** Boot an AutomationEngine whose `data` service is the REAL ObjectQL. */
function automation(flows: Record<string, Flow>) {
  const ctx: any = {
    logger: silentLogger,
    getService: (n: string) => (n === 'data' || n === 'objectql' ? ql : undefined),
  };
  const engine = new AutomationEngine(silentLogger);
  installBuiltinNodes(engine, ctx);
  for (const [n, f] of Object.entries(flows)) engine.registerFlow(n, f);
  return engine;
}

/**
 * Wrap a SHIPPED write node in a runnable schedule-shaped flow.
 *
 * ⚠️ What is borrowed from source and what is harness plumbing, because the
 * distinction is the whole value of this file: `config.fields` (the payload
 * under test), `config.objectName` and the owning flow's `runAs` all come from
 * the shipped artifact and are asserted against it below. Only the row
 * ADDRESSING is rewritten — the shipped nodes filter on `{record.id}`, a
 * variable the record trigger supplies, which a standalone run has no way to
 * seed. Retargeting the object is impossible without failing the objectName
 * assertion that guards each section.
 */
const runnable = (name: string, runAs: 'system' | 'user', node: AnyRec, addressing: AnyRec): Flow =>
  ({
    name, label: name, type: 'schedule', status: 'active', runAs,
    variables: [
      { name: 'rowId', type: 'text', isInput: true, isOutput: false },
      { name: 'linkId', type: 'text', isInput: true, isOutput: false },
    ],
    nodes: [
      { id: 'start', type: 'start', label: 'Start', config: {} },
      { ...node, config: { ...node.config, ...addressing } },
      { id: 'end', type: 'end', label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: node.id, type: 'default' },
      { id: 'e2', source: node.id, target: 'end', type: 'default' },
    ],
  }) as AnyRec as Flow;

/**
 * Recursively find a node by id.
 *
 * The enrollment writers are two regions deep — a `loop`'s `config.body`, then
 * the `try_catch` that `guarded()` wraps every iteration in (`config.try`). So
 * this walks EVERY nested `{ nodes: [...] }` region rather than a fixed list of
 * keys: a node that moves into a different region kind must keep being found,
 * or these pins would go quietly green by finding nothing.
 */
function findNode(flow: AnyRec, id: string): AnyRec | undefined {
  const walk = (value: unknown): AnyRec | undefined => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const hit = walk(item);
        if (hit) return hit;
      }
      return undefined;
    }
    if (!value || typeof value !== 'object') return undefined;
    const node = value as AnyRec;
    if (node.id === id && node.type) return node;
    for (const nested of Object.values(node)) {
      const hit = walk(nested);
      if (hit) return hit;
    }
    return undefined;
  };
  return walk(flow.nodes);
}

const sysCtx = { isSystem: true, userId: 'seed' };
const readBack = (object: string, id: string): Promise<AnyRec> =>
  ql.findOne(object, { where: { id }, context: sysCtx });

// ─────────────────────────────────────────────────────── #1666 · approval ──

describe('#1666 — crm_opportunity approval stamps are declared readonly', () => {
  /**
   * A closable deal, inserted under a system context so the seed itself is not
   * the measurement. Each deal gets its own account: `crm_account.name` is
   * declared unique, and the SQL driver enforces it (`driver-memory`, which ran
   * this file until #2092, did not).
   */
  let accounts = 0;
  async function seedOpportunity(): Promise<string> {
    const account = await ql.insert('crm_account', { name: `Acme Industrial ${++accounts}` }, { context: sysCtx });
    const row = await ql.insert(
      'crm_opportunity',
      {
        name: 'Acme platform renewal',
        crm_account: account.id,
        amount: 250000,
        stage: 'negotiation',
        close_date: '2026-12-31',
        approval_status: 'pending',
        next_step: 'await approval',
      },
      { context: sysCtx },
    );
    return String(row.id);
  }

  it('both columns carry readonly: true on the shipped schema', () => {
    const fields = objectByName.get('crm_opportunity')?.fields as AnyRec;
    for (const name of ['approval_status', 'approved_date']) {
      expect(
        fields[name]?.readonly,
        `${name} is an approval AUDIT STAMP written only by the runAs:'system' approval ` +
          'flow. Ruled readonly in #1666 (decision batch #74); softening it back to editable ' +
          'needs a new ruling, not a commit.',
      ).toBe(true);
    }
  });

  it('the approval flow is still elevated — the declaration rests on it', () => {
    expect(
      (OpportunityApprovalFlow as AnyRec).runAs,
      'opportunity_approval writes both readonly stamps. If it stops being ' +
        "runAs: 'system', `resolveRunDataContext` stops returning isSystem: true, the strip " +
        'branch fires, and every approval verdict is silently dropped while the run reports success.',
    ).toBe('system');
    expect(
      (OpportunityApprovalOnCreateFlow as AnyRec).runAs,
      'the insert-time twin inherits runAs by spreading the parent flow — if the spread is ' +
        'ever unwound, this is where it shows.',
    ).toBe('system');
  });

  it('the shipped mark_approved node still lands BOTH stamps on the system path', async () => {
    const node = findNode(OpportunityApprovalFlow as AnyRec, 'mark_approved')!;
    expect(node, 'mark_approved is the writer this whole card is about').toBeTruthy();
    expect(node.config.objectName).toBe('crm_opportunity');
    expect(
      Object.keys(node.config.fields).sort(),
      'both stamps are written by this one node; the pin below only proves what it writes',
    ).toEqual(['approval_status', 'approved_date']);

    const id = await seedOpportunity();
    const engine = automation({
      pin_mark_approved: runnable(
        'pin_mark_approved',
        (OpportunityApprovalFlow as AnyRec).runAs,
        node,
        { filter: { id: cel`rowId` } },
      ),
    });
    await engine.execute('pin_mark_approved', { params: { rowId: id }, userId: 'user_1', event: 'manual' } as never);

    const after = await readBack('crm_opportunity', id);
    expect(after.approval_status, 'the approval verdict was stripped — the flow is no longer elevated').toBe('approved');
    expect(after.approved_date, 'the approval date was stripped — the stamp is now permanently null').toBeTruthy();
  });

  // A rejection has no writer of this app's own since #2061: `mark_rejected`
  // only restated the approval node's `rejected` mirror, as the submitter, and
  // was removed. That the mirror's `rejected` still lands on the `readonly`
  // column is pinned end to end in `test/approval-decision-attribution.test.ts`.

  it('a plain user-context UPDATE of either stamp is STRIPPED', async () => {
    const id = await seedOpportunity();
    // `isSystem` deliberately absent — this is a rep (or an admin) editing the
    // record through the ordinary API/UI path.
    await ql.update(
      'crm_opportunity',
      { approval_status: 'approved', approved_date: '2026-01-01T00:00:00.000Z', next_step: 'hand-edited' },
      { where: { id }, context: { userId: 'user_1' } },
    );
    const after = await readBack('crm_opportunity', id);
    // The control must land, or this run measured a broken harness, not a strip.
    expect(after.next_step, 'the CONTROL column did not land — harness fault, not a strip').toBe('hand-edited');
    expect(
      after.approval_status,
      'a hand-edited approval verdict LANDED. The declaration is decorative and #1666 did not ship.',
    ).toBe('pending');
    expect(after.approved_date, 'a hand-edited approval date landed').toBeFalsy();
  });
});

// ───────────────────────────────────────────────────── #1667 · enrollment ──

describe('#1667 — crm_campaign_member.added_date is declared readonly', () => {
  /** A campaign and a lead the enrollment writers can legitimately point at. */
  async function seedEnrollmentTargets(): Promise<{ campaignId: string; leadId: string }> {
    const campaign = await ql.insert(
      'crm_campaign',
      { name: 'Spring Push', status: 'in_progress', start_date: '2026-03-01', end_date: '2026-04-30' },
      { context: sysCtx },
    );
    const lead = await ql.insert(
      'crm_lead',
      { first_name: 'Ada', last_name: 'Lovelace', company: 'Acme', email: 'ada@acme.test', status: 'new' },
      { context: sysCtx },
    );
    return { campaignId: String(campaign.id), leadId: String(lead.id) };
  }

  it('the column carries readonly: true on the shipped schema', () => {
    const fields = objectByName.get('crm_campaign_member')?.fields as AnyRec;
    expect(
      fields.added_date?.readonly,
      'added_date is the enrollment stamp. Ruled readonly in #1667 (decision batch #74) ' +
        'because nobody is meant to hand-edit when a membership was created.',
    ).toBe(true);
  });

  it('the enrollment SCREEN flow is still NOT elevated — house rule 9', () => {
    expect(
      (CampaignEnrollmentFlow as AnyRec).runAs ?? 'user',
      'campaign_enrollment is a screen action a marketer clicks, and it must keep their ' +
        "identity. AGENTS.md house rule 9: a screen flow stays runAs: 'user' and a write " +
        'that genuinely needs elevation is split into a dedicated system sub-flow. ' +
        'Elevating THIS flow to protect added_date would also lift row-level security off ' +
        'its two bulk reads, and crm_lead is sharingModel: private — a rep would enroll ' +
        'the whole organisation instead of the leads they can see.',
    ).toBe('user');
  });

  it('the elevation lives in the two callees, and nowhere else', () => {
    // The stamp no longer needs it (#2142), but the elevation stays: it is
    // what lets the profiles without `allowCreate` on this object enroll
    // through the screen flow, and retiring it is not a stamp change.
    for (const callee of [CampaignLeadMemberEnrollFlow, CampaignContactMemberEnrollFlow]) {
      expect(
        (callee as AnyRec).runAs,
        `${(callee as AnyRec).name} is the only place the enrollment insert runs elevated.`,
      ).toBe('system');
      const writes = ((callee as AnyRec).nodes as AnyRec[])
        .filter((n) => n.type !== 'start' && n.type !== 'end')
        .map((n) => n.config?.objectName);
      expect(
        writes,
        'an elevated callee must stay minimal — one write, on the membership object',
      ).toEqual(['crm_campaign_member']);
    }
  });

  it('the object is the stamp\'s one writer: a declared default, and neither create node writes it', () => {
    const fields = objectByName.get('crm_campaign_member')?.fields as AnyRec;
    expect(
      fields.added_date?.defaultValue,
      'added_date has no default, so every insert that does not write it — the console\'s New, ' +
        'Add to Campaign — is born with a blank Added Date again (#2142)',
    ).toBeTruthy();
    const callees: [AnyRec, string][] = [
      [CampaignLeadMemberEnrollFlow as AnyRec, 'create_campaign_member'],
      [CampaignContactMemberEnrollFlow as AnyRec, 'create_contact_member'],
    ];
    for (const [flow, id] of callees) {
      const node = findNode(flow, id);
      expect(node, `${id} is one of the two enrollment inserts`).toBeTruthy();
      expect(node!.type, 'an INSERT on an elevated callee. If this ever becomes update_record it ' +
        'is a different write with different ordering — that is the failure #1667 trades against.').toBe('create_record');
      expect(node!.config.objectName).toBe('crm_campaign_member');
      expect(
        Object.keys(node!.config.fields),
        'a callee writes added_date again — a second writer of a column the object already stamps',
      ).not.toContain('added_date');
    }
  });

  it('the screen flow still reaches both writers, through subflow nodes', () => {
    const hops: [string, string][] = [
      ['create_campaign_member', 'campaign_lead_member_enroll'],
      ['create_contact_member', 'campaign_contact_member_enroll'],
    ];
    for (const [id, flowName] of hops) {
      const node = findNode(CampaignEnrollmentFlow as AnyRec, id);
      expect(node, `${id} must still exist in campaign_enrollment, as the hop to its callee`).toBeTruthy();
      expect(node!.type, 'the parent hands the insert off, it no longer performs it').toBe('subflow');
      expect(node!.config.flowName).toBe(flowName);
    }
  });

  it('a member the shipped create_campaign_member node inserts still carries added_date', async () => {
    // Both halves come from the SHIPPED callee: its node AND its `runAs`. The
    // node no longer writes the column (#2142); what this measures is that the
    // enrollment row still carries the stamp, now from the field's default,
    // which this engine reads off the shipped field definition.
    const node = findNode(CampaignLeadMemberEnrollFlow as AnyRec, 'create_campaign_member')!;
    const { campaignId, leadId } = await seedEnrollmentTargets();
    const engine = automation({
      pin_enrol: runnable(
        'pin_enrol',
        (CampaignLeadMemberEnrollFlow as AnyRec).runAs ?? 'user',
        node,
        // Addressing only — every other field stays exactly as authored.
        { fields: { ...node.config.fields, crm_campaign: cel`rowId`, crm_lead: cel`linkId` } },
      ),
    });
    await engine.execute('pin_enrol', {
      params: { rowId: campaignId, linkId: leadId }, userId: 'user_1', event: 'manual',
    } as never);

    const members = await ql.find('crm_campaign_member', { where: { crm_campaign: campaignId }, context: sysCtx });
    expect(members, 'the enrollment write did not land at all').toHaveLength(1);
    expect(members[0].status, 'the CONTROL column did not land — harness fault, not a strip').toBe('sent');
    expect(
      members[0].added_date,
      'added_date came back null on an enrollment insert. Every enrolled member would now be ' +
        'born without an enrollment date — the symptom #1667 and #2142 measured away.',
    ).toBeTruthy();
  });

  it('a user-context UPDATE of added_date is STRIPPED', async () => {
    const { campaignId, leadId } = await seedEnrollmentTargets();
    // ⚰️ The seed used to run under `{ userId: 'user_1' }`, and the row that
    // followed asserted that a plain user-context INSERT seeds a readonly
    // column — "the exemption #1667 rests on". objectql 17.4.0 retired that
    // exemption (the static-readonly strip moved inside `engine.insert`), so the
    // assertion is GONE rather than re-aimed at the new rule: restating a
    // platform write rule here is what AGENTS.md scope rule 3 forbids, and that
    // row is handed to epic step 5c (objectstack#15953) with the rest.
    //
    // What is left is the half this file is FOR — is this column's own
    // declaration decorative or enforced — so the fixture is seeded the way the
    // shipped writer now seeds it, through the system context.
    const row = await ql.insert(
      'crm_campaign_member',
      { crm_campaign: campaignId, crm_lead: leadId, status: 'sent', added_date: '2026-03-02T00:00:00.000Z' },
      { context: sysCtx },
    );

    await ql.update(
      'crm_campaign_member',
      { added_date: '2020-01-01T00:00:00.000Z', status: 'responded' },
      { where: { id: row.id }, context: { userId: 'user_1' } },
    );
    const after = await readBack('crm_campaign_member', String(row.id));
    expect(after.status, 'the CONTROL column did not land — harness fault, not a strip').toBe('responded');
    expect(
      String(after.added_date),
      'the enrollment date was back-dated by hand. The declaration is decorative and #1667 did not ship.',
    ).toContain('2026-03-02');
  });
});
