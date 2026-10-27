// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 日本語 (ja-JP) — the revenue package's notification templates. See `en.ts`. */
export const jaJP: EmailTemplatePack = {
  'crm.quote_created': {
    label: '見積の作成',
    subject: '見積を作成しました: {{quote_name}}',
    bodyHtml: '<p>この商談から見積 {{quote_name}} が作成されました。</p>',
  },
};
