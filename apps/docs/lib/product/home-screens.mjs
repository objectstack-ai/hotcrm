// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The homepage screenshots (#2694): which published screen the homepage shows
 * where, and the generator of `home-screens.generated.json`, the file the page
 * reads. Run it after a screen is re-captured or its `meta.yaml` changes:
 *
 *     node apps/docs/lib/product/home-screens.mjs
 *
 * Each entry is read from `assets/screenshots/hotcrm/<id>/meta.yaml` (title,
 * alt, the file per locale, `status`) and from the image file itself (its pixel
 * size, so the page reserves the space before the image loads). Captions and
 * alt text are therefore the screen's own words, never typed into the page.
 * `test/docs-home-screens.test.ts` fails while the generated file is stale.
 *
 * The images are the README's: hero `sales-pipeline`, then one per app, the six
 * README.md `section:screenshots` shows. They are served by the docs build's
 * existing copy, `scripts/sync-docs-screenshots.mjs`.
 */

import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The hero shot, below the headline and buttons, and the app whose docs page it opens. */
export const HERO_SCREEN = 'sales-pipeline';
export const HERO_APP = 'crm_enterprise';

/** One shot per app, keyed by the app name `product.json` orders. */
export const APP_SCREENS = {
  crm_enterprise: 'sales-order',
  crm_service: 'case-detail',
  crm_marketing: 'campaign-detail',
  crm_o2c: 'invoice-payments',
  crm_psa: 'project-plan',
  crm_expenses: 'expense-report',
};

/** The locales a screen ships. A zh-Hant page borrows zh-Hans (the #1397 ruling, in executive-dashboard/meta.yaml). */
export const SCREEN_LOCALES = ['en', 'zh-Hans'];

export const HOME_SCREEN_IDS = [HERO_SCREEN, ...Object.values(APP_SCREENS)];

const SCREEN_ROOT = ['assets', 'screenshots', 'hotcrm'];

/**
 * @typedef {{ status?: string, locales?: Record<string, string>, title?: Record<string, string>, alt?: Record<string, string> }} ScreenMeta
 */

/**
 * Reads the keys this page needs from a screen's `meta.yaml`: the top-level
 * `status` scalar and the `locales`, `title` and `alt` maps of one-line
 * scalars. It is deliberately narrow — any other shape for those keys (a
 * block scalar, a flow map, a continued line) throws rather than guesses.
 *
 * @param {string} yaml
 * @param {string} where
 * @returns {ScreenMeta}
 */
export function readScreenMeta(yaml, where) {
  const lines = yaml.split(/\r?\n/);
  /** @type {ScreenMeta} */
  const out = {};
  const scalar = (raw, at) => {
    const v = raw.trim();
    if (v.startsWith("'")) {
      if (!/^'(?:[^']|'')*'$/.test(v)) throw new Error(`${at}: unterminated single-quoted scalar`);
      return v.slice(1, -1).replace(/''/g, "'");
    }
    if (v.startsWith('"')) return JSON.parse(v);
    if (v === '' || /^[|>{[&*!]/.test(v)) throw new Error(`${at}: unsupported YAML scalar ${JSON.stringify(v)}`);
    return v.replace(/\s+#.*$/, '');
  };
  for (let i = 0; i < lines.length; i++) {
    const top = /^(status|locales|title|alt):(.*)$/.exec(lines[i]);
    if (!top) continue;
    const [, key, rest] = top;
    if (key === 'status') {
      out.status = scalar(rest, `${where}:${i + 1}`);
      continue;
    }
    if (rest.trim() !== '') throw new Error(`${where}:${i + 1}: \`${key}\` must be a map of locales`);
    const map = {};
    for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) {
      if (lines[j].trim() === '') continue;
      const entry = /^ {2}([A-Za-z-]+):(.*)$/.exec(lines[j]);
      if (!entry) throw new Error(`${where}:${j + 1}: unsupported line under \`${key}\``);
      map[entry[1]] = scalar(entry[2], `${where}:${j + 1}`);
    }
    out[key] = map;
  }
  return out;
}

/** Width and height from a PNG's IHDR chunk, or a baseline/progressive JPEG's SOF marker. */
export function imageSize(buf, where) {
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let at = 2;
    while (at < buf.length) {
      const marker = buf[at + 1];
      const length = buf.readUInt16BE(at + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { width: buf.readUInt16BE(at + 7), height: buf.readUInt16BE(at + 5) };
      at += 2 + length;
    }
  }
  throw new Error(`${where}: not a PNG or JPEG this reader can size`);
}

/** One screen as the homepage shows it, or a throw naming what is wrong with it. */
export function readHomeScreen(root, id) {
  const dir = join(root, ...SCREEN_ROOT, id);
  const where = `assets/screenshots/hotcrm/${id}/meta.yaml`;
  const meta = readScreenMeta(readFileSync(join(dir, 'meta.yaml'), 'utf8'), where);
  if (meta.status !== 'published') throw new Error(`${where}: status is ${meta.status ?? 'missing'}, not published`);
  const sizes = [];
  const locales = Object.fromEntries(
    SCREEN_LOCALES.map((loc) => {
      const file = meta.locales?.[loc];
      const title = meta.title?.[loc];
      const alt = meta.alt?.[loc];
      if (!file || !title || !alt) throw new Error(`${where}: no ${loc} file, title or alt`);
      sizes.push(imageSize(readFileSync(join(dir, file)), `${id}/${file}`));
      return [loc, { src: `/screenshots/hotcrm/${id}/${file}`, title, alt }];
    }),
  );
  const [{ width, height }] = sizes;
  if (sizes.some((s) => s.width !== width || s.height !== height)) {
    throw new Error(`${id}: the locale files differ in size (${sizes.map((s) => `${s.width}x${s.height}`).join(', ')})`);
  }
  return { id, width, height, locales };
}

/** The text of `home-screens.generated.json`. */
export function renderHomeScreens(root) {
  const data = {
    $comment:
      'Generated by `node apps/docs/lib/product/home-screens.mjs` from assets/screenshots/hotcrm/*/meta.yaml. Do not edit.',
    hero: { app: HERO_APP, ...readHomeScreen(root, HERO_SCREEN) },
    apps: Object.fromEntries(Object.entries(APP_SCREENS).map(([app, id]) => [app, readHomeScreen(root, id)])),
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

export const GENERATED_PATH = ['apps', 'docs', 'lib', 'product', 'home-screens.generated.json'];

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  writeFileSync(join(root, ...GENERATED_PATH), renderHomeScreens(root));
  console.log(`wrote ${HOME_SCREEN_IDS.length} screens to ${GENERATED_PATH.join('/')}`);
}
