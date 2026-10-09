// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { AccountApprovalFlow } from '../src/sales/flows/account-approval.flow';
import { CrmSeedData } from '../objectstack.composition';
import { hotcrmStack, conditionHolds as holdsOn, signUpPerson, flowRuns } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The account approval gate, and the thing that actually has to hold about it:
 * **it is ON in the box** — the one place it inverts its lead sibling.
 *
 * REQ-0003 acceptance 4 asks for it in as many words: "A newly created account
 * sits in a pending state, appears in the platform approval inbox HotCRM
 * already mounts, and only reaches the approved state through a decision on
 * that request." `lead_conversion_approval` ships OFF because REQ-0005 asked
 * for the opposite, so the two flows are deliberately not symmetric and a
 * reader comparing them needs this file to say which way each one points.
 *
 * ⚠️ The shipped-default assertion is not decoration. `defaultValue: 'pending'`
 * IS the switch — an install that wants no account sign-off changes that one
 * value to `approved`, whereupon the start condition below is false for every
 * record that will ever exist. A silent change to it would disarm the gate for
 * every install, and no other test in this repo would notice.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const account = objects.find((o) => o.name === 'crm_account') as AnyRec | undefined;

/** The shipped app booted by `@objectstack/verify` — its automation service is the evaluator. */
let verify: VerifyStack;
beforeAll(async () => {
  verify = await hotcrmStack();
}, 120_000);

/** Evaluate a flow condition exactly as the engine does. */
const conditionHolds = (condition: unknown, vars: Record<string, unknown>): boolean => holdsOn(verify, condition, vars);

const startCondition = (AccountApprovalFlow.nodes as Rec[])
  .find((n) => n.id === 'start')?.config?.condition;

describe('account approval — the gate ships armed (REQ-0003)', () => {
  it('registers under the name the docs and Flow Runs list it by', () => {
    expect(AccountApprovalFlow.name).toBe('account_approval');
    expect(AccountApprovalFlow.type).toBe('record_change');
    // A gate exists to CONSTRAIN the submitter, so it is not evaluated under
    // the submitter's own scope — and the verdict lands on a `readonly` column.
    expect(AccountApprovalFlow.runAs).toBe('system');
  });

  it('the approval column ships `pending`, which is what arms it', () => {
    const field = account?.fields?.approval_status;
    expect(field, 'crm_account.approval_status is missing').toBeTruthy();
    // FIELD-level default, not an option-level `default: true`: the latter only
    // preselects in a UI form, so an API or flow insert would land `null` and
    // never match the start condition below.
    expect(field.defaultValue).toBe('pending');
    // Only the platform's own approval write may reach it.
    expect(field.readonly).toBe(true);
  });

  it('the start condition fires for a new account and for nothing else', () => {
    expect(conditionHolds(startCondition, { record: { approval_status: 'pending' } })).toBe(true);
    expect(conditionHolds(startCondition, { record: { approval_status: 'approved' } })).toBe(false);
    expect(conditionHolds(startCondition, { record: { approval_status: 'rejected' } })).toBe(false);
  });

  it('an account from before the column existed is not dragged in (TOTALITY)', () => {
    // The `has()` guard is the whole point: strict CEL aborts on an absent key,
    // and from 17.0.0-rc.2 an unevaluable condition FAILS THE RUN rather than
    // skipping it. An account with no approval column is a pre-existing record
    // and must read as "not gated".
    expect(conditionHolds(startCondition, { record: { name: 'Acme Corp' } })).toBe(false);
  });

  it('setting the column to `approved` is a real off switch', () => {
    // The documented way to run without account sign-off. If this ever stops
    // being false, changing the default would no longer disarm the gate.
    expect(conditionHolds(startCondition, { record: { approval_status: 'approved' } })).toBe(false);
  });

  it('the approval node writes the column the object declares', () => {
    const node = (AccountApprovalFlow.nodes as Rec[]).find((n) => n.id === 'account_review');
    expect(node?.config?.approvalStatusField).toBe('approval_status');
    expect(account?.fields?.[node?.config?.approvalStatusField as string]).toBeTruthy();
    // Insert-only: `pending` appears at exactly one moment, so an afterUpdate
    // twin would open a second request for the same decision on every edit made
    // while the account sat pending.
    const start = (AccountApprovalFlow.nodes as Rec[]).find((n) => n.id === 'start');
    expect(start?.config?.triggerType).toBe('record-after-create');
  });
});

/**
 * A seeded account is established data, not a submission (#2042).
 *
 * The platform writes every seed row with `skipTriggers`, so a seeded account
 * never reaches `account_approval`. Left on the column default, all nine read
 * `pending` with no request behind them: the console locked each one, and
 * "Recall approval" found nothing to recall. So the seed rows state
 * `approved`. The field default stays `pending`, which keeps the gate armed for
 * every account a user creates; the last test here holds that half.
 */
describe('a seeded account is already signed off (#2042)', () => {
  type Dataset = { object: string; records: Rec[] };
  const seeded = (CrmSeedData as unknown as Dataset[])
    .filter((d) => d.object === 'crm_account')
    .flatMap((d) => d.records);
  const seededNames = seeded.map((r) => String(r.name));

  it('every seed row states `approved`', () => {
    // Guard the guard: no rows would make the next line vacuously true.
    expect(seeded.length, 'no crm_account seed rows').toBeGreaterThanOrEqual(9);
    expect(seeded.filter((r) => r.approval_status !== 'approved').map((r) => r.name)).toEqual([]);
  });

  it('the booted app stores every seeded account as `approved`', async () => {
    // The column is `readonly`; this reads what the seed write actually landed,
    // not what the row asked for.
    const stored = await verify.rows('crm_account', { name: { $in: seededNames } });
    expect(stored.map((r) => String(r.name)).sort(), 'a seeded account did not land').toEqual([...seededNames].sort());
    expect(stored.filter((r) => r.approval_status !== 'approved').map((r) => r.name)).toEqual([]);
  });

  it('an account a rep creates still lands `pending` and enters the approval flow', async () => {
    const rep = await signUpPerson(verify, 'rep@account-approval-gate.test', {
      name: 'Approval Gate Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
    const created = await verify.hooks.run('crm_account', 'insert', { name: 'Approval Gate Co' }, { as: rep.token });
    const [stored] = await verify.rows('crm_account', { id: created.id });
    expect(stored?.approval_status).toBe('pending');
    expect(await flowRuns(verify, 'account_approval', String(created.id))).toHaveLength(1);
  });
});
