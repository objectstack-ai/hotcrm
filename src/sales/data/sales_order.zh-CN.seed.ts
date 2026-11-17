// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the sales orders and their lines (#2555).
 * How a twin is built: `./_locale.ts`.
 *
 * An order's seed identity is its name and a line's is (order, title), so the
 * Chinese name and title are the twins' keys. A line's title is typed text,
 * not a reference: the product names below are the catalogue's Chinese names
 * as the console shows them, written out because an app-package file may not
 * read the module's seed.
 */
import { salesOrders, salesOrderLines } from './sales_order.seed';
import { zhCNTwin, zhKey } from './_locale';
import { zhAccountName, zhContactEmail, zhOpportunityName } from './sales.zh-CN.seed';
import { zhContractDescription } from './contract.zh-CN.seed';

const ORDERS_ZH: Record<string, Record<string, unknown>> = {
  'Acme Annual Renewal 2025 Order': {
    name: '艾克美 2025 年度续约订单',
    description: '本年度的平台订阅：三个租户、高级支持，以及欧洲中东非洲团队的席位。',
  },
  'Globex Seat Expansion Order': {
    name: '环球工业席位扩容订单',
    description: '工厂运营团队直接下单的席位，没有经过报价。',
  },
  'Initech Scanner Kit Order': {
    name: '英泰科技扫码枪套装订单',
    description: '仓库扫码枪，客户确认数量期间先手动录入。',
  },
};

/** Each line's Chinese title and description, keyed `order|title`. */
const LINES_ZH: Record<string, Record<string, unknown>> = {
  'Acme Annual Renewal 2025 Order|ObjectStack Platform': { product_title: 'ObjectStack 平台（企业版）', description: '三个生产租户续约。' },
  'Acme Annual Renewal 2025 Order|Premium Support': { product_title: '高级支持', description: '高级支持续约。' },
  'Acme Annual Renewal 2025 Order|AI Agent Seat (Annual)': { product_title: 'AI 智能体席位（年付）', description: '新的欧洲中东非洲团队带来的席位扩容。' },
  'Globex Seat Expansion Order|AI Agent Seat (Annual)': { product_title: 'AI 智能体席位（年付）', description: '为工厂运营负责人再加十个席位。' },
  'Globex Seat Expansion Order|Admin Training Workshop': { product_title: '管理员培训工作坊', description: '为新席位持有人安排两天工作坊。' },
  'Initech Scanner Kit Order|Barcode scanner kit': { product_title: '条码扫描枪套装', description: '仓库前台用的手持扫码枪。' },
  'Initech Scanner Kit Order|On-site installation': { product_title: '上门安装', description: '技术人员上门一次，完成扫码枪安装。' },
};

export const salesOrdersZhCN = zhCNTwin(salesOrders, {
  words: ORDERS_ZH,
  text: ['name', 'description'],
  refs: {
    crm_account: zhAccountName,
    crm_contact: zhContactEmail,
    crm_opportunity: zhOpportunityName,
    crm_contract: zhContractDescription,
  },
});

export const salesOrderLinesZhCN = zhCNTwin(salesOrderLines, {
  key: (r) => `${String(r.crm_sales_order)}|${String(r.product_title)}`,
  words: LINES_ZH,
  text: ['product_title', 'description'],
  refs: { crm_sales_order: zhKey('order', ORDERS_ZH, 'name') },
});
