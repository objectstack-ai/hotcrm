// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from './helpers/composed-stack';
import { readProductApps, renderProductApps } from '../scripts/lib/product-apps';

/**
 * The shared product block is the app list the metadata declares (#2608).
 *
 * The homepage and the docs front page render one block, `apps/docs/lib/product/`:
 * `apps.generated.json` (the app names, read from `src/*\/apps/*.app.ts` and the
 * zh-CN packs by `pnpm docs:product`) and `product.json` (the words around them,
 * per docs locale). Before it, the same list was typed into five places and
 * drifted: the docs index named four areas while the console shipped six apps.
 *
 * This holds the block to the stack, not to itself:
 *  - the generated names are what the stack registers today, so a renamed or
 *    translated app reds here until the file is regenerated;
 *  - every registered app has its copy in every docs locale, and the block
 *    shows no app the stack does not register;
 *  - zh-Hant, which has no pack, carries a name for every app, the zh-CN
 *    wording in Traditional characters, so the same length as the zh-CN name;
 *  - every link the block makes lands on a page that exists in every locale.
 */
describe('the shared product block matches the registered apps (#2608)', () => {
  const DIR = join(REPO_ROOT, 'apps', 'docs', 'lib', 'product');
  const GENERATED = join(DIR, 'apps.generated.json');
  const product = JSON.parse(readFileSync(join(DIR, 'product.json'), 'utf8')) as {
    order: string[];
    appsHant: Record<string, string>;
    locales: Record<
      string,
      {
        headline: string;
        subtitle: string;
        chain: { steps: { label: string; href: string }[]; note: string; noteHref: string };
        apps: { items: Record<string, { who: string; what: string; href: string }> };
      }
    >;
  };
  const LOCALES = ['en', 'zh-Hans', 'zh-Hant'];
  const apps = readProductApps(stack as never);
  const names = apps.map((a) => a.name);

  it('the stack registers apps, each with an English and a zh-CN name', () => {
    expect(apps.length, 'no app read from the composed stack — did its shape move?').toBeGreaterThan(0);
    const unnamed = apps.filter((a) => !a.label.en || !a.label['zh-CN']).map((a) => a.name);
    expect(unnamed, `apps with no label in the en metadata or the zh-CN pack: ${unnamed.join(', ')}`).toEqual([]);
  });

  it('apps.generated.json is what `pnpm docs:product` writes today', () => {
    expect(existsSync(GENERATED), 'apps/docs/lib/product/apps.generated.json is missing').toBe(true);
    expect(
      readFileSync(GENERATED, 'utf8'),
      'apps.generated.json is stale: an app was added, renamed or translated. Run `pnpm docs:product`.',
    ).toBe(renderProductApps(apps));
  });

  it('the block shows exactly the registered apps', () => {
    expect([...product.order].sort(), 'product.json `order` must list every registered app once').toEqual(
      [...names].sort(),
    );
  });

  it('every docs locale has copy for every app, and nothing more', () => {
    const wrong = LOCALES.flatMap((loc) => {
      const copy = product.locales[loc];
      if (!copy) return [`${loc}: no locale in product.json`];
      const items = Object.keys(copy.apps.items).sort();
      const out: string[] = [];
      if (JSON.stringify(items) !== JSON.stringify([...names].sort())) out.push(`${loc}: apps ${items.join(', ')}`);
      for (const [name, item] of Object.entries(copy.apps.items)) {
        if (!item.who || !item.what || !item.href) out.push(`${loc}: ${name} is missing who, what or href`);
      }
      if (!copy.headline || !copy.subtitle) out.push(`${loc}: no headline or subtitle`);
      return out;
    });
    expect(wrong, `product.json copy that does not match the registered apps:\n  ${wrong.join('\n  ')}`).toEqual([]);
  });

  it('zh-Hant names every app in the zh-CN wording, in Traditional characters', () => {
    const wrong = apps
      .filter((a) => [...(product.appsHant[a.name] ?? '')].length !== [...a.label['zh-CN']].length)
      .map((a) => `${a.name}: zh-CN 「${a.label['zh-CN']}」, zh-Hant 「${product.appsHant[a.name] ?? ''}」`);
    expect(
      wrong,
      `zh-Hant app names that are missing or not a script conversion of the zh-CN name:\n  ${wrong.join('\n  ')}`,
    ).toEqual([]);
    expect(Object.keys(product.appsHant).sort()).toEqual([...names].sort());
  });

  it('every link in the block lands on a page in every locale', () => {
    const page = (href: string, loc: string): boolean => {
      const rel = href.replace(/^\/docs\/?/, '').replace(/#.*$/, '') || 'index';
      const suffix = loc === 'en' ? '' : `.${loc}`;
      const base = join(REPO_ROOT, 'content', 'docs', rel);
      return existsSync(`${base}${suffix}.mdx`) || existsSync(join(base, `index${suffix}.mdx`));
    };
    const broken = LOCALES.flatMap((loc) => {
      const copy = product.locales[loc];
      const hrefs = [
        ...copy.chain.steps.map((s) => s.href),
        copy.chain.noteHref,
        ...Object.values(copy.apps.items).map((i) => i.href),
      ];
      return hrefs.filter((h) => !page(h, loc)).map((h) => `${loc}: ${h}`);
    });
    expect(broken, `product.json links to pages that do not exist:\n  ${broken.join('\n  ')}`).toEqual([]);
  });
});
