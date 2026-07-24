// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { AutomationEngine, installBuiltinNodes } from '@objectstack/service-automation';
import { QuoteGenerationFlow } from '../src/flows/quote-generation.flow';

/**
 * quote_generation flow runtime harness — runs the REAL automation engine
 * against an in-memory data engine (same recipe as flow-conversion.test.ts).
 *
 * Guards the P0 CPQ fix: the flow's `recordId` input contract, the priced
 * create_quote (subtotal / discount_amount / total from the opportunity), the
 * account/contact carry-over, the stage → proposal advance, and that a
 * contact-LESS opportunity can still draft a quote (crm_quote.crm_contact was
 * relaxed to optional).
 */

type Rec = Record<string, any>;

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

const logger: any = { info() {}, warn() {}, error() {}, debug() {}, trace() {}, child() { return logger; } };

function buildEngine(data: ReturnType<typeof makeDataEngine>) {
  const ctx: any = {
    logger,
    getService: (name: string) => (name === 'data' || name === 'objectql' ? data : undefined),
  };
  const engine = new AutomationEngine(logger);
  installBuiltinNodes(engine, ctx);
  engine.registerFlow('quote_generation', QuoteGenerationFlow);
  return engine;
}

async function runQuote(engine: AutomationEngine, oppId: string, screen: Rec) {
  const started: any = await engine.execute('quote_generation', {
    params: { recordId: oppId }, userId: 'user_1', event: 'manual',
  } as any);
  const runId = started.runId ?? started.run?.id;
  await engine.resume(runId, { variables: screen } as any);
}

describe('quote_generation flow — runtime', () => {
  it('prices the quote from the opportunity and advances the stage to proposal', async () => {
    const data = makeDataEngine();
    data.store.crm_opportunity = [{
      id: 'opp_1', name: 'Globex Deal', amount: 200000,
      crm_account: 'acc_1', primary_contact: 'con_1', stage: 'qualification',
    }];
    const engine = buildEngine(data);
    await runQuote(engine, 'opp_1', { quoteName: 'Q-1', expirationDays: 30, discount: 10 });

    expect(data.store.crm_quote?.length, 'one quote created').toBe(1);
    const q = data.store.crm_quote[0];
    expect(q.name).toBe('Q-1');
    expect(q.crm_opportunity).toBe('opp_1');
    expect(q.crm_account).toBe('acc_1');
    expect(q.crm_contact).toBe('con_1');
    expect(q.status).toBe('draft');
    // Pricing: subtotal = amount; 10% off → discount_amount 20000, total 180000.
    expect(q.subtotal).toBe(200000);
    expect(q.discount_amount).toBe(20000);
    expect(q.total_price).toBe(180000);
    // Opportunity advanced.
    expect(data.store.crm_opportunity[0].stage).toBe('proposal');
  });

  it('drafts a quote even for a contact-less opportunity (crm_contact optional)', async () => {
    const data = makeDataEngine();
    data.store.crm_opportunity = [{
      id: 'opp_2', name: 'No-Contact Deal', amount: 50000,
      crm_account: 'acc_2', primary_contact: null, stage: 'qualification',
    }];
    const engine = buildEngine(data);
    await runQuote(engine, 'opp_2', { quoteName: 'Q-2', expirationDays: 15, discount: 0 });

    expect(data.store.crm_quote?.length, 'quote still created without a contact').toBe(1);
    const q = data.store.crm_quote[0];
    expect(q.crm_account).toBe('acc_2');
    expect(q.subtotal).toBe(50000);
    expect(q.total_price).toBe(50000); // 0% discount
    expect(q.crm_contact == null, 'contact left empty').toBe(true);
  });
});
