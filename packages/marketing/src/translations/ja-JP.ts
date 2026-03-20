import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — Marketing Cloud Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
export const jaJP: TranslationData = {
  objects: {
    campaign: {
      label: 'キャンペーン',
      pluralLabel: 'キャンペーン',
      fields: {
        name: { label: 'キャンペーン名' },
        description: { label: '説明' },
        type: {
          label: 'キャンペーン種別',
          options: {
            Email: 'メール', 'Social Media': 'ソーシャルメディア', Webinar: 'ウェビナー',
            Event: 'イベント', 'Content Marketing': 'コンテンツマーケティング', 'Paid Search': 'リスティング広告',
            'Display Advertising': 'ディスプレイ広告', 'Direct Mail': 'ダイレクトメール',
            'Referral Program': '紹介プログラム', Other: 'その他',
          },
        },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Planned: '計画済み', Active: '実施中 🟢', Completed: '完了 ✅', Cancelled: 'キャンセル 🚫' },
        },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        budgeted_cost: { label: '予算', help: 'このキャンペーンの計画予算' },
        actual_cost: { label: '実績費用', help: '現在までの実際の支出額' },
        expected_revenue: { label: '予想収益' },
        actual_revenue: { label: '実績収益' },
        expected_response_rate: { label: '予想レスポンス率', help: '見込みレスポンス率 (%)' },
        target_audience: { label: 'ターゲットオーディエンス' },
        number_sent: { label: '送信数' },
        number_of_leads: { label: 'リード数' },
        number_of_opportunities: { label: '商談数' },
        number_of_won_deals: { label: '受注数' },
        roi: { label: 'ROI', help: '投資収益率 (%)' },
        parent_campaign: { label: '親キャンペーン' },
        owner_id: { label: '所有者' },
      },
    },

    campaign_member: {
      label: 'キャンペーンメンバー',
      pluralLabel: 'キャンペーンメンバー',
      fields: {
        campaign_id: { label: 'キャンペーン' },
        lead_id: { label: 'リード' },
        contact_id: { label: '取引先責任者' },
        status: {
          label: 'ステータス',
          options: {
            Planned: '計画済み', Sent: '送信済み', Responded: '応答済み',
            Attended: '出席', 'No Show': '欠席', Unsubscribed: '配信停止',
          },
        },
        responded_date: { label: '応答日' },
        first_responded_date: { label: '初回応答日' },
        source: { label: 'ソース' },
        engagement_score: { label: 'エンゲージメントスコア', help: 'インタラクションに基づく算出スコア' },
      },
    },

    email_template: {
      label: 'メールテンプレート',
      pluralLabel: 'メールテンプレート',
      fields: {
        name: { label: 'テンプレート名' },
        subject: { label: '件名' },
        body: { label: 'メール本文' },
        type: {
          label: 'テンプレート種別',
          options: { Marketing: 'マーケティング', Sales: '営業', Service: 'サービス', Transactional: 'トランザクション' },
        },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Active: '有効', Archived: 'アーカイブ済み' },
        },
        category: { label: 'カテゴリ' },
        folder: { label: 'フォルダ' },
        is_responsive: { label: 'レスポンシブデザイン' },
        open_rate: { label: '開封率', help: '平均開封率 (%)' },
        click_rate: { label: 'クリック率', help: '平均クリック率 (%)' },
        created_by: { label: '作成者' },
      },
    },

    landing_page: {
      label: 'ランディングページ',
      pluralLabel: 'ランディングページ',
      fields: {
        name: { label: 'ページ名' },
        url_slug: { label: 'URLスラッグ' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Published: '公開中 🟢', Archived: 'アーカイブ済み' },
        },
        template: { label: 'テンプレート' },
        campaign_id: { label: 'キャンペーン' },
        page_views: { label: 'ページビュー' },
        unique_visitors: { label: 'ユニークビジター' },
        conversion_rate: { label: 'コンバージョン率', help: '訪問者からリードへの転換率 (%)' },
        form_id: { label: 'フォーム' },
        meta_title: { label: 'Metaタイトル' },
        meta_description: { label: 'Metaディスクリプション' },
        published_date: { label: '公開日' },
        owner_id: { label: '所有者' },
      },
    },

    form: {
      label: 'フォーム',
      pluralLabel: 'フォーム',
      fields: {
        name: { label: 'フォーム名' },
        description: { label: '説明' },
        type: {
          label: 'フォーム種別',
          options: {
            'Contact Us': 'お問い合わせ', 'Newsletter Signup': 'ニュースレター登録',
            'Demo Request': 'デモリクエスト', 'Event Registration': 'イベント登録',
            Survey: 'アンケート', Download: 'ダウンロード', Custom: 'カスタム',
          },
        },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Active: '有効', Archived: 'アーカイブ済み' },
        },
        submit_button_text: { label: '送信ボタンテキスト' },
        success_message: { label: '完了メッセージ' },
        redirect_url: { label: 'リダイレクトURL' },
        submissions_count: { label: '送信件数' },
        conversion_rate: { label: 'コンバージョン率', help: 'フォーム送信のコンバージョン率 (%)' },
        campaign_id: { label: 'キャンペーン' },
        landing_page_id: { label: 'ランディングページ' },
        owner_id: { label: '所有者' },
      },
    },

    marketing_list: {
      label: 'マーケティングリスト',
      pluralLabel: 'マーケティングリスト',
      fields: {
        name: { label: 'リスト名' },
        description: { label: '説明' },
        type: {
          label: 'リスト種別',
          options: { Static: '固定', Dynamic: '動的' },
        },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Active: '有効', Archived: 'アーカイブ済み' },
        },
        member_count: { label: 'メンバー数' },
        source: { label: 'ソース' },
        last_refreshed: { label: '最終更新日時' },
        owner_id: { label: '所有者' },
      },
    },

    unsubscribe: {
      label: '配信停止',
      pluralLabel: '配信停止',
      fields: {
        email: { label: 'メールアドレス' },
        contact_id: { label: '取引先責任者' },
        lead_id: { label: 'リード' },
        reason: {
          label: '理由',
          options: {
            'Not Relevant': '関連性がない', 'Too Frequent': '配信頻度が多い',
            'Never Subscribed': '登録した覚えがない', Spam: 'スパム', Other: 'その他',
          },
        },
        channel: {
          label: 'チャネル',
          options: { Email: 'メール', SMS: 'SMS', 'Push Notification': 'プッシュ通知', All: '全チャネル' },
        },
        unsubscribe_date: { label: '配信停止日' },
        campaign_id: { label: 'キャンペーン' },
      },
    },

    automation_workflow: {
      label: '自動化ワークフロー',
      pluralLabel: '自動化ワークフロー',
      fields: {
        name: { label: 'ワークフロー名' },
        description: { label: '説明' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Active: '実行中 🟢', Paused: '一時停止 ⏸️', Completed: '完了 ✅', Error: 'エラー 🔴' },
        },
        trigger_type: {
          label: 'トリガー種別',
          options: { 'Event-Based': 'イベントベース', 'Schedule-Based': 'スケジュールベース', Manual: '手動' },
        },
        trigger_object: { label: 'トリガーオブジェクト' },
        trigger_event: { label: 'トリガーイベント' },
        enrollment_count: { label: '登録数' },
        completion_count: { label: '完了数' },
        conversion_rate: { label: 'コンバージョン率', help: '登録から完了への転換率 (%)' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        owner_id: { label: '所有者' },
      },
    },

    email_send: {
      label: 'メール配信',
      pluralLabel: 'メール配信',
      fields: {
        name: { label: '配信名' },
        email_template_id: { label: 'メールテンプレート' },
        campaign_id: { label: 'キャンペーン' },
        marketing_list_id: { label: 'マーケティングリスト' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', Scheduled: '予約済み 📅', Sending: '配信中 🚀',
            Completed: '完了 ✅', Failed: '失敗 🔴', Cancelled: 'キャンセル',
          },
        },
        scheduled_date: { label: '配信予定日' },
        sent_date: { label: '配信日' },
        total_recipients: { label: '総宛先数' },
        delivered: { label: '到達数' },
        bounced: { label: 'バウンス数' },
        opened: { label: '開封数' },
        clicked: { label: 'クリック数' },
        unsubscribed: { label: '配信停止数' },
        open_rate: { label: '開封率', help: '到達メールに対する開封率' },
        click_rate: { label: 'クリック率', help: '開封メールに対するクリック率' },
        bounce_rate: { label: 'バウンス率', help: 'メールのバウンス率' },
        owner_id: { label: '所有者' },
      },
    },

    lead_nurture_program: {
      label: 'リードナーチャリングプログラム',
      pluralLabel: 'リードナーチャリングプログラム',
      fields: {
        name: { label: 'プログラム名' },
        description: { label: '説明' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Active: '実行中 🟢', Paused: '一時停止 ⏸️', Completed: '完了 ✅' },
        },
        target_audience: { label: 'ターゲットオーディエンス' },
        enrollment_criteria: { label: '登録条件', help: '自動登録の条件' },
        graduation_criteria: { label: '卒業条件', help: 'リードがプログラムを卒業する条件' },
        enrolled_count: { label: '登録数' },
        graduated_count: { label: '卒業数' },
        conversion_rate: { label: 'コンバージョン率', help: '登録から卒業への転換率 (%)' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        owner_id: { label: '所有者' },
      },
    },

    touchpoint: {
      label: 'タッチポイント',
      pluralLabel: 'タッチポイント',
      fields: {
        contact_id: { label: '取引先責任者' },
        lead_id: { label: 'リード' },
        campaign_id: { label: 'キャンペーン' },
        channel: {
          label: 'チャネル',
          options: {
            Email: 'メール', Web: 'Web', Social: 'ソーシャル', Event: 'イベント',
            Phone: '電話', Chat: 'チャット', 'Direct Mail': 'ダイレクトメール',
          },
        },
        type: {
          label: 'タッチポイント種別',
          options: { 'First Touch': 'ファーストタッチ', 'Last Touch': 'ラストタッチ', Influencer: 'インフルエンサー', Converter: 'コンバーター' },
        },
        timestamp: { label: 'タイムスタンプ' },
        source: { label: 'ソース' },
        medium: { label: 'メディア' },
        content: { label: 'コンテンツ' },
        revenue_attribution: { label: '収益アトリビューション', help: 'このタッチポイントに帰属する収益' },
        attribution_weight: { label: 'アトリビューション加重', help: 'アトリビューションモデルにおける加重 (0–1)' },
      },
    },

    journey: {
      label: 'ジャーニー',
      pluralLabel: 'ジャーニー',
      fields: {
        name: { label: 'ジャーニー名' },
        description: { label: '説明' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Active: '実行中 🟢', Paused: '一時停止 ⏸️', Completed: '完了 ✅', Archived: 'アーカイブ済み' },
        },
        type: {
          label: 'ジャーニー種別',
          options: {
            Onboarding: 'オンボーディング', Nurture: 'ナーチャリング', 'Re-engagement': 'リエンゲージメント',
            Upsell: 'アップセル', 'Cross-sell': 'クロスセル', Retention: 'リテンション', Custom: 'カスタム',
          },
        },
        entry_criteria: { label: 'エントリー条件', help: 'コンタクトがジャーニーに参加する条件' },
        exit_criteria: { label: '離脱条件', help: 'コンタクトがジャーニーから離脱する条件' },
        active_contacts: { label: 'アクティブコンタクト' },
        completed_contacts: { label: '完了コンタクト' },
        conversion_rate: { label: 'コンバージョン率', help: 'エントリーから完了への転換率 (%)' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        owner_id: { label: '所有者' },
      },
    },

    journey_step: {
      label: 'ジャーニーステップ',
      pluralLabel: 'ジャーニーステップ',
      fields: {
        journey_id: { label: 'ジャーニー' },
        name: { label: 'ステップ名' },
        type: {
          label: 'ステップ種別',
          options: { Email: 'メール', Wait: '待機 ⏳', Decision: '条件分岐 🔀', Action: 'アクション ⚡', Split: '分割', Goal: 'ゴール 🎯' },
        },
        order_index: { label: '順序' },
        wait_duration: { label: '待機時間' },
        wait_unit: {
          label: '待機単位',
          options: { Minutes: '分', Hours: '時間', Days: '日', Weeks: '週' },
        },
        email_template_id: { label: 'メールテンプレート' },
        condition: { label: '条件' },
        action_type: { label: 'アクション種別' },
        reached_count: { label: '到達数' },
        completed_count: { label: '完了数' },
      },
    },

    ab_test: {
      label: 'A/Bテスト',
      pluralLabel: 'A/Bテスト',
      fields: {
        name: { label: 'テスト名' },
        description: { label: '説明' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Running: '実行中 🔬', Completed: '完了 ✅', Cancelled: 'キャンセル' },
        },
        test_type: {
          label: 'テスト種別',
          options: {
            'Subject Line': '件名', 'Email Content': 'メール内容',
            'Send Time': '送信時刻', 'Landing Page': 'ランディングページ', CTA: 'CTA',
          },
        },
        campaign_id: { label: 'キャンペーン' },
        winning_criteria: {
          label: '判定基準',
          options: { 'Open Rate': '開封率', 'Click Rate': 'クリック率', 'Conversion Rate': 'コンバージョン率', Revenue: '収益' },
        },
        sample_size_percentage: { label: 'サンプルサイズ', help: 'テストに使用するオーディエンスの割合' },
        confidence_level: { label: '信頼水準', help: '統計的有意性の閾値 (%)' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        winner_variant_id: { label: '勝利バリアント' },
        statistical_significance: { label: '統計的有意性', help: '結果が統計的に有意かどうか' },
        owner_id: { label: '所有者' },
      },
    },

    ab_test_variant: {
      label: 'A/Bテストバリアント',
      pluralLabel: 'A/Bテストバリアント',
      fields: {
        ab_test_id: { label: 'A/Bテスト' },
        name: { label: 'バリアント名' },
        description: { label: '説明' },
        variant_label: {
          label: 'バリアントラベル',
          options: { A: 'A', B: 'B', C: 'C', D: 'D' },
        },
        traffic_percentage: { label: 'トラフィック配分', help: 'このバリアントに配分するトラフィックの割合' },
        email_template_id: { label: 'メールテンプレート' },
        subject_line: { label: '件名' },
        send_time: { label: '送信時刻' },
        recipients: { label: '受信者数' },
        opens: { label: '開封数' },
        clicks: { label: 'クリック数' },
        conversions: { label: 'コンバージョン数' },
        open_rate: { label: '開封率' },
        click_rate: { label: 'クリック率' },
        conversion_rate: { label: 'コンバージョン率' },
        is_winner: { label: '勝利フラグ' },
      },
    },
  },

  apps: {
    marketing: {
      label: 'マーケティングクラウド',
      description: 'マーケティングオートメーション、キャンペーン管理、顧客エンゲージメント',
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
    'nav.campaigns': 'キャンペーン',
    'nav.marketing_automation': 'マーケティングオートメーション',
    'nav.journey_and_testing': 'ジャーニーとテスト',
    'nav.views_dashboards': 'ビューとダッシュボード',
    'nav.campaign_timeline': 'キャンペーンタイムライン',
    'nav.marketing_dashboard': 'マーケティングダッシュボード',
    'success.saved': 'レコードが正常に保存されました',
    'success.deleted': 'レコードが正常に削除されました',
    'success.campaign_launched': 'キャンペーンが正常に開始されました',
    'success.email_sent': 'メールが正常に送信されました',
    'success.email_scheduled': 'メールの配信予約が完了しました',
    'success.workflow_activated': 'ワークフローが正常に有効化されました',
    'success.journey_published': 'ジャーニーが正常に公開されました',
    'success.test_started': 'A/Bテストが正常に開始されました',
    'confirm.delete': 'このレコードを削除してもよろしいですか？',
    'confirm.launch_campaign': 'このキャンペーンを開始してもよろしいですか？',
    'confirm.send_email': 'このメールを今すぐ送信してもよろしいですか？',
    'confirm.stop_workflow': 'このワークフローを停止してもよろしいですか？',
    'error.required': 'この項目は必須です',
    'error.load_failed': 'データの読み込みに失敗しました',
    'error.save_failed': 'レコードの保存に失敗しました',
    'error.send_failed': 'メールの送信に失敗しました',
    'error.no_recipients': 'この配信に対する宛先が見つかりません',
  },

  validationMessages: {
    campaign_dates_invalid: '終了日は開始日より後に設定してください',
    budget_exceeded: '実績費用が予算を超過しています',
    template_required_for_email: 'メールキャンペーンにはメールテンプレートが必要です',
    marketing_list_required: '配信前にマーケティングリストの選択が必要です',
    sample_size_range: 'サンプルサイズは1%から50%の間で設定してください',
    confidence_level_range: '信頼水準は80%から99%の間で設定してください',
    journey_requires_steps: 'ジャーニーの公開には少なくとも1つのステップが必要です',
    workflow_requires_trigger: 'ワークフローの有効化にはトリガーの設定が必要です',
    variant_traffic_total: '全バリアントのトラフィック配分の合計は100%にしてください',
    unsubscribe_cannot_resubscribe: 'この連絡先は配信停止済みのため、マーケティングリストに再追加できません',
  },
};
