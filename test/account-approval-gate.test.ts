// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { bootStackOnce, type BootOptions, type VerifyStack } from '@objectstack/verify';
import { ApprovalsServicePlugin } from '@objectstack/plugin-approvals';
import artifact from '../objectstack.config';
import stack from './helpers/composed-stack';
import { AccountApprovalFlow } from '../src/sales/flows/account-approval.flow';
import { CrmSeedData } from '../objectstack.composition';
import { hotcrmStack, bootOptions, conditionHolds as holdsOn, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The account approval gate, and the two things that actually have to hold
 * about it.
 *
 * **It is ON in the box** — the one place it inverts its lead sibling. REQ-0003
 * acceptance 4 asks for it in as many words: "A newly created account sits in a
 * pending state, appears in the platform approval inbox HotCRM already mounts,
 * and only reaches the approved state through a decision on that request."
 * `lead_conversion_approval` ships OFF because REQ-0005 asked for the opposite,
 * so the two flows are deliberately not symmetric and a reader comparing them
 * needs this file to say which way each one points.
 *
 * **It never strands an account where no engine can decide it** (#2067). The
 * app must run on a composition that omits the `approvals` capability (every
 * hosted plan without it). A shipped `pending` default stamped every account a
 * user created there `pending` with no request behind it, and the console,
 * which derives its approval lock from that column's value, showed each one
 * "locked for approval" with Edit disabled, forever. So the column ships
 * BLANK, the flow starts on the blank, and `pending` is written only by the
 * approval node's `approvalStatusField` mirror when it opens a request. The
 * last block here boots both compositions and pins each half.
 */

const objects: Rec[] = (stack as any).objects ?? [];
const account = objects.find((o) => o.name === 'crm_account') as Rec | undefined;

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

  it('the approval column ships BLANK — `pending` is the request\'s to write, not the default\'s (#2067)', () => {
    const field = account?.fields?.approval_status;
    expect(field, 'crm_account.approval_status is missing').toBeTruthy();
    // A `pending` default is the #2067 defect: on a composition without
    // approvals nothing ever decides it. An `approved` default is the install's
    // OFF switch, which the box does not ship.
    expect(field.defaultValue).toBeUndefined();
    // Nor a preselect: an option-level `default: true` puts the value on the
    // console's New form.
    expect((field.options as Rec[]).filter((o) => o.default).map((o) => o.value)).toEqual([]);
    // Only the platform's own approval write may reach it.
    expect(field.readonly).toBe(true);
  });

  it('the start condition fires on the blank a new account is born with, and on nothing else', () => {
    // Every shape "no value" takes: absent on a sparse driver, null on SQL.
    expect(conditionHolds(startCondition, { record: { name: 'Acme Corp' } })).toBe(true);
    expect(conditionHolds(startCondition, { record: { approval_status: null } })).toBe(true);
    expect(conditionHolds(startCondition, { record: { approval_status: '' } })).toBe(true);
    // A value already present means a system writer (or the install's
    // default) has spoken: nothing to submit.
    expect(conditionHolds(startCondition, { record: { approval_status: 'pending' } })).toBe(false);
    expect(conditionHolds(startCondition, { record: { approval_status: 'rejected' } })).toBe(false);
  });

  it('a default of `approved` is a real off switch', () => {
    // The documented way to run without account sign-off. If this ever stops
    // being false, giving the column that default would no longer disarm the
    // gate.
    expect(conditionHolds(startCondition, { record: { approval_status: 'approved' } })).toBe(false);
  });

  it('the approval node writes the column the object declares, on insert only', () => {
    const node = (AccountApprovalFlow.nodes as Rec[]).find((n) => n.id === 'account_review');
    // The mirror is what writes `pending` now; without it a new account would
    // sit blank while its request waited in the inbox.
    expect(node?.config?.approvalStatusField).toBe('approval_status');
    expect(account?.fields?.[node?.config?.approvalStatusField as string]).toBeTruthy();
    // Insert-only: the condition reads an account older than the column as
    // blank, so the TRIGGER is what keeps such an account out — and an
    // afterUpdate twin would open a second request on every edit.
    const start = (AccountApprovalFlow.nodes as Rec[]).find((n) => n.id === 'start');
    expect(start?.config?.triggerType).toBe('record-after-create');
  });
});

/**
 * A seeded account is established data, not a submission (#2042).
 *
 * The platform writes every seed row with `skipTriggers`, so a seeded account
 * never reaches `account_approval`. Under the former `pending` default all nine
 * read `pending` with no request behind them: the console locked each one, and
 * "Recall approval" found nothing to recall. So the seed rows state `approved`,
 * which is what they are — signed off — rather than the blank a never-submitted
 * account carries.
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
});

// ─────────────────────────── both compositions (#2067) ───────────────────────

/**
 * The app on a composition WITHOUT the `approvals` capability: the app's own
 * boot minus `ApprovalsServicePlugin` and nothing else, so the two boots differ
 * in exactly the capability under test. A module-level constant because
 * `bootStackOnce` memoises by options identity.
 */
const APP_BOOT = bootOptions();
const WITHOUT_APPROVALS_BOOT: BootOptions = {
  ...APP_BOOT,
  extraPlugins: (APP_BOOT.extraPlugins ?? []).filter((p) => !(p instanceof ApprovalsServicePlugin)),
};

/**
 * The two ways a user creates an account (#2067 acceptance 1), each returning
 * the new account's id: the console's New form, which is a REST create; and
 * Convert Lead, whose `create_account` node writes no approval column and so
 * gets exactly what the field default gives it.
 */
type CreatePath = (stack: VerifyStack, people: { rep: Person; manager: Person }, company: string) => Promise<string>;

const byForm: CreatePath = async (s, { rep }, company) => {
  const res = await s.apiAs(rep.token, 'POST', '/data/crm_account', { name: company });
  expect(res.status, await res.clone().text()).toBe(201);
  const body: Rec = await res.json();
  return String((body.record ?? body.data ?? body).id);
};

// The converter is a sales MANAGER: on 17.7.0 a rep's conversion into a NEW
// account is refused on `annual_revenue` FLS (recorded in
// `flow-conversion.test.ts`), and this file's subject is the account it creates.
const byConvertLead: CreatePath = async (s, { manager }, company) => {
  const lead = await s.hooks.run('crm_lead', 'insert', {
    company, email: `buyer@${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.example.com`,
    first_name: 'Joe', last_name: 'Green', phone: '555', title: 'Buyer', lead_source: 'web', status: 'qualified',
  }, { as: manager.token });
  const started = (await s.flows.run('lead_conversion', { recordId: lead.id }, { as: manager.token })) as Rec;
  // Resume ON TOP OF what the screen prefilled, as the console's runner does.
  const prefilled: Rec = {};
  for (const f of ((started.screen ?? started.output?.screen)?.fields ?? []) as Rec[]) {
    if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
  }
  await s.flows.resume(started as any, { ...prefilled, createOpportunity: false }, { as: manager.token });
  const created = await s.rows('crm_account', { name: company });
  expect(created, `Convert Lead created no single account named ${company}`).toHaveLength(1);
  return String(created[0]!.id);
};

const PATHS: [string, CreatePath][] = [['the New form', byForm], ['Convert Lead', byConvertLead]];

const people = async (s: VerifyStack, tag: string) => ({
  rep: await signUpPerson(s, `rep-${tag}@account-approval-gate.test`, {
    name: 'Approval Gate Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  }),
  manager: await signUpPerson(s, `manager-${tag}@account-approval-gate.test`, {
    name: 'Approval Gate Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  }),
});

const statusOf = async (s: VerifyStack, id: string): Promise<unknown> =>
  (await s.rows('crm_account', { id }))[0]?.approval_status ?? null;

const openRequests = (s: VerifyStack, id: string): Promise<Rec[]> =>
  s.rows('sys_approval_request', { record_id: id, status: 'pending' });

describe('WITH approvals in the composition — acceptance 4 is unchanged (#2067 acceptance 2)', () => {
  let who: { rep: Person; manager: Person };
  beforeAll(async () => {
    who = await people(verify, 'with');
  }, 120_000);

  it.each(PATHS)('an account created by %s sits `pending`, with one open request behind it', async (_label, create) => {
    const id = await create(verify, who, `With Approvals ${_label} Co`);
    // Read after the create returned: the request's mirror has already landed.
    expect(await statusOf(verify, id)).toBe('pending');
    expect(await openRequests(verify, id), 'the account is not in the approval inbox').toHaveLength(1);
  });

  it('a rep\'s account reaches `approved` only through a Sales Manager\'s decision on that request', async () => {
    const id = await byForm(verify, who, 'With Approvals Decided Co');
    const [request] = await openRequests(verify, id);
    expect(request, 'no open request to decide').toBeTruthy();
    expect(await statusOf(verify, id)).toBe('pending');
    // The node routes to the `sales_manager` bench, which `who.manager` staffs.
    const res = await verify.apiAs(who.manager.token, 'POST', `/approvals/requests/${request!.id}/approve`, { comment: 'approved.' });
    expect(res.status, await res.clone().text()).toBe(200);
    expect(await statusOf(verify, id)).toBe('approved');
  });
});

describe('WITHOUT approvals in the composition — a new account is not stranded (#2067 acceptance 1)', () => {
  let bare: VerifyStack;
  let who: { rep: Person; manager: Person };
  beforeAll(async () => {
    bare = await bootStackOnce(artifact, WITHOUT_APPROVALS_BOOT);
    who = await people(bare, 'without');
  }, 120_000);

  it('this boot really carries no approval engine', () => {
    // Guard the guard: with the engine present every assertion below would be
    // about the other composition.
    expect(bare.metadata.object('sys_approval_request')).toBeUndefined();
  });

  it.each(PATHS)('an account created by %s is born blank, never `pending`', async (_label, create) => {
    const id = await create(bare, who, `Without Approvals ${_label} Co`);
    // The console locks a record whose `approval_status` reads `pending` and
    // has no open request (objectui `RecordDetailView` / `DetailView`); here
    // no request can ever open, so a `pending` value would be permanent.
    expect(await statusOf(bare, id)).toBeNull();
  });
});
