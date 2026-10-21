// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Who is offered Escalate Case and Close Case (#2060 item 8).
 *
 * `src/service/actions/case.actions.ts` states the rule: an action's `visible`
 * mirrors the grant, never a convenience flag. Both buttons edit the case they
 * sit on, so each is offered exactly to the personas whose permission set may
 * edit a case. Until #2060 both were drawn for every reader on the record's
 * state alone: a sales rep or a sales manager who opened a case was offered
 * Escalate Case and, on submitting it, read "Node 'escalate' failed:
 * update_record(crm_case) failed: You do not have permission".
 *
 * The personas are the five the demo staffs (`src/sales/sharing/demo-staffing.ts`:
 * two reps holding one set, the sales manager, the service agent, the service
 * manager), the marketing user, and the administrator. Each is signed up with
 * its position and its set, the way the demo binds them.
 *
 * Two halves, each driven through `@objectstack/verify` over the shipped app:
 *
 *  - the OFFER: each action's `visible`, evaluated with the effective object
 *    permissions the server publishes at `/auth/me/permissions`, the map the
 *    console evaluates `current_user.can(…)` against;
 *  - the WRITE it offers, for Escalate Case: started and submitted as each
 *    persona, the way the console runs it. The offer is pinned to agree with
 *    the write, persona by persona, so a set that gains or loses the edit
 *    right moves both together or this file goes red.
 */

const actions: Rec[] = (stack as Rec).actions ?? [];
const actionNamed = (name: string): Rec => {
  const a = actions.find((x) => x.name === name);
  if (!a) throw new Error(`no ${name} action registered`);
  return a;
};

/** Each persona's position and set, as the demo staffing binds them. */
const PERSONAS: Record<string, { positions: string[]; set: string }> = {
  sales_rep: { positions: ['sales_rep', 'na_sales_team'], set: 'sales_rep' },
  sales_manager: { positions: ['sales_manager'], set: 'sales_manager' },
  marketing_user: { positions: ['marketing_user'], set: 'marketing_user' },
  service_agent: { positions: ['service_agent'], set: 'service_agent' },
  service_manager: { positions: ['service_manager'], set: 'service_agent' },
};

/** The personas whose sets may not edit a case, and those whose sets may. */
const NOT_OFFERED = ['sales_rep', 'sales_manager', 'marketing_user'] as const;
const OFFERED = ['service_agent', 'service_manager', 'admin'] as const;

let verify: VerifyStack;
let accountId: string;
const who: Record<string, Person> = {};
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  for (const [name, p] of Object.entries(PERSONAS)) {
    who[name] = await signUpPerson(verify, `${name}@case-actions-offer.test`, {
      name: `Offer ${name}`, positions: p.positions, permissionSets: [p.set],
    });
  }
  const adminToken = await verify.signIn();
  who.admin = { token: adminToken, id: String((await verify.contextFor(adminToken)).userId) };
  const [account] = await verify.seed('crm_account', [{ name: 'Case Offer Co', owner_id: who.admin.id }]);
  accountId = String(account!.id);
}, 180_000);

const permissionsOf = async (persona: string): Promise<Rec> => {
  const res = await verify.apiAs(who[persona]!.token, 'GET', '/auth/me/permissions');
  expect(res.status, await res.clone().text()).toBe(200);
  const body: Rec = await res.json();
  const objects = (body.data ?? body).objects;
  expect(objects, 'the permissions answer carries no objects map').toBeTruthy();
  return objects;
};

const offered = async (actionName: string, persona: string, record: Rec): Promise<boolean> => {
  const result = ExpressionEngine.evaluate<boolean>(actionNamed(actionName).visible, {
    user: { id: who[persona]!.id, positions: PERSONAS[persona]?.positions ?? [] },
    record,
    permissions: (await permissionsOf(persona)) as never,
  });
  expect(result.ok, `${actionName}.visible did not evaluate for ${persona}: ${JSON.stringify(result)}`).toBe(true);
  return (result as Rec).value === true;
};

/** An open, unescalated case the persona owns, written as the system so every persona can hold one. */
const openCaseOf = async (persona: string): Promise<Rec> => (await verify.seed('crm_case', [{
  subject: `Offer ${persona} ${++k}`, description: 'Printer on fire.', crm_account: accountId,
  status: 'new', priority: 'medium', owner_id: who[persona]!.id,
}]))[0]!;

const OPEN = { is_escalated: false, is_closed: false };

describe('Escalate Case and Close Case are offered only to a caller whose set may edit a case (#2060 item 8)', () => {
  it.each(['escalate_case', 'close_case'])('%s is hidden from sales_rep, sales_manager and marketing_user', async (name) => {
    for (const persona of NOT_OFFERED) expect(await offered(name, persona, OPEN), `${name} offered to ${persona}`).toBe(false);
  });

  it.each(['escalate_case', 'close_case'])('%s is offered to service_agent, service_manager and the admin', async (name) => {
    for (const persona of OFFERED) expect(await offered(name, persona, OPEN), `${name} hidden from ${persona}`).toBe(true);
  });

  it('still reads the record state first: a closed case offers neither, an escalated one no Escalate Case', async () => {
    expect(await offered('escalate_case', 'admin', { is_escalated: false, is_closed: true })).toBe(false);
    expect(await offered('close_case', 'admin', { is_escalated: false, is_closed: true })).toBe(false);
    expect(await offered('escalate_case', 'admin', { is_escalated: true, is_closed: false })).toBe(false);
    expect(await offered('close_case', 'admin', { is_escalated: true, is_closed: false })).toBe(true);
  });
});

describe('the Escalate Case offer agrees with the write it starts (#2060 item 8)', () => {
  /** Start Escalate Case on `caseId` and submit its screen, as the console does; the refusal envelope, or null. */
  const escalate = async (persona: string, caseId: string): Promise<Rec | null> => {
    const as = { as: who[persona]!.token };
    try {
      const run = await verify.flows.run('escalate_case', { recordId: caseId }, as);
      await verify.flows.resume(run, { reason: 'Customer threatening churn' }, as);
      return null;
    } catch (err) {
      const e = err as Rec;
      return { code: e.code, status: e.status, message: String(e.message) };
    }
  };

  it.each(NOT_OFFERED)('%s: refused at the escalate node, and the case is left as it was', async (persona) => {
    const kase = await openCaseOf(persona);
    const refusal = await escalate(persona, kase.id);
    expect(refusal).toMatchObject({ code: 'FLOW_FAILED', status: 400 });
    expect(refusal!.message).toContain("Node 'escalate' failed");
    const [row] = await verify.rows('crm_case', { id: kase.id });
    expect(row).toMatchObject({ status: 'new', priority: 'medium', is_escalated: false });
  });

  it.each(OFFERED)('%s: escalates the case', async (persona) => {
    const kase = await openCaseOf(persona);
    expect(await escalate(persona, kase.id)).toBeNull();
    const [row] = await verify.rows('crm_case', { id: kase.id });
    expect(row).toMatchObject({ status: 'escalated', priority: 'critical', is_escalated: true });
  });
});
