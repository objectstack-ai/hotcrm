// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { activityActions } from '../../sales/translations/ja-JP/_shared';

/**
 * 日本語 (ja-JP) — the support module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  objects: {
    crm_knowledge_article: {
      _validations: {
        published_requires_body: {
          message: '本文のない記事は公開できません。',
        },
        published_requires_summary: {
          message: '公開済みの記事には、検索結果と AI の引用のために概要を記載してください。',
        },
      },
      label: 'ナレッジ記事',
      pluralLabel: 'ナレッジベース',
      description: '顧客とエージェントが再利用できる回答とハウツーガイド',
      fields: {
        article_number: { label: '記事番号' },
        title: { label: 'タイトル' },
        display_title: { label: '表示名' },
        summary: { label: '要約', help: '検索結果や AI の引用に表示される 1 段落の要約。' },
        body: { label: '本文', help: '記事の本文（Markdown）。' },
        category: {
          label: 'カテゴリ',
          options: {
            getting_started: 'はじめに', how_to: 'ハウツー',
            troubleshooting: 'トラブルシューティング', billing: '請求と料金', api: 'API と連携',
            release_notes: 'リリースノート', policy: 'ポリシー',
          },
        },
        tags: {
          label: 'タグ',
          options: {
            auth: '認証', sso: 'SSO', mobile: 'モバイル', email: 'メール',
            reports: 'レポート', performance: 'パフォーマンス',
            data_import: 'データインポート', webhooks: 'Webhook',
          },
        },
        status: {
          label: 'ステータス',
          options: { draft: '下書き', in_review: 'レビュー中', published: '公開済み', archived: 'アーカイブ' },
        },
        audience: {
          label: '対象',
          help: '公開記事はカスタマーポータルに表示され、社内記事はエージェントのみが閲覧できます。',
          options: { public: '公開', internal: '社内' },
        },
        language: {
          label: '言語',
          options: { en: '英語', zh_cn: '簡体字中国語', es_es: 'スペイン語', ja_jp: '日本語' },
        },
        owner_id: { label: '所有者' },
        related_to_case: { label: '元のケース', help: 'この記事の元になったケース（任意）。' },
        published_at: { label: '公開日時' },
        last_reviewed_at: { label: '最終レビュー' },
        helpful_count: { label: '役に立った', help: 'crm_article_feedback から再集計されます。手入力はできません。' },
        not_helpful_count: { label: '役に立たなかった', help: 'crm_article_feedback から再集計されます。手入力はできません。' },
      },
      _views: {
        all_articles: { label: 'すべての記事' },
        published_articles: { label: '公開済み' },
        my_drafts: { label: '自分の下書き' },
      },
      _sections: {
        basic: { label: '記事情報' },
        content: { label: 'コンテンツ' },
        taxonomy: { label: '分類' },
        metrics: { label: '利用状況' },
        engagement: { label: '利用状況' },
        // knowledge_article.view.ts のフォームセクション名 (#1100)
        article: { label: '記事' },
      },
      _actions: {
        mark_article_helpful: {
          label: '役に立った',
          successMessage: '「役に立った」として記録しました。ありがとうございます。',
        },
        mark_article_not_helpful: {
          label: '役に立たなかった',
          successMessage: '「役に立たなかった」として記録しました。ありがとうございます。',
        },
      },
    },
    crm_case: {
      _validations: {
        resolution_required_for_closed: {
          message: 'ケースをクローズするには解決内容が必要です',
        },
        escalation_reason_required: {
          message: 'ケースをエスカレーションするには理由が必要です',
        },
        case_status_progression: {
          message: '無効なステータス遷移です',
        },
      },
      label: 'ケース',
      pluralLabel: 'ケース',
      description: 'カスタマーサポートのケースとサービス依頼',
      fields: {
        case_number: { label: 'ケース番号' },
        subject: { label: '件名' },
        display_title: { label: '表示名' },
        description: { label: '説明' },
        crm_account: { label: '取引先' },
        crm_contact: { label: '取引先責任者' },
        supplied_name: { label: '申告氏名', help: 'ケースを起票した人が入力した氏名（入力どおり）。未確認で、どの取引先責任者にも紐付いていません。' },
        supplied_email: { label: '申告メール', help: 'ケースを起票した人が入力した返信先メールアドレス（入力どおり）。未確認で、どの取引先責任者にも紐付いていません。' },
        status: {
          label: 'ステータス',
          options: {
            new: '新規', in_progress: '対応中',
            waiting_customer: '顧客の回答待ち', waiting_support: 'サポートの回答待ち',
            escalated: 'エスカレーション済', resolved: '解決済', closed: 'クローズ済',
          },
        },
        priority: {
          label: '優先度',
          options: { low: '低', medium: '中', high: '高', critical: '重大' },
        },
        priority_rank: { label: '優先度ランク' },
        type: {
          label: 'ケース種別',
          options: {
            question: '問い合わせ', problem: '不具合',
            feature_request: '機能要望', bug: 'バグ',
          },
        },
        origin: {
          label: 'ケース発生元',
          options: { email: 'メール', phone: '電話', web: 'ウェブ', chat: 'チャット', social_media: 'ソーシャルメディア' },
        },
        owner_id: { label: 'ケース担当者' },
        closed_date: { label: 'クローズ日' },
        first_response_date: { label: '初回応答日' },
        resolution_time_hours: { label: '解決時間（時間）' },
        sla_due_date: { label: 'SLA期限', help: 'ケースの優先度と取引先の顧客ランクから設定され、暦時間で数えます。夜間・週末・祝日もすべて含まれます。' },
        is_sla_violated: { label: 'SLA違反' },
        is_escalated: { label: 'エスカレーション済' },
        escalated_date: { label: 'エスカレーション日' },
        escalated_from: { label: 'エスカレーション元' },
        escalation_reason: { label: 'エスカレーション理由' },
        resolution: { label: '解決内容' },
        resolved_by_article: { label: '解決したナレッジ記事', help: 'このケースを解決したナレッジ記事 — 逸らし率の指標。' },
        internal_notes: { label: '内部メモ', help: '顧客には表示されない社内向けメモ' },
        is_closed: { label: 'クローズ済' },
      },
      _views: {
        // The public Web-to-Case form's heading (#2284), as `web_to_lead`.
        web_to_case: { title: 'サポートへのお問い合わせ' },
        all_cases: { label: '全ケース' },
        case_workflow: { label: 'サービスフロー' },
        sla_calendar: { label: 'SLA カレンダー' },
        case_timeline: { label: 'ケースタイムライン' },
        unassigned_triage: {
          label: '未割り当て — トリアージ',
          emptyState: {
            title: 'トリアージ待ちはありません',
            message: 'すべてのケースに所有者がいます。所有者のないケースはここに表示されます — 通常は、サービスエージェントの職位を誰も保持していない間に届いた Web-to-Case の送信です。',
          },
        },
        escalated_cases: { label: 'エスカレートしたケース' },
        my_open_cases: { label: '私のオープンケース' },
        sla_at_risk: { label: '⏰ SLA リスクあり' },
      },
      _sections: {
        // case.view.ts のフォームセクション名 (#1100)。
        case: { label: 'ケース' },
        how_can_we_help: {
          label: 'どのようなご用件でしょうか？',
          fields: {
            subject: { placeholder: '問題の簡単な概要' },
            description: { placeholder: '再現手順、エラーメッセージ、スクリーンショットなど…' },
            type: { helpText: 'お問い合わせ内容に最も近い選択肢をお選びください。' },
            priority: { helpText: '重大な問題は電話でもご連絡ください。' },
          },
        },
        // オブジェクト定義のセクションキー（case.object.ts）— 入力フォームと、
        // これらのグループを参照する詳細ページのセクション（#970）で使用
        basic: { label: 'ケース情報' },
        origin: { label: '発生元・振り分け' },
        sla: { label: 'SLA・優先度' },
        resolution: { label: '解決' },
        escalation: { label: 'エスカレーション' },
        system: { label: 'システム' },
      },
      _actions: {
        ...activityActions,
        escalate_case: {
          label: 'ケースをエスカレート',
          confirmText: 'このケースをエスカレーションチームへ引き継ぎます。続行しますか？',
          successMessage: 'ケースをエスカレートしました！',
        },
        close_case: {
          label: 'ケースをクローズ',
          confirmText: 'このケースをクローズしてもよろしいですか？',
          successMessage: 'ケースをクローズしました！',
        },
        claim_case: {
          label: 'ケースを引き受ける',
          successMessage: 'ケースを引き受けました。担当者はあなたです。',
        },
      },
    },
    crm_article_feedback: {
      label: '記事フィードバック',
      pluralLabel: '記事フィードバック',
      description: 'ナレッジ記事に対する読者の「役に立った / 役に立たなかった」評価',
      fields: {
        feedback_number: { label: 'フィードバック番号' },
        owner_id: { label: '読者' },
        crm_knowledge_article: { label: '記事', help: 'このフィードバックの対象となるナレッジ記事。' },
        verdict: {
          label: '評価',
          options: { helpful: '役に立った', not_helpful: '役に立たなかった' },
        },
        comment: { label: 'コメント', help: '評価の理由（任意） — 記事の作成者が読みます。' },
      },
      _sections: {
        basic: { label: 'フィードバック' },
      },
    },
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_service_dashboard: { label: 'サービス概要' },
        nav_case: { label: 'ケース' },
        nav_knowledge: { label: 'ナレッジベース' },
        nav_my_cases: { label: '私のケース' },
        nav_report_cases_by_status: { label: 'ステータス・優先度別ケース' },
        nav_report_sla: { label: 'SLA 実績' },
        nav_report_cases_opened_by_day: { label: '日別新規ケース' },
      },
    },
  },
  dashboards: {
    service_dashboard: {
      label: 'カスタマーサービス',
      description: 'ケース負荷、SLA健全性、解決パフォーマンス',
      widgets: {
        open_cases: { title: 'オープンケース', description: 'まだクローズされていないケース' },
        critical_cases: { title: '重大ケース', description: '優先度「重大」のオープンケース' },
        avg_resolution_time: { title: '平均解決時間', description: 'クローズまでの平均時間（時）' },
        sla_violations: { title: 'SLA 違反', description: 'SLA を超過したケース' },
        cases_by_status: { title: 'ステータス別ケース', description: 'パイプライン全体のワークロード分布' },
        cases_by_priority: { title: '優先度別ケース', description: '緊急度別のオープンケース構成' },
        cases_by_origin: { title: '発生源別ケース', description: 'ケースの流入チャネル' },
        daily_case_volume: { title: '日次ケース件数', description: '過去30日間の新規ケース' },
        sla_compliance_gauge: { title: 'SLA 達成率', description: '当期 SLA 内に解決したケースの割合' },
        kb_deflection_rate: { title: 'ナレッジ解決率', description: 'クローズしたケースのうちナレッジ記事で解決した割合' },
        kb_resolved_cases: { title: 'ナレッジで解決', description: '解決した記事が紐づくクローズ済みケース' },
        closed_cases_total: { title: 'クローズ済みケース', description: 'ナレッジ解決率の分母' },
        top_resolving_articles: { title: '解決件数の多い記事', description: '解決したクローズ済みケース数で並べたナレッジ記事' },
        my_open_cases_by_priority: { title: '優先度別の私のオープンケース', description: 'あなたのオープンケースとそのSLA違反率を優先度別に集計' },
      },
    },
  },
  datasets: {
    case_metrics: {
      label: 'ケース指標',
      description: 'ケース数・解決時間・SLA を集計するセマンティックレイヤー',
      dimensions: {
        created_at: {
          label: '作成日',
        },
        origin: {
          label: '発生元',
        },
        priority: {
          label: '優先度',
        },
        resolved_article: {
          label: '解決に使用したナレッジ記事',
        },
        status: {
          label: 'ステータス',
        },
        type: {
          label: '種別',
        },
      },
      measures: {
        avg_resolution: {
          label: '平均解決時間（時間）',
        },
        avg_sla_violated: {
          label: 'SLA 違反率',
        },
        case_count: {
          label: 'ケース数',
        },
        closed_count: {
          label: 'クローズ済みケース',
        },
        kb_deflection_rate: {
          label: 'ナレッジベース自己解決率',
        },
        kb_resolved_count: {
          label: 'ナレッジベースで解決した件数',
        },
        sla_compliance_rate: {
          label: 'SLA 遵守率',
        },
        sla_met_count: {
          label: 'SLA を満たしたケース',
        },
      },
    },
  },
  pages: {
    case_detail_page: {
      label: 'ケース詳細',
      description: 'サービス担当者向けのケースレコードページ：ハイライト、SLA パス、詳細、活動タイムライン。',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
      components: {
        case_highlights: { label: '重要情報' },
        case_status_path: { label: 'ケースステータスの進捗' },
        case_details: { label: 'ケース詳細情報' },
        // `page:tabs` item labels, keyed by each item's `value` (spec 18.1.0,
        // `pages.PAGE.components.TABS.items.VALUE.label`).
        case_main_tabs: { items: { details: { label: '詳細' }, related: { label: '関連' }, activity: { label: '活動' } } },
      },
    },
  },
  flows: {
    escalate_case: {
      label: 'ケースをエスカレート',
      screens: { screen_1: { title: 'ケースをエスカレート', fields: { reason: { label: 'エスカレーション理由' } } } },
    },
    close_case: {
      label: 'ケースをクローズ',
      screens: {
        screen_1: {
          title: 'ケースをクローズ',
          fields: {
            resolution: { label: '解決内容' },
            resolved_by_article: { label: '解決に使ったナレッジ記事（任意）' },
          },
        },
      },
    },
    claim_case: {
      label: 'ケースを引き受ける',
      screens: {
        screen_1: {
          title: 'ケースを引き受ける',
          fields: {
            claimStatus: {
              label: '対応状況',
              options: { in_progress: '対応中', waiting_customer: '顧客の回答待ち', waiting_support: 'サポートの回答待ち' },
            },
          },
        },
      },
    },
  },
  reports: {
    cases_by_status_priority: {
      label: 'ステータス・優先度別ケース',
      description: 'ステータスと優先度別のケースのサマリー',
    },
    sla_performance: {
      label: 'SLA 実績レポート',
      description: 'SLA 遵守状況の分析',
    },
    cases_opened_by_day_priority: {
      label: '優先度 × 日別新規ケース',
      description: '1 日ごとの新規ケース数を優先度別に表示',
    },
  },
};
