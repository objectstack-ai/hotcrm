// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Sales Order Line (REQ-0010, hotcrm#2555).
 *
 * One line of an order, with the ten fields of the quote line
 * (`src/revenue/objects/quote_line_item.object.ts`), so a later step copies an
 * accepted quote's lines onto an order one to one (B2).
 *
 * Two differences from the quote line, both because the order lives in the app
 * package and the product catalogue does not:
 *
 * - **The product is optional, and the title is typed when there is none.**
 *   With the quote-and-product module disabled the product picker is empty
 *   (an accepted limit of the card, like the task's case lookup), so a line is
 *   named and priced by hand. With a product, `sales_order_line_fill` writes
 *   its name and list price unless the same write typed a title.
 * - **A line takes the product's own list price, not a price book's** (the
 *   card's second accepted limit): price books belong to the quote module.
 */
export const SalesOrderLine = ObjectSchema.create({
  name: 'crm_sales_order_line',
  label: 'Order Line',
  pluralLabel: 'Order Lines',
  icon: 'package',
  description: 'A single line on an order',

  // Record access derives from the order (ADR-0055), as a quote line's does
  // from its quote: reads are filtered to lines whose order the caller can
  // read, and a write needs edit on the order.
  sharingModel: 'controlled_by_parent',

  // No New on the lines of an order past Draft: `sales_order_workflow` refuses
  // that write, so the button would only lead to the refusal. A related list's
  // create toolbar evaluates this against the HOST record, the order.
  userActions: {
    create: {
      visibleWhen: P`!has(record.status) || record.status == "draft"`,
    },
  },
  nameField: 'product_title',
  searchableFields: ['product_title', 'description'],
  highlightFields: ['crm_product', 'quantity', 'unit_price', 'total_price'],

  // The quote line's two-group split (#1453).
  fieldGroups: [
    { key: 'basic',   label: 'Line', icon: 'package' },
    { key: 'pricing', label: 'Pricing', icon: 'dollar-sign' },
  ],

  fields: {
    // The order's lines go with it (the quote line's #727 reasoning).
    crm_sales_order: Field.masterDetail('crm_sales_order', {
      label: 'Order',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      // The lines panel on an order. The title, not the product, leads: a
      // line typed by hand has no product.
      relatedListColumns: ['line_number', 'product_title', 'quantity', 'unit_price', 'discount', 'total_price'],
    }),

    // Optional (see the header). `restrict`, as the quote line's required
    // lookup resolves to: a product that was ordered is not deleted under its
    // order history.
    crm_product: Field.lookup('crm_product', {
      label: 'Product',
      group: 'basic',
      deleteBehavior: 'restrict',
    }),

    // The line's title: the product's name, written by `sales_order_line_fill`
    // when the write names a product and types no title, and typed otherwise.
    product_title: Field.text({
      label: 'Product Title',
      group: 'basic',
      maxLength: 300,
      description: "What this line sells. Filled from the product when one is chosen; type it when there is none.",
    }),

    description: Field.text({
      label: 'Description',
      group: 'basic',
      maxLength: 500,
    }),

    // A count of units, so a whole number (#2370 row 8).
    quantity: Field.number({
      label: 'Quantity',
      group: 'pricing',
      required: true,
      storage: { notNull: true },
      scale: 0,
      min: 0,
      defaultValue: 1,
      trackHistory: true,
    }),

    // Written from the product by `sales_order_line_fill`; never typed.
    list_price: Field.currency({
      label: 'List Price',
      group: 'pricing',
      readonly: true,
      description: "The product's list price when it was put on this line.",
    }),

    // A NOT NULL column the server fills from the product when left blank, ⛔
    // not `required` (#2060 item 7b: a required field makes the form demand
    // what the server would fill). With no product it must be typed, and
    // `sales_order_line_fill` says so.
    unit_price: Field.currency({
      label: 'Sales Price',
      group: 'pricing',
      storage: { notNull: true },
      trackHistory: true,
    }),

    discount: Field.percent({
      label: 'Discount %',
      group: 'pricing',
      scale: 2,
      min: 0,
      max: 100,
      defaultValue: 0,
      trackHistory: true,
    }),

    subtotal: Field.formula({
      label: 'Subtotal',
      group: 'pricing',
      returnType: 'currency',
      expression: F`record.quantity * record.unit_price * (1 - record.discount / 100)`,
    }),

    // A line carries no tax (#2069): Total is the subtotal's expression, not
    // a read of `subtotal` (a formula reading a formula depends on hydration
    // order).
    total_price: Field.formula({
      label: 'Total',
      group: 'pricing',
      returnType: 'currency',
      expression: F`record.quantity * record.unit_price * (1 - record.discount / 100)`,
    }),

    line_number: Field.number({
      label: 'Line #',
      group: 'basic',
      scale: 0,
      readonly: true,
    }),
  },

  indexes: [
    { fields: ['crm_sales_order'] },
    { fields: ['crm_product'] },
  ],

  // Predicates below are TOTAL (AGENTS.md).
  validations: [
    {
      name: 'unit_price_positive',
      type: 'script',
      severity: 'error',
      message: 'Sales price cannot be negative',
      condition: P`has(record.unit_price) && record.unit_price != null && record.unit_price < 0`,
    },
    {
      name: 'product_or_title',
      type: 'script',
      severity: 'error',
      message: 'Choose a product or type a Product Title',
      condition: P`(!has(record.crm_product) || isBlank(record.crm_product)) && (!has(record.product_title) || isBlank(record.product_title))`,
    },
  ],
});
