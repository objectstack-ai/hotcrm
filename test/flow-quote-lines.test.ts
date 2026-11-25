// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { templateEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import { QuoteGenerationFlow } from '../src/revenue/flows/quote-generation.flow';
import { localePacks } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Generate Quote copies the opportunity's product lines onto the quote (#2750).
 *
 * The product owner's ruling, as the card states it: each deal line becomes a
 * quote line (product, quantity, list price, sales price, line discount,
 * description); the quote's Subtotal and Total come from the copied lines and
 * the discount entered on the screen applies on top; the two sides are
 * independent afterwards; a deal with no lines still gets a header-only quote.
 *
 * Measured on `main` b1ea6fc before the change, with the first case below: the
 * quote held 0 lines and its Subtotal was the deal's amount.
 *
 * Every write is the rep's own, through the hooks, so a copied line meets the
 * same rules a typed line meets (`quote_line_item_price_fill`, the line
 * ceiling, `quote_total_rollup`).
 */

let verify: VerifyStack;
let rep: Person;
let admin: string;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@flow-quote-lines.test', {
    name: 'Lines Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const as = (p: Person | string) => ({ as: typeof p === 'string' ? p : p.token });
const screenOf = (run: Rec): Rec | undefined => run.screen ?? run.output?.screen;

/** A catalogue product; `product_standard_price` prices it in the standard book. */
const product = (listPrice: number): Promise<Rec> =>
  verify.hooks.run('crm_product', 'insert', {
    name: `Lines Product ${++k}`, is_active: true, list_price: listPrice,
  }, as(admin));

/**
 * The rep's deal, written as the system and owned by the rep (as
 * `flow-quote.test.ts` writes it, so no approval holds it), with `lines`
 * added by the rep through the hooks, so the deal's amount is rolled up from
 * them as it is in the console.
 */
async function deal(lines: Rec[], amount = 10_000): Promise<{ opp: Rec; oppLines: Rec[] }> {
  const n = ++k;
  const [account] = await verify.seed('crm_account', [{ name: `Lines Co ${n}`, owner_id: rep.id }]);
  const [opp] = await verify.seed('crm_opportunity', [{
    name: `Lines Deal ${n}`, amount, stage: 'qualification', close_date: '2030-06-30',
    crm_account: account!.id, owner_id: rep.id,
  }]);
  for (const line of lines) {
    await verify.hooks.run('crm_opportunity_line_item', 'insert', { crm_opportunity: opp!.id, ...line }, as(rep));
  }
  const oppLines = await verify.rows('crm_opportunity_line_item', { crm_opportunity: opp!.id });
  const [stored] = await verify.rows('crm_opportunity', { id: opp!.id });
  return { opp: stored!, oppLines: oppLines.sort((a, b) => a.line_number - b.line_number) };
}

/** Run Generate Quote as the rep; the run as it stands on the result screen, and the quote. */
async function generate(oppId: string, discount: number): Promise<{ paused: Rec; quote: Rec; lines: Rec[] }> {
  const run = await verify.flows.run('quote_generation', { recordId: oppId }, as(rep));
  const paused = await verify.flows.resume(run, { quoteName: `Q-${++k}`, expirationDays: 30, discount }, as(rep)) as Rec;
  const quotes = await verify.rows('crm_quote', { crm_opportunity: oppId });
  expect(quotes, 'exactly one quote').toHaveLength(1);
  const lines = await verify.rows('crm_quote_line_item', { crm_quote: quotes[0]!.id });
  return { paused, quote: quotes[0]!, lines: lines.sort((a, b) => a.line_number - b.line_number) };
}

/** The six facts the ruling names, as a line carries them. */
const sixFacts = (l: Rec) => ({
  crm_product: l.crm_product, quantity: l.quantity, list_price: l.list_price,
  unit_price: l.unit_price, discount: l.discount, description: l.description ?? null,
});

describe('Generate Quote copies the deal\'s lines (#2750)', () => {
  let p1: Rec;
  let p2: Rec;
  beforeAll(async () => {
    p1 = await product(1200);
    p2 = await product(350);
  });

  const twoLines = (): Rec[] => [
    { crm_product: p1.id, quantity: 3, unit_price: 1100, discount: 5, description: 'Three seats, annual' },
    { crm_product: p2.id, quantity: 2, unit_price: 350 },
  ];

  it('two deal lines become two matching quote lines, and the quote totals are theirs', async () => {
    const { opp, oppLines } = await deal(twoLines());
    expect(oppLines, 'fixture: the deal holds two lines').toHaveLength(2);
    // 3 × 1100 × 0.95 + 2 × 350 = 3135 + 700
    expect(opp.amount, 'fixture: the deal amount is rolled up from its lines').toBe(3835);

    const { paused, quote, lines } = await generate(opp.id, 0);

    // Matched by product: `get_record` takes no sort, so the quote numbers the
    // lines in the order the read returns them, which need not be the deal's.
    const byProduct = (a: Rec, b: Rec) => String(a.crm_product).localeCompare(String(b.crm_product));
    expect([...lines].sort(byProduct).map(sixFacts)).toEqual([...oppLines].sort(byProduct).map(sixFacts));
    expect(lines.map((l) => l.product_title).sort()).toEqual([p1.name, p2.name].sort());
    expect(lines.map((l) => l.line_number), 'numbered 1..n like a typed line').toEqual([1, 2]);
    expect([quote.subtotal, quote.discount_amount, quote.total_price]).toEqual([3835, 0, 3835]);
    expect(screenOf(paused)?.nodeId, 'a clean copy ends on the ordinary result screen').toBe('result');
  });

  it('the discount entered on the screen applies on top of the copied lines', async () => {
    const { opp } = await deal(twoLines());
    const { quote, lines } = await generate(opp.id, 10);

    expect(lines).toHaveLength(2);
    expect(quote.discount).toBe(10);
    // 3835 × 10% = 383.50; 3835 − 383.50 = 3451.50
    expect([quote.subtotal, quote.discount_amount, quote.total_price]).toEqual([3835, 383.5, 3451.5]);
  });

  it('a deal with no lines still gets a header-only quote priced from its amount', async () => {
    const { opp, oppLines } = await deal([], 42_000);
    expect(oppLines).toHaveLength(0);
    const { paused, quote, lines } = await generate(opp.id, 10);

    expect(lines).toHaveLength(0);
    expect([quote.subtotal, quote.discount_amount, quote.total_price]).toEqual([42_000, 4200, 37_800]);
    expect(screenOf(paused)?.nodeId).toBe('result');
  });

  it('afterwards the two sides are independent: editing one line leaves its twin as it was', async () => {
    const { opp, oppLines } = await deal(twoLines());
    const { quote, lines } = await generate(opp.id, 0);

    const twinOf = (l: Rec, among: Rec[]) => among.find((m) => m.crm_product === l.crm_product)!;
    const seats = twinOf(oppLines[0]!, lines);
    await verify.hooks.run('crm_quote_line_item', 'update', { id: seats.id, quantity: 7, unit_price: 900 }, as(rep));
    const [oppLineAfter] = await verify.rows('crm_opportunity_line_item', { id: oppLines[0]!.id });
    expect(sixFacts(oppLineAfter!), 'a quote line edit reached the deal line').toEqual(sixFacts(oppLines[0]!));
    const [oppAfter] = await verify.rows('crm_opportunity', { id: opp.id });
    expect(oppAfter!.amount, 'a quote line edit reached the deal amount').toBe(3835);
    // The quote follows its own lines: 7 × 900 × 0.95 + 700 = 5985 + 700.
    const [quoteAfter] = await verify.rows('crm_quote', { id: quote.id });
    expect(quoteAfter!.subtotal).toBe(6685);

    await verify.hooks.run('crm_opportunity_line_item', 'update', { id: oppLines[1]!.id, quantity: 9 }, as(rep));
    const [quoteLineAfter] = await verify.rows('crm_quote_line_item', { id: twinOf(oppLines[1]!, lines).id });
    expect(quoteLineAfter!.quantity, 'a deal line edit reached the quote line').toBe(2);
  });

  /**
   * A deal line the quote refuses. The deal's lines carry no discount ceiling
   * and the quote's lines do (`crm_quote_line_item.discount_within_ceiling`,
   * 60%), so a 70% deal line is the one a rep can actually reach. It is
   * counted and named on the result screen; the other line is still copied.
   */
  it('a line the quote refuses is counted on the result screen, and the others are still copied', async () => {
    const { opp } = await deal([
      { crm_product: p1.id, quantity: 1, unit_price: 1000, discount: 70 },
      { crm_product: p2.id, quantity: 2, unit_price: 350 },
    ]);
    const { paused, quote, lines } = await generate(opp.id, 0);

    expect(paused.success, 'the run failed instead of reporting the line').not.toBe(false);
    expect(lines.map((l) => l.crm_product)).toEqual([p2.id]);
    expect(quote.subtotal, 'the quote is priced from the lines it holds').toBe(700);
    const screen = screenOf(paused);
    expect(screen?.nodeId).toBe('result_partial');
    expect(String(screen!.description)).toContain('but 1 of the opportunity');
    expect(String(screen!.description)).toContain('(1 copied)');
    const link = (screen!.fields as Rec[]).find((f) => f.name === 'quoteLink')!;
    expect(link.defaultValue).toBe(quote.id);

    const done = await verify.flows.resume(paused as never, {}, as(rep)) as Rec;
    expect(screenOf(done), 'the run paused again after the result screen').toBeUndefined();
  });
});

describe('the partial result screen (#2750)', () => {
  const nodes = QuoteGenerationFlow.nodes as Rec[];
  const edges = QuoteGenerationFlow.edges as Rec[];
  const partial = nodes.find((n) => n.id === 'result_partial')!;

  it('links the quote and leads only to the end', () => {
    expect(partial?.type).toBe('screen');
    expect((partial.config.fields as Rec[]).map((f) => [f.name, f.type, f.reference, f.defaultValue?.source]))
      .toEqual([['quoteLink', 'record_link', 'crm_quote', 'quoteId.id']]);
    expect(edges.filter((e) => e.source === 'result_partial').map((e) => e.target)).toEqual(['end']);
  });

  const translated = localePacks
    .filter(([, pack]) => pack?.flows?.quote_generation?.screens?.result_partial !== undefined)
    .map(([locale, pack]) => [locale, pack.flows.quote_generation.screens.result_partial] as [string, Rec]);

  it('every non-English pack translates it', () => {
    const shipped = localePacks.map(([locale]) => locale).filter((l) => l !== 'en').sort();
    expect(translated.map(([locale]) => locale).sort()).toEqual(shipped);
    for (const [locale, screen] of translated) {
      expect(String(screen.title ?? '').length, `${locale}: no title`).toBeGreaterThan(0);
      expect(String(screen.fields?.quoteLink?.label ?? '').length, `${locale}: no link label`).toBeGreaterThan(0);
    }
  });

  it.each([['en (authored)', String(partial.config.description)], ...translated.map(([l, s]) => [l, String(s.description ?? '')])])(
    '%s: names the quote and both counts',
    (_locale, source) => {
      const r = templateEngine.evaluate(
        { dialect: 'template', source: source as string },
        { extra: { quoteName: 'Northwind Renewal', skippedCount: 47, copiedCount: 83 } } as Rec,
      );
      if (!r.ok) throw new Error(`does not render: ${r.error.message}`);
      for (const part of ['Northwind Renewal', '47', '83']) expect(String(r.value)).toContain(part);
    },
  );
});
