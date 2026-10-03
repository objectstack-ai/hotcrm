// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 简体中文 (zh-CN) — the revenue package's notification templates. See `en.ts`. */
export const zhCN: EmailTemplatePack = {
  'crm.contract_expired': {
    label: '合同已到期',
    subject: '合同已到期：{{contract_number}}',
    bodyHtml: '<p>合同 {{contract_number}} 已到达结束日期，并已标记为到期。</p>',
  },
  'crm.contract_renewal': {
    label: '合同续约提醒',
    subject: '合同待续约：{{contract_number}}',
    bodyHtml: '<p>合同 {{contract_number}} 将于 {{end_date}} 结束。请立即启动续约沟通。</p>',
  },
  'crm.quote_created': {
    label: '报价单已创建',
    subject: '报价单已创建：{{quote_name}}',
    bodyHtml: '<p>您的报价单 {{quote_name}} 已从该商机创建。</p>',
  },
};
