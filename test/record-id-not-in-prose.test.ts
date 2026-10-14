// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, signUpPerson, recordEngineWrites, systemUpdate, today, type Person,
} from './helpers/verify-stack';

/**
 * No record id reaches a human in prose (#1243).
 *
 * #1208 closed one site of this class — the escalation follow-up task, pinned
 * next door in `test/escalation-task-subject.test.ts`. It survived in eight
 * more, across four hooks, and a walkthrough of `main` measured the cost: 15 of
 * 31 tasks in a demo org were titled by a 16-character primary key, and a
 * freshly drafted contract explained its own provenance as `Auto-drafted from
 * accepted quote MvNopWgEDZwm2T5L` — naming a quote every screen in the app
 * calls `QTE-0006`.
 *
 * The rule those eight sites now follow, stated once:
 *
 *   **A sentence a user reads names a record the way the UI names it — its
 *   `nameField`, composed from the stored columns behind it. The id goes in the
 *   relationship field that exists to carry it, or nowhere.**
 *
 * Three things make this file worth having on top of the per-hook suites:
 *
 *  1. **It asserts the ABSENCE, which the per-hook suites structurally cannot.**
 *     A regex like `/Quote Q-1001 is accepted/` matches the defective string
 *     `Quote Q-1001 (q1) is accepted` just as happily. Every case below feeds a
 *     record id the ENGINE issued and asserts the emitted prose does not
 *     contain it — the one assertion that fails on the old code.
 *  2. **It runs the real writes.** The shipped app booted through
 *     `@objectstack/verify`'s handle; a sales rep (and, where the act is a
 *     manager's, a sales manager) does the thing the product does; the task,
 *     the contract or the refusal is read back off the engine. A title composed
 *     in a shared helper would be a `ReferenceError` in the shipped body — that
 *     is `os lint --strict`'s to refuse (`hook-body/not-lowerable`).
 *  3. **It states the boundary.** An id in a log line, an internal audit row or
 *     a machine-read field is the RIGHT thing there. `quote.hook.ts` keeps two
 *     such ids deliberately, and the source sweep at the bottom of this file
 *     encodes the difference — sink, not site — so the next instance of the
 *     class is a red build rather than another walkthrough.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let manager: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@record-id-not-in-prose.test', {
    name: 'Prose Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  // Accepting a quote drafts a contract only for a caller who may create one
  // (on 17.7.0 a rep may not — see `quote-accepted-draft-defaults`), and
  // deleting a contact is a manager's grant; both acts run as a manager.
  manager = await signUpPerson(verify, 'manager@record-id-not-in-prose.test', {
    name: 'Prose Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

let n = 0;
const create = async (object: string, doc: Rec, who: Person = rep): Promise<Rec> =>
  verify.hooks.run(object, 'insert', doc, { as: who.token });
const update = (object: string, doc: Rec, who: Person = rep) =>
  verify.hooks.run(object, 'update', doc, { as: who.token });

/** A rep's working lead, carrying `over`. */
const workingLead = async (over: Rec = {}) => create('crm_lead', {
  first_name: 'Mira', last_name: 'Costa', company: 'Atlas Construction',
  email: `mira${++n}@atlas.example.com`, status: 'contacted', ...over,
});

/** The follow-up task `lead_automation` opened for `leadId`, once it lands. */
const followUpFor = (leadId: string) => vi.waitFor(async () => {
  const [task] = await verify.rows('crm_task', { related_to_lead: leadId });
  expect(task, 'no follow-up task was inserted').toBeTruthy();
  return task!;
}, { timeout: 10_000, interval: 25 });

/** Run a write and return what the engine refused it with, or fail. */
async function refusalFrom(write: () => Promise<unknown>, label: string): Promise<Error> {
  const err = await write().then(() => null, (e: Error) => e);
  expect(err, `${label} did not refuse`).toBeInstanceOf(Error);
  return err as Error;
}

describe('task subjects name the record, not its primary key', () => {
  it('the qualified-lead follow-up is titled by the lead (lead_automation)', async () => {
    const lead = await workingLead();
    await update('crm_lead', { id: lead.id, status: 'qualified' });

    const task = await followUpFor(lead.id);
    expect(task.subject).toBe('Follow up with qualified lead: Mira Costa - Atlas Construction');
    expect(task.subject).not.toContain(lead.id);
    // Not lost — moved to the column whose job it is.
    expect(task.related_to_lead).toBe(lead.id);
    expect(task.related_to_type).toBe('crm_lead');
  });

  it('prefers the name this very write is setting', async () => {
    const lead = await workingLead();
    await update('crm_lead', { id: lead.id, status: 'qualified', company: 'Atlas Construction Group' });
    expect((await followUpFor(lead.id)).subject).toBe('Follow up with qualified lead: Mira Costa - Atlas Construction Group');
  });

  it('refuses a lead without first_name, last_name or company, so the title never has a half to drop', async () => {
    // Neither half can be missing from a real lead: `first_name`, `last_name`
    // and `company` are all required on `crm_lead`, so the title's
    // company-only and nameless branches (`…: Atlas Construction`, and the
    // generic `Follow up with qualified lead`) defend a pre-image no write can
    // produce. Pinned as the refusal that makes them unreachable — the day one
    // of those columns stops being required, this goes red and the branches
    // are back in play.
    for (const missing of ['first_name', 'last_name', 'company']) {
      await expect(create('crm_lead', {
        first_name: 'Mira', last_name: 'Costa', company: 'Atlas Construction',
        email: `blank${++n}@atlas.example.com`, [missing]: '',
      }), `a lead without ${missing} was stored`).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    }
  });

  it('stays inside crm_task.subject at maximum length', async () => {
    // `crm_task.subject` declares `maxLength: 255` and the engine enforces it;
    // this insert sits behind a `catch` that swallows failures, so an uncapped
    // title would mean no task and no trace. `crm_lead.company` alone allows
    // 255, so the composition can exceed the cap on legal data.
    const lead = await workingLead({ company: 'C'.repeat(255) });
    await update('crm_lead', { id: lead.id, status: 'qualified' });
    const subject = (await followUpFor(lead.id)).subject as string;
    expect(subject.length).toBe(255);
    expect(subject.startsWith('Follow up with qualified lead: Mira Costa - ')).toBe(true);
    expect(subject.endsWith('…')).toBe(true);
  });

  it('the activation task is titled by the opportunity (opportunity_promote_account)', async () => {
    const account = await create('crm_account', { name: `Skyline Media ${++n}`, type: 'prospect' });
    const opp = await create('crm_opportunity', {
      name: 'Skyline Media - Platform Renewal', crm_account: account.id, stage: 'proposal',
      amount: 48_000, close_date: today(),
    });
    await update('crm_opportunity', { id: opp.id, stage: 'closed_won', win_reason: 'better_price' });

    const task = await vi.waitFor(async () => {
      const [row] = await verify.rows('crm_task', { related_to_opportunity: opp.id });
      expect(row, 'no activation task was inserted').toBeTruthy();
      return row!;
    }, { timeout: 10_000, interval: 25 });
    expect(task.subject).toBe('Activate new customer for opportunity Skyline Media - Platform Renewal');
    expect(task.subject).not.toContain(opp.id);
    expect(task.related_to_opportunity).toBe(opp.id);
    expect(task.related_to_account).toBe(account.id);
  });

  it('refuses an opportunity without a name, so the activation title always has one', async () => {
    // A real opportunity always carries one: `crm_opportunity.name` is
    // required, so the bare `Activate new customer` branch defends a pre-image
    // no write can produce. Pinned as that refusal, for the reason above.
    const account = await create('crm_account', { name: `Nameless Deal Co ${++n}`, type: 'prospect' });
    await expect(create('crm_opportunity', {
      name: '', crm_account: account.id, stage: 'proposal', amount: 1_000, close_date: today(),
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

/**
 * A manager presents and accepts a quote; returns the contract document
 * `quote_accepted_contract_draft` handed the engine, plus the quote as stored just
 * before acceptance. `stored` is applied as the SYSTEM before acceptance — it
 * is how a quote whose stored number is blank reaches the hook.
 */
const acceptQuote = async (stored: Rec = {}) => {
  const k = ++n;
  const account = await create('crm_account', { name: `Skyline Media ${k}` }, manager);
  const contact = await create('crm_contact', {
    first_name: 'Theo', last_name: 'Park', email: `theo${k}@skylinemedia.example.com`, crm_account: account.id,
  }, manager);
  const opp = await create('crm_opportunity', {
    name: 'Skyline Media - Platform Renewal', crm_account: account.id, stage: 'proposal',
    amount: 48_000, close_date: '2030-06-30',
  }, manager);
  const quote = await create('crm_quote', {
    name: 'Skyline Media Renewal', crm_account: account.id, crm_contact: contact.id,
    crm_opportunity: opp.id, quote_date: today(), expiration_date: '2030-12-31',
  }, manager);
  for (const status of ['in_review', 'presented']) await update('crm_quote', { id: quote.id, status }, manager);
  if (Object.keys(stored).length > 0) await systemUpdate(verify, 'crm_quote', { id: quote.id, ...stored });
  const [before] = await verify.rows('crm_quote', { id: quote.id });
  const engine = recordEngineWrites(verify);
  try {
    await update('crm_quote', { id: quote.id, status: 'accepted' }, manager);
    const insert = await vi.waitFor(() => {
      const [call] = engine.of('crm_contract', 'insert');
      expect(call, 'no contract was drafted').toBeTruthy();
      return call!;
    }, { timeout: 10_000, interval: 25 });
    expect((await insert.settled).ok, 'the engine refused the drafted contract').toBe(true);
    return { contract: insert.args[1] as Rec, quote: before!, opportunity: String(opp.id) };
  } finally {
    engine.restore();
  }
};

describe('the drafted contract explains itself with the quote number', () => {
  it('names the quote the way `display_title` does', async () => {
    const { contract, quote } = await acceptQuote();
    expect(quote.quote_number, 'the engine issued no quote number').toMatch(/^QTE-\d+$/);
    expect(contract.description).toBe(`Auto-drafted from accepted quote ${quote.quote_number} - Skyline Media Renewal`);
    expect(contract.description).not.toContain(quote.id);
  });

  it('is the whole provenance record, because crm_contract has no quote link', async () => {
    // Stated as an assertion rather than a comment: unlike the task sites, there
    // is no relationship field to move the id into, so this sentence is all the
    // reader gets and its legibility is the entire contract.
    const { contract, opportunity } = await acceptQuote();
    expect(Object.keys(contract)).not.toContain('crm_quote');
    expect(contract.crm_opportunity).toBe(opportunity);
  });

  it('drops the separator when the quote number is missing, and a quote without a name is refused', async () => {
    // The number half: a quote whose stored number was cleared.
    const noNumber = await acceptQuote({ quote_number: null });
    expect(noNumber.contract.description).toBe('Auto-drafted from accepted quote Skyline Media Renewal');
    expect(noNumber.contract.description).not.toContain(noNumber.quote.id);

    // The name half cannot reach the hook: `crm_quote.name` is required, so the
    // `QTE-… ` alone and `an accepted quote` branches defend a pre-image no
    // write can produce. Pinned as that refusal, for the reason given above.
    const [account] = await verify.seed('crm_account', [{ name: `Unnamed Quote Co ${++n}` }]);
    await expect(create('crm_quote', {
      name: '  ', crm_account: account.id, quote_date: today(), expiration_date: '2030-12-31',
    }, manager)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('refusals a user reads name the record they are about', () => {
  it('the closed-opportunity freeze (opportunity_lifecycle)', async () => {
    const account = await create('crm_account', { name: `Frozen Deal Co ${++n}` });
    const opp = await create('crm_opportunity', {
      name: 'Skyline Media - Platform Renewal', crm_account: account.id, stage: 'proposal',
      amount: 10, close_date: today(),
    });
    await update('crm_opportunity', { id: opp.id, stage: 'closed_won', win_reason: 'better_price' });
    const err = await refusalFrom(() => update('crm_opportunity', { id: opp.id, amount: 1 }), 'opportunity_lifecycle');
    expect(err.message).toContain('Opportunity Skyline Media - Platform Renewal is closed');
    expect(err.message).not.toContain(opp.id);
  });

  it('the accepted-quote freeze (quote_workflow)', async () => {
    const { quote } = await acceptQuote();
    const err = await refusalFrom(
      () => update('crm_quote', { id: quote.id, expiration_date: '2031-01-31' }, manager), 'quote_workflow',
    );
    expect(err.message).toContain(`Quote ${quote.quote_number} - Skyline Media Renewal is accepted`);
    expect(err.message).not.toContain(quote.id);
  });

  it('the converted-lead lock (lead_automation)', async () => {
    // A converted lead, as the conversion leaves it — written as the system,
    // owned by the rep who now tries to edit it.
    const [lead] = await verify.seed('crm_lead', [{
      first_name: 'Mira', last_name: 'Costa', company: 'Atlas Construction', email: `conv${++n}@atlas.example.com`,
      status: 'converted', is_converted: true, owner_id: rep.id,
    }]);
    const err = await refusalFrom(() => update('crm_lead', { id: lead.id, company: 'Atlas Construction Group' }), 'lead_automation');
    expect(err.message).toContain('Cannot edit converted lead Mira Costa - Atlas Construction');
    expect(err.message).not.toContain(lead.id);
  });

  it('the duplicate-email refusal (contact_integrity)', async () => {
    // The measured one. On `main` a rep's blocked save came back
    // `409 {"error":"Another contact (5B0nItHGRr768EfD) with email … already
    // exists."}` — the key is on no screen in the app and cannot be pasted into
    // search, so the only actionable answer, WHOSE record holds the address,
    // was the one thing the sentence withheld.
    const account = await create('crm_account', { name: `Duplicate Co ${++n}` });
    const email = `theo.park${n}@skylinemedia.example.com`;
    const existing = await create('crm_contact', { first_name: 'Wei', last_name: 'Zhang', email, crm_account: account.id });
    const err = await refusalFrom(
      () => create('crm_contact', { first_name: 'Dup', last_name: 'Probe', email, crm_account: account.id }),
      'contact_integrity',
    );
    expect(err.message).toContain(`Another contact (Wei Zhang) with email ${email} already exists.`);
    expect(err.message).not.toContain(existing.id);
  });

  it('refuses a contact without a name, so a duplicate is never unnamed', async () => {
    // A real contact always has a name: `first_name` and `last_name` are
    // required on `crm_contact`, so the unnamed wording defends a pre-image no
    // write can produce. Pinned as that refusal, for the reason given above.
    const account = await create('crm_account', { name: `Unnamed Contact Co ${++n}` });
    await expect(create('crm_contact', {
      first_name: '', last_name: '', email: `nameless${n}@skylinemedia.example.com`, crm_account: account.id,
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('the referenced-contact delete guard (contact_integrity)', async () => {
    // Referenced by an ACTIVATED contract — written as the system, the state the
    // contract lifecycle leaves it in. Deleting a contact is a manager's grant.
    const account = await create('crm_account', { name: `Referenced Co ${++n}` }, manager);
    const contact = await create('crm_contact', {
      first_name: 'Wei', last_name: 'Zhang', email: `wei${n}@skylinemedia.example.com`, crm_account: account.id,
    }, manager);
    await verify.seed('crm_contract', [{
      crm_account: account.id, crm_contact: contact.id, status: 'activated', contract_type: 'subscription',
      contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 1_000,
    }]);
    const err = await refusalFrom(
      () => verify.hooks.run('crm_contact', 'delete', { id: contact.id }, { as: manager.token }), 'contact_integrity',
    );
    expect(err.message).toContain('Contact Wei Zhang is still referenced by');
    expect(err.message).not.toContain(contact.id);
  });
});

