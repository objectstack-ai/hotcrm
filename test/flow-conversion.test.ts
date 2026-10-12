// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { LeadConversionFlow } from '../src/sales/flows/lead-conversion.flow';
import {
  hotcrmStack, signUpPerson, notificationsTo, conditionHolds, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The REAL lead_conversion flow, run through the shipped app booted by
 * `@objectstack/verify` — the platform's automation engine (node traversal,
 * decision evaluation, {var} interpolation, assignment convergence) over the
 * real data engine, as a real persona, so every write the flow makes is held
 * to the same permissions and validation the running app applies.
 *
 * This is the layer above the hook-runtime tests: it proves the FLOW GRAPH
 * behaves — specifically that the account + contact dedupe branches route and
 * converge correctly — not just that the nodes are wired.
 */

/**
 * Fold a name the way the producer hooks do (#626). The real writes below run
 * the shipped `account_protection` hook, which stamps this key; the assertion
 * that uses it checks the conversion matched on the stamped key, not on the
 * raw name.
 */
const fold = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

// The shipped app booted through `@objectstack/verify`'s handle; a sales rep
// converts their own qualified lead through the screen flow (`flows.run`, then
// `flows.resume` with the screen), and what the conversion wrote is read back
// off the engine. Every case converts a company of its own, so the dedupe it
// pins is about the rows the case put there and nothing the boot seeded.
let verify: VerifyStack;
let rep: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  // The converter is a sales MANAGER. On 17.7.0 a sales rep's conversion of a
  // lead into a NEW account is refused: the flow's `create_account` writes
  // `annual_revenue`, which `sales_rep` may read but not edit
  // (`'crm_account.annual_revenue': { editable: false }`), and the flow runs as
  // its caller — reported as a finding. This file's subject is what the
  // conversion creates and reuses, so it runs as a persona whose conversion
  // completes.
  rep = await signUpPerson(verify, 'manager@flow-conversion.test', {
    name: 'Conversion Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

const create = (object: string, doc: Rec) => verify.hooks.run(object, 'insert', doc, { as: rep.token });

/** A company and an email no other case uses — the lead's identity for one case. */
const identity = () => {
  const n = ++k;
  return { company: `Globex Industries ${n}`, email: `joe${n}@globex.example.com` };
};

/** The rep's qualified lead for `who`. */
const qualifiedLead = (who: { company: string; email: string }) => create('crm_lead', {
  company: who.company, email: who.email, first_name: 'Joe', last_name: 'Green', phone: '555',
  title: 'Buyer', lead_source: 'web', status: 'qualified',
});

async function runConversion(
  leadId: string,
  screen: Rec = { createOpportunity: true, opportunityName: 'Deal', opportunityAmount: 100000 },
  by: Person = rep,
) {
  const started = await verify.flows.run('lead_conversion', { recordId: leadId }, { as: by.token });
  // Screen flow pauses at screen_1; resume with the collected inputs — ON TOP
  // OF WHAT THE SCREEN PREFILLED. The runner seeds its value state from every
  // field carrying a `defaultValue`, visible or not, and submits that bag
  // whole, so a payload holding only the answers a user types is not the one
  // the console sends. `closeDate` (#1708) arrives that way: prefilled to the
  // conversion's default close date and `required`, so omitting it here would
  // be refused by the screen's own contract — correctly, since the flow no
  // longer has a date of its own to fall back on. Read off the descriptor
  // rather than restated, because the default is authored in exactly one place.
  const prefilled: Rec = {};
  const started_ = started as Rec;
  for (const f of ((started_.screen ?? started_.output?.screen)?.fields ?? []) as Rec[]) {
    if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
  }
  return verify.flows.resume(started, { ...prefilled, ...screen }, { as: by.token });
}

/** What the conversion left for `who`: the account(s), contact(s), deal(s) and the lead. */
const after = async (who: { company: string; email: string }, leadId: string) => {
  const accounts = await verify.rows('crm_account', { name: who.company });
  const ids = accounts.map((a) => a.id);
  const contacts = ids.length ? await verify.rows('crm_contact', { crm_account: { $in: ids } }) : [];
  const opportunities = ids.length ? await verify.rows('crm_opportunity', { crm_account: { $in: ids } }) : [];
  const [lead] = await verify.rows('crm_lead', { id: leadId });
  return { accounts, contacts, opportunities, lead: lead! };
};

describe('lead_conversion flow — runtime', () => {
  it('creates account + contact + opportunity for a brand-new lead', async () => {
    const who = identity();
    const lead = await qualifiedLead(who);
    await runConversion(lead.id);

    const out = await after(who, lead.id);
    expect(out.accounts.length, 'one account created').toBe(1);
    expect(out.contacts.length, 'one contact created').toBe(1);
    expect(out.opportunities.length, 'one opportunity created').toBe(1);
    const acct = out.accounts[0]!;
    expect(acct.name).toBe(who.company);
    // Contact + opportunity link to that account id.
    expect(out.contacts[0]!.crm_account).toBe(acct.id);
    expect(out.opportunities[0]!.crm_account).toBe(acct.id);
    // Lead stamped converted.
    expect(out.lead.is_converted).toBe(true);
    expect(out.lead.status).toBe('converted');
  });

  it('REUSES an existing account with the same company (no duplicate)', async () => {
    const who = identity();
    const existing = await create('crm_account', { name: who.company, is_active: true });
    expect(existing.name_normalized, 'the fold key the conversion matches on').toBe(fold(who.company));
    const lead = await qualifiedLead(who);
    await runConversion(lead.id);

    const out = await after(who, lead.id);
    expect(out.accounts.length, 'no duplicate account').toBe(1);
    expect(out.accounts[0]!.id).toBe(existing.id);
    // The new contact + opportunity hang off the reused account.
    expect(out.contacts[0]!.crm_account).toBe(existing.id);
    expect(out.opportunities[0]!.crm_account).toBe(existing.id);
  });

  it('REUSES an existing contact (same email in the account) — no duplicate', async () => {
    const who = identity();
    const account = await create('crm_account', { name: who.company, is_active: true });
    const existing = await create('crm_contact', {
      email: who.email, crm_account: account.id, first_name: 'Joe', last_name: 'Green',
    });
    const lead = await qualifiedLead(who);
    await runConversion(lead.id);

    const out = await after(who, lead.id);
    expect(out.accounts.length).toBe(1);
    expect(out.contacts.length, 'no duplicate contact').toBe(1);
    expect(out.contacts[0]!.id).toBe(existing.id);
    expect(out.opportunities[0]!.primary_contact).toBe(existing.id);
  });

  it('skips opportunity creation when the screen says no', async () => {
    const who = identity();
    const lead = await qualifiedLead(who);
    await runConversion(lead.id, { createOpportunity: false });

    const out = await after(who, lead.id);
    expect(out.accounts.length).toBe(1);
    expect(out.contacts.length).toBe(1);
    expect(out.opportunities.length, 'no opportunity').toBe(0);
    expect(out.lead.is_converted).toBe(true);
  });
});

/**
 * The person's own facts, and their CONSENT, travel with the conversion
 * (#2068). Before this, `create_contact` copied eight fields and a lead that
 * had opted out of email and calls became a contact who had done neither — an
 * emailable contact, with a welcome prompt to its owner.
 *
 * Converted by a sales REP onto an account the rep already owns. The flow runs
 * as its caller, so this is the persona whose field-level grants every write
 * below has to clear; onto an EXISTING account because a rep's conversion into
 * a new one is refused at `create_account` (the note on the manager above).
 */
describe('lead_conversion — the contact keeps the lead’s consent and person fields (#2068)', () => {
  let salesRep: Person;
  beforeAll(async () => {
    salesRep = await signUpPerson(verify, 'rep@flow-conversion.test', {
      name: 'Conversion Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
  }, 120_000);

  const asRep = (object: string, doc: Rec) => verify.hooks.run(object, 'insert', doc, { as: salesRep.token });

  /** The rep's qualified lead for `who`, onto the rep's own account for the same company. */
  const leadOnOwnAccount = async (who: { company: string; email: string }, lead: Rec, contact?: Rec) => {
    const account = await asRep('crm_account', { name: who.company, is_active: true });
    const existing = contact
      ? await asRep('crm_contact', {
        email: who.email, crm_account: account.id, first_name: 'Dora', last_name: 'Diaz', ...contact,
      })
      : undefined;
    const created = await asRep('crm_lead', {
      company: who.company, email: who.email, first_name: 'Dora', last_name: 'Diaz', status: 'qualified', ...lead,
    });
    // The fixture is what the card measured: the lead really holds the flags.
    for (const key of ['do_not_call', 'email_opt_out'] as const) {
      if (key in lead) expect(created[key], `the lead lost ${key}`).toBe(lead[key]);
    }
    return { account, existing, lead: created };
  };

  /** Convert as the rep (no opportunity) and read back the contact the lead now points at. */
  const convert = async (leadId: string): Promise<Rec> => {
    const done = (await runConversion(leadId, { createOpportunity: false }, salesRep)) as Rec;
    expect(done.error ?? null, 'the conversion failed').toBeNull();
    const [lead] = await verify.rows('crm_lead', { id: leadId });
    expect(lead!.is_converted, 'the lead was not marked converted').toBe(true);
    const [contact] = await verify.rows('crm_contact', { id: lead!.converted_contact });
    expect(contact, 'the lead points at no contact').toBeDefined();
    return contact!;
  };

  /** The owner's welcome prompts for `contact` — what `email_opt_out` silences. */
  const prompts = async (contact: Rec) =>
    (await notificationsTo(verify, salesRep.id, 'contact_welcome'))
      .filter((n) => n.payload?.actionUrl === `/crm_contact/${contact.id}`);

  it('a NEW contact carries both opt-outs, mobile, lead source and salutation', async () => {
    const { lead } = await leadOnOwnAccount(identity(), {
      salutation: 'dr', mobile: '+1-555-0777', lead_source: 'referral', do_not_call: true, email_opt_out: true,
    });
    const contact = await convert(lead.id);
    expect(contact).toMatchObject({
      salutation: 'dr', mobile: '+1-555-0777', lead_source: 'referral', do_not_call: true, email_opt_out: true,
    });
    // The opt-out the product acts on: an opted-out contact raises no prompt.
    expect(await prompts(contact), 'an opted-out contact was announced for a welcome').toHaveLength(0);
  });

  it('a NEW contact copies the flags rather than stamping them: a lead that never opted out stays reachable', async () => {
    const { lead } = await leadOnOwnAccount(identity(), { do_not_call: false, email_opt_out: false });
    const contact = await convert(lead.id);
    expect(contact).toMatchObject({ do_not_call: false, email_opt_out: false });
    // Control for the zero above: the same read finds the prompt when there is one.
    expect(await prompts(contact)).toHaveLength(1);
  });

  // An EXISTING contact: the stricter value wins, flag by flag. Each row is
  // [the contact's flags, the lead's flags, the contact's flags after].
  const T = true;
  const F = false;
  it.each([
    ['both raised', [F, F], [T, T], [T, T]],
    ['never cleared', [T, T], [F, F], [T, T]],
    ['only email opt-out raised', [T, F], [F, T], [T, T]],
    ['only do-not-call raised', [F, T], [T, F], [T, T]],
    ['nothing to raise', [F, F], [F, F], [F, F]],
  ] as const)('an EXISTING contact keeps the stricter value — %s', async (_label, before, from, after) => {
    const { existing, lead } = await leadOnOwnAccount(
      identity(),
      { do_not_call: from[0], email_opt_out: from[1], mobile: '+1-555-0777', lead_source: 'web' },
      { do_not_call: before[0], email_opt_out: before[1], mobile: '+1-555-0100', lead_source: 'event' },
    );
    const contact = await convert(lead.id);
    expect(contact.id, 'the contact was not reused').toBe(existing!.id);
    expect({ do_not_call: contact.do_not_call, email_opt_out: contact.email_opt_out })
      .toEqual({ do_not_call: after[0], email_opt_out: after[1] });
    // Only consent is raised: the reused contact's own facts stand.
    expect(contact).toMatchObject({ mobile: '+1-555-0100', lead_source: 'event' });
  });

  /**
   * Each raise is one TOTAL, PARTITIONING pair of edges: on every shape
   * `get_lead` can bind, exactly one edge out of the decision is live, and the
   * raise is live only for a lead that carries the flag as `true`.
   */
  const edges = (LeadConversionFlow.edges ?? []) as Rec[];
  const SHAPES = (flag: string): Array<[string, Rec, boolean]> => [
    ['leadRecord unbound', {}, false],
    ['leadRecord null', { leadRecord: null }, false],
    ['column absent (driver-memory)', { leadRecord: { id: 'lead_1' } }, false],
    ['column null (driver-sql)', { leadRecord: { [flag]: null } }, false],
    ['flag off', { leadRecord: { [flag]: false } }, false],
    ['flag on', { leadRecord: { [flag]: true } }, true],
  ];
  it.each([
    ['decision_contact_do_not_call', 'do_not_call', 'raise_contact_do_not_call'],
    ['decision_contact_email_opt_out', 'email_opt_out', 'raise_contact_email_opt_out'],
  ])('%s answers with exactly one live edge on every shape', (decision, flag, raise) => {
    const out = edges.filter((e) => e.source === decision);
    expect(out, `${decision} must branch two ways`).toHaveLength(2);
    for (const [shape, vars, raised] of SHAPES(flag)) {
      const live = out.filter((e) => conditionHolds(verify, e.condition, vars));
      expect(live.map((e) => e.target), shape).toHaveLength(1);
      expect(live[0]!.target === raise, `${shape}: raise is ${raised ? 'not ' : ''}taken`).toBe(raised);
    }
  });

  it('a raise writes the literal `true`, never a copy of the lead (a copy would clear an opt-out)', () => {
    for (const [node, flag] of [
      ['raise_contact_do_not_call', 'do_not_call'], ['raise_contact_email_opt_out', 'email_opt_out'],
    ] as const) {
      const config = (LeadConversionFlow.nodes as Rec[]).find((n) => n.id === node)?.config;
      expect(config?.fields, node).toEqual({ [flag]: true });
    }
  });
});

/**
 * Create Opportunity ticked with no amount is refused BEFORE anything is
 * written (#2060 item 2, finding A-01).
 *
 * `crm_opportunity.amount` is required, and the conversion's writes are not
 * one transaction: on 17.7.0 a failed run is not undone. So a submission that
 * reached `create_opportunity` without an amount failed there after
 * `create_account` and `create_contact` had already run, and left an account,
 * a contact, no opportunity and an unconverted lead. The screen's own
 * contract refuses it now, ahead of every node, and the refused run stays
 * open, so the rep adds the amount and submits the same dialog again.
 *
 * Each case compares the refusal and the store in ONE object: "the dialog
 * said no" and "nothing was written" are two claims, and only together are
 * they the fix.
 */
describe('lead_conversion — a ticked Create Opportunity needs an amount before anything is written (#2060 item 2)', () => {
  /** Start the conversion and collect the bag the console submits: every prefilled field. */
  const start = async (leadId: string) => {
    const started = await verify.flows.run('lead_conversion', { recordId: leadId }, { as: rep.token });
    const fields = (((started as Rec).screen ?? (started as Rec).output?.screen)?.fields ?? []) as Rec[];
    const prefilled: Rec = {};
    for (const f of fields) if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
    return { started, fields, prefilled };
  };

  /** What the conversion left for `who`, as counts. */
  const state = async (who: { company: string; email: string }, leadId: string) => {
    const out = await after(who, leadId);
    return {
      accounts: out.accounts.length, contacts: out.contacts.length, opportunities: out.opportunities.length,
      isConverted: Boolean(out.lead.is_converted), leadStatus: out.lead.status,
    };
  };

  // `null` is what the console posts untouched for a lead with no estimate
  // (the prefill), `''` a cleared box, and an absent key a caller that skips
  // the dialog.
  it.each([
    ['left empty (null)', { opportunityAmount: null }],
    ['cleared (blank)', { opportunityAmount: '' }],
    ['not posted', {}],
  ] as const)('amount %s: refused with nothing written, and the same run converts once it is given', async (_shape, amount) => {
    const who = identity();
    const lead = await qualifiedLead(who);
    const { started, fields, prefilled } = await start(lead.id);
    expect(prefilled.opportunityAmount ?? null, 'fixture: a lead with no estimate prefills no amount').toBeNull();

    const { opportunityAmount: _prefill, ...rest } = prefilled;
    const answers = { ...rest, createOpportunity: true, opportunityName: 'Deal' };
    const refused = await verify.flows.resume(started, { ...answers, ...amount }, { as: rep.token })
      .then(() => undefined, (e: unknown) => e as Rec);
    expect({ code: refused?.code, status: refused?.status, ...(await state(who, lead.id)) }).toEqual({
      code: 'INVALID_SCREEN_INPUT', status: 400,
      accounts: 0, contacts: 0, opportunities: 0, isConverted: false, leadStatus: 'qualified',
    });
    expect(String(refused?.message), 'the refusal names another field').toContain('"opportunityAmount"');
    // The console's half: the descriptor it renders marks the amount required.
    expect(fields.find((f) => f.name === 'opportunityAmount')?.required).toBe(true);

    const done = await verify.flows.resume(started, { ...answers, opportunityAmount: 25_000 }, { as: rep.token });
    expect(done.error ?? null).toBeNull();
    expect(await state(who, lead.id)).toEqual({
      accounts: 1, contacts: 1, opportunities: 1, isConverted: true, leadStatus: 'converted',
    });
    expect((await after(who, lead.id)).opportunities[0]!.amount).toBe(25_000);
  });

  it('control: a lead with an estimate converts with the box ticked and the prefilled amount untouched', async () => {
    const who = identity();
    const lead = await create('crm_lead', {
      company: who.company, email: who.email, first_name: 'Joe', last_name: 'Green',
      status: 'qualified', estimated_amount: 40_000,
    });
    const { started, prefilled } = await start(lead.id);
    expect(prefilled.opportunityAmount, 'the estimate no longer prefills the amount').toBe(40_000);

    const done = await verify.flows.resume(started, { ...prefilled, createOpportunity: true }, { as: rep.token });
    expect(done.error ?? null).toBeNull();
    expect(await state(who, lead.id)).toEqual({
      accounts: 1, contacts: 1, opportunities: 1, isConverted: true, leadStatus: 'converted',
    });
    expect((await after(who, lead.id)).opportunities[0]!.amount).toBe(40_000);
  });
});
