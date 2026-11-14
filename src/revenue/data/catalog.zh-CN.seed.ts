// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the product catalogue and its Standard price
 * book (#2411). How a twin is built, and why every dataset has one:
 * `src/sales/data/_locale.ts`.
 *
 * Only the Chinese WORDS are authored here, keyed by SKU. Every other column
 * (SKU, category, family, list price, cost, active flag) is the English
 * record's, so the two catalogues cannot be priced apart. Prices are plain
 * numbers in the tenant's own currency, as in the English catalogue. The SaaS
 * shape registers this catalogue too (`SaasTenantSeedData`).
 */
import { products } from './catalog.seed';
import { priceBooks, priceBookEntries, STANDARD_PRICE_BOOK } from './price-book.seed';
import { zhCNTwin, zhKey } from '../../sales/data/_locale';

const PRODUCTS_ZH: Record<string, Record<string, unknown>> = {
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

/** English product name → its record's SKU, the key the words are authored by. */
const SKU_BY_NAME = new Map(products.records.map((p) => [String(p.name), String(p.sku)]));

/** The Chinese name of the product an English row names. */
export const zhProductName = (english: string): string =>
  zhKey('product', PRODUCTS_ZH, 'name')(SKU_BY_NAME.get(english) ?? english);

export const productsZhCN = zhCNTwin(products, {
  key: (r) => String(r.sku),
  words: PRODUCTS_ZH,
  text: ['name', 'description'],
});

/** The Chinese standard book's name, and its seed identity. */
export const STANDARD_PRICE_BOOK_ZH_CN = '标准价格表';

const PRICE_BOOKS_ZH: Record<string, Record<string, unknown>> = {
  [STANDARD_PRICE_BOOK]: { name: STANDARD_PRICE_BOOK_ZH_CN, description: '目录中每个产品的标价。' },
};

export const priceBooksZhCN = zhCNTwin(priceBooks, {
  words: PRICE_BOOKS_ZH,
  text: ['name', 'description'],
});

export const priceBookEntriesZhCN = zhCNTwin(priceBookEntries, {
  refs: { crm_price_book: zhKey('price book', PRICE_BOOKS_ZH, 'name'), crm_product: zhProductName },
});
