// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The bundle `scripts/publish-marketplace.mjs` posts to
 * `POST /api/v1/cloud/packages/:id/versions`, and the guard it passes before
 * any HTTP call (#2053).
 *
 * ## Why the publish flattens
 *
 * `objectstack.config.ts` composes the artifact with
 * `composeStacks(…, { manifest: 'preserve' })`, so `objectstack build` writes a
 * COMPOSED artifact: `{ manifest, packages: [{ manifest: body }, …], i18n, docs }`,
 * every collection inside a package body and none at the top level (ADR-0130
 * D4). The marketplace ingest and the hosted installer read only the FLAT shape
 * 3.x published — `{ manifest, objects, views, …, i18n, docs }` — so v4.0.0,
 * posted as built, was stored as an app with no objects at all, and the POST
 * still answered 201. Maintainer ruling on #2053: flatten at publish time here;
 * teaching the cloud the composed shape is a later card.
 *
 * ## The flatten is the platform's own composition, replayed
 *
 * Nothing here invents a merge rule:
 *
 *   - **Package order** is `resolveArtifactPackageOrder` (`@objectstack/core`),
 *     the order the runtime registers an artifact's packages in — by
 *     `dependencies`, so the app comes before the module that depends on it and
 *     seed rows replay in the order their natural-key lookups were written for.
 *   - **Collections** are every key `COMPOSE_KEY_DISPOSITIONS` (`@objectstack/spec`)
 *     composes by concatenation, concatenated in that order. That is the very
 *     list `composeStacks` built before `'preserve'` moved it into the package
 *     bodies, and it only moves it once the bodies reproduce it item for item.
 *   - **Navigation contributions** — the one seam a single package cannot
 *     carry, since a module contributes into an app it does not own — are
 *     folded into the app's `navigation` by `SchemaRegistry.applyNavContributions`
 *     (`@objectstack/objectql`), the fold the runtime applies on every read of
 *     the app. The flat bundle therefore holds the navigation a packaged boot
 *     renders, as 3.x's app held it, and no contribution is left for a reader
 *     to apply a second time.
 *
 * What the flatten adds is refusal: anything a one-package bundle cannot carry
 * faithfully — two different items under one identity, a module manifest key
 * that differs from the app's, a dependency outside the artifact — throws
 * `BundleError` by name instead of being dropped.
 */

import { COMPOSE_KEY_DISPOSITIONS } from '@objectstack/spec';
import { resolveArtifactPackageOrder } from '@objectstack/core';
import { SchemaRegistry } from '@objectstack/objectql';

/** A bundle this script refuses to post. The CLI prints the message and exits 1. */
export class BundleError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BundleError';
  }
}

/**
 * The collection keys of a package body: what `composeStacks` concatenates
 * (`concat`) or merges by name (`objects`). `packages` is the artifact's own
 * envelope, never a body collection.
 */
const COLLECTION_KEYS = new Set(
  Object.entries(COMPOSE_KEY_DISPOSITIONS)
    .filter(([key, rule]) => key !== 'packages' && (rule === 'concat' || rule === 'objects'))
    .map(([key]) => key),
);

/**
 * A module's own identity. A one-package bundle has room for one identity, the
 * app's, so these are dropped from a module by design rather than compared.
 */
const MODULE_IDENTITY_KEYS = new Set(['id', 'name', 'version', 'type', 'scope', 'description']);

/**
 * Collections whose items the platform keys by more than `name`: an action by
 * `objectName` + `name` (`collectComposedActionKeyCollisions`, `@objectstack/spec`),
 * an email template by `name` + `locale` (`ITEM_KEY_DISCRIMINATORS`,
 * `@objectstack/metadata-core`). Without the scope, `log_call` on four objects
 * would read as four colliding actions.
 */
const IDENTITY_SCOPE = { actions: 'objectName', emailTemplates: 'locale' };

/** JSON with object keys sorted, so two equal items encode identically. */
function stableJson(value) {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v,
  );
}

/** `name`, else `id`, scoped where the platform scopes it; undefined when the item has neither. */
function identityOf(key, item) {
  if (!item || typeof item !== 'object') return undefined;
  const base = [item.name, item.id].find((v) => typeof v === 'string' && v !== '');
  if (base === undefined) return undefined;
  const scope = IDENTITY_SCOPE[key];
  return scope ? `${item[scope] ?? ''}:${base}` : base;
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
 * The flat bundle for `artifact`. A flat artifact (no `packages` array) is
 * returned unchanged; a composed one is flattened as the header describes.
 */
export function flattenArtifact(artifact) {
  if (!Array.isArray(artifact?.packages)) return artifact;
  const { manifest, packages: _packages, ...envelope } = artifact;
  if (!manifest?.id) throw new BundleError('the composed artifact carries no `manifest.id` to publish under');

  let ordered;
  try {
    ordered = resolveArtifactPackageOrder(artifact);
  } catch (err) {
    throw new BundleError(`the composed artifact's packages cannot be ordered: ${err?.message ?? err}`);
  }
  const packageIds = new Set(ordered.map((body) => body.id));
  const app = ordered.find((body) => body.id === manifest.id);
  if (!app) {
    throw new BundleError(
      `the artifact identifies as ${manifest.id}, which is none of its packages (${[...packageIds].join(', ')})`,
    );
  }
  if (app.type !== 'app') {
    throw new BundleError(`package ${app.id} is type '${app.type}', not the 'app' a marketplace install takes its identity from`);
  }

  const flat = { manifest: { ...manifest } };
  const collected = new Map();
  const collect = (key, items, source) => {
    const list = collected.get(key) ?? [];
    for (const item of items) list.push({ item, source });
    collected.set(key, list);
  };
  const contributions = [];

  for (const [key, value] of Object.entries(envelope)) {
    if (Array.isArray(value)) collect(key, value, 'the artifact');
    else flat[key] = value;
  }

  for (const body of ordered) {
    for (const [key, value] of Object.entries(body)) {
      if (COLLECTION_KEYS.has(key)) {
        if (!Array.isArray(value)) {
          throw new BundleError(`package ${body.id} carries '${key}' as ${typeof value}, not an array the flat bundle can concatenate`);
        }
        collect(key, value, body.id);
        continue;
      }
      if (key === 'navigationContributions') {
        for (const contribution of value ?? []) contributions.push({ contribution, source: body.id });
        continue;
      }
      if (body !== app && key === 'dependencies') {
        const outside = Object.keys(value ?? {}).filter((dep) => !packageIds.has(dep));
        if (outside.length > 0) {
          throw new BundleError(
            `package ${body.id} depends on ${outside.join(', ')}, outside this artifact; a one-package bundle cannot carry a module's dependency`,
          );
        }
        continue;
      }
      if (body !== app && MODULE_IDENTITY_KEYS.has(key)) continue;
      const carried = key in envelope ? envelope[key] : manifest[key];
      if (stableJson(value) !== stableJson(carried)) {
        throw new BundleError(
          `package ${body.id} declares '${key}' as ${stableJson(value)}, but the flat bundle carries ${stableJson(carried)}; one package cannot hold both`,
        );
      }
    }
  }

  for (const [key, entries] of collected) {
    const seenItems = new Set();
    const owners = new Map();
    const items = [];
    for (const { item, source } of entries) {
      const encoded = stableJson(item);
      if (seenItems.has(encoded)) continue;
      seenItems.add(encoded);
      const identity = identityOf(key, item);
      if (identity !== undefined) {
        const prior = owners.get(identity);
        if (prior !== undefined) {
          throw new BundleError(
            `'${key}' would carry two different items named '${identity}' (from ${prior} and from ${source}); flattened into one package, one would silently replace the other`,
          );
        }
        owners.set(identity, source);
      }
      items.push(item);
    }
    flat[key] = items;
  }

  if (contributions.length > 0) {
    const appNames = new Set((flat.apps ?? []).map((a) => a?.name));
    const registry = new SchemaRegistry({ logLevel: 'silent' });
    for (const { contribution, source } of contributions) {
      if (!appNames.has(contribution?.app)) {
        throw new BundleError(
          `package ${source} contributes navigation into app '${contribution?.app}', which this artifact does not carry`,
        );
      }
      registry.registerAppNavContribution(contribution, source);
    }
    flat.apps = flat.apps.map((a) => registry.applyNavContributions(a));
  }

  return flat;
}

/**
 * The guard: the bundle about to be posted must carry objects, and every object
 * the artifact carries across its packages. A composed artifact posted without
 * flattening has no top-level `objects`, so it cannot pass.
 */
export function assertBundleCarriesEveryObject(bundle, artifact) {
  const posted = Array.isArray(bundle?.objects) ? bundle.objects.length : 0;
  const built = countArtifactObjects(artifact);
  if (posted === 0) {
    throw new BundleError(
      `the bundle to post carries 0 objects (top-level keys: ${Object.keys(bundle ?? {}).join(', ') || 'none'}); the build carries ${built}. Refusing to publish an empty app.`,
    );
  }
  if (posted < built) {
    throw new BundleError(`the bundle to post carries ${posted} objects, but the build carries ${built}. Refusing to publish a partial app.`);
  }
}

/** One line per top-level key: the item count of an array, else its kind. */
export function describeBundle(bundle) {
  return Object.entries(bundle).map(([key, value]) => {
    if (Array.isArray(value)) return `${key} ${value.length}`;
    return `${key} ${value && typeof value === 'object' ? `{${Object.keys(value).length} keys}` : typeof value}`;
  });
}
