// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * A lead reaches Converted only through Convert Lead (#2189).
 *
 * The `lead_conversion` wizard creates or reuses the account and contact and
 * writes `is_converted: true`, the `converted_*` links and `status:
 * 'converted'` in one update (`mark_converted`). Before #2189 two other doors
 * reached the same status with nothing converted:
 *
 *   - Edit: picking Converted in the Status picklist saved ("Lead updated
 *     successfully") with `is_converted: false` and every `converted_*` null;
 *   - Create: `POST crm_lead {"status":"converted"}` answered 201 the same way,
 *     and the `lead_assignment` record-change run on it then failed.
 *
 * Either way the converted-lead lock in `lead.hook.ts`, which read
 * `status == 'converted'` as "converted", refused every later edit with `409
 * RECORD_LOCKED`, so the lead was frozen for good with no converted records to
 * make changes on.
 *
 * What these pins hold, as a sales rep and as a sales manager, through the
 * engine's write door (`hooks.run`) and the REST door (`/data/crm_lead`):
 *
 *   1. Create as Converted is refused, and nothing is stored.
 *   2. Edit to Converted is refused, and the lead keeps its status and stays
 *      editable.
 *   3. The wizard still converts (account, contact, `is_converted: true`,
 *      status Converted) and the converted lead is still frozen.
 *   4. A lead stored at Converted with nothing converted (a row written before
 *      this rule, the state the two doors above produced) is no longer frozen
 *      by the lock: it can be edited again, a record it is linked to can still
 *      be deleted, and once its status is set back it converts through the
 *      wizard. The rule gates the CROSSING into Converted, so a row that
 *      predates it passes every later write.
 *
 * The refusal envelope is `ValidationError` / `VALIDATION_FAILED` at the engine
 * door and HTTP 400 at the REST door. The message names Convert Lead because
 * the ruling on #2189 makes that its contract: a rep who picked Converted has
 * to learn where conversion actually happens.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
const people: Record<'rep' | 'manager', Person> = {} as Record<'rep' | 'manager', Person>;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  people.rep = await signUpPerson(verify, 'rep@lead-converted-only-by-conversion.test', {
    name: 'Converted Status Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  people.manager = await signUpPerson(verify, 'manager@lead-converted-only-by-conversion.test', {
    name: 'Converted Status Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

const PEOPLE = [['a sales rep', 'rep'], ['a sales manager', 'manager']] as const;

/** A lead identity no other case uses. */
const identity = (): Rec => {
  const n = ++k;
  return {
    first_name: 'Cora', last_name: `Status ${n}`, company: `Status Works ${n}`,
    email: `cora${n}@lead-converted-only-by-conversion.test`,
  };
};

const stored = async (id: string): Promise<Rec | undefined> => (await verify.rows('crm_lead', { id }))[0];

/** The engine's error, or null when the write went through. */
const refusal = (write: Promise<unknown>): Promise<Rec | null> =>
  write.then(() => null, (error: Rec) => error);

/** A REST call as `who`: the HTTP status and the parsed body. */
const rest = async (who: Person, method: string, path: string, body?: unknown): Promise<{ status: number; body: Rec }> => {
  const res = await verify.apiAs(who.token, method, path, body);
  const text = await res.text();
  let parsed: Rec = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
};

/** Every sentence a REST error body carries, flattened — where the rule's message travels. */
const restText = (body: Rec): string => JSON.stringify(body);

/** `who`'s own lead at `status`, created through the engine's write door. */
const leadOf = (who: Person, status: string): Promise<Rec> =>
  verify.hooks.run('crm_lead', 'insert', { ...identity(), status }, { as: who.token });

/** Run the Convert Lead wizard on `leadId` as `who`, submitting the screen as the console does. */
async function convert(leadId: string, who: Person): Promise<Rec> {
  const started = (await verify.flows.run('lead_conversion', { recordId: leadId }, { as: who.token })) as Rec;
  // The runner submits every prefilled screen value with the answers (see
  // `test/flow-conversion.test.ts`), so the defaults are read off the screen.
  const prefilled: Rec = {};
  for (const f of ((started.screen ?? started.output?.screen)?.fields ?? []) as Rec[]) {
    if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
  }
  return verify.flows.resume(started as never, { ...prefilled, createOpportunity: false }, { as: who.token }) as Promise<Rec>;
}

/**
 * `who`'s lead stored at Converted with nothing converted, the state the Edit
 * and Create doors produced before #2189. The rule now refuses every write
 * that would produce it, so the row is written the way a row that predates the
 * rule was stored: past the engine, straight to the datasource's driver.
 */
async function stuckLeadOf(who: Person): Promise<Rec> {
  const lead = await leadOf(who, 'qualified');
  const ql = verify.kernel.getService<Rec>('objectql');
  await ql.getDriverForObject('crm_lead').update(ql.resolveObjectName('crm_lead'), lead.id, { status: 'converted' });
  const row = await stored(lead.id);
  expect({ status: row?.status, isConverted: Boolean(row?.is_converted), contact: row?.converted_contact ?? null })
    .toEqual({ status: 'converted', isConverted: false, contact: null });
  return row!;
}

describe('Create as Converted is refused (#2189)', () => {
  it.each(PEOPLE)('%s, through the engine write door', async (_label, key) => {
    const who = identity();
    const err = await refusal(
      verify.hooks.run('crm_lead', 'insert', { ...who, status: 'converted' }, { as: people[key].token }),
    );
    expect({ name: err?.name, code: err?.code }).toEqual({ name: 'ValidationError', code: 'VALIDATION_FAILED' });
    expect(String(err?.message)).toContain('Convert Lead');
    expect(await verify.rows('crm_lead', { email: who.email })).toEqual([]);
  });

  it.each(PEOPLE)('%s, through REST POST /data/crm_lead', async (_label, key) => {
    const who = identity();
    const res = await rest(people[key], 'POST', '/data/crm_lead', { ...who, status: 'converted' });
    expect(res.status).toBe(400);
    expect(restText(res.body)).toContain('Convert Lead');
    expect(await verify.rows('crm_lead', { email: who.email })).toEqual([]);
  });
});

describe('Edit to Converted is refused (#2189)', () => {
  it.each(PEOPLE.flatMap(([label, key]) => (['new', 'contacted', 'qualified'] as const).map((from) => [label, from, key] as const)))(
    '%s, from %s, through the engine write door',
    async (_label, from, key) => {
      const lead = await leadOf(people[key], from);
      const err = await refusal(
        verify.hooks.run('crm_lead', 'update', { id: lead.id, status: 'converted' }, { as: people[key].token }),
      );
      expect({ name: err?.name, code: err?.code }).toEqual({ name: 'ValidationError', code: 'VALIDATION_FAILED' });
      expect(String(err?.message)).toContain('Convert Lead');
      const row = await stored(lead.id);
      expect({ status: row?.status, isConverted: Boolean(row?.is_converted) }).toEqual({ status: from, isConverted: false });
    },
  );

  it.each(PEOPLE)('%s, through REST PATCH — and the lead stays editable', async (_label, key) => {
    const lead = await leadOf(people[key], 'qualified');
    const refused = await rest(people[key], 'PATCH', `/data/crm_lead/${lead.id}`, { status: 'converted' });
    expect(refused.status).toBe(400);
    expect(restText(refused.body)).toContain('Convert Lead');
    // Not frozen: the next ordinary edit lands.
    const next = await rest(people[key], 'PATCH', `/data/crm_lead/${lead.id}`, { title: 'Buyer' });
    expect(next.status).toBe(200);
    const row = await stored(lead.id);
    expect({ status: row?.status, title: row?.title, isConverted: Boolean(row?.is_converted) })
      .toEqual({ status: 'qualified', title: 'Buyer', isConverted: false });
  });
});

describe('Convert Lead still converts, and the converted lead stays frozen (#2189)', () => {
  it.each(PEOPLE)('%s converts a qualified lead and then cannot edit it', async (_label, key) => {
    const lead = await leadOf(people[key], 'qualified');
    const done = await convert(lead.id, people[key]);
    expect(done.error ?? null).toBeNull();
    const row = await stored(lead.id);
    expect({
      status: row?.status, isConverted: row?.is_converted,
      account: typeof row?.converted_account, contact: typeof row?.converted_contact,
    }).toEqual({ status: 'converted', isConverted: true, account: 'string', contact: 'string' });

    const err = await refusal(
      verify.hooks.run('crm_lead', 'update', { id: lead.id, company: 'Elsewhere' }, { as: people[key].token }),
    );
    expect({ code: err?.code, status: err?.status }).toEqual({ code: 'RECORD_LOCKED', status: 409 });
    const back = await rest(people[key], 'PATCH', `/data/crm_lead/${lead.id}`, { status: 'new' });
    expect(back.status).toBe(409);
    expect((await stored(lead.id))?.status).toBe('converted');
  });
});

describe('a lead stuck at Converted with nothing converted is released (#2189)', () => {
  it.each(PEOPLE)('%s can edit it again: the lock no longer freezes it, and the rule gates only the crossing', async (_label, key) => {
    const lead = await stuckLeadOf(people[key]);
    const edited = await rest(people[key], 'PATCH', `/data/crm_lead/${lead.id}`, { title: 'Buyer' });
    expect(edited.status).toBe(200);
    expect({ title: (await stored(lead.id))?.title, status: (await stored(lead.id))?.status })
      .toEqual({ title: 'Buyer', status: 'converted' });
  });

  it('does not make a record it is linked to undeletable', async () => {
    // Why the rule is a gate and not an invariant (see `lead.object.ts`). The
    // intake dedupe links a lead to the contact whose address it repeats, and
    // deleting that contact makes the engine clear the link with an UPDATE of
    // the lead. Judged as an invariant, that cleanup was refused on a stuck
    // lead and the contact could not be deleted.
    const owner = people.manager;
    const n = ++k;
    const email = `dup${n}@lead-converted-only-by-conversion.test`;
    const [account] = await verify.seed('crm_account', [{ name: `Dedupe Works ${n}`, owner_id: owner.id }]);
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Dee', last_name: `Dupe ${n}`, email, crm_account: account!.id, owner_id: owner.id,
    }]);
    const lead = await verify.hooks.run('crm_lead', 'insert', { ...identity(), email, status: 'qualified' }, { as: owner.token });
    const ql = verify.kernel.getService<Rec>('objectql');
    await ql.getDriverForObject('crm_lead').update(ql.resolveObjectName('crm_lead'), lead.id, { status: 'converted' });
    expect((await stored(lead.id))?.duplicate_of_contact, 'fixture: the intake dedupe linked the lead').toBe(contact!.id);

    const deleted = await rest(owner, 'DELETE', `/data/crm_contact/${contact!.id}`);
    expect(deleted.status).toBe(200);
    expect(await verify.rows('crm_contact', { id: contact!.id })).toEqual([]);
    expect((await stored(lead.id))?.duplicate_of_contact ?? null).toBeNull();
  });

  it.each(PEOPLE)('%s edits its status back, and it then converts through the wizard', async (_label, key) => {
    const lead = await stuckLeadOf(people[key]);
    const back = await rest(people[key], 'PATCH', `/data/crm_lead/${lead.id}`, { status: 'qualified' });
    expect(back.status).toBe(200);
    expect((await stored(lead.id))?.status).toBe('qualified');

    const done = await convert(lead.id, people[key]);
    expect(done.error ?? null).toBeNull();
    const row = await stored(lead.id);
    expect({ status: row?.status, isConverted: row?.is_converted, contact: typeof row?.converted_contact })
      .toEqual({ status: 'converted', isConverted: true, contact: 'string' });
  });
});
