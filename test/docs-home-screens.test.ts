// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import {
  APP_SCREENS,
  GENERATED_PATH,
  HERO_APP,
  HOME_SCREEN_IDS,
  SCREEN_LOCALES,
  readScreenMeta,
  renderHomeScreens,
} from '../apps/docs/lib/product/home-screens.mjs';
import { locales as SYNC_LOCALES, screenshots as SYNC_LIST } from '../scripts/sync-docs-screenshots.mjs';

/**
 * The homepage shows the README's screenshots (#2694): a hero shot and one per
 * app, each served from `/screenshots/hotcrm/<id>/<locale>.<ext>` by the docs
 * build's copy, `scripts/sync-docs-screenshots.mjs`. A screen the homepage names
 * reaches a visitor only when all three hold, so each is pinned on its own:
 *  - its `meta.yaml` says `status: published` (a retired capture stays off the site);
 *  - both locale files exist under the name the copy reads, so neither page 404s;
 *  - the copy's list names it, or the image is never in `public/` at all.
 * The page reads captions and alt text from `home-screens.generated.json`, so
 * that file is held to what the screens' `meta.yaml` say today.
 */
describe('the homepage screenshots are published screens the docs build serves (#2694)', () => {
  const SCREENS = join(REPO_ROOT, 'assets', 'screenshots', 'hotcrm');
  const synced = new Map(SYNC_LIST.map((s: { id: string; extension?: string }) => [s.id, s.extension ?? 'png']));
  const meta = (id: string) =>
    readScreenMeta(readFileSync(join(SCREENS, id, 'meta.yaml'), 'utf8'), `assets/screenshots/hotcrm/${id}/meta.yaml`);

  it('every homepage screen is status: published', () => {
    const wrong = HOME_SCREEN_IDS.filter((id) => meta(id).status !== 'published').map(
      (id) => `${id}: status ${meta(id).status ?? 'missing'}`,
    );
    expect(wrong, `homepage screens that are not published:\n  ${wrong.join('\n  ')}`).toEqual([]);
  });

  it('every homepage screen has both locale files, under the name the docs copy reads', () => {
    expect(SCREEN_LOCALES).toEqual(SYNC_LOCALES);
    const wrong = HOME_SCREEN_IDS.flatMap((id) =>
      SCREEN_LOCALES.flatMap((loc) => {
        const file = `${loc}.${synced.get(id) ?? 'png'}`;
        const out: string[] = [];
        if (!existsSync(join(SCREENS, id, file))) out.push(`${id}/${file} does not exist`);
        if (meta(id).locales?.[loc] !== file) out.push(`${id}: meta.yaml names ${meta(id).locales?.[loc]} for ${loc}, the copy reads ${file}`);
        return out;
      }),
    );
    expect(wrong, `homepage screens missing a locale file:\n  ${wrong.join('\n  ')}`).toEqual([]);
  });

  it('every homepage screen is in the docs build copy list', () => {
    const missing = HOME_SCREEN_IDS.filter((id) => !synced.has(id));
    expect(missing, `homepage screens scripts/sync-docs-screenshots.mjs does not copy: ${missing.join(', ')}`).toEqual([]);
  });

  it('every app of the product block has a screen, and the hero opens one of them', () => {
    const product = JSON.parse(readFileSync(join(REPO_ROOT, 'apps', 'docs', 'lib', 'product', 'product.json'), 'utf8'));
    expect(Object.keys(APP_SCREENS).sort(), 'APP_SCREENS must key exactly the apps product.json orders').toEqual(
      [...product.order].sort(),
    );
    expect(product.order).toContain(HERO_APP);
  });

  it('home-screens.generated.json is what the generator writes from meta.yaml today', () => {
    expect(
      readFileSync(join(REPO_ROOT, ...GENERATED_PATH), 'utf8'),
      'home-screens.generated.json is stale: a screen was re-captured or its meta.yaml changed. Run `node apps/docs/lib/product/home-screens.mjs`.',
    ).toBe(renderHomeScreens(REPO_ROOT));
  });
});
