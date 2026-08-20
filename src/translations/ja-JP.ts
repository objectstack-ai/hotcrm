// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — CRM App Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
/**
 * 活動アクション群（#592）: `log_call` / `log_meeting` / `schedule_meeting` は
 * リード・取引先責任者・取引先・商談・ケースの各オブジェクトごとに登録される
 * （`objectName` を持たないスクリプトアクションはディスパッチャが参照しない
 * キーに登録されるため — #509）。文言は 5 オブジェクトで同一なので、ここで
 * 一度だけ定義して各 `_actions` に展開する。
 */
const activityActions = {
  log_call: {
    label: '電話を記録',
    successMessage: '電話を記録しました！',
    params: {
      subject: { label: '電話の件名' },
      duration: { label: '所要時間（分）' },
      attendee_contacts: { label: '取引先責任者の参加者' },
      attendee_users: { label: '社内参加者' },
      notes: { label: '通話メモ' },
    },
  },
  log_meeting: {
    label: '会議を記録',
    successMessage: '会議を記録しました！',
    params: {
      subject: { label: '会議の件名' },
      duration: { label: '所要時間（分）' },
      attendee_contacts: { label: '取引先責任者の参加者' },
      attendee_users: { label: '社内参加者' },
      notes: { label: '議事メモ' },
    },
  },
  schedule_meeting: {
    label: '会議を設定',
    successMessage: '会議を設定しました！',
    params: {
      subject: { label: '会議の件名' },
      start_date: { label: '開始日 (UTC)' },
      start_time: { label: '開始時刻 (UTC)' },
      location: { label: '場所' },
      duration: { label: '所要時間（分）' },
      attendee_contacts: { label: '取引先責任者の参加者' },
      attendee_users: { label: '社内参加者' },
      notes: { label: 'アジェンダ' },
    },
  },
};

/**
 * 共有ピックリスト（`_picklists.ts`）は複数オブジェクトで同一の値集合を持つ。
 * 訳語がオブジェクトごとにぶれると、同じピックリストが画面によって別の言葉で
 * 表示される不具合になる（#494）。ここで一度だけ定義して各所に展開する。
 * キーは表示ラベルではなく **保存値** であることに注意（#494 の主因）。
 */
const salutationOptions = { mr: 'Mr.', ms: 'Ms.', mrs: 'Mrs.', dr: '博士', prof: '教授' };

const industryOptions = {
  technology: 'テクノロジー', software: 'ソフトウェア / SaaS', finance: '金融',
  healthcare: 'ヘルスケア', retail: '小売', manufacturing: '製造',
  education: '教育', real_estate: '不動産', media: 'メディア・エンタメ',
  logistics: '物流', hospitality: 'ホスピタリティ', energy: 'エネルギー・公益',
  government: '政府・行政', nonprofit: '非営利', other: 'その他',
};

const leadSourceOptions = {
  web: 'ウェブ', referral: '紹介', event: 'イベント・展示会',
  webinar: 'ウェビナー', partner: 'パートナー', advertisement: '広告',
  paid_search: '有料検索', social: 'ソーシャルメディア', content: 'コンテンツ・ブログ',
  cold_call: 'コールドコール', email_campaign: 'メールキャンペーン', other: 'その他',
};

const paymentTermsOptions = {
  net_15: '15 日以内払い', net_30: '30 日以内払い', net_60: '60 日以内払い',
  net_90: '90 日以内払い', due_on_receipt: '請求書受領時払い',
};

const opportunityStageOptions = {
  prospecting: '見込み調査', qualification: '選定',
  needs_analysis: 'ニーズ分析', proposal: '提案',
  negotiation: '交渉', closed_won: '成立', closed_lost: '不成立',
};

/** `related_to_type` の値は **オブジェクト名**。各オブジェクトの label と必ず一致させる。 */
const relatedToTypeOptions = {
  crm_account: '取引先', crm_contact: '取引先責任者', crm_opportunity: '商談',
  crm_lead: 'リード', crm_case: 'ケース',
};

export const jaJP: TranslationData = {
  objects: {
    crm_account: {
      label: '取引先',
      pluralLabel: '取引先',
      description: '当社と取引のある企業・組織',
      fields: {
        account_number: { label: '取引先番号' },
        name: { label: '取引先名', help: '会社または組織の正式名称' },
        name_normalized: {
          label: '取引先名（正規化）',
          help: 'リード変換の照合キー。取引先名を小文字化し、前後の空白を除去して、内部の連続する空白を 1 つにまとめたもの。account_protection フックが自動で維持します — 直接編集しないでください。',
        },
        display_title: { label: '表示名' },
        type: {
          label: 'タイプ',
          options: { prospect: '見込み客', customer: '顧客', partner: 'パートナー', former: '過去の取引先' },
        },
        industry: {
          label: '業種',
          options: { ...industryOptions },
        },
        annual_revenue: { label: '年間売上' },
        child_account_revenue: { label: '子会社年間売上合計', help: '直属の子取引先の年間売上の合計。' },
        number_of_employees: { label: '従業員数' },
        phone: { label: '電話番号' },
        website: { label: 'Webサイト' },
        billing_address: { label: '請求先住所' },
        billing_country: {
          label: '請求先国',
          help: '請求先住所から導出 — 入力された国名をそのまま、前後の空白を除去し大文字化した値。',
        },
        territory: {
          label: 'テリトリー',
          help: '請求先住所から導出 — テリトリー共有ルールが照合する営業テリトリー。担当チームのないテリトリーの取引先は「その他」。',
          options: { na: '北米', emea: 'EMEA', other: 'その他' },
        },
        office_location: { label: 'オフィス所在地' },
        owner_id: { label: '取引先所有者' },
        parent_account: { label: '親取引先', help: '階層構造における親会社' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        last_activity_date: { label: '最終活動日' },
        brand_color: { label: 'ブランドカラー' },
        logo: { label: '会社ロゴ' },
        tier: {
          label: '顧客ランク',
          options: {
            strategic: '戦略顧客', enterprise: 'エンタープライズ',
            mid_market: 'ミッドマーケット', smb: '中小企業',
          },
        },
        segment: {
          label: '顧客セグメント',
          options: { net_new: '新規獲得', growth: '成長', at_risk: 'リスクあり', stable: '安定' },
        },
        health_score: {
          label: 'ヘルススコア',
          help: 'カスタマーサクセス担当（CSM）が管理する健全性の指標',
          options: { healthy: '良好', watching: '要観察', at_risk: 'リスクあり', churning: '解約進行中' },
        },
      },
      _views: {
        all_accounts: { label: '全取引先', description: '売上と業種を含む取引先の一覧' },
        account_gallery: { label: '取引先カード', description: 'ブランドカラー付きのカードビュー' },
        account_map: { label: '取引先マップ', description: '取引先の地理的分布' },
        enterprise_accounts: { label: 'エンタープライズ取引先', description: '年商最上位の主要顧客' },
        my_accounts: { label: '私の取引先', description: '自分が所有する取引先' },
        at_risk_accounts: { label: '⚠️ リスクのある取引先' },
      },
      _sections: {
        basic: { label: '基本情報' },
        financials: { label: '財務情報' },
        contact_info: { label: '連絡先情報' },
        ownership: { label: '所有者・ステータス' },
        branding: { label: 'ブランディング' },
        system: { label: 'システム' },
        // account.view.ts のフォームセクション名 (#1100)
        profile: { label: 'プロフィール' },
        customer_success: { label: 'カスタマーサクセス' },
        locations: { label: '所在地' },
        description: { label: '説明' },
      },
      _actions: { ...activityActions },
    },

    crm_contact: {
      label: '取引先責任者',
      pluralLabel: '取引先責任者',
      description: '取引先に所属する担当者',
      fields: {
        salutation: { label: '敬称', options: { ...salutationOptions } },
        first_name: { label: '名' },
        last_name: { label: '姓' },
        full_name: { label: '氏名' },
        crm_account: { label: '取引先' },
        email: { label: 'メール' },
        phone: { label: '電話' },
        mobile: { label: '携帯電話' },
        title: { label: '役職' },
        department: {
          label: '部門',
          options: {
            executive: '経営層', sales: '営業部', marketing: 'マーケティング部',
            engineering: 'エンジニアリング部', support: 'サポート部', finance: '経理部',
            hr: '人事部', operations: 'オペレーション部',
          },
        },
        owner_id: { label: '取引先責任者の所有者' },
        description: { label: '説明' },
        is_primary: { label: '主担当者', help: 'この取引先の主担当者かどうか' },
        avatar: { label: 'プロフィール画像' },
        mailing_street: { label: '郵送先 番地' },
        mailing_city: { label: '郵送先 市区町村' },
        mailing_state: { label: '郵送先 都道府県' },
        mailing_postal_code: { label: '郵便番号' },
        mailing_country: { label: '郵送先 国' },
        lead_source: { label: 'リードソース', options: { ...leadSourceOptions } },
        do_not_call: { label: '電話拒否' },
        email_opt_out: { label: 'メール配信停止' },
        last_contacted_date: { label: '最終接触日時' },
      },
      _views: {
        all_contacts: { label: '全取引先責任者' },
        contact_directory: { label: '責任者ディレクトリ' },
        primary_contacts: { label: '主担当者' },
      },
      _sections: {
        identity: { label: '基本情報' },
        account_info: { label: '取引先・役職' },
        contact_info: { label: '連絡先情報' },
        mailing_address: { label: '郵送先住所' },
        additional: { label: 'その他の情報' },
        preferences: { label: 'コミュニケーション設定' },
        // contact.view.ts のフォームセクション名 (#1100)
        contact_details: { label: '連絡先情報' },
        comm_preferences: { label: '設定' },
      },
      _actions: {
        ...activityActions,
        mark_primary: {
          label: '主担当者に設定',
          confirmText: 'この責任者を取引先の主担当者に設定しますか？',
          successMessage: '主担当者に設定しました！',
        },
        send_email: {
          label: 'メール送信',
          params: {
            subject: { label: '件名' },
            body: { label: '本文' },
          },
        },
        add_contact_to_campaign: {
          label: 'キャンペーンに追加',
          successMessage: '取引先責任者をキャンペーンに追加しました！',
          params: {
            crm_campaign: { label: 'キャンペーン' },
          },
        },
      },
    },

    crm_knowledge_article: {
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
        stale_articles: { label: 'レビューキュー · 古い順' },
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

    crm_forecast: {
      label: 'フォーキャスト',
      pluralLabel: 'フォーキャスト',
      description: '担当者ごとの定期パイプラインスナップショットで収益予測に使用',
      fields: {
        owner_id: { label: '担当者' },
        period: { label: '期間', options: { month: '月次', quarter: '四半期' } },
        period_start: {
          label: '期間開始',
          help: '期間の初日である必要があります — 例: 2026 年 8 月なら 2026-08-01。四半期のフォーキャストはさらに四半期の境界（1 月 1 日・4 月 1 日・7 月 1 日・10 月 1 日）で開始する必要があります。',
        },
        period_end: {
          label: '期間終了',
          help: '通常は「期間」と「期間開始」から自動的に算出されます。手動で入力する場合は、その期間の最終日である必要があります — 例: 2026-07-01 開始の四半期なら 2026-09-30、2026 年 8 月なら 2026-08-31。',
        },
        period_label: {
          label: '期間',
          help: '「2026 年第 3 四半期」「2026 年 8 月」のような読みやすい期間ラベル。',
        },
        display_title: { label: '表示名' },
        snapshot_date: { label: 'スナップショット日', help: 'このスナップショットを取得した日。' },
        source: {
          label: 'ソース',
          options: { scheduled: '定期スナップショット', ai: 'AI スキル', manual: '手動入力' },
        },
        quota: { label: 'クォータ' },
        pipeline_amount: {
          label: 'パイプライン',
          help: 'この期間にクローズ予定のオープン商談の合計金額（ステージを問わない）。',
        },
        best_case_amount: {
          label: 'ベストケース',
          help: '売上予測カテゴリが「ベストケース」または「コミット」のオープン商談。',
        },
        commit_amount: {
          label: 'コミット',
          help: '売上予測カテゴリが「コミット」のオープン商談（担当者がコミット済み）。',
        },
        closed_amount: { label: 'クローズ', help: 'この期間にすでに成立した金額。' },
        expected_amount: {
          label: '予想',
          help: 'クローズ + コミット — 担当者が無理なく着地を見込める金額。',
        },
        attainment_pct: {
          label: '達成率 %',
          help: 'クローズ ÷ クォータ × 100。クォータが正の値になるまでは 0% と表示されます。',
        },
        coverage_ratio: {
          label: 'カバレッジ',
          help: 'パイプライン ÷（クォータ − クローズ）— 残りの差分を埋めるパイプラインが十分かどうか。クォータ達成済みの場合は 0 と表示されます。',
        },
        notes: { label: 'メモ' },
        seed_key: {
          label: 'シードキー',
          help: 'デモデータの識別子。シードローダーだけが書き込み、実際のスナップショットでは常に空です。',
        },
      },
      _views: {
        all_forecasts: { label: 'すべてのフォーキャスト' },
        this_quarter_forecasts: {
          label: '今四半期',
          emptyState: {
            title: '今四半期のスナップショットはまだありません',
            message: '四半期スナップショットは夜間のフォーキャスト集計が書き込みます。今四半期分が一度実行されるまでこのビューは空です。確定済みの四半期は「すべて」タブにあります。',
          },
        },
        my_forecast: { label: '自分のフォーキャスト' },
      },
      _sections: {
        basic: { label: 'スナップショット' },
        amounts: { label: '金額' },
        meta: { label: 'ソース' },
        // forecast.view.ts のフォームセクション名 (#1100)
        snapshot: { label: 'スナップショット' },
        notes: { label: 'メモ' },
      },
    },

    crm_lead: {
      label: 'リード',
      pluralLabel: 'リード',
      description: 'まだ適格判定を受けていない見込み客',
      fields: {
        salutation: { label: '敬称', options: { ...salutationOptions } },
        first_name: { label: '名' },
        last_name: { label: '姓' },
        full_name: { label: '氏名' },
        display_title: { label: '表示名' },
        company: { label: '会社名' },
        company_normalized: {
          label: '会社名（正規化）',
          help: 'リード変換の照合キー。会社名を小文字化し、前後の空白を除去して、内部の連続する空白を 1 つにまとめたもの。lead_duplicate_check フックが自動で維持します — 直接編集しないでください。',
        },
        title: { label: '役職' },
        email: { label: 'メール' },
        phone: { label: '電話' },
        industry: {
          label: '業種',
          options: { ...industryOptions },
        },
        status: {
          label: 'ステータス',
          options: {
            new: '新規', contacted: 'コンタクト済み', qualified: '適格',
            unqualified: '不適格', converted: '変換済み',
          },
        },
        lead_source: { label: 'リードソース', options: { ...leadSourceOptions } },
        owner_id: { label: 'リード所有者' },
        is_converted: { label: '変換済み' },
        description: { label: '説明' },
        mobile: { label: '携帯電話' },
        website: { label: 'Webサイト' },
        rating: { label: 'リードスコア', help: 'リードの品質スコア（1〜5 段階）' },
        converted_account: { label: '変換後の取引先' },
        converted_contact: { label: '変換後の取引先責任者' },
        converted_opportunity: { label: '変換後の商談' },
        converted_date: { label: '変換日' },
        address: { label: '住所' },
        annual_revenue: { label: '年間売上' },
        number_of_employees: { label: '従業員数' },
        notes: { label: 'メモ', help: 'このリードに関する作業メモ — 書式設定に対応。' },
        do_not_call: { label: '電話拒否' },
        email_opt_out: { label: 'メール配信停止' },
        next_followup_date: { label: '次回フォローアップ日' },
        last_contacted_date: { label: '最終接触日時' },
        disqualification_reason: {
          label: '不適格理由',
          help: 'ステータスが「不適格」の場合は必須',
          options: {
            not_a_fit: 'ニーズが合わない', no_budget: '予算なし', wrong_persona: '担当者が異なる',
            unreachable: '連絡不能', duplicate: '重複リード', competitor: '競合他社に決定',
            other: 'その他',
          },
        },
        duplicate_of_type: {
          label: '重複対象',
          help: '重複元として残るレコードが属するオブジェクトの種別。',
          // `erased` は墓碑値であり選択肢ではない。フォームには表示しない
          // （`src/views/lead.view.ts` を参照）が、残存レコードが削除された
          // リードはこの値を保持するため、レコードを読む場所ではラベルが要る。
          options: { crm_lead: 'リード', crm_contact: '取引先責任者', erased: '削除済みレコード' },
        },
        duplicate_of_lead: { label: '重複するリード' },
        duplicate_of_contact: { label: '重複する取引先責任者' },
        duplicate_status: {
          label: '重複ステータス',
          help: '「重複の疑い」= 登録時に自動で付与。「重複確定」= 担当者が一致を確認済み。',
          options: { suspected: '重複の疑い', confirmed: '重複確定' },
        },
      },
      _views: {
        all_leads: {
          label: '全リード',
          emptyState: { title: 'リードがまだありません', message: '最初のリードを作成して始めましょう' },
        },
        kanban_by_status: { label: 'リードパイプライン' },
        calendar_by_created: { label: 'リードカレンダー' },
        gallery_view: { label: 'リードカード' },
        my_leads: { label: '私のリード' },
        high_priority: { label: '優先度高' },
        hot_leads: { label: '🔥 ホットリード' },
        suspected_duplicates: {
          label: '重複の疑いがあるリード',
          emptyState: {
            title: '重複の疑いはありません',
            message: '確認は不要です — 再登録されたメールアドレスはすべてチェック済みです。',
          },
        },
      },
      _sections: {
        // 詳細ページの `record:details` セクション名（lead_detail.page.ts）
        info: { label: 'リード情報' },
        crm_contact: { label: '連絡先' },
        detail: { label: 'リード詳細' },
        address: { label: '住所' },
        description: { label: '説明' },
        // オブジェクト定義のセクションキー（lead.object.ts）— 入力フォームで使用
        identity: { label: '基本情報' },
        company_info: { label: '会社情報' },
        contact_info: { label: '連絡先情報' },
        qualification: { label: '適格判定' },
        assignment: { label: '担当者' },
        additional: { label: 'その他の情報' },
        preferences: { label: 'コミュニケーション設定' },
        conversion: { label: '変換' },
        duplicates: { label: '重複管理' },
        // lead.view.ts のフォームセクション名 (#1100) — デフォルトフォームと
        // 名前付き formView 6 種。
        contact_information: { label: '連絡先情報' },
        lead_classification: { label: 'リード分類' },
        company_information: { label: '会社情報' },
        additional_information: { label: '追加情報' },
        privacy: { label: 'プライバシー' },
        lead_details: { label: 'リード詳細' },
        general: { label: '一般' },
        details: { label: '詳細' },
        step_1_contact_details: { label: 'ステップ1：連絡先情報' },
        step_2_company_information: { label: 'ステップ2：会社情報' },
        step_3_qualification: { label: 'ステップ3：資格評価' },
        step_4_review_and_convert: { label: 'ステップ4：確認と変換' },
        primary_information: { label: '主要情報' },
        extended_details: { label: '詳細情報' },
        quick_edit: { label: 'クイック編集' },
        update_lead_status: { label: 'リードステータスを更新' },
        tell_us_about_yourself: { label: 'あなたについて教えてください' },
        about_your_company: { label: '貴社について' },
        how_can_we_help: { label: 'どのようなご用件でしょうか？' },
        lead_information: { label: 'リード情報' },
        address_information: { label: '住所情報' },
        privacy_preferences: { label: 'プライバシー設定' },
      },
      _actions: {
        ...activityActions,
        convert_lead: {
          label: 'リード変換',
          confirmText: 'このリードを変換してもよろしいですか？',
          successMessage: 'リードの変換に成功しました！',
        },
        create_campaign: {
          label: 'キャンペーンに追加',
          successMessage: 'キャンペーンに追加しました！',
          params: {
            crm_campaign: { label: 'キャンペーン' },
          },
        },
        schedule_followup: {
          label: 'フォローアップを設定',
          successMessage: 'フォローアップを設定しました。',
        },
      },
    },

    crm_opportunity: {
      label: '商談',
      pluralLabel: '商談',
      description: 'パイプライン上の商談・案件',
      fields: {
        name: { label: '商談名' },
        crm_account: { label: '取引先' },
        primary_contact: { label: '主担当者' },
        owner_id: { label: '商談所有者' },
        amount: { label: '金額' },
        expected_revenue: { label: '期待収益' },
        stage: {
          label: 'ステージ',
          options: { ...opportunityStageOptions },
        },
        probability: { label: '確度 (%)' },
        close_date: { label: '完了予定日' },
        type: {
          label: 'タイプ',
          options: {
            new_business: '新規ビジネス',
            existing_upgrade: '既存顧客 - アップグレード',
            existing_renewal: '既存顧客 - 更新',
            existing_expansion: '既存顧客 - 拡大',
          },
        },
        forecast_category: {
          label: '売上予測カテゴリ',
          options: {
            pipeline: 'パイプライン', best_case: 'ベストケース',
            commit: 'コミット', omitted: '除外', closed: '完了',
          },
        },
        description: { label: '説明' },
        next_step: { label: '次のステップ' },
        lead_source: { label: 'リードソース', options: { ...leadSourceOptions } },
        crm_campaign: { label: 'キャンペーン', help: 'この商談を生み出したマーケティングキャンペーン' },
        days_in_stage: { label: '現ステージ滞在日数' },
        stage_entry_date: { label: 'ステージ開始日', help: 'この商談が現在のステージに入った日。' },
        is_private: { label: '非公開' },
        approval_status: {
          label: '承認ステータス',
          options: { not_required: '承認不要', pending: '承認待ち', approved: '承認済み', rejected: '却下' },
        },
        approved_date: { label: '承認日' },
        // #593 — 商談クローズ時に必須。失注理由は営業ダッシュボードの
        // 内訳ウィジェットにも出るため、保存値がそのまま画面に出てはいけない。
        win_reason: {
          label: '受注理由',
          help: '受注に至った理由。商談を「成立」でクローズする際に必須です。',
          options: {
            better_product: '製品が優れている', better_price: '価格が優れている',
            relationship: '既存の関係', better_support: 'サポートが優れている',
            best_fit: '最適な機能・適合性',
            quote_accepted: '見積承認', other: 'その他',
          },
        },
        loss_reason: {
          label: '失注理由',
          help: '失注した理由。商談を「不成立」でクローズする際に必須です。',
          options: {
            price: '価格が高すぎる', competitor: '競合他社に敗北',
            no_budget: '予算なし', no_decision: '意思決定なし',
            timing: 'タイミング不適', features: '機能不足', other: 'その他',
          },
        },
        loss_details: { label: '受注・失注の詳細', help: '受注・失注理由の補足説明（自由記述）。' },
      },
      _views: {
        open_opportunities: { label: '進行中の商談' },
        all_opportunities: { label: '全商談' },
        pipeline_kanban: { label: 'セールスパイプライン' },
        close_date_calendar: { label: '予測カレンダー' },
        deal_timeline: { label: '商談タイムライン' },
        deal_gallery: { label: '商談カード' },
        my_open_deals: { label: '私のオープン商談' },
        stale_opportunities: { label: '⚠️ 停滞商談 · ステージ滞在が長い順' },
        closing_this_quarter: {
          label: '今四半期にクローズ予定',
          emptyState: {
            title: '今四半期にクローズ予定の商談はありません',
            message: 'このタブには、完了予定日が今四半期内にあるコミット／ベストケースのオープン商談が表示されます。現在該当する商談はありません。それ以降にクローズする商談は「オープン商談」タブにあります。',
          },
        },
      },
      _sections: {
        // 詳細ページの `record:details` セクション名（opportunity_detail.page.ts）
        info: { label: '商談情報' },
        crm_forecast: { label: 'ステージ・売上予測' },
        description: { label: '説明' },
        // オブジェクト定義のセクションキー（opportunity.object.ts）— 入力フォームで使用
        basic: { label: '基本情報' },
        financials: { label: '財務情報' },
        sales_process: { label: '営業プロセス' },
        classification: { label: '分類' },
        campaign: { label: 'キャンペーン' },
        notes: { label: 'メモ・次のステップ' },
        // opportunity.view.ts のフォームセクション名 (#1100)
        overview: { label: '概要' },
        forecast: { label: '予測' },
        sales_strategy: { label: '営業戦略' },
        win_loss: { label: '受注／失注' },
      },
      _actions: {
        ...activityActions,
        clone_opportunity: {
          label: '商談を複製',
          successMessage: '商談を複製しました！',
        },
        mass_update_stage: {
          label: 'ステージ更新',
          successMessage: '商談ステージを更新しました！',
          params: {
            stage: {
              label: '新しいステージ',
              options: { ...opportunityStageOptions },
            },
          },
        },
        generate_quote: {
          label: '見積を作成',
          successMessage: '商談から見積を作成しました！',
        },
      },
    },

    crm_case: {
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
        customer_rating: { label: '顧客満足度', help: '顧客満足度の評価（1〜5 段階）' },
        customer_feedback: { label: '顧客フィードバック' },
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
        // case.view.ts のフォームセクション名 (#1100)。sla ではなく
        // sla_overview — sla は「SLA・優先度」フィールドグループのキーとして
        // 既に使われている。
        case: { label: 'ケース' },
        sla_overview: { label: 'SLA' },
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
      },
    },

    crm_contract: {
      label: '契約',
      pluralLabel: '契約',
      description: '顧客と締結した法的な契約・合意',
      fields: {
        contract_number: { label: '契約番号' },
        crm_account: { label: '取引先' },
        crm_contact: { label: '主担当者' },
        crm_opportunity: { label: '関連商談' },
        owner_id: { label: '契約担当者' },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き', in_approval: '承認中', activated: '有効',
            expired: '期限切れ', terminated: '解約',
          },
        },
        contract_term_months: { label: '契約期間（月）' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        contract_value: { label: '契約金額' },
        billing_frequency: {
          label: '請求頻度',
          options: { monthly: '月次', quarterly: '四半期', annually: '年次', one_time: '一括' },
        },
        payment_terms: { label: '支払条件', options: { ...paymentTermsOptions } },
        auto_renewal: { label: '自動更新' },
        renewal_notice_days: { label: '更新通知（日）' },
        contract_type: {
          label: '契約種別',
          options: {
            subscription: 'サブスクリプション契約', service: 'サービス契約',
            license: 'ライセンス契約', partnership: 'パートナーシップ契約',
            nda: '秘密保持契約 (NDA)', msa: '基本契約 (MSA)',
          },
        },
        signed_date: { label: '署名日' },
        signed_by: { label: '署名者' },
        document_url: { label: '契約書類' },
        special_terms: { label: '特約事項' },
        description: { label: '説明' },
        billing_address: { label: '請求先住所' },
      },
      _views: {
        all_contracts: { label: '全契約' },
        renewal_calendar: { label: '更新カレンダー' },
        contract_gantt: { label: '契約期間' },
        contract_timeline: { label: '契約タイムライン' },
      },
      _sections: {
        basic: { label: '契約情報' },
        parties: { label: '契約当事者' },
        terms: { label: '契約条件・期間' },
        value: { label: '契約金額' },
        status: { label: 'ステータス・承認' },
        renewal: { label: '更新' },
        // contract.view.ts のフォームセクション名 (#1100)
        contract_terms: { label: '契約条件' },
        signing_and_documents: { label: '署名と書類' },
        notes: { label: '備考' },
      },
    },

    crm_product: {
      label: '製品',
      pluralLabel: '製品',
      description: '自社が提供する製品・サービス',
      fields: {
        product_code: { label: '製品コード' },
        name: { label: '製品名' },
        display_title: { label: '表示名' },
        description: { label: '説明' },
        category: {
          label: 'カテゴリ',
          options: {
            software: 'ソフトウェア', hardware: 'ハードウェア', service: 'サービス',
            subscription: 'サブスクリプション', support: 'サポート',
          },
        },
        family: {
          label: '製品ファミリ',
          options: {
            enterprise: 'エンタープライズ向けソリューション', smb: '中小企業向けソリューション',
            services: 'プロフェッショナルサービス', cloud: 'クラウドサービス',
          },
        },
        list_price: { label: '定価' },
        cost: { label: 'コスト' },
        sku: { label: 'SKU' },
        is_active: { label: '有効' },
        tax_rate: { label: '既定の税率 %' },
        product_manager: { label: 'プロダクトマネージャー' },
        image: { label: '製品画像' },
        datasheet: { label: 'データシート' },
      },
      _views: {
        all_products: { label: '全製品' },
        product_catalog: { label: '製品カタログ' },
      },
      _sections: {
        basic: { label: '製品情報' },
        pricing: { label: '価格' },
        metadata: { label: '関連資料' },
        // product.view.ts のフォームセクション名 (#1100)
        product_info: { label: '製品情報' },
        pricing_info: { label: '価格' },
        media: { label: 'メディア' },
      },
    },

    crm_quote: {
      label: '見積',
      pluralLabel: '見積',
      description: '顧客に提示する価格見積',
      fields: {
        quote_number: { label: '見積番号' },
        name: { label: '見積名' },
        display_title: { label: '表示名' },
        crm_account: { label: '取引先' },
        crm_contact: {
          label: '取引先責任者',
          help: '見積が「提示済み」または「承認済み」になった時点で必須です。作成される契約の主担当者はここから引き継がれます。',
        },
        crm_opportunity: { label: '商談' },
        owner_id: { label: '見積担当者' },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き', in_review: 'レビュー中', presented: '提示済み',
            accepted: '承認済み', rejected: '却下', expired: '期限切れ',
          },
        },
        quote_date: { label: '見積日' },
        expiration_date: { label: '有効期限' },
        subtotal: { label: '小計' },
        discount: { label: '割引率(%)' },
        discount_amount: { label: '割引額' },
        tax: { label: '税額' },
        shipping_handling: { label: '配送・手数料' },
        total_price: { label: '合計金額' },
        payment_terms: { label: '支払条件', options: { ...paymentTermsOptions } },
        shipping_terms: { label: '配送条件' },
        billing_address: { label: '請求先住所' },
        shipping_address: { label: '配送先住所' },
        description: { label: '説明' },
        internal_notes: { label: '内部メモ' },
      },
      _views: {
        all_quotes: { label: '全見積' },
        quote_pipeline: { label: '見積パイプライン' },
        quote_calendar: { label: '見積カレンダー' },
      },
      _sections: {
        basic: { label: '見積情報' },
        pricing: { label: '価格' },
        terms: { label: '条件・有効期限' },
        address: { label: '住所' },
        system: { label: 'システム' },
        // quote.view.ts のフォームセクション名 (#1100)
        quote: { label: '見積書' },
        totals: { label: '合計' },
        quote_terms: { label: '契約条件' },
        addresses_and_notes: { label: '住所と備考' },
      },
    },

    crm_task: {
      label: 'タスク',
      pluralLabel: 'タスク',
      description: '活動と ToDo',
      fields: {
        subject: { label: '件名' },
        description: { label: '説明' },
        status: {
          label: 'ステータス',
          options: {
            not_started: '未着手', in_progress: '進行中', waiting: '待機中',
            completed: '完了', deferred: '保留',
          },
        },
        priority: {
          label: '優先度',
          options: { low: '低', normal: '通常', high: '高', urgent: '緊急' },
        },
        priority_rank: { label: '優先度ランク' },
        type: {
          label: 'タスク種別',
          options: {
            call: '電話', email: 'メール', meeting: '会議',
            follow_up: 'フォローアップ', demo: 'デモ', other: 'その他',
          },
        },
        due_date: { label: '期限' },
        reminder_date: { label: 'リマインダー日時' },
        reminder_sent: { label: 'リマインダー送信済み' },
        completed_date: { label: '完了日' },
        owner_id: { label: '担当者' },
        related_to_type: {
          label: '関連オブジェクト種別',
          options: { ...relatedToTypeOptions },
        },
        related_to_account: { label: '関連取引先' },
        related_to_contact: { label: '関連取引先責任者' },
        related_to_opportunity: { label: '関連商談' },
        related_to_lead: { label: '関連リード' },
        related_to_case: { label: '関連ケース' },
        is_recurring: { label: '繰り返しタスク' },
        recurrence_type: {
          label: '繰り返し種別',
          options: { daily: '毎日', weekly: '毎週', monthly: '毎月', yearly: '毎年' },
        },
        recurrence_interval: { label: '繰り返し間隔' },
        recurrence_end_date: { label: '繰り返し終了日' },
        is_completed: { label: '完了済' },
        is_overdue: { label: '期限超過' },
        progress_percent: { label: '進捗（%）' },
      },
      _views: {
        all_tasks: { label: '全タスク' },
        task_board: { label: 'タスクボード' },
        task_calendar: { label: 'タスクカレンダー' },
        task_gantt: { label: '実行計画' },
        task_timeline: { label: '工数タイムライン' },
        my_open_tasks: { label: '私のオープンタスク' },
        todays_tasks: { label: '📅 私の優先タスク' },
        overdue_tasks: { label: '⏰ オープンタスク · 期限超過が長い順' },
      },
      _sections: {
        basic: { label: 'タスク情報' },
        scheduling: { label: 'スケジュール' },
        related: { label: '関連レコード' },
        recurrence: { label: '繰り返し' },
        effort: { label: '進捗・工数' },
        system: { label: 'システム' },
        // task.view.ts のフォームセクション名 (#1100)
        task: { label: 'タスク' },
        related_records: { label: '関連レコード' },
        recurrence_and_effort: { label: '繰り返しと工数' },
      },
    },

    crm_campaign: {
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

    crm_event: {
      label: 'イベント',
      pluralLabel: 'イベント',
      description: '顧客との会議・電話などの予定された対話',
      fields: {
        subject: { label: '件名' },
        description: { label: '説明' },
        type: {
          label: 'イベント種別',
          options: {
            meeting: '会議', call: '電話', demo: 'デモ',
            webinar: 'ウェビナー', onsite_visit: '訪問', other: 'その他',
          },
        },
        status: {
          label: 'ステータス',
          options: {
            planned: '予定', held: '実施済み', cancelled: 'キャンセル', no_show: '無断欠席',
          },
        },
        owner_id: { label: '担当者' },
        start_datetime: { label: '開始' },
        end_datetime: { label: '終了' },
        all_day: { label: '終日イベント' },
        duration_minutes: { label: '所要時間（分）' },
        location: { label: '場所', help: '会議室・住所・会議リンク' },
        related_to_type: {
          label: '関連レコード種別',
          options: { ...relatedToTypeOptions },
        },
        related_to_account: { label: '関連取引先' },
        related_to_contact: { label: '関連取引先責任者' },
        related_to_opportunity: { label: '関連商談' },
        related_to_lead: { label: '関連リード' },
        related_to_case: { label: '関連ケース' },
        outcome_notes: { label: '結果メモ', help: '合意事項と次のアクション' },
      },
      _views: {
        all_events: { label: 'すべてのイベント' },
        event_calendar: { label: 'イベントカレンダー' },
        event_timeline: { label: 'チームスケジュール' },
        my_events: { label: 'マイカレンダー' },
        upcoming_events: { label: '📅 開催予定 · 直近順' },
        held_events: { label: '✅ 対話履歴' },
      },
      _sections: {
        basic: { label: 'イベント情報' },
        schedule: { label: 'スケジュール' },
        related: { label: '関連レコード' },
        outcome: { label: '実施結果' },
        // event.view.ts のフォームセクション名 (#1100)
        event: { label: 'イベント' },
        related_records: { label: '関連レコード' },
      },
    },

    crm_event_attendee: {
      label: 'イベント参加者',
      pluralLabel: 'イベント参加者',
      description: 'イベントに招待された、または出席した人',
      fields: {
        attendee_number: { label: '参加者番号' },
        crm_event: { label: 'イベント' },
        attendee_type: {
          label: '参加者種別',
          options: { contact: '取引先責任者', lead: 'リード', user: '社内ユーザー', external: '社外ゲスト' },
        },
        crm_contact: { label: '取引先責任者', help: '参加者が既存の取引先責任者である場合に設定します' },
        crm_lead: { label: 'リード', help: '参加者がまだ変換されていないリードである場合に設定します' },
        sys_user: { label: '社内ユーザー', help: '参加者が社内の同僚である場合に設定します' },
        external_name: { label: '社外参加者', help: 'CRM のどのオブジェクトにも存在しない参加者の氏名 — 参加者種別が「社外ゲスト」のときに設定します' },
        response: {
          label: '回答',
          options: {
            no_response: '未回答', accepted: '承諾',
            declined: '辞退', tentative: '仮承諾',
          },
        },
        is_organizer: { label: '主催者' },
        invited_date: { label: '招待日時' },
      },
      _views: {
        all_event_attendees: { label: 'イベント参加者' },
      },
      _sections: {
        basic: { label: '参加者' },
        response: { label: '招待' },
        // event_attendee.view.ts のフォームセクション名 (#1100)
        attendee: { label: '参加者' },
        invitation: { label: '招待' },
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

    crm_campaign_member: {
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

    crm_opportunity_line_item: {
      label: '商談商品明細',
      pluralLabel: '商談商品明細',
      description: '商談配下の製品別価格明細行',
      fields: {
        crm_opportunity: { label: '商談' },
        crm_product: { label: '製品' },
        description: { label: '説明' },
        quantity: { label: '数量' },
        list_price: { label: '定価', help: '製品のカタログ価格から自動入力されます' },
        unit_price: { label: '販売価格', help: '交渉後の単価（定価と異なる場合があります）' },
        discount: { label: '割引率（%）' },
        total_price: { label: '合計' },
        line_number: { label: '行番号' },
      },
    },

    crm_quote_line_item: {
      label: '見積明細',
      pluralLabel: '見積明細',
      description: '見積配下の製品別価格明細行',
      fields: {
        crm_quote: { label: '見積' },
        crm_product: { label: '製品' },
        description: { label: '説明' },
        quantity: { label: '数量' },
        list_price: { label: '定価' },
        unit_price: { label: '販売価格' },
        discount: { label: '割引率（%）' },
        subtotal: { label: '小計' },
        tax_rate: { label: '税率（%）' },
        total_price: { label: '合計' },
        line_number: { label: '行番号' },
      },
    },
  },

  apps: {
    crm_enterprise: {
      label: 'HotCRM',
      description: '営業・サービス・マーケティング向け顧客関係管理システム',
      // Keyed by navigation-node `id` (a flat keyspace regardless of depth).
      navigation: {
        nav_home: { label: 'ホーム' },

        group_sales: { label: '営業' },
        nav_lead: { label: 'リード' },
        nav_account: { label: '取引先' },
        nav_account_workbench: { label: '取引先ワークベンチ' },
        nav_contact: { label: '取引先責任者' },
        nav_opportunity: { label: '商談' },
        nav_pipeline: { label: 'パイプライン' },
        nav_quote: { label: '見積' },
        nav_contract: { label: '契約' },
        nav_sales_dashboard: { label: '営業実績' },

        group_work: { label: 'マイワーク' },
        nav_my_tasks: { label: '私のタスク' },
        nav_my_deals: { label: '私の商談' },
        nav_my_leads: { label: '私のリード' },
        nav_my_cases: { label: '私のケース' },
        nav_my_calendar: { label: 'マイカレンダー' },
        nav_all_tasks: { label: '全タスク' },

        group_activity: { label: '活動' },
        nav_event: { label: 'イベント' },
        nav_event_calendar: { label: 'カレンダー' },
        nav_event_history: { label: '対話履歴' },
        nav_activity_dashboard: { label: '営業活動' },

        group_marketing: { label: 'マーケティング' },
        nav_campaign: { label: 'キャンペーン' },
        nav_product: { label: '製品' },

        group_service: { label: 'サービス' },
        nav_case: { label: 'ケース' },
        nav_knowledge: { label: 'ナレッジベース' },
        nav_service_dashboard: { label: 'サービス概要' },

        group_insights: { label: 'インサイト' },
        nav_crm_dashboard: { label: 'CRM 概要' },
        nav_forecast: { label: 'フォーキャスト' },
        nav_report_pipeline_coverage: { label: 'パイプラインカバレッジ' },
        nav_report_lead_inflow: { label: 'リード流入' },
        nav_report_sla: { label: 'SLA 実績' },

        group_approvals: { label: '承認' },
        nav_approval_requests: { label: '受信トレイ' },
      },
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
    'common.back': '戻る',
    'common.confirm': '確認',
    'nav.sales': '営業',
    'nav.service': 'サービス',
    'nav.marketing': 'マーケティング',
    'nav.products': '製品',
    'nav.analytics': 'アナリティクス',
    'success.saved': 'レコードを保存しました',
    'success.converted': 'リードを変換しました',
    'confirm.delete': 'このレコードを削除してもよろしいですか？',
    'confirm.convert_lead': 'このリードを取引先・取引先責任者・商談に変換しますか？',
    'error.required': 'この項目は必須です',
    'error.load_failed': 'データの読み込みに失敗しました',
  },


  dashboards: {
    sales_activity_dashboard: {
      label: '営業活動',
      description: '誰がどれだけ顧客と話しているか、どの取引先が沈黙しているか',
      widgets: {
        interactions_held: { title: '記録済みの対話', description: '実際に行われた電話と会議' },
        meetings_booked: { title: '設定済みの会議', description: 'カレンダー上にあり未実施の会議' },
        customer_minutes: { title: '顧客接触時間（分）', description: '顧客と向き合った総時間' },
        tasks_completed: { title: '完了タスク', description: 'クローズしたフォローアップ' },
        activity_by_rep: { title: '担当者別の活動', description: '担当者ごとの記録済み対話数' },
        activity_by_week: { title: '週次の活動量', description: '週あたりの対話数' },
        activity_mix: { title: '活動の内訳', description: '電話・会議・デモの比率' },
        activity_by_record_type: { title: '活動の対象', description: 'ファネルのどこに注力しているか' },
        deal_activity: { title: '商談上の対話', description: '商談に紐づく記録済み対話' },
        open_deals_for_activity: { title: 'オープン商談', description: '進行中の商談数' },
        quiet_accounts_30: { title: '30 日以上沈黙', description: '1 か月間対話記録のないアクティブ取引先' },
        quiet_accounts_60: { title: '60 日以上沈黙', description: '2 か月の沈黙 — リスク閾値' },
        quiet_accounts_90: { title: '90 日以上沈黙', description: '四半期にわたり接触なし' },
      },
    },
    crm_overview_dashboard: {
      label: 'CRM 概要',
      description: '売上指標、パイプライン分析、商談インサイト',
      widgets: {
        total_revenue: { title: '総売上', description: '当期の成立済み売上' },
        active_deals: { title: '進行中の商談', description: 'パイプライン上のオープン商談' },
        won_deals: { title: '成立商談数', description: '当期に成立した商談の総数' },
        avg_deal_size: { title: '平均商談規模', description: '成立済み商談の平均金額' },
        revenue_trends: { title: '売上トレンド', description: '過去12か月の成立済み売上' },
        lead_source: { title: 'リードソース', description: '獲得チャネル別のパイプライン金額' },
        pipeline_by_stage: { title: 'ステージ別パイプライン', description: '各営業ステージのオープン商談金額' },
        top_products: { title: '売れ筋製品', description: '製品カテゴリ別の定価ベース売上' },
        pipeline_by_owner: { title: '担当者別パイプライン', description: '営業担当者ごとのオープンパイプライン金額と商談数' },
      },
    },
    executive_dashboard: {
      label: 'エグゼクティブ概要',
      description: '経営層向けの売上・顧客・パイプラインの主要KPI',
      widgets: {
        total_revenue_ytd: { title: '年度累計売上', description: '本年度の成立済み売上' },
        total_accounts: { title: 'アクティブ取引先', description: '少なくとも1つの有効な関係を持つ顧客' },
        total_contacts: { title: '取引先責任者数', description: '名簿に登録された取引先責任者' },
        open_leads: { title: 'オープンリード', description: '未変換のリード' },
        revenue_trend: { title: '売上トレンド', description: '過去12か月の成立済み売上' },
        revenue_by_industry: { title: '業種別売上', description: '本年度の成立済み売上を業種別に分類' },
        pipeline_by_stage: { title: 'ステージ別パイプライン', description: '営業ステージ別のオープン商談金額' },
        new_accounts_by_month: { title: '新規取引先', description: '過去6か月の取引先作成ペース' },
        accounts_by_industry: { title: '業種別取引先', description: '業種ごとの年間売上合計と取引先数' },
      },
    },
    sales_dashboard: {
      label: '営業実績',
      description: 'パイプライン分析、勝率トレンド、担当者別パフォーマンス',
      widgets: {
        total_pipeline_value: { title: 'パイプライン合計', description: 'オープン商談金額の合計' },
        closed_won_qtd: { title: '今四半期成立額', description: '今四半期に成立した売上' },
        open_opportunities: { title: 'オープン商談', description: '進行中のアクティブ商談' },
        avg_deal_size: { title: '平均商談規模', description: '今四半期の成立済み商談の平均金額' },
        pipeline_by_stage: { title: 'ステージ別パイプライン', description: '各営業ステージのオープン商談金額' },
        monthly_revenue_trend: { title: '月次売上トレンド', description: '過去12か月の成立済み売上' },
        pipeline_by_forecast_category: { title: '予測カテゴリ別パイプライン', description: '売上予測カテゴリ別のオープンパイプライン金額' },
        lead_source_breakdown: { title: 'リードソース', description: 'パイプラインの流入元' },
        open_pipeline_by_owner: { title: '担当者別オープンパイプライン', description: '営業担当者ごとの進行中パイプライン金額・商談数・平均勝率' },
        quota_attainment_by_rep: { title: '担当者別ノルマ達成状況', description: '予測スナップショットに基づく担当者別の今四半期ノルマ・成約収益・達成率' },
        pipeline_stage_by_source: { title: 'ステージ × リードソース', description: 'ステージとソース別の進行中商談金額のクロス集計' },
        win_rate_12m: { title: '勝率（直近12か月）', description: '直近12か月に決着した商談のうち成立した割合' },
        won_deals_12m: { title: '成立商談数（直近12か月）', description: '勝率の分子' },
        lost_deals_12m: { title: '失注商談数（直近12か月）', description: '勝率の分母のもう半分' },
        win_rate_by_owner: { title: '担当者別 受注／失注', description: '直近12か月の担当者ごとの成立数・失注数・勝率' },
        win_rate_by_lead_source: { title: 'リードソース別 受注／失注', description: '実際に成立につながるのはどのソースか — 直近12か月' },
        loss_reason_breakdown: { title: '失注の理由', description: '直近12か月の失注商談を理由別に集計' },
      },
    },
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
        open_cases_by_priority: { title: '優先度別オープンケース', description: 'オープンケースとそのSLA違反率を優先度別に集計' },
      },
    },
  },

  // `title` / `subtitle` translate the page's `page:header`; `title` falls back
  // to `label` when omitted, so it is authored only where the two differ.
  // Header strings carrying `{field}` tokens keep the token spelling verbatim —
  // the console substitutes on the raw key, so a translated token resolves to
  // nothing and the header renders blank.
  pages: {
    account_detail_page: {
      label: '取引先詳細',
      description: 'スロット構成の取引先レコードページ — カスタムヘッダーと常設のディスカッションフィード。',
    },
    account_workbench: {
      label: '取引先ワークベンチ',
      description: '営業チーム向けに厳選した取引先リスト。クイックフィルターのみで、ビュー管理は行いません。',
    },
    app_launcher_page: {
      label: 'アプリランチャー',
      description: 'すべてのアプリケーションにアクセスするための統合ハブ',
      subtitle: '開始するアプリを選択してください',
      components: {
        app_search: { label: 'アプリを検索' },
        app_grid: { label: 'アプリグリッド' },
      },
    },
    case_detail_page: {
      label: 'ケース詳細',
      description: 'サービス担当者向けのケースレコードページ：ハイライト、SLA パス、詳細、活動タイムライン。',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
      components: {
        case_highlights: { label: '重要情報' },
        case_status_path: { label: 'ケースステータスの進捗' },
      },
    },
    lead_detail_page: {
      label: 'リード詳細',
      description: 'ハイライト・詳細・関連情報を備えたリードの総合詳細ページ。',
      title: '{first_name} {last_name}',
      subtitle: '{company}',
      components: {
        lead_highlights: { label: '重要情報' },
        lead_path: { label: 'リードステータスの進捗' },
        main_tabs: { label: 'リード情報タブ' },
      },
    },
    opportunity_detail_page: {
      label: '商談詳細',
      description: 'ステージパス・ハイライト・詳細・関連リストを備えた商談の総合詳細ページ。',
      title: '{name}',
      subtitle: '{crm_account}',
      components: {
        opp_highlights: { label: '重要情報' },
        opp_stage_path: { label: '商談ステージの進捗' },
      },
    },
    sales_home_page: {
      label: '営業ホーム',
      description: '主要指標とクイックアクションをまとめた営業チームのホームページ',
      title: '営業ダッシュボード',
      subtitle: 'おかえりなさい',
      components: {
        quick_create: { title: 'クイック作成', label: 'クイック作成' },
        key_metrics: { title: '主要業績評価指標', label: '主要指標' },
        home_tabs: { label: 'ホームタブ' },
        ai_briefing: {
          title: 'AI アシスタントに質問',
          description:
            'ページ右端からアシスタントパネルを開き、「今日は何に集中すべきか？」と尋ねてください — リアルタイムのパイプライン、スキーマ、取引先情報を把握しています。',
          label: '今日の AI アシスタント',
        },
        upcoming_events: { title: '今後の予定', label: '今後の予定' },
      },
    },
    utility_bar_page: {
      label: 'ユーティリティバー',
      description: 'フローティングツールへのクイックアクセスバー',
      components: {
        notifications_panel: { label: '通知' },
        quick_notes: { title: 'クイックメモ', label: 'クイックメモ' },
        quick_search: { label: 'クイック検索' },
      },
    },
  },
};
