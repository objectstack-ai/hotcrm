// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import { LeadConversionFlow } from '../src/flows/lead-conversion.flow';
import { makeDataEngine, silentLogger as logger, type DataEngine, type Rec } from './helpers/flow-harness';

/**
 * Flow runtime harness — executes the REAL lead_conversion flow through the
 * REAL AutomationEngine (node traversal, decision evaluation, {var}
 * interpolation, assignment convergence) against an in-memory data engine.
 *
 * This is the layer above the hook-runtime tests: it proves the FLOW GRAPH
 * behaves — specifically that the account + contact dedupe branches route and
 * converge correctly — not just that the nodes are wired. Runs in vitest/CI
 * (no server, no kernel), deterministically.
 *
 * It says NOTHING about permissions: its store has none, so `insert` appends a
 * row for anybody. That blind spot is what let #1033 (a rep's conversion dying
 * on `crm_account.annual_revenue`'s FLS) stay invisible here for months — the
 * enforcement-stack half now lives in `test/flow-conversion-authority.test.ts`.
 *
 * The data engine is the SHARED one from `./helpers/flow-harness`. This file
 * used to carry its own copy, and that copy matched with `===` only — the exact
 * limitation the helper's docstring was written about. `get_lead` now filters
 * `is_converted: { $ne: true }`, and an equality-only store answers an operator
 * predicate with nothing, so every case here failed at the first data node.
 */

function buildEngine(data: DataEngine) {
  const ctx: any = {
    logger,
    getService: (name: string) =>
      name === 'data' || name === 'objectql' ? data : undefined,
  };
  const engine = new AutomationEngine(logger);
  installBuiltinNodes(engine, ctx);
  engine.registerFlow('lead_conversion', LeadConversionFlow);
  return engine;
}

async function runConversion(
  engine: AutomationEngine,
  leadId: string,
  screen: Rec = { createOpportunity: true, opportunityName: 'Deal', opportunityAmount: 100000 },
) {
  const started: any = await engine.execute('lead_conversion', {
    params: { recordId: leadId },
    userId: 'user_1',
    event: 'manual',
  } as any);
  // Screen flow pauses at screen_1; resume with the collected inputs.
  const runId = started.runId ?? started.run?.id;
  const resumed: any = await engine.resume(runId, { variables: screen } as any);
  return { started, resumed };
}

/**
 * Fold a name the way the producer hooks do (#626).
 *
 * This harness has no hooks — it writes rows straight into the store — so the
 * fixtures have to carry the derived match keys that `lead_duplicate_check` and
 * `account_protection` stamp on every real write. Without them the flow's
 * account lookup has no value to filter on and `get_record` refuses to run.
 * The hook-owned columns themselves are exercised in
 * `test/account-name-normalized-match.test.ts`, which runs the real handlers.
 */
const fold = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

const seedLead = (data: ReturnType<typeof makeDataEngine>, over: Rec = {}) => {
  const company = (over.company as string) ?? 'Globex Industries';
  const lead = {
    id: 'lead_1', company, company_normalized: fold(company),
    email: 'joe@globex.example.com',
    first_name: 'Joe', last_name: 'Green', phone: '555', title: 'Buyer',
    lead_source: 'web', is_converted: false, status: 'qualified', ...over,
  };
  data.store.crm_lead = [lead];
  return lead;
};

describe('lead_conversion flow — runtime', () => {
  it('creates account + contact + opportunity for a brand-new lead', async () => {
    const data = makeDataEngine();
    seedLead(data);
    const engine = buildEngine(data);
    await runConversion(engine, 'lead_1');

    expect(data.store.crm_account?.length, 'one account created').toBe(1);
    expect(data.store.crm_contact?.length, 'one contact created').toBe(1);
    expect(data.store.crm_opportunity?.length, 'one opportunity created').toBe(1);
    const acct = data.store.crm_account[0];
    expect(acct.name).toBe('Globex Industries');
    // Contact + opportunity link to that account id.
    expect(data.store.crm_contact[0].crm_account).toBe(acct.id);
    expect(data.store.crm_opportunity[0].crm_account).toBe(acct.id);
    // Lead stamped converted.
    expect(data.store.crm_lead[0].is_converted).toBe(true);
    expect(data.store.crm_lead[0].status).toBe('converted');
  });

  it('REUSES an existing account with the same company (no duplicate)', async () => {
    const data = makeDataEngine();
    seedLead(data);
    data.store.crm_account = [{
      id: 'acc_existing', name: 'Globex Industries',
      name_normalized: fold('Globex Industries'), is_active: true,
    }];
    const engine = buildEngine(data);
    await runConversion(engine, 'lead_1');

    expect(data.store.crm_account.length, 'no duplicate account').toBe(1);
    expect(data.store.crm_account[0].id).toBe('acc_existing');
    // The new contact + opportunity hang off the reused account.
    expect(data.store.crm_contact[0].crm_account).toBe('acc_existing');
    expect(data.store.crm_opportunity[0].crm_account).toBe('acc_existing');
  });

  it('REUSES an existing contact (same email in the account) — no duplicate', async () => {
    const data = makeDataEngine();
    seedLead(data);
    data.store.crm_account = [{
      id: 'acc_existing', name: 'Globex Industries',
      name_normalized: fold('Globex Industries'), is_active: true,
    }];
    data.store.crm_contact = [{
      id: 'con_existing', email: 'joe@globex.example.com', crm_account: 'acc_existing',
      first_name: 'Joe', last_name: 'Green',
    }];
    const engine = buildEngine(data);
    await runConversion(engine, 'lead_1');

    expect(data.store.crm_account.length).toBe(1);
    expect(data.store.crm_contact.length, 'no duplicate contact').toBe(1);
    expect(data.store.crm_contact[0].id).toBe('con_existing');
    expect(data.store.crm_opportunity[0].primary_contact).toBe('con_existing');
  });

  it('REFUSES a lead that is already converted, writing nothing (#1033)', async () => {
    // `get_lead` selects on `is_converted: { $ne: true }`, so a converted lead
    // resolves `leadRecord` to null and `find_account`'s templated condition
    // drops to nothing — which the engine refuses rather than running as an
    // unnarrowed query. Fail-closed is the whole point: the flow is
    // `runAs: 'system'`, so `lead.hook.ts`'s converted-lead lock (gated on
    // `ctx.user?.id`) does not fire, and without this the second run
    // cheerfully writes a duplicate opportunity and re-stamps the lead. The
    // enforcement-stack proof of that is in
    // `test/flow-conversion-authority.test.ts`; this case pins the graph half.
    const data = makeDataEngine();
    seedLead(data, { is_converted: true, status: 'converted' });
    const engine = buildEngine(data);
    const { resumed } = await runConversion(engine, 'lead_1');

    expect(resumed.success, 'a converted lead must not convert again').toBe(false);
    expect(String(resumed.error)).toContain('find_account');
    expect(data.store.crm_account?.length ?? 0, 'no account written').toBe(0);
    expect(data.store.crm_contact?.length ?? 0, 'no contact written').toBe(0);
    expect(data.store.crm_opportunity?.length ?? 0, 'no opportunity written').toBe(0);
  });

  it('an OPEN lead whose is_converted key is ABSENT still converts', async () => {
    // `$ne: true` and not `false`, because the predicate has to be TOTAL: a
    // driver that stores only the columns a row was written with hands the key
    // back ABSENT, and `is_converted: false` would then refuse to convert a
    // perfectly open lead. Same family as the `has()` rule in AGENTS.md.
    const data = makeDataEngine();
    const lead = seedLead(data);
    delete (lead as Rec).is_converted;
    const engine = buildEngine(data);
    await runConversion(engine, 'lead_1');

    expect(data.store.crm_account?.length, 'the absent key blocked a legitimate conversion').toBe(1);
    expect(data.store.crm_lead[0].is_converted).toBe(true);
  });

  it('skips opportunity creation when the screen says no', async () => {
    const data = makeDataEngine();
    seedLead(data);
    const engine = buildEngine(data);
    await runConversion(engine, 'lead_1', { createOpportunity: false });

    expect(data.store.crm_account.length).toBe(1);
    expect(data.store.crm_contact.length).toBe(1);
    expect(data.store.crm_opportunity?.length ?? 0, 'no opportunity').toBe(0);
    expect(data.store.crm_lead[0].is_converted).toBe(true);
  });
});
