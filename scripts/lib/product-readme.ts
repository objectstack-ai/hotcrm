// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The shared product block, written into the two READMEs and the manifest (#2606).
 *
 * The docs site renders the headline, the business chain and the six apps from
 * `apps/docs/lib/product/` (#2608). `README.md` (the marketplace's English
 * detail page), `README.zh-CN.md` (its zh-CN one) and the listing copy in
 * `objectstack.manifest.json` say the same things, and they drifted while each
 * was typed by hand. So `pnpm docs:product` writes them from the same source:
 *
 * - in each README, the text between a `shared:NAME` start marker and its
 *   `/shared:NAME` end marker (HTML comments, so neither GitHub nor the
 *   marketplace shows them) is replaced by the block this module renders;
 * - in the manifest, `description` and `tagline`, and the zh-CN
 *   `translations` entry's, are rewritten; nothing else in the file is.
 *
 * App names are the ones `readProductApps` reads from the metadata; the words
 * around them are `product.json`'s. The READMEs link to the public docs site,
 * https://hotcrm.com/docs, because the marketplace renders only absolute links.
 * `test/readme-product-block.test.ts` fails when a file differs from what this
 * module would write.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProductApp } from './product-apps';

/** The public docs site; `/docs/...` paths in `product.json` resolve against it. */
export const DOCS_SITE = 'https://hotcrm.com';

type Copy = {
  headline: string;
  subtitle: string;
  chain: { title: string; steps: { label: string; href: string }[]; note: string; noteHref: string };
  apps: { title: string; intro: string; who: string; items: Record<string, { who: string; what: string; href: string }> };
};

export type ProductSource = { order: string[]; locales: Record<string, Copy> };

/** `apps/docs/lib/product/product.json`, read from disk (the docs site owns it). */
export function loadProductSource(root: string): ProductSource {
  return JSON.parse(readFileSync(join(root, 'apps', 'docs', 'lib', 'product', 'product.json'), 'utf8'));
}

/** One README and the locales it is written from. */
export type ReadmeLocale = {
  file: string;
  /** The `product.json` locale its words come from. */
  copy: 'en' | 'zh-Hans';
  /** The app-name language, as `readProductApps` returns it. */
  label: 'en' | 'zh-CN';
  /** The docs-site locale prefix (the default locale has none). */
  prefix: string;
  /** The two table headers `product.json` does not carry. */
  headers: { app: string; what: string };
  /** How the app list is joined in a sentence. */
  join: (names: string[]) => string;
};

export const README_LOCALES: ReadmeLocale[] = [
  {
    file: 'README.md',
    copy: 'en',
    label: 'en',
    prefix: '',
    headers: { app: 'App', what: 'What it does' },
    join: (names) => `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`,
  },
  {
    file: 'README.zh-CN.md',
    copy: 'zh-Hans',
    label: 'zh-CN',
    prefix: '/zh-Hans',
    headers: { app: '应用', what: '做什么' },
    join: (names) => names.join('、'),
  },
];

/** The names of the shared blocks, in the order they appear in a README. */
export const BLOCKS = ['headline', 'chain', 'apps'] as const;
export type BlockName = (typeof BLOCKS)[number];

const docsUrl = (loc: ReadmeLocale, href: string): string =>
  href.startsWith('/') ? `${DOCS_SITE}${loc.prefix}${href}` : href;

/** The six apps in the product's order, each with its name and its copy in this README's language. */
function appsOf(source: ProductSource, apps: ProductApp[], loc: ReadmeLocale) {
  const copy = source.locales[loc.copy];
  return source.order.map((name) => {
    const app = apps.find((a) => a.name === name);
    const item = copy.apps.items[name];
    if (!app || !item) throw new Error(`product.json orders app '${name}', which the stack or the ${loc.copy} copy lacks`);
    return { name, label: app.label[loc.label] || app.label.en, ...item };
  });
}

/** The body of each shared block for one README. */
export function readmeBlocks(source: ProductSource, apps: ProductApp[], loc: ReadmeLocale): Record<BlockName, string> {
  const copy = source.locales[loc.copy];
  const chain = copy.chain.steps.map((s) => `[${s.label}](${docsUrl(loc, s.href)})`).join(' → ');
  const rows = appsOf(source, apps, loc).map(
    (a) => `| [${a.label}](${docsUrl(loc, a.href)}) | ${a.who} | ${a.what} |`,
  );
  return {
    headline: `**${copy.headline}**\n\n${copy.subtitle}`,
    chain: `${chain}\n\n[${copy.chain.note}](${docsUrl(loc, copy.chain.noteHref)})`,
    apps: [
      copy.apps.intro,
      '',
      `| ${loc.headers.app} | ${copy.apps.who} | ${loc.headers.what} |`,
      '| --- | --- | --- |',
      ...rows,
    ].join('\n'),
  };
}

const START = (name: string) => `<!-- shared:${name} -->`;
const END = (name: string) => `<!-- /shared:${name} -->`;

/** The text between one block's markers, or undefined when the file carries no such pair. */
export function blockText(text: string, name: BlockName): string | undefined {
  const start = text.indexOf(START(name));
  const end = text.indexOf(END(name));
  if (start < 0 || end < start) return undefined;
  return text.slice(start + START(name).length, end).trim();
}

/**
 * The README with every shared block replaced. Throws when a block's markers
 * are missing or doubled: a README that lost a marker must be fixed by hand,
 * never silently left unwritten.
 */
export function writeReadmeBlocks(text: string, blocks: Record<BlockName, string>, file: string): string {
  let out = text;
  for (const name of BLOCKS) {
    const starts = out.split(START(name)).length - 1;
    const ends = out.split(END(name)).length - 1;
    if (starts !== 1 || ends !== 1 || out.indexOf(END(name)) < out.indexOf(START(name))) {
      throw new Error(`${file}: expected one ${START(name)} … ${END(name)} pair, found ${starts} start and ${ends} end markers`);
    }
    const head = out.slice(0, out.indexOf(START(name)) + START(name).length);
    const tail = out.slice(out.indexOf(END(name)));
    out = `${head}\n\n${blocks[name]}\n\n${tail}`;
  }
  return out;
}

/** The listing copy: the tagline is the headline; the description adds the six apps and the subtitle. */
export function listingCopy(source: ProductSource, apps: ProductApp[], loc: ReadmeLocale): { description: string; tagline: string } {
  const copy = source.locales[loc.copy];
  const names = loc.join(appsOf(source, apps, loc).map((a) => a.label));
  const sep = loc.copy === 'en' ? ': ' : '：';
  const stop = loc.copy === 'en' ? '.' : '。';
  const headline = /[.。]$/.test(copy.headline) ? copy.headline : `${copy.headline}${stop}`;
  return {
    tagline: copy.headline,
    description: [headline, `${copy.apps.title}${sep}${names}${stop}`, copy.subtitle].join(loc.copy === 'en' ? ' ' : ''),
  };
}

/**
 * `objectstack.manifest.json` with the base and zh-CN `description` and
 * `tagline` replaced. Two-space JSON with arrays of plain values kept on one
 * line, as the file is written by hand.
 */
export function writeManifestCopy(text: string, source: ProductSource, apps: ProductApp[]): string {
  const manifest = JSON.parse(text);
  const [en, zh] = README_LOCALES.map((loc) => listingCopy(source, apps, loc));
  manifest.description = en.description;
  manifest.tagline = en.tagline;
  manifest.translations['zh-CN'].description = zh.description;
  manifest.translations['zh-CN'].tagline = zh.tagline;
  const json = JSON.stringify(manifest, null, 2).replace(
    /\[\n\s+((?:"[^"\n]*"|[\d.]+|true|false)(?:,\n\s+(?:"[^"\n]*"|[\d.]+|true|false))*)\n\s+\]/g,
    (_m, inner: string) => `[${inner.split(/,\n\s+/).join(', ')}]`,
  );
  return `${json}\n`;
}
