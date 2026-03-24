import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja) — カスタマーサポート翻訳
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 *
 * Covers all 23 Support objects with field labels, select options, and help texts.
 */
export const ja: TranslationData = {
  objects: {
    case: {
      label: 'ケース',
      pluralLabel: 'ケース',
      fields: {
        case_number: { label: 'ケース番号' },
        subject: { label: '件名' },
        description: { label: '説明' },
        status: {
          label: 'ステータス',
          options: { New: '新規', Working: '対応中', Escalated: 'エスカレーション済', Closed: 'クローズ' },
        },
        priority: {
          label: '優先度',
          options: { Low: '低', Medium: '中', High: '高 🔴', Critical: '緊急 🚨' },
        },
        origin: {
          label: 'ケース発生元',
          options: {
            Phone: '電話', Email: 'メール', Web: 'Web',
            Chat: 'チャット', 'Social Media': 'ソーシャルメディア',
          },
        },
        type: {
          label: 'ケースタイプ',
          options: {
            Question: '質問', Problem: '問題',
            'Feature Request': '機能リクエスト', Incident: 'インシデント',
          },
        },
        account_id: { label: '取引先' },
        contact_id: { label: '取引先責任者' },
        owner_id: { label: 'ケース所有者' },
        closed_date: { label: 'クローズ日' },
        resolution: { label: '解決策' },
      },
    },

    case_comment: {
      label: 'ケースコメント',
      pluralLabel: 'ケースコメント',
      fields: {
        case_id: { label: 'ケース' },
        body: { label: 'コメント' },
        is_public: { label: '公開', help: 'ポータル経由で顧客に表示されます' },
        created_by: { label: '作成者' },
      },
    },

    knowledge_article: {
      label: 'ナレッジ記事',
      pluralLabel: 'ナレッジ記事',
      fields: {
        title: { label: 'タイトル' },
        url_name: { label: 'URL 名', help: '記事のURL用スラッグ' },
        body: { label: '記事本文' },
        summary: { label: '概要' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Published: '公開済 ✅', Archived: 'アーカイブ済' },
        },
        article_type: {
          label: '記事タイプ',
          options: {
            FAQ: 'よくある質問', 'How-To': '操作手順', Troubleshooting: 'トラブルシューティング',
            'Best Practice': 'ベストプラクティス', Reference: 'リファレンス',
          },
        },
        category: { label: 'カテゴリ' },
        language: { label: '言語' },
        view_count: { label: '閲覧数' },
        helpful_count: { label: '役に立った' },
        not_helpful_count: { label: '役に立たなかった' },
        version_number: { label: 'バージョン' },
        owner_id: { label: '著者' },
      },
    },

    sla_policy: {
      label: 'SLA ポリシー',
      pluralLabel: 'SLA ポリシー',
      fields: {
        name: { label: 'ポリシー名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        priority: {
          label: '優先度',
          options: { Low: '低', Medium: '中', High: '高', Critical: '緊急' },
        },
        first_response_time: { label: '初回応答時間（分）', help: '初回応答までの最大時間（分）' },
        resolution_time: { label: '解決時間（分）', help: '解決までの最大時間（分）' },
        business_hours_id: { label: '営業時間' },
        escalation_rule_id: { label: 'エスカレーションルール' },
      },
    },

    sla_template: {
      label: 'SLA テンプレート',
      pluralLabel: 'SLA テンプレート',
      fields: {
        name: { label: 'テンプレート名' },
        description: { label: '説明' },
        type: {
          label: 'テンプレートタイプ',
          options: { Standard: 'スタンダード', Premium: 'プレミアム', Enterprise: 'エンタープライズ', Custom: 'カスタム' },
        },
        is_active: { label: '有効' },
      },
    },

    sla_milestone: {
      label: 'SLA マイルストーン',
      pluralLabel: 'SLA マイルストーン',
      fields: {
        name: { label: 'マイルストーン名' },
        sla_policy_id: { label: 'SLA ポリシー' },
        type: {
          label: 'マイルストーンタイプ',
          options: {
            'First Response': '初回応答', Resolution: '解決',
            Update: '更新', Escalation: 'エスカレーション',
          },
        },
        target_minutes: { label: '目標時間（分）', help: '目標完了時間（分）' },
        warning_minutes: { label: '警告時間（分）', help: '目標到達前の警告閾値（分）' },
        is_completed: { label: '完了' },
        completed_date: { label: '完了日' },
      },
    },

    business_hours: {
      label: '営業時間',
      pluralLabel: '営業時間',
      fields: {
        name: { label: '名前' },
        timezone: { label: 'タイムゾーン' },
        is_default: { label: 'デフォルト', help: 'SLA 計算のデフォルト営業時間として使用' },
        is_active: { label: '有効' },
      },
    },

    holiday_calendar: {
      label: '休日カレンダー',
      pluralLabel: '休日カレンダー',
      fields: {
        name: { label: 'カレンダー名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        business_hours_id: { label: '営業時間' },
      },
    },

    holiday: {
      label: '休日',
      pluralLabel: '休日',
      fields: {
        name: { label: '休日名' },
        calendar_id: { label: 'カレンダー' },
        date: { label: '日付' },
        is_recurring: { label: '毎年繰り返し', help: '毎年同じ日付に繰り返されます' },
      },
    },

    queue: {
      label: 'キュー',
      pluralLabel: 'キュー',
      fields: {
        name: { label: 'キュー名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        routing_type: {
          label: 'ルーティングタイプ',
          options: {
            'Round Robin': 'ラウンドロビン', 'Least Active': '最少アクティブ',
            'Most Experienced': '最経験者', Manual: '手動',
          },
        },
        supported_objects: { label: '対応オブジェクト' },
      },
    },

    queue_member: {
      label: 'キューメンバー',
      pluralLabel: 'キューメンバー',
      fields: {
        queue_id: { label: 'キュー' },
        user_id: { label: 'ユーザー' },
        is_active: { label: '有効' },
        capacity: { label: 'キャパシティ', help: '同時に処理可能なケースの最大数' },
        current_load: { label: '現在の負荷', help: '現在割り当てられているケース数' },
      },
    },

    routing_rule: {
      label: 'ルーティングルール',
      pluralLabel: 'ルーティングルール',
      fields: {
        name: { label: 'ルール名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        priority: { label: '優先度', help: '数値が小さいほど優先度が高い' },
        criteria: { label: '条件' },
        queue_id: { label: 'ターゲットキュー' },
        owner_id: { label: '割り当て先' },
      },
    },

    escalation_rule: {
      label: 'エスカレーションルール',
      pluralLabel: 'エスカレーションルール',
      fields: {
        name: { label: 'ルール名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        criteria: { label: '条件' },
        escalation_time: { label: 'エスカレーション時間（分）', help: 'エスカレーション発動までの待機時間（分）' },
        escalation_to: { label: 'エスカレーション先' },
        notification_template: { label: '通知テンプレート' },
      },
    },

    skill: {
      label: 'スキル',
      pluralLabel: 'スキル',
      fields: {
        name: { label: 'スキル名' },
        description: { label: '説明' },
        category: { label: 'カテゴリ' },
        is_active: { label: '有効' },
      },
    },

    agent_skill: {
      label: 'エージェントスキル',
      pluralLabel: 'エージェントスキル',
      fields: {
        agent_id: { label: 'エージェント' },
        skill_id: { label: 'スキル' },
        proficiency_level: {
          label: '習熟度',
          options: { Beginner: '初級', Intermediate: '中級', Advanced: '上級', Expert: 'エキスパート' },
        },
        is_primary: { label: '主要スキル' },
      },
    },

    email_to_case: {
      label: 'メール-to-ケース',
      pluralLabel: 'メール-to-ケース設定',
      fields: {
        name: { label: '設定名' },
        email_address: { label: 'メールアドレス' },
        is_active: { label: '有効' },
        queue_id: { label: 'デフォルトキュー' },
        priority: {
          label: 'デフォルト優先度',
          options: { Low: '低', Medium: '中', High: '高', Critical: '緊急' },
        },
        case_origin: { label: 'ケース発生元' },
      },
    },

    web_to_case: {
      label: 'Web-to-ケース',
      pluralLabel: 'Web-to-ケース設定',
      fields: {
        name: { label: '設定名' },
        is_active: { label: '有効' },
        queue_id: { label: 'デフォルトキュー' },
        return_url: { label: 'リターン URL', help: 'フォーム送信後のリダイレクト先 URL' },
        enable_recaptcha: { label: 'reCAPTCHA を有効化', help: 'スパム防止のため reCAPTCHA 認証を要求' },
      },
    },

    social_media_case: {
      label: 'ソーシャルメディアケース',
      pluralLabel: 'ソーシャルメディアケース',
      fields: {
        case_id: { label: 'ケース' },
        platform: {
          label: 'プラットフォーム',
          options: {
            Twitter: 'Twitter', Facebook: 'Facebook', Instagram: 'Instagram',
            LinkedIn: 'LinkedIn', YouTube: 'YouTube', TikTok: 'TikTok',
          },
        },
        post_url: { label: '投稿 URL' },
        author_name: { label: '投稿者' },
        sentiment: {
          label: 'センチメント',
          options: { Positive: 'ポジティブ 😊', Neutral: 'ニュートラル 😐', Negative: 'ネガティブ 😠' },
        },
        reach: { label: 'リーチ', help: '投稿を閲覧したユーザー数' },
        engagement: { label: 'エンゲージメント', help: '合計インタラクション数（いいね、シェア、コメント）' },
      },
    },

    portal_user: {
      label: 'ポータルユーザー',
      pluralLabel: 'ポータルユーザー',
      fields: {
        contact_id: { label: '取引先責任者' },
        username: { label: 'ユーザー名' },
        is_active: { label: '有効' },
        role: {
          label: '役割',
          options: { Standard: 'スタンダード', 'Power User': 'パワーユーザー', Admin: '管理者' },
        },
        last_login: { label: '最終ログイン' },
        login_count: { label: 'ログイン回数' },
        profile_photo: { label: 'プロフィール写真' },
      },
    },

    forum_topic: {
      label: 'フォーラムトピック',
      pluralLabel: 'フォーラムトピック',
      fields: {
        title: { label: 'タイトル' },
        body: { label: '本文' },
        category: {
          label: 'カテゴリ',
          options: {
            General: '一般', 'Product Questions': '製品に関する質問',
            'Feature Requests': '機能リクエスト', 'Tips & Tricks': 'ヒントとコツ',
            Announcements: 'お知らせ',
          },
        },
        status: {
          label: 'ステータス',
          options: { Open: 'オープン', Closed: 'クローズ', Pinned: 'ピン留め 📌', Archived: 'アーカイブ済' },
        },
        author_id: { label: '著者' },
        view_count: { label: '閲覧数' },
        reply_count: { label: '返信数' },
        is_pinned: { label: 'ピン留め' },
        is_locked: { label: 'ロック' },
      },
    },

    forum_post: {
      label: 'フォーラム投稿',
      pluralLabel: 'フォーラム投稿',
      fields: {
        topic_id: { label: 'トピック' },
        body: { label: '本文' },
        author_id: { label: '著者' },
        is_best_answer: { label: 'ベストアンサー', help: 'トピック作成者によりベストアンサーに選定' },
        helpful_count: { label: '役に立った' },
      },
    },

    chatbot_config: {
      label: 'チャットボット設定',
      pluralLabel: 'チャットボット設定',
      fields: {
        name: { label: 'チャットボット名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        welcome_message: { label: 'ウェルカムメッセージ', help: '顧客に表示される最初の挨拶文' },
        fallback_message: { label: 'フォールバックメッセージ', help: 'チャットボットが理解できない場合に表示されるメッセージ' },
        language: { label: '言語' },
        queue_id: { label: 'エスカレーションキュー', help: 'エスカレーション時のルーティング先キュー' },
        model_provider: { label: 'AI モデルプロバイダー' },
        max_turns: { label: '最大ターン数', help: '自動エスカレーションまでの最大会話ターン数' },
      },
    },

    macro: {
      label: 'マクロ',
      pluralLabel: 'マクロ',
      fields: {
        name: { label: 'マクロ名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        steps: { label: 'ステップ', help: '順番に実行されるアクションのリスト' },
        target_object: { label: '対象オブジェクト' },
        folder: { label: 'フォルダ' },
        owner_id: { label: '所有者' },
      },
    },
  },

  apps: {
    support: {
      label: 'カスタマーサポート',
      description: 'ケース管理、ナレッジベース、SLA トラッキングを含むカスタマーサポート管理',
    },
  },

  messages: {
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.create': '新規作成',
    'common.search': '検索',
    'common.filter': 'フィルター',
    'common.export': 'エクスポート',
    'common.import': 'インポート',
    'common.back': '戻る',
    'common.confirm': '確認',
    'common.refresh': '更新',
    'nav.support': 'サポート',
    'nav.sla_management': 'SLA 管理',
    'nav.automation_ai': 'オートメーション & AI',
    'nav.community_portal': 'コミュニティポータル',
    'nav.views_dashboards': 'ビュー & ダッシュボード',
    'nav.case_board': 'ケースボード',
    'nav.support_dashboard': 'サポートダッシュボード',
    'success.saved': 'レコードを保存しました',
    'success.deleted': 'レコードを削除しました',
    'success.case_closed': 'ケースをクローズしました',
    'success.article_published': '記事を公開しました',
    'success.macro_executed': 'マクロを実行しました',
    'confirm.delete': 'このレコードを削除してもよろしいですか？',
    'confirm.close_case': 'このケースをクローズしますか？解決策の入力が必要です。',
    'confirm.publish_article': 'この記事を公開しますか？すべてのユーザーに表示されます。',
    'confirm.escalate': 'このケースを次のレベルにエスカレーションしますか？',
    'error.required': 'この項目は必須です',
    'error.load_failed': 'データの読み込みに失敗しました',
    'error.save_failed': 'レコードの保存に失敗しました',
    'error.sla_breach': 'SLA 違反が検出されました — 直ちに対応してください',
    'error.queue_full': 'ターゲットキューの容量が上限に達しています',
  },

  validationMessages: {
    sla_breach_warning: 'このケースは SLA の期限に近づいています',
    case_requires_contact: 'ケースを保存するには取引先責任者が必要です',
    article_publish_incomplete: '公開するにはタイトル、本文、概要が必要です',
    resolution_required_to_close: 'ケースをクローズするには解決策を入力してください',
    escalation_time_positive: 'エスカレーション時間はゼロより大きい値を指定してください',
    target_minutes_positive: '目標時間はゼロより大きい値を指定してください',
    capacity_exceeded: 'エージェントのキャパシティを超過しています',
    duplicate_queue_member: 'このユーザーは既にこのキューのメンバーです',
  },
};
