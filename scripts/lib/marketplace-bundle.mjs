// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The bundle `scripts/publish-marketplace.mjs` posts to
 * `POST /api/v1/cloud/packages/:id/versions`, and the guard it passes before
 * any HTTP call.
 *
 * ## The bundle is the artifact as built
 *
 * `objectstack.config.ts` composes the artifact with
 * `composeStacks(…, { manifest: 'preserve' })`, so `objectstack build` writes a
 * COMPOSED artifact: `{ manifest, packages: [{ manifest: body }, …], i18n, … }`,
 * every collection inside the body of the package that owns it (ADR-0130 D4).
 * That artifact is posted unchanged, the way the platform's own publisher
 * (`objectstack package publish`) posts `dist/objectstack.json`, so the
 * marketplace stores each package under its own identity and a module's apps,
 * books and navigation stay with the module.
 *
 * Until #2059 this file flattened the artifact into one package first (#2053),
 * because the ingest of the day read only the flat 3.x shape. The ingest now
 * admits composed artifacts (cloud#3677), and a flattened HotCRM — three apps
 * in one package — is refused, so the flatten is retired. ⛔ Do not bring it
 * back to get a refused upload through: report the refusal instead.
 */

/** A bundle this script refuses to post. The CLI prints the message and exits 1. */
export class BundleError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BundleError';
  }
}

/** Objects carried anywhere in `artifact`: its top level plus every package body. */
export function countArtifactObjects(artifact) {
  const top = Array.isArray(artifact?.objects) ? artifact.objects.length : 0;
  const packages = Array.isArray(artifact?.packages) ? artifact.packages : [];
  return packages.reduce(
    (n, entry) => n + (Array.isArray(entry?.manifest?.objects) ? entry.manifest.objects.length : 0),
    top,
  );
}

/**
 * The guard: the artifact about to be posted carries objects. v4.0.0 once
 * published an app with no objects while the POST still answered 201, so an
 * empty build is refused here, before the first request.
 */
export function assertArtifactCarriesObjects(artifact) {
  if (countArtifactObjects(artifact) === 0) {
    throw new BundleError(
      `the artifact carries 0 objects (top-level keys: ${Object.keys(artifact ?? {}).join(', ') || 'none'}). Refusing to publish an empty app.`,
    );
  }
}

/** The body of `POST /api/v1/cloud/packages/:id/versions`: the artifact as built is the bundle. */
export function versionBody({ version, artifact, releaseNotes }) {
  return { version, bundle: artifact, release_notes: releaseNotes, auto_approve: true };
}

/** One line per top-level key: the item count of an array, else its kind. */
export function describeBundle(bundle) {
  return Object.entries(bundle).map(([key, value]) => {
    if (Array.isArray(value)) return `${key} ${value.length}`;
    return `${key} ${value && typeof value === 'object' ? `{${Object.keys(value).length} keys}` : typeof value}`;
  });
}

/** One line per package of a composed artifact: id, type, its objects and its apps. */
export function describePackages(artifact) {
  const packages = Array.isArray(artifact?.packages) ? artifact.packages : [];
  return packages.map(({ manifest: body } = {}) => {
    const objects = Array.isArray(body?.objects) ? body.objects.length : 0;
    const apps = (body?.apps ?? []).map((a) => a?.name).filter(Boolean);
    return `${body?.id} (${body?.type}): ${objects} objects${apps.length ? `, apps ${apps.join(', ')}` : ''}`;
  });
}
