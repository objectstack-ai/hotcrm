// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack, { type AnyRec } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, today, type Person } from './helpers/verify-stack';

/**
 * #2060 item 7 — a create form refused a save the server would complete
 * (findings A-21, B-11, C-08 of the browser pass #2058).
 *
 * Measured on 18.0.0-next.3 before this change, in the console and over REST:
 *
 *   field                                   create form                  REST insert without it
 *   crm_opportunity_line_item.unit_price    "… highlighted: Sales Price"  201, the list price
 *   crm_quote.expiration_date               "… Expiration Date"           201, quote_date + 30
 *   crm_forecast.period_end                 "… Period End"                201, the period's last day
 *   crm_forecast.snapshot_date              "… Snapshot Date"             201, today
 *   crm_quote_line_item.unit_price          "… Sales Price"               201, the list price
 *
 * (The last row is item 7b, measured on 18.0.0-next.5: the twin line object
 * the shared price fill also serves.)
 *
 * A hook filled each one, and a form cannot see a hook: it reads `required` as
 * "the user must type this". Two constructs, chosen by what the spec can say:
 *
 *  - a default the spec can state is DECLARED (`defaultValue`), and the hook
 *    that stamped it no longer does. `required` stays. The form reads a
 *    runtime default as the server's to fill, and the engine applies it on
 *    every insert door, including the ones that run no hook.
 *  - a value only a hook can compute (from another record, or from a sibling
 *    the hook itself derives) keeps the hook as its producer and drops
 *    `required`: the column stays NOT NULL (`storage.notNull` alone, the
 *    spec's engine-populated column), so a write that ends up without one is
 *    still refused.
 *
 * Every write here is a real person's, through the engine's write door
 * (`hooks.run`) on the app booted by `@objectstack/verify`.
 */

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const fieldsOf = (name: string): AnyRec => {
  const object = objects.find((o) => o.name === name);
  if (!object) throw new Error(`object ${name} is not registered`);
  return object.fields;
};
const fieldOf = (object: string, field: string): AnyRec => fieldsOf(object)[field];

/** The refusal envelope a rejected write carries, read off the thrown error. */
const refusalOf = async (write: Promise<unknown>): Promise<AnyRec> => {
  try {
    await write;
  } catch (err) {
    const e = err as AnyRec;
    return { code: e?.code, status: e?.status, message: String(e?.message ?? ''), fields: e?.fields };
  }
  throw new Error('the write was admitted');
};

// ─────────────────────────────────────────────── what the form reads ──

describe('the create form is told who supplies each value', () => {
  it.each([
    ['crm_opportunity_line_item', 'unit_price'],
    // Item 7b: the twin line object, which the shared price fill serves too.
    ['crm_quote_line_item', 'unit_price'],
    ['crm_forecast', 'period_end'],
  ])('%s.%s is a NOT NULL column the server fills, not a value the writer must supply', (object, field) => {
    const def = fieldOf(object, field);
    expect(def.required, `${object}.${field} is required again, so the create form refuses a blank one`).toBeFalsy();
    expect(def.storage?.notNull, `${object}.${field} lost its column constraint`).toBe(true);
    expect(def.defaultValue).toBeUndefined();
  });

  it.each([
    ['crm_quote', 'expiration_date', 'addDays(record.quote_date, 30)'],
    ['crm_forecast', 'snapshot_date', 'today()'],
  ])('%s.%s declares its default as a runtime expression, and stays required', (object, field, source) => {
    const def = fieldOf(object, field);
    // The CEL envelope is the shape the console classifies as server-owned
    // (no required mark on create, "Set automatically when saved.").
    expect(def.defaultValue).toEqual({ dialect: 'cel', source });
    expect(def.required).toBe(true);
    expect(def.storage?.notNull).toBe(true);
  });

  it('quote_date is declared before expiration_date, the order the expiration default reads it in', () => {
    // The engine applies defaults in declaration order (`applyFieldDefaults`
    // walks the object's fields), so a quote that names no date holds today's
    // in `record.quote_date` only because its field comes first.
    const order = Object.keys(fieldsOf('crm_quote'));
    expect(order.indexOf('quote_date')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('quote_date')).toBeLessThan(order.indexOf('expiration_date'));
  });
});

// ─────────────────────────────────────────────── on the booted app ──

describe('the save lands, the value is supplied, and the protection stays', () => {
  let verify: VerifyStack;
  let rep: Person;
  let manager: Person;
  let k = 0;
  beforeAll(async () => {
    verify = await hotcrmStack();
    rep = await signUpPerson(verify, 'rep@form-required-server-defaults.test', {
      name: 'Sales Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
    manager = await signUpPerson(verify, 'manager@form-required-server-defaults.test', {
      name: 'Sales Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
    });
  }, 120_000);

  /** The rep's account, contact and deal, written as the system. */
  const parties = async (): Promise<AnyRec> => {
    const [account] = await verify.seed('crm_account', [{ name: `Defaults Co ${++k}`, owner_id: rep.id }]);
    const [contact] = await verify.seed('crm_contact', [{
      first_name: 'Dana', last_name: `Defaults ${k}`, email: `dana${k}@form-required-server-defaults.test`, crm_account: account!.id, owner_id: rep.id,
    }]);
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Defaults Deal ${k}`, amount: 10_000, stage: 'proposal', close_date: '2030-06-30', crm_account: account!.id,
      primary_contact: contact!.id, owner_id: rep.id,
    }]);
    return { crm_account: account!.id, crm_contact: contact!.id, crm_opportunity: deal!.id };
  };
  const stored = async (object: string, id: string): Promise<AnyRec> => (await verify.rows(object, { id }))[0]!;
  const as = (p: Person) => ({ as: p.token });

  describe('Expiration Date (B-11)', () => {
    /** The rep's quote, as the form posts it: no expiration date. */
    const repQuote = async (doc: AnyRec = {}): Promise<AnyRec> => {
      const p = await parties();
      const written = await verify.hooks.run('crm_quote', 'insert', { name: `Q-${++k}`, ...p, ...doc }, as(rep));
      return stored('crm_quote', written.id);
    };

    it.each([
      // Across a DST change in most zones that keep one: the default is
      // calendar arithmetic, and a date is never a day short.
      ['2026-03-01', '2026-03-31'],
      ['2026-10-15', '2026-11-14'],
      ['2026-12-15', '2027-01-14'],
    ])('a quote dated %s that names no expiration expires on %s', async (quote_date, expiration_date) => {
      expect((await repQuote({ quote_date })).expiration_date).toBe(expiration_date);
    });

    it('reaches a door that runs no hook: the dry-run preview admits a quote with no expiration date', async () => {
      // `verify.validate` is `ObjectQL.validate` — the import preview's door:
      // the same field defaults and rules as the write, and no hooks. Before
      // this change it answered "Expiration Date is required".
      const verdict = await verify.validate('crm_quote', { name: `Q-${++k}`, ...(await parties()) }, as(rep));
      expect(verdict.results[0]!.errors).toEqual([]);
      expect(verdict.valid).toBe(true);
    });

    it('an explicit date is kept', async () => {
      expect((await repQuote({ quote_date: '2026-01-01', expiration_date: '2026-06-30' })).expiration_date).toBe('2026-06-30');
    });

    it('an update still may not clear it', async () => {
      const quote = await repQuote();
      const refusal = await refusalOf(verify.hooks.run('crm_quote', 'update', { id: quote.id, expiration_date: null }, as(rep)));
      expect(refusal.code).toBe('VALIDATION_FAILED');
      // Measured: the engine's in-process ValidationError carries no `status`
      // (the REST door answers 400); pinned as measured, as
      // `forecast-period-boundary.test.ts` does.
      expect(refusal.status).toBeUndefined();
      expect(refusal.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'expiration_date' })]));
      expect((await stored('crm_quote', quote.id)).expiration_date).toBe(quote.expiration_date);
    });
  });

  describe('Period End and Snapshot Date (C-08)', () => {
    /** The manager's forecast, as the form posts it: a period and its start. */
    const managerForecast = async (doc: AnyRec): Promise<AnyRec> =>
      stored('crm_forecast', (await verify.hooks.run('crm_forecast', 'insert', doc, as(manager))).id);

    it('a forecast with only a period and its start lands with its end and today as its snapshot date', async () => {
      const f = await managerForecast({ period: 'quarter', period_start: '2026-10-01', quota: 300_000 });
      expect(f).toMatchObject({ period_end: '2026-12-31', period_label: 'Q4 2026', snapshot_date: today() });
    });

    it('the snapshot date reaches the dry-run preview, which runs no hook', async () => {
      // The preview still has no `period_end`: that one is the hook's to derive,
      // and the hook does not run here. What the preview no longer reports is
      // either of them as REQUIRED.
      const verdict = await verify.validate('crm_forecast', { period: 'month', period_start: '2026-11-01' }, as(manager));
      expect(verdict.results[0]!.errors).toEqual([]);
    });

    it('an update still may not clear the snapshot date', async () => {
      const f = await managerForecast({ period: 'month', period_start: '2026-09-01' });
      const refusal = await refusalOf(verify.hooks.run('crm_forecast', 'update', { id: f.id, snapshot_date: null }, as(manager)));
      expect(refusal.code).toBe('VALIDATION_FAILED');
      expect(refusal.status).toBeUndefined();
      expect(refusal.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'snapshot_date' })]));
    });

    it('clearing the period end re-derives it rather than storing a blank', async () => {
      const f = await managerForecast({ period: 'month', period_start: '2026-08-01' });
      await verify.hooks.run('crm_forecast', 'update', { id: f.id, period_end: null }, as(manager));
      expect((await stored('crm_forecast', f.id)).period_end).toBe('2026-08-31');
    });
  });

  // The shared price fill serves both line objects, so both are pinned alike:
  // the deal line (A-21, item 7) and the quote line (item 7b). Measured on
  // 18.0.0-next.5 before 7b: the New Quote Line Item form refused "Please check
  // the highlighted fields: Sales Price" and sent nothing, while a REST insert
  // without a price answered 201 at the list price.
  describe.each([
    ['a deal line (A-21)', 'crm_opportunity_line_item'],
    ['a quote line (7b)', 'crm_quote_line_item'],
  ])('Sales Price on %s', (_line, object) => {
    /** The rep's parent for a line: their deal, or a draft quote on it. */
    const parentOf = async (): Promise<AnyRec> => {
      const p = await parties();
      if (object === 'crm_opportunity_line_item') return { crm_opportunity: p.crm_opportunity };
      const quote = await verify.hooks.run('crm_quote', 'insert', { name: `Q-${++k}`, ...p }, as(rep));
      return { crm_quote: quote.id };
    };
    const productAt420 = async (): Promise<AnyRec> =>
      (await verify.seed('crm_product', [{ name: `Defaults Product ${++k}`, product_code: `DF-${k}`, is_active: true, list_price: 420 }]))[0]!;

    /** A line the rep adds as the form posts it: a parent, a product and no price. */
    const repLine = async (doc: AnyRec = {}): Promise<{ line: AnyRec; listPrice: number }> => {
      const product = await productAt420();
      const written = await verify.hooks.run(object, 'insert', {
        ...(await parentOf()), crm_product: product.id, quantity: 2, ...doc,
      }, as(rep));
      return { line: await stored(object, written.id), listPrice: 420 };
    };

    it('a line with no price lands at the product list price', async () => {
      const { line, listPrice } = await repLine();
      expect(line).toMatchObject({ unit_price: listPrice, list_price: listPrice });
    });

    it('a negotiated price is kept', async () => {
      expect((await repLine({ unit_price: 399 })).line.unit_price).toBe(399);
    });

    it('the dry-run preview, which runs no hook, no longer reports the price as missing', async () => {
      // `verify.validate` is the import preview's door (see Expiration Date
      // above). While the price was `required` it answered "Sales Price is
      // required" for a line the import itself would price.
      const product = await productAt420();
      const verdict = await verify.validate(object, { ...(await parentOf()), crm_product: product.id, quantity: 2 }, as(rep));
      expect(verdict.results[0]!.errors).toEqual([]);
    });

    it('an update that clears the price is refused by the column, and the price stays', async () => {
      const { line } = await repLine();
      // In process this is the driver's NOT NULL refusal, which carries no
      // `code`; the REST door translates it to 400 `VALIDATION_FAILED`
      // (measured in the PR). The table and column name it, so this cannot be
      // some other failure passing for it.
      const refusal = await refusalOf(verify.hooks.run(object, 'update', { id: line.id, unit_price: null }, as(rep)));
      expect(refusal.message).toContain(`NOT NULL constraint failed: ${object}.unit_price`);
      expect((await stored(object, line.id)).unit_price).toBe(line.unit_price);
    });
  });
});
