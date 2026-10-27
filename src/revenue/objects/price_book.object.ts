// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { P } from '@objectstack/spec';

/**
 * Price Book
 *
 * A named list of product prices (REQ-0009, phase 1): the standard list every
 * rep quotes from, a partner or tier price, a regional price, a promotion with
 * a validity window. Its prices are the `crm_price_book_entry` rows under it.
 *
 * Exactly one book is the STANDARD book (`is_standard`), and the seed builds it
 * from every catalogue product's `list_price` (`src/revenue/data/price-book.seed.ts`).
 * `crm_product.list_price` stays the standard book's source and keeps its
 * `≥ cost` rule. `price_book.hook.ts` keeps the standard book single.
 *
 * ⛔ No currency of its own: multi-currency waits for the platform
 * (objectstack#8345, REQ-0009 *Disposition* D). Every amount in a book is in
 * the tenant default currency, like every other amount in HotCRM.
 *
 * Phase 1 is the objects only. The quote's book lookup and line pricing from a
 * book are the next card (#2318).
 */
export const PriceBook = ObjectSchema.create({
  name: 'crm_price_book',
  label: 'Price Book',
  pluralLabel: 'Price Books',
  icon: 'book-open',
  description: 'A named list of product prices: the standard list, a partner or regional tier, or a promotion',

  // ADR-0090 D1/D7: OWD is an authored decision. Like the product catalogue, a
  // price book is visible to everyone who quotes and edited by its owner (or a
  // holder of Modify All). REQ-0009 phase 1 names `public_read`.
  sharingModel: 'public_read',
  nameField: 'name',
  searchableFields: ['name'],
  // Not the validity dates: the strip is hoisted out of the detail body, and
  // with both dates in it the Validity group would vanish from detail pages
  // (`field-group-shadowed`).
  highlightFields: ['is_standard', 'is_active'],

  fieldGroups: [
    { key: 'basic',    label: 'Price Book Information', icon: 'info' },
    { key: 'validity', label: 'Validity',               icon: 'calendar' },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    // Unlike the catalogue it is a permission boundary here: under
    // `public_read` a sales manager edits the books they own.
    owner_id: Field.lookup('sys_user', {
      label: 'Price Book Owner',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    name: Field.text({
      label: 'Price Book Name',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    description: Field.textarea({
      label: 'Description',
      group: 'basic',
    }),

    is_active: Field.boolean({
      label: 'Active',
      group: 'basic',
      defaultValue: true,
      trackHistory: true,
    }),

    // At most one book carries it, and once one does there stays one: the
    // `price_book_standard` hook beside this file refuses a second standard
    // book, clearing the flag on the standard book, and deleting it.
    is_standard: Field.boolean({
      label: 'Standard',
      group: 'basic',
      defaultValue: false,
      trackHistory: true,
    }),

    valid_from: Field.date({
      label: 'Valid From',
      group: 'validity',
    }),

    valid_to: Field.date({
      label: 'Valid To',
      group: 'validity',
    }),
  },

  indexes: [
    { fields: ['name'] },
    { fields: ['is_standard'] },
    { fields: ['is_active'] },
  ],

  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },

  // Predicates below are TOTAL (AGENTS.md, test/object-validation-predicates.test.ts).
  validations: [
    {
      // An invariant (Metadata semantics rule 7): a window that ends before it
      // starts is never a valid window. Open-ended on either side is allowed.
      name: 'valid_to_after_valid_from',
      type: 'script',
      severity: 'error',
      message: 'Valid To must be on or after Valid From',
      condition: P`has(record.valid_from) && record.valid_from != null && has(record.valid_to) && record.valid_to != null && record.valid_to < record.valid_from`,
    },
  ],
});
