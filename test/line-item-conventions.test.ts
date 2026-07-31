// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import oppLineItemHooks from '../src/objects/opportunity_line_item.hook';
import quoteLineItemHooks from '../src/objects/quote_line_item.hook';
import { OpportunityLineItem } from '../src/objects/opportunity_line_item.object';
import { QuoteLineItem } from '../src/objects/quote_line_item.object';
import { hookNamed, makeCtx, makeHarness, type Rec } from './helpers/hook-harness';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Authoring-convention guards for the two line-item objects (#514 items 8, 3, 15).
 *
 * These live in their own file on purpose: `metadata-references.test.ts` is the
 * repo's highest-churn test module, and none of the guards below are about
 * dangling UI references.
 *
 * What makes these guards necessary is that the mistakes they catch are
 * INVISIBLE at runtime:
 *
 * - `F` and `P` are both plain aliases of `cel` in `@objectstack/spec`, so a
 *   formula authored with the predicate tag produces a byte-identical
 *   Expression envelope. Only the source text records the author's intent, so
 *   the tag guard has to read the source.
 * - A raw `{ dialect: 'cel', source: '…' }` object literal likewise compiles to
 *   exactly what the tagged template produces — it just skips the tag's
 *   escaping and reads as a different dialect of the same codebase.
 * - Formula-on-formula and a missing null guard DO change behavior, so those
 *   two assert against the compiled metadata rather than the source text.
 */

const OBJECTS_DIR = join(REPO_ROOT, 'src/objects');

type AnyRec = Record<string, any>;

const objectSources = readdirSync(OBJECTS_DIR)
  .filter((f) => f.endsWith('.object.ts'))
  .map((file) => ({ file, source: readFileSync(join(OBJECTS_DIR, file), 'utf8') }));

/** Guard against the glob silently matching nothing (a vacuous test passes). */
it('the object-source scan actually reads files', () => {
  expect(objectSources.length).toBeGreaterThan(10);
});

// ──────────────────────────────────────── #514 item 8: expression tags ──

describe('expression tags record the author intent', () => {
  /**
   * `Field.formula({ … expression: X`…` })` — X must be `F`.
   *
   * Matches the `expression:` that follows a `Field.formula(` opener, which is
   * the only place a formula expression can be authored.
   */
  it('every Field.formula expression uses the F (formula) tag', () => {
    const violations: string[] = [];
    for (const { file, source } of objectSources) {
      const re = /Field\.formula\(\{[\s\S]*?expression:\s*([A-Za-z_$][\w$]*)?\s*[`{]/g;
      for (const m of source.matchAll(re)) {
        const tag = m[1];
        if (tag === 'F') continue;
        const line = source.slice(0, m.index).split('\n').length;
        violations.push(`${file}:${line} — formula expression tagged \`${tag ?? '(raw object)'}\``);
      }
    }
    expect(violations, 'formula fields must be authored with F, not P/cel/a raw envelope').toEqual([]);
  });

  /** `validations[].condition` is a boolean predicate — it must be `P`. */
  it('every validation condition uses the P (predicate) tag', () => {
    const violations: string[] = [];
    for (const { file, source } of objectSources) {
      const re = /condition:\s*([A-Za-z_$][\w$]*)?\s*[`{]/g;
      for (const m of source.matchAll(re)) {
        const tag = m[1];
        if (tag === 'P') continue;
        const line = source.slice(0, m.index).split('\n').length;
        violations.push(`${file}:${line} — condition tagged \`${tag ?? '(raw object)'}\``);
      }
    }
    expect(
      violations,
      'validation conditions must use P; a raw { dialect: "cel" } literal means the file never imported it',
    ).toEqual([]);
  });
});

// ─────────────────────────── #514 item 8: no formula-on-formula ──

describe('formulas resolve from stored values, not from other formulas', () => {
  /**
   * The hazard is documented at `lead.object.ts:61-64`: a formula that reads
   * another formula field depends on the platform hydrating that field first,
   * which is not guaranteed. Compose from the same SOURCE fields instead.
   */
  it.each([
    ['crm_opportunity_line_item', OpportunityLineItem],
    ['crm_quote_line_item', QuoteLineItem],
  ])('%s has no formula that reads another formula field', (_name, schema) => {
    const fields: Record<string, AnyRec> = (schema as AnyRec).fields ?? {};
    const formulaNames = Object.entries(fields)
      .filter(([, f]) => f?.type === 'formula')
      .map(([n]) => n);
    expect(formulaNames.length, 'expected formula fields to exist').toBeGreaterThan(0);

    const violations: string[] = [];
    for (const name of formulaNames) {
      const source: string = fields[name]?.expression?.source ?? '';
      for (const m of source.matchAll(/record\.(\w+)/g)) {
        const ref = m[1];
        if (ref !== name && formulaNames.includes(ref)) {
          violations.push(`${name} reads the formula field ${ref}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('quote line total still applies tax on top of the discounted line amount', () => {
    // Inlining `subtotal` must not change the arithmetic. 4 × 100 with a 10%
    // line discount is 360; an 8% tax rate takes it to 388.80.
    const source: string = (QuoteLineItem as AnyRec).fields.total_price.expression.source;
    // The expression is pure arithmetic over `record`, so plain JS evaluates it
    // identically to CEL — enough to prove the inlining preserved the math.
    const evaluate = new Function('record', `return ${source};`) as (r: AnyRec) => number;
    const total = evaluate({ quantity: 4, unit_price: 100, discount: 10, tax_rate: 8 });
    expect(total).toBeCloseTo(388.8, 10);
  });
});

// ─────────────────────────────── #514 item 3: null-guarded predicates ──

describe('line-item validation predicates are null-guarded', () => {
  /**
   * Strict CEL ABORTS on `null < 0` rather than evaluating it false, so an
   * unguarded comparison makes the whole rule inert on an empty field — the
   * rule silently never fires instead of failing loudly. `quote_line_item`
   * carried the guard; `opportunity_line_item` did not.
   *
   * Scoped to the two line-item objects: `product.object.ts` has the same
   * defect and is tracked by the remainder of #514 item 3.
   */
  it.each([
    ['crm_opportunity_line_item', OpportunityLineItem],
    ['crm_quote_line_item', QuoteLineItem],
  ])('%s unit_price_positive guards unit_price against null', (_name, schema) => {
    const rule = ((schema as AnyRec).validations ?? []).find(
      (v: AnyRec) => v.name === 'unit_price_positive',
    );
    expect(rule, 'unit_price_positive rule missing').toBeTruthy();

    const source: string = rule.condition?.source ?? '';
    expect(source).toContain('record.unit_price < 0');
    expect(
      source,
      'unguarded comparison — strict CEL aborts on null < 0 and the rule never fires',
    ).toMatch(/record\.unit_price\s*!=\s*null\s*&&/);
  });
});

// ───────────────────────────── #514 item 15: one price-fill implementation ──

describe('the two line-item price-fill hooks share one implementation', () => {
  const oppFill = hookNamed(oppLineItemHooks, 'opportunity_line_item_price_fill');
  const quoteFill = hookNamed(quoteLineItemHooks, 'quote_line_item_price_fill');

  /**
   * The two handlers were independent near-verbatim copies, which is how they
   * drift: a fix lands on one and the other keeps the bug. Comparing the
   * handler SOURCE pins that they are literally the same code — a re-forked
   * copy fails here even if it still behaves the same on the cases below.
   */
  it('is literally the same handler body on both objects', () => {
    expect(String(quoteFill.handler)).toBe(String(oppFill.handler));
  });

  it('is wired to the right object with the same events and priority', () => {
    expect(oppFill.object).toBe('crm_opportunity_line_item');
    expect(quoteFill.object).toBe('crm_quote_line_item');
    for (const h of [oppFill, quoteFill]) {
      expect(h.events).toEqual(['beforeInsert', 'beforeUpdate']);
      expect(h.priority).toBe(100);
    }
  });

  /** Behavioural parity, asserted on both hooks from one scenario table. */
  const scenarios: Array<{
    title: string;
    event: string;
    input: Rec;
    products: Rec[];
    expected: Rec;
  }> = [
    {
      title: 'stamps list_price and defaults a blank unit_price on insert',
      event: 'beforeInsert',
      input: { crm_product: 'p1' },
      products: [{ id: 'p1', list_price: 250 }],
      expected: { list_price: 250, unit_price: 250 },
    },
    {
      title: 'keeps an explicitly entered unit_price on insert',
      event: 'beforeInsert',
      input: { crm_product: 'p1', unit_price: 199 },
      products: [{ id: 'p1', list_price: 250 }],
      expected: { list_price: 250, unit_price: 199 },
    },
    {
      title: 're-syncs list_price on update without touching the negotiated price',
      event: 'beforeUpdate',
      input: { crm_product: 'p1', unit_price: 199 },
      products: [{ id: 'p1', list_price: 250 }],
      expected: { list_price: 250, unit_price: 199 },
    },
    {
      title: 'is a no-op when the write carries no product',
      event: 'beforeInsert',
      input: { quantity: 2 },
      products: [{ id: 'p1', list_price: 250 }],
      expected: { list_price: undefined, unit_price: undefined },
    },
    {
      title: 'is a no-op when the product has no catalog price',
      event: 'beforeInsert',
      input: { crm_product: 'p1' },
      products: [{ id: 'p1' }],
      expected: { list_price: undefined, unit_price: undefined },
    },
  ];

  for (const s of scenarios) {
    it.each([
      ['opportunity', oppFill],
      ['quote', quoteFill],
    ])(`%s line item ${s.title}`, async (_label, hook) => {
      const h = makeHarness({ crm_product: s.products.map((p) => ({ ...p })) });
      const input: Rec = { ...s.input };
      await hook.handler(makeCtx({ event: s.event, input, user: { id: 'u1' }, api: h.api }));
      for (const [field, value] of Object.entries(s.expected)) {
        expect(input[field], `${field} after ${s.event}`).toBe(value);
      }
    });
  }

  it('is a no-op on both objects when ctx.api is absent (never blocks the write)', async () => {
    for (const hook of [oppFill, quoteFill]) {
      const input: Rec = { crm_product: 'p1' };
      await expect(
        hook.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'u1' } })),
      ).resolves.toBeUndefined();
      expect(input.list_price).toBeUndefined();
    }
  });
});
