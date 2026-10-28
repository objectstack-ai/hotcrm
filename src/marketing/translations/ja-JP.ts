// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the marketing module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  objects: {
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
        enroll_leads: { label: 'メンバーを一括登録' },
      },
    },
    crm_campaign_member: {
      _validations: {
        lead_or_contact_required: {
          message: 'キャンペーンメンバーはリードまたは取引先責任者のいずれかを参照する必要があります',
        },
        lead_and_contact_exclusive: {
          message: 'キャンペーンメンバーはリードまたは取引先責任者のどちらか一方のみを参照できます。両方は参照できません',
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
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_campaign: { label: 'キャンペーン' },
      },
    },
  },
  flows: {
    campaign_enrollment: {
      label: 'キャンペーンにメンバーを登録',
      successMessage: '対象メンバーをキャンペーンに登録しました。',
      refusals: {
        end_refused: {
          message:
            '選択された人のうち {{refusedCount}} 人の登録が拒否されました：登録 {{enrolledCount}} 人、拒否 {{refusedCount}} 人。拒否された人はキャンペーンに追加されていません。理由はフローの実行ログに一人ずつ記録されています。',
        },
        refuse_not_open: {
          message:
            'このキャンペーンはメンバー登録を受け付けていないか、すでに存在しません。メンバーを登録できるのは「計画中」または「実施中」のキャンペーンだけです。誰も登録されていません。',
        },
      },
      screens: {
        screen_1: {
          title: '登録条件',
          fields: {
            memberSource: { label: '登録するメンバーの種類', options: { leads: 'リード', contacts: '取引先責任者' } },
            leadStatus: { label: '登録するリードのステータス', options: { new: '新規', contacted: 'コンタクト済み', qualified: '適格' } },
            contactDepartment: {
              label: '登録する取引先責任者の部門',
              options: { executive: '経営層', sales: '営業部', marketing: 'マーケティング部', engineering: 'エンジニアリング部', support: 'サポート部', finance: '経理部', hr: '人事部', operations: 'オペレーション部' },
            },
          },
        },
      },
    },
    campaign_lead_member_enroll: {
      refusals: {
        refuse_campaign_not_open: {
          message:
            '{{ campaignRecord.display_title | default: "選択したキャンペーン" }} はメンバー登録を受け付けていないか、すでに存在しません。メンバーを登録できるのは「計画中」または「実施中」のキャンペーンだけです。誰も登録されていません。',
        },
        refuse_lead_opted_out: {
          message: '{{ leadRecord.first_name }} {{ leadRecord.last_name }} はメールの配信を停止しているため、このリードはキャンペーンに追加されませんでした。',
        },
      },
    },
    campaign_contact_member_enroll: {
      refusals: {
        refuse_campaign_not_open: {
          message:
            '{{ campaignRecord.display_title | default: "選択したキャンペーン" }} はメンバー登録を受け付けていないか、すでに存在しません。メンバーを登録できるのは「計画中」または「実施中」のキャンペーンだけです。誰も登録されていません。',
        },
        refuse_contact_opted_out: {
          message: '{{ contactRecord.full_name | default: "この取引先責任者" }} はメールの配信を停止しているため、この取引先責任者はキャンペーンに追加されませんでした。',
        },
      },
    },
  },
};
