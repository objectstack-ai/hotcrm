// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The listing translations `scripts/publish-marketplace.mjs` sends with the
 * package upsert (`POST /api/v1/cloud/packages`), and the check they pass
 * before any HTTP call (#2392).
 *
 * ## What was wrong
 *
 * The marketplace card and detail page read English for a zh-CN viewer: the
 * manifest declared no `translations`, and the publish script sent only the
 * base `description` and `README.md`, so the catalog row had nothing else to
 * show.
 *
 * ## The shape is the platform's, not ours
 *
 * - `objectstack.manifest.json` → `translations` is the `translations` key of
 *   `TemplateManifestSchema` (`@objectstack/spec/marketplace`), a
 *   `PackageTranslationsSchema`: a locale-keyed map of `displayName`,
 *   `description`, `tagline`, `readme` and `screenshotCaptions`.
 * - A `readme` entry may be inline markdown or a path to a `.md` file next to
 *   the manifest. That is the rule `objectstack package publish` applies
 *   (`resolveLocalizedMarkdown` in `@objectstack/cli`) and the marketplace
 *   handbook documents, replayed here: under 256 characters, one line, ending
 *   in `.md` / `.markdown` ⇒ a path, read at publish time.
 * - The wire key is `translations`, its entries camelCase, exactly as the CLI
 *   posts them to the same door. The Console resolves an entry by the viewer's
 *   locale (`zh-CN`, then `zh`, then any `zh-*`, then `en`) and falls back to
 *   the base column for a missing key.
 *
 * The resolved map is parsed with `PackageTranslationsSchema` before it is
 * sent, so a description over the schema's 512 characters, a tagline over
 * 120 or a malformed locale tag stops the publish, DRY_RUN included, instead
 * of reaching the control plane.
 *
 * ⛔ Keep this module free of top-level side effects: the suite imports it.
 */

import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { PackageTranslationsSchema } from '@objectstack/spec/marketplace';

export class ListingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ListingError';
  }
}

/** The text keys of a translation entry that are sent as written. */
const TEXT_KEYS = ['displayName', 'description', 'tagline'];

/**
 * True when a `readme` value names a markdown file rather than carrying
 * markdown — the rule `objectstack package publish` applies.
 */
export function isMarkdownPath(value) {
  return value.length < 256 && !value.includes('\n') && /\.(md|markdown)$/i.test(value.trim());
}

/**
 * The manifest's `translations`, with every `readme` path replaced by the
 * file's markdown, checked against `PackageTranslationsSchema`.
 *
 * @param {unknown} translations  `objectstack.manifest.json` → `translations`
 * @param {string} baseDir        the manifest's directory; readme paths resolve against it
 * @param {(path: string) => string} [read]  file reader (the suite passes its own)
 * @returns {Record<string, Record<string, unknown>> | undefined}  undefined when nothing is declared
 */
export function resolveListingTranslations(translations, baseDir, read = (p) => readFileSync(p, 'utf8')) {
  if (translations === undefined) return undefined;
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    throw new ListingError('manifest `translations` must be an object keyed by locale');
  }
  const out = {};
  for (const [locale, entry] of Object.entries(translations)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ListingError(`manifest translations['${locale}'] must be an object`);
    }
    const resolved = {};
    for (const key of TEXT_KEYS) {
      if (typeof entry[key] === 'string' && entry[key].trim()) resolved[key] = entry[key];
    }
    if (typeof entry.readme === 'string' && entry.readme.trim()) {
      if (isMarkdownPath(entry.readme)) {
        const file = entry.readme.trim();
        const path = isAbsolute(file) ? file : resolve(baseDir, file);
        try {
          resolved.readme = read(path);
        } catch (err) {
          throw new ListingError(`cannot read translations['${locale}'].readme '${entry.readme}': ${err.message}`);
        }
      } else {
        resolved.readme = entry.readme;
      }
    }
    if (entry.screenshotCaptions && typeof entry.screenshotCaptions === 'object') {
      resolved.screenshotCaptions = entry.screenshotCaptions;
    }
    if (Object.keys(resolved).length > 0) out[locale] = resolved;
  }
  if (Object.keys(out).length === 0) return undefined;

  const parsed = PackageTranslationsSchema.safeParse(out);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `translations.${i.path.join('.')}: ${i.message}`);
    throw new ListingError(`listing translations do not parse: ${issues.join('; ')}`);
  }
  return out;
}

/**
 * One line per locale for the publish log: the keys sent, the readme by
 * length so a DRY_RUN shows what would be posted without printing the file.
 */
export function describeTranslations(translations) {
  if (!translations) return ['translations: (none)'];
  return Object.entries(translations).map(([locale, entry]) => {
    const parts = Object.entries(entry).map(([key, value]) =>
      key === 'readme'
        ? `readme ${value.length} chars, starts ${JSON.stringify(value.split('\n')[0])}`
        : `${key} ${JSON.stringify(value)}`,
    );
    return `translations.${locale}: ${parts.join(' · ')}`;
  });
}

/** HotCRM is a full product, not a starter template (#2420). */
export const HOTCRM_IS_STARTER = false;
/** The publisher HotCRM's service-mode publish names on its listing (#2420). */
export const HOTCRM_PUBLISHER = 'objectstack';

/**
 * The body of `POST /api/v1/cloud/packages`. `translations` is left out when
 * the manifest declares none, so an upsert never clears a stored map by
 * sending an empty one.
 *
 * The listing is classified by `businessFunctions`, sent under the wire key
 * `business_functions` (#2426). The single `category` it replaced is never
 * sent: the cloud refuses a body that carries it ("Package refused — nothing
 * stored"), which kept 6.1.0 off the production marketplace. The facet, its
 * values and the wire key are the platform's: `taxonomy.zod.ts` and
 * `CreatePackageRequestSchema` in `@objectstack/spec/marketplace`, and
 * `TAXONOMY_WIRE_KEYS` in the CLI's `package publish`, on objectstack `main`
 * since #32448 — no released spec carries them yet (18.3.0, the pin, does
 * not), so the body is not schema-parsed here. A manifest that declares no
 * `businessFunctions` sends none, and a re-publish leaves the stored value
 * alone.
 *
 * @returns {Record<string, any>}
 */
export function packageUpsertBody({ manifestId, manifest, license, readme, translations }) {
  /** @type {Record<string, any>} */
  const body = {
    manifest_id: manifestId,
    visibility: 'marketplace',
    display_name: manifest.displayName,
    description: manifest.description,
    tags: manifest.tags,
    // First-party constants of HotCRM's service-mode publish, not manifest
    // keys: `@objectstack/spec` 18.4.0 refuses `publisher` and `isStarter` on
    // the template manifest (they are the platform's to decide, objectstack
    // #31035), and this publish keeps sending the values it always sent (#2420).
    is_starter: HOTCRM_IS_STARTER,
    publisher: HOTCRM_PUBLISHER,
    icon_url: manifest.iconUrl,
    homepage_url: manifest.homepageUrl,
    license,
    readme,
  };
  if (manifest.businessFunctions !== undefined) body.business_functions = manifest.businessFunctions;
  if (translations) body.translations = translations;
  return body;
}
