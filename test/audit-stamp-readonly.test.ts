// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import type * as Automation from '@objectstack/spec/automation';
import stack from '../objectstack.config';
import { OpportunityApprovalFlow, OpportunityApprovalOnCreateFlow } from '../src/flows/opportunity-approval.flow';
import { silentLogger } from './helpers/flow-harness';

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
 *   • `crm_campaign_member.added_date` (#1667) — every writer is an INSERT.
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
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: {
      crm_account: shippedFields('crm_account'),
      crm_opportunity: shippedFields('crm_opportunity'),
      crm_campaign: shippedFields('crm_campaign'),
      crm_campaign_member: shippedFields('crm_campaign_member'),
    } as never,
  });
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
    variables: [{ name: 'rowId', type: 'text', isInput: true, isOutput: false }],
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

/** Recursively find a node by id — the enrollment writers live inside loop bodies. */
function findNode(flow: AnyRec, id: string): AnyRec | undefined {
  const walk = (nodes: AnyRec[] | undefined): AnyRec | undefined => {
    for (const n of nodes ?? []) {
      if (n?.id === id) return n;
      const nested = walk(n?.config?.body?.nodes ?? n?.config?.nodes);
      if (nested) return nested;
    }
    return undefined;
  };
  return walk(flow.nodes as AnyRec[]);
}

const sysCtx = { isSystem: true, userId: 'seed' };
const readBack = (object: string, id: string): Promise<AnyRec> =>
  ql.findOne(object, { where: { id }, context: sysCtx });

// ─────────────────────────────────────────────────────── #1666 · approval ──

describe('#1666 — crm_opportunity approval stamps are declared readonly', () => {
  /** A closable deal, inserted under a system context so the seed itself is not the measurement. */
  async function seedOpportunity(): Promise<string> {
    const account = await ql.insert('crm_account', { name: 'Acme Industrial' }, { context: sysCtx });
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
        { filter: { id: '{rowId}' } },
      ),
    });
    await engine.execute('pin_mark_approved', { params: { rowId: id }, userId: 'user_1', event: 'manual' } as never);

    const after = await readBack('crm_opportunity', id);
    expect(after.approval_status, 'the approval verdict was stripped — the flow is no longer elevated').toBe('approved');
    expect(after.approved_date, 'the approval date was stripped — the stamp is now permanently null').toBeTruthy();
  });

  it('the shipped mark_rejected node still lands its stamp on the system path', async () => {
    const node = findNode(OpportunityApprovalFlow as AnyRec, 'mark_rejected')!;
    expect(node.config.objectName).toBe('crm_opportunity');

    const id = await seedOpportunity();
    const engine = automation({
      pin_mark_rejected: runnable(
        'pin_mark_rejected',
        (OpportunityApprovalFlow as AnyRec).runAs,
        node,
        { filter: { id: '{rowId}' } },
      ),
    });
    await engine.execute('pin_mark_rejected', { params: { rowId: id }, userId: 'user_1', event: 'manual' } as never);

    expect((await readBack('crm_opportunity', id)).approval_status).toBe('rejected');
  });

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
