// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, guestInsert, systemInsert, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * ═══ Ownership queues: who owns a new case or lead, and how an agent takes one (#2395) ══
 *
 * Since ObjectStack 18.3.0 (ADR-0142) the platform answers "who owns this new
 * record" from declared metadata, and HotCRM's stand-ins are gone: the
 * `case_auto_assign` / `lead_auto_assign` round-robin hooks, the status-as-claim
 * gesture `case_self_claim`, the `claim_case` screen flow and the
 * `case_unassigned_triage_sharing` grant. What the app declares now:
 *
 *   - `case_intake` (members: `crm_service_agent`) and `case_intake_assignment`
 *     (least_loaded over open cases);
 *   - `lead_intake` (members: `crm_sales_rep`) and `lead_intake_assignment`
 *     (least_loaded over unconverted leads).
 *
 * The platform's contract, measured here on the shipped app: a rule runs once
 * per insert, after every `beforeInsert` hook, and only when the record names
 * neither an owner nor a queue. With members it writes the least-loaded one as
 * owner; with none, the record parks in the queue (`owner_id` empty, `queue`
 * set). A member sees a parked record, claims it by writing `owner_id` = self
 * (the console's Claim button, 认领), and a concurrent loser gets
 * `409 CONCURRENT_UPDATE`. The maintainer's ruling on #2395 (option A): a claim
 * writes the owner and nothing else — no status move rides along.
 *
 * Measured first, before any deletion (2026-11-04, 18.3.0); every verdict below
 * is the row the engine stored or the answer it gave.
 */

let verify: VerifyStack;
let admin: string;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
}, 120_000);

/** The pools are whoever holds the position on this stack, so each block leaves them as it found them. */
const releasePositions = async (...positions: string[]): Promise<void> => {
  for (const position of positions) {
    for (const row of await verify.rows('sys_user_position', { position })) {
      await verify.hooks.run('sys_user_position', 'delete', { id: row.id }, { as: admin });
    }
  }
};

const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const idOf = (row: Rec): string => String(row.id ?? row.data?.id);

const newCase = (over: Rec = {}): Rec => ({ subject: `Queue case ${++k}`, description: 'Printer on fire.', ...over });
const newLead = (over: Rec = {}): Rec => ({
  first_name: 'Nora', last_name: `Queue ${++k}`, company: `QueueCo ${k}`, email: `queue${k}@ownership-queues.test`, ...over,
});

/** A case sitting in the intake queue: written by the system with no owner while the pool may be staffed. */
const parkedCase = async (over: Rec = {}): Promise<Rec> =>
  stored('crm_case', String((await verify.seed('crm_case', [newCase({ queue: 'case_intake', ...over })]))[0]!.id));

/** The outcome of a write as `as`, without throwing. */
const attempt = async (as: string, object: string, id: string, patch: Rec): Promise<{ ok: boolean; code?: string; status?: number }> => {
  try {
    await verify.hooks.run(object, 'update', { id, ...patch }, { as });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, code: e?.code, status: e?.status };
  }
};

describe('the declarations reach the registry', () => {
  it('both queues and both rules are registered, and the platform added `queue` to both objects', () => {
    expect(verify.metadata.items<Rec>('queue').map((q) => q.name).sort()).toEqual(['case_intake', 'lead_intake']);
    expect(verify.metadata.items<Rec>('assignment_rule').map((r) => r.name).sort())
      .toEqual(['case_intake_assignment', 'lead_intake_assignment']);
    for (const object of ['crm_case', 'crm_lead']) {
      expect(Object.keys(verify.metadata.object(object)?.fields ?? {}), `${object} carries no queue column`).toContain('queue');
    }
  });
});

describe('an empty pool parks the new record in its queue — the first-install norm', () => {
  beforeAll(async () => {
    expect(await verify.rows('sys_user_position', { position: 'crm_service_agent' }), 'the agent pool is not empty').toEqual([]);
    expect(await verify.rows('sys_user_position', { position: 'crm_sales_rep' }), 'the rep pool is not empty').toEqual([]);
  });

  it('a case the system writes (an integration, an import) parks in case_intake', async () => {
    const kase = await stored('crm_case', idOf(await systemInsert(verify, 'crm_case', newCase())));
    expect(kase.owner_id ?? null).toBeNull();
    expect(kase.queue).toBe('case_intake');
    expect(kase.status).toBe('new');
  });

  it('a guest case parks too, and its spoofed owner does not survive the strip', async () => {
    const kase = await stored('crm_case', idOf(await guestInsert(verify, 'crm_case', newCase({ supplied_email: 'g@ownership-queues.test', owner_id: 'planted_user' }))));
    expect(kase.owner_id ?? null, 'an anonymous client chose the owner').toBeNull();
    expect(kase.queue).toBe('case_intake');
  });

  it('a web-to-case submission through the platform form door lands in the queue', async () => {
    const res = await verify.api('/forms/support/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ supplied_email: 'visitor@ownership-queues.test', subject: 'Web submission', description: 'Printer on fire.', priority: 'high' }),
    });
    expect(res.status).toBe(201);
    const answer = await res.json() as Rec;
    expect(Object.keys(answer), 'the anonymous answer carries more than the new id').toEqual(['id']);
    const kase = await stored('crm_case', String(answer.id));
    expect(kase.origin).toBe('web');
    expect(kase.owner_id ?? null).toBeNull();
    expect(kase.queue).toBe('case_intake');
  });

  it('a lead the system writes parks in lead_intake', async () => {
    const lead = await stored('crm_lead', idOf(await systemInsert(verify, 'crm_lead', newLead())));
    expect(lead.owner_id ?? null).toBeNull();
    expect(lead.queue).toBe('lead_intake');
  });
});

describe('with members, least_loaded routes like the deleted round-robin did', () => {
  let a: Person;
  let b: Person;
  let c: Person;
  const who = (id: unknown): string => ({ [a.id]: 'a', [b.id]: 'b', [c.id]: 'c' } as Rec)[String(id)] ?? String(id ?? null);

  beforeAll(async () => {
    const agent = (n: string) => signUpPerson(verify, `agent-${n}.${++k}@ownership-queues.test`, {
      name: `Agent ${n}`, positions: ['crm_service_agent'], permissionSets: ['service_agent'],
    });
    a = await agent('a');
    b = await agent('b');
    c = await agent('c');
    // Load, counted by the rule's `load` (open cases only): a = 2, b = 0
    // (three resolved/closed that must NOT count), c = 1.
    const own = (p: Person, status: string) => verify.seed('crm_case', [newCase({
      status, owner_id: p.id, ...(status === 'resolved' || status === 'closed' ? { resolution: 'Fixed.' } : {}),
    })]);
    await own(a, 'new');
    await own(a, 'waiting_customer');
    await own(c, 'new');
    await own(b, 'resolved');
    await own(b, 'closed');
    await own(b, 'resolved');
  }, 120_000);

  afterAll(async () => {
    await releasePositions('crm_service_agent');
  });

  it('hands consecutive ownerless cases to the least-loaded agent, resolved work not counting', async () => {
    const first = await stored('crm_case', idOf(await systemInsert(verify, 'crm_case', newCase())));
    const second = await stored('crm_case', idOf(await systemInsert(verify, 'crm_case', newCase())));
    expect(who(first.owner_id), 'resolved/closed cases are counting as load').toBe('b');
    // b now carries one open case; b and c tie at 1 and the platform breaks
    // the tie by user id, so the third would be order-dependent — the second
    // is not, because a still carries two.
    expect(['b', 'c']).toContain(who(second.owner_id));
    // The rule names its queue on the routed row as well.
    expect(first.queue).toBe('case_intake');
  });

  it('routes a guest submission to a member, never to the owner the guest posted', async () => {
    const kase = await stored('crm_case', idOf(await guestInsert(verify, 'crm_case', newCase({ supplied_email: 'g@ownership-queues.test', owner_id: a.id }))));
    expect(kase.owner_id, 'the guest-posted owner survived').not.toBe(a.id);
    expect(['b', 'c']).toContain(who(kase.owner_id));
  });

  it('leaves a person’s own case with its creator — the rule is for ownerless intake only', async () => {
    const kase = await stored('crm_case', idOf(await verify.hooks.run('crm_case', 'insert', newCase(), { as: a.token })));
    expect(who(kase.owner_id), 'a creator lost their own case to the rota').toBe('a');
    expect(kase.queue ?? null).toBeNull();
  });
});

describe('claiming from the queue (ruling A: the claim writes the owner only)', () => {
  let a: Person;
  let b: Person;
  let rep: Person;

  beforeAll(async () => {
    a = await signUpPerson(verify, `claim-a.${++k}@ownership-queues.test`, {
      name: 'Claimer A', positions: ['crm_service_agent'], permissionSets: ['service_agent'],
    });
    b = await signUpPerson(verify, `claim-b.${++k}@ownership-queues.test`, {
      name: 'Claimer B', positions: ['crm_service_agent'], permissionSets: ['service_agent'],
    });
    // Holds the support permission set but is not a queue member: what a
    // member reads, it reads through the queue, not through the profile.
    rep = await signUpPerson(verify, `claim-rep.${++k}@ownership-queues.test`, {
      name: 'Not A Member', permissionSets: ['service_agent'],
    });
  }, 120_000);

  afterAll(async () => {
    await releasePositions('crm_service_agent');
  });

  it('a member sees a parked case; a non-member does not', async () => {
    const kase = await parkedCase();
    expect(await verify.rows('crm_case', { id: kase.id }, { as: a.token })).toHaveLength(1);
    expect(await verify.rows('crm_case', { id: kase.id }, { as: rep.token }), 'a non-member reads the queue').toHaveLength(0);
  });

  it('a claim makes the claimant the owner and changes nothing else', async () => {
    const kase = await parkedCase({ status: 'new' });
    expect(await attempt(a.token, 'crm_case', kase.id, { owner_id: a.id })).toEqual({ ok: true });
    const after = await stored('crm_case', kase.id);
    expect(after.owner_id).toBe(a.id);
    expect(after.status, 'the claim moved the status — ruling A says it must not').toBe('new');
    expect(after.queue, 'the queue is history the platform keeps on the row').toBe('case_intake');
    // Once owned, the case leaves the other members' view.
    expect(await verify.rows('crm_case', { id: kase.id }, { as: b.token })).toHaveLength(0);
  });

  it('concurrent claims leave exactly one owner, and every loser gets 409', async () => {
    const ql = verify.kernel.getService<Rec>('objectql');
    const people = [a, b];
    const contexts = await Promise.all(people.map((p) => verify.contextFor(p.token)));
    for (let round = 0; round < 3; round++) {
      const kase = await parkedCase();
      const results = await Promise.allSettled(people.map((p, i) =>
        ql.update('crm_case', { id: kase.id, owner_id: p.id }, { where: { id: kase.id }, context: contexts[i] })));
      const won = results.filter((r) => r.status === 'fulfilled');
      const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(won, `round ${round}: not exactly one claim won`).toHaveLength(1);
      for (const loss of lost) {
        expect({ code: loss.reason?.code, status: loss.reason?.status }).toEqual({ code: 'CONCURRENT_UPDATE', status: 409 });
      }
      const owner = (await stored('crm_case', kase.id)).owner_id;
      expect(people.map((p) => p.id)).toContain(owner);
    }
  });

  it('a member cannot claim a parked case for somebody else', async () => {
    const kase = await parkedCase();
    const result = await attempt(a.token, 'crm_case', kase.id, { owner_id: b.id });
    expect(result.ok, 'an agent handed a case to a third party').toBe(false);
    expect((await stored('crm_case', kase.id)).owner_id ?? null).toBeNull();
  });

  it('a status move on a parked case does not claim it — the old gesture is gone', async () => {
    const kase = await parkedCase();
    expect(await attempt(a.token, 'crm_case', kase.id, { status: 'in_progress' })).toEqual({ ok: true });
    const after = await stored('crm_case', kase.id);
    expect(after.status).toBe('in_progress');
    expect(after.owner_id ?? null, 'a status write still stamps the caller as owner').toBeNull();
    expect(after.queue).toBe('case_intake');
  });

  it('the owner can release a case back to the queue, where the other members see it again', async () => {
    const kase = await parkedCase();
    expect(await attempt(a.token, 'crm_case', kase.id, { owner_id: a.id })).toEqual({ ok: true });
    expect(await attempt(a.token, 'crm_case', kase.id, { owner_id: null })).toEqual({ ok: true });
    const after = await stored('crm_case', kase.id);
    expect(after.owner_id ?? null).toBeNull();
    expect(after.queue).toBe('case_intake');
    expect(await verify.rows('crm_case', { id: kase.id }, { as: b.token })).toHaveLength(1);
  });
});

describe('the escalation hand-off is untouched (case_escalation_reassign stays)', () => {
  afterAll(async () => {
    await releasePositions('crm_service_agent', 'crm_service_manager');
  });

  it('an escalated case still goes to the least-loaded service manager', async () => {
    const agent = await signUpPerson(verify, `esc-agent.${++k}@ownership-queues.test`, {
      name: 'Escalating Agent', positions: ['crm_service_agent'], permissionSets: ['service_agent'],
    });
    const manager = await signUpPerson(verify, `esc-manager.${++k}@ownership-queues.test`, {
      name: 'Escalation Manager', positions: ['crm_service_manager'], permissionSets: ['service_agent'],
    });
    const [kase] = await verify.seed('crm_case', [newCase({ status: 'in_progress', owner_id: agent.id })]);
    await systemUpdate(verify, 'crm_case', { id: kase!.id, status: 'escalated', escalation_reason: 'Customer waiting.' });
    const after = await stored('crm_case', String(kase!.id));
    expect(after.owner_id).toBe(manager.id);
    expect(after.escalated_from).toBe(agent.id);
    // An update never runs an assignment rule, so the queue stays as it was.
    expect(after.queue ?? null).toBeNull();
  });
});

describe('leads route the same way', () => {
  afterAll(async () => {
    await releasePositions('crm_sales_rep');
  });

  it('an ownerless lead goes to the rep with fewer unconverted leads', async () => {
    const rep = (n: string) => signUpPerson(verify, `rep-${n}.${++k}@ownership-queues.test`, {
      name: `Rep ${n}`, positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    const busy = await rep('busy');
    const free = await rep('free');
    await verify.seed('crm_lead', [newLead({ owner_id: busy.id })]);
    const lead = await stored('crm_lead', idOf(await systemInsert(verify, 'crm_lead', newLead())));
    expect(lead.owner_id).toBe(free.id);
    expect(lead.queue).toBe('lead_intake');
  });
});
