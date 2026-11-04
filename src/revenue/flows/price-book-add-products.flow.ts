// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from '../../sales/flows/_guarded-iteration';
type Flow = Automation.Flow;

/**
 * Add Products — screen flow that prices the catalogue in a price book in one
 * pass (REQ-0009 phase 3, #2318).
 *
 * Launched from the Add Products action on a price book
 * (`add_price_book_products`, `price_book.actions.ts`); the console's
 * flow-action trigger sends `{ recordId, objectName }`, as for Enroll Members.
 * The person names one figure, the book's price as a percentage of each
 * product's List Price (80 for a partner tier 20% under it, 110 for a region
 * priced above it), and every ACTIVE product the book does not price yet gets
 * an entry at that price, rounded to the cent. Products the book already
 * prices are left as they are, so a second run tops the book up after new
 * products arrive instead of repricing it; an entry is repriced on the book's
 * own Price Book Entries list.
 *
 * Every entry is inserted AS THE CALLER (`runAs: 'user'`, AGENTS.md rule 9):
 * the entry's own permissions decide, so a sales manager adds products to the
 * books they own, and a product refused for any reason is counted, not lost.
 * The guarded iteration contains each refusal, and a run that refused any
 * ends `refused` with the three counts, as `campaign_enrollment` does.
 *
 * `percentOfList` is a `number` with `min` / `max`, not a `percent`: it is a
 * multiplier that may pass 100, and on 18.3.0 the console posts a `percent`
 * screen field as a string, so its bound would not hold there
 * (objectstack-ai/objectstack#30178). The engine judges the bound on resume
 * before the run is consumed, so a corrected answer can be resubmitted.
 *
 * ⛔ Never a `schedule` flow: a cron firing seeds no `recordId`.
 */
export const PriceBookAddProductsFlow: Flow = {
  name: 'price_book_add_products',
  label: 'Add Products to Price Book',
  description: 'Add every active product the price book does not price yet, at a percentage of its List Price.',
  type: 'screen',
  status: 'active',
  runAs: 'user',
  // The clean run's message; the result screen carries the counts (a screen
  // flow's `successMessage` cannot read the run's variables).
  successMessage: 'Products added to the price book.',

  variables: [
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    // Bound by the required screen field below, which reads its prefill
    // from this declaration.
    { name: 'percentOfList', type: 'number', isInput: true, isOutput: false, defaultValue: 100 },
    { name: 'addedCount', type: 'number', isInput: false, isOutput: false, defaultValue: 0 },
    { name: 'alreadyCount', type: 'number', isInput: false, isOutput: false, defaultValue: 0 },
    { name: 'refusedCount', type: 'number', isInput: false, isOutput: false, defaultValue: 0 },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_price_book' } },
    {
      id: 'get_book', type: 'get_record', label: 'Get Price Book',
      config: { objectName: 'crm_price_book', filter: { id: cel`recordId` }, outputVariable: 'bookRecord' },
    },
    { id: 'check_book', type: 'decision', label: 'Price Book Found?' },
    {
      // A `recordId` that names no book the caller can read. Translated as
      // `refusals.refuse_no_book.message` in the packs.
      id: 'refuse_no_book', type: 'end', label: 'Price Book Not Found',
      config: {
        outcome: 'refused',
        message: 'This price book no longer exists, or you cannot open it. No product was added.',
      },
    },
    {
      id: 'screen_1', type: 'screen', label: 'Price the Products',
      config: {
        description: 'Every active product that {{ bookRecord.name }} does not price yet gets an entry at this share of its List Price. Products it already prices keep their price.',
        fields: [
          {
            name: 'percentOfList', label: 'Price as % of List Price', type: 'number', required: true,
            defaultValue: cel`percentOfList`, min: 1, max: 1000, placeholder: '1-1000',
          },
        ],
      },
    },
    {
      id: 'get_products', type: 'get_record', label: 'Find Active Products',
      config: {
        objectName: 'crm_product',
        filter: { is_active: true, list_price: { $ne: null } },
        limit: 1000,
        outputVariable: 'productList',
      },
    },
    {
      id: 'loop_products', type: 'loop', label: 'Price Each Product',
      config: {
        collection: cel`productList`,
        iteratorVariable: 'currentProduct',
        body: guarded('product', {
          nodes: [
            {
              id: 'find_entry', type: 'get_record', label: 'Already Priced?',
              config: {
                objectName: 'crm_price_book_entry',
                filter: { crm_price_book: cel`recordId`, crm_product: cel`currentProduct.id` },
                outputVariable: 'existingEntry',
              },
            },
            { id: 'check_priced', type: 'decision', label: 'New Entry?' },
            {
              id: 'create_entry', type: 'create_record', label: 'Add Entry',
              config: {
                objectName: 'crm_price_book_entry',
                fields: {
                  crm_price_book: cel`recordId`,
                  crm_product: cel`currentProduct.id`,
                  // Rounded half-up to the cent: the List Price is never
                  // negative, so truncating `x + 0.5` is a rounding.
                  list_price: cel`double(int(double(currentProduct.list_price) * double(percentOfList) + 0.5)) / 100.0`,
                  is_active: true,
                },
              },
            },
            {
              id: 'count_added', type: 'assignment', label: 'Count Added',
              config: { assignments: { addedCount: cel`addedCount + 1` } },
            },
            {
              id: 'count_already', type: 'assignment', label: 'Count Already Priced',
              config: { assignments: { alreadyCount: cel`alreadyCount + 1` } },
            },
            { id: 'counted', type: 'assignment', label: 'Counted' },
          ],
          edges: [
            { id: 'b1', source: 'find_entry', target: 'check_priced', type: 'default' },
            { id: 'b2', source: 'check_priced', target: 'create_entry', type: 'conditional', condition: P`existingEntry == null`, label: 'New' },
            { id: 'b3', source: 'create_entry', target: 'count_added', type: 'default' },
            { id: 'b4', source: 'check_priced', target: 'count_already', type: 'conditional', condition: P`existingEntry != null`, label: 'Already priced' },
            { id: 'b5', source: 'count_added', target: 'counted', type: 'default' },
            { id: 'b6', source: 'count_already', target: 'counted', type: 'default' },
          ],
        }, { refusedCount: cel`refusedCount + 1` }),
      },
    },
    { id: 'check_refused', type: 'decision', label: 'Any Refused?' },
    {
      // Translated as `refusals.end_refused.message` in the packs.
      id: 'end_refused', type: 'end', label: 'Products Refused',
      config: {
        outcome: 'refused',
        message: '{{refusedCount}} products could not be added to the price book: {{addedCount}} added, {{alreadyCount}} already priced, {{refusedCount}} refused. Only the owner of a price book, or an administrator, can add its prices; the flow run log records why for each product.',
      },
    },
    {
      // Translated as `screens.result` in the packs.
      id: 'result', type: 'screen', label: 'Products Added',
      config: {
        description: '{{addedCount}} products added to {{ bookRecord.name }}, {{alreadyCount}} already priced there.',
        fields: [
          { name: 'bookLink', label: 'Price Book', type: 'record_link', reference: 'crm_price_book', defaultValue: cel`recordId` },
        ],
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_book', type: 'default' },
    { id: 'e2', source: 'get_book', target: 'check_book', type: 'default' },
    { id: 'e3', source: 'check_book', target: 'screen_1', type: 'conditional', condition: P`has(vars.bookRecord) && vars.bookRecord != null`, label: 'Found' },
    { id: 'e4', source: 'check_book', target: 'refuse_no_book', type: 'default', isDefault: true, label: 'Not found' },
    { id: 'e5', source: 'screen_1', target: 'get_products', type: 'default' },
    { id: 'e6', source: 'get_products', target: 'loop_products', type: 'default' },
    { id: 'e7', source: 'loop_products', target: 'check_refused', type: 'default' },
    { id: 'e8', source: 'check_refused', target: 'end_refused', type: 'conditional', condition: P`vars.refusedCount != 0`, label: 'Refused' },
    { id: 'e9', source: 'check_refused', target: 'result', type: 'default', isDefault: true, label: 'Clean' },
    { id: 'e10', source: 'result', target: 'end', type: 'default' },
  ],
};
