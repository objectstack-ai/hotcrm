// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import oppLineItemHooks from '../src/revenue/objects/opportunity_line_item.hook';
import quoteLineItemHooks from '../src/revenue/objects/quote_line_item.hook';
import { OpportunityLineItem } from '../src/revenue/objects/opportunity_line_item.object';
import { QuoteLineItem } from '../src/revenue/objects/quote_line_item.object';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';
import { REPO_ROOT } from './helpers/repo-root';
import { objectFiles } from './helpers/src-roster';

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


type AnyRec = Record<string, any>;
type Rec = Record<string, any>;

const hookNamed = (hooks: unknown, name: string): AnyRec => {
  const hook = (hooks as AnyRec[]).find((h) => h.name === name);
  if (!hook) throw new Error(`hook "${name}" not found`);
  return hook;
};

// Every package's `*.object.ts`, not one directory: since the ADR-0130 layout
// a directory under `src/` is a package and each carries its own `objects/`.
const objectSources = objectFiles().map((rel) => ({
  file: rel.split('/').pop()!,
  source: readFileSync(join(REPO_ROOT, rel), 'utf8'),
}));

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

  /**
   * Behavioural parity, asserted on both objects from one scenario table — each
   * a sales rep's real write through the engine's write door (`hooks.run`) on
   * the shipped app booted by `@objectstack/verify`, the catalogue written as
   * the system, the stored line read back.
   */
  let verify: VerifyStack;
  let rep: Person;
  let k = 0;
  beforeAll(async () => {
    verify = await hotcrmStack();
    rep = await signUpPerson(verify, 'rep@line-item-conventions.test', {
      name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
  }, 120_000);

  /** A catalogue product at `list_price`, written as the system. */
  const productAt = async (list_price: number): Promise<Rec> =>
    (await verify.seed('crm_product', [{ name: `Line Product ${++k}`, product_code: `LI-${k}`, is_active: true, list_price }]))[0]!;

  /** The parent a line of `kind` hangs off — a deal, or a quote on one — written as the system. */
  const parentOf = async (kind: 'opportunity' | 'quote'): Promise<Rec> => {
    const [account] = await verify.seed('crm_account', [{ name: `Line Co ${++k}`, owner_id: rep.id }]);
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Line Deal ${k}`, amount: 10_000, stage: 'proposal', close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id,
    }]);
    if (kind === 'opportunity') return { crm_opportunity: deal!.id };
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Quinn', last_name: `Line ${k}`, email: `line${k}@line-item-conventions.test`, crm_account: account!.id, owner_id: rep.id,
    }]);
    const [quote] = await verify.seed('crm_quote', [{
      name: `Q-LI-${k}`, status: 'draft', crm_account: account!.id, crm_contact: contact!.id, crm_opportunity: deal!.id,
      quote_date: '2026-01-01', expiration_date: '2030-12-31', owner_id: rep.id,
    }]);
    return { crm_quote: quote!.id };
  };

  const OBJECT = { opportunity: 'crm_opportunity_line_item', quote: 'crm_quote_line_item' } as const;
  const KINDS = [['opportunity'], ['quote']] as const;

  /** The rep's line of `kind` — resolves with the stored row. */
  const repLine = async (kind: 'opportunity' | 'quote', doc: Rec, op: 'insert' | 'update' = 'insert'): Promise<Rec> => {
    const written = await verify.hooks.run(OBJECT[kind], op, doc, { as: rep.token });
    return (await verify.rows(OBJECT[kind], { id: written.id ?? doc.id }))[0]!;
  };

  it.each(KINDS)('%s line item stamps list_price and defaults a blank unit_price on insert', async (kind) => {
    const line = await repLine(kind, { ...(await parentOf(kind)), crm_product: (await productAt(250)).id, quantity: 1 });
    expect(line.list_price).toBe(250);
    expect(line.unit_price).toBe(250);
  });

  it.each(KINDS)('%s line item keeps an explicitly entered unit_price on insert', async (kind) => {
    const line = await repLine(kind, { ...(await parentOf(kind)), crm_product: (await productAt(250)).id, quantity: 1, unit_price: 199 });
    expect(line.list_price).toBe(250);
    expect(line.unit_price).toBe(199);
  });

  it.each(KINDS)('%s line item re-syncs list_price on update without touching the negotiated price', async (kind) => {
    const product = await productAt(200);
    const line = await repLine(kind, { ...(await parentOf(kind)), crm_product: product.id, quantity: 1, unit_price: 199 });
    await systemUpdate(verify, 'crm_product', { id: product.id, list_price: 250 });
    const updated = await repLine(kind, { id: line.id, crm_product: product.id, unit_price: 199 }, 'update');
    expect(updated.list_price).toBe(250);
    expect(updated.unit_price).toBe(199);
  });

  it.each(KINDS)('%s line item cannot be written without a product — the no-product branch has no row', async (kind) => {
    // The product is REQUIRED on both line items, so the engine refuses a line
    // that carries none; the hook's stand-down on it never sees a stored row.
    await expect(repLine(kind, { ...(await parentOf(kind)), quantity: 2 })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fields: expect.arrayContaining([expect.objectContaining({ field: 'crm_product' })]),
    });
  });

  it('a product with no catalog price cannot exist — the no-price branch has no row either', async () => {
    // `crm_product.list_price` is required, for the system's writes too.
    await expect(verify.seed('crm_product', [{ name: `Unpriced ${++k}`, product_code: `UP-${k}`, is_active: true }]))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it.each(KINDS)('%s line item imported by the system gets the same fill (every writer reaches it)', async (kind) => {
    // The `!ctx.api` stand-down is unreachable on the shipped app — the engine
    // hands every write a read door — so the other writer is the system's.
    const [line] = await verify.seed(OBJECT[kind], [{ ...(await parentOf(kind)), crm_product: (await productAt(250)).id, quantity: 1 }]);
    const stored = (await verify.rows(OBJECT[kind], { id: line!.id }))[0]!;
    expect(stored.list_price).toBe(250);
    expect(stored.unit_price).toBe(250);
  });
});
