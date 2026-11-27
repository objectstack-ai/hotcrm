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
const rowsOf = (stack: AnyRec): { locale: string; key: string; row?: AnyRec }[] => {
  const rows: { locale: string; key: string; row?: AnyRec }[] = [];
  for (const bundle of (stack.translations ?? []) as AnyRec[]) {
    for (const [locale, pack] of Object.entries(bundle) as [string, AnyRec][]) {
      for (const ns of NAMESPACES) {
        for (const [name, row] of Object.entries(pack[ns] ?? {})) rows.push({ locale, key: `${ns}:${name}`, row: row as AnyRec });
      }
      for (const nid of Object.keys(pack.apps?.[APP_NAME]?.navigation ?? {})) rows.push({ locale, key: `nav:${nid}` });
    }
  }
  return rows;
};

const modules = stacks.filter((s) => s.manifest.type === 'module');

/**
 * The fields a package contributes to another package's object through
 * `objectExtensions` (Order to Cash's totals on `crm_contract` / `crm_account`,
 * #2416). Their labels belong in the contributing module's pack: they come and
 * go with the module, exactly like its own objects.
 */
const extensionFieldsOf = (stack: AnyRec, objectName: string): Set<string> =>
  new Set(
    ((stack.objectExtensions ?? []) as AnyRec[])
      .filter((ext) => ext.extend === objectName)
      .flatMap((ext) => Object.keys(ext.fields ?? {})),
  );

/** The validation rules a package contributes to another package's object (Order to Cash's re-confirm floor on `crm_sales_order`, #2827). */
const extensionValidationsOf = (stack: AnyRec, objectName: string): Set<string> =>
  new Set(
    ((stack.objectExtensions ?? []) as AnyRec[])
      .filter((ext) => ext.extend === objectName)
      .flatMap((ext) => ((ext.validations ?? []) as AnyRec[]).map((rule) => String(rule.name))),
  );

/**
 * A row that labels ONLY fields this package contributes to that object, and
 * the messages of the validation rules it contributes, and nothing of the
 * object itself.
 */
const labelsOnlyOwnExtensionFields = (stack: AnyRec, key: string, row: AnyRec | undefined): boolean => {
  if (!key.startsWith('objects:') || !row) return false;
  const objectName = key.slice('objects:'.length);
  const contributed = extensionFieldsOf(stack, objectName);
  if (contributed.size === 0) return false;
  const rules = extensionValidationsOf(stack, objectName);
  const fieldNames = Object.keys(row.fields ?? {});
  return Object.keys(row).every((k) => k === 'fields' || k === '_validations')
    && fieldNames.length > 0
    && fieldNames.every((f) => contributed.has(f))
    && Object.keys(row._validations ?? {}).every((r) => rules.has(r));
};

describe('locale packs: each package translates only what it registers (#2352)', () => {
  it('reads six modules and the app, and every module with objects registers a bundle in the app\'s four locales', () => {
    expect(modules.map(idOf).sort()).toEqual([
      'app.objectstack.hotcrm.expense', 'app.objectstack.hotcrm.marketing', 'app.objectstack.hotcrm.o2c', 'app.objectstack.hotcrm.psa',
      'app.objectstack.hotcrm.revenue', 'app.objectstack.hotcrm.service',
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

  it('a module labels the fields it contributes to another package\'s object, in every locale', () => {
    // The positive control for the extension-field allowance below.
    const o2c = modules.find((s) => idOf(s) === 'app.objectstack.hotcrm.o2c')!;
    for (const locale of ['en', 'zh-CN', 'es-ES', 'ja-JP']) {
      for (const objectName of ['crm_contract', 'crm_account', 'crm_sales_order']) {
        const row = rowsOf(o2c).find((r) => r.locale === locale && r.key === `objects:${objectName}`)?.row;
        expect(Object.keys(row?.fields ?? {}).sort(), `${locale} ${objectName}`)
          .toEqual([...extensionFieldsOf(o2c, objectName)].sort());
        // And the messages of the rules it contributes there (#2827).
        expect(Object.keys(row?._validations ?? {}).sort(), `${locale} ${objectName} _validations`)
          .toEqual([...extensionValidationsOf(o2c, objectName)].sort());
      }
    }
  });

  it('no pack carries a row for an item another package registers', () => {
    const strays: string[] = [];
    for (const stack of stacks) {
      for (const { locale, key, row } of rowsOf(stack)) {
        const registeredBy = owner.get(key);
        // A module labels the fields it contributes to another package's
        // object; anything else in that row (the object's label, a field it
        // does not contribute) is still a stray.
        if (registeredBy !== idOf(stack) && labelsOnlyOwnExtensionFields(stack, key, row)) continue;
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
