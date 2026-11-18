// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { packageStacks } from '../objectstack.composition';

/**
 * Which surface ships in which languages (#2612).
 *
 * The languages differ by surface, on purpose: the UI packs carry four, the docs
 * site three (one of them a Traditional Chinese edition the UI does not have),
 * the in-app manuals, the README pair and the marketplace listing two each.
 * Nothing said so, so a language added to one surface failed nowhere on the
 * others. `docs/README.md` § *Languages By Surface* now says so, and this file
 * reads that table — it does not keep a second copy — and holds the files to it
 * both ways: every language a row lists exists on that surface, and no surface
 * carries a language its row does not list.
 *
 * Each surface is read where it lives: the locale packs each package registers
 * and the app's `i18n.supportedLocales`; the docs site's `languages` config and
 * the `<page>.<locale>.mdx` / `meta.<locale>.json` files; the manuals'
 * `<name>.<locale>.md` siblings (ADR-0046); `README.<locale>.md`; the manifest's
 * `translations`. Whether each pack, page or listing is COMPLETE inside a
 * language is other files' subject — this one asks which languages exist.
 */

type AnyRec = Record<string, any>;

const read = (rel: string): string => readFileSync(join(REPO_ROOT, rel), 'utf8');

/** A language tag as file names spell it: `en`, `zh`, `zh-CN`, `zh-Hans`. Not `index`, `legacy`, `crm.translation`. */
const LOCALE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const SURFACES = ['App UI', 'Docs site', 'In-app manuals', 'README', 'Marketplace listing'] as const;
type Surface = (typeof SURFACES)[number];

/** The table under `## Languages By Surface` in `docs/README.md`: surface → its languages, in the order written. */
const matrix = (): Map<string, string[]> => {
  const text = read('docs/README.md');
  const start = text.indexOf('\n## Languages By Surface\n');
  if (start < 0) throw new Error('docs/README.md has no "## Languages By Surface" section');
  const section = text.slice(start + 1).split(/\n## /)[0];
  const rows = section
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  const [header, rule, ...body] = rows;
  expect(header.slice(0, 2)).toEqual(['Surface', 'Languages']);
  expect(rule.every((cell) => /^-+$/.test(cell))).toBe(true);
  return new Map(body.map(([surface, languages]) => [surface, [...languages.matchAll(/`([^`]+)`/g)].map((m) => m[1])]));
};

const languagesOf = (surface: Surface): string[] => {
  const languages = matrix().get(surface);
  if (!languages) throw new Error(`docs/README.md lists no "${surface}" row`);
  return languages;
};

const sorted = (values: Iterable<string>): string[] => [...new Set(values)].sort();

/** Every file under `dir` (repo-relative), recursively; `[]` when the directory is absent. */
const filesUnder = (dir: string): string[] =>
  existsSync(join(REPO_ROOT, dir))
    ? readdirSync(join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? filesUnder(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
      )
    : [];

/** `index.zh-Hans.mdx` → `zh-Hans`; `index.mdx` → `undefined`. The tag is the second-to-last dot segment. */
const localeSuffix = (file: string, ext: string): string | undefined => {
  const base = file.slice(file.lastIndexOf('/') + 1);
  if (!base.endsWith(ext)) return undefined;
  const parts = base.slice(0, -ext.length).split('.');
  return parts.length > 1 && LOCALE_TAG.test(parts[parts.length - 1]) ? parts[parts.length - 1] : undefined;
};

describe('the language table in docs/README.md', () => {
  it('has one row per surface this file knows how to check, and every row lists real tags', () => {
    const table = matrix();
    // A new row needs a check below before it means anything; a removed row
    // would leave its surface unguarded.
    expect([...table.keys()].sort()).toEqual([...SURFACES].sort());
    for (const [surface, languages] of table) {
      expect(languages.length, `${surface} lists no language`).toBeGreaterThan(0);
      expect(languages[0], `${surface}: English is the base of every surface and is listed first`).toBe('en');
      expect(languages.filter((l) => !LOCALE_TAG.test(l)), `${surface}: not a language tag`).toEqual([]);
      expect(new Set(languages).size, `${surface} lists a language twice`).toBe(languages.length);
    }
  });
});

describe('the app UI ships exactly the languages its row lists', () => {
  const expected = () => sorted(languagesOf('App UI'));

  it('the app declares them as its supported locales, English the default and fallback', () => {
    const app = (packageStacks as AnyRec[]).find((s) => s.manifest?.id === 'app.objectstack.hotcrm');
    expect(app?.i18n?.defaultLocale).toBe('en');
    expect(app?.i18n?.fallbackLocale).toBe('en');
    expect(sorted(app?.i18n?.supportedLocales ?? [])).toEqual(expected());
  });

  it('every package registers a pack for each of them, and for no other', () => {
    expect((packageStacks as AnyRec[]).length).toBeGreaterThanOrEqual(7);
    for (const stack of packageStacks as AnyRec[]) {
      const bundles = (stack.translations ?? []) as AnyRec[];
      expect(bundles.length, `${stack.manifest?.id} registers no translations`).toBeGreaterThan(0);
      for (const bundle of bundles) expect(sorted(Object.keys(bundle)), String(stack.manifest?.id)).toEqual(expected());
    }
  });

  it('every package directory holds one pack file per language, and none for another', () => {
    const dirs = readdirSync(join(REPO_ROOT, 'src'), { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(REPO_ROOT, 'src', e.name, 'translations')))
      .map((e) => `src/${e.name}/translations`);
    expect(dirs.length).toBeGreaterThanOrEqual(7);
    for (const dir of dirs) {
      const entries = readdirSync(join(REPO_ROOT, dir), { withFileTypes: true });
      const files = entries.filter((e) => e.isFile() && e.name.endsWith('.ts')).map((e) => e.name.slice(0, -3));
      expect(sorted(files.filter((stem) => LOCALE_TAG.test(stem))), dir).toEqual(expected());
      // The app package splits each pack into a per-locale folder of sub-bundles.
      const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      if (folders.length) expect(sorted(folders), `${dir}/`).toEqual(expected());
    }
  });
});

describe('the docs site ships exactly the languages its row lists', () => {
  const expected = () => sorted(languagesOf('Docs site'));
  const config = () => read('apps/docs/lib/i18n.ts');
  const pages = () => [...filesUnder('content/docs'), ...filesUnder('content/blog')];

  it('the site config declares them, English the default', () => {
    const languages = config().match(/\blanguages:\s*\[([^\]]*)\]/);
    expect(languages, 'apps/docs/lib/i18n.ts declares no `languages: [...]`').not.toBeNull();
    expect(sorted([...languages![1].matchAll(/'([^']+)'/g)].map((m) => m[1]))).toEqual(expected());
    expect(config()).toMatch(/\bdefaultLanguage:\s*'en'/);
  });

  it('no page or folder meta is written in a language the row does not list', () => {
    const found = pages().flatMap((f) => [localeSuffix(f, '.mdx'), localeSuffix(f, '.json')]).filter(Boolean) as string[];
    expect(sorted(found.filter((l) => !expected().includes(l)))).toEqual([]);
  });

  it('every English page and folder meta has its sibling in every other listed language', () => {
    const all = new Set(pages());
    const translations = expected().filter((l) => l !== 'en');
    const bases = pages().filter((f) => (f.endsWith('.mdx') && !localeSuffix(f, '.mdx')) || f.endsWith('/meta.json'));
    expect(bases.length).toBeGreaterThan(50);
    const missing = bases.flatMap((base) => {
      const ext = base.endsWith('.mdx') ? '.mdx' : '.json';
      return translations.map((l) => `${base.slice(0, -ext.length)}.${l}${ext}`).filter((f) => !all.has(f));
    });
    expect(missing).toEqual([]);
  });
});

describe('the in-app manuals ship exactly the languages their row lists', () => {
  const expected = () => sorted(languagesOf('In-app manuals'));
  const manuals = () =>
    readdirSync(join(REPO_ROOT, 'src'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((e) => {
        // `src/docs/` is the app package's (the platform's fixed path); a module's are `src/<dir>/docs/`.
        const dir = e.name === 'docs' ? 'src/docs' : `src/${e.name}/docs`;
        return existsSync(join(REPO_ROOT, dir))
          ? readdirSync(join(REPO_ROOT, dir)).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`)
          : [];
      });

  it('no manual page is written in a language the row does not list', () => {
    const found = manuals().map((f) => localeSuffix(f, '.md')).filter(Boolean) as string[];
    expect(sorted(found.filter((l) => !expected().includes(l)))).toEqual([]);
  });

  it('every English page has its sibling in every other listed language', () => {
    const all = new Set(manuals());
    const bases = manuals().filter((f) => !localeSuffix(f, '.md'));
    expect(bases.length).toBeGreaterThan(20);
    const missing = bases.flatMap((base) =>
      expected()
        .filter((l) => l !== 'en')
        .map((l) => base.replace(/\.md$/, `.${l}.md`))
        .filter((f) => !all.has(f)),
    );
    expect(missing).toEqual([]);
  });
});

describe('the README ships exactly the languages its row lists', () => {
  it('README.md is the English one, and README.<locale>.md exists for each other language and for no other', () => {
    expect(existsSync(join(REPO_ROOT, 'README.md'))).toBe(true);
    const found = readdirSync(REPO_ROOT)
      .map((f) => f.match(/^README\.(.+)\.md$/)?.[1])
      .filter((l): l is string => !!l && LOCALE_TAG.test(l));
    expect(sorted(found)).toEqual(sorted(languagesOf('README').filter((l) => l !== 'en')));
  });
});

describe('the marketplace listing ships exactly the languages its row lists', () => {
  it('the manifest carries the English listing and a translation for each other language, and for no other', () => {
    const manifest = JSON.parse(read('objectstack.manifest.json')) as AnyRec;
    for (const key of ['description', 'tagline', 'readmePath']) expect(manifest[key], key).toBeTruthy();
    expect(sorted(Object.keys(manifest.translations ?? {}))).toEqual(
      sorted(languagesOf('Marketplace listing').filter((l) => l !== 'en')),
    );
  });
});
