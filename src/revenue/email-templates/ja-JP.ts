// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 日本語 (ja-JP) — the revenue package's notification templates. See `en.ts`. */
export const jaJP: EmailTemplatePack = {
  'crm.contract_expired': {
    label: '契約の満了',
    subject: '契約が満了しました: {{contract_number}}',
    bodyHtml: '<p>契約 {{contract_number}} は終了日に達し、満了として記録されました。</p>',
  },
  'crm.contract_renewal': {
    label: '契約更新の時期',
    subject: '契約の更新時期です: {{contract_number}}',
    bodyHtml: '<p>契約 {{contract_number}} は {{end_date}} に終了します。更新の相談を始めてください。</p>',
  },
  'crm.quote_created': {
    label: '見積の作成',
    subject: '見積を作成しました: {{quote_name}}',
    bodyHtml: '<p>この商談から見積 {{quote_name}} が作成されました。</p>',
  },
};
