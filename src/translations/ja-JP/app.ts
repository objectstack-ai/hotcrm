// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — every translation namespace EXCEPT `objects`:
 * `apps`, `messages`, `dashboards`, `datasets`, `pages`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/ja-JP.ts`.
 *
 * A namespace `TranslationData` gains later lands here too, and the room is
 * measured: this file is the smaller half of the bundle, and the schema bounds
 * how many namespaces can ever arrive.
 */
export const appSurface: Omit<TranslationData, 'objects'> = {
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
        nav_quote: { label: '見積' },
        nav_contract: { label: '契約' },
        nav_product: { label: '製品' },
        nav_sales_dashboard: { label: '営業実績' },

        group_work: { label: 'マイワーク' },
        nav_my_tasks: { label: '私のタスク' },
        nav_my_deals: { label: '私の商談' },
        nav_my_leads: { label: '私のリード' },
        nav_my_cases: { label: '私のケース' },
        nav_my_calendar: { label: 'マイカレンダー' },
        nav_approval_requests: { label: '受信トレイ' },

        group_activity: { label: '活動' },
        nav_event: { label: 'イベント' },
        nav_activity_dashboard: { label: '営業活動' },

        group_marketing: { label: 'マーケティング' },
        nav_campaign: { label: 'キャンペーン' },

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
        pipeline_by_stage: { title: 'ステージ別パイプライン', description: '各営業ステージのオープン商談金額' },
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
  datasets: {
    account_metrics: {
      label: '取引先指標',
      description: '業種・種別ごとに取引先数を集計するセマンティックレイヤー',
      dimensions: {
        industry: {
          label: '業種',
        },
        type: {
          label: '種別',
        },
        created_at: {
          label: '作成日',
        },
      },
      measures: {
        account_count: {
          label: '取引先数',
        },
        annual_revenue_sum: {
          label: '年間売上',
        },
      },
    },
    case_metrics: {
      label: 'ケース指標',
      description: 'ケース数・解決時間・SLA を集計するセマンティックレイヤー',
      dimensions: {
        created_date: {
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
    contact_metrics: {
      label: '取引先責任者指標',
      description: '取引先責任者数を集計するセマンティックレイヤー',
      measures: {
        contact_count: {
          label: '取引先責任者数',
        },
      },
    },
    event_metrics: {
      label: '活動指標',
      description: '会議・通話・接触の新しさを集計するセマンティックレイヤー',
      dimensions: {
        owner: {
          label: '所有者',
        },
        related_to_type: {
          label: '関連先',
        },
        start_datetime: {
          label: '活動週',
        },
        status: {
          label: 'ステータス',
        },
        type: {
          label: '活動種別',
        },
      },
      measures: {
        avg_minutes: {
          label: '平均所要時間',
        },
        event_count: {
          label: '活動件数',
        },
        total_minutes: {
          label: '合計分数',
        },
      },
    },
    forecast_metrics: {
      label: 'フォーキャスト指標',
      description: '担当者ごとの目標・達成率・パイプラインカバレッジを集計するセマンティックレイヤー',
      dimensions: {
        owner: {
          label: '所有者',
        },
        period: {
          label: '期間種別',
        },
        period_label: {
          label: '期間',
        },
        period_start: {
          label: '期間開始',
        },
      },
      measures: {
        attainment: {
          label: '達成率',
        },
        closed_sum: {
          label: 'クローズ済み',
        },
        commit_sum: {
          label: 'コミット',
        },
        pipeline_sum: {
          label: 'パイプライン',
        },
        quota_sum: {
          label: '目標',
        },
      },
    },
    lead_metrics: {
      label: 'リード指標',
      description: 'リード数を集計するセマンティックレイヤー',
      dimensions: {
        created_at: {
          label: '作成日',
        },
        last_contacted_date: {
          label: '最終接触日',
        },
        lead_source: {
          label: 'ソース',
        },
        status: {
          label: 'ステータス',
        },
      },
      measures: {
        lead_count: {
          label: 'リード数',
        },
      },
    },
    opportunity_metrics: {
      label: '商談指標',
      description: '営業パイプラインの件数と金額を集計するセマンティックレイヤー',
      dimensions: {
        account_industry: {
          label: '取引先の業種',
        },
        close_date: {
          label: '完了予定日',
        },
        close_quarter: {
          label: '完了四半期',
        },
        forecast_category: {
          label: 'フォーキャスト区分',
        },
        lead_source: {
          label: 'リードソース',
        },
        loss_reason: {
          label: '失注理由',
        },
        owner: {
          label: '所有者',
        },
        stage: {
          label: 'ステージ',
        },
        type: {
          label: '商談種別',
        },
        win_reason: {
          label: '受注理由',
        },
      },
      measures: {
        avg_amount: {
          label: '平均商談金額',
        },
        avg_probability: {
          label: '平均確度',
        },
        decided_count: {
          label: '決着した商談',
        },
        lost_amount: {
          label: '失注金額',
        },
        lost_count: {
          label: '失注件数',
        },
        opp_count: {
          label: '商談数',
        },
        total_amount: {
          label: '合計金額',
        },
        win_rate: {
          label: '受注率',
        },
        won_amount: {
          label: '受注金額',
        },
        won_count: {
          label: '受注件数',
        },
      },
    },
    product_metrics: {
      label: '製品指標',
      description: '製品カタログの件数と定価を集計するセマンティックレイヤー',
      dimensions: {
        category: {
          label: 'カテゴリ',
        },
      },
      measures: {
        list_price_sum: {
          label: '定価合計',
        },
        product_count: {
          label: '製品数',
        },
      },
    },
    task_metrics: {
      label: 'タスク指標',
      description: 'タスクの作業量と完了状況を集計するセマンティックレイヤー',
      dimensions: {
        due_date: {
          label: '期限',
        },
        is_completed: {
          label: '完了済み',
        },
        is_overdue: {
          label: '期限超過',
        },
        priority: {
          label: '優先度',
        },
        priority_rank: {
          label: '緊急度',
        },
        status: {
          label: 'ステータス',
        },
        type: {
          label: '種別',
        },
      },
      measures: {
        avg_progress: {
          label: '平均進捗',
        },
        task_count: {
          label: 'タスク数',
        },
      },
    },
  },
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
        lead_duplicate_alert: { label: '重複マークの警告' },
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
        kpi_revenue_won: {
          label: '受注売上',
        },
        kpi_deals_won: {
          label: '受注件数',
        },
        kpi_pipeline_value: {
          label: 'パイプライン金額',
        },
        kpi_open_leads: {
          label: 'オープンリード',
        },
        home_upcoming_events: {
          label: '📅 開催予定 · 直近順',
        },
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
