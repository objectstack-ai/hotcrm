// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

/**
 * A forecast is titled by its period and its owner: "Q4 2026 · Nina Reyes"
 * (#2242, the #2194 T1-U08 ruling), and the title follows a rename of the
 * owner (#2435, ruling D).
 *
 * A forecast is one row per owner × period. Titled by the period alone, two
 * reps' Q4 rows read the same in Recent items and in a lookup. The title is
 * the stored `display_title` (#2230), and since #2435 it reads this row's own
 * columns only: the owner's name is `owner_name`, a copy that
 * `forecast_owner_name` (`forecast.hook.ts`) writes when a forecast is saved
 * with an owner, and that `forecast_owner_rename` (a flow on the user record)
 * rewrites when the user is renamed, inside the organizations the user
 * belongs to and nowhere else (AGENTS.md rule 10).
 *
 * Measured against the booted app, by insert, by update by id, and by a
 * rename through both doors that rename a user: an administrator's edit of the
 * user record and the user's own profile edit through the sign-in service.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let nina: Person;
let omar: Person;
let manager: Person;
let admin: string;
let k = 0;

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_forecast', { id }))[0]!;

/** A hand-entered Q4 2026 forecast, so no nightly sweep owns the row. */
const q4 = async (over: Rec = {}): Promise<string> => {
  const [row] = await verify.seed('crm_forecast', [{
    period: 'quarter',
    period_start: '2026-10-01',
    period_end: '2026-12-31',
    period_label: 'Q4 2026',
    source: 'manual',
    commit_amount: 10_000,
    ...over,
  }]);
  return String(row!.id);
};

/** A person of their own, so a rename in one case never moves another case's titles. */
const person = (name: string): Promise<Person> =>
  signUpPerson(verify, `p${++k}@forecast-owner-title.test`, {
    name, positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });

/** The organization the person's session works in, the one their sign-up made them a member of. */
const orgOf = async (p: Person): Promise<string> => String((await verify.contextFor(p.token)).tenantId);

/** Wait for the rename flow, which runs after the user's save returns. */
const titleBecomes = (id: string, title: string) => vi.waitFor(async () => {
  expect((await stored(id)).display_title).toBe(title);
}, { timeout: 10_000, interval: 50 });

beforeAll(async () => {
  verify = await hotcrmStack();
  nina = await signUpPerson(verify, 'nina@forecast-owner-title.test', {
    name: 'Nina Reyes', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  omar = await signUpPerson(verify, 'omar@forecast-owner-title.test', {
    name: 'Omar Diaz', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  manager = await signUpPerson(verify, 'maya@forecast-owner-title.test', {
    name: 'Maya Chen', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  admin = await verify.signIn();
}, 180_000);

describe('the forecast title names the period and the owner', () => {
  it("two owners' forecasts for the same quarter have different titles", async () => {
    const ninas = await stored(await q4({ owner_id: nina.id }));
    const omars = await stored(await q4({ owner_id: omar.id }));
    expect(ninas.owner_name).toBe('Nina Reyes');
    expect(ninas.display_title).toBe('Q4 2026 · Nina Reyes');
    expect(omars.display_title).toBe('Q4 2026 · Omar Diaz');
    expect(ninas.display_title).not.toBe(omars.display_title);
  });

  it('a forecast with no owner is titled by its period label alone', async () => {
    const row = await stored(await q4());
    expect(row.owner_id ?? null).toBeNull();
    expect(row.owner_name ?? null).toBeNull();
    expect(row.display_title).toBe('Q4 2026');
  });

  it("a manager's own new forecast, saved with no owner named, is titled with their name", async () => {
    const res = await verify.apiAs(manager.token, 'POST', '/data/crm_forecast', {
      period: 'quarter', period_start: '2026-10-01', source: 'manual',
    });
    expect(res.status, await res.text()).toBeLessThan(300);
    const [row] = await verify.rows('crm_forecast', { owner_id: manager.id, source: 'manual' });
    expect(row?.owner_name).toBe('Maya Chen');
    expect(row?.display_title).toBe('Q4 2026 · Maya Chen');
  });

  it('a forecast handed to nobody is titled by its period label alone again', async () => {
    const id = await q4({ owner_id: nina.id });
    const res = await verify.apiAs(admin, 'PATCH', `/data/crm_forecast/${id}`, { owner_id: null });
    expect(res.status, await res.text()).toBe(200);
    expect((await stored(id)).owner_name ?? null).toBeNull();
    expect((await stored(id)).display_title).toBe('Q4 2026');
  });

  it('handing the row to another owner re-titles it', async () => {
    const id = await q4({ owner_id: nina.id });
    const res = await verify.apiAs(admin, 'PATCH', `/data/crm_forecast/${id}`, { owner_id: omar.id });
    expect(res.status, await res.text()).toBe(200);
    expect((await stored(id)).owner_name).toBe('Omar Diaz');
    expect((await stored(id)).display_title).toBe('Q4 2026 · Omar Diaz');
  });

  it('a name a person sends is not stored: the owner decides it', async () => {
    const id = await q4({ owner_id: nina.id });
    const res = await verify.apiAs(admin, 'PATCH', `/data/crm_forecast/${id}`, { owner_name: 'Somebody Else', notes: 'x' });
    expect(res.status, await res.text()).toBe(200);
    expect((await stored(id)).display_title).toBe('Q4 2026 · Nina Reyes');
  });

  it('a row stored with no copy of the name gets it back from its next save (the backfill re-save)', async () => {
    const id = await q4({ owner_id: omar.id });
    // A row as an upgraded database holds it: an owner, no copy of the name.
    await systemUpdate(verify, 'crm_forecast', { id, owner_name: null });
    expect((await stored(id)).display_title).toBe('Q4 2026');
    const res = await verify.apiAs(admin, 'PATCH', `/data/crm_forecast/${id}`, { period_label: 'Q4 2026' });
    expect(res.status, await res.text()).toBe(200);
    expect((await stored(id)).owner_name).toBe('Omar Diaz');
    expect((await stored(id)).display_title).toBe('Q4 2026 · Omar Diaz');
  });
});

describe('a renamed owner re-titles their forecasts (#2435)', () => {
  it("an administrator's rename of the user re-titles that user's forecasts", async () => {
    const rep = await person('Rita Lane');
    const first = await q4({ owner_id: rep.id });
    const second = await q4({ owner_id: rep.id, period_start: '2026-07-01', period_end: '2026-09-30', period_label: 'Q3 2026' });
    const others = await q4({ owner_id: omar.id });

    const res = await verify.apiAs(admin, 'PATCH', `/data/sys_user/${rep.id}`, { name: 'Rita Lane-Okafor' });
    expect(res.status, await res.text()).toBe(200);

    await titleBecomes(first, 'Q4 2026 · Rita Lane-Okafor');
    await titleBecomes(second, 'Q3 2026 · Rita Lane-Okafor');
    expect((await stored(others)).display_title).toBe('Q4 2026 · Omar Diaz');
  }, 30_000);

  it("the user's own profile edit re-titles their forecasts", async () => {
    const rep = await person('Sam Ortiz');
    const id = await q4({ owner_id: rep.id });

    const res = await verify.apiAs(rep.token, 'POST', '/auth/update-user', { name: 'Samuel Ortiz' });
    expect(res.status, await res.text()).toBe(200);

    await titleBecomes(id, 'Q4 2026 · Samuel Ortiz');
  }, 30_000);

  it('a save of the user record that keeps the name leaves the forecasts alone', async () => {
    const rep = await person('Uma Patel');
    const id = await q4({ owner_id: rep.id });
    const before = (await stored(id)).updated_at;
    const res = await verify.apiAs(admin, 'PATCH', `/data/sys_user/${rep.id}`, { name: 'Uma Patel' });
    expect(res.status, await res.text()).toBe(200);
    const runs = await verify.rows('sys_automation_run', { flow_name: 'forecast_owner_rename', trigger_record_id: rep.id });
    expect(runs).toEqual([]);
    expect((await stored(id)).updated_at).toBe(before);
  });

  // Last in the file: a second organization makes every later system write
  // that names none ambiguous, the fixture's own grants included.
  it("a forecast in an organization the user is not a member of keeps its name", async () => {
    const rep = await person('Tom Hale');
    const home = await q4({ owner_id: rep.id });
    const [elsewhere] = await verify.seed('sys_organization', [{ name: `Elsewhere ${++k}`, slug: `elsewhere-${k}` }]);
    const away = await q4({ owner_id: rep.id, organization_id: String(elsewhere!.id) });
    expect((await stored(away)).organization_id).toBe(String(elsewhere!.id));
    expect((await stored(home)).organization_id).toBe(await orgOf(rep));
    expect((await stored(away)).display_title).toBe('Q4 2026 · Tom Hale');

    const res = await verify.apiAs(admin, 'PATCH', `/data/sys_user/${rep.id}`, { name: 'Thomas Hale' });
    expect(res.status, await res.text()).toBe(200);

    // The home row moving proves the run finished; the other organization's row
    // was scanned by nothing.
    await titleBecomes(home, 'Q4 2026 · Thomas Hale');
    expect((await stored(away)).display_title).toBe('Q4 2026 · Tom Hale');
  }, 30_000);
});
