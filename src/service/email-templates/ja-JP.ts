// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 日本語 (ja-JP) — the service package's notification templates. See `en.ts`. */
export const jaJP: EmailTemplatePack = {
  'crm.case_escalated': {
    label: 'ケースのエスカレーション',
    subject: 'ケースがエスカレーションされました: {{case_number}}',
    bodyHtml: '<p>ケース {{case_number}}（{{priority}}）は重大度が高いため自動的にエスカレーションされました。所有権は負荷の最も軽いサービスマネージャーに移ります。その役職に誰もいない間は、ケースはあなたのままです。ケースを開いて現在の所有者をご確認ください。</p>',
  },
  'crm.case_sla_breach': {
    label: 'ケースの SLA 超過',
    subject: 'SLA 超過: ケース {{case_number}}',
    bodyHtml: '<p>ケース {{case_number}}（{{priority}}）は SLA 期限を過ぎたため、自動的にエスカレーションされました。</p>',
  },
};
