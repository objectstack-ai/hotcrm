// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

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
) {
  const started = await verify.flows.run('lead_conversion', { recordId: leadId }, { as: rep.token });
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
  return verify.flows.resume(started, { ...prefilled, ...screen }, { as: rep.token });
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
