// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { packageStacks } from '../objectstack.composition';

/**
 * Each package's locale packs translate the items THAT package registers (#2352).
 *
 * A row in the app package's pack for a module's object, contributed nav id,
 * dashboard, dataset, page, flow, report or book is a row the app cannot
 * resolve once the module is absent: `os validate` refuses each one as
 * `translation-target-unknown`, and the compile stops (ledger rows R6, R7, R14,
 * M3, M4, S3, S4 of `docs/architecture/module-split-hard-edges.md`). So the row
 * lives in the module's own bundle (`src/MODULE/translations/`), which comes
 * and goes with the items it labels; the runtime deep-merges every package's
 * bundle per locale, so the console reads the same tree either way.
 *
 * This holds every package's packs to that, both ways:
 *  - a pack may not carry a row for an item another package registers;
 *  - an app pack's row for an app-registered item is fine — the crm_opportunity
 *    `generate_quote` action (the R14 half that stays) and the crm_lead /
 *    crm_contact rows (M9) are app objects, so they stay with the app.
 *
 * Ownership is read off the package stacks themselves, never a list kept here.
 */

type AnyRec = Record<string, any>;

const APP_NAME = 'crm_enterprise';
/** The translation namespaces keyed by the name of an item a stack registers. */
const NAMESPACES = ['objects', 'dashboards', 'datasets', 'pages', 'flows', 'reports', 'books'] as const;

const stacks = packageStacks as AnyRec[];
const idOf = (stack: AnyRec): string => stack.manifest.id;

/** `kind:name` → the id of the package that registers it. */
const owner = new Map<string, string>();
for (const stack of stacks) {
  for (const ns of NAMESPACES) {
    for (const item of (stack[ns] ?? []) as AnyRec[]) owner.set(`${ns}:${item.name}`, idOf(stack));
  }
  for (const contribution of (stack.manifest.navigationContributions ?? []) as AnyRec[]) {
    for (const item of (contribution.items ?? []) as AnyRec[]) owner.set(`nav:${item.id}`, idOf(stack));
  }
}
// The app's own navigation tree, at every depth (groups included).
const appStack = stacks.find((s) => s.manifest.type === 'app')!;
const walkNav = (nodes: AnyRec[] | undefined): void => {
  for (const node of nodes ?? []) {
    owner.set(`nav:${node.id}`, idOf(appStack));
    walkNav(node.children);
  }
};
for (const app of (appStack.apps ?? []) as AnyRec[]) walkNav(app.navigation);

/** Every `kind:name` key a package's bundles translate, per locale. */
const rowsOf = (stack: AnyRec): { locale: string; key: string }[] => {
  const rows: { locale: string; key: string }[] = [];
  for (const bundle of (stack.translations ?? []) as AnyRec[]) {
    for (const [locale, pack] of Object.entries(bundle) as [string, AnyRec][]) {
      for (const ns of NAMESPACES) {
        for (const name of Object.keys(pack[ns] ?? {})) rows.push({ locale, key: `${ns}:${name}` });
      }
      for (const nid of Object.keys(pack.apps?.[APP_NAME]?.navigation ?? {})) rows.push({ locale, key: `nav:${nid}` });
    }
  }
  return rows;
};

const modules = stacks.filter((s) => s.manifest.type === 'module');

describe('locale packs: each package translates only what it registers (#2352)', () => {
  it('reads four modules and the app, and every module with objects registers a bundle in the app\'s four locales', () => {
    expect(modules.map(idOf).sort()).toEqual([
      'app.objectstack.hotcrm.marketing', 'app.objectstack.hotcrm.o2c', 'app.objectstack.hotcrm.revenue',
      'app.objectstack.hotcrm.service',
    ]);
    const appLocales = Object.keys(Object.assign({}, ...((appStack.translations ?? []) as AnyRec[]))).sort();
    expect(appLocales).toEqual(['en', 'es-ES', 'ja-JP', 'zh-CN']);
    for (const stack of modules) {
      // Order to Cash registers nothing to translate before its phase 1 (#2315):
      // its one label, the menu group, is the app's. Its objects bring its pack.
      if (((stack.objects ?? []) as AnyRec[]).length === 0) continue;
      const locales = Object.keys(Object.assign({}, ...((stack.translations ?? []) as AnyRec[]))).sort();
      expect(locales, idOf(stack)).toEqual(appLocales);
    }
  });

  it('every module labels each object it registers in its own pack, in every locale', () => {
    // The positive control: the guard below asserts an absence, so this holds
    // that the module packs it reads really are populated.
    for (const stack of modules) {
      const own = new Set(rowsOf(stack).map((r) => `${r.locale}|${r.key}`));
      for (const locale of ['en', 'zh-CN', 'es-ES', 'ja-JP']) {
        for (const obj of (stack.objects ?? []) as AnyRec[]) {
          expect(own.has(`${locale}|objects:${obj.name}`), `${idOf(stack)} ${locale} objects.${obj.name}`).toBe(true);
        }
      }
    }
  });

  it('no pack carries a row for an item another package registers', () => {
    const strays: string[] = [];
    for (const stack of stacks) {
      for (const { locale, key } of rowsOf(stack)) {
        const registeredBy = owner.get(key);
        // A module may only translate what it registers; the app may also
        // translate items no package of this artifact registers (platform rows).
        const foreign = stack.manifest.type === 'module'
          ? registeredBy !== idOf(stack)
          : registeredBy !== undefined && registeredBy !== idOf(stack);
        if (foreign) strays.push(`${idOf(stack)} ${locale} ${key} (registered by ${registeredBy ?? 'nobody'})`);
      }
    }
    expect(strays).toEqual([]);
  });
});
