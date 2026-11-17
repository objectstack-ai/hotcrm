// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the collection plan, invoices and payments
 * (#2529, #2411). How a twin is built: `src/sales/data/_locale.ts`.
 *
 * A step's name and note are said in Chinese. An invoice number and a bank
 * reference are codes, not words, but each is its dataset's seed identity, and
 * no Chinese key may reuse an English one (`test/seed-locale-twins.test.ts`):
 * the twin's invoice is numbered `FP-…` (发票) and its bank reference `YH-…`
 * (银行), digits kept. Contracts are named by their Chinese description, the
 * Chinese contracts' own seed identity, and an account by its Chinese name.
 */
import { billingMilestones, invoices, payments } from './o2c.seed';
import { zhCNTwin, zhKey } from '../../sales/data/_locale';
import { zhContractDescription } from '../../sales/data/contract.zh-CN.seed';
import { zhAccountName } from '../../sales/data/sales.zh-CN.seed';

const MILESTONES_ZH: Record<string, Record<string, unknown>> = {
  'Initech Q1 service fee': { name: '英泰第一季度服务费', description: '服务协议第一季度，在季度初开票。' },
  'Initech Q2 service fee': { name: '英泰第二季度服务费', description: '服务协议第二季度。' },
  'Initech Q3 service fee': { name: '英泰第三季度服务费', description: '服务协议第三季度。' },
  'Initech Q4 service fee': { name: '英泰第四季度服务费', description: '服务协议第四季度，也是最后一个季度。' },
  'Acme Year 1 subscription': { name: '艾克美第一年订阅费', description: '平台订阅第一年，按年预付开票。' },
};
const zhMilestoneName = zhKey('billing milestone', MILESTONES_ZH, 'name');

/** `INV-00412` → `FP-00412`: the same digits under the Chinese story's own prefix. */
const zhInvoiceNumber = (english: string): string => {
  if (!english.startsWith('INV-')) throw new Error(`Seed error: invoice number ${JSON.stringify(english)} is not INV-…`);
  return `FP-${english.slice(4)}`;
};
/** `TRX-118730` → `YH-118730`. */
const zhBankRef = (english: string): string => {
  if (!english.startsWith('TRX-')) throw new Error(`Seed error: bank reference ${JSON.stringify(english)} is not TRX-…`);
  return `YH-${english.slice(4)}`;
};

export const billingMilestonesZhCN = zhCNTwin(billingMilestones, {
  words: MILESTONES_ZH,
  text: ['name', 'description'],
  refs: { crm_contract: zhContractDescription },
});

export const invoicesZhCN = zhCNTwin(invoices, {
  refs: {
    invoice_number: zhInvoiceNumber,
    crm_contract: zhContractDescription,
    crm_billing_milestone: zhMilestoneName,
  },
});

export const paymentsZhCN = zhCNTwin(payments, {
  refs: {
    erp_ref: zhBankRef,
    crm_account: zhAccountName,
    crm_contract: zhContractDescription,
    crm_invoice: zhInvoiceNumber,
  },
});
