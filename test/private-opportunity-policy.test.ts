// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { CrmPositions } from '../src/sales/sharing/positions';
import { PRIVATE_OPPORTUNITY_PREDICATE } from '../src/sales/profiles/_private-opportunity';

type AnyRec = Record<string, any>;

/**
 * A deal flagged Private stays its owner's, for every org-wide reader
 * (ADR-0058, hotcrm#2489).
 *
 * The rule is "the set that grants `viewAllRecords` on opportunities also
 * carries the private-deal row filter". It lived in `sales_manager` and was
 * copied into `marketing_user`; `finance_controller` and `project_manager`
 * (#2316) were added without it, and every finance, PMO, project-director and
 * project-manager holder read every private deal (measured on 6.4.0 by the
 * end-to-end test). The static guard fails the next set that forgets; the
 * engine half reads one private deal as each position the card names.
 */

const permissionSets: AnyRec[] = (stack as any).permissions ?? [];

/**
 * `system_admin` reads every row of every object by design: the docs say a
 * private deal is visible to "its owner (and to administrators)"
 * (`content/docs/administration/sharing-and-security.mdx`).
 */
const EXEMPT = new Set(['system_admin']);

const readsEveryOpportunity = (ps: AnyRec): boolean => {
  const grant = (ps.objects ?? {}).crm_opportunity ?? {};
  return grant.viewAllRecords === true || grant.modifyAllRecords === true;
};

const carriesThePolicy = (ps: AnyRec): boolean =>
  ((ps.rowLevelSecurity ?? []) as AnyRec[]).some((policy) =>
    policy.object === 'crm_opportunity' && policy.operation === 'select' && policy.using === PRIVATE_OPPORTUNITY_PREDICATE);

describe('every org-wide opportunity reader carries the private-deal filter', () => {
  it('names each set that reads every opportunity, so the guard is guarding', () => {
    expect(permissionSets.filter(readsEveryOpportunity).map((ps) => ps.name).sort())
      .toEqual(['finance_controller', 'marketing_user', 'project_manager', 'sales_manager', 'system_admin']);
  });

  it('holds for every one of them but the administrator', () => {
    const missing = permissionSets
      .filter((ps) => readsEveryOpportunity(ps) && !EXEMPT.has(ps.name))
      .filter((ps) => !carriesThePolicy(ps))
      .map((ps) => ps.name);
    expect(missing, `sets reading every opportunity without the private-deal filter: ${missing.join(', ')}`).toEqual([]);
  });
});

/**
 * On the shipped app: a rep's private deal, read by name through the data
 * API as one holder of each position (with the sets the position grants),
 * and by its owner.
 */
describe('a private deal, read through the data API', () => {
  const POSITIONS = [
    'crm_finance_controller', 'crm_project_manager', 'crm_project_director', 'crm_pmo',
    'crm_sales_manager', 'crm_sales_rep', 'crm_executive', 'crm_marketing_user', 'crm_ar_accountant',
  ];
  let verify: VerifyStack;
  let owner: Person;
  const readers = new Map<string, Person>();
  const NAME = 'Private Policy Test Deal';
  const OPEN = 'Open Policy Test Deal';

  const setsOf = (position: string): string[] =>
    ((CrmPositions as AnyRec[]).find((p) => p.name === position)?.permissionSets ?? []) as string[];

  const rowsNamed = async (who: Person, name: string): Promise<AnyRec[]> => {
    const filter = encodeURIComponent(JSON.stringify({ name }));
    const res = await verify.apiAs(who.token, 'GET', `/data/crm_opportunity?filter=${filter}`);
    expect(res.status, `list as ${name}`).toBe(200);
    const body = (await res.json()) as AnyRec;
    const rows = (body.records ?? body.data?.records ?? body.data ?? []) as AnyRec[];
    return rows.filter((r) => r.name === name);
  };

  beforeAll(async () => {
    verify = await hotcrmStack();
    owner = await signUpPerson(verify, 'owner@private-opportunity-policy.test', {
      name: 'Deal Owner', positions: ['crm_sales_rep'], permissionSets: setsOf('crm_sales_rep'),
    });
    for (const position of POSITIONS) {
      readers.set(position, await signUpPerson(verify, `${position}@private-opportunity-policy.test`, {
        name: `Reader ${position}`, positions: [position], permissionSets: setsOf(position),
      }));
    }
    const [account] = await verify.seed('crm_account', [{ name: 'Private Policy Co', owner_id: owner.id }]);
    await verify.seed('crm_opportunity', [
      { name: NAME, amount: 20_000, stage: 'negotiation', close_date: '2030-06-30', crm_account: account!.id, owner_id: owner.id, is_private: true },
      { name: OPEN, amount: 10_000, stage: 'negotiation', close_date: '2030-06-30', crm_account: account!.id, owner_id: owner.id, is_private: false },
    ]);
  }, 120_000);

  it('its owner reads it', async () => {
    expect(await rowsNamed(owner, NAME)).toHaveLength(1);
  });

  it.each([
    'crm_finance_controller', 'crm_project_manager', 'crm_project_director', 'crm_pmo',
    'crm_sales_manager', 'crm_sales_rep', 'crm_executive', 'crm_marketing_user', 'crm_ar_accountant',
  ])('a holder of %s does not', async (position) => {
    expect(await rowsNamed(readers.get(position)!, NAME)).toEqual([]);
  });

  it('the org-wide readers still read the same owner\'s deal that is not private', async () => {
    for (const position of ['crm_finance_controller', 'crm_project_manager', 'crm_sales_manager', 'crm_marketing_user']) {
      expect(await rowsNamed(readers.get(position)!, OPEN), position).toHaveLength(1);
    }
  });
});
