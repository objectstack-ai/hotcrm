// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, guestInsert, type Person } from './helpers/verify-stack';

/**
 * A Web-to-Case submission carries a way to answer the person who sent it
 * (#2190) — pinned on STORED ROWS, through the platform's own anonymous door.
 *
 * ### The defect
 *
 * `web_to_case` (`/forms/support`) asked for Subject, Description, Case Type
 * and Priority, and `crm_case` had no column for who wrote in. A web case
 * lands with no contact and no account, so the agent who received it had
 * nothing to reply to. Measured on `main` dfe41c7e before this change: the
 * same submission with a name and an email in the body answered 201, and the
 * stored row carried neither (the door's allow-list dropped both keys).
 *
 * ### What the cases below hold, and the boundary each one sits on
 *
 *  1. The door stores the name and the email the visitor typed — and does NOT
 *     turn the email into a contact or an account, even when a contact with
 *     that very address exists (⛔ no auto-link: an anonymous address is
 *     unverified, and the agent links the case after checking).
 *  2. The door refuses a submission without the email, because the FORM marks
 *     it `required`; the object does not (a staff case needs neither).
 *  3. Widening the form by two fields admitted exactly those two: a planted
 *     `crm_contact`, `crm_account` or `owner_id` is still dropped at the door.
 *  4. The guest branch of `case_sla_defaults` still nulls every internal field
 *     it nulled before, and leaves the two supplied fields alone. That one is
 *     driven at the hook level (`guestInsert`), because the door drops those
 *     internal keys before any hook sees them — the branch is the layer that
 *     has to hold the day the form's list moves (#1505).
 *  5. A staff-created case saves without either field, and the agent can fill
 *     one in afterwards.
 *
 * Every door case carries the positive control the sibling guest suites use:
 * `crm_case.origin` declares no default, so a stored `origin: "web"` has one
 * source — the guest branch — and proves the row is the guest submission.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let agent: Person;
let outsider: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  // In the `service_agent` pool, so a web case is round-robined to a KNOWN
  // owner — the planted owner's absence is then a positive value, not a null.
  agent = await signUpPerson(verify, 'agent@web-to-case-reply.test', {
    name: 'Reply Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
  // A real user who holds no position: the owner a visitor might plant.
  outsider = await signUpPerson(verify, 'outsider@web-to-case-reply.test', { name: 'Not The Pool' });
}, 120_000);

const submit = (body: Rec) => verify.api('/forms/support/submit', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const storedCase = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0] ?? {};
const casesWithSubject = (subject: string) => verify.rows('crm_case', { subject });

describe('web_to_case — the reply address reaches the case (#2190)', () => {
  it('stores the name and email the visitor typed, and links no contact or account by that email', async () => {
    const address = `known${++k}@web-to-case-reply.test`;
    const [account] = await verify.seed('crm_account', [{ name: `Known Co ${k}` }]);
    const [known] = await verify.seed('crm_contact', [{
      first_name: 'Ada', last_name: 'Known', email: address, crm_account: account!.id,
    }]);
    const res = await submit({
      supplied_name: 'Ada Visitor', supplied_email: address,
      subject: `Printer on fire ${k}`, description: 'It is definitely on fire.', priority: 'high',
    });
    expect(res.status).toBe(201);
    const kase = await storedCase(String(((await res.json()) as Rec).id));
    expect(kase.origin, 'not the guest submission this case is about').toBe('web');
    expect(kase.supplied_name).toBe('Ada Visitor');
    expect(kase.supplied_email).toBe(address);
    // Anti-vacuum: the contact the address would match really is there.
    expect((await verify.rows('crm_contact', { id: known!.id }))[0]?.email).toBe(address);
    expect(kase.crm_contact ?? null, 'the unverified email was matched to a contact').toBeNull();
    expect(kase.crm_account ?? null, 'the unverified email was matched to an account').toBeNull();
  }, 60_000);

  it('refuses a submission without the email, because the form requires it — and stores nothing', async () => {
    for (const [label, supplied] of [['absent', {}], ['empty', { supplied_email: '' }]] as const) {
      const subject = `No address ${label} ${++k}`;
      const res = await submit({ supplied_name: 'Nameless', subject, description: 'x', ...supplied });
      expect(res.status, `a submission with the email ${label} was not refused`).toBe(400);
      const body = (await res.json()) as Rec;
      expect(body.code).toBe('VALIDATION_FAILED');
      expect((body.fields ?? []).map((f: Rec) => [f.field, f.code])).toEqual([['supplied_email', 'required']]);
      expect(await casesWithSubject(subject), `a refused ${label}-email submission still stored a case`).toEqual([]);
    }
  }, 60_000);

  it('still drops a planted crm_contact, crm_account and owner_id at the door', async () => {
    const [account] = await verify.seed('crm_account', [{ name: `Victim Co ${++k}` }]);
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Vic', last_name: 'Tim', email: `victim${k}@web-to-case-reply.test`, crm_account: account!.id,
    }]);
    const res = await submit({
      supplied_name: 'Mallory', supplied_email: `mallory${k}@web-to-case-reply.test`,
      subject: `Planted ${k}`, description: 'x',
      crm_contact: contact!.id, crm_account: account!.id, owner_id: outsider.id,
    });
    expect(res.status).toBe(201);
    const kase = await storedCase(String(((await res.json()) as Rec).id));
    expect(kase.origin, 'not the guest submission this case is about').toBe('web');
    expect(kase.supplied_email, 'the supplied fields did not land — this case would prove nothing').toBe(`mallory${k}@web-to-case-reply.test`);
    expect(kase.crm_contact ?? null, 'a visitor attached the case to a contact of their choosing').toBeNull();
    expect(kase.crm_account ?? null, 'a visitor attached the case to an account of their choosing').toBeNull();
    expect(kase.owner_id, 'a visitor chose the owner').not.toBe(outsider.id);
    expect(kase.owner_id, 'the web case was not round-robined to the pool').toBe(agent.id);
  }, 60_000);

  it('the guest branch still nulls every internal field, and leaves the two supplied fields alone', async () => {
    const written = await guestInsert(verify, 'crm_case', {
      subject: `Guest strip ${++k}`, description: 'x',
      supplied_name: 'Grace Guest', supplied_email: `grace${k}@web-to-case-reply.test`,
      owner_id: outsider.id,
      internal_notes: 'PLANTED-NOTES',
      resolution: 'PLANTED-RESOLUTION',
      is_escalated: true,
      escalation_reason: 'PLANTED-REASON',
    });
    const kase = await storedCase(String(written.id));
    expect(kase.origin, 'the guest branch did not run').toBe('web');
    expect(kase.internal_notes).toBeNull();
    expect(kase.resolution).toBeNull();
    expect(kase.is_escalated).toBe(false);
    expect(kase.escalation_reason).toBeNull();
    expect(kase.owner_id).not.toBe(outsider.id);
    expect(kase.supplied_name, 'the guest branch stripped the visitor’s own name').toBe('Grace Guest');
    expect(kase.supplied_email, 'the guest branch stripped the reply address').toBe(`grace${k}@web-to-case-reply.test`);
  }, 60_000);

  it('a staff-created case saves without either field, and the agent can fill one in later', async () => {
    const created = await verify.hooks.run('crm_case', 'insert', {
      subject: `Phoned in ${++k}`, description: 'Customer called.', origin: 'phone',
    }, { as: agent.token });
    const id = String(created.id);
    const before = await storedCase(id);
    expect(before.subject, 'the staff case was not stored').toBe(`Phoned in ${k}`);
    expect(before.supplied_name ?? null).toBeNull();
    expect(before.supplied_email ?? null).toBeNull();
    await verify.hooks.run('crm_case', 'update', { id, supplied_email: `caller${k}@web-to-case-reply.test` }, { as: agent.token });
    expect((await storedCase(id)).supplied_email, 'the agent could not record the reply address').toBe(`caller${k}@web-to-case-reply.test`);
  }, 60_000);
});
