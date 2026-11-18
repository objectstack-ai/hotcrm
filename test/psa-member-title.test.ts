// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';
import { ProjectMember } from '../src/psa/objects/project_member.object';

type Rec = Record<string, any>;

/**
 * A project member (a staffing row) is titled by its person's name
 * (hotcrm#2568).
 *
 * It used to be titled by `person`, a lookup to the user: the console's
 * created toast printed the stored value, the raw user id. A record title is a
 * stored text field (ADR-0079 D1, D5), so the row now stores `person_name`, a
 * copy of the person's name, and is titled by it. Two writers keep the copy:
 * `project_member_person_name` on a save that names a person or reaches a row
 * with no copy, and `project_member_person_rename`, a flow on the user record,
 * when the user is renamed. Same arrangement as a forecast's owner name
 * (`test/forecast-owner-title.test.ts`).
 */

let verify: VerifyStack;
let admin: string;
let pm: Person;
let project: Rec;
let k = 0;

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_project_member', { id }))[0]!;

/** A person of their own, so a rename in one case never moves another case's rows. */
const person = (name: string): Promise<Person> =>
  signUpPerson(verify, `p${++k}@psa-member-title.test`, {
    name, positions: ['crm_project_member'], permissionSets: ['project_member'],
  });

/** Staff `who` on the project as the PM, through the New form's door; returns the create answer's record. */
const staff = async (who: Person, on: Rec = project): Promise<Rec> => {
  const res = await verify.apiAs(pm.token, 'POST', '/data/crm_project_member', {
    crm_project: on.id, person: who.id, responsibility: 'consultant',
  });
  expect(res.status, await res.clone().text()).toBe(201);
  const body: Rec = await res.json();
  return (body.record ?? body.data ?? body) as Rec;
};

/** Wait for the rename flow, which runs after the user's save returns. */
const nameBecomes = (id: string, name: string) => vi.waitFor(async () => {
  expect((await stored(id)).person_name).toBe(name);
}, { timeout: 10_000, interval: 50 });

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  pm = await signUpPerson(verify, 'pm@psa-member-title.test', {
    name: 'Title PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
  });
  const [account] = await verify.rows('crm_account', {});
  project = await verify.hooks.run('crm_project', 'insert', { name: 'Member Title Rollout', crm_account: account!.id, kind: 'delivery' }, { as: pm.token });
}, 180_000);

describe('project_member_person_name: a staffing row is titled by its person', () => {
  it('is titled by a stored text field, not by the lookup', () => {
    expect(ProjectMember.nameField).toBe('person_name');
    expect(ProjectMember.fields.person_name.type).toBe('text');
    expect(ProjectMember.fields.person_name.readonly).toBe(true);
  });

  it('answers the create with the person\'s name, the value the created toast prints', async () => {
    const who = await person('Lena Park');
    const created = await staff(who);
    expect(created.person_name).toBe('Lena Park');
    expect((await stored(String(created.id))).person_name).toBe('Lena Park');
  });

  it('follows a change of person, and does not keep a name a person sends', async () => {
    const first = await person('Ivo Brandt');
    const second = await person('Mia Santos');
    const row = await staff(first);
    const res = await verify.apiAs(pm.token, 'PATCH', `/data/crm_project_member/${row.id}`, { person: second.id, person_name: 'Somebody Else' });
    expect(res.status, await res.text()).toBe(200);
    expect((await stored(String(row.id))).person_name).toBe('Mia Santos');
  });

  it('a row stored with no copy of the name gets it back from its next save (the backfill re-save)', async () => {
    const who = await person('Noor Haddad');
    const row = await staff(who);
    // A row as an upgraded database holds it: a person, no copy of the name.
    await systemUpdate(verify, 'crm_project_member', { id: row.id, person_name: null });
    expect((await stored(String(row.id))).person_name ?? null).toBeNull();
    const res = await verify.apiAs(admin, 'PATCH', `/data/crm_project_member/${row.id}`, { responsibility: 'consultant' });
    expect(res.status, await res.text()).toBe(200);
    expect((await stored(String(row.id))).person_name).toBe('Noor Haddad');
  });
});

describe('project_member_person_rename: a renamed user re-titles their staffing rows', () => {
  it("an administrator's rename re-titles that user's rows on every project, and nobody else's", async () => {
    const who = await person('Rosa Kim');
    const other = await person('Omar Fajr');
    const second = await verify.hooks.run('crm_project', 'insert', { name: `Second Rollout ${++k}`, crm_account: project.crm_account, kind: 'delivery' }, { as: pm.token });
    const a = await staff(who);
    const b = await staff(who, second);
    const c = await staff(other);

    const res = await verify.apiAs(admin, 'PATCH', `/data/sys_user/${who.id}`, { name: 'Rosa Kim-Laurent' });
    expect(res.status, await res.text()).toBe(200);

    await nameBecomes(String(a.id), 'Rosa Kim-Laurent');
    await nameBecomes(String(b.id), 'Rosa Kim-Laurent');
    expect((await stored(String(c.id))).person_name).toBe('Omar Fajr');
  }, 30_000);

  it('a save of the user record that keeps the name starts nothing', async () => {
    const who = await person('Uri Stone');
    await staff(who);
    const res = await verify.apiAs(admin, 'PATCH', `/data/sys_user/${who.id}`, { name: 'Uri Stone' });
    expect(res.status, await res.text()).toBe(200);
    expect(await verify.rows('sys_automation_run', { flow_name: 'project_member_person_rename', trigger_record_id: who.id })).toEqual([]);
  });
});
