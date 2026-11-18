// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel, expression } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from '../../sales/flows/_guarded-iteration';
import { QUOTE_ACCEPTED_NOW } from './quote-accepted-contract-draft.flow';
type Flow = Automation.Flow;

/**
 * The value on the accepted quote, or `null` when it has none — the shape an
 * optional order field takes (`crm_sales_order` declares every one of these
 * optional). A raw driver row is sparse, so each read is `has()`-guarded.
 * Spliced with `expression()`: the `cel` tag JSON-quotes an interpolated string.
 */
const fromQuote = (field: string) => expression(`has(record.${field}) ? record.${field} : null`, 'cel');
/** The same for the line being copied. */
const fromLine = (field: string) => expression(`has(currentLine.${field}) ? currentLine.${field} : null`, 'cel');

/**
 * Accepted quote creates an order (REQ-0010 rule 1, hotcrm#2558).
 *
 * When a quote becomes Accepted, a draft order is created with the quote's
 * header and lines copied, so the order appears by itself and the rep's path
 * gains no step (the order plan's usability rule 1). The order is the spine of
 * the deal; the contract is optional, drafted from the order on demand (Draft
 * Contract) or, if an administrator switches `quote_accepted_contract_draft`
 * on, for every accepted quote as before.
 *
 * A packaged flow, so an administrator can switch it off (Setup → Flows →
 * Enabled); it ships ON. The switch is the installation's and survives a
 * restart and an upgrade (`test/quote-accepted-flow-switch.test.ts`).
 *
 * ## One order per accepted quote
 *
 * It fires on the write that moves a quote to Accepted, and before creating
 * anything it looks for an order whose Source Quote is this quote: a quote
 * accepted, moved off Accepted by a system write and accepted again still has
 * exactly one order. The Source Quote is `readonly`, so no person can move it
 * and open the way to a second.
 *
 * ## What is copied
 *
 * - The header: name, account, contact, opportunity, owner, the four pricing
 *   inputs (`subtotal`, `discount`, `tax`, `shipping_handling`), payment terms,
 *   both addresses and the description. `discount_amount` and `total_price`
 *   are `sales_order_workflow`'s to derive from them (the quote header's one
 *   formula), and the quote's stored figures are read by `get_quote` after the
 *   accepting write, not off the trigger's pre-image (the #2503 race).
 * - Every line, one to one: product, title, description, quantity, list price,
 *   sales price and discount. `sales_order_total_rollup` sums the lines into
 *   the order's subtotal with the formula `quote_total_rollup` uses, so the
 *   order's totals are the quote's. A line that names a product takes the
 *   product's current list price (`sales_order_line_fill`, #2555); the sales
 *   price, which the totals read, is the quote's. The lines are numbered in
 *   the order they are read.
 * - ⛔ Not copied: the quote's dates, status, shipping terms, price book and
 *   internal notes. The order has its own date (today) and status (Draft).
 *
 * ## `runAs: 'system'`
 *
 * Three reasons, each a write the accepting person could not make as
 * themselves: the Source Quote is `readonly`, and the engine drops a read-only
 * key the CALLER sends, which a `user` run is; the one-order check must see
 * every order of the quote, not only the ones the accepter can read; and a
 * quote can be accepted by anyone entitled to accept it, or by a system write
 * (an import), none of which says they may create orders. The order is the
 * business's record of the sale. Elevation is not anonymity: the run carries
 * the accepter, so the order's `created_by` names them, and its owner is the
 * quote's owner (or, for a quote with none, the accepter).
 *
 * Organization (AGENTS.md rule 10): its reads are the triggering quote by id
 * and the orders and lines of that one quote, so there is no scan to pin; an
 * elevated run carries the trigger's organization onto every insert.
 *
 * A failed run is recorded on the run and never refuses the acceptance. Each
 * line is copied in its own guarded iteration, so a line the order refuses is
 * logged on the run and the others are still copied.
 */
export const QuoteAcceptedOrderFlow: Flow = {
  name: 'quote_accepted_order',
  label: 'Accepted Quote Creates an Order',
  description: 'When a quote is accepted, create a draft order with the quote’s header and lines, once per quote.',
  type: 'record_change',
  status: 'active',
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (quote accepted)',
      config: { objectName: 'crm_quote', triggerType: 'record-after-update', condition: QUOTE_ACCEPTED_NOW },
    },
    {
      id: 'find_order', type: 'get_record', label: 'Order Already Created?',
      config: { objectName: 'crm_sales_order', filter: { crm_quote: cel`record.id` }, outputVariable: 'existingOrder' },
    },
    {
      // The quote as STORED after the accepting write (#2503).
      id: 'get_quote', type: 'get_record', label: 'Get Accepted Quote',
      config: { objectName: 'crm_quote', filter: { id: cel`record.id` }, outputVariable: 'storedQuote' },
    },
    {
      id: 'create_order', type: 'create_record', label: 'Create Order',
      config: {
        objectName: 'crm_sales_order',
        fields: {
          // The quote's name is data the rep typed, not text this app writes:
          // copied as it is, in whatever language it was typed.
          name: cel`vars.storedQuote.name`,
          crm_account: cel`record.crm_account`,
          crm_contact: fromQuote('crm_contact'),
          crm_opportunity: fromQuote('crm_opportunity'),
          owner_id: cel`has(record.owner_id) && record.owner_id != null && record.owner_id != "" ? record.owner_id : null`,
          status: 'draft',
          order_date: cel`isoDate(today())`,
          subtotal: cel`has(vars.storedQuote.subtotal) ? vars.storedQuote.subtotal : null`,
          discount: cel`has(vars.storedQuote.discount) ? vars.storedQuote.discount : null`,
          tax: cel`has(vars.storedQuote.tax) ? vars.storedQuote.tax : null`,
          shipping_handling: cel`has(vars.storedQuote.shipping_handling) ? vars.storedQuote.shipping_handling : null`,
          payment_terms: fromQuote('payment_terms'),
          billing_address: fromQuote('billing_address'),
          shipping_address: fromQuote('shipping_address'),
          description: fromQuote('description'),
          crm_quote: cel`record.id`,
        },
        outputVariable: 'order',
      },
    },
    {
      id: 'get_lines', type: 'get_record', label: 'Get Quote Lines',
      config: { objectName: 'crm_quote_line_item', filter: { crm_quote: cel`record.id` }, limit: 1000, outputVariable: 'quoteLines' },
    },
    {
      id: 'copy_lines', type: 'loop', label: 'Copy Each Line',
      config: {
        collection: cel`quoteLines`,
        iteratorVariable: 'currentLine',
        body: guarded('line', {
          nodes: [
            {
              id: 'create_line', type: 'create_record', label: 'Copy Line',
              config: {
                objectName: 'crm_sales_order_line',
                fields: {
                  crm_sales_order: cel`order.id`,
                  crm_product: fromLine('crm_product'),
                  product_title: fromLine('product_title'),
                  description: fromLine('description'),
                  quantity: fromLine('quantity'),
                  list_price: fromLine('list_price'),
                  unit_price: fromLine('unit_price'),
                  discount: fromLine('discount'),
                },
              },
            },
          ],
          edges: [],
        }),
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'find_order', type: 'default' },
    // Complementary conditionals off the read: `find_order` binds the order or
    // `null` on every path, so neither side takes a `has()` guard.
    { id: 'e2', source: 'find_order', target: 'end', type: 'conditional', condition: P`vars.existingOrder != null`, label: 'Already created' },
    { id: 'e3', source: 'find_order', target: 'get_quote', type: 'conditional', condition: P`vars.existingOrder == null`, label: 'None yet' },
    { id: 'e4', source: 'get_quote', target: 'create_order', type: 'default' },
    { id: 'e5', source: 'create_order', target: 'get_lines', type: 'default' },
    { id: 'e6', source: 'get_lines', target: 'copy_lines', type: 'default' },
    { id: 'e7', source: 'copy_lines', target: 'end', type: 'default' },
  ],
};
