// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { CrmSeedData, SaasTenantSeedData, appStack } from '../objectstack.composition';
import { products } from '../src/revenue/data/catalog.seed';
import { priceBooks, priceBookEntries, STANDARD_PRICE_BOOK } from '../src/revenue/data/price-book.seed';
import {
  CATALOGUE_EN_LOCALES, CATALOGUE_ZH_CN_LOCALES, STANDARD_PRICE_BOOK_ZH_CN,
  productsEn, priceBooksEn, priceBookEntriesEn, productsZhCN, priceBooksZhCN, priceBookEntriesZhCN,
} from '../src/revenue/data/catalog-by-locale.seed';
import { COMPOSITION_ENV_VAR } from '../src/sales/data/index';
import { bootOptions } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The catalogue a SaaS tenant starts from, once per language market (#2411).
 *
 * Maintainer ruling 2026-11-05, option A: a Chinese tenant gets a Chinese
 * catalogue. The SaaS shape registers the English catalogue scoped to every
 * supported locale but `zh-CN` and a Simplified Chinese twin scoped to `zh-CN`,
 * and the platform's `Seed.locale` filter hands a tenant one of the two.
 *
 * Pinned here: the twin is the same catalogue in other words (one SKU, one
 * price, one cost per product), the two locale lists cover the app's
 * `supportedLocales` exactly once each, and the default composition is
 * untouched. The boot block measures the selection on the one path that
 * filters on 18.3.0, the boot seed, which reads the artifact's
 * `i18n.defaultLocale`; the install paths wait on objectstack#30281.
 */

const english = products.records as Rec[];
const chinese = productsZhCN.records as Rec[];
const CJK = /[一-鿿]/;
const WORDS = new Set(['name', 'description']);

describe('the zh-CN catalogue is the English one in other words', () => {
  it('one Chinese product per English product, keyed by SKU', () => {
    expect(chinese.map((p) => p.sku)).toEqual(english.map((p) => p.sku));
  });

  it('every column but the words is the English record\'s', () => {
    for (const [i, en] of english.entries()) {
      const zh = chinese[i]!;
      for (const key of new Set([...Object.keys(en), ...Object.keys(zh)])) {
        if (WORDS.has(key)) continue;
        expect(zh[key], `${String(en.sku)}.${key}`).toEqual(en[key]);
      }
    }
  });

  it('every name and description is written in Chinese, and no name is an English one', () => {
    const englishNames = new Set(english.map((p) => p.name));
    for (const zh of chinese) {
      expect(String(zh.name), `${String(zh.sku)} name`).toMatch(CJK);
      expect(String(zh.description), `${String(zh.sku)} description`).toMatch(CJK);
      expect(englishNames.has(zh.name), `${String(zh.name)} collides with an English name`).toBe(false);
    }
    expect(new Set(chinese.map((p) => p.name)).size).toBe(chinese.length);
  });

  it('one Chinese standard book, one entry per Chinese product at its list price', () => {
    expect(priceBooksZhCN.records).toEqual([
      expect.objectContaining({ name: STANDARD_PRICE_BOOK_ZH_CN, is_standard: true, is_active: true }),
    ]);
    expect(priceBookEntriesZhCN.records).toEqual(chinese.map((p) => ({
      crm_price_book: STANDARD_PRICE_BOOK_ZH_CN,
      crm_product: p.name,
      list_price: p.list_price,
      is_active: true,
    })));
  });
});

describe('the locale scopes', () => {
  it('the English and Chinese lists cover the app\'s supported locales, each exactly once', () => {
    const supported = [...(appStack as Rec).i18n.supportedLocales].sort();
    expect([...CATALOGUE_EN_LOCALES, ...CATALOGUE_ZH_CN_LOCALES].sort()).toEqual(supported);
    expect(CATALOGUE_EN_LOCALES.filter((l) => CATALOGUE_ZH_CN_LOCALES.includes(l))).toEqual([]);
  });

  it('the SaaS shape registers both catalogues, each scoped', () => {
    expect(SaasTenantSeedData).toEqual([
      productsEn, priceBooksEn, priceBookEntriesEn, productsZhCN, priceBooksZhCN, priceBookEntriesZhCN,
    ]);
    for (const family of [productsEn, priceBooksEn, priceBookEntriesEn]) expect(family.locale).toEqual(CATALOGUE_EN_LOCALES);
    for (const family of [productsZhCN, priceBooksZhCN, priceBookEntriesZhCN]) expect(family.locale).toEqual(['zh-CN']);
    // The English scoped copies carry the English rows themselves.
    expect(productsEn.records).toBe(products.records);
    expect(priceBooksEn.records).toBe(priceBooks.records);
    expect(priceBookEntriesEn.records).toBe(priceBookEntries.records);
  });

  it('the default composition is untouched: no family scoped, no Chinese twin', () => {
    // Its storytelling line items price against the English products by name,
    // so the English catalogue there is every locale's (see catalog-by-locale.seed.ts).
    for (const family of CrmSeedData as Rec[]) {
      expect(family.locale, `${String(family.object)} is scoped in the default composition`).toBeUndefined();
    }
    for (const twin of [productsZhCN, priceBooksZhCN, priceBookEntriesZhCN]) {
      expect((CrmSeedData as unknown[]).includes(twin)).toBe(false);
    }
  });
});

/** The SaaS artifact, imported fresh under the composition knob, booting in `locale`. */
async function saasArtifactIn(locale: string): Promise<Rec> {
  const previous = process.env[COMPOSITION_ENV_VAR];
  process.env[COMPOSITION_ENV_VAR] = 'saas';
  vi.resetModules();
  try {
    const artifact = ((await import('../objectstack.config')) as Rec).default as Rec;
    return { ...artifact, i18n: { ...artifact.i18n, defaultLocale: locale } };
  } finally {
    if (previous === undefined) delete process.env[COMPOSITION_ENV_VAR];
    else process.env[COMPOSITION_ENV_VAR] = previous;
    vi.resetModules();
  }
}

describe.each([
  { locale: 'zh-CN', catalogue: chinese, book: STANDARD_PRICE_BOOK_ZH_CN, other: english },
  { locale: 'en', catalogue: english, book: STANDARD_PRICE_BOOK, other: chinese },
])('a SaaS boot in $locale seeds that locale\'s catalogue only', ({ locale, catalogue, book, other }) => {
  let stack: VerifyStack | undefined;

  beforeAll(async () => {
    stack = await bootStack(await saasArtifactIn(locale), bootOptions());
  }, 300_000);

  afterAll(async () => {
    await stack?.stop();
  });

  it('the products are this locale\'s, and none of the other\'s', async () => {
    const rows = await stack!.rows('crm_product');
    expect(rows.map((r) => String(r.name)).sort()).toEqual(catalogue.map((p) => String(p.name)).sort());
    const otherNames = new Set(other.map((p) => p.name));
    expect(rows.filter((r) => otherNames.has(r.name))).toEqual([]);
  });

  it('one standard book, this locale\'s, with one entry per product at its list price', async () => {
    const books = await stack!.rows('crm_price_book', { is_standard: true });
    expect(books.map((b) => b.name)).toEqual([book]);
    const entries = await stack!.rows('crm_price_book_entry', { crm_price_book: books[0]!.id });
    const productsById = new Map((await stack!.rows('crm_product')).map((p) => [String(p.id), p]));
    expect(entries).toHaveLength(catalogue.length);
    for (const entry of entries) {
      const product = productsById.get(String(entry.crm_product));
      expect(product, 'an entry points at a seeded product').toBeDefined();
      expect(entry.list_price, String(product!.name)).toBe(product!.list_price);
    }
  });
});
