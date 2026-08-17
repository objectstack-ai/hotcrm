// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import {
  rows,
  sitesOf,
  fieldsByObject,
  objectsByField,
  type Row,
} from '../scripts/scan-field-consumers';

/**
 * The consumer scan stays OBJECT-AWARE (#1193).
 *
 * `scripts/scan-field-consumers.ts` exists because the sweep that produced
 * #1182's row set was object-blind: it called a field consumed when its NAME
 * appeared in a `src/**\/*.ts` file outside `views/` and `translations/`.
 * `crm_product.tax_rate` therefore read as consumed — the token also spells
 * `crm_quote_line_item.tax_rate`, a different object's field whose own formula
 * reads its own rate — and the product's rate reached no card. `is_taxable`,
 * two declarations away in the same field group and inert for exactly the same
 * reason, did reach it, because its name is unique.
 *
 * ## What this file guards, and what it deliberately does NOT
 *
 * It does not guard the NUMBER of inert fields. That was considered and
 * rejected: the maintainer ruling of 2026-08-17 was 「逐个 enforce-or-remove
 * （推荐）」 — a verdict per field — so a gate on the count would encode the
 * blanket rule the ruling declined to make, and would go red the day someone
 * lands a field one PR before its consumer. The scan is a ledger a human
 * adjudicates, and `pnpm verify` does not run it.
 *
 * What must not regress is the scan's ABILITY TO SEE, because that failure is
 * invisible: a false negative cannot appear in the scan's own output, so a
 * resolver that quietly stopped distinguishing two objects would keep printing
 * a confident, shorter ledger and nobody would notice. So the assertions below
 * are about resolution, not about counts:
 *
 *  1. the two same-named `tax_rate` fields get DIFFERENT verdicts — the exact
 *     discrimination the old grep could not make;
 *  2. every site attributed to a field belongs to an object that DECLARES it;
 *  3. #1182's own verdicts are re-derivable from this scan (positive and
 *     negative controls, so the rule is not agreeing with everything);
 *  4. the scan is not vacuous — it resolves thousands of sites, and the
 *     shared-name population it exists for is non-empty.
 */

const verdictOf = (object: string, field: string): Row['verdict'] | 'absent' =>
  rows.find((r) => r.object === object && r.field === field)?.verdict ?? 'absent';

describe('the scan resolves a shared field name per object, not per file (#1193)', () => {
  /**
   * The card in one assertion. Both objects declare `tax_rate`; one is read by
   * a formula on its own object and one is read by nothing. A name-only grep
   * reports a single answer for both — and reported the wrong one.
   */
  it('crm_quote_line_item.tax_rate is live and crm_product.tax_rate is not', () => {
    expect(fieldsByObject.get('crm_product')?.has('tax_rate')).toBe(true);
    expect(fieldsByObject.get('crm_quote_line_item')?.has('tax_rate')).toBe(true);
    expect(verdictOf('crm_quote_line_item', 'tax_rate')).toBe('live');
    expect(verdictOf('crm_product', 'tax_rate')).toBe('inert');
  });

  it('the live one is read by the total_price formula on its own object', () => {
    const sites = sitesOf('crm_quote_line_item', 'tax_rate');
    expect(sites.some((s) => s.root === 'objects' && s.bucket === 'behaviour')).toBe(true);
  });

  /**
   * The inert one has only CARRIER sites — the four locale bundles. That is the
   * shape a removal has to clean, and the shape that proves nothing reads it.
   * Asserted as "no behaviour and no display site" rather than "zero sites",
   * because a locale row is not evidence of a reader and must not be mistaken
   * for one in either direction.
   */
  it('the inert one has locale rows and nothing else', () => {
    const sites = sitesOf('crm_product', 'tax_rate');
    expect(sites.every((s) => s.bucket === 'carrier')).toBe(true);
    expect(sites.map((s) => s.root)).toContain('translations');
  });

  it('no site is ever attributed to an object that does not declare the field', () => {
    const bogus = rows.flatMap((r) =>
      sitesOf(r.object, r.field)
        .filter(() => !fieldsByObject.get(r.object)?.has(r.field))
        .map((s) => `${r.object}.${r.field} @ ${s.root}${s.path}`),
    );
    expect(bogus, `sites attributed to objects that do not declare the field:\n  ${bogus.join('\n  ')}`).toEqual([]);
  });
});

describe('#1182 verdicts are re-derivable from this scan (#1193)', () => {
  /**
   * The reverse verification, pinned.
   *
   * Measured on the pre-removal tree (`c83aa744`, the commit before #1195
   * landed): of the twelve fields #1182 deleted, two read `inert` and ten read
   * `display-only` — and NONE read `live`. On this tree they are gone, so what
   * can be re-checked here is the other half of that card: the one row it KEPT
   * and enforced. `crm_account.parent_account` read `display-only` before the
   * roll-up existed and reads `live` now, because `child_account_revenue`
   * names it as its `relationshipField`. A resolver that stopped reading
   * summary operations would flip it back, silently.
   */
  it('the row #1182 enforced now reads as live', () => {
    expect(verdictOf('crm_account', 'parent_account')).toBe('live');
    const behavioural = sitesOf('crm_account', 'parent_account').filter((s) => s.bucket === 'behaviour');
    expect(behavioural.length).toBeGreaterThan(0);
  });

  it('the fields #1182 removed are gone, so the ledger cannot re-report them', () => {
    for (const [object, field] of [
      ['crm_product', 'is_taxable'], ['crm_product', 'quantity_on_hand'],
      ['crm_product', 'billing_type'], ['crm_case', 'parent_case'],
      ['crm_contact', 'birthdate'], ['crm_campaign', 'parent_campaign'],
    ] as const) {
      expect(verdictOf(object, field), `${object}.${field}`).toBe('absent');
    }
  });

  /**
   * Negative controls. A resolver that credited every token to every object
   * would call everything live; one that credited nothing would call everything
   * inert. These two rows are heavily read and must stay live, and their site
   * counts are asserted as ">= 1 behaviour" rather than as a number, so
   * ordinary work does not have to update a magic figure.
   */
  it('heavily-read fields stay live', () => {
    expect(verdictOf('crm_product', 'list_price')).toBe('live');
    expect(verdictOf('crm_opportunity', 'amount')).toBe('live');
  });
});

describe('the scan is not vacuous (#1193)', () => {
  it('resolves a real population of fields and sites', () => {
    // A stack shape that moved would leave every row at zero sites and the
    // ledger would report the whole app as inert — loud, but for the wrong
    // reason. Fail here, where the message is true.
    expect(rows.length).toBeGreaterThan(300);
    expect(rows.filter((r) => r.verdict === 'live').length).toBeGreaterThan(200);
  });

  it('the shared-name population this scan exists for is non-empty', () => {
    // If no field name were ever shared across objects, the object-aware
    // resolution would be guarding nothing and this whole file would be
    // agreeing with everything.
    const shared = [...objectsByField].filter(([, objects]) => objects.length > 1);
    expect(shared.length).toBeGreaterThan(10);
  });
});
