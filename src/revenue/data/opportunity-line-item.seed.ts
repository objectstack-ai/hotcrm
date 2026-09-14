// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';
import { OpportunityLineItem } from '../objects/opportunity_line_item.object';
import { lineItemRecords } from './catalog.seed';
import { OPPORTUNITY_LINES } from '../../sales/data/sales.seed';

/**
 * Opportunity line item seed rows.
 *
 * `crm_opportunity_line_item` is a revenue object, so its seed rows are the
 * revenue package's (plan item 5: an item lives with the object it is authored
 * against) — while the LINES themselves stay with the opportunities they price.
 * `OPPORTUNITY_LINES` is read from `src/sales/data/sales.seed.ts` along the
 * revenue -> sales edge, and it has to be: the same table is what
 * `dealValue()` derives every opportunity's `amount` from, so a second copy
 * here would be a second answer to what a deal is worth.
 *
 * ─── Opportunity line items ───────────────────────────────────────────
 * Identity is the COMPOSITE natural key (opportunity, product): the object has
 * no single natural key — no name, and `line_number` is only unique within a
 * parent — and a junction-shaped dataset without one can only run
 * `mode: 'insert'`, which re-inserts every row on each replay boot and
 * duplicates the table (framework#3434). The loader matches composite key
 * fields by their RESOLVED ids, so this dedupes correctly across restarts.
 * The practical constraint it imposes: a product appears at most once per
 * deal, which is how these lines are authored anyway.
 */
export const opportunityLineItems = defineSeed(OpportunityLineItem, {
  mode: 'upsert',
  externalId: ['crm_opportunity', 'crm_product'],
  records: lineItemRecords('crm_opportunity', OPPORTUNITY_LINES),
});
