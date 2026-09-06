// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { makeFlowHarness, type FlowHarness, type Rec } from './helpers/flow-harness';
import { LeadConversionFlow } from '../src/flows/lead-conversion.flow';

/**
 * Flow runtime harness — executes the REAL lead_conversion flow through the
 * REAL AutomationEngine (node traversal, decision evaluation, {var}
 * interpolation, assignment convergence) against the SHARED in-memory data
 * engine in `test/helpers/flow-harness.ts`.
 *
 * This is the layer above the hook-runtime tests: it proves the FLOW GRAPH
 * behaves — specifically that the account + contact dedupe branches route and
 * converge correctly — not just that the nodes are wired. Runs in vitest/CI
 * (no server, no kernel), deterministically.
 *
 * This file used to carry its OWN copy of the data engine, matching rows with
 * `===` only and storing exactly the columns a row was written with (#1479).
 * Both halves of that copy were wrong in ways that pass silently: an operand
 * like `{ $gt: 0 }` is an object compared with `===` against a scalar, so every
 * range predicate selected nothing; and a column nobody wrote was ABSENT rather
 * than null, which is not the shape the shipped app's materialising driver
 * returns. The shared engine is measured against a real driver — see the header
 * of the harness for that measurement — so a filter that is wrong against real
 * rows now fails here instead of passing by accident.
 */

/**
 * Fold a name the way the producer hooks do (#626).
 *
 * This harness is built WITHOUT hooks (`makeFlowHarness`'s third argument is
 * left at its default) — it writes rows straight into the store — so the
 * fixtures have to carry the derived match keys that `lead_duplicate_check` and
 * `account_protection` stamp on every real write. Without them the flow's
 * account lookup has no value to filter on and `get_record` refuses to run.
 * The hook-owned columns themselves are exercised in
 * `test/account-name-normalized-match.test.ts`, which runs the real handlers
 * through this same harness's `hooks` option.
 */
const fold = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

const leadRow = (over: Rec = {}): Rec => {
  const company = (over.company as string) ?? 'Globex Industries';
  return {
    id: 'lead_1', company, company_normalized: fold(company),
    email: 'joe@globex.example.com',
    first_name: 'Joe', last_name: 'Green', phone: '555', title: 'Buyer',
    lead_source: 'web', is_converted: false, status: 'qualified', ...over,
  };
};

/** A harness seeded with the standard lead, plus whatever else a case needs. */
const makeConversion = (seed: Record<string, Rec[]> = {}): FlowHarness =>
  makeFlowHarness({ lead_conversion: LeadConversionFlow }, { crm_lead: [leadRow()], ...seed });

async function runConversion(
  h: FlowHarness,
  leadId: string,
  screen: Rec = { createOpportunity: true, opportunityName: 'Deal', opportunityAmount: 100000 },
) {
  const started: Rec = (await h.engine.execute('lead_conversion', {
    params: { recordId: leadId }, userId: 'user_1', event: 'manual',
  } as never)) as Rec;
  const runId: string = started.runId ?? started.run?.id;
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
  for (const f of ((started.screen ?? started.output?.screen)?.fields ?? []) as Rec[]) {
    if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
  }
  return h.resume(runId, { ...prefilled, ...screen });
}

describe('lead_conversion flow — runtime', () => {
  it('creates account + contact + opportunity for a brand-new lead', async () => {
    const h = makeConversion();
    await runConversion(h, 'lead_1');

    expect(h.store.crm_account?.length, 'one account created').toBe(1);
    expect(h.store.crm_contact?.length, 'one contact created').toBe(1);
    expect(h.store.crm_opportunity?.length, 'one opportunity created').toBe(1);
    const acct = h.store.crm_account[0];
    expect(acct.name).toBe('Globex Industries');
    // Contact + opportunity link to that account id.
    expect(h.store.crm_contact[0].crm_account).toBe(acct.id);
    expect(h.store.crm_opportunity[0].crm_account).toBe(acct.id);
    // Lead stamped converted.
    expect(h.store.crm_lead[0].is_converted).toBe(true);
    expect(h.store.crm_lead[0].status).toBe('converted');
  });

  it('REUSES an existing account with the same company (no duplicate)', async () => {
    const h = makeConversion({
      crm_account: [{
        id: 'acc_existing', name: 'Globex Industries',
        name_normalized: fold('Globex Industries'), is_active: true,
      }],
    });
    await runConversion(h, 'lead_1');

    expect(h.store.crm_account.length, 'no duplicate account').toBe(1);
    expect(h.store.crm_account[0].id).toBe('acc_existing');
    // The new contact + opportunity hang off the reused account.
    expect(h.store.crm_contact[0].crm_account).toBe('acc_existing');
    expect(h.store.crm_opportunity[0].crm_account).toBe('acc_existing');
  });

  it('REUSES an existing contact (same email in the account) — no duplicate', async () => {
    const h = makeConversion({
      crm_account: [{
        id: 'acc_existing', name: 'Globex Industries',
        name_normalized: fold('Globex Industries'), is_active: true,
      }],
      crm_contact: [{
        id: 'con_existing', email: 'joe@globex.example.com', crm_account: 'acc_existing',
        first_name: 'Joe', last_name: 'Green',
      }],
    });
    await runConversion(h, 'lead_1');

    expect(h.store.crm_account.length).toBe(1);
    expect(h.store.crm_contact.length, 'no duplicate contact').toBe(1);
    expect(h.store.crm_contact[0].id).toBe('con_existing');
    expect(h.store.crm_opportunity[0].primary_contact).toBe('con_existing');
  });

  it('skips opportunity creation when the screen says no', async () => {
    const h = makeConversion();
    await runConversion(h, 'lead_1', { createOpportunity: false });

    expect(h.store.crm_account.length).toBe(1);
    expect(h.store.crm_contact.length).toBe(1);
    expect(h.store.crm_opportunity?.length ?? 0, 'no opportunity').toBe(0);
    expect(h.store.crm_lead[0].is_converted).toBe(true);
  });
});
