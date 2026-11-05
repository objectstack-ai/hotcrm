// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The product catalogue and its Standard price book, once per language market
 * (#2411) — the reference copy a SaaS tenant starts from.
 *
 * Maintainer ruling 2026-11-05 (option A, quoted untranslated): 「hotcrm 的模拟
 * 数据，能不能中文客户安装时安装中文数据」. A Chinese tenant gets the Simplified
 * Chinese catalogue below; every other tenant gets the English one. The
 * selection is the platform's `Seed.locale` axis (#16595), declared on each
 * dataset here, never a branch this app makes. `SaasTenantSeedData` in
 * `objectstack.composition.ts` registers all six; a tenant receives three.
 *
 * ⚠️ Blocked-by objectstack#30281. On 18.3.0 only the boot path filters by
 * locale: marketplace install, reseed sample data and package apply load every
 * locale-scoped dataset (ruled on #17011). Measured on 18.3.0 with a load that
 * carries no locale: the English rows land first, and every Chinese twin is
 * refused — a product on its SKU (`sku` is unique per organization), the book
 * as a second standard book — so a Chinese tenant still gets the English
 * catalogue, behind a page of refused inserts. The card ships when a pinned
 * release selects by the installing organization's locale (AGENTS.md rule 2).
 *
 * Only the SaaS shape is scoped. The default composition registers the
 * UNSCOPED English catalogue (`catalog.seed.ts`, `price-book.seed.ts`),
 * because its storytelling families price their line items against the
 * English products by name: scoped out under `zh-CN`, the catalogue would
 * leave every Acme opportunity and quote line without a product, and the
 * Chinese twins beside it would make a second standard book, which
 * `price_book` refuses. A Chinese demo story is its own card.
 *
 * Only the Chinese WORDS are authored here. Every other column — SKU,
 * category, family, list price, cost, active flag — is read off the English
 * record with the same SKU, so the two catalogues cannot be priced apart, and a
 * product added to the English catalogue without a Chinese name throws at
 * build time instead of shipping a Chinese tenant an English row. Prices are
 * plain numbers in the tenant's own currency, as in the English catalogue.
 */
import { defineSeed } from '@objectstack/spec/data';
import { Product } from '../objects/product.object';
import { PriceBook } from '../objects/price_book.object';
import { PriceBookEntry } from '../objects/price_book_entry.object';
import { products } from './catalog.seed';
import { priceBooks, priceBookEntries } from './price-book.seed';

// ─── English: every supported locale but zh-CN ────────────────────────
// Written out because a `Seed.locale` tag matches exactly: there is no
// "every locale except" spelling, and an unlisted locale would get no
// catalogue at all. `test/catalogue-locale-seed.test.ts` holds the two lists
// to the app's `supportedLocales`, so a locale added there without a
// catalogue goes red.

/** The locales the English catalogue is for. */
export const CATALOGUE_EN_LOCALES = ['en', 'ja-JP', 'es-ES'];

export const productsEn = { ...products, locale: CATALOGUE_EN_LOCALES };
export const priceBooksEn = { ...priceBooks, locale: CATALOGUE_EN_LOCALES };
export const priceBookEntriesEn = { ...priceBookEntries, locale: CATALOGUE_EN_LOCALES };

// ─── Simplified Chinese ───────────────────────────────────────────────

/** The locale the Chinese catalogue is for. */
export const CATALOGUE_ZH_CN_LOCALES = ['zh-CN'];

/** The Chinese name and description of each English product, keyed by SKU. */
const ZH_CN_WORDS: Record<string, { name: string; description: string }> = {
  'OS-PLAT-ENT': {
    name: 'ObjectStack 平台（企业版）',
    description: '企业版：对象数量不限，含 AI 智能体、治理与审计。',
  },
  'OS-PLAT-SMB': {
    name: 'ObjectStack 平台（中小企业版）',
    description: '面向中型企业的版本：核心 CRM 对象与自动化，AI 智能体用量有上限。',
  },
  'OS-CLOUD-HOST': {
    name: '云托管（年付）',
    description: '托管式部署，数据可按区域存放，可用性目标 99.9%。',
  },
  'OS-CLOUD-SBX': {
    name: '沙箱环境（年付）',
    description: '完整复制的非生产环境，用于在发布前测试元数据变更。',
  },
  'OS-AI-SEAT': {
    name: 'AI 智能体席位（年付）',
    description: '按指定用户计的 Co-Pilot 与智能体使用席位，按年计费。',
  },
  'OS-ADDON-ANL': {
    name: '分析增值包',
    description: '为营收团队提供仪表板、多维数据集和定时报表。',
  },
  'OS-ADDON-INT': {
    name: '集成连接器包',
    description: '预置连接器，可对接 ERP、营销自动化和数据仓库。',
  },
  'OS-ADDON-FSM': {
    name: '现场服务移动端',
    description: '支持离线使用的移动应用，供现场技术人员和按路线开展的服务工作使用。',
  },
  'OS-SUP-PREM': {
    name: '高级支持',
    description: '7×24 小时支持，P1 问题一小时内响应，并配备专属技术客户经理。',
  },
  'OS-SUP-STD': {
    name: '标准支持',
    description: '工作时间内支持，下一个工作日内响应。',
  },
  'OS-SVC-IMPL': {
    name: '实施服务',
    description: '全程指导实施：需求调研、元数据搭建、系统集成和上线支持。',
  },
  'OS-SVC-MIGR': {
    name: '数据迁移服务',
    description: '从旧 CRM 系统和电子表格中提取、映射并核对数据。',
  },
  'OS-SVC-TRN': {
    name: '管理员培训工作坊',
    description: '为期一天的管理员工作坊，内容涵盖元数据、权限和分析。',
  },
};

const wordsFor = (sku: unknown): { name: string; description: string } => {
  const words = typeof sku === 'string' ? ZH_CN_WORDS[sku] : undefined;
  if (!words) throw new Error(`Seed error: catalogue product ${String(sku)} has no zh-CN name`);
  return words;
};

export const productsZhCN = defineSeed(Product, {
  mode: 'ignore',
  externalId: 'name',
  locale: CATALOGUE_ZH_CN_LOCALES,
  records: products.records.map((product) => ({ ...product, ...wordsFor(product.sku) })),
});

/** The Chinese standard book's name, and its seed identity. */
export const STANDARD_PRICE_BOOK_ZH_CN = '标准价格表';

export const priceBooksZhCN = defineSeed(PriceBook, {
  mode: 'ignore',
  externalId: 'name',
  locale: CATALOGUE_ZH_CN_LOCALES,
  records: [
    {
      name: STANDARD_PRICE_BOOK_ZH_CN,
      description: '目录中每个产品的标价。',
      is_active: true,
      is_standard: true,
    },
  ],
});

export const priceBookEntriesZhCN = defineSeed(PriceBookEntry, {
  mode: 'ignore',
  externalId: ['crm_price_book', 'crm_product'],
  locale: CATALOGUE_ZH_CN_LOCALES,
  records: productsZhCN.records.map((product) => ({
    crm_price_book: STANDARD_PRICE_BOOK_ZH_CN,
    crm_product: String(product.name),
    list_price: product.list_price,
    is_active: true,
  })),
});
