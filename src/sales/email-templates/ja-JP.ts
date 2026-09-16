// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from './_bundle';

/** 日本語 (ja-JP) — the sales package's notification templates. See `en.ts`. */
export const jaJP: EmailTemplatePack = {
  'crm.account_approved': {
    label: 'アカウント承認済み',
    subject: 'アカウントが承認されました: {{name}}',
    bodyHtml: '<p>このアカウントは承認され、正式なデータになりました。</p>',
  },
  'crm.account_rejected': {
    label: 'アカウント未承認',
    subject: 'アカウントが承認されませんでした: {{name}}',
    bodyHtml: '<p>このアカウントは承認されませんでした。内容を修正のうえ、再度承認を依頼してください。</p>',
  },
  'crm.contact_welcome': {
    label: '新規取引先責任者',
    subject: '新しい取引先責任者: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} が取引先責任者として追加されました。ご挨拶の連絡をしてください。</p>',
  },
  'crm.deal_stalled': {
    label: '停滞中の商談',
    subject: '停滞中の商談: {{name}}',
    bodyHtml: '<p>商談 {{name}} は「{{stage}}」に {{days_in_stage}} 日間留まっています。次の段階に進めるか、再評価してください。</p>',
  },
  'crm.large_deal_won': {
    label: '大型商談の受注',
    subject: '大型商談を受注: {{name}}',
    bodyHtml: '<p>{{name}} が {{amount}} で成約しました。チームの皆さん、おめでとうございます。</p>',
  },
  'crm.lead_conversion_approved': {
    label: 'リード変換の承認',
    subject: 'リードの変換が承認されました: {{first_name}} {{last_name}}',
    bodyHtml: '<p>このリードは承認されました。取引先、取引先責任者、商談に変換できます。</p>',
  },
  'crm.lead_conversion_rejected': {
    label: 'リード未承認',
    subject: 'リードが承認されませんでした: {{first_name}} {{last_name}}',
    bodyHtml: '<p>このリードの変換は承認されませんでした。引き続き対応するか、理由を付けて対象外にしてください。</p>',
  },
  'crm.lead_converted': {
    label: 'リード変換済み',
    subject: 'リードを変換しました: {{first_name}} {{last_name}}',
    bodyHtml: '<p>リード {{first_name}} {{last_name}} を取引先と取引先責任者に変換しました。</p>',
  },
  'crm.lead_routing_hot': {
    label: 'ホットリードの割り当て',
    subject: 'ホットリード — 24 時間以内に割り当て: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{company}} の {{first_name}} {{last_name}}（評価 {{rating}}）に本日中に担当者を割り当ててください。</p>',
  },
  'crm.lead_routing_new': {
    label: '新規リードの割り当て',
    subject: '割り当て待ちの新規リード: {{first_name}} {{last_name}}',
    bodyHtml: '<p>{{company}} の {{first_name}} {{last_name}} が割り当てを待っています。</p>',
  },
  'crm.opportunity_approved': {
    label: '商談承認済み',
    subject: '商談が承認されました: {{name}}',
    bodyHtml: '<p>商談 {{name}} が承認されました。</p>',
  },
  'crm.opportunity_rejected': {
    label: '商談未承認',
    subject: '商談が承認されませんでした: {{name}}',
    bodyHtml: '<p>商談 {{name}} は承認されませんでした。内容を確認・修正のうえ、再申請してください。</p>',
  },
  'crm.task_reminder': {
    label: 'ToDo リマインダー',
    subject: 'ToDo のリマインダー: {{subject}}',
    bodyHtml: '<p>ToDo「{{subject}}」が期限を迎えました（リマインダー設定: {{reminder_date}}）。</p>',
  },
  'crm.urgent_task': {
    label: '緊急 ToDo',
    subject: '緊急の ToDo: {{subject}}',
    bodyHtml: '<p>緊急の ToDo「{{subject}}」が割り当てられました。対応をお願いします。</p>',
  },
};
