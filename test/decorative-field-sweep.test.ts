// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import stack from '../objectstack.config';
import { Product } from '../src/objects/product.object';
import { Case } from '../src/objects/case.object';
import { Task } from '../src/objects/task.object';
import { Contact } from '../src/objects/contact.object';
import { Campaign } from '../src/objects/campaign.object';
import { Account } from '../src/objects/account.object';
import { ProductViews } from '../src/views/product.view';
import { CaseViews } from '../src/views/case.view';
import { TaskViews } from '../src/views/task.view';
import { ContactViews } from '../src/views/contact.view';
import { CampaignViews } from '../src/views/campaign.view';
import { AccountViews } from '../src/views/account.view';
import { products } from '../src/data/catalog.seed';
import { ContactImportMapping } from '../src/mappings/contact_import.mapping';
import { AccountImportMapping } from '../src/mappings/account_import.mapping';
import { localePacks, type AnyRec } from './helpers/metadata-fixtures';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Enforce-or-remove, decided per field (#1182).
 *
 * A consumer scan found ten rows of declared-but-inert fields, and the
 * maintainer ruling of 2026-08-17 —「逐个 enforce-or-remove（推荐）」— asked for
 * a verdict on each rather than one verdict for the card. Nine rows were
 * removed. One was enforced, and the two halves of this file are the two
 * things that can regress:
 *
 *  1. every removed field stays removed **everywhere it was read** — object,
 *     view, all four locale bundles, seed data and import mapping. A removal
 *     that leaves a reader behind does not fail the build: a stale column
 *     renders empty, a stale locale row reads as coverage for a field that is
 *     not there, and a stale import column fails a customer's file at run time.
 *
 *  2. `crm_account.parent_account` — the one row that was KEPT — still has the
 *     consumer it was kept for, and that consumer still WORKS.
 *
 * Half 2 is the half worth arguing for, and it is not a metadata assertion.
 * The whole point of the enforce verdict is that the hierarchy stopped being
 * decorative, and a test that only checked `child_account_revenue` is declared
 * would pass just as happily on the day the platform stopped computing it —
 * which would put the field back in exactly the state this card removed nine
 * other fields for being in. So the roll-up is MEASURED against the real
 * engine, on the whole lifecycle rather than at insert alone: a roll-up that is
 * only right when the child is created is a stale number, which is the same
 * defect one layer over.
 */

// ───────────────────────────────────────── 1. the nine removals ──

/** Every removed field, against the object it was declared on. */
const REMOVED: Array<[string, AnyRec, readonly string[]]> = [
  ['crm_product', Product, ['quantity_on_hand', 'reorder_point', 'is_taxable', 'billing_type', 'unit_of_measure']],
  ['crm_case', Case, ['customer_signature', 'parent_case']],
  ['crm_task', Task, ['estimated_hours', 'actual_hours']],
  ['crm_contact', Contact, ['reports_to', 'birthdate']],
  ['crm_campaign', Campaign, ['parent_campaign']],
];

describe('the decorative fields are gone from their objects (#1182)', () => {
  it.each(REMOVED.flatMap(([object, schema, fields]) => fields.map((f) => [object, f, schema] as const)))(
    '%s.%s is no longer declared',
    (_object, field, schema) => {
      expect(Object.keys((schema as AnyRec).fields as AnyRec)).not.toContain(field);
    },
  );
});

describe('every reader of a removed field went with it (#1182)', () => {
  /**
   * The views are listed per object rather than as one blob so a failure names
   * the surface that kept the reference. `localePacks` covers all four
   * bundles at once — an English-only sweep is how three of these fields
   * survived a previous cleanup with their zh-CN / es-ES / ja-JP rows intact.
   */
  const SURFACES: Array<[string, unknown]> = [
    ['product object', Product], ['product views', ProductViews],
    ['case object', Case], ['case views', CaseViews],
    ['task object', Task], ['task views', TaskViews],
    ['contact object', Contact], ['contact views', ContactViews],
    ['campaign object', Campaign], ['campaign views', CampaignViews],
    ['account object', Account], ['account views', AccountViews],
    ['locale packs', localePacks],
    ['catalog seed', products],
    ['contact import mapping', ContactImportMapping],
  ];

  it.each(REMOVED.flatMap(([, , fields]) => fields))('%s is referenced by no shipped metadata', (field) => {
    const offenders = SURFACES
      .filter(([, value]) => JSON.stringify(value ?? null).includes(field))
      .map(([label]) => label);
    expect(offenders, `${field} still read by: ${offenders.join(', ')}`).toEqual([]);
  });

  /**
   * `low_stock` was a whole list view built on two of the removed fields — its
   * columns, its `less_than_or_equal` filter and its sort key were all
   * `quantity_on_hand` / `reorder_point` — so it could not outlive them. View
   * and switcher tab are asserted together: a tab pointing at a deleted view
   * and a view unreachable from any tab are two different broken states, and
   * this removal must produce neither.
   */
  it('drops the low_stock view and its switcher tab together', () => {
    expect(Object.keys(ProductViews.listViews ?? {})).not.toContain('low_stock');
    const tabViews = ((ProductViews.list?.tabs ?? []) as AnyRec[]).map((t) => t.view);
    expect(tabViews).not.toContain('low_stock');
    const declared = new Set(Object.keys(ProductViews.listViews ?? {}));
    for (const view of tabViews) {
      if (view === ProductViews.list?.name) continue;
      expect(declared, `tab points at missing view "${view}"`).toContain(view);
    }
  });

  /**
   * The import template is the one surface where a leftover row fails a
   * CUSTOMER rather than a developer: an unremoved `Birthdate` column would
   * keep asking for data the object can no longer store.
   *
   * Both halves of the template are asserted, because they are two files. The
   * mapping is metadata under `src/`; the sample CSV shipped to customers is
   * under `assets/import-templates/`, outside every `src/`-scoped scan — and it
   * is exactly where this removal was first left half-done. `import-mappings`
   * caught it by comparing the two, which is why that comparison exists; this
   * assertion names the field so a failure here says which removal regressed.
   */
  it('the contact import template no longer asks for a birthdate', () => {
    const targets = ((ContactImportMapping as AnyRec).fieldMapping ?? []).map((f: AnyRec) => f.target);
    expect(targets).not.toContain('birthdate');
    expect(targets).toContain('lead_source'); // positive control: the mapping still has columns

    const csv = readFileSync(join(REPO_ROOT, 'assets/import-templates/contacts.csv'), 'utf8');
    const headers = csv.split('\n')[0].split(',');
    expect(headers).not.toContain('Birthdate');
    expect(headers).toContain('Lead Source'); // positive control: the CSV still has headers
  });
});

// ──────────────────────────── 2. the one row that was ENFORCED ──

describe('the account hierarchy was kept because it now has a consumer (#1182)', () => {
  it('parent_account is still declared, and still importable', () => {
    expect(Object.keys(Account.fields as AnyRec)).toContain('parent_account');
    const targets = ((AccountImportMapping as AnyRec).fieldMapping ?? []).map((f: AnyRec) => f.target);
    expect(targets).toContain('parent_account');
  });

  it('child_account_revenue rolls up annual_revenue over the parent link', () => {
    const field = (Account.fields as AnyRec).child_account_revenue;
    expect(field?.type).toBe('summary');
    expect(field?.summaryOperations).toMatchObject({
      object: 'crm_account',
      field: 'annual_revenue',
      function: 'sum',
      relationshipField: 'parent_account',
    });
  });

  it('is on the account form, where a user can see the hierarchy do something', () => {
    expect(JSON.stringify(AccountViews)).toContain('child_account_revenue');
  });

  it('carries a label in all four locales', () => {
    for (const [locale, pack] of localePacks) {
      const label = (pack as AnyRec)?.objects?.crm_account?.fields?.child_account_revenue?.label;
      expect(label, `${locale} has no label for child_account_revenue`).toBeTruthy();
    }
  });
});

/**
 * The measurement, against the shipped stack on the real engine.
 *
 * Self-referencing roll-ups are the case worth measuring rather than assuming:
 * parent and child are the same object, and the engine's summary index is keyed
 * by CHILD object. All four legs were measured before the field was declared,
 * and they are re-measured here on every run.
 */
describe('the roll-up actually computes, and keeps computing (#1182)', () => {
  const SYS = { isSystem: true } as AnyRec;
  let kernel: AnyRec;
  let ql: AnyRec;
  const id: Record<string, string> = {};

  const insert = async (object: string, doc: AnyRec): Promise<string> => {
    const row = await ql.insert(object, doc, { context: SYS });
    return String(row?.id ?? row?.record?.id);
  };
  const rollup = async (): Promise<unknown> => {
    const rows = await ql.find('crm_account', { where: { id: id.parent } }, { context: SYS });
    return (rows as AnyRec[])[0]?.child_account_revenue;
  };
  const account = (name: string, extra: AnyRec = {}): AnyRec => ({
    name, type: 'customer', is_active: true, ...extra,
  });

  beforeAll(async () => {
    process.env.OS_REGISTRY_LOG ??= 'silent';
    kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
    await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
    await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_sweep' } as never));
    await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_sweep' } as never));
    // The app's own metadata is the subject. Seed data is skipped — the three
    // accounts below are the whole population, so the sums are unambiguous.
    await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
    await kernel.bootstrap();
    ql = kernel.getService('objectql');

    id.parent = await insert('crm_account', account('Global Parent'));
    id.childA = await insert('crm_account', account('Child A', { parent_account: id.parent, annual_revenue: 1000 }));
    id.childB = await insert('crm_account', account('Child B', { parent_account: id.parent, annual_revenue: 2500 }));
  }, 120000);

  afterAll(async () => {
    await kernel?.shutdown?.();
  });

  it('sums the direct children on insert', async () => {
    expect(await rollup()).toBe(3500);
  });

  it('follows a child whose revenue is edited', async () => {
    await ql.update('crm_account', { id: id.childA, annual_revenue: 4000 }, { context: SYS });
    expect(await rollup()).toBe(6500);
  });

  it('drops a child that is re-parented away', async () => {
    id.other = await insert('crm_account', account('Other Parent'));
    await ql.update('crm_account', { id: id.childB, parent_account: id.other }, { context: SYS });
    expect(await rollup()).toBe(4000);
  });

  it('drops a child that is deleted', async () => {
    await ql.delete('crm_account', { where: { id: id.childA }, context: SYS });
    expect(await rollup()).toBe(0);
  });
});
