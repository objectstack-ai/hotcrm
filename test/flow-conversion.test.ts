// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import { LeadConversionFlow } from '../src/flows/lead-conversion.flow';

/**
 * Flow runtime harness — executes the REAL lead_conversion flow through the
 * REAL AutomationEngine (node traversal, decision evaluation, {var}
 * interpolation, assignment convergence) against an in-memory data engine.
 *
 * This is the layer above the hook-runtime tests: it proves the FLOW GRAPH
 * behaves — specifically that the account + contact dedupe branches route and
 * converge correctly — not just that the nodes are wired. Runs in vitest/CI
 * (no server, no kernel), deterministically.
 */

type Rec = Record<string, any>;

/** In-memory data engine matching the CRUD node executors' call surface. */
function makeDataEngine() {
  const store: Record<string, Rec[]> = {};
  let seq = 0;
  const rows = (o: string) => (store[o] ??= []);
  const match = (r: Rec, where: Rec = {}) =>
    Object.entries(where).every(([k, v]) => r[k] === v);
  return {
    store,
    async insert(object: string, data: Rec) {
      const rec = { id: `${object}_${++seq}`, ...data };
      rows(object).push(rec);
      return rec;
    },
    async find(object: string, opts: Rec = {}) {
      return rows(object).filter((r) => match(r, opts.where ?? opts.filter ?? {}));
    },
    async findOne(object: string, opts: Rec = {}) {
      return rows(object).find((r) => match(r, opts.where ?? opts.filter ?? {})) ?? null;
    },
    async update(object: string, data: Rec, opts: Rec = {}) {
      const affected = rows(object).filter((r) => match(r, opts.where ?? opts.filter ?? {}));
      for (const r of affected) Object.assign(r, data);
      return { modified: affected.length };
    },
  };
}

const logger: any = {
  info() {}, warn() {}, error() {}, debug() {}, trace() {},
  child() { return logger; },
};

function buildEngine(data: ReturnType<typeof makeDataEngine>) {
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

const seedLead = (data: ReturnType<typeof makeDataEngine>, over: Rec = {}) => {
  const lead = {
    id: 'lead_1', company: 'Globex Industries', email: 'joe@globex.example.com',
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
    data.store.crm_account = [{ id: 'acc_existing', name: 'Globex Industries', is_active: true }];
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
    data.store.crm_account = [{ id: 'acc_existing', name: 'Globex Industries', is_active: true }];
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
