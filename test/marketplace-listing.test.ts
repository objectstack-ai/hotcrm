// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PackageTranslationsSchema,
  TemplateManifestSchema,
  resolvePackageL10nField,
} from '@objectstack/spec/marketplace';
import { REPO_ROOT } from './helpers/repo-root';
import {
  ListingError,
  describeTranslations,
  packageUpsertBody,
  resolveListingTranslations,
} from '../scripts/lib/marketplace-listing.mjs';

/**
 * The marketplace listing reads in Chinese for a zh-CN viewer (#2392).
 *
 * The card and detail page showed the English description and README to a
 * zh-CN Console, because `objectstack.manifest.json` declared no
 * `translations` and `scripts/publish-marketplace.mjs` sent none. These cases
 * pin the manifest's zh-CN entry against the platform's own schema, the body
 * the publish script posts (in a DRY_RUN too), and the Console's resolution of
 * that body for a zh-CN, a bare zh and an English viewer.
 */

type AnyRec = Record<string, any>;

const MANIFEST_PATH = join(REPO_ROOT, 'objectstack.manifest.json');
const manifest = (): AnyRec => JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const zhReadme = readFileSync(join(REPO_ROOT, 'README.zh-CN.md'), 'utf8');

/** The error `fn` throws; fails the case when it throws nothing. */
function refusal(fn: () => unknown): Error {
  try {
    fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error('expected a refusal, but the call returned');
}

describe("the manifest's zh-CN listing entry", () => {
  it('parses under TemplateManifestSchema and keeps every translation key', () => {
    const parsed = TemplateManifestSchema.safeParse(manifest());
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    // The schema strips unknown keys rather than refusing them, so a key it
    // does not know would vanish here instead of going red.
    expect(parsed.data!.translations).toEqual(manifest().translations);
  });

  it('localizes the description, tagline and readme, and keeps the product name', () => {
    const zh = manifest().translations['zh-CN'];
    expect(Object.keys(zh).sort()).toEqual(['description', 'readme', 'tagline']);
    expect(zh.readme).toBe('README.zh-CN.md');
    for (const text of [zh.description, zh.tagline]) expect(text).toMatch(/[一-鿿]/);
  });
});

describe('the translations the publish script sends', () => {
  const sent = resolveListingTranslations(manifest().translations, REPO_ROOT)!;

  it('replaces the readme path with the zh-CN readme and parses as PackageTranslationsSchema', () => {
    expect(sent['zh-CN'].readme).toBe(zhReadme);
    expect(zhReadme.startsWith('# HotCRM\n')).toBe(true);
    const parsed = PackageTranslationsSchema.safeParse(sent);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(parsed.data).toEqual(sent);
  });

  it('is in the package upsert body, beside the unchanged English base columns', () => {
    const mp = manifest();
    const body = packageUpsertBody({
      manifestId: mp.manifestId,
      manifest: mp,
      license: mp.license,
      readme: 'README',
      translations: sent,
    });
    expect(body.translations).toEqual(sent);
    expect(body.description).toBe(mp.description);
    expect(body.display_name).toBe('HotCRM');
  });

  it('is printed by the DRY_RUN log, readme by length', () => {
    const lines = describeTranslations(sent);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('translations.zh-CN:');
    expect(lines[0]).toContain(`readme ${zhReadme.length} chars`);
    expect(lines[0]).toContain(JSON.stringify(manifest().translations['zh-CN'].description));
  });

  it('resolves to Chinese for a zh-CN or zh viewer and to English otherwise', () => {
    const mp = manifest();
    const row = { display_name: mp.displayName, description: mp.description, readme: 'English README', translations: sent };
    for (const locale of ['zh-CN', 'zh']) {
      expect(resolvePackageL10nField(row, 'description', { locale })).toBe(sent['zh-CN'].description);
      expect(resolvePackageL10nField(row, 'readme', { locale })).toBe(zhReadme);
      expect(resolvePackageL10nField(row, 'displayName', { locale })).toBe('HotCRM');
    }
    expect(resolvePackageL10nField(row, 'description', { locale: 'en' })).toBe(mp.description);
    expect(resolvePackageL10nField(row, 'readme', { locale: 'en' })).toBe('English README');
  });
});

describe('the check before any HTTP call', () => {
  const reader = (files: Record<string, string>) => (path: string) => {
    const hit = Object.entries(files).find(([name]) => path.endsWith(`/${name}`));
    if (!hit) throw new Error(`ENOENT: ${path}`);
    return hit[1];
  };

  it('sends nothing when the manifest declares no translations', () => {
    expect(resolveListingTranslations(undefined, '/repo')).toBeUndefined();
    const mp = manifest();
    expect(packageUpsertBody({ manifestId: 'x', manifest: mp, license: 'MIT', readme: 'R', translations: undefined }))
      .not.toHaveProperty('translations');
    expect(describeTranslations(undefined)).toEqual(['translations: (none)']);
  });

  it('keeps an inline readme as written and reads a path relative to the manifest', () => {
    const out = resolveListingTranslations(
      { ja: { readme: '# 見出し\n\n本文' }, 'zh-CN': { readme: 'docs/README.zh-CN.md' } },
      '/repo',
      reader({ 'docs/README.zh-CN.md': '# 中文' }),
    )!;
    expect(out.ja.readme).toBe('# 見出し\n\n本文');
    expect(out['zh-CN'].readme).toBe('# 中文');
  });

  it('refuses a readme path that cannot be read', () => {
    const err = refusal(() =>
      resolveListingTranslations({ 'zh-CN': { readme: 'MISSING.md' } }, '/repo', reader({})),
    );
    expect(err).toBeInstanceOf(ListingError);
    expect(err.message).toContain("translations['zh-CN'].readme");
  });

  it('refuses a tagline over the schema bound and a malformed locale tag', () => {
    const long = refusal(() => resolveListingTranslations({ 'zh-CN': { tagline: '长'.repeat(121) } }, '/repo'));
    expect(long).toBeInstanceOf(ListingError);
    expect(long.message).toContain('translations.zh-CN.tagline');

    const locale = refusal(() => resolveListingTranslations({ zh_CN: { description: '中文' } }, '/repo'));
    expect(locale).toBeInstanceOf(ListingError);
  });
});
