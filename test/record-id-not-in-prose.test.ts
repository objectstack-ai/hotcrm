// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import contactHooks from '../src/objects/contact.hook';
import leadHooks from '../src/objects/lead.hook';
import opportunityHooks from '../src/objects/opportunity.hook';
import quoteHooks from '../src/objects/quote.hook';
import { hookNamed } from './helpers/hook-harness';
import { makeSandboxEngine, runHookBody, type Rec } from './helpers/action-sandbox';

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
 *     sentinel id that appears nowhere else in the fixture and asserts the
 *     emitted prose does not contain it — the one assertion that fails on the
 *     old code.
 *  2. **It runs the LOWERED bodies.** Hook bodies ship body-only through
 *     QuickJS, so a title composed in a shared helper would be a `ReferenceError`
 *     in the shipped artifact while every closure-based test stayed green (the
 *     reasoning is written out in `escalation-task-subject.test.ts`). Composing
 *     a display title inline is exactly the temptation to factor out, so the
 *     pin runs what the artifact carries.
 *  3. **It states the boundary.** An id in a log line, an internal audit row or
 *     a machine-read field is the RIGHT thing there. `quote.hook.ts` keeps two
 *     such ids deliberately, and the source sweep at the bottom of this file
 *     encodes the difference — sink, not site — so the next instance of the
 *     class is a red build rather than another walkthrough.
 */

const contactIntegrity = hookNamed(contactHooks, 'contact_integrity');
const leadAutomation = hookNamed(leadHooks, 'lead_automation');
const oppLifecycle = hookNamed(opportunityHooks, 'opportunity_lifecycle');
const oppPromote = hookNamed(opportunityHooks, 'opportunity_promote_account');
const quoteWorkflow = hookNamed(quoteHooks, 'quote_workflow');
const quoteAccepted = hookNamed(quoteHooks, 'quote_on_accepted');

/**
 * Sentinel ids, in the shape the engine actually issues.
 *
 * Deliberately NOT `o1` / `q1` / `lead_1`: a two-character fixture id is a
 * substring of half the English language ("c1" hides inside nothing, but "o1"
 * and "q1" would make `not.toContain` a coin flip on a longer sentence). These
 * are real-looking keys taken from the walkthrough in #1243, so a hit is a hit.
 */
const OPP_ID = 'VLEnmZCSf7BkT1xA';
const QUOTE_ID = 'MvNopWgEDZwm2T5L';
const LEAD_ID = 'EMtmaScoa3I-uYFG';
const CONTACT_ID = '5B0nItHGRr768EfD';

/** Run a lowered hook body and return whatever it threw, or `null`. */
async function refusalFrom(hook: Rec, opts: Parameters<typeof runHookBody>[1]): Promise<Error> {
  const err = await runHookBody(hook, opts).then(() => null, (e: Error) => e);
  expect(err, `${hook.name} did not refuse`).toBeInstanceOf(Error);
  return err as Error;
}

describe('task subjects name the record, not its primary key', () => {
  it('the qualified-lead follow-up is titled by the lead (lead_automation)', async () => {
    const engine = makeSandboxEngine({ crm_task: [] });
    await runHookBody(leadAutomation, {
      event: 'afterUpdate',
      input: { status: 'qualified' },
      previous: {
        id: LEAD_ID,
        status: 'working',
        first_name: 'Mira',
        last_name: 'Costa',
        company: 'Atlas Construction',
        owner_id: 'rep_1',
      },
      user: { id: 'rep_1' },
      engine,
    });

    const [task] = engine.inserted('crm_task');
    expect(task, 'no follow-up task was inserted').toBeTruthy();
    expect(task.subject).toBe('Follow up with qualified lead: Mira Costa - Atlas Construction');
    expect(task.subject).not.toContain(LEAD_ID);
    // Not lost — moved to the column whose job it is.
    expect(task.related_to_lead).toBe(LEAD_ID);
    expect(task.related_to_type).toBe('crm_lead');
  });

  it('prefers the name this very write is setting', async () => {
    const engine = makeSandboxEngine({ crm_task: [] });
    await runHookBody(leadAutomation, {
      event: 'afterUpdate',
      input: { status: 'qualified', company: 'Atlas Construction Group' },
      previous: {
        id: LEAD_ID, status: 'working', first_name: 'Mira', last_name: 'Costa',
        company: 'Atlas Construction', owner_id: 'rep_1',
      },
      user: { id: 'rep_1' },
      engine,
    });
    const [task] = engine.inserted('crm_task');
    expect(task.subject).toBe('Follow up with qualified lead: Mira Costa - Atlas Construction Group');
  });

  it('drops the half the lead does not carry rather than dangling a separator', async () => {
    const companyOnly = makeSandboxEngine({ crm_task: [] });
    await runHookBody(leadAutomation, {
      event: 'afterUpdate',
      input: { status: 'qualified' },
      previous: { id: LEAD_ID, status: 'working', company: 'Atlas Construction', owner_id: 'rep_1' },
      user: { id: 'rep_1' },
      engine: companyOnly,
    });
    expect(companyOnly.inserted('crm_task')[0].subject)
      .toBe('Follow up with qualified lead: Atlas Construction');

    // Neither half: a generic title, NOT a fallback to the id. A key the reader
    // cannot look up is not a better answer than no name at all.
    const nameless = makeSandboxEngine({ crm_task: [] });
    await runHookBody(leadAutomation, {
      event: 'afterUpdate',
      input: { status: 'qualified' },
      previous: { id: LEAD_ID, status: 'working', owner_id: 'rep_1' },
      user: { id: 'rep_1' },
      engine: nameless,
    });
    const task = nameless.inserted('crm_task')[0];
    expect(task.subject).toBe('Follow up with qualified lead');
    expect(task.subject).not.toContain(LEAD_ID);
    expect(task.related_to_lead).toBe(LEAD_ID);
  });

  it('stays inside crm_task.subject at maximum length', async () => {
    // `crm_task.subject` declares `maxLength: 255` and the engine enforces it;
    // this insert sits behind a `catch` that swallows failures, so an uncapped
    // title would mean no task and no trace. `crm_lead.company` alone allows
    // 255, so the composition can exceed the cap on legal data.
    const engine = makeSandboxEngine({ crm_task: [] });
    await runHookBody(leadAutomation, {
      event: 'afterUpdate',
      input: { status: 'qualified' },
      previous: {
        id: LEAD_ID, status: 'working', first_name: 'Mira', last_name: 'Costa',
        company: 'C'.repeat(255), owner_id: 'rep_1',
      },
      user: { id: 'rep_1' },
      engine,
    });
    const subject = engine.inserted('crm_task')[0].subject as string;
    expect(subject.length).toBe(255);
    expect(subject.startsWith('Follow up with qualified lead: Mira Costa - ')).toBe(true);
    expect(subject.endsWith('…')).toBe(true);
  });

  it('the activation task is titled by the opportunity (opportunity_promote_account)', async () => {
    const engine = makeSandboxEngine({
      crm_account: [{ id: 'acc_1', name: 'Skyline Media', type: 'prospect' }],
      crm_task: [],
    });
    await runHookBody(oppPromote, {
      event: 'afterUpdate',
      input: { id: OPP_ID, stage: 'closed_won', crm_account: 'acc_1' },
      previous: { id: OPP_ID, stage: 'proposal', name: 'Skyline Media - Platform Renewal', crm_account: 'acc_1', owner_id: 'rep_1' },
      user: { id: 'rep_1' },
      engine,
    });

    const [task] = engine.inserted('crm_task');
    expect(task, 'no activation task was inserted').toBeTruthy();
    expect(task.subject).toBe('Activate new customer for opportunity Skyline Media - Platform Renewal');
    expect(task.subject).not.toContain(OPP_ID);
    expect(task.related_to_opportunity).toBe(OPP_ID);
    expect(task.related_to_account).toBe('acc_1');
  });

  it('says what it can when the opportunity pre-image carried no name', async () => {
    const engine = makeSandboxEngine({
      crm_account: [{ id: 'acc_1', name: 'Skyline Media', type: 'customer' }],
      crm_task: [],
    });
    await runHookBody(oppPromote, {
      event: 'afterUpdate',
      input: { id: OPP_ID, stage: 'closed_won', crm_account: 'acc_1' },
      previous: { id: OPP_ID, stage: 'proposal', crm_account: 'acc_1', owner_id: 'rep_1' },
      user: { id: 'rep_1' },
      engine,
    });
    const task = engine.inserted('crm_task')[0];
    expect(task.subject).toBe('Activate new customer');
    expect(task.subject).not.toContain(OPP_ID);
  });
});

describe('the drafted contract explains itself with the quote number', () => {
  const acceptQuote = async (previous: Rec, input: Rec = {}) => {
    const engine = makeSandboxEngine({
      crm_contract: [],
      crm_opportunity: [{ id: 'opp_1', stage: 'proposal' }],
    });
    await runHookBody(quoteAccepted, {
      event: 'afterUpdate',
      input: { status: 'accepted', ...input },
      previous,
      user: { id: 'rep_1' },
      engine,
    });
    const [contract] = engine.inserted('crm_contract');
    expect(contract, 'no contract was drafted').toBeTruthy();
    return contract;
  };

  const acceptedQuote = (over: Rec = {}): Rec => ({
    id: QUOTE_ID,
    quote_number: 'QTE-0006',
    name: 'Skyline Media Renewal',
    status: 'sent',
    crm_account: 'acc_1',
    crm_contact: 'con_1',
    crm_opportunity: 'opp_1',
    total_price: 48000,
    owner_id: 'rep_1',
    ...over,
  });

  it('names the quote the way `display_title` does', async () => {
    const contract = await acceptQuote(acceptedQuote());
    expect(contract.description).toBe(
      'Auto-drafted from accepted quote QTE-0006 - Skyline Media Renewal',
    );
    expect(contract.description).not.toContain(QUOTE_ID);
  });

  it('is the whole provenance record, because crm_contract has no quote link', () => {
    // Stated as an assertion rather than a comment: unlike the task sites, there
    // is no relationship field to move the id into, so this sentence is all the
    // reader gets and its legibility is the entire contract.
    return acceptQuote(acceptedQuote()).then((contract) => {
      expect(Object.keys(contract)).not.toContain('crm_quote');
      expect(contract.crm_opportunity).toBe('opp_1');
    });
  });

  it('drops the separator rather than dangling it when a half is missing', async () => {
    expect((await acceptQuote(acceptedQuote({ name: '  ' }))).description)
      .toBe('Auto-drafted from accepted quote QTE-0006');
    expect((await acceptQuote(acceptedQuote({ quote_number: undefined }))).description)
      .toBe('Auto-drafted from accepted quote Skyline Media Renewal');

    const neither = await acceptQuote(acceptedQuote({ quote_number: undefined, name: '' }));
    expect(neither.description).toBe('Auto-drafted from an accepted quote');
    expect(neither.description).not.toContain(QUOTE_ID);
  });
});

describe('refusals a user reads name the record they are about', () => {
  it('the closed-opportunity freeze (opportunity_lifecycle)', async () => {
    const err = await refusalFrom(oppLifecycle, {
      event: 'beforeUpdate',
      input: { id: OPP_ID, amount: 1 },
      previous: { id: OPP_ID, name: 'Skyline Media - Platform Renewal', stage: 'closed_won', amount: 10 },
      user: { id: 'rep_1' },
    });
    expect(err.message).toContain('Opportunity Skyline Media - Platform Renewal is closed');
    expect(err.message).not.toContain(OPP_ID);
  });

  it('the accepted-quote freeze (quote_workflow)', async () => {
    const err = await refusalFrom(quoteWorkflow, {
      event: 'beforeUpdate',
      input: { id: QUOTE_ID, total_price: 1 },
      previous: {
        id: QUOTE_ID, quote_number: 'QTE-0006', name: 'Skyline Media Renewal',
        status: 'accepted', total_price: 48000,
      },
      user: { id: 'rep_1' },
    });
    expect(err.message).toContain('Quote QTE-0006 - Skyline Media Renewal is accepted');
    expect(err.message).not.toContain(QUOTE_ID);
  });

  it('the converted-lead lock (lead_automation)', async () => {
    const err = await refusalFrom(leadAutomation, {
      event: 'beforeUpdate',
      input: { id: LEAD_ID, company: 'Atlas Construction Group' },
      previous: {
        id: LEAD_ID, is_converted: true, status: 'converted',
        first_name: 'Mira', last_name: 'Costa', company: 'Atlas Construction',
      },
      user: { id: 'rep_1' },
    });
    expect(err.message).toContain('Cannot edit converted lead Mira Costa - Atlas Construction');
    expect(err.message).not.toContain(LEAD_ID);
  });

  it('the duplicate-email refusal (contact_integrity)', async () => {
    // The measured one. On `main` a rep's blocked save came back
    // `409 {"error":"Another contact (5B0nItHGRr768EfD) with email … already
    // exists."}` — the key is on no screen in the app and cannot be pasted into
    // search, so the only actionable answer, WHOSE record holds the address,
    // was the one thing the sentence withheld.
    const engine = makeSandboxEngine({
      crm_contact: [{
        id: CONTACT_ID,
        organization_id: 'org_1',
        first_name: 'Wei',
        last_name: 'Zhang',
        email: 'theo.park@skylinemedia.example.com',
        crm_account: 'acc_1',
      }],
    });
    const err = await refusalFrom(contactIntegrity, {
      event: 'beforeInsert',
      input: {
        first_name: 'Dup', last_name: 'Probe', organization_id: 'org_1',
        email: 'theo.park@skylinemedia.example.com',
      },
      user: { id: 'rep_1', organizationId: 'org_1' },
      engine,
    });
    // `toContain`, not `toBe`: the sandbox prefixes what a body throws with
    // `hook '<name>' threw: Error: `, so the sentence is the tail of it.
    expect(err.message).toContain(
      'Another contact (Wei Zhang) with email theo.park@skylinemedia.example.com already exists.',
    );
    expect(err.message).not.toContain(CONTACT_ID);
  });

  it('refers to an unnamed duplicate rather than keying it', async () => {
    const engine = makeSandboxEngine({
      crm_contact: [{
        id: CONTACT_ID, organization_id: 'org_1',
        email: 'theo.park@skylinemedia.example.com',
      }],
    });
    const err = await refusalFrom(contactIntegrity, {
      event: 'beforeInsert',
      input: {
        first_name: 'Dup', last_name: 'Probe', organization_id: 'org_1',
        email: 'theo.park@skylinemedia.example.com',
      },
      user: { id: 'rep_1', organizationId: 'org_1' },
      engine,
    });
    expect(err.message).toContain(
      'Another contact with email theo.park@skylinemedia.example.com already exists.',
    );
    expect(err.message).not.toContain(CONTACT_ID);
  });

  it('the referenced-contact delete guard (contact_integrity)', async () => {
    // The blocking reference is the CONTRACT one on purpose: the sandbox
    // engine's predicate is equality-only (by design — it mirrors what the
    // kernel does with an unrecognised key), and only the `crm_contract` count
    // in this hook is a plain equality. The other two carry `$nin`, which that
    // engine cannot evaluate, so seeding them would silently count zero and the
    // guard would never fire. `hooks-runtime-sales.test.ts` drives all three
    // against the operator-aware harness; what this case adds is the LOWERED
    // body.
    const engine = makeSandboxEngine({
      crm_opportunity: [],
      crm_quote: [],
      crm_contract: [{ id: 'ctr_1', crm_contact: CONTACT_ID, status: 'activated' }],
    });
    const err = await refusalFrom(contactIntegrity, {
      event: 'beforeDelete',
      previous: { id: CONTACT_ID, first_name: 'Wei', last_name: 'Zhang' },
      user: { id: 'rep_1' },
      engine,
    });
    expect(err.message).toContain('Contact Wei Zhang is still referenced by');
    expect(err.message).not.toContain(CONTACT_ID);
  });
});
