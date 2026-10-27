// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import artifact from '../objectstack.config';
import composed from './helpers/composed-stack';

/**
 * Which package of the artifact owns what (ADR-0130 D4, #1907).
 *
 * HotCRM ships ONE release artifact carrying FOUR packages that share the `crm`
 * namespace: `app.objectstack.hotcrm` (`src/sales/index.ts`, the `type: 'app'`
 * package a customer installs) and three modules —
 * `app.objectstack.hotcrm.service` (`src/service/index.ts`),
 * `app.objectstack.hotcrm.revenue` (`src/revenue/index.ts`) and
 * `app.objectstack.hotcrm.marketing` (`src/marketing/index.ts`). Per-package ownership is what
 * `ObjectQL.registerApp` stamps on every object at install, what
 * `GET /api/v1/packages` reports, and what Studio groups by — so which package
 * an object lands in is a fact about this app, pinned here off the artifact
 * itself rather than off the source that is meant to produce it.
 *
 * The suites read `test/helpers/composed-stack.ts` — the same four package
 * stacks, flattened by the platform's own composition — because the artifact
 * carries no flattened collections beside `packages[]` (ADR-0130 D4, 2026-09-22
 * addendum). The last block holds the two views to the same contents, so that
 * view cannot drift from what actually ships.
 */

type AnyRec = Record<string, any>;

const APP_ID = 'app.objectstack.hotcrm';
const SERVICE_ID = 'app.objectstack.hotcrm.service';
const REVENUE_ID = 'app.objectstack.hotcrm.revenue';
const MARKETING_ID = 'app.objectstack.hotcrm.marketing';
const MODULE_IDS = [SERVICE_ID, REVENUE_ID, MARKETING_ID];

/** Each module's objects — `module-split-plan.md` decision 5. */
const SERVICE_OBJECTS = ['crm_article_feedback', 'crm_case', 'crm_knowledge_article'];
const REVENUE_OBJECTS = [
  'crm_contract', 'crm_opportunity_line_item', 'crm_price_book', 'crm_price_book_entry', 'crm_product', 'crm_quote',
  'crm_quote_line_item',
];
const MARKETING_OBJECTS = ['crm_campaign', 'crm_campaign_member'];
const MODULE_OBJECTS = [...SERVICE_OBJECTS, ...REVENUE_OBJECTS, ...MARKETING_OBJECTS];

/**
 * The assignment rule's one roster of deliberate exceptions (AGENTS.md rule 11):
 * module items the APP package registers because the platform judges the
 * reference to them one package at a time (objectstack#25514) — the other half
 * is `appRegisteredModuleItems` in `objectstack.composition.ts`. Maintainer
 * ruling 2026-10-24 on #2270, option 1. Of the four, only the dataset names
 * its object; the three flows carry no top-level object, so this sweep cannot
 * see them and `appRegisteredModuleItems` is their record. Emptied when a
 * published platform release carries #25514 and the four move to their
 * modules.
 */
const APP_REGISTERED_MODULE_ITEMS = [
  `${APP_ID}: dataset "product_metrics" is authored against crm_product`,
];

const bodies: AnyRec[] = (((artifact as AnyRec).packages ?? []) as AnyRec[]).map(
  (entry) => (entry?.manifest ?? {}) as AnyRec,
);
const body = (id: string): AnyRec => {
  const found = bodies.find((b) => b.id === id);
  if (!found) throw new Error(`the artifact carries no package "${id}"`);
  return found;
};
const namesOf = (items: unknown): string[] =>
  ((Array.isArray(items) ? items : []) as AnyRec[]).map((item) => String(item?.name)).sort();

describe('one artifact, four packages', () => {
  it('carries exactly the three modules and the app package, the app last', () => {
    expect(bodies.map((b) => b.id)).toEqual([...MODULE_IDS, APP_ID]);
    expect(body(APP_ID).type).toBe('app');
    for (const id of MODULE_IDS) expect(body(id).type, id).toBe('module');
  });

  it('carries the artifact version on every package', () => {
    expect(new Set(bodies.map((b) => b.version))).toEqual(new Set([body(APP_ID).version]));
  });

  it('identifies as the app a customer installs (ADR-0019 D1)', () => {
    expect((artifact as AnyRec).manifest?.id).toBe(APP_ID);
  });

  it('shares one namespace, so no object is renamed (ADR-0130 D1)', () => {
    expect(bodies.map((b) => b.namespace)).toEqual(['crm', 'crm', 'crm', 'crm']);
  });

  it('declares the edges: every module depends on the app package and nothing else (a star)', () => {
    for (const id of MODULE_IDS) expect(Object.keys(body(id).dependencies ?? {}), id).toEqual([APP_ID]);
  });
});

describe('every object has exactly one owner', () => {
  it('the service module owns the case, knowledge-article and article-feedback objects', () => {
    expect(namesOf(body(SERVICE_ID).objects)).toEqual(SERVICE_OBJECTS);
  });

  it('the revenue module owns the product, price-book, line-item, quote and contract objects', () => {
    expect(namesOf(body(REVENUE_ID).objects)).toEqual(REVENUE_OBJECTS);
  });

  it('the marketing module owns the campaign and campaign-member objects', () => {
    expect(namesOf(body(MARKETING_ID).objects)).toEqual(MARKETING_OBJECTS);
  });

  it('the app package owns every other object of the app', () => {
    const appObjects = namesOf(body(APP_ID).objects);
    expect(appObjects).toHaveLength(8);
    expect(appObjects.filter((name) => MODULE_OBJECTS.includes(name))).toEqual([]);
    expect([...appObjects, ...MODULE_OBJECTS].sort()).toEqual(namesOf((composed as AnyRec).objects));
  });

  it('an item authored against a module object ships in that module', () => {
    // The assignment rule (AGENTS.md *Project Architecture*, rule 3), read off
    // the artifact for the item classes that name their object directly.
    const strays: string[] = [];
    for (const b of bodies) {
      const own = new Set(namesOf(b.objects));
      const check = (kind: string, items: unknown, objectOf: (item: AnyRec) => unknown) => {
        for (const item of (Array.isArray(items) ? items : []) as AnyRec[]) {
          // A hook may name several objects (`quote_workflow` does, #2060):
          // every one of them is judged, never the list skipped as a non-string.
          for (const object of [objectOf(item)].flat()) {
            if (typeof object !== 'string' || !object.startsWith('crm_')) continue;
            if (!own.has(object)) strays.push(`${b.id}: ${kind} "${item.name ?? item.object}" is authored against ${object}`);
          }
        }
      };
      check('hook', b.hooks, (h) => h.object);
      check('sharing rule', b.sharingRules, (r) => r.object);
      check('seed family', b.data, (d) => d.object);
      check('dataset', b.datasets, (d) => d.object);
      check('view', b.views, (v) => v.list?.data?.object);
      check('action', b.actions, (a) => a.objectName);
      check('page', b.pages, (p) => p.object);
      check('flow', b.flows, (f) => f.objectName);
    }
    expect(strays, `items shipped in a package that does not own their object:\n  ${strays.join('\n  ')}`)
      .toEqual(APP_REGISTERED_MODULE_ITEMS);
  });

  it('the permission sets stay whole in the app package (ADR-0130, 2026-09-02 addendum)', () => {
    for (const id of MODULE_IDS) expect(namesOf(body(id).permissions), id).toEqual([]);
    const grantingOn = (objects: string[]) => ((body(APP_ID).permissions ?? []) as AnyRec[]).filter((set) =>
      Object.keys(set.objects ?? {}).some((object) => objects.includes(object)));
    expect(grantingOn(SERVICE_OBJECTS).length, 'no app-owned set grants on a service object').toBeGreaterThan(0);
    expect(grantingOn(REVENUE_OBJECTS).length, 'no app-owned set grants on a revenue object').toBeGreaterThan(0);
    expect(grantingOn(MARKETING_OBJECTS).length, 'no app-owned set grants on a marketing object').toBeGreaterThan(0);
  });
});

describe('the composed view the suites read is the artifact, flattened', () => {
  // Every collection the two package bodies carry, against the same collection
  // in `test/helpers/composed-stack.ts`, by item name. A collection the view
  // dropped, or an item it invented, fails here rather than letting every suite
  // that reads the view pass over the wrong set.
  const COLLECTIONS = [
    'objects', 'views', 'pages', 'dashboards', 'reports', 'datasets', 'actions', 'flows',
    'skills', 'hooks', 'permissions', 'sharingRules', 'positions', 'mappings', 'apps',
  ];

  it.each(COLLECTIONS)('%s', (key) => {
    const fromBodies = bodies.flatMap((b) => namesOf(b[key])).sort();
    expect(fromBodies.length, `no package carries any ${key}`).toBeGreaterThan(0);
    expect(namesOf((composed as AnyRec)[key])).toEqual(fromBodies);
  });

  it('data and translations, which carry no name', () => {
    const objectsOf = (items: unknown) =>
      ((Array.isArray(items) ? items : []) as AnyRec[]).map((item) => String(item.object)).sort();
    expect(objectsOf((composed as AnyRec).data)).toEqual(bodies.flatMap((b) => objectsOf(b.data)).sort());
    expect(((composed as AnyRec).translations ?? []).length).toBe(
      bodies.reduce((n, b) => n + ((b.translations ?? []) as unknown[]).length, 0),
    );
  });
});
