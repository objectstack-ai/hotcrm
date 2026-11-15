// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { ServiceDirectorProfile } from '../src/sales/profiles';

type Rec = Record<string, any>;

/**
 * The Service Director reads the escalations, and works none (#2490, ruled A
 * 2026-11-15).
 *
 * Before: `crm_service_director` held no permission set, so `crm_user` was all
 * a holder had, and it grants nothing on `crm_case`. `case_director_sharing`
 * (critical and not closed, read) widened rows inside a grant that did not
 * exist: every case list answered 403.
 *
 * After: the position distributes `service_director`, read on `crm_case` with
 * no View All, so the share is the reach; read, every record, on the account
 * and contact behind a case; no write and no export anywhere.
 *
 * On the shipped app booted by `@objectstack/verify`, REST as the director.
 */

let verify: VerifyStack;
let admin: string;
let director: Person;
let account: Rec;
let contact: Rec;
let critical: Rec; // open, critical, owned by the admin
let routine: Rec;  // open, medium, owned by the admin
let closed: Rec;   // closed, critical, owned by the admin

const api = (method: string, path: string, body?: unknown) => verify.apiAs(director.token, method, path, body);
const status = async (method: string, path: string, body?: unknown) => (await api(method, path, body)).status;
const ids = async (path: string): Promise<string[]> => {
  const res = await api('GET', path);
  expect(res.status, await res.clone().text()).toBe(200);
  const body = (await res.json()) as Rec;
  const rows: Rec[] = body.data?.records ?? body.records ?? body.data ?? [];
  return rows.map((r) => String(r.id));
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  director = await signUpPerson(verify, 'director@service-director-reach.test', {
    // The position alone: the set must arrive through its binding in positions.ts.
    name: 'Case Director', positions: ['crm_service_director'],
  });
  [account] = await verify.seed('crm_account', [{ name: 'Director Watch Corp', type: 'customer', industry: 'technology' }]);
  [contact] = await verify.seed('crm_contact', [{
    first_name: 'Watch', last_name: 'Contact', email: 'watch@service-director-reach.test', crm_account: account!.id,
  }]);
  const adminId = String((await verify.contextFor(admin)).userId);
  const base = { description: 'It broke.', crm_account: account!.id, crm_contact: contact!.id, origin: 'web', owner_id: adminId };
  [critical, routine, closed] = await verify.seed('crm_case', [
    { ...base, subject: 'Director: critical open', priority: 'critical', status: 'in_progress' },
    { ...base, subject: 'Director: medium open', priority: 'medium', status: 'in_progress' },
    { ...base, subject: 'Director: critical closed', priority: 'critical', status: 'closed', resolution: 'Fixed.', closed_date: '2026-11-01T00:00:00.000Z' },
  ]) as [Rec, Rec, Rec];
  const owners = (await verify.rows('crm_case', { id: { $in: [critical.id, routine.id, closed.id] } })).map((r) => r.owner_id);
  expect(owners.every((o) => o && o !== director.id), 'fixture: someone else owns all three cases').toBe(true);
}, 180_000);

afterAll(async () => {
  await verify?.stop();
});

describe('the set is read only (#2490 ruling A)', () => {
  it('grants read and nothing else on every object it names', () => {
    for (const [object, grant] of Object.entries(ServiceDirectorProfile.objects) as [string, Rec][]) {
      expect(grant.allowRead, object).toBe(true);
      for (const write of ['allowCreate', 'allowEdit', 'allowDelete', 'modifyAllRecords', 'allowTransfer', 'allowExport']) {
        expect(grant[write] ?? false, `${object}.${write}`).toBe(false);
      }
    }
  });

  it('reads cases without View All, so the director share is the reach', () => {
    expect((ServiceDirectorProfile.objects.crm_case as Rec).viewAllRecords).toBe(false);
    expect(ServiceDirectorProfile.objects.crm_account.viewAllRecords).toBe(true);
    expect(ServiceDirectorProfile.objects.crm_contact.viewAllRecords).toBe(true);
  });

  it('edits no field it names', () => {
    for (const [field, rule] of Object.entries(ServiceDirectorProfile.fields) as [string, Rec][]) {
      expect(rule.editable ?? false, field).toBe(false);
    }
  });
});

describe('what a staffed director reads', () => {
  it('an open critical case someone else owns: 200, with its account and contact', async () => {
    expect(await status('GET', `/data/crm_case/${critical.id}`)).toBe(200);
    expect(await status('GET', `/data/crm_account/${account.id}`)).toBe(200);
    expect(await status('GET', `/data/crm_contact/${contact.id}`)).toBe(200);
  });

  it('lists the critical open case and neither the medium nor the closed one', async () => {
    const listed = await ids('/data/crm_case?top=200');
    expect(listed).toContain(String(critical.id));
    expect(listed).not.toContain(String(routine.id));
    expect(listed).not.toContain(String(closed.id));
  });
});

describe('what a director may not do', () => {
  it('refuses every case write', async () => {
    expect(await status('PATCH', `/data/crm_case/${critical.id}`, { subject: 'Director edit' })).toBe(403);
    expect(await status('DELETE', `/data/crm_case/${critical.id}`)).toBe(403);
    expect(await status('POST', '/data/crm_case', { subject: 'Director new', description: 'x', crm_account: account.id, priority: 'low', origin: 'web' })).toBe(403);
  });

  it('refuses an edit or a delete of the account and contact behind the case', async () => {
    expect(await status('PATCH', `/data/crm_account/${account.id}`, { industry: 'finance' })).toBe(403);
    expect(await status('DELETE', `/data/crm_account/${account.id}`)).toBe(403);
    expect(await status('PATCH', `/data/crm_contact/${contact.id}`, { last_name: 'Changed' })).toBe(403);
    expect(await status('DELETE', `/data/crm_contact/${contact.id}`)).toBe(403);
  });

  it.each(['crm_case', 'crm_account', 'crm_contact'])('refuses the %s export', async (object) => {
    expect(await status('GET', `/data/${object}/export?format=json`)).toBe(403);
  });
});
