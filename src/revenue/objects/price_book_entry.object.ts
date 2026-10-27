// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';

/**
 * Price Book Entry
 *
 * One product's price in one price book (REQ-0009, phase 1). A book holds at
 * most one entry per product: `price_book_entry.hook.ts` refuses the second,
 * naming the book and the product.
 *
 * ⛔ No currency field: see `price_book.object.ts`.
 */
export const PriceBookEntry = ObjectSchema.create({
  name: 'crm_price_book_entry',
  label: 'Price Book Entry',
  pluralLabel: 'Price Book Entries',
  icon: 'tag',
  description: "One product's price in one price book",

  // ADR-0055: an entry is an attribute of its book, so record access derives
  // from `crm_price_book`, its one required `master_detail`. Every caller who
  // reads the book (`public_read`) reads its prices; a caller who may edit
  // the book may edit its entries.
  sharingModel: 'controlled_by_parent',

  // ADR-0079: a junction row has no derivable text title, so the record title
  // is a stored autonumber, as on `crm_campaign_member`.
  nameField: 'entry_number',
  // Not `is_active`: it is the one field of the group left in the detail body,
  // so the group keeps its heading there (`field-group-shadowed`).
  highlightFields: ['crm_price_book', 'crm_product', 'list_price'],

  fieldGroups: [
    { key: 'basic', label: 'Entry Information', icon: 'info' },
  ],

  fields: {
    entry_number: Field.autonumber({
      label: 'Entry Number',
      format: 'PBE-{00000}',
      group: 'basic',
    }),

    // The master. Cascade: an entry is a price IN a book and means nothing
    // without it.
    crm_price_book: Field.masterDetail('crm_price_book', {
      label: 'Price Book',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      // The entries panel on a book's detail page reads these first (the note
      // on `crm_campaign_member.crm_campaign`).
      relatedListColumns: ['crm_product', 'list_price', 'is_active'],
    }),

    // Cascade, not the default: a REQUIRED lookup left on `set_null` is
    // escalated to `restrict`, which would make every priced product
    // undeletable. A product that may be deleted (`product_catalog` refuses
    // one still on a line item) takes its prices with it.
    crm_product: Field.lookup('crm_product', {
      label: 'Product',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
    }),

    list_price: Field.currency({
      label: 'List Price',
      group: 'basic',
      min: 0,
      required: true,
      storage: { notNull: true },
    }),

    is_active: Field.boolean({
      label: 'Active',
      group: 'basic',
      defaultValue: true,
    }),
  },

  indexes: [
    { fields: ['crm_price_book', 'crm_product'] },
    { fields: ['crm_product'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },

  // Predicates below are TOTAL (AGENTS.md, test/object-validation-predicates.test.ts).
  validations: [
    {
      name: 'price_not_negative',
      type: 'script',
      severity: 'error',
      message: 'List Price cannot be negative',
      condition: P`has(record.list_price) && record.list_price != null && record.list_price < 0`,
    },
  ],
});
