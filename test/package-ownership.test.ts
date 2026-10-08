// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import artifact from '../objectstack.config';
import composed from './helpers/composed-stack';

/**
 * Which package of the artifact owns what (ADR-0130 D4, #1907).
 *
 * HotCRM ships ONE release artifact carrying TWO packages that share the `crm`
 * namespace: `app.objectstack.hotcrm` (`src/sales/index.ts`, the `type: 'app'`
 * package a customer installs) and `app.objectstack.hotcrm.service`
 * (`src/service/index.ts`, the support module). Per-package ownership is what
 * `ObjectQL.registerApp` stamps on every object at install, what
 * `GET /api/v1/packages` reports, and what Studio groups by — so which package
 * an object lands in is a fact about this app, pinned here off the artifact
 * itself rather than off the source that is meant to produce it.
 *
 * The suites read `test/helpers/composed-stack.ts` — the same two package
 * stacks, flattened by the platform's own composition — because the artifact
 * carries no flattened collections beside `packages[]` (ADR-0130 D4, 2026-09-22
 * addendum). The last block holds the two views to the same contents, so that
 * view cannot drift from what actually ships.
 */

type AnyRec = Record<string, any>;

const APP_ID = 'app.objectstack.hotcrm';
const SERVICE_ID = 'app.objectstack.hotcrm.service';

/** The support module's objects — `module-split-plan.md` decision 5. */
const SERVICE_OBJECTS = ['crm_article_feedback', 'crm_case', 'crm_knowledge_article'];

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

describe('one artifact, two packages', () => {
  it('carries exactly the app package and the service module, the app last', () => {
    expect(bodies.map((b) => b.id)).toEqual([SERVICE_ID, APP_ID]);
    expect(body(APP_ID).type).toBe('app');
    expect(body(SERVICE_ID).type).toBe('module');
  });

  it('identifies as the app a customer installs (ADR-0019 D1)', () => {
    expect((artifact as AnyRec).manifest?.id).toBe(APP_ID);
  });

  it('shares one namespace, so no object is renamed (ADR-0130 D1)', () => {
    expect(bodies.map((b) => b.namespace)).toEqual(['crm', 'crm']);
  });

  it('declares the edge: the module depends on the app package', () => {
    expect(Object.keys(body(SERVICE_ID).dependencies ?? {})).toEqual([APP_ID]);
  });
});

describe('every object has exactly one owner', () => {
  it('the service module owns the case, knowledge-article and article-feedback objects', () => {
    expect(namesOf(body(SERVICE_ID).objects)).toEqual(SERVICE_OBJECTS);
  });

  it('the app package owns every other object of the app', () => {
    const appObjects = namesOf(body(APP_ID).objects);
    expect(appObjects.length, 'the app package owns no objects — this rule is vacuous').toBeGreaterThan(10);
    expect(appObjects.filter((name) => SERVICE_OBJECTS.includes(name))).toEqual([]);
    expect([...appObjects, ...SERVICE_OBJECTS].sort()).toEqual(namesOf((composed as AnyRec).objects));
  });

  it('an item authored against a service object ships in the service module', () => {
    // The assignment rule (AGENTS.md *Project Architecture*, rule 3), read off
    // the artifact for the item classes that name their object directly.
    const strays: string[] = [];
    for (const b of bodies) {
      const own = new Set(namesOf(b.objects));
      const check = (kind: string, items: unknown, objectOf: (item: AnyRec) => unknown) => {
        for (const item of (Array.isArray(items) ? items : []) as AnyRec[]) {
          const object = objectOf(item);
          if (typeof object !== 'string' || !object.startsWith('crm_')) continue;
          if (!own.has(object)) strays.push(`${b.id}: ${kind} "${item.name ?? item.object}" is authored against ${object}`);
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
    expect(strays, `items shipped in a package that does not own their object:\n  ${strays.join('\n  ')}`).toEqual([]);
  });

  it('the permission sets stay whole in the app package (ADR-0130, 2026-09-02 addendum)', () => {
    expect(namesOf(body(SERVICE_ID).permissions)).toEqual([]);
    const grantsOnService = ((body(APP_ID).permissions ?? []) as AnyRec[]).filter((set) =>
      Object.keys(set.objects ?? {}).some((object) => SERVICE_OBJECTS.includes(object)));
    expect(grantsOnService.length, 'no app-owned set grants on a service object').toBeGreaterThan(0);
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
