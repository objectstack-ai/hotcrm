// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import artifact from '../objectstack.config';
import {
  BundleError,
  assertBundleCarriesEveryObject,
  countArtifactObjects,
  flattenArtifact,
} from '../scripts/lib/marketplace-bundle.mjs';

/**
 * The marketplace publishes the whole app (#2053).
 *
 * v4.0.0's staging publish posted the COMPOSED artifact `objectstack build`
 * writes — every collection inside `packages[]` — to an ingest that reads the
 * flat 3.x shape, and cloud stored an app with no objects while the POST
 * answered 201. `scripts/publish-marketplace.mjs` now flattens the artifact
 * and refuses, before any HTTP call, a bundle missing any object the build
 * carries. These cases pin both halves over a two-package fixture, and over
 * HotCRM's own composition so a third package that cannot be flattened goes
 * red here rather than at a release tag.
 */

type AnyRec = Record<string, any>;

const FIXTURE = join(REPO_ROOT, 'test/fixtures/composed-artifact.json');
const composed = (): AnyRec => JSON.parse(readFileSync(FIXTURE, 'utf8'));
const bodyOf = (a: AnyRec, id: string): AnyRec => a.packages.find((p: AnyRec) => p.manifest.id === id).manifest;

/** The error `fn` throws; fails the case when it throws nothing. */
function refusal(fn: () => unknown): Error {
  try {
    fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error('expected a refusal, but the call returned');
}

/** Every navigation item id in a tree, depth first. */
const navIds = (items: AnyRec[] = []): string[] => items.flatMap((i) => [i.id, ...navIds(i.children)]);

describe('flattening a composed artifact', () => {
  it('holds the union of the collections of both packages, app package first', () => {
    const flat = flattenArtifact(composed());
    expect(flat.packages).toBeUndefined();
    expect(flat.objects.map((o: AnyRec) => o.name)).toEqual(['ex_account', 'ex_contact', 'ex_case']);
    // Same action name on two objects: two actions, not a collision.
    expect(flat.actions.map((a: AnyRec) => `${a.objectName}:${a.name}`)).toEqual([
      'ex_account:log_call',
      'ex_case:log_call',
    ]);
    // The same capability required by both packages is carried once.
    expect(flat.requires).toEqual(['automation', 'sharing', 'ui']);
    expect(flat.i18n).toEqual(composed().i18n);
    expect(flat.docs.map((d: AnyRec) => d.name)).toEqual(['ex_overview']);
  });

  it('takes its identity from the app package', () => {
    const flat = flattenArtifact(composed());
    expect(flat.manifest).toEqual(composed().manifest);
    expect(flat.manifest).toMatchObject({ id: 'app.example.crm', type: 'app' });
    // The module's dependency on the app is internal to the artifact.
    expect(JSON.stringify(flat)).not.toContain('"dependencies"');
  });

  it('folds the navigation contribution of the module into the app it targets', () => {
    const flat = flattenArtifact(composed());
    const group = flat.apps[0].navigation.find((i: AnyRec) => i.id === 'group_service');
    expect(group.children.map((i: AnyRec) => i.id)).toEqual(['nav_case']);
    expect(JSON.stringify(flat)).not.toContain('navigationContributions');
  });

  it('passes a flat artifact through unchanged', () => {
    const flat = flattenArtifact(composed());
    expect(flattenArtifact(flat)).toBe(flat);
  });

  it('refuses two different items under one name', () => {
    const a = composed();
    bodyOf(a, 'app.example.crm.service').objects.push({
      name: 'ex_account',
      label: 'Another Account',
      fields: { title: { type: 'text', label: 'Title' } },
    });
    const err = refusal(() => flattenArtifact(a));
    expect(err).toBeInstanceOf(BundleError);
    expect(err.message).toContain("'ex_account'");
  });

  it('refuses a module manifest key the app does not share', () => {
    const a = composed();
    bodyOf(a, 'app.example.crm.service').namespace = 'other';
    const err = refusal(() => flattenArtifact(a));
    expect(err).toBeInstanceOf(BundleError);
    expect(err.message).toContain("'namespace'");
  });
});

describe('the guard before any HTTP call', () => {
  it('passes the flattened bundle', () => {
    const a = composed();
    expect(() => assertBundleCarriesEveryObject(flattenArtifact(a), a)).not.toThrow();
  });

  it('refuses the composed artifact posted without flattening (negative control)', () => {
    const a = composed();
    expect(a.objects).toBeUndefined();
    expect(countArtifactObjects(a)).toBe(3);
    expect(refusal(() => assertBundleCarriesEveryObject(a, a))).toBeInstanceOf(BundleError);
  });

  it('refuses a bundle carrying fewer objects than the build', () => {
    const a = composed();
    const flat = flattenArtifact(a);
    const partial = { ...flat, objects: flat.objects.slice(1) };
    expect(refusal(() => assertBundleCarriesEveryObject(partial, a))).toBeInstanceOf(BundleError);
  });
});

describe('the composition HotCRM builds', () => {
  const real = artifact as AnyRec;

  it('flattens to every object of every package', () => {
    const bodies: AnyRec[] = real.packages.map((p: AnyRec) => p.manifest);
    expect(bodies.length, 'the artifact carries no packages[]: this case is vacuous').toBeGreaterThan(1);
    const flat = flattenArtifact(real);
    expect(flat.manifest.id).toBe('app.objectstack.hotcrm');
    expect(flat.objects.length).toBe(countArtifactObjects(real));
    expect(new Set(flat.objects.map((o: AnyRec) => o.name))).toEqual(
      new Set(bodies.flatMap((b) => (b.objects ?? []).map((o: AnyRec) => o.name))),
    );
    expect(() => assertBundleCarriesEveryObject(flat, real)).not.toThrow();
  });

  it('carries every contributed navigation item inside the app', () => {
    const contributed = real.packages
      .flatMap((p: AnyRec) => p.manifest.navigationContributions ?? [])
      .flatMap((c: AnyRec) => c.items.map((i: AnyRec) => i.id));
    expect(contributed.length, 'no package contributes navigation: this case is vacuous').toBeGreaterThan(0);
    const flat = flattenArtifact(real);
    const ids = flat.apps.flatMap((app: AnyRec) => navIds(app.navigation));
    expect(contributed.filter((id: string) => !ids.includes(id))).toEqual([]);
  });
});
