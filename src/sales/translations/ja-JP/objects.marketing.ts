// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — `objects` translations for the MARKETING family:
 * demand generation — campaigns and their membership.
 *
 * Roster: `crm_campaign`, `crm_campaign_member`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/ja-JP.ts`.
 */
export const marketing: Record<string, ObjectTranslationData> = {
  crm_campaign: {
    _validations: {
      end_after_start: {
        message: '終了日は開始日より後である必要があります',
      },
      actual_cost_within_budget: {
        message: '実績コストが予算コストを超えています',
      },
    },
    label: 'キャンペーン',
    pluralLabel: 'キャンペーン',
    description: 'マーケティングキャンペーンと施策',
    fields: {
      campaign_code: { label: 'キャンペーンコード' },
      name: { label: 'キャンペーン名' },
      display_title: { label: '表示名' },
      description: { label: '説明' },
      type: {
        label: 'キャンペーン種別',
        options: {
          email: 'メール', webinar: 'ウェビナー', trade_show: '展示会',
          conference: 'カンファレンス', direct_mail: 'ダイレクトメール',
          social_media: 'ソーシャルメディア', content: 'コンテンツマーケティング',
          partner: 'パートナーマーケティング',
        },
      },
      channel: {
        label: '主要チャネル',
        options: {
          digital: 'デジタル', social: 'ソーシャル', email: 'メール',
          events: 'イベント', partner: 'パートナー',
        },
      },
      status: {
        label: 'ステータス',
        options: {
          planning: '計画中', in_progress: '実施中',
          completed: '完了', aborted: '中止',
        },
      },
      start_date: { label: '開始日' },
      end_date: { label: '終了日' },
      budgeted_cost: { label: '予算コスト' },
      actual_cost: { label: '実コスト' },
      expected_revenue: { label: '予測売上' },
      actual_revenue: { label: '実収益' },
      target_size: { label: 'ターゲット規模', help: '対象とするリード・取引先責任者の目標件数' },
      num_sent: { label: '送信数' },
      num_responses: { label: '応答数' },
      num_leads: { label: 'リード数' },
      num_converted_leads: { label: '変換済リード数' },
      num_opportunities: { label: '作成済商談数' },
      num_won_opportunities: { label: '受注商談' },
      response_rate: { label: '応答率（%）' },
      roi: { label: 'ROI（%）' },
      owner_id: { label: 'キャンペーン担当者' },
      landing_page_url: { label: 'ランディングページ' },
      is_active: { label: '有効' },
    },
    _views: {
      all_campaigns: { label: '全キャンペーン' },
      campaign_gantt: { label: 'キャンペーン日程' },
      campaign_calendar: { label: 'キャンペーンカレンダー' },
      campaign_timeline: { label: 'マーケティングタイムライン' },
    },
    _sections: {
      basic: { label: 'キャンペーン情報' },
      schedule: { label: 'スケジュール' },
      budget: { label: '予算・ROI' },
      metrics: { label: '実績' },
      assignment: { label: '担当者' },
      assets: { label: 'キャンペーンアセット' },
    },
    _actions: {
      enroll_leads: {
        label: 'メンバーを一括登録',
        successMessage: '対象メンバーをキャンペーンに登録しました。',
      },
    },
  },
  crm_campaign_member: {
    _validations: {
      lead_or_contact_required: {
        message: 'キャンペーンメンバーはリードまたは取引先責任者のいずれかを参照する必要があります',
      },
    },
    label: 'キャンペーンメンバー',
    pluralLabel: 'キャンペーンメンバー',
    description: 'キャンペーンの対象となったリード・取引先責任者とその反応状況',
    fields: {
      member_number: { label: 'メンバー番号' },
      crm_campaign: { label: 'キャンペーン' },
      crm_lead: { label: 'リード', help: '登録時点でリードだったメンバーに設定されます' },
      crm_contact: { label: '取引先責任者', help: '既存の取引先責任者であるメンバーに設定されます' },
      status: {
        label: 'ステータス',
        options: {
          sent: '送信済', responded: '応答済',
          converted: '変換済', unsubscribed: '配信停止',
        },
      },
      added_date: { label: '追加日時' },
      response_date: { label: '応答日時' },
      has_responded: { label: '応答済' },
    },
    _sections: {
      basic: { label: '基本情報' },
      response: { label: '反応トラッキング' },
    },
    _actions: {
      mark_responded: {
        label: '応答済にする',
        successMessage: 'このキャンペーンメンバーの応答を記録しました。',
      },
    },
  },
};
