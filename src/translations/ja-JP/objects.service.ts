// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * 日本語 (ja-JP) — `objects` translations for the SERVICE family:
 * post-sale support — cases and the knowledge that deflects them.
 *
 * Roster: `crm_case`, `crm_knowledge_article`, `crm_article_feedback`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/ja-JP.ts`.
 */
export const service: Record<string, ObjectTranslationData> = {
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
      created_date: { label: '作成日' },
      closed_date: { label: 'クローズ日' },
      first_response_date: { label: '初回応答日' },
      resolution_time_hours: { label: '解決時間（時間）' },
      sla_due_date: { label: 'SLA期限' },
      is_sla_violated: { label: 'SLA違反' },
      is_escalated: { label: 'エスカレーション済' },
      escalated_date: { label: 'エスカレーション日' },
      escalation_reason: { label: 'エスカレーション理由' },
      resolution: { label: '解決内容' },
      resolved_by_article: { label: '解決したナレッジ記事', help: 'このケースを解決したナレッジ記事 — 逸らし率の指標。' },
      internal_notes: { label: '内部メモ', help: '顧客には表示されない社内向けメモ' },
      is_closed: { label: 'クローズ済' },
    },
    _views: {
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
      // 詳細ページの `record:details` セクション名（case_detail.page.ts）
      info: { label: 'ケース情報' },
      status: { label: 'ステータス・SLA' },
      description: { label: '説明' },
      // case.view.ts のフォームセクション名 (#1100)。
      case: { label: 'ケース' },
      how_can_we_help: { label: 'どのようなご用件でしょうか？' },
      // オブジェクト定義のセクションキー（case.object.ts）— 入力フォームで使用
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
};
