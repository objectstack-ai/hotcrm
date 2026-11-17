// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales order seeds (REQ-0010, hotcrm#2555). Seed doctrine lives in
 * `./_shared.ts`.
 *
 * Three orders, one per shape the plan's sample scenarios name:
 *
 * - **Acme Annual Renewal 2025 Order** — the renewal deal's order under the
 *   activated subscription contract, completed: the contract holds the terms,
 *   the order what was bought this year.
 * - **Globex Seat Expansion Order** — a product sale with no quote and no
 *   contract (rule 6: an order can be created without a quote), confirmed and
 *   partly shipped.
 * - **Initech Scanner Kit Order** — a draft whose lines are typed by hand,
 *   things the catalogue does not sell.
 *
 * ⛔ The lines name no product. Each carries the title and price it was
 * ordered at, so the demo works with the quote-and-product module disabled,
 * and no app-package seed reaches into that module's rows. A line picked from
 * the catalogue in the console links its product as usual.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { SalesOrder } from '../objects/sales_order.object';
import { SalesOrderLine } from '../objects/sales_order_line.object';
import { linesTotal } from './_shared';
import { SEED_EN_LOCALES } from './_locale';

/** An order line as seeded: a typed title and price, no product. */
type OrderLineSpec = {
  readonly title: string;
  readonly quantity: number;
  readonly unit_price: number;
  readonly discount?: number;
  readonly description: string;
};

/** The lines, keyed by order name. */
const ORDER_LINES: Record<string, readonly OrderLineSpec[]> = {
  // The renewal deal's own lines (`OPPORTUNITY_LINES['Acme Annual Renewal 2025']`).
  'Acme Annual Renewal 2025 Order': [
    { title: 'ObjectStack Platform', quantity: 3, unit_price: 50000, description: 'Renewal of the three production tenants.' },
    { title: 'Premium Support', quantity: 1, unit_price: 25000, description: 'Premium support renewal.' },
    { title: 'AI Agent Seat (Annual)', quantity: 45, unit_price: 1000, description: 'Seat expansion driven by the new EMEA team.' },
  ],
  'Globex Seat Expansion Order': [
    { title: 'AI Agent Seat (Annual)', quantity: 10, unit_price: 1000, description: 'Ten more seats for the plant operations leads.' },
    { title: 'Admin Training Workshop', quantity: 2, unit_price: 6000, discount: 10, description: 'Two workshop days for the new seat holders.' },
  ],
  'Initech Scanner Kit Order': [
    { title: 'Barcode scanner kit', quantity: 4, unit_price: 450, description: 'Handheld scanners for the warehouse desk.' },
    { title: 'On-site installation', quantity: 1, unit_price: 1200, description: 'One technician visit to set the scanners up.' },
  ],
};

/** The header figures, derived from the lines with the hooks' own model. */
const orderTotals = (orderName: string, opts: { discount: number; tax: number; shipping_handling: number }) => {
  const lines = ORDER_LINES[orderName];
  if (!lines) throw new Error(`Seed error: no lines authored for order "${orderName}"`);
  const subtotal = linesTotal(lines.map((l) => ({ ...l, product: l.title })));
  const discount_amount = Math.round(subtotal * (opts.discount / 100) * 100) / 100;
  const total_price = Math.round((subtotal - discount_amount + opts.tax + opts.shipping_handling) * 100) / 100;
  return { subtotal, discount: opts.discount, discount_amount, tax: opts.tax, shipping_handling: opts.shipping_handling, total_price };
};

// `order_number` is a runtime-owned autonumber and is NOT seeded (#490); the
// order name is the seed identity. INSERT-ONCE (`mode: 'ignore'`, #2139): a
// rep moves an order on and edits it, and `upsert` would write it back.
export const salesOrders = defineSeed(SalesOrder, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: 'name',
  records: [
    {
      name: 'Acme Annual Renewal 2025 Order',
      crm_account: 'Acme Corporation',
      crm_contact: 'john.smith@acme.example.com',
      crm_opportunity: 'Acme Annual Renewal 2025',
      // The activated contract, named by its seed identity (its description).
      crm_contract: 'Annual platform subscription with premium support tier.',
      status: 'completed',
      order_date: cel`daysAgo(15)`,
      customer_po_number: 'ACME-PO-2025-0417',
      // The renewal quote's figures: no discount, 8.5% tax.
      ...orderTotals('Acme Annual Renewal 2025 Order', { discount: 0, tax: 18700, shipping_handling: 0 }),
      payment_terms: 'net_30',
      fulfillment_status: 'shipped',
      shipped_date: cel`daysAgo(1)`,
      description: 'This year of the platform subscription: three tenants, premium support and the EMEA seats.',
    },
    {
      name: 'Globex Seat Expansion Order',
      crm_account: 'Globex Industries',
      crm_contact: 'sarah.j@globex.example.com',
      status: 'confirmed',
      order_date: cel`daysAgo(6)`,
      customer_po_number: 'GLX-4471',
      ...orderTotals('Globex Seat Expansion Order', { discount: 0, tax: 1664, shipping_handling: 0 }),
      payment_terms: 'net_60',
      fulfillment_status: 'partially_shipped',
      shipped_date: cel`daysAgo(2)`,
      description: 'Seats ordered straight from the plant operations team, without a quote.',
    },
    {
      name: 'Initech Scanner Kit Order',
      crm_account: 'Initech Solutions',
      crm_contact: 'mchen@initech.example.com',
      status: 'draft',
      order_date: cel`daysAgo(1)`,
      ...orderTotals('Initech Scanner Kit Order', { discount: 0, tax: 240, shipping_handling: 80 }),
      payment_terms: 'net_30',
      fulfillment_status: 'not_shipped',
      description: 'Warehouse scanners, typed in by hand while the customer confirms the count.',
    },
  ],
});

// (order, title) is the natural key: a line has no name of its own.
export const salesOrderLines = defineSeed(SalesOrderLine, {
  mode: 'ignore',
  locale: SEED_EN_LOCALES,
  externalId: ['crm_sales_order', 'product_title'],
  records: Object.entries(ORDER_LINES).flatMap(([order, lines]) =>
    lines.map((l, i) => ({
      crm_sales_order: order,
      // Seeded, as the quote lines' are: a no-user write keeps its own
      // ordinal, and a batch insert would otherwise number across orders.
      line_number: i + 1,
      product_title: l.title,
      quantity: l.quantity,
      unit_price: l.unit_price,
      discount: l.discount ?? 0,
      description: l.description,
    })),
  ),
});
