// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_product`,
 * `crm_price_book`, `crm_price_book_entry`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/zh-CN.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
  crm_contract: {
    _validations: {
      end_after_start: {
        message: '结束日期必须晚于开始日期',
      },
      contract_status_progression: {
        message: '不允许这样更改状态。合同按 草稿 → 审批中 → 已激活 → 已过期 推进；审批中可以退回草稿，草稿、审批中或已激活的合同可以改为已终止。已过期和已终止是最终状态：续约是一份新合同。',
      },
    },
    label: '合同',
    pluralLabel: '合同',
    description: '与客户签署的法律合同',
    fields: {
      contract_number: { label: '合同编号' },
      crm_account: { label: '所属客户' },
      status: {
        label: '状态',
        options: {
          draft: '草稿', in_approval: '审批中', activated: '已激活',
          expired: '已过期', terminated: '已终止',
        },
      },
      start_date: { label: '开始日期' },
      end_date: { label: '结束日期' },
      contract_value: { label: '合同金额' },
      description: { label: '描述' },
      crm_contact: { label: '主要联系人' },
      crm_opportunity: { label: '关联商机' },
      owner_id: { label: '合同负责人' },
      contract_term_months: { label: '合同期限（月）' },
      billing_frequency: {
        label: '计费周期',
        options: { monthly: '按月', quarterly: '按季度', annually: '按年', one_time: '一次性' },
      },
      payment_terms: { label: '付款条款' },
      auto_renewal: { label: '自动续约' },
      renewal_notice_days: { label: '续约通知（天）' },
      contract_type: {
        label: '合同类型',
        options: {
          subscription: '订阅合同', service: '服务协议', license: '授权许可',
          partnership: '合作协议', nda: '保密协议', msa: '主服务协议',
        },
      },
      signed_date: { label: '签署日期' },
      signed_by: { label: '签署人' },
      document_url: { label: '合同文档' },
      special_terms: { label: '特殊条款' },
      billing_address: { label: '账单地址' },
    },
    _views: {
      all_contracts: { label: '全部合同' },
      renewal_calendar: { label: '续约日历' },
      contract_gantt: { label: '合同条款' },
      contract_timeline: { label: '合同时间线' },
    },
    _sections: {
      basic: { label: '合同信息' },
      parties: { label: '签约方' },
      terms: { label: '条款与日期' },
      value: { label: '合同金额' },
      status: { label: '状态与审批' },
      renewal: { label: '续约' },
      // contract.view.ts 表单区块名称 (#1100)
      contract_terms: { label: '条款' },
      signing_and_documents: { label: '签署与文件' },
      notes: { label: '备注' },
    },
  },
};
