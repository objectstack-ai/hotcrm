// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 简体中文 (zh-CN) — the revenue package's notification templates. See `en.ts`. */
export const zhCN: EmailTemplatePack = {
  'crm.quote_created': {
    label: '报价单已创建',
    subject: '报价单已创建：{{quote_name}}',
    bodyHtml: '<p>您的报价单 {{quote_name}} 已从该商机创建。</p>',
  },
};
