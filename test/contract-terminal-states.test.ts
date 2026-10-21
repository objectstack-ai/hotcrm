// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { Contract } from '../src/revenue/objects/contract.object';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * A contract's status moves only along CON-002, and its two end states are
 * final (#2192).
 *
 * `docs/feature-inventory.md` CON-002: `draft → in_approval → activated →
 * expired/terminated`; a renewal is a new contract, never a revived row. The
 * `contract_status_progression` table encoded exactly that, at `warning`
 * severity, so the engine logged a departure and stored it. Measured on
 * `main` `d723f6f9` with `@objectstack/*` 18.0.0, as the dev admin and as a
 * sales manager, through `PATCH /data/crm_contract/:id`: expired → activated,
 * terminated → activated, activated → draft and draft → activated each
 * answered 200 and stored the new status.
 *
 * The rule is now `error`. What these pins hold, as both people who can edit a
 * contract, through the REST door and the engine's write door (`hooks.run`):
 *
 *   1. A move outside the table is refused — HTTP 400 `VALIDATION_FAILED`,
 *      on `status`, carrying the rule's own message — and the contract keeps
 *      the status it had.
 *   2. Every move inside the table saves, walked end to end.
 *   3. An edit that leaves the status as stored saves on an expired or a
 *      terminated contract, with the status re-sent (as a full form submit
 *      does) or not: the rule judges a status CHANGE, so it freezes no row.
 *   4. A create is not judged (the rule declares no `initialStates`): a
 *      contract imported straight into a late state still lands.
 *
 * The one automated edge, `contract_expiration` (activated → expired, as the
 * system), is pinned where the sweep is: `test/flow-scheduled.test.ts`.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
const people = {} as Record<'admin' | 'manager', Person>;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  const adminToken = await verify.signIn();
  people.admin = { token: adminToken, id: String((await verify.contextFor(adminToken)).userId) };
  people.manager = await signUpPerson(verify, 'manager@contract-terminal-states.test', {
    name: 'Contract Status Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

const PEOPLE = [['the admin', 'admin'], ['a sales manager', 'manager']] as const;

/** The rule under test, read off the object so the pins follow its message rather than copy it. */
const rule = (Contract.validations as Rec[]).find((v) => v.name === 'contract_status_progression')!;

/** A contract of the manager's stored at `status`, written as the system (an insert is not judged). */
const contractAt = async (status: string): Promise<Rec> => {
  const n = ++k;
  const [account] = await verify.seed('crm_account', [{ name: `Terminal Works ${n}`, owner_id: people.manager.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Tess', last_name: `Terminal ${n}`, email: `tess${n}@contract-terminal-states.test`,
    crm_account: account!.id, owner_id: people.manager.id,
  }]);
  return (await verify.seed('crm_contract', [{
    crm_account: account!.id, crm_contact: contact!.id, owner_id: people.manager.id, status,
    contract_type: 'subscription', contract_value: 12_000, billing_frequency: 'monthly', payment_terms: 'net_30',
    contract_term_months: 12, start_date: '2025-01-01', end_date: '2026-01-01',
  }]))[0]!;
};

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_contract', { id }))[0]!;

/** A REST call as `who`: the HTTP status and the parsed body. */
const rest = async (who: Person, method: string, path: string, body?: unknown): Promise<{ status: number; body: Rec }> => {
  const res = await verify.apiAs(who.token, method, path, body);
  const text = await res.text();
  let parsed: Rec = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
};

const patch = (who: Person, id: string, body: Rec) => rest(who, 'PATCH', `/data/crm_contract/${id}`, body);

/** Moves the table does not hold: reviving either end state, going back from Activated, skipping approval. */
const REFUSED = [
  ['expired', 'activated'],
  ['terminated', 'activated'],
  ['activated', 'draft'],
  ['draft', 'activated'],
] as const;

describe('the rule is the contract lifecycle’s hold (#2192)', () => {
  it('blocks, over status, and declares no initial states', () => {
    expect(rule, 'contract_status_progression is not declared on crm_contract').toBeTruthy();
    expect({ type: rule.type, field: rule.field, severity: rule.severity, initialStates: rule.initialStates })
      .toEqual({ type: 'state_machine', field: 'status', severity: 'error', initialStates: undefined });
  });

  it('refuses each probed move by its own table — the precondition for the cases below', () => {
    // A case here that the table allowed would pass below for the wrong reason.
    for (const [from, to] of REFUSED) expect(rule.transitions[from], `${from} → ${to}`).not.toContain(to);
  });
});

describe('a move outside the table is refused, and the contract keeps its status (#2192)', () => {
  it.each(PEOPLE.flatMap(([label, key]) => REFUSED.map(([from, to]) => [label, from, to, key] as const)))(
    '%s: %s → %s through REST PATCH',
    async (_label, from, to, key) => {
      const contract = await contractAt(from);
      const res = await patch(people[key], contract.id, { status: to });
      expect({ status: res.status, code: res.body.code }).toEqual({ status: 400, code: 'VALIDATION_FAILED' });
      expect(res.body.fields).toEqual([expect.objectContaining({
        field: 'status', code: 'invalid_transition', message: rule.message, constraint: { from, to },
      })]);
      expect((await stored(contract.id)).status).toBe(from);
    },
  );

  it.each(PEOPLE)('%s: expired → activated through the engine write door', async (_label, key) => {
    const contract = await contractAt('expired');
    const err = await verify.hooks.run('crm_contract', 'update', { id: contract.id, status: 'activated' }, { as: people[key].token })
      .then(() => null, (e: Rec) => e);
    expect({ name: err?.name, code: err?.code, message: err?.message })
      .toEqual({ name: 'ValidationError', code: 'VALIDATION_FAILED', message: rule.message });
    expect((await stored(contract.id)).status).toBe('expired');
  });
});

describe('every move inside the table saves (#2192)', () => {
  it.each(PEOPLE)('%s walks draft → in approval → draft → in approval → activated → terminated', async (_label, key) => {
    const contract = await contractAt('draft');
    for (const to of ['in_approval', 'draft', 'in_approval', 'activated', 'terminated']) {
      const res = await patch(people[key], contract.id, { status: to });
      expect({ to, status: res.status }).toEqual({ to, status: 200 });
      expect((await stored(contract.id)).status).toBe(to);
    }
  });

  it.each(PEOPLE)('%s terminates a draft and an in-approval contract, and expires an activated one', async (_label, key) => {
    for (const [from, to] of [['draft', 'terminated'], ['in_approval', 'terminated'], ['activated', 'expired']] as const) {
      const contract = await contractAt(from);
      const res = await patch(people[key], contract.id, { status: to });
      expect({ from, to, status: res.status }).toEqual({ from, to, status: 200 });
      expect((await stored(contract.id)).status).toBe(to);
    }
  });
});

describe('an edit that leaves the status as stored still saves on an ended contract (#2192)', () => {
  it.each(PEOPLE.flatMap(([label, key]) => (['expired', 'terminated'] as const).map((s) => [label, s, key] as const)))(
    '%s edits a %s contract, with and without the status re-sent',
    async (_label, status, key) => {
      const contract = await contractAt(status);
      const plain = await patch(people[key], contract.id, { special_terms: 'Archived copy filed with legal.' });
      expect(plain.status).toBe(200);
      const resent = await patch(people[key], contract.id, { status, description: 'Closed out.' });
      expect(resent.status).toBe(200);
      const row = await stored(contract.id);
      expect({ status: row.status, special_terms: row.special_terms, description: row.description })
        .toEqual({ status, special_terms: 'Archived copy filed with legal.', description: 'Closed out.' });
    },
  );
});

describe('a create is not judged (#2192)', () => {
  it.each(PEOPLE)('%s creates a contract straight into Expired', async (_label, key) => {
    const n = ++k;
    const [account] = await verify.seed('crm_account', [{ name: `Imported Works ${n}`, owner_id: people.manager.id }]);
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Ivo', last_name: `Import ${n}`, email: `ivo${n}@contract-terminal-states.test`,
      crm_account: account!.id, owner_id: people.manager.id,
    }]);
    const res = await rest(people[key], 'POST', '/data/crm_contract', {
      crm_account: account!.id, crm_contact: contact!.id, status: 'expired', contract_type: 'subscription',
      contract_value: 1_000, contract_term_months: 12, start_date: '2025-01-01', end_date: '2026-01-01',
    });
    expect(res.status).toBe(201);
    const [row] = await verify.rows('crm_contract', { crm_contact: contact!.id });
    expect(row?.status).toBe('expired');
  });
});
