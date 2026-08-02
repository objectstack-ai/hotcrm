// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Product catalogue seeds — and the two helpers that read prices back out of
 * it, so a line item's `list_price` can never disagree with the catalogue.
 *
 * Split out of the former monolithic `src/data/index.ts` (#635). Seed doctrine
 * lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { Product } from '../objects/product.object';
import type { LineSpec } from './_shared';

// ─── Products ─────────────────────────────────────────────────────────
// The catalog is what every line item below prices against, so it has to be
// wide enough to configure a realistic deal: an edition, an add-on, a
// per-seat subscription, support tiers and professional services. Four
// products could not (#591).
//
// `cost` is populated on every product: `cost_less_than_price` is a real
// validation rule that "has never once evaluated" while the field was blank
// everywhere, and margin is what the product-mix analytics are for. Every row
// keeps cost strictly below list price.
export const products = defineSeed(Product, {
  mode: 'upsert',
  externalId: 'name',
  records: [
    {
      name: 'ObjectStack Platform',
      description: 'The enterprise edition: unlimited objects, AI agents, governance and audit.',
      category: 'software',
      family: 'enterprise',
      sku: 'OS-PLAT-ENT',
      list_price: 50000,
      cost: 12000,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'ObjectStack Platform (SMB Edition)',
      description: 'The mid-market edition: core CRM objects and automation, capped agent usage.',
      category: 'software',
      family: 'smb',
      sku: 'OS-PLAT-SMB',
      list_price: 18000,
      cost: 4500,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'Cloud Hosting (Annual)',
      description: 'Managed hosting with regional data residency and a 99.9% availability target.',
      category: 'subscription',
      family: 'cloud',
      sku: 'OS-CLOUD-HOST',
      list_price: 12000,
      cost: 4200,
      billing_type: 'annual',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Sandbox Environment (Annual)',
      description: 'A full-copy non-production environment for testing metadata changes before release.',
      category: 'subscription',
      family: 'cloud',
      sku: 'OS-CLOUD-SBX',
      list_price: 7500,
      cost: 2600,
      billing_type: 'annual',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'AI Agent Seat (Annual)',
      description: 'A named-user seat for the Co-Pilot and agent surfaces, billed annually.',
      category: 'subscription',
      family: 'cloud',
      sku: 'OS-AI-SEAT',
      list_price: 1000,
      cost: 260,
      billing_type: 'annual',
      unit_of_measure: 'seat',
      is_active: true,
    },
    {
      name: 'Analytics Add-on',
      description: 'Dashboards, cubes and scheduled reporting for the revenue organization.',
      category: 'software',
      family: 'enterprise',
      sku: 'OS-ADDON-ANL',
      list_price: 22000,
      cost: 6500,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'Integration Connector Pack',
      description: 'Pre-built connectors for ERP, marketing automation and data warehouse targets.',
      category: 'software',
      family: 'enterprise',
      sku: 'OS-ADDON-INT',
      list_price: 16000,
      cost: 5200,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'Field Service Mobile',
      description: 'Offline-capable mobile app for field technicians and route-based service work.',
      category: 'software',
      family: 'smb',
      sku: 'OS-ADDON-FSM',
      list_price: 14000,
      cost: 4200,
      billing_type: 'annual',
      unit_of_measure: 'license',
      is_active: true,
    },
    {
      name: 'Premium Support',
      description: '24×7 support with a one-hour P1 response target and a named technical account manager.',
      category: 'support',
      family: 'services',
      sku: 'OS-SUP-PREM',
      list_price: 25000,
      cost: 9000,
      billing_type: 'annual',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Standard Support',
      description: 'Business-hours support with a next-business-day response target.',
      category: 'support',
      family: 'services',
      sku: 'OS-SUP-STD',
      list_price: 9000,
      cost: 3600,
      billing_type: 'annual',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Implementation Services',
      description: 'Guided implementation: discovery, metadata build, integration and go-live support.',
      category: 'service',
      family: 'services',
      sku: 'OS-SVC-IMPL',
      list_price: 75000,
      cost: 41000,
      billing_type: 'one_time',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Data Migration Services',
      description: 'Extraction, mapping and reconciliation of legacy CRM and spreadsheet data.',
      category: 'service',
      family: 'services',
      sku: 'OS-SVC-MIGR',
      list_price: 35000,
      cost: 19000,
      billing_type: 'one_time',
      unit_of_measure: 'each',
      is_active: true,
    },
    {
      name: 'Admin Training Workshop',
      description: 'A one-day workshop for administrators on metadata, permissions and analytics.',
      category: 'service',
      family: 'services',
      sku: 'OS-SVC-TRN',
      list_price: 6000,
      cost: 2400,
      billing_type: 'one_time',
      unit_of_measure: 'day',
      is_active: true,
    },
  ]
});

/**
 * Catalog price of a seeded product, read back from the dataset above so the
 * price lives in exactly one place.
 *
 * Line items carry `list_price` explicitly because hooks do NOT run over seeds
 * (#490): the shared price-fill hook (`_line-item-price-fill.ts`) is what
 * stamps `list_price` from `crm_product.list_price` on a real write, so a
 * seeded line has to arrive already carrying what that hook would have
 * written. Reading it from the catalog record makes that literally impossible
 * to get wrong.
 */
export const catalogPrice = (productName: string): number => {
  const product = products.records.find((r) => r.name === productName);
  if (!product || typeof product.list_price !== 'number') {
    throw new Error(`Seed error: no catalog product named "${productName}"`);
  }
  return product.list_price;
};

/**
 * Flatten a `{ parent → lines }` table into seed records for one line-item
 * object. `list_price` and `line_number` are the two fields a real write gets
 * from machinery a seed cannot count on (the price-fill hook, and the quote /
 * opportunity line editors), so both are materialised here — the row is then
 * correct whether or not the hook fires over a seed write (#617).
 */
export const lineItemRecords = <K extends string>(
  parentField: K,
  table: Record<string, readonly LineSpec[]>,
): Array<Record<string, unknown>> =>
  Object.entries(table).flatMap(([parent, lines]) =>
    lines.map((l, i) => ({
      [parentField]: parent,
      crm_product: l.product,
      description: l.description,
      quantity: l.quantity,
      list_price: catalogPrice(l.product),
      unit_price: l.unit_price,
      discount: l.discount ?? 0,
      line_number: i + 1,
    })),
  );
