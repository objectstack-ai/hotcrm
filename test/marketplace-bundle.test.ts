// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArtifactPackageSchema, ObjectStackDefinitionSchema } from '@objectstack/spec';
import { REPO_ROOT } from './helpers/repo-root';
import artifact from '../objectstack.config';
import {
  BundleError,
  assertArtifactCarriesObjects,
  countArtifactObjects,
  describePackages,
  versionBody,
} from '../scripts/lib/marketplace-bundle.mjs';

/**
 * The marketplace receives HotCRM as built: one `packages[]` entry per package
 * (#2059, H1 of cloud#3636).
 *
 * `scripts/publish-marketplace.mjs` used to flatten the composed artifact into
 * one package (#2053). A flattened HotCRM carries three apps in one package,
 * which the marketplace refuses, and it loses which package owns which app,
 * book and navigation. The version body now carries the artifact unchanged, as
 * the platform's own publisher (`objectstack package publish`) sends
 * `dist/objectstack.json`.
 *
 * ⚠️ The cloud ingest contract (cloud#3677) lives in a repository these cases
 * cannot read. They hold the body to the platform's published artifact schemas
 * instead; the staging upload is the proof against the ingest itself.
 */

type AnyRec = Record<string, any>;

const FIXTURE = join(REPO_ROOT, 'test/fixtures/composed-artifact.json');
const composed = (): AnyRec => JSON.parse(readFileSync(FIXTURE, 'utf8'));

/** The error `fn` throws; fails the case when it throws nothing. */
function refusal(fn: () => unknown): Error {
  try {
    fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error('expected a refusal, but the call returned');
}

describe('the version body', () => {
  it('carries the composed artifact as built, packages[] and all', () => {
    const a = composed();
    const body = versionBody({ version: '1.0.0', artifact: a, releaseNotes: 'notes' });
    expect(body).toEqual({ version: '1.0.0', bundle: a, release_notes: 'notes', auto_approve: true });
    expect(body.bundle).toBe(a);
    expect(body.bundle.packages.map((p: AnyRec) => p.manifest.id)).toEqual([
      'app.example.crm.service',
      'app.example.crm',
    ]);
    // Nothing is folded across packages: the module keeps its own contribution.
    expect(body.bundle.packages[0].manifest.navigationContributions).toHaveLength(1);
    expect(body.bundle.objects).toBeUndefined();
  });
});

describe('the guard before any HTTP call', () => {
  it('passes a composed artifact whose objects live in its package bodies', () => {
    const a = composed();
    expect(a.objects).toBeUndefined();
    expect(countArtifactObjects(a)).toBe(3);
    expect(() => assertArtifactCarriesObjects(a)).not.toThrow();
  });

  it('refuses an artifact that carries no objects', () => {
    const a = composed();
    for (const entry of a.packages) delete entry.manifest.objects;
    expect(refusal(() => assertArtifactCarriesObjects(a))).toBeInstanceOf(BundleError);
  });
});

describe('the composition HotCRM builds', () => {
  const real = artifact as AnyRec;
  const body = versionBody({ version: real.manifest.version, artifact: real, releaseNotes: undefined });

  it('is posted as one package per source package, each with its own apps', () => {
    const ids: string[] = body.bundle.packages.map((p: AnyRec) => p.manifest.id);
    expect(ids.length, 'the artifact carries no packages[]: this case is vacuous').toBeGreaterThan(1);
    expect(ids).toContain(real.manifest.id);
    const appOwners = Object.fromEntries(
      body.bundle.packages.flatMap((p: AnyRec) => (p.manifest.apps ?? []).map((app: AnyRec) => [app.name, p.manifest.id])),
    );
    // The three apps of #2417, each filed under the package that owns it.
    expect(appOwners).toEqual({
      crm_enterprise: 'app.objectstack.hotcrm',
      crm_service: 'app.objectstack.hotcrm.service',
      crm_marketing: 'app.objectstack.hotcrm.marketing',
    });
    expect(describePackages(body.bundle)).toHaveLength(ids.length);
    expect(() => assertArtifactCarriesObjects(body.bundle)).not.toThrow();
  });

  it('parses as the platform artifact, and every packages[] entry as an artifact package', () => {
    const whole = ObjectStackDefinitionSchema.safeParse(body.bundle);
    expect(whole.success, JSON.stringify(whole.error?.issues?.slice(0, 3))).toBe(true);
    for (const entry of body.bundle.packages) {
      const parsed = ArtifactPackageSchema.safeParse(entry);
      expect(parsed.success, `${entry.manifest.id}: ${JSON.stringify(parsed.error?.issues?.slice(0, 3))}`).toBe(true);
    }
  });

  it('refuses an entry inlined without its manifest wrapper (negative control)', () => {
    const { manifest: inlined } = body.bundle.packages[0];
    expect(ArtifactPackageSchema.safeParse(inlined).success).toBe(false);
  });
});
