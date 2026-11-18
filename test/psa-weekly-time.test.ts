// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';
import { TimeEntryViews } from '../src/psa/views/time_entry.view';
import { TimesheetViews } from '../src/psa/views/timesheet.view';
import { SubmitTimesheetAction } from '../src/psa/actions/timesheet.actions';

type Rec = Record<string, any>;

/**
 * Weekly time entry (hotcrm#2546, PSA phase 2b), on the shipped app booted by
 * `@objectstack/verify`, driven as the consultant who enters the week and the
 * project managers who approve it.
 *
 * - `time_entry_timesheet`: a line entered with its project and date finds the
 *   person's timesheet on that project whose period holds the date, or
 *   creates a draft one for the week, Monday to Sunday. A changed project or
 *   date moves the line the same way.
 * - `time_entry_costing`: the line's project is its timesheet's, and the line
 *   is the timesheet person's; a line does not leave a submitted timesheet.
 * - Submit this week: the week's timesheets are submitted one by one as the
 *   person, so approval still splits per project, and a refusal on one
 *   project leaves the others submitted.
 */

let verify: VerifyStack;
let admin: string;
let pm: Person;
let pm2: Person;
let consultant: Person;
let outsider: Person;
let account: Rec;
let rate: Rec;
const projects: Record<'alpha' | 'beta' | 'gamma', Rec> = {} as never;
let k = 0;

const DAY = 86_400_000;
const insert = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as });
const update = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'update', doc, { as });
const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const sheetsOf = (who: Person, projectId: string): Promise<Rec[]> =>
  verify.rows('crm_timesheet', { owner_id: who.id, crm_project: projectId });
const day = (s: string): string => s.slice(0, 10);
const plus = (date: string, days: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
/** The Monday of the week that holds `date`. */
const mondayOf = (date: string): string => plus(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));

const staffedProject = async (name: string, manager: Person): Promise<Rec> => {
  const p = await insert('crm_project', { name: `${name} ${++k}`, crm_account: account.id, kind: 'delivery' }, manager.token);
  await insert('crm_project_member', { crm_project: p.id, person: manager.id, responsibility: 'project_manager', rate_card: rate.id }, manager.token);
  await insert('crm_project_member', { crm_project: p.id, person: consultant.id, responsibility: 'consultant', rate_card: rate.id }, manager.token);
  return p;
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  pm = await signUpPerson(verify, 'pm@psa-weekly-time.test', {
    name: 'Week PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
  });
  pm2 = await signUpPerson(verify, 'pm2@psa-weekly-time.test', {
    name: 'Week PM Two', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
  });
  consultant = await signUpPerson(verify, 'consultant@psa-weekly-time.test', {
    name: 'Week Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  outsider = await signUpPerson(verify, 'outsider@psa-weekly-time.test', {
    name: 'Week Outsider', positions: ['crm_project_member'], permissionSets: ['project_member'],
  });
  [account] = await verify.rows('crm_account', {});
  expect(account, 'fixture: the seed holds an account').toBeTruthy();
  rate = await insert('crm_rate_card', { name: `Week Consultant ${++k}`, seniority: 'intermediate', unit: 'hour', cost_rate: 50, bill_rate: 120 }, admin);
  projects.alpha = await staffedProject('Week Alpha', pm);
  projects.beta = await staffedProject('Week Beta', pm);
  projects.gamma = await staffedProject('Week Gamma', pm2);
}, 120_000);

describe('time_entry_timesheet: a line finds or creates its timesheet', () => {
  // Monday 2026-06-01 to Sunday 2026-06-07, away from the week the run falls in.
  const MONDAY = '2026-06-01';

  it('a week across three projects makes one draft timesheet per project, each with its own approver', async () => {
    const lines: Array<[Rec, string, number]> = [
      [projects.alpha, MONDAY, 4], [projects.beta, MONDAY, 4],
      [projects.alpha, '2026-06-02', 8],
      [projects.gamma, '2026-06-03', 6], [projects.beta, '2026-06-03', 2],
      [projects.gamma, '2026-06-05', 8],
    ];
    for (const [p, date, hours] of lines) {
      const line = await insert('crm_time_entry', { crm_project: p.id, entry_date: date, hours }, consultant.token);
      expect(line.crm_timesheet, 'the line went into a timesheet').toBeTruthy();
    }
    const expected: Array<['alpha' | 'beta' | 'gamma', Person, number]> = [['alpha', pm, 12], ['beta', pm, 6], ['gamma', pm2, 14]];
    for (const [key, manager, hours] of expected) {
      const sheets = await sheetsOf(consultant, projects[key].id);
      expect(sheets, `${key}: one timesheet`).toHaveLength(1);
      const [sheet] = sheets;
      expect([day(sheet!.period_start), day(sheet!.period_end)]).toEqual([MONDAY, '2026-06-07']);
      expect(sheet!.status).toBe('draft');
      expect(sheet!.approver, `${key}: approved by its own project manager`).toBe(manager.id);
      expect(Number(sheet!.total_hours)).toBe(hours);
      expect(Number(sheet!.total_cost), 'the rate card is copied as for any line').toBe(hours * 50);
    }
  });

  it('the week runs Monday to Sunday: Sunday joins the week before, Monday starts a new timesheet', async () => {
    const sunday = await insert('crm_time_entry', { crm_project: projects.alpha.id, entry_date: '2026-06-07', hours: 1 }, consultant.token);
    const [week] = await sheetsOf(consultant, projects.alpha.id);
    expect(sunday.crm_timesheet).toBe(week!.id);

    const next = await insert('crm_time_entry', { crm_project: projects.alpha.id, entry_date: '2026-06-08', hours: 1 }, consultant.token);
    expect(next.crm_timesheet).not.toBe(week!.id);
    const sheet = await row('crm_timesheet', next.crm_timesheet);
    expect([day(sheet.period_start), day(sheet.period_end)]).toEqual(['2026-06-08', '2026-06-14']);
    expect(await sheetsOf(consultant, projects.alpha.id)).toHaveLength(2);
  });

  it('a timesheet already covering the date is used, whatever its period', async () => {
    const month = await insert('crm_timesheet', { crm_project: projects.beta.id, period_start: '2026-12-01', period_end: '2026-12-31' }, consultant.token);
    const line = await insert('crm_time_entry', { crm_project: projects.beta.id, entry_date: '2026-12-10', hours: 3 }, consultant.token);
    expect(line.crm_timesheet).toBe(month.id);
    expect((await sheetsOf(consultant, projects.beta.id)).map((s) => day(s.period_start)).sort()).toEqual(['2026-06-01', '2026-12-01']);
  });

  it('a submitted timesheet for the date is not bypassed: the line is refused, and no second timesheet appears', async () => {
    const sheet = await insert('crm_timesheet', { crm_project: projects.gamma.id, period_start: '2026-10-05', period_end: '2026-10-11' }, consultant.token);
    await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-10-05', hours: 2 }, consultant.token);
    await update('crm_timesheet', { id: sheet.id, status: 'submitted' }, consultant.token);
    await expect(insert('crm_time_entry', { crm_project: projects.gamma.id, entry_date: '2026-10-07', hours: 2 }, consultant.token))
      .rejects.toMatchObject({ code: 'RECORD_LOCKED' });
    expect((await sheetsOf(consultant, projects.gamma.id)).filter((s) => day(s.period_start) === '2026-10-05')).toHaveLength(1);
  });

  it('a person not staffed on the project is refused, and no timesheet is left behind', async () => {
    await expect(insert('crm_time_entry', { crm_project: projects.alpha.id, entry_date: MONDAY, hours: 2 }, outsider.token))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(await sheetsOf(outsider, projects.alpha.id)).toEqual([]);
    // Nor for one who reads every project and may write timesheets (an
    // administrator): the staffing is checked before a timesheet is made.
    const before = await verify.rows('crm_timesheet', { crm_project: projects.alpha.id });
    await expect(insert('crm_time_entry', { crm_project: projects.alpha.id, entry_date: '2026-05-04', hours: 2 }, admin))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(await verify.rows('crm_timesheet', { crm_project: projects.alpha.id })).toHaveLength(before.length);
  });

  it('a line refused after its timesheet was made takes that timesheet with it (18.6.0)', async () => {
    // From 18.6.0 a write whose `before*` hook wrote through `ctx.api` is one
    // unit, so the timesheet the hook made is rolled back with the refused
    // line (objectstack#34412, a8e09bb). On 18.5.0 it stayed, an empty draft;
    // this case pinned that so the day it became one unit was noticed.
    await expect(insert('crm_time_entry', { crm_project: projects.beta.id, entry_date: '2026-05-04', hours: 30 }, consultant.token))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await sheetsOf(consultant, projects.beta.id)).filter((s) => day(s.period_start) === '2026-05-04')).toEqual([]);
    // The next line makes the week's timesheet as the first line of a week does.
    const line = await insert('crm_time_entry', { crm_project: projects.beta.id, entry_date: '2026-05-05', hours: 3 }, consultant.token);
    const [sheet] = (await sheetsOf(consultant, projects.beta.id)).filter((s) => day(s.period_start) === '2026-05-04');
    expect(line.crm_timesheet).toBe(sheet!.id);
  });

  it('a Closed project takes no line, and no timesheet is left behind', async () => {
    const closed = await staffedProject('Week Closed', pm);
    for (const status of ['in_approval', 'approved', 'active', 'completed', 'closed']) {
      await systemUpdate(verify, 'crm_project', { id: closed.id, status });
    }
    await expect(insert('crm_time_entry', { crm_project: closed.id, entry_date: MONDAY, hours: 2 }, consultant.token))
      .rejects.toThrow(`${closed.name} is Closed, so it takes no new timesheets.`);
    expect(await sheetsOf(consultant, closed.id)).toEqual([]);
  });

  it('a line with neither a project nor a timesheet is refused', async () => {
    await expect(insert('crm_time_entry', { entry_date: MONDAY, hours: 2 }, consultant.token))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', message: expect.stringContaining('Pick the project the hours are for.') });
  });
});

describe('time_entry_costing: the line follows its timesheet', () => {
  it('a line written into a timesheet takes its project and its person', async () => {
    const sheet = await insert('crm_timesheet', { crm_project: projects.beta.id, period_start: '2026-09-07', period_end: '2026-09-13' }, consultant.token);
    const line = await insert('crm_time_entry', { crm_timesheet: sheet.id, entry_date: '2026-09-08', hours: 2 }, consultant.token);
    expect(line.crm_project).toBe(projects.beta.id);
    expect(line.owner_id).toBe(consultant.id);
    await expect(insert('crm_time_entry', { crm_timesheet: sheet.id, crm_project: projects.alpha.id, entry_date: '2026-09-08', hours: 2 }, consultant.token))
      .rejects.toThrow('The project must be this timesheet\'s project.');
  });

  it('with the timesheet an optional master, the lines are still read through it', async () => {
    const mine = await verify.rows('crm_time_entry', { owner_id: consultant.id }, { as: consultant.token });
    expect(mine.length).toBeGreaterThan(0);
    expect(await verify.rows('crm_time_entry', { owner_id: consultant.id }, { as: outsider.token }), 'not the outsider\'s').toEqual([]);
  });

  it('a line edited to another date or project moves to the matching timesheet', async () => {
    const line = await insert('crm_time_entry', { crm_project: projects.alpha.id, entry_date: '2026-08-03', hours: 2 }, consultant.token);
    const first = line.crm_timesheet;

    // Another day of the same week stays put.
    await update('crm_time_entry', { id: line.id, entry_date: '2026-08-05' }, consultant.token);
    expect((await row('crm_time_entry', line.id)).crm_timesheet).toBe(first);

    // The next week: a new timesheet for that week.
    await update('crm_time_entry', { id: line.id, entry_date: '2026-08-11' }, consultant.token);
    const moved = await row('crm_time_entry', line.id);
    expect(moved.crm_timesheet).not.toBe(first);
    expect(day((await row('crm_timesheet', moved.crm_timesheet)).period_start)).toBe('2026-08-10');
    expect(Number((await row('crm_timesheet', first)).total_hours), 'the old timesheet gives the hours up').toBe(0);

    // Another project: that project's timesheet for the week, with its cost.
    await update('crm_time_entry', { id: line.id, crm_project: projects.gamma.id }, consultant.token);
    const other = await row('crm_time_entry', line.id);
    const sheet = await row('crm_timesheet', other.crm_timesheet);
    expect([sheet.crm_project, day(sheet.period_start), sheet.approver]).toEqual([projects.gamma.id, '2026-08-10', pm2.id]);
    expect(Number(sheet.total_cost)).toBe(100);
  });

  it('a line does not leave a submitted timesheet', async () => {
    const line = await insert('crm_time_entry', { crm_project: projects.beta.id, entry_date: '2026-07-06', hours: 2 }, consultant.token);
    await update('crm_timesheet', { id: line.crm_timesheet, status: 'submitted' }, consultant.token);
    const before = (await sheetsOf(consultant, projects.beta.id)).length + (await sheetsOf(consultant, projects.alpha.id)).length;
    await expect(update('crm_time_entry', { id: line.id, entry_date: '2026-07-14' }, consultant.token))
      .rejects.toMatchObject({ code: 'RECORD_LOCKED' });
    await expect(update('crm_time_entry', { id: line.id, crm_project: projects.alpha.id }, consultant.token))
      .rejects.toMatchObject({ code: 'RECORD_LOCKED' });
    expect((await row('crm_time_entry', line.id)).crm_timesheet).toBe(line.crm_timesheet);
    const after = (await sheetsOf(consultant, projects.beta.id)).length + (await sheetsOf(consultant, projects.alpha.id)).length;
    expect(after, 'no timesheet is made for a move that is refused').toBe(before);
  });
});

describe('submit this week: each project\'s timesheet goes to its own approver', () => {
  const today = new Date().toISOString().slice(0, 10);
  const monday = mondayOf(today);

  it('My Week and This Week\'s Timesheets read the person\'s current week, Monday to Sunday', async () => {
    for (const p of [projects.alpha, projects.beta, projects.gamma]) {
      await insert('crm_time_entry', { crm_project: p.id, entry_date: monday, hours: 2 }, consultant.token);
    }
    await insert('crm_time_entry', { crm_project: projects.alpha.id, entry_date: plus(monday, -1), hours: 1 }, consultant.token);

    const week = TimesheetViews.listViews!.my_week_timesheets as Rec;
    const sheets = await verify.rows('crm_timesheet', {
      owner_id: consultant.id, period_start: { $lte: '{current_week_end}' }, period_end: { $gte: '{current_week_start}' },
    });
    expect(week.filter).toEqual([
      { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      { field: 'period_start', operator: 'less_than_or_equal', value: '{current_week_end}' },
      { field: 'period_end', operator: 'greater_than_or_equal', value: '{current_week_start}' },
    ]);
    expect(sheets.map((s) => s.crm_project).sort()).toEqual([projects.alpha.id, projects.beta.id, projects.gamma.id].sort());
    expect(sheets.every((s) => day(s.period_start) === monday)).toBe(true);

    const mine = TimeEntryViews.listViews!.my_week_time as Rec;
    expect(mine.filter).toEqual([
      { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      { field: 'entry_date', operator: 'greater_than_or_equal', value: '{current_week_start}' },
      { field: 'entry_date', operator: 'less_than_or_equal', value: '{current_week_end}' },
    ]);
    expect(mine.grouping.fields[0].field).toBe('crm_project');
    const lines = await verify.rows('crm_time_entry', {
      owner_id: consultant.id, entry_date: { $gte: '{current_week_start}', $lte: '{current_week_end}' },
    });
    expect(lines.map((l) => day(l.entry_date))).toEqual([monday, monday, monday]);
  });

  it('submitting the week sends each timesheet to its project manager; a locked project refuses only its own', async () => {
    const week = TimesheetViews.listViews!.my_week_timesheets as Rec;
    const [bulk] = week.bulkActionDefs as Rec[];
    expect([bulk!.operation, bulk!.patch]).toEqual(['update', { status: 'submitted' }]);
    expect([SubmitTimesheetAction.operation, SubmitTimesheetAction.patch]).toEqual(['update', { status: 'submitted' }]);

    await update('crm_project', { id: projects.gamma.id, time_entry_locked: true }, pm2.token);
    const sheets = await verify.rows('crm_timesheet', { owner_id: consultant.id, period_start: monday });
    const results: Record<string, string> = {};
    // What the bulk Submit does: one update per selected row, as the person.
    for (const s of sheets) {
      try {
        await update('crm_timesheet', { id: s.id, ...bulk!.patch }, consultant.token);
        results[s.crm_project] = 'submitted';
      } catch (err) {
        results[s.crm_project] = (err as Rec).code;
      }
    }
    expect(results).toEqual({
      [projects.alpha.id]: 'submitted', [projects.beta.id]: 'submitted', [projects.gamma.id]: 'RECORD_LOCKED',
    });
    for (const s of sheets) {
      const pending = await verify.rows('sys_approval_request', { record_id: s.id, status: 'pending' });
      expect(pending, `${s.name}: one request while submitted, none while refused`).toHaveLength(s.crm_project === projects.gamma.id ? 0 : 1);
    }
    expect((await row('crm_timesheet', sheets.find((s) => s.crm_project === projects.alpha.id)!.id)).approver).toBe(pm.id);
    await update('crm_project', { id: projects.gamma.id, time_entry_locked: false }, pm2.token);
  });
});
