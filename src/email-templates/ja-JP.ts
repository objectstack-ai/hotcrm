// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';

/**
 * 日本語 (`ja-JP`) — notification bundles for the `notify` flow nodes.
 *
 * Row-for-row with `en-US.ts`: same `name`, same `{{key}}` placeholders, same
 * order. Object nouns follow the ja-JP language pack
 * (`src/translations/ja-JP/`).
 */
export const jaJP: EmailTemplateDefinition[] = [
  {
    name: 'crm_case_escalated', label: 'ケースがエスカレーションされました', category: 'notification', locale: 'ja-JP',
    subject: 'ケースがエスカレーションされました: {{case_number}}',
    bodyHtml: '<p>ケース {{case_number}}（{{priority}}）は優先度が緊急のため自動的にエスカレーションされました。所有権は負荷が最も軽いサービスマネージャーに移ります。その役職が空席の間、ケースはお客様の担当のままです。現在の担当者はケースを開いてご確認ください。</p>',
  },
  {
    name: 'crm_case_sla_breach', label: 'ケースが SLA を超過', category: 'notification', locale: 'ja-JP',
    subject: 'SLA 超過: ケース {{case_number}}',
    bodyHtml: '<p>ケース {{case_number}}（{{priority}}）は SLA の期限を超過し、自動的にエスカレーションされました。</p>',
  },
  {
    name: 'crm_contact_welcome', label: '新しい取引先責任者', category: 'notification', locale: 'ja-JP',
    subject: '新しい取引先責任者: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} が取引先責任者として追加されました。ご連絡のうえ歓迎してください。</p>',
  },
  {
    name: 'crm_contract_expired', label: '契約が期限切れ', category: 'notification', locale: 'ja-JP',
    subject: '契約が期限切れ: {{contract_number}}',
    bodyHtml: '<p>契約 {{contract_number}} は終了日に達し、期限切れとしてマークされました。</p>',
  },
  {
    name: 'crm_contract_renewal', label: '契約更新期限', category: 'notification', locale: 'ja-JP',
    subject: '契約更新期限: {{contract_number}}',
    bodyHtml: '<p>契約 {{contract_number}} は {{end_date}} に終了します。今すぐ更新の商談を開始してください。</p>',
  },
  {
    name: 'crm_lead_hot', label: 'ホットリードの割り当て', category: 'notification', locale: 'ja-JP',
    subject: 'ホットリード — 24 時間以内に割り当て: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{company}} の {{first_name}} {{last_name}}（評価 {{rating}}）には本日中に担当者が必要です。</p>',
  },
  {
    name: 'crm_lead_new', label: '新しいリードの割り当て', category: 'notification', locale: 'ja-JP',
    subject: '割り当て待ちの新しいリード: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{company}} の {{first_name}} {{last_name}} が割り当てを待っています。</p>',
  },
  {
    name: 'crm_lead_converted', label: 'リードが取引開始', category: 'notification', locale: 'ja-JP',
    subject: 'リードが取引開始: {{first_name}} {{last_name}}',
    bodyHtml: '<p>リード {{first_name}} {{last_name}} は取引先と取引先責任者に変換されました。</p>',
  },
  {
    name: 'crm_opportunity_approved', label: '商談が承認されました', category: 'notification', locale: 'ja-JP',
    subject: '商談が承認されました: {{name}}',
    bodyHtml: '<p>商談 {{name}} が承認されました。</p>',
  },
  {
    name: 'crm_opportunity_rejected', label: '商談が却下されました', category: 'notification', locale: 'ja-JP',
    subject: '商談が却下されました: {{name}}',
    bodyHtml: '<p>商談 {{name}} は承認されませんでした。内容を確認し、修正のうえ再申請してください。</p>',
  },
  {
    name: 'crm_deal_stalled', label: '商談が停滞', category: 'notification', locale: 'ja-JP',
    subject: '停滞している商談: {{name}}',
    bodyHtml: '<p>商談 {{name}} は {{stage}} に {{days_in_stage}} 日間とどまっています。前進させるか、再評価してください。</p>',
  },
  {
    name: 'crm_large_deal_won', label: '大型商談を受注', category: 'notification', locale: 'ja-JP',
    subject: '大型商談を受注: {{name}}',
    bodyHtml: '<p>{{name}} が {{amount}} で成立しました。チームの皆さん、おめでとうございます。</p>',
  },
  {
    name: 'crm_quote_created', label: '見積が作成されました', category: 'notification', locale: 'ja-JP',
    subject: '見積が作成されました: {{quote_name}}',
    bodyHtml: '<p>見積 {{quote_name}} がこの商談から作成されました。</p>',
  },
  {
    name: 'crm_task_reminder', label: 'ToDo のリマインダー', category: 'notification', locale: 'ja-JP',
    subject: 'ToDo のリマインダー: {{subject}}',
    bodyHtml: '<p>ToDo「{{subject}}」が期限を迎えました（リマインダー設定: {{reminder_date}}）。</p>',
  },
  {
    name: 'crm_urgent_task', label: '緊急 ToDo の割り当て', category: 'notification', locale: 'ja-JP',
    subject: '緊急 ToDo: {{subject}}',
    bodyHtml: '<p>緊急の ToDo「{{subject}}」が割り当てられました。対応が必要です。</p>',
  },
];
