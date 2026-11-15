// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 日本語（ja-JP）— プロジェクト デリバリーの通知テンプレート（`project_budget_alert`）。 */
export const jaJP: EmailTemplatePack = {
  'crm.project_budget_warning': {
    label: 'プロジェクト予算警告',
    subject: '予算警告: {{name}}',
    bodyHtml: '<p>プロジェクト {{name}} の支出が承認済み予算の 80% 以上に達しました。予算残高を確認してください。これ以上の工数や経費を提出させない場合は、プロジェクトの「工数と経費をロック」にチェックを入れてください。</p>',
  },
  'crm.project_budget_exceeded': {
    label: 'プロジェクト予算超過',
    subject: '予算超過: {{name}}',
    bodyHtml: '<p>プロジェクト {{name}} は承認済み予算をすべて使い切りました。工数と経費の提出を止めるには、プロジェクトの「工数と経費をロック」にチェックを入れ、新しい予算を合意してください。</p>',
  },
};
