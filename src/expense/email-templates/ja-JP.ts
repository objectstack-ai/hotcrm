// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 日本語（ja-JP）— 経費モジュールの通知テンプレート（`expense_report_project_approval`）。 */
export const jaJP: EmailTemplatePack = {
  'crm.expense_report_project_over': {
    label: 'クローズ済みプロジェクトの経費精算書',
    subject: '経費精算書が差し戻されました：{{name}}',
    bodyHtml: '<p>経費精算書 {{name}} はプロジェクト {{project}} で提出されましたが、このプロジェクトはクローズまたはキャンセル済みのため経費を受け付けません。下書きに戻りました。精算書を削除し、経費を進行中のプロジェクトに移してから再提出してください。</p>',
  },
  'crm.expense_report_project_locked': {
    label: 'ロック中プロジェクトの経費精算書',
    subject: '経費精算書が差し戻されました：{{name}}',
    bodyHtml: '<p>経費精算書 {{name}} はプロジェクト {{project}} で提出されましたが、このプロジェクトは工数と経費がロックされています。下書きに戻りました。プロジェクトマネージャーが「工数と経費をロック」を外した後に再提出してください。</p>',
  },
};
