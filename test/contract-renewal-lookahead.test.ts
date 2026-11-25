// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { RENEWAL_LOOKAHEAD_DAYS } from '../src/sales/objects/contract.object';

/**
 * Renewal Notice (Days) may not ask for more than the renewal sweep can
 * honour (#2534).
 *
 * `contract_renewal` pre-filters to activated contracts ending within the next
 * N days and then applies each contract's own `renewal_notice_days`. A notice
 * window longer than N was accepted on the form and then silently truncated:
 * set 180, and the reminder arrived 120 days out, 60 days late. The field now
 * carries `max: N`, and both halves read `RENEWAL_LOOKAHEAD_DAYS`.
 *
 * Two halves, two kinds of evidence:
 *
 * - PARITY, read off the shipped metadata (no boot): the field's `max` and the
 *   pre-filter's span are the same number. Interpolating one constant into
 *   both makes drift unlikely; this is what fails when someone writes a
 *   literal back into one of them.
 * - THE DOOR, on the booted app: a person's save above the bound is refused
 *   with a field-level validation error, and a save at the bound is stored.
 *   The sweep reaching a contract at the bound is pinned in
 *   `test/flow-scheduled.test.ts` (`contract_renewal`, the pre-filter case).
 */

type Rec = Record<string, any>;

const FIELD = 'renewal_notice_days';

const contractObject = (): Rec =>
  (((stack as Rec).objects ?? []) as Rec[]).find((o) => o?.name === 'crm_contract')!;

const preFilter = (): Rec => {
  const flow = (((stack as Rec).flows ?? []) as Rec[]).find((f) => f?.name === 'contract_renewal');
  const node = ((flow?.nodes ?? []) as Rec[]).find((n) => n?.id === 'query_contracts');
  return (node?.config?.filter ?? {}) as Rec;
};

/** The day count in the pre-filter's upper `end_date` bound, as the shipped CEL spells it. */
const preFilterSpan = (): number => {
  const lte = preFilter().end_date?.$lte;
  const source = typeof lte === 'string' ? lte : String(lte?.source ?? '');
  const m = source.match(/^isoDate\(daysFromNow\((\d+)\)\)$/);
  if (!m) throw new Error(`contract_renewal pre-filter changed shape: end_date.$lte is ${JSON.stringify(lte)}`);
  return Number(m[1]);
};

describe('the notice bound and the sweep look-ahead are one number', () => {
  it('the field declares a max', () => {
    const field = contractObject().fields?.[FIELD];
    expect(field, `crm_contract.${FIELD} is gone`).toBeTruthy();
    expect(field.max, `crm_contract.${FIELD} has no max: the form accepts windows the sweep truncates`).toBe(
      RENEWAL_LOOKAHEAD_DAYS,
    );
  });

  it('the pre-filter spans exactly the field max', () => {
    // A pre-filter shorter than the max truncates the longest notice windows
    // (the #2534 defect). A longer one honours nothing more and spends the
    // run's 500-contract budget on contracts that are not yet due.
    expect(preFilterSpan()).toBe(contractObject().fields[FIELD].max);
  });
});

describe('a save above the look-ahead is refused at the door', () => {
  let verify: VerifyStack;
  let manager: Person;
  let k = 0;

  beforeAll(async () => {
    verify = await hotcrmStack();
    await verify.signIn();
    manager = await signUpPerson(verify, 'manager@contract-renewal-lookahead.test', {
      name: 'Notice Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
  }, 120_000);

  /** A draft contract the manager owns, on a fresh account and contact. */
  const draft = async (doc: Rec = {}): Promise<Rec> => {
    const [account] = await verify.seed('crm_account', [{ name: `Notice Co ${++k}`, tier: 'smb', owner_id: manager.id }]);
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Nora', last_name: `Notice ${k}`, email: `nora${k}@contract-renewal-lookahead.test`,
      crm_account: account!.id, owner_id: manager.id,
    }]);
    return verify.hooks.run('crm_contract', 'insert', {
      crm_account: account!.id, crm_contact: contact!.id, contract_type: 'subscription', contract_value: 12_000,
      billing_frequency: 'monthly', payment_terms: 'net_30', status: 'draft',
      name: 'Fixture Contract', contract_term_months: 12, start_date: '2027-01-01', end_date: '2027-12-31', ...doc,
    }, { as: manager.token });
  };

  /** The form's save: the REST door, as the manager. */
  const save = async (id: string, doc: Rec) => {
    const res = await verify.apiAs(manager.token, 'PATCH', `/data/crm_contract/${id}`, doc);
    return { status: res.status, body: (await res.json()) as Rec };
  };
  const stored = async (id: string): Promise<unknown> => (await verify.rows('crm_contract', { id }))[0]?.[FIELD];

  /** The field-level breach the engine's validation envelope names. */
  const breach = expect.arrayContaining([expect.objectContaining({ field: FIELD, code: 'max_value' })]);

  it('refuses the card’s 180 on save, naming the field, and keeps the stored value', async () => {
    const row = await draft({ [FIELD]: 30 });
    const { status, body } = await save(String(row.id), { [FIELD]: RENEWAL_LOOKAHEAD_DAYS + 60 });
    expect(status).toBe(400);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.fields).toEqual(breach);
    expect(await stored(String(row.id)), 'the refused value was stored anyway').toBe(30);
  });

  it('stores a save at the look-ahead itself', async () => {
    const row = await draft({ [FIELD]: 30 });
    const { status } = await save(String(row.id), { [FIELD]: RENEWAL_LOOKAHEAD_DAYS });
    expect(status).toBe(200);
    expect(await stored(String(row.id))).toBe(RENEWAL_LOOKAHEAD_DAYS);
  });

  it('refuses a new contract asking for one day more', async () => {
    const refusal = await draft({ [FIELD]: RENEWAL_LOOKAHEAD_DAYS + 1 }).then(() => null, (e: Rec) => e);
    expect(refusal, 'a contract was created with a notice window the sweep cannot honour').not.toBeNull();
    expect(refusal!.code).toBe('VALIDATION_FAILED');
    expect(refusal!.fields).toEqual(breach);
  });
});
