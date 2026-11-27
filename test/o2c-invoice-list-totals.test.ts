// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { InvoiceViews } from '../src/o2c/views/invoice.view';

/**
 * Two findings of the Order to Cash phase 1a browser pass (hotcrm#2463).
 *
 * 1. A grid total over invoice `amount` counts cancelled invoices: All
 *    Invoices read 925,000 with a cancelled 480,000 inside it. Amount carries
 *    no total. Open carried one until hotcrm#2806 hid it with Paid and
 *    Overpaid (invoices and payments run in parallel), so the grid totals
 *    nothing.
 * 2. An import cell naming a billing milestone is looked up across every
 *    contract, not within the row's own (objectstack#33523), so a step name
 *    used on two contracts fails the row as `reference_ambiguous`. Until that
 *    ships, the import guide and the in-app manual say so and name the
 *    workaround (the step's record ID), in every language they are written in.
 */

type Col = { field: string; summary?: string };

describe('the All Invoices grid totals no cancelled figure', () => {
  const columns = (InvoiceViews as { list: { columns: Col[] } }).list.columns;

  it('never totals Amount, and shows no Paid, Open or Overpaid (hotcrm#2806)', () => {
    const byField = Object.fromEntries(columns.map((c) => [c.field, c]));
    expect(byField.amount, 'the grid shows Amount').toBeTruthy();
    expect(byField.amount.summary).toBeUndefined();
    for (const hidden of ['paid_amount', 'open_amount', 'overpaid_amount']) expect(byField[hidden]).toBeUndefined();
  });
});

describe('the import guide warns that a repeated step name fails the row', () => {
  const pages: [string, RegExp][] = [
    ['content/docs/(product)/order-to-cash/invoices-and-payments.mdx', /more than one contract fails the row[\s\S]*record ID/],
    ['content/docs/(product)/order-to-cash/invoices-and-payments.zh-Hans.mdx', /同名节点时，该行导入失败[\s\S]*记录 ID/],
    ['content/docs/(product)/order-to-cash/invoices-and-payments.zh-Hant.mdx', /同名節點時，該行匯入失敗[\s\S]*紀錄 ID/],
    ['src/o2c/docs/crm_o2c_invoices_payments.md', /more than one contract fails the row[\s\S]*record ID/],
    ['src/o2c/docs/crm_o2c_invoices_payments.zh.md', /同名节点时，该行导入失败[\s\S]*记录 ID/],
  ];

  it.each(pages)('%s', (path, warning) => {
    expect(readFileSync(join(REPO_ROOT, path), 'utf8')).toMatch(warning);
  });
});
