// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { REPO_ROOT } from './helpers/repo-root';
import { HOURS_PER_DAY } from '../src/psa/objects/_psa-picklists';

type Rec = Record<string, any>;

/**
 * Project Delivery, phase 1a (hotcrm#2316): the six objects on the shipped app
 * booted by `@objectstack/verify`, driven as the people who use them.
 *
 * - Staffing keeps the project's Team and Project Manager
 *   (`project_member.hook.ts`), and the team reads the project through the
 *   `project_team_read` rule; a person not staffed reads nothing. The manager
 *   is in the Team too and keeps edit through `project_manager_edit`.
 * - A time entry copies its rates from the staffing's rate card when written
 *   and keeps them (`time_entry.hook.ts`): a day card bills per hour at
 *   rate ÷ HOURS_PER_DAY, and a later rate change rewrites no past cost.
 * - Only approved timesheets and expenses reach the project's cost, and they
 *   are approved from the stamped approver's Inbox (phase 1b; the approvals
 *   themselves are `test/psa-approvals.test.ts`).
 * - The team member's set hides cost (`project_member` field rows).
 */

let verify: VerifyStack;
let admin: string;
let pm: Person;
let consultant: Person;
let outsider: Person;
let finance: Person;
let account: Rec;
let hourly: Rec;
let daily: Rec;
let project: Rec;
let k = 0;

const insert = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as });
const update = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'update', doc, { as });
const row = async (object: string, id: string, as?: string): Promise<Rec | undefined> =>
  (await verify.rows(object, { id }, as ? { as } : undefined))[0];
const num = (v: unknown): number => Number(v ?? 0);

/** Decide the one open approval request on a record, as `token` (phase 1b: approval is an Inbox decision). */
const decide = async (recordId: string, token: string, action: 'approve' | 'reject' = 'approve'): Promise<void> => {
  const [request] = await verify.rows('sys_approval_request', { record_id: recordId, status: 'pending' });
  expect(request, `no open approval request on ${recordId}`).toBeTruthy();
  const res = await verify.apiAs(token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action}d in test.` });
  expect(res.status, await res.clone().text()).toBe(200);
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  pm = await signUpPerson(verify, 'pm@psa-objects.test', {
    name: 'Delivery PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
  });
  consultant = await signUpPerson(verify, 'consultant@psa-objects.test', {
    name: 'Delivery Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  outsider = await signUpPerson(verify, 'outsider@psa-objects.test', {
    name: 'Other Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  finance = await signUpPerson(verify, 'finance@psa-objects.test', {
    name: 'Delivery Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
  });
  [account] = await verify.rows('crm_account', {});
  expect(account, 'fixture: the seed holds an account').toBeTruthy();
  hourly = await insert('crm_rate_card', { name: `Test Consultant ${++k}`, seniority: 'intermediate', unit: 'hour', cost_rate: 50, bill_rate: 120 }, finance.token);
  daily = await insert('crm_rate_card', { name: `Test Architect ${++k}`, seniority: 'lead', unit: 'day', cost_rate: 800, bill_rate: 1600 }, finance.token);
  project = await insert('crm_project', {
    name: `Test Rollout ${++k}`, crm_account: account.id, kind: 'delivery', planned_revenue: 10000,
  }, pm.token);
  // Its approved baseline (hotcrm#2547), loaded as a seed or an import would:
  // the Approved Budget is the baseline version's total, 5,000.
  const baseline = await verify.hooks.run('crm_project_budget', 'insert', { crm_project: project.id, status: 'approved' }, { system: true });
  await verify.hooks.run('crm_project_budget_line', 'insert', {
    crm_project_budget: baseline.id, category: 'other', description: 'Delivery', quantity: 1, unit_cost: 5000,
  }, { system: true });
  await insert('crm_project_member', { crm_project: project.id, person: pm.id, responsibility: 'project_manager', rate_card: daily.id }, pm.token);
  await insert('crm_project_member', { crm_project: project.id, person: consultant.id, responsibility: 'consultant', rate_card: hourly.id }, pm.token);
}, 120_000);

describe('the hook bodies keep their copies of the constants', () => {
  it('time_entry.hook.ts counts a day as HOURS_PER_DAY hours', () => {
    const body = readFileSync(join(REPO_ROOT, 'src/psa/objects/time_entry.hook.ts'), 'utf8');
    expect(body).toContain(`const HOURS_PER_DAY = ${HOURS_PER_DAY};`);
  });
});

describe('staffing (project_team_sync)', () => {
  it('keeps the project\'s Project Manager and Team', async () => {
    const p = (await row('crm_project', project.id))!;
    expect(p.project_manager).toBe(pm.id);
    expect(p.team_members, 'the manager is in the Team too (hotcrm#2485)').toEqual([pm.id, consultant.id].sort());
  });

  it('lets a project manager who does not own the project, and is in its Team, edit and staff it (hotcrm#2485)', async () => {
    // Opened by the administrator, so the PM reaches it only through the two
    // record-relative rules: `project_team_read` (the Team) and
    // `project_manager_edit`. On 18.5.0 the two shared one grant, the read
    // written last replaced the edit (objectstack#33683), and both writes
    // answered 403; since 18.6.0 each rule keeps its own grant.
    const theirs = await insert('crm_project', {
      name: `Test Handover ${++k}`, crm_account: account.id, kind: 'delivery',
    }, admin);
    await insert('crm_project_member', { crm_project: theirs.id, person: pm.id, responsibility: 'project_manager', rate_card: daily.id }, admin);
    const staffed = (await row('crm_project', theirs.id))!;
    expect(staffed.owner_id, 'fixture: the PM does not own the project').not.toBe(pm.id);
    expect(staffed.project_manager).toBe(pm.id);
    expect(staffed.team_members, 'both rules name the PM').toEqual([pm.id]);
    const edit = await verify.apiAs(pm.token, 'PATCH', `/data/crm_project/${theirs.id}`, { description: 'Kick-off held.' });
    expect(edit.status, await edit.clone().text()).toBe(200);
    const staff = await verify.apiAs(pm.token, 'POST', '/data/crm_project_member', {
      crm_project: theirs.id, person: consultant.id, responsibility: 'consultant', rate_card: hourly.id,
    });
    expect(staff.status, await staff.clone().text()).toBeLessThan(300);
    expect((await row('crm_project', theirs.id))!.team_members).toEqual([pm.id, consultant.id].sort());
    const again = await verify.apiAs(pm.token, 'PATCH', `/data/crm_project/${theirs.id}`, { description: 'Team staffed.' });
    expect(again.status, `the PM keeps edit after the Team is re-written: ${await again.clone().text()}`).toBe(200);
  });

  it('opens the project to the team and to nobody else', async () => {
    expect(await row('crm_project', project.id, consultant.token)).toBeTruthy();
    expect(await row('crm_project', project.id, outsider.token)).toBeUndefined();
    expect(await row('crm_project', project.id, finance.token), 'finance reads every project').toBeTruthy();
  });

  it('lets a team member read the account but not the opportunity (ruling D)', async () => {
    expect(await row('crm_account', account.id, consultant.token), 'View All read on accounts').toBeTruthy();
    const [opp] = await verify.rows('crm_opportunity', {});
    expect(opp, 'fixture: the seed holds an opportunity').toBeTruthy();
    expect(await row('crm_opportunity', opp.id, consultant.token)).toBeUndefined();
    const linked = await insert('crm_project', {
      name: `Test Linked ${++k}`, crm_account: account.id, crm_opportunity: opp.id, kind: 'delivery',
    }, admin);
    await insert('crm_project_member', { crm_project: linked.id, person: consultant.id, responsibility: 'consultant', rate_card: hourly.id }, admin);
    const p = (await row('crm_project', linked.id, consultant.token))!;
    expect(p.crm_account).toBe(account.id);
    expect(p.crm_opportunity, 'the opportunity field is hidden from a member').toBeUndefined();
    expect((await row('crm_project', linked.id))!.crm_opportunity, 'stored, and read by everyone else').toBe(opp.id);
  });

  // Irene, 2026-11-15 (hotcrm#2481): consultants do not see the account's
  // Order to Cash totals. The set's own `readable: false` rows bind over its
  // own View All on the account (objectstack#33828, 18.6.0); every other
  // field of the account stays readable to them.
  it('lets a team member read the account without its Order to Cash totals (hotcrm#2481)', async () => {
    const TOTALS = [
      'invoiced_amount', 'received_amount', 'unpaid_amount', 'uninvoiced_amount',
      'unpaid_on_orders', 'unpaid_on_contracts', 'uninvoiced_on_orders', 'uninvoiced_on_contracts',
    ];
    const full = (await row('crm_account', account.id))!;
    for (const f of TOTALS) expect(full, `fixture: an administrator reads ${f}`).toHaveProperty(f);
    const seen = (await row('crm_account', account.id, consultant.token))!;
    expect(seen.name).toBe(full.name);
    expect(Object.keys(full).filter((k) => !(k in seen)).sort(), 'the totals, and nothing else, are hidden').toEqual([...TOTALS].sort());
    const res = await verify.apiAs(consultant.token, 'GET', `/data/crm_account/${account.id}`);
    expect(res.status).toBe(200);
    const { record } = (await res.json()) as { record: Rec };
    expect(record.name).toBe(full.name);
    for (const f of TOTALS) expect(record, `REST serves no ${f} to a team member`).not.toHaveProperty(f);
  });

  it('hides cost from a team member', async () => {
    const p = (await row('crm_project', project.id, consultant.token))!;
    expect(p.actual_labor_cost).toBeUndefined();
    expect(p.actual_expense_cost).toBeUndefined();
    expect(p.gross_margin).toBeUndefined();
    expect(p.billable_amount, 'the amount to bill stays readable').not.toBeUndefined();
    const card = (await row('crm_rate_card', hourly.id, consultant.token))!;
    expect(card.bill_rate).toBe(120);
    expect(card.cost_rate).toBeUndefined();
  });

  it('refuses a second staffing row for the same person (project_member_unique)', async () => {
    await expect(insert('crm_project_member', { crm_project: project.id, person: consultant.id, rate_card: daily.id }, pm.token))
      .rejects.toThrow(/already staffed on this project/);
  });

  it('drops a removed member from the Team', async () => {
    const extra = await insert('crm_project_member', { crm_project: project.id, person: outsider.id, rate_card: hourly.id }, pm.token);
    expect((await row('crm_project', project.id))!.team_members).toContain(outsider.id);
    await verify.hooks.run('crm_project_member', 'delete', { id: extra.id }, { as: pm.token });
    expect((await row('crm_project', project.id))!.team_members).not.toContain(outsider.id);
  });
});

describe('time (timesheet_stamps, time_entry_costing)', () => {
  let sheet: Rec;
  let entry: Rec;

  beforeAll(async () => {
    sheet = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-11-02', period_end: '2026-11-08' }, consultant.token);
    entry = await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-11-03', hours: 8 }, consultant.token);
  });

  it('stamps the timesheet\'s name and approver', async () => {
    const s = (await row('crm_timesheet', sheet.id))!;
    expect(s.approver).toBe(pm.id);
    expect(s.name).toContain(project.name);
  });

  it('keeps a typed name, and moves only a generated one with its period (hotcrm#2567)', async () => {
    const typed = await insert('crm_timesheet', {
      name: 'Week 46, onsite', crm_project: project.id, period_start: '2026-11-09', period_end: '2026-11-15',
    }, consultant.token);
    expect((await row('crm_timesheet', typed.id))!.name, 'the typed name is kept').toBe('Week 46, onsite');
    await update('crm_timesheet', { id: typed.id, period_start: '2026-11-30', period_end: '2026-12-06' }, consultant.token);
    expect((await row('crm_timesheet', typed.id))!.name, 'a typed name is never replaced').toBe('Week 46, onsite');

    const blank = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-11-16', period_end: '2026-11-22' }, consultant.token);
    expect((await row('crm_timesheet', blank.id))!.name).toBe(`${project.name} · 2026-11-16 – 2026-11-22`);
    await update('crm_timesheet', { id: blank.id, period_end: '2026-11-20' }, consultant.token);
    expect((await row('crm_timesheet', blank.id))!.name, 'the generated name follows the period').toBe(`${project.name} · 2026-11-16 – 2026-11-20`);
    await update('crm_timesheet', { id: blank.id, name: '' }, consultant.token);
    expect((await row('crm_timesheet', blank.id))!.name, 'a cleared name fills again').toBe(`${project.name} · 2026-11-16 – 2026-11-20`);
  });

  it('refuses a second timesheet for the same project and period', async () => {
    await expect(insert('crm_timesheet', { crm_project: project.id, period_start: '2026-11-02', period_end: '2026-11-08' }, consultant.token))
      .rejects.toThrow(/already a timesheet/);
  });

  it('copies the rate card\'s rates and costs the hours', async () => {
    const e = (await row('crm_time_entry', entry.id))!;
    expect(num(e.cost_rate)).toBe(50);
    expect(num(e.bill_rate)).toBe(120);
    expect(num(e.cost_amount)).toBe(400);
    expect(num(e.bill_amount)).toBe(960);
  });

  it('costs a day card per hour', async () => {
    const pmSheet = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-11-02', period_end: '2026-11-08' }, pm.token);
    const e = await insert('crm_time_entry', { crm_timesheet: pmSheet.id, entry_date: '2026-11-04', hours: 4 }, pm.token);
    const stored = (await row('crm_time_entry', e.id))!;
    expect(num(stored.cost_rate)).toBe(800 / HOURS_PER_DAY);
    expect(num(stored.cost_amount)).toBe(400);
  });

  it('refuses a date outside the period, and hours from someone not staffed', async () => {
    await expect(insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-11-20', hours: 1 }, consultant.token))
      .rejects.toThrow(/outside this timesheet's period/);
    const own = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-11-02', period_end: '2026-11-08', owner_id: outsider.id }, admin);
    await expect(insert('crm_time_entry', { crm_timesheet: own.id, entry_date: '2026-11-03', hours: 1 }, outsider.token))
      .rejects.toThrow(/staffed on the project/);
  });

  it('freezes a submitted timesheet, and costs it once the approver approves it from the Inbox', async () => {
    await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token);
    await expect(update('crm_time_entry', { id: entry.id, hours: 9 }, consultant.token)).rejects.toThrow(/has been submitted/);
    expect(num((await row('crm_project', project.id))!.actual_labor_cost)).toBe(0);
    await decide(sheet.id, pm.token);
    expect((await row('crm_timesheet', sheet.id))!.status).toBe('approved');
    const p = (await row('crm_project', project.id))!;
    expect(num(p.actual_labor_cost)).toBe(400);
    expect(num(p.billable_amount)).toBe(960);
    expect(num(p.cost_variance)).toBe(4600);
    expect(num(p.gross_margin)).toBe(9600);
  });

  it('keeps past cost when the rate card changes', async () => {
    await update('crm_rate_card', { id: hourly.id, cost_rate: 80 }, finance.token);
    expect(num((await row('crm_time_entry', entry.id))!.cost_amount)).toBe(400);
    expect(num((await row('crm_project', project.id))!.actual_labor_cost)).toBe(400);
  });
});

describe('expenses on a project (expense_report_project_approval, hotcrm#2559)', () => {
  it('reach the project\'s cost once the Project Manager approves their report from the Inbox', async () => {
    const before = num((await row('crm_project', project.id))!.actual_expense_cost);
    const exp = await insert('crm_expense', {
      name: `Flight ${++k}`, crm_project: project.id, expense_date: '2026-11-03', category: 'travel', amount: 300, is_billable: true,
    }, consultant.token);
    expect((await row('crm_expense', exp.id))!.approver, 'named at submission, not at creation').toBeFalsy();
    const result = (await verify.actions.run('crm_expense', 'submit_for_reimbursement', {
      as: consultant.token, params: { _selectedIds: [exp.id] },
    })) as Rec;
    const reportId = String(result.id);
    expect((await row('crm_expense_report', reportId))!.approver).toBe(pm.id);
    expect((await row('crm_expense', exp.id))!.approver, 'the expense carries its report\'s approver').toBe(pm.id);
    expect(num((await row('crm_project', project.id))!.actual_expense_cost) - before).toBe(0);
    await decide(reportId, pm.token);
    expect((await row('crm_expense', exp.id))!.status).toBe('approved');
    expect(num((await row('crm_project', project.id))!.actual_expense_cost) - before).toBe(300);
  });
});

/**
 * Weekly hours by the day they were worked (#2483). `time_utilization` reads
 * the entry, with the timesheet included for the person, the project and the
 * approval; the Projects Overview hours tiles filter on the timesheet's
 * status, which 18.5.0 serves across the include (objectstack#33512). Through
 * the booted analytics service, the one the REST route calls, scoped to this
 * suite's project.
 */
describe('approved hours by week (time_utilization, #2483)', () => {
  const tile = (id: string): Rec => {
    const dashboard = verify.metadata.items<Rec>('dashboard').find((d) => d.name === 'projects_overview');
    const found = ((dashboard?.widgets ?? []) as Rec[]).find((w) => w.id === id);
    expect(found, `no ${id} tile on projects_overview`).toBeTruthy();
    return found!;
  };
  const query = async (w: Rec): Promise<Rec[]> => {
    const dataset = verify.metadata.items<Rec>('dataset').find((d) => d.name === 'time_utilization')!;
    const analytics = verify.kernel.getService<Rec>('analytics');
    const res = await analytics.queryDataset(dataset, {
      dimensions: w.dimensions,
      measures: w.values,
      runtimeFilter: { ...(w.filter ?? {}), 'crm_timesheet.crm_project': project.id },
    }, { isSystem: true });
    return (res.rows ?? []) as Rec[];
  };

  beforeAll(async () => {
    // Thursday to Wednesday: Friday is in week 46, Monday in week 47.
    const split = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-11-12', period_end: '2026-11-18' }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: split.id, entry_date: '2026-11-13', hours: 6 }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: split.id, entry_date: '2026-11-16', hours: 2, is_billable: false }, consultant.token);
    await update('crm_timesheet', { id: split.id, status: 'submitted' }, consultant.token);
    await decide(split.id, pm.token);
    // Submitted and never approved: booked time, not cost.
    const waiting = await insert('crm_timesheet', { crm_project: project.id, period_start: '2026-11-19', period_end: '2026-11-25' }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: waiting.id, entry_date: '2026-11-20', hours: 4 }, consultant.token);
    await update('crm_timesheet', { id: waiting.id, status: 'submitted' }, consultant.token);
  }, 60_000);

  it('the dataset reads the entry and takes the approval from its timesheet', () => {
    const dataset = verify.metadata.items<Rec>('dataset').find((d) => d.name === 'time_utilization')!;
    expect(dataset).toMatchObject({ object: 'crm_time_entry', include: ['crm_timesheet'] });
    for (const id of ['hours_by_week', 'billable_share_by_person']) {
      expect(tile(id).filter, id).toEqual({ 'crm_timesheet.status': 'approved' });
    }
  });

  it('puts each hour in the week it was worked, and leaves out hours not yet approved', async () => {
    const rows = await query(tile('hours_by_week'));
    const byWeek = Object.fromEntries(rows.filter((r) => num(r.total_hours) > 0).map((r) => [r.period_week, [num(r.total_hours), num(r.billable_hours)]]));
    // Week 45: the 8 h approved earlier in this file; the PM's 4 h draft stays out.
    // Weeks 46 and 47: one timesheet, split by entry date. The waiting 4 h stays out.
    expect(byWeek).toEqual({ '2026-W45': [8, 8], '2026-W46': [6, 6], '2026-W47': [2, 0] });
  });

  it('gives each person their billable share of approved hours', async () => {
    const rows = await query(tile('billable_share_by_person'));
    expect(rows).toHaveLength(1);
    expect(num(rows[0]!.total_hours)).toBe(16);
    expect(num(rows[0]!.billable_hours)).toBe(14);
    expect(num(rows[0]!.utilization)).toBeCloseTo(14 / 16, 6);
  });
});

describe('the delivery launcher', () => {
  const appsOf = async (token: string): Promise<string[]> => {
    const res = await verify.apiAs(token, 'GET', '/me/apps');
    expect(res.status, await res.clone().text()).toBe(200);
    const body: Rec = await res.json();
    const list = ((body.data ?? body).apps ?? body.data ?? body) as Rec[];
    return list.map((a) => String(a.name)).filter((name) => name.startsWith('crm_')).sort();
  };

  it.each([
    // Expenses is everyone's app since hotcrm#2556.
    ['project manager', () => pm.token, ['crm_enterprise', 'crm_expenses', 'crm_psa']],
    ['team member', () => consultant.token, ['crm_enterprise', 'crm_expenses', 'crm_psa']],
    ['finance controller', () => finance.token, ['crm_enterprise', 'crm_expenses', 'crm_o2c', 'crm_psa']],
  ] as const)('a %s is offered Project Delivery', async (_who, token, apps) => {
    expect(await appsOf(token())).toEqual(apps);
  });
});
