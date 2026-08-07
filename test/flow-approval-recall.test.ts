// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import { AutomationServicePlugin } from '@objectstack/service-automation';
import { RecordChangeTriggerPlugin } from '@objectstack/trigger-record-change';
import { ApprovalsServicePlugin } from '@objectstack/plugin-approvals';
import stack from '../objectstack.config';

/**
 * ═══ The record and its approval request must never contradict each other ═══
 *
 * #1037, found in the rc.4 dogfood sweep: a rep submitted a $150K deal, the
 * `opportunity_approval_on_create` flow opened a Large Deal Approval, the rep
 * recalled it — and the two halves disagreed.
 *
 *     GET /api/v1/data/sys_approval_request/<id>  →  status: "recalled"
 *     GET /api/v1/data/crm_opportunity/<id>       →  approval_status: "rejected"
 *
 * Both readings are load-bearing: the request drives the Approval Inbox, the
 * FIELD drives every report, dashboard and downstream automation. So every
 * withdrawal was being counted as a loss.
 *
 * ### Two app-side defects, each independently sufficient
 *
 * Attribution first (the issue allowed for this being a platform mirror bug —
 * it is not; both writers are ours):
 *
 * **1. The picklist did not declare the value the platform writes.** An
 * approval node with `approvalStatusField` makes `ApprovalService` mirror the
 * request's own status string onto the record, verbatim and unmapped. On a
 * recall that string is `"recalled"`, which `crm_opportunity.approval_status`
 * did not offer — so the engine refused the write with
 * `Approval Status must be one of: not_required, pending, approved, rejected`,
 * and `mirrorStatusField` swallowed the refusal into a `warn` (it wraps the
 * update in a try/catch by design). The correct value never landed.
 *
 * **2. The flow's `reject` branch had two meanings and read only one.**
 * `recall()` resumes the run down `APPROVAL_BRANCH_LABELS.reject` — the same
 * label a genuine rejection uses — distinguished only by the resume envelope's
 * `decision: 'recall'`. The flow ignored it, so `mark_rejected` stamped
 * `rejected` over the record and `notify_rejected` told the owner their deal
 * "was not approved".
 *
 * Neither defect hides the other: with only the option added, the flow still
 * overwrites `recalled` with `rejected`; with only the routing added,
 * `mark_recalled`'s write is refused by the picklist. Both counter-proofs were
 * run before this file was committed, and both left this suite red.
 *
 * ### Why this file boots a real kernel
 *
 * `test/flow-record-change.test.ts` runs flows on an in-memory harness that
 * has no approvals service at all, so the `approval` node type is not even
 * registered there — the entire recall path is invisible to it. The
 * contradiction only exists where BOTH writers run: the platform's mirror and
 * the flow's own `update_record`, against one engine that enforces the
 * picklist. That is a real kernel, so this file boots one.
 */

type AnyRec = Record<string, any>;

// The object registry announces every registered object on stdout at `info`;
// the kernel logger is silenced the same way. Both are noise here.
process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

let kernel: AnyRec;
let ql: AnyRec;
let approvals: AnyRec;
let repId: string;
let managerId: string;
let accountId: string;

/**
 * A context that passes the approvals override gate (`isSystem` ⇒ true).
 *
 * The gate is what lets a decision be recorded at all here: the nodes route to
 * `position:sales_manager`, nothing in this fixture holds that position, and
 * `onEmptyApprovers: 'admin_rescue'` therefore opens a request only a
 * privileged actor can decide. That is the node's own declared policy, so
 * exercising it is exercising the flow as authored — not a way around it.
 * `resolveActor` additionally demands an explicit `actorId` under a system
 * context (there is no authenticated caller to infer one from).
 */
const asUser = (userId: string): AnyRec => ({ userId, isSystem: true });

let seq = 0;

/** A deal above `amount`, saved as the rep — which auto-submits it. */
async function submitDeal(amount: number): Promise<AnyRec> {
  const n = ++seq;
  return ql.insert('crm_opportunity', {
    name: `Recall Fixture ${n}`,
    crm_account: accountId,
    amount,
    stage: 'negotiation',
    close_date: '2026-12-31',
    owner_id: repId,
  }, { context: asUser(repId) });
}

const opportunity = async (id: string): Promise<AnyRec> =>
  (await ql.find('crm_opportunity', { where: { id } }, { context: SYS }))[0];

const requestsFor = async (recordId: string): Promise<AnyRec[]> =>
  ql.find('sys_approval_request', { where: { record_id: recordId } }, { context: SYS });

/**
 * Poll until `predicate` holds. A record-change flow runs off the write's
 * after-hook, and the approval node's suspend/resume hops the automation
 * engine, so the observable state settles a tick or two after the call
 * returns. Polling (rather than one fixed sleep) keeps the assertion about the
 * OUTCOME instead of about the timing.
 */
async function settle<T>(read: () => Promise<T>, predicate: (v: T) => boolean, what: string): Promise<T> {
  for (let i = 0; i < 100; i++) {
    const v = await read();
    if (predicate(v)) return v;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** The one pending request on a record, once the flow has opened it. */
const pendingRequest = async (recordId: string): Promise<AnyRec> =>
  settle(
    () => requestsFor(recordId),
    (rows) => rows.some((r) => r.status === 'pending'),
    `a pending approval request on ${recordId}`,
  ).then((rows) => rows.find((r) => r.status === 'pending')!);

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_1037' } as never));
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_1037' } as never));
  // The app's own metadata is the subject — objects, hooks and flows exactly
  // as `objectstack.config.ts` declares them. Seed data is skipped; each test
  // builds the population it needs.
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  // Automation before approvals: `ApprovalsServicePlugin.start()` looks up the
  // `automation` service to register the `approval` node executor, and warns
  // its way past a missing one — which would leave every approval flow failing
  // with NO_EXECUTOR and this suite green for the wrong reason. The node-type
  // assertion below is the guard against that.
  await kernel.use(new AutomationServicePlugin({ suspendedRunStore: 'memory' } as never));
  await kernel.use(new RecordChangeTriggerPlugin() as never);
  await kernel.use(new ApprovalsServicePlugin() as never);
  await kernel.bootstrap();

  ql = kernel.getService('objectql');
  approvals = kernel.getService('approvals');

  const rep = await ql.insert('sys_user', { name: 'Recall Rep', email: 'rep@recall-1037.test' }, { context: SYS });
  repId = String(rep.id);
  const manager = await ql.insert('sys_user', { name: 'Recall Manager', email: 'mgr@recall-1037.test' }, { context: SYS });
  managerId = String(manager.id);
  const account = await ql.insert('crm_account', {
    name: 'Recall Fixture Co', type: 'customer', industry: 'technology',
  }, { context: SYS });
  accountId = String(account.id);
}, 300_000);

afterAll(async () => {
  await kernel?.shutdown?.();
});

// ────────────────────────────────────── the stack this file rests on ──

describe('the assembly under test is the real one', () => {
  it('registered the approval node executor and the approvals service', () => {
    const automation = kernel.getService('automation');
    expect(automation.getRegisteredNodeTypes()).toContain('approval');
    expect(typeof approvals?.recall).toBe('function');
    expect(typeof approvals?.decide).toBe('function');
  });

  it('auto-submits a deal above the $100K threshold', async () => {
    const opp = await submitDeal(150_000);
    const request = await pendingRequest(opp.id);

    expect(request.object_name).toBe('crm_opportunity');
    expect(request.current_step).toBe('manager_review');
    // The mirror's first write — proof that `approvalStatusField` is live and
    // that everything below is measuring the same mechanism.
    const settled = await settle(
      () => opportunity(opp.id),
      (r) => r.approval_status === 'pending',
      'approval_status to mirror the pending request',
    );
    expect(settled.approval_status).toBe('pending');
  });
});

// ───────────────────────────────── defect 1: the picklist as a consumer ──

describe('approval_status declares every status the mirror can write (#1037)', () => {
  /**
   * `mirrorStatusField` writes the request's status string verbatim and
   * swallows a refusal. So an undeclared value is not a UI nicety — it is a
   * mirror write that silently does not happen. Everything this flow's request
   * can reach must be writable here.
   *
   * `returned` is deliberately absent: ADR-0044 send-back requires the
   * approval node to declare a `revise` out-edge, `sendBack` validates that
   * BEFORE any mutation, and neither node in `opportunity_approval` declares
   * one. Adding the option would declare a state nothing can produce.
   */
  const REACHABLE = ['pending', 'approved', 'rejected', 'recalled'] as const;

  it.each(REACHABLE)('accepts a write of %s', async (status) => {
    const opp = await ql.insert('crm_opportunity', {
      name: `Mirror Probe ${status}`,
      crm_account: accountId,
      // Below the threshold, so no flow opens a request and locks the row.
      amount: 1_000,
      stage: 'negotiation',
      close_date: '2026-12-31',
      owner_id: repId,
    }, { context: SYS });

    await ql.update('crm_opportunity', { id: opp.id, approval_status: status }, { context: SYS });
    expect((await opportunity(opp.id)).approval_status).toBe(status);
  });

  it('still refuses a status the approvals service cannot produce', async () => {
    // The guard on the guard: if the option set were widened to anything at
    // all, the sweep above would pass vacuously. This is also the exact shape
    // of the refusal that swallowed the `recalled` mirror before the fix.
    const opp = await ql.insert('crm_opportunity', {
      name: 'Mirror Probe invalid',
      crm_account: accountId, amount: 1_000, stage: 'negotiation',
      close_date: '2026-12-31', owner_id: repId,
    }, { context: SYS });

    await expect(
      ql.update('crm_opportunity', { id: opp.id, approval_status: 'withdrawn' }, { context: SYS }),
    ).rejects.toThrow(/must be one of/);
  });
});

// ──────────────────────────── defect 2: the reject branch's two meanings ──

describe('recall leaves the record agreeing with its request (#1037)', () => {
  it('stamps recalled — not rejected — at the manager tier', async () => {
    const opp = await submitDeal(150_000);
    const request = await pendingRequest(opp.id);

    const result = await approvals.recall(request.id, { actorId: repId }, asUser(repId));
    expect(result.request.status).toBe('recalled');
    // The run must actually have continued; a stranded run would leave the
    // record at `pending` and this file would be asserting nothing.
    expect(result.resumed).toBe(true);

    const settled = await settle(
      () => opportunity(opp.id),
      (r) => r.approval_status !== 'pending',
      'approval_status to leave pending after the recall',
    );

    // THE INVARIANT. Written as a comparison of the two halves rather than as
    // two independent equalities, because the defect was never "the field held
    // a wrong constant" — it was the two halves disagreeing.
    const [fresh] = await requestsFor(opp.id);
    expect({ request: fresh.status, record: settled.approval_status })
      .toEqual({ request: 'recalled', record: 'recalled' });
  });

  it('stamps recalled at the director tier too', async () => {
    // The director's reject edge is a SEPARATE edge reading a SEPARATE
    // variable (`vars.director_signoff.decision`). At this point
    // `vars.manager_review.decision` is `"approve"`, so a copy-paste that kept
    // the manager's variable name would route the recall to `mark_rejected`
    // and only this case would catch it.
    const opp = await submitDeal(750_000);
    const managerStep = await pendingRequest(opp.id);
    expect(managerStep.current_step).toBe('manager_review');

    await approvals.decide(
      managerStep.id, { decision: 'approve', comment: 'tier 1 ok', actorId: managerId }, asUser(managerId),
    );

    const directorStep = await settle(
      () => requestsFor(opp.id),
      (rows) => rows.some((r) => r.status === 'pending' && r.current_step === 'director_signoff'),
      'the director step to open',
    ).then((rows) => rows.find((r) => r.status === 'pending')!);

    const result = await approvals.recall(directorStep.id, { actorId: repId }, asUser(repId));
    expect(result.request.status).toBe('recalled');
    expect(result.resumed).toBe(true);

    const settled = await settle(
      () => opportunity(opp.id),
      (r) => r.approval_status !== 'pending',
      'approval_status to leave pending after the director-tier recall',
    );
    const fresh = (await requestsFor(opp.id)).find((r) => r.id === directorStep.id)!;
    expect({ request: fresh.status, record: settled.approval_status })
      .toEqual({ request: 'recalled', record: 'recalled' });
  });

  it('does not stamp approved_date on a recall', async () => {
    const opp = await submitDeal(150_000);
    const request = await pendingRequest(opp.id);
    await approvals.recall(request.id, { actorId: repId }, asUser(repId));
    const settled = await settle(
      () => opportunity(opp.id),
      (r) => r.approval_status === 'recalled',
      'the recall to settle',
    );
    expect(settled.approved_date ?? null).toBeNull();
  });
});

// ───────────────────────────────────────────── the branch still rejects ──

describe('a real decision is unaffected by the recall branch', () => {
  it('a rejection still stamps rejected on both halves', async () => {
    // The negative control. An `isDefault` fallback that never fires, or a
    // recall condition that matched everything, would turn every rejection
    // into a "recall" — the mirror image of the reported bug, and invisible
    // without this case.
    const opp = await submitDeal(150_000);
    const request = await pendingRequest(opp.id);

    await approvals.decide(
      request.id, { decision: 'reject', comment: 'margin too thin', actorId: managerId }, asUser(managerId),
    );

    const settled = await settle(
      () => opportunity(opp.id),
      (r) => r.approval_status !== 'pending',
      'approval_status to leave pending after the rejection',
    );
    const [fresh] = await requestsFor(opp.id);
    expect({ request: fresh.status, record: settled.approval_status })
      .toEqual({ request: 'rejected', record: 'rejected' });
  });

  it('a full approval still stamps approved on both halves', async () => {
    const opp = await submitDeal(150_000);
    const request = await pendingRequest(opp.id);

    await approvals.decide(
      request.id, { decision: 'approve', comment: 'strategic logo', actorId: managerId }, asUser(managerId),
    );

    const settled = await settle(
      () => opportunity(opp.id),
      (r) => r.approval_status === 'approved',
      'approval_status to reach approved',
    );
    const [fresh] = await requestsFor(opp.id);
    expect({ request: fresh.status, record: settled.approval_status })
      .toEqual({ request: 'approved', record: 'approved' });
    // `mark_approved` writes the date alongside the status; a branch that
    // routed an approval through `mark_recalled` would still look "approved"
    // here without this.
    expect(settled.approved_date).toBeTruthy();
  });
});
