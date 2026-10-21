// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

/**
 * #2060 item 3 (B-04): the agent an escalation takes a case from keeps READ on
 * it, while it is open — and nobody else gains anything.
 *
 * `case_escalation_reassign` hands an escalating case to the `service_manager`
 * pool and `service_agent` reads `crm_case` own-scope, so the agent lost the
 * case in the save that escalated it. The hand-off now stamps
 * `escalated_from`, and `case_escalated_from_sharing` (a `field` recipient)
 * shares the case with that one user. Every case below is a real write on the
 * booted app, read back as the person named.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let agent: Person;
let other: Person;
let manager: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  const asAgent = { positions: ['service_agent'], permissionSets: ['service_agent'] };
  agent = await signUpPerson(verify, 'agent@escalated-from.test', { name: 'Logging Agent', ...asAgent });
  other = await signUpPerson(verify, 'other@escalated-from.test', { name: 'Other Agent', ...asAgent });
  manager = await signUpPerson(verify, 'manager@escalated-from.test', {
    name: 'Pool Manager', positions: ['service_manager'], permissionSets: ['service_agent'],
  });
}, 120_000);

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0]!;
const reads = async (who: Person, id: string) => (await verify.rows('crm_case', { id }, { as: who.token })).length === 1;
const newCase = (over: Rec = {}) => ({ subject: `Case ${++k}`, description: 'Customer is down.', status: 'new', ...over });

/**
 * The rule-materialised grants on one case, by rule name.
 *
 * Both rules are declared by the app. Since @objectstack/spec 18.0.0-next.4 a
 * declared rule has no `sys_sharing_rule` row: plugin-sharing reads it from the
 * registry, its id IS its name, and the grants it materialises carry that name
 * as `source_id` (changeset `23952-declared-sharing-rules-registry`).
 */
async function grants(id: string): Promise<string[]> {
  const who = new Map([[agent.id, 'agent'], [other.id, 'other'], [manager.id, 'manager']]);
  return (await verify.rows('sys_record_share', { record_id: id, source: 'rule' }))
    .map((g: Rec) => `${String(g.source_id)}→${who.get(String(g.recipient_id)) ?? g.recipient_id}:${g.access_level}`)
    .sort();
}

describe('the agent an escalation takes a case from keeps read on it', () => {
  it('a case logged Critical: the agent still reads it right after the save', async () => {
    const kase = await verify.hooks.run('crm_case', 'insert', newCase({ priority: 'critical' }), { as: agent.token });
    const after = await stored(kase.id);
    expect(after.owner_id, 'the case never reached the pool, so this proves nothing').toBe(manager.id);
    expect(after.escalated_from).toBe(agent.id);
    expect(await reads(agent, kase.id), 'the agent lost the case they just logged').toBe(true);
    expect(await reads(other, kase.id), 'another agent can read it').toBe(false);
    // The manager's grant is the one it always was; the new one is the agent's, read-only.
    expect(await grants(kase.id)).toEqual([
      'case_escalated_from_sharing→agent:read',
      'case_escalation_sharing→manager:edit',
    ]);
  });

  it('a case the agent did not create: escalating it keeps them on it', async () => {
    // Seeded as the system, the way intake and the demo book arrive: no creator.
    const [kase] = await verify.seed('crm_case', [newCase({ status: 'in_progress', priority: 'high', owner_id: agent.id })]);
    expect(kase!.created_by ?? null, 'the agent created this case, so the creator would do').toBeNull();
    await verify.hooks.run('crm_case', 'update', {
      id: kase!.id, status: 'escalated', priority: 'critical', escalation_reason: 'Needs a manager.',
    }, { as: agent.token });
    expect((await stored(kase!.id)).escalated_from).toBe(agent.id);
    expect(await reads(agent, kase!.id)).toBe(true);
    expect(await reads(other, kase!.id)).toBe(false);
  });

  it('read only: the agent cannot change the case the manager now works', async () => {
    const kase = await verify.hooks.run('crm_case', 'insert', newCase({ priority: 'critical' }), { as: agent.token });
    await expect(verify.hooks.run('crm_case', 'update', { id: kase.id, subject: 'Mine again' }, { as: agent.token }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('closing the case ends the grant', async () => {
    const kase = await verify.hooks.run('crm_case', 'insert', newCase({ priority: 'critical' }), { as: agent.token });
    expect(await reads(agent, kase.id), 'no grant to end, so this proves nothing').toBe(true);
    await systemUpdate(verify, 'crm_case', { id: kase.id, status: 'closed', resolution: 'Fixed.' });
    expect(await reads(agent, kase.id)).toBe(false);
    expect(await grants(kase.id)).not.toContain('case_escalated_from_sharing→agent:read');
  });

  it('nobody can name the recipient: a caller-supplied escalated_from is dropped', async () => {
    const kase = await verify.hooks.run('crm_case', 'insert', newCase({ escalated_from: other.id }), { as: agent.token });
    await verify.hooks.run('crm_case', 'update', { id: kase.id, escalated_from: other.id }, { as: agent.token });
    expect((await stored(kase.id)).escalated_from ?? null).toBeNull();
    expect(await reads(other, kase.id)).toBe(false);
  });

  it('an ownerless case was taken from nobody: no recipient is stamped', async () => {
    const [kase] = await verify.seed('crm_case', [newCase({ status: 'in_progress', owner_id: agent.id })]);
    await systemUpdate(verify, 'crm_case', { id: kase!.id, owner_id: null });
    await systemUpdate(verify, 'crm_case', { id: kase!.id, status: 'escalated', escalation_reason: 'Breached.' });
    const after = await stored(kase!.id);
    expect(after.owner_id, 'the pool did not take the case').toBe(manager.id);
    expect(after.escalated_from ?? null).toBeNull();
  });
});
