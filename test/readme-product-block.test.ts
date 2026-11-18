// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from './helpers/composed-stack';
import { readProductApps } from '../scripts/lib/product-apps';
import {
  BLOCKS,
  README_LOCALES,
  blockText,
  listingCopy,
  loadProductSource,
  readmeBlocks,
  writeManifestCopy,
  writeReadmeBlocks,
} from '../scripts/lib/product-readme';

/**
 * The two READMEs and the marketplace listing say what the docs site says (#2606).
 *
 * `README.md` is the marketplace's English detail page and `README.zh-CN.md`
 * its zh-CN one; the manifest's `description` and `tagline` are the listing
 * card. Each used to be typed by hand and each drifted: a CRM with "navigation
 * groups" while the console shipped six apps. Two mechanisms hold them now:
 *
 *  1. **Generated shared blocks.** The headline and subtitle, the business
 *     chain and the six-app table are written by `pnpm docs:product` from the
 *     docs site's `product.json` and the app names in the metadata (#2608);
 *     a file that differs from what the script would write is red here, and
 *     so is an app the stack registers that a README or the listing omits.
 *  2. **README pair parity.** The two READMEs have the same sections in the
 *     same order (a `section:ID` comment before every `## ` heading), the same
 *     number of tables and code blocks, and the same bold figures — so the
 *     Chinese page is the English page in Chinese, not a summary, and its
 *     counts are the English page's, which `docs-metadata-counts` holds to the stack.
 */

const read = (file: string): string => readFileSync(join(REPO_ROOT, file), 'utf8');
const apps = readProductApps(stack as never);
const source = loadProductSource(REPO_ROOT);

describe('the shared product blocks in the READMEs and the manifest (#2606)', () => {
  for (const loc of README_LOCALES) {
    it(`${loc.file} carries every shared block as \`pnpm docs:product\` writes it`, () => {
      const text = read(loc.file);
      for (const name of BLOCKS) expect(blockText(text, name), `${loc.file} has no shared:${name} block`).toBeTruthy();
      expect(
        text,
        `${loc.file} differs from what \`pnpm docs:product\` writes: run it (an app or apps/docs/lib/product/product.json changed).`,
      ).toBe(writeReadmeBlocks(text, readmeBlocks(source, apps, loc), loc.file));
    });

    it(`${loc.file}'s six-app table names every registered app, as the UI names it`, () => {
      const table = blockText(read(loc.file), 'apps') ?? '';
      const missing = apps.map((a) => a.label[loc.label]).filter((label) => !table.includes(`[${label}](`));
      expect(missing, `apps the stack registers that ${loc.file} does not show`).toEqual([]);
      expect(table.split('\n').filter((l) => l.startsWith('| [')).length).toBe(apps.length);
    });
  }

  it('the manifest listing copy is what `pnpm docs:product` writes, and names every app', () => {
    const text = read('objectstack.manifest.json');
    expect(text, 'objectstack.manifest.json listing copy is stale: run `pnpm docs:product`.').toBe(
      writeManifestCopy(text, source, apps),
    );
    const manifest = JSON.parse(text);
    const listings = [
      { label: 'en' as const, description: manifest.description as string },
      { label: 'zh-CN' as const, description: manifest.translations['zh-CN'].description as string },
    ];
    for (const { label, description } of listings) {
      const missing = apps.map((a) => a.label[label]).filter((name) => !description.includes(name));
      expect(missing, `apps the ${label} listing description does not name`).toEqual([]);
    }
  });

  it('the listing copy fits the schema bounds (description 512, tagline 120)', () => {
    for (const loc of README_LOCALES) {
      const copy = listingCopy(source, apps, loc);
      expect(copy.description.length).toBeLessThanOrEqual(512);
      expect(copy.tagline.length).toBeLessThanOrEqual(120);
    }
  });

  it('a README that lost a marker is refused, not silently left unwritten', () => {
    const blocks = readmeBlocks(source, apps, README_LOCALES[0]);
    expect(() => writeReadmeBlocks('# HotCRM\n', blocks, 'README.md')).toThrow(/shared:headline/);
  });
});

describe('README.md and README.zh-CN.md have the same shape (#2606)', () => {
  const [en, zh] = README_LOCALES.map((loc) => ({ file: loc.file, text: read(loc.file) }));

  /** The `section:ID` comment each `## ` heading carries, in order; '' for a heading without one. */
  const sectionIds = (text: string): string[] => {
    const lines = text.split('\n');
    return lines.flatMap((line, i) => {
      if (!/^## /.test(line)) return [];
      return [/^<!-- section:([a-z-]+) -->$/.exec(lines[i - 1] ?? '')?.[1] ?? ''];
    });
  };
  /** Text outside fenced code blocks. */
  const prose = (text: string): string => text.replace(/^```[^\n]*\n[\s\S]*?^```$/gm, '');
  const tables = (text: string): number => (prose(text).match(/^\| ?-{3,}/gm) ?? []).length;
  const codeBlocks = (text: string): number => (text.match(/^```/gm) ?? []).length / 2;
  const boldFigures = (text: string): number[] =>
    [...prose(text).matchAll(/\*\*[^*\n]*?(\d+)[^*\n]*\*\*/g)].map((m) => Number(m[1]));

  it('every `## ` heading carries a section id, and the two files list the same ids in the same order', () => {
    for (const { file, text } of [en, zh]) {
      const ids = sectionIds(text);
      expect(ids.length, `${file} has no sections`).toBeGreaterThan(0);
      expect(ids.filter((id) => !id), `${file}: a heading with no section comment before it`).toEqual([]);
    }
    expect(sectionIds(zh.text)).toEqual(sectionIds(en.text));
  });

  it('the same number of tables and code blocks', () => {
    expect({ tables: tables(zh.text), code: codeBlocks(zh.text) }).toEqual({
      tables: tables(en.text),
      code: codeBlocks(en.text),
    });
    expect(tables(en.text)).toBeGreaterThan(0);
  });

  it('the same bold figures, in the same order', () => {
    expect(boldFigures(en.text).length, 'README.md states no bold count').toBeGreaterThan(0);
    expect(boldFigures(zh.text)).toEqual(boldFigures(en.text));
  });
});
