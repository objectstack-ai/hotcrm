// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { templateEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import { QuoteGenerationFlow } from '../src/revenue/flows/quote-generation.flow';
import { localePacks } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Generate Quote ends on a result screen that links the quote (#2371 row 6,
 * the #2297 shape).
 *
 * Measured on 18.2.0 before this change: the flow closed on the toast
 * "Quote created from opportunity!" and left the rep on the opportunity; the
 * new quote was reachable only through the related list. Now the run pauses,
 * after every write, on the `result` screen: a sentence naming the quote and
 * one `record_link` field to it. Take the screen out and the runtime case
 * goes red, since the run then completes on the first resume.
 */

const nodes = QuoteGenerationFlow.nodes as Rec[];
const edges = QuoteGenerationFlow.edges as Rec[];
const result = nodes.find((n) => n.id === 'result')!;

describe('the quote result screen is the end of the run (#2371 row 6)', () => {
  it('every write is behind it, and it leads only to the end', () => {
    expect(result?.type).toBe('screen');
    const upstream = new Set<string>(['result']);
    let grew = true;
    while (grew) {
      grew = false;
      for (const e of edges) {
        if (upstream.has(e.target) && !upstream.has(e.source)) { upstream.add(e.source); grew = true; }
      }
    }
    const writers = nodes
      .filter((n) => ['create_record', 'update_record', 'delete_record', 'subflow', 'notify'].includes(n.type))
      .map((n) => n.id);
    expect(writers.filter((id) => !upstream.has(id)), 'a write runs after the result screen').toEqual([]);
    expect(edges.filter((e) => e.source === 'result').map((e) => e.target)).toEqual(['end']);
  });

  it('links the quote the run created', () => {
    expect((result.config.fields as Rec[]).map((f) => [f.name, f.type, f.reference, f.defaultValue?.source]))
      .toEqual([['quoteLink', 'record_link', 'crm_quote', 'quoteId.id']]);
  });
});

describe('the quote result screen reads right in every locale (#2371 row 6)', () => {
  const NAME = 'Northwind Renewal 2027';
  const translated = localePacks
    .filter(([, pack]) => pack?.flows?.quote_generation?.screens?.result !== undefined)
    .map(([locale, pack]) => [locale, pack.flows.quote_generation.screens.result] as [string, Rec]);

  it('every non-English pack translates the title, the sentence and the link', () => {
    const shipped = localePacks.map(([locale]) => locale).filter((l) => l !== 'en').sort();
    expect(translated.map(([locale]) => locale).sort()).toEqual(shipped);
    for (const [locale, screen] of translated) {
      expect(String(screen.title ?? '').length, `${locale}: no title`).toBeGreaterThan(0);
      expect(String(screen.fields?.quoteLink?.label ?? '').length, `${locale}: no link label`).toBeGreaterThan(0);
    }
  });

  it.each([['en (authored)', String(result.config.description)], ...translated.map(([l, s]) => [l, String(s.description ?? '')])])(
    '%s: names the quote',
    (_locale, source) => {
      const r = templateEngine.evaluate({ dialect: 'template', source: source as string }, { extra: { quoteName: NAME } } as Rec);
      if (!r.ok) throw new Error(`does not render: ${r.error.message}`);
      expect(String(r.value)).toContain(NAME);
    },
  );
});

describe('as a sales rep, Generate Quote ends on the quote (#2371 row 6)', () => {
  let verify: VerifyStack;
  let rep: Person;
  beforeAll(async () => {
    verify = await hotcrmStack();
    rep = await signUpPerson(verify, 'rep@quote-generation-result-screen.test', {
      name: 'Quote Result Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
  }, 120_000);

  const screenOf = (run: Rec): Rec | undefined => run.screen ?? run.output?.screen;

  it('pauses on the result screen with a link to the new quote; Submit completes and changes nothing', async () => {
    const [account] = await verify.seed('crm_account', [{ name: 'Quote Result Co', owner_id: rep.id, approval_status: 'approved' }]);
    const [deal] = await verify.seed('crm_opportunity', [{
      name: 'Quote Result Deal', amount: 40_000, stage: 'qualification', close_date: '2030-06-30',
      crm_account: account!.id, owner_id: rep.id,
    }]);
    const started = await verify.flows.run('quote_generation', { recordId: deal!.id }, { as: rep.token }) as Rec;
    expect(screenOf(started)?.nodeId).toBe('screen_1');
    const paused = await verify.flows.resume(started as never, { quoteName: 'Q-RESULT', expirationDays: 30, discount: 0 }, { as: rep.token }) as Rec;
    const screen = screenOf(paused);
    expect(screen?.nodeId, 'the run did not end on the result screen').toBe('result');

    const quotes = await verify.rows('crm_quote', { crm_opportunity: deal!.id });
    expect(quotes.map((q) => q.name), 'the quote is written before the result screen').toEqual(['Q-RESULT']);
    const link = (screen!.fields as Rec[]).find((f) => f.name === 'quoteLink')!;
    expect([link.type, link.reference, link.defaultValue]).toEqual(['record_link', 'crm_quote', quotes[0]!.id]);
    expect(String(screen!.description)).toContain('"Q-RESULT"');

    const done = await verify.flows.resume(paused as never, {}, { as: rep.token }) as Rec;
    expect(screenOf(done), 'the run paused again after the result screen').toBeUndefined();
    expect((await verify.rows('crm_quote', { crm_opportunity: deal!.id })).map((q) => q.id)).toEqual([quotes[0]!.id]);
  });
});
