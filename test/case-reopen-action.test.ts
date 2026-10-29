// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * Reopen Case (#2366 row 8).
 *
 * Measured on 18.2.0 before it (#2320 Service S8): a resolved or closed case
 * had no Reopen, though `case_status_progression` allows both back to In
 * Progress; the move was Edit and the Status dropdown.
 *
 * What is pinned:
 *
 *  - the OFFER: on a resolved or closed case, to a persona whose sets may edit
 *    a case — the grant Escalate Case and Close Case read — and on nothing else;
 *    and the move it makes is one the machine declares;
 *  - the WRITE, through the action door as the agent who owns the case: back
 *    to In Progress, `is_closed` derived false;
 *  - the SLA, as the Service Manual states it: the due date is kept (the clock
 *    is not restarted), and a breach already recorded stays recorded.
 */

type Rec = Record<string, any>;

const actions: Rec[] = (stack as Rec).actions ?? [];
const reopen: Rec = actions.find((a) => a.name === 'reopen_case')!;
const caseObject: Rec = ((stack as Rec).objects as Rec[]).find((o) => o.name === 'crm_case')!;
const machine: Record<string, string[]> =
  (caseObject.validations as Rec[]).find((v) => v.name === 'case_status_progression')!.transitions;
const STATUSES = Object.keys(machine);

let verify: VerifyStack;
let agent: Person;
let rep: Person;
let accountId: string;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  agent = await signUpPerson(verify, 'agent@case-reopen.test', {
    name: 'Reopen Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  rep = await signUpPerson(verify, 'rep@case-reopen.test', {
    name: 'Reopen Rep', positions: ['sales_rep', 'na_sales_team'], permissionSets: ['sales_rep'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Reopen Co', owner_id: agent.id }]);
  accountId = String(account!.id);
}, 180_000);

const permissionsOf = async (p: Person): Promise<Rec> => {
  const res = await verify.apiAs(p.token, 'GET', '/auth/me/permissions');
  expect(res.status, await res.clone().text()).toBe(200);
  const body: Rec = await res.json();
  return (body.data ?? body).objects;
};

const offered = (record: Rec, permissions: Rec): boolean => {
  const result = ExpressionEngine.evaluate<boolean>(reopen.visible, {
    user: { id: 'u1', positions: [] }, record, permissions: permissions as never,
  });
  expect(result.ok, `reopen_case.visible did not evaluate: ${JSON.stringify(result)}`).toBe(true);
  return (result as Rec).value === true;
};

describe('the offer', () => {
  it('is a declarative update to In Progress, a move the machine declares from both statuses it is offered on', async () => {
    expect(reopen.operation).toBe('update');
    expect(reopen.patch).toEqual({ status: 'in_progress' });
    const permissions = await permissionsOf(agent);
    const from = STATUSES.filter((status) => offered({ status }, permissions));
    expect(from).toEqual(['resolved', 'closed']);
    for (const status of from) expect(machine[status]).toContain('in_progress');
  });

  it('is withheld from a sales rep, whose set reads cases but may not edit them', async () => {
    const permissions = await permissionsOf(rep);
    expect(offered({ status: 'closed' }, permissions)).toBe(false);
  });

  it('is withheld before the record has loaded', async () => {
    expect(offered({}, await permissionsOf(agent))).toBe(false);
  });
});

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0]!;

/** A case the agent owns, settled at `status`, past an SLA due date. */
const settledCase = async (status: 'resolved' | 'closed', breached: boolean): Promise<Rec> => (await verify.seed('crm_case', [{
  subject: `Reopen me ${++k}`, description: 'It broke again.', crm_account: accountId, priority: 'medium',
  status, resolution: 'Restarted the service.', owner_id: agent.id,
  sla_due_date: '2026-01-02T00:00:00.000Z', closed_date: status === 'closed' ? '2026-01-03T00:00:00.000Z' : null,
  is_sla_violated: breached,
}]))[0]!;

describe('the write, and what it does to the SLA', () => {
  it.each(['resolved', 'closed'] as const)('takes a %s case back to In Progress as the agent who owns it', async (status) => {
    const c = await settledCase(status, false);
    await verify.actions.run('crm_case', 'reopen_case', { as: agent.token, recordId: c.id });
    const after = await stored(c.id);
    expect(after.status).toBe('in_progress');
    expect(after.is_closed).toBe(false);
  });

  it('keeps the SLA due date: the clock is not restarted', async () => {
    const c = await settledCase('closed', false);
    await verify.actions.run('crm_case', 'reopen_case', { as: agent.token, recordId: c.id });
    expect(String((await stored(c.id)).sla_due_date)).toBe('2026-01-02T00:00:00.000Z');
  });

  it('keeps a breach already recorded', async () => {
    const c = await settledCase('closed', true);
    await verify.actions.run('crm_case', 'reopen_case', { as: agent.token, recordId: c.id });
    expect((await stored(c.id)).is_sla_violated).toBe(true);
  });
});
