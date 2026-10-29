// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { QUOTE_DISCOUNT_CEILING } from '../../objects/_thresholds';

/**
 * 日本語 (ja-JP) — every translation namespace EXCEPT `objects`:
 * `apps`, `messages`, `dashboards`, `datasets`, `pages`, `flows`, `picklists`,
 * `reports`, `positions`, `permissions`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/ja-JP.ts`.
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
        nav_sales_home: { label: '営業ホーム' },

        group_sales: { label: '営業' },
        nav_lead: { label: 'リード' },
        nav_account: { label: '取引先' },
        nav_contact: { label: '取引先責任者' },
        nav_opportunity: { label: '商談' },
        nav_quote: { label: '見積' },
        nav_contract: { label: '契約' },
        nav_product: { label: '製品' },
        nav_price_book: { label: '価格表' },
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
        nav_knowledge_published: { label: 'ナレッジベース' },
        nav_service_dashboard: { label: 'サービス概要' },

        group_insights: { label: 'インサイト' },
        nav_crm_dashboard: { label: 'CRM 概要' },
        nav_forecast: { label: 'フォーキャスト' },

        group_reports: { label: 'レポート' },
        nav_report_opportunities_by_stage: { label: 'ステージ別商談' },
        nav_report_won_by_owner: { label: '担当者別成立商談' },
        nav_report_pipeline_coverage: { label: 'パイプラインカバレッジ' },
        nav_report_funnel_by_owner: { label: '担当者別商談ファネル' },
        nav_report_lead_inflow: { label: 'リード対応' },
        nav_report_accounts_by_industry: { label: '業種・種別別取引先' },
        nav_report_churn_signals: { label: '顧客離反シグナル' },
        nav_report_cases_by_status: { label: 'ステータス・優先度別ケース' },
        nav_report_sla: { label: 'SLA 実績' },
        nav_report_cases_opened_by_day: { label: '日別新規ケース' },

        group_help: { label: 'ヘルプ' },
        nav_help_manual: { label: 'ユーザーマニュアル' },
        nav_help_admin: { label: '管理者マニュアル' },
        nav_help_revenue: { label: '収益マニュアル' },
        nav_help_marketing: { label: 'マーケティングマニュアル' },
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
        total_revenue: { title: '総売上（選択期間）', description: '選択期間の成立済み売上' },
        active_deals: { title: 'オープン商談（選択期間）', description: '選択期間内に完了予定のオープン商談' },
        won_deals: { title: '成立商談数（選択期間）', description: '選択期間に成立した商談の数' },
        avg_deal_size: { title: '平均商談規模（選択期間）', description: '選択期間の成立済み商談の平均金額' },
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
        total_pipeline_value: { title: 'オープンパイプライン（選択期間）', description: '選択期間内に完了予定のオープン商談金額の合計' },
        closed_won_qtd: { title: '今四半期成立額', description: '今四半期に成立した売上' },
        open_opportunities: { title: 'オープン商談（選択期間）', description: '選択期間内に完了予定のオープン商談' },
        avg_deal_size: { title: '平均商談規模（今四半期）', description: '今四半期の成立済み商談の平均金額' },
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
        my_open_cases_by_priority: { title: '優先度別の私のオープンケース', description: 'あなたのオープンケースとそのSLA違反率を優先度別に集計' },
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
      title: '{name}',
      subtitle: '{industry} · {type}',
      components: {
        account_chatter: { label: 'ディスカッション' },
      },
    },
    account_workbench: {
      label: '取引先ワークベンチ',
      description: '営業チーム向けに厳選した取引先リスト。クイックフィルターのみで、ビュー管理は行いません。',
    },
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
    lead_detail_page: {
      label: 'リード詳細',
      description: 'ハイライト・詳細・関連情報を備えたリードの総合詳細ページ。',
      title: '{first_name} {last_name}',
      subtitle: '{company}',
      components: {
        lead_duplicate_alert_confirmed: { label: '重複確定の警告' },
        lead_duplicate_alert_suspected: { label: '重複の疑いの警告' },
        lead_highlights: { label: '重要情報' },
        lead_path: { label: 'リードステータスの進捗' },
        main_tabs: { label: 'リード情報タブ' },
        lead_details: { label: 'リード詳細情報' },
        related_accordion: { label: '関連レコード' },
        related_tasks: { title: '未完了のタスク', label: 'タスク' },
        lead_activity: { label: '活動タイムライン' },
        lead_history: { label: '項目履歴' },
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
        opp_details: { label: '商談詳細情報' },
        // `page:tabs` item labels, keyed by each item's `value` (spec 18.1.0,
        // `pages.PAGE.components.TABS.items.VALUE.label`).
        opp_main_tabs: { items: { details: { label: '詳細' }, related: { label: '関連' }, activity: { label: '活動' } } },
      },
    },
    sales_home_page: {
      label: '営業ホーム',
      description: '主要指標、自分の未完了の仕事、今後の予定をまとめた営業チームのホームページ',
      components: {
        kpi_revenue_won: {
          label: '総売上（全期間）',
        },
        kpi_deals_won: {
          label: '成立商談数（全期間）',
        },
        kpi_pipeline_value: {
          label: 'オープンパイプライン（全期間）',
        },
        kpi_open_leads: {
          label: 'オープンリード',
        },
        home_upcoming_events: {
          label: '📅 開催予定 · 直近順',
        },
        key_metrics: { title: '主要業績評価指標', label: '主要指標' },
        // `page:tabs` item labels, keyed by each item's `value` (#2284, spec 18.1.0,
        // `pages.PAGE.components.TABS.items.VALUE.label`).
        home_tabs: {
          label: 'ホームタブ',
          items: {
            my_leads: { label: '私のリード' },
            my_open_deals: { label: '私のオープン商談' },
            my_open_tasks: { label: '私のオープンタスク' },
          },
        },
        home_my_leads: { label: '私のリード' },
        home_my_deals: { label: '私のオープン商談' },
        home_my_tasks: { label: '私のオープンタスク' },
        upcoming_events: { title: '今後の予定', label: '今後の予定' },
      },
    },
  },
  // Screen-flow copy (#1210, #1975). Keyed `flows.<flow>.label`,
  // `screens.<node>.title` and `screens.<node>.fields.<field>.{label,placeholder}`
  // — the keys `os lint`'s `i18n/missing-flow` names, read by the console's
  // flow runner since @objectstack 17.7.0 (the spec's `flows` liveness row is
  // `live` there). A screen with no authored `title` is headed by its node
  // `label` (the executor's `config.title ?? node.label`, measured on
  // 18.0.0-next.0), so each `screens.<node>.title` translates that node label,
  // never the flow label: the dialog shows the flow label as its eyebrow above
  // the title, and the two differ on `lead_conversion`, `quote_generation` and
  // `campaign_enrollment` (#2096). Since
  // 18.0.0-next.0 three more surfaces are keys the engine reads in the run's
  // locale, and `i18n/missing-flow` names each missing one: a select field's
  // `options.<value>` (worded as the object field's own option in this pack),
  // an authored screen `description`, and a refusing `end` node's
  // `refusals.<node>.message`. A translated description or message is a text
  // slot like the one it translates, so a hole in it is `{{ }}`.
  // The discount ceiling is interpolated from `QUOTE_DISCOUNT_CEILING`, never
  // retyped: the number lives in `_thresholds.ts` alone (#1711).
  flows: {
    // Approval flows (#2060 item 13, C-15): the flow's own `label`, and each
    // `approval` node's step label under `approvals.<node>.label` (spec 18.1.0),
    // the step name the approval request shows the submitter and the approvers.
    account_approval: {
      label: '取引先承認',
      approvals: {
        account_review: { label: '取引先レビュー' },
      },
    },
    lead_conversion_approval: {
      label: 'リードコンバージョン承認',
      approvals: {
        conversion_review: { label: 'コンバージョンレビュー' },
      },
    },
    opportunity_approval: {
      label: '大口商談承認',
      approvals: {
        manager_review: { label: '営業マネージャーのレビュー' },
        director_signoff: { label: '営業ディレクターの最終承認' },
      },
    },
    opportunity_approval_on_create: {
      label: '大口商談承認（作成時）',
      approvals: {
        manager_review: { label: '営業マネージャーのレビュー' },
        director_signoff: { label: '営業ディレクターの最終承認' },
      },
    },
    opportunity_qualification_approval: {
      label: '商談の案件化承認',
      approvals: {
        qualification_review: { label: '案件化レビュー' },
      },
    },
    opportunity_status_change_approval: {
      label: '商談のステータス変更承認',
      approvals: {
        status_review: { label: 'ステータス変更レビュー' },
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
    lead_conversion: {
      label: 'リード変換プロセス',
      screens: {
        screen_1: {
          title: '変換詳細',
          // The duplicate warning's text is a variable the flow assigns; this
          // key can only carry the hole that shows it. The account notice
          // after it is translated here (#2073 item 8): exactly one of the two
          // holes holds a name, and each hole's `default:` is the OTHER
          // branch's words, so the sentence stays name-first. Keep both holes,
          // in this order, with a `default:` each (see `screen_1` in
          // `lead-conversion.flow.ts`).
          description: '{{duplicateWarning}} {{ existingAccountName | default:"このリードの会社名に一致する、あなたが閲覧できる取引先はありません。変換すると、次の名前で新しい取引先が作成されます：" }}{{ newAccountName | default:" は、このリードが加わる既存の取引先です" }}。',
          fields: {
            createOpportunity: { label: '商談を作成しますか？' },
            opportunityName: { label: '商談名' },
            opportunityAmount: { label: '商談金額' },
            closeDate: { label: '完了予定日' },
          },
        },
        // The result screen (#2297). Same two-hole shape as `screen_1`: exactly
        // one hole holds the account's name, and each `default:` is the OTHER
        // state's words. Keep both holes, in this order, with a `default:` each
        // (see `result` in `lead-conversion.flow.ts`).
        result: {
          title: 'リードを変換しました',
          description: '{{ pendingApprovalAccountName | default:"承認待ちの取引先承認はありません：" }}{{ noApprovalAccountName | default:" は、営業マネージャーによる取引先承認を待っています" }}。',
          fields: {
            accountLink: { label: '取引先' },
            contactLink: { label: '取引先責任者' },
            opportunityLink: { label: '商談' },
          },
        },
      },
      refusals: {
        refuse_confirmed_duplicate: {
          message:
            '変換は拒否されました。このリードの重複ステータスは「重複確定」です。レビュー担当者が既存のレコードと照合し、重複であると記録しました。変換すると、同じ購入者に対して取引先・取引先責任者・商談がもう 1 件ずつ作成されます。残すレコードはこのリードの「重複管理」セクションに表示されています。代わりに、このリードを重複として不適格にしてください。変換を再び可能にできるのは、その判定を見直すレビュー担当者だけです。',
        },
        refuse_unapproved: {
          message:
            '変換は拒否されました。このリードはまだ変換の承認を得ていません。取引先・取引先責任者・商談に変換するには、先に承認者の承認が必要です。リードの「コンバージョン承認」項目で、判断がまだ承認待ちか、却下されたかを確認できます。それまでの間もリードへの対応は続けてください。凍結されるものはありません。',
        },
        refuse_no_match_key: {
          message:
            '変換は拒否されました。このリードの会社名には照合キーがないため、変換ではどの取引先に属するかを判断できず、推測もしません。推測すると、取引先責任者と商談が別の顧客の下に登録されるおそれがあります。リードの「会社名」を保存するとキーが再作成されるので、もう一度保存してから変換してください。何も作成されていません。',
        },
        refuse_nonpositive_amount: {
          message:
            '変換は拒否されました。商談金額は 0 より大きくなければなりません。何も作成されていません。取引の金額を入力してもう一度リードを変換するか、「商談を作成しますか？」のチェックを外して商談なしで変換してください。',
        },
      },
    },
    schedule_followup: {
      label: 'フォローアップを設定',
      screens: {
        screen_1: {
          title: 'フォローアップを設定',
          fields: {
            subject: { label: '次のステップは？' },
            dueDate: { label: '期限' },
            activityType: {
              label: '活動種別',
              options: { call: '電話', email: 'メール', meeting: '会議', follow_up: 'フォローアップ', demo: 'デモ', other: 'その他' },
            },
            priority: { label: '優先度', options: { low: '低', normal: '通常', high: '高', urgent: '緊急' } },
            notes: { label: 'メモ' },
          },
        },
      },
    },
    quote_generation: {
      label: '商談から見積を作成',
      refusals: { refuse_held: { message: '先に案件化承認が必要です。「案件化承認を申請」にチェックを入れてください。何も作成されていません。' } },
      screens: {
        screen_1: {
          title: '見積詳細',
          fields: {
            quoteName: { label: '見積名' },
            expirationDays: { label: '有効期間（日）' },
            discount: { label: `割引率 % (≤ ${QUOTE_DISCOUNT_CEILING})`, placeholder: `0-${QUOTE_DISCOUNT_CEILING}` },
          },
        },
      },
    },
  },
  // 共有ピックリスト（`src/<pkg>/picklists/*.picklist.ts`）は一度だけ翻訳する。
  // リストを参照するフィールド（`Field.select({ picklist })`）はすべてこの
  // 選択肢ラベルを継承するため、フィールド単位の `options` は独自のインライン
  // 選択肢を持つフィールドにだけ書く。キーは表示ラベルではなく **保存値**（#494）。
  picklists: {
    salutation: {
      label: '敬称',
      options: { mr: 'Mr.', ms: 'Ms.', mrs: 'Mrs.', dr: '博士', prof: '教授' },
    },
    industry: {
      label: '業種',
      options: {
        technology: 'テクノロジー', software: 'ソフトウェア / SaaS', finance: '金融',
        healthcare: 'ヘルスケア', retail: '小売', manufacturing: '製造',
        education: '教育', real_estate: '不動産', media: 'メディア・エンタメ',
        logistics: '物流', hospitality: 'ホスピタリティ', energy: 'エネルギー・公益',
        government: '政府・行政', nonprofit: '非営利', other: 'その他',
      },
    },
    lead_source: {
      label: 'リードソース',
      options: {
        web: 'ウェブ', referral: '紹介', event: 'イベント・展示会',
        webinar: 'ウェビナー', partner: 'パートナー', advertisement: '広告',
        paid_search: '有料検索', social: 'ソーシャルメディア', content: 'コンテンツ・ブログ',
        cold_call: 'コールドコール', email_campaign: 'メールキャンペーン', other: 'その他',
      },
    },
    payment_terms: {
      label: '支払条件',
      options: {
        net_15: '15 日以内払い', net_30: '30 日以内払い', net_60: '60 日以内払い',
        net_90: '90 日以内払い', due_on_receipt: '請求書受領時払い',
      },
    },
    related_to_type: {
      label: '関連オブジェクト種別',
      options: {
        crm_account: '取引先', crm_contact: '取引先責任者', crm_opportunity: '商談',
        crm_lead: 'リード', crm_case: 'ケース',
      },
    },
  },
  // Report index and report page headings (`reports[].label` / `description`).
  reports: {
    accounts_by_industry_type: {
      label: '業種・種別別取引先',
      description: '取引先を業種と種別でクロス集計するマトリックスレポート',
    },
    customer_churn_signals: {
      label: '顧客離反シグナル',
      description: '能動的な顧客維持のための 4 つの早期警告パネル：CSM が離反リスクありまたは離反中とフラグを付けた取引先、最近活動のない有効な取引先、動きのない高価値取引先、最近失注した商談。',
    },
    lead_inflow_by_month_source: {
      label: '月 × ソース別リード対応',
      description: '月ごとのコンタクト済みリード数を獲得チャネル別に表示',
    },
    opportunities_by_stage: {
      label: 'ステージ別商談',
      description: 'ステージ別に集計した商談のサマリー',
    },
    opportunity_funnel_owner_stage: {
      label: '担当者 → ステージ別商談ファネル',
      description: '営業担当者ごとのステージ別パイプラインファネル',
    },
    pipeline_coverage_by_quarter: {
      label: 'フォーキャスト区分 × 四半期別パイプラインカバレッジ',
      description: '進行中のパイプライン金額をフォーキャスト区分別に、完了予定の四半期ごとに集計',
    },
    won_opportunities_by_owner: {
      label: '担当者別成立商談',
      description: '所有者別にまとめた成立済み商談',
    },
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
  // Setup → Positions (`src/sales/sharing/positions.ts`).
  positions: {
    executive: {
      label: 'エグゼクティブ',
      description: '経営層：パイプライン全体の進行中の大型商談をすべて閲覧できます。商談の所有権は商談チームに残ります。',
    },
    sales_director: {
      label: '営業ディレクター',
      description: '営業組織を率い、最大規模の商談の最終承認を行い、進行中の大型商談をすべて閲覧します。',
    },
    sales_manager: {
      label: '営業マネージャー',
      description: '営業チームを率い、新規取引先・リード変換・大型商談を承認し、有効な取引先をすべて編集します。',
    },
    sales_rep: {
      label: '営業担当者',
      description: 'リードと商談を日々担当し、ラウンドロビン割り当てで新しいリードを受け取ります。',
    },
    service_director: {
      label: 'サービスディレクター',
      description: 'カスタマーサービスを統括し、サービスマネージャーが対応中の未解決の重大ケースをすべて閲覧します。',
    },
    service_manager: {
      label: 'サービスマネージャー',
      description: 'エスカレーション窓口を担当します。エスカレーションされたケースはこの役職に引き渡され、未解決の重大ケースをすべて編集できます。',
    },
    service_agent: {
      label: 'サービス担当者',
      description: '顧客のケースに対応し、ラウンドロビン割り当てで新しいケースを受け取り、トリアージから未割り当てのケースを引き取ります。',
    },
    marketing_director: {
      label: 'マーケティングディレクター',
      description: 'マーケティングを率い、所有者にかかわらず実施中のキャンペーンをすべて編集します。',
    },
    marketing_manager: {
      label: 'マーケティングマネージャー',
      description: 'キャンペーンを管理し、所有者にかかわらず実施中のキャンペーンをすべて編集します。',
    },
    marketing_user: {
      label: 'マーケティングユーザー',
      description: 'キャンペーンとそのメンバーを日々企画・運用します。',
    },
    na_sales_team: {
      label: '北米営業チーム',
      description: '北米テリトリーのチーム：北米テリトリーの取引先をすべて編集します。',
    },
    eu_sales_team: {
      label: '欧州営業チーム',
      description: '欧州テリトリーのチーム：欧州（EMEA）テリトリーの取引先をすべて編集します。',
    },
  },
  // Setup → Permission Sets (`src/sales/profiles/*.profile.ts`).
  permissions: {
    crm_user: {
      label: 'CRM ユーザー',
      description: '全メンバーの既定セット：自分のリード・取引先・商談・活動と読み取り専用のカタログ。削除・エクスポート・すべて表示・システム権限はありません。',
    },
    guest_portal: {
      label: 'ゲスト（公開フォーム）',
      description: '公開の Web-to-リード・Web-to-ケースフォームの匿名訪問者：新しいリードまたはケースを送信でき、閲覧・編集・削除は一切できません。',
    },
    marketing_user: {
      label: 'マーケティングユーザー',
      description: 'マーケティング担当者：キャンペーンとそのメンバーを運用し、ターゲティングのためにすべてのリード・取引先責任者・取引先・商談を閲覧できますが、ケースは見えず、CRM レコードは削除できません。',
    },
    sales_manager: {
      label: '営業マネージャー',
      description: '営業マネージャー：すべての営業担当者のリード・取引先・商談・見積・活動を閲覧、編集、再割り当て、削除できますが、システム管理権限はありません。',
    },
    sales_rep: {
      label: '営業担当者',
      description: '営業担当者：自分のリード・取引先・商談・見積・活動を担当し、カタログを閲覧できますが、顧客レコードは削除できません。',
    },
    service_agent: {
      label: 'サービス担当者',
      description: 'サービス担当者とマネージャー：自分のケースを処理し、その背後の取引先・取引先責任者・リードを閲覧し、ナレッジ記事を作成できますが、商談は見えません。',
    },
    system_admin: {
      label: 'システム管理者',
      description: '単一組織インストールの運用者：すべての業務レコードを完全に管理し、ユーザー・セキュリティモデル・設定を管理します。',
    },
  },
};
