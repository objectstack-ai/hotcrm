// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';
import { CONTRACT_DRAFT_NODE_IDS } from '../../flows/_contract-draft';

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
      label: '営業',
      description: '営業チームのためのリード・取引先・商談・見積',
      // Keyed by navigation-node `id` (a flat keyspace regardless of depth).
      navigation: {
        nav_home: { label: 'ホーム' },
        nav_sales_home: { label: '営業ホーム' },

        group_sales: { label: '営業' },
        group_collection_plan: { label: '回収計画' },
        nav_lead: { label: 'リード' },
        nav_account: { label: '取引先' },
        nav_contact: { label: '取引先責任者' },
        nav_opportunity: { label: '商談' },
        nav_contract: { label: '契約' },
        nav_sales_order: { label: '注文' },
        nav_sales_dashboard: { label: '営業実績' },

        group_work: { label: 'マイワーク' },
        nav_my_tasks: { label: '私のタスク' },
        nav_my_deals: { label: '私の商談' },
        nav_my_leads: { label: '私のリード' },
        nav_my_calendar: { label: 'マイカレンダー' },
        nav_approval_requests: { label: '受信トレイ' },

        group_activity: { label: '活動' },
        nav_event: { label: 'イベント' },
        nav_activity_dashboard: { label: '営業活動' },

        group_insights: { label: 'インサイト' },
        nav_crm_dashboard: { label: 'CRM 概要' },
        nav_forecast: { label: 'フォーキャスト' },

        group_reports: { label: 'レポート' },
        nav_report_opportunities_by_stage: { label: 'ステージ別商談' },
        nav_report_won_by_owner: { label: '担当者別成立商談' },
        nav_report_pipeline_coverage: { label: '四半期別パイプラインカバレッジ' },
        nav_report_funnel_by_owner: { label: '担当者別商談ファネル' },
        nav_report_lead_inflow: { label: '月別リード対応' },
        nav_report_accounts_by_industry: { label: '業種・種別別取引先' },
        nav_report_churn_signals: { label: '顧客離反シグナル' },

        group_help: { label: 'ヘルプ' },
        nav_help_manual: { label: 'ユーザーマニュアル' },
        nav_help_admin: { label: '管理者マニュアル' },
      },
    },
    crm_service: {
      // The ids this package contributes into the Service app (#2417).
      navigation: {
        nav_account: { label: '取引先' },
        nav_contact: { label: '取引先責任者' },
        nav_my_tasks: { label: '私のタスク' },
        nav_my_calendar: { label: 'マイカレンダー' },
        nav_report_churn_signals: { label: '顧客離反シグナル' },
      },
    },
    crm_marketing: {
      // The ids this package contributes into the Marketing app (#2417).
      navigation: {
        nav_lead: { label: 'リード' },
        nav_contact: { label: '取引先責任者' },
        nav_account: { label: '取引先' },
        nav_my_tasks: { label: '私のタスク' },
        nav_report_lead_inflow: { label: '月別リード対応' },
      },
    },
    crm_o2c: {
      // The ids this package contributes into the Order to Cash app (#2465).
      navigation: {
        nav_contract: { label: '契約' },
        nav_sales_order: { label: '注文' },
        nav_account: { label: '取引先' },
        nav_my_tasks: { label: '私のタスク' },
      },
    },
    crm_psa: {
      // The ids this package contributes into the Project Delivery app (#2316).
      navigation: {
        nav_account: { label: '取引先' },
        nav_opportunity: { label: '商談' },
        nav_contract: { label: '契約' },
        nav_my_tasks: { label: '私のタスク' },
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
        lead_source: { title: 'リードソース', description: '獲得チャネル別のパイプライン金額' },
        pipeline_by_stage: { title: 'ステージ別パイプライン', description: '各営業ステージのオープン商談金額' },
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
        pipeline_by_forecast_category: { title: '予測カテゴリ別パイプライン', description: '売上予測カテゴリ別のオープンパイプライン金額' },
        lead_source_breakdown: { title: 'リードソース', description: 'パイプラインの流入元' },
        open_pipeline_by_owner: { title: '担当者別オープンパイプライン', description: '営業担当者ごとの進行中パイプライン金額・商談数・平均勝率' },
        quota_attainment_by_rep: { title: '担当者別ノルマ達成状況', description: '担当者別の今四半期ノルマ・成約収益・達成率。夜間の予測スナップショットが今四半期の行を作成し、マネージャーがノルマを設定すると表示されます' },
        pipeline_stage_by_source: { title: 'ステージ × リードソース', description: 'ステージとソース別の進行中商談金額のクロス集計' },
        win_rate_12m: { title: '勝率（直近12か月）', description: '直近12か月に決着した商談のうち成立した割合' },
        won_deals_12m: { title: '成立商談数（直近12か月）', description: '勝率の分子' },
        lost_deals_12m: { title: '失注商談数（直近12か月）', description: '勝率の分母のもう半分' },
        win_rate_by_owner: { title: '担当者別 受注／失注', description: '直近12か月の担当者ごとの成立数・失注数・勝率' },
        win_rate_by_lead_source: { title: 'リードソース別 受注／失注', description: '実際に成立につながるのはどのソースか — 直近12か月' },
        loss_reason_breakdown: { title: '失注の理由', description: '直近12か月の失注商談を理由別に集計' },
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
          description: '取引先に記録された業種。業種未入力の取引先は別のグループになります。',
        },
        type: {
          label: '種別',
          description: '取引先の種類：見込み客、顧客、パートナー、過去の取引先。',
        },
        created_at: {
          label: '作成日',
          description: '取引先レコードが CRM で作成された月。その会社が顧客になった日ではありません。',
        },
      },
      measures: {
        account_count: {
          label: '取引先数',
          description: '取引先レコードの件数。見込み客・顧客・パートナー・過去の取引先のすべての種類を含みます。顧客のみはタイプで分けてください。',
        },
        annual_revenue_sum: {
          label: '年間売上',
          description: '取引先に入力された年間売上の合計。顧客企業そのものの規模で、当社からの購入額ではありません。',
        },
      },
    },
    contact_metrics: {
      label: '取引先責任者指標',
      description: '取引先責任者数を集計するセマンティックレイヤー',
      measures: {
        contact_count: {
          label: '取引先責任者数',
          description: '取引先責任者レコードの件数（顧客・パートナー企業の担当者）。リードは別に数え、含みません。',
        },
      },
    },
    event_metrics: {
      label: '活動指標',
      description: '会議・通話・接触の新しさを集計するセマンティックレイヤー',
      dimensions: {
        owner: {
          label: '所有者',
          description: '活動の担当者。',
        },
        related_to_type: {
          label: '関連先',
          description: '活動が関連するレコードの種類：取引先、取引先責任者、商談、リード、ケース。',
        },
        start_datetime: {
          label: '活動週',
          description: '活動の開始時刻が属する週。まだ先の予定活動は将来の週に入ります。',
        },
        status: {
          label: 'ステータス',
          description: '活動が予定・実施済み・キャンセル・無断欠席のどれか。実際に接触したのは実施済みだけです。',
        },
        type: {
          label: '活動種別',
          description: '活動の種類：会議、電話、デモ、ウェビナー、訪問、その他。',
        },
      },
      measures: {
        avg_minutes: {
          label: '平均所要時間',
          description: '活動1件あたりの平均所要時間（分）。絞り込まない限りすべてのステータスを含みます。',
        },
        event_count: {
          label: '活動件数',
          description: '活動の件数。予定・実施済み・キャンセル・無断欠席のすべてのステータスを含みます。実際の接触だけなら実施済みで絞り込みます。',
        },
        total_minutes: {
          label: '合計分数',
          description: '対象活動の所要時間（分）の合計。絞り込まない限りすべてのステータスを含みます。予定された長さで、記録された作業時間ではありません。',
        },
      },
    },
    forecast_metrics: {
      label: 'フォーキャスト指標',
      description: '担当者ごとの目標・達成率・パイプラインカバレッジを集計するセマンティックレイヤー',
      dimensions: {
        owner: {
          label: '所有者',
          description: '売上予測の行が属する営業担当。担当者ごとに期間ごとの行が1つあります。',
        },
        period: {
          label: '期間種別',
          description: '売上予測の行が月次か四半期か。どちらか一方に絞ってください。月次と四半期を足すと同じ商談を二重に数えます。',
        },
        period_label: {
          label: '期間',
          description: '売上予測の行の期間名（Q3 2026、Aug 2026 など）。',
        },
        period_start: {
          label: '期間開始',
          description: '売上予測期間の初日（月初または四半期初日）。',
        },
      },
      measures: {
        attainment: {
          label: '達成率',
          description: 'Closed を Quota で割ったもの。両方を合計してから割るため、大きなクォータほど重みが大きくなります。クォータがないと 0 ではなく空になります。',
        },
        closed_sum: {
          label: 'クローズ済み',
          description: '売上予測行に記録された成立額の合計。担当者がその期間にすでに受注した額で、未完了のパイプラインや不成立の商談は含みません。',
        },
        commit_sum: {
          label: 'コミット',
          description: '売上予測行に記録されたコミット額の合計。売上予測カテゴリがコミットの未完了商談で、ベストケースやパイプラインの商談は含みません。',
        },
        pipeline_sum: {
          label: 'パイプライン',
          description: '売上予測行に記録されたパイプラインの合計。その期間に完了予定で、未完了ステージにある商談の金額です。成立・不成立の商談は含みません。',
        },
        quota_sum: {
          label: '目標',
          description: '対象の売上予測行に設定されたクォータの合計（販売目標）。未設定の行は加算されません。期間タイプを1つに固定しないと月次と四半期が合算されます。',
        },
      },
    },
    lead_metrics: {
      label: 'リード指標',
      description: 'リード数を集計するセマンティックレイヤー',
      dimensions: {
        created_at: {
          label: '作成日',
          description: 'リードレコードが CRM で作成された日。',
        },
        last_contacted_date: {
          label: '最終接触日',
          description: 'リードに最後にコンタクトした月。一度もコンタクトしていないリードは別のグループになります。',
        },
        lead_source: {
          label: 'ソース',
          description: 'リードに記録された発生元。発生元未入力のリードは別のグループになります。',
        },
        status: {
          label: 'ステータス',
          description: 'リードの状況：新規、コンタクト済み、適格、不適格、変換済み。',
        },
      },
      measures: {
        lead_count: {
          label: 'リード数',
          description: 'リードレコードの件数。変換済み・不適格を含むすべてのステータスを数えます。未対応のリードのみはステータスで分けてください。',
        },
      },
    },
    opportunity_metrics: {
      label: '商談指標',
      description: '営業パイプラインの件数と金額を集計するセマンティックレイヤー',
      dimensions: {
        account_industry: {
          label: '取引先の業種',
          description: '商談が属する取引先の業種。取引先から読み取ります。業種未入力の取引先の商談は別のグループになります。',
        },
        close_date: {
          label: '完了予定日',
          description: '完了予定日を暦月で区切ったもの。未完了の商談では完了見込みの日、成立・不成立の商談ではクローズした日です。商談の作成日ではありません。',
        },
        close_quarter: {
          label: '完了四半期',
          description: '同じ完了予定日を暦四半期で区切ったもの。四半期ごとの表示用で、会計年度の暦ではありません。',
        },
        forecast_category: {
          label: 'フォーキャスト区分',
          description: '商談が計上される売上予測カテゴリ：パイプライン、ベストケース、コミット、除外、完了。',
        },
        lead_source: {
          label: 'リードソース',
          description: '商談に記録された発生元。発生元が未入力の商談は別のグループになります。',
        },
        loss_reason: {
          label: '失注理由',
          description: '不成立となった商談の失注理由。不成立としてクローズするときに記録されます。未完了・成立の商談にはありません。',
        },
        owner: {
          label: '所有者',
          description: '商談の所有者（営業担当）。結果には担当者名が表示され、商談は現在の所有者の下に一度だけ数えられます。',
        },
        stage: {
          label: 'ステージ',
          description: '商談が営業プロセスのどこにあるか。見込み調査から成立・不成立まで。最後の2つ以外のステージはすべて未完了のパイプラインです。',
        },
        type: {
          label: '商談種別',
          description: '商談が新規ビジネスか、既存顧客のアップグレード・更新・拡大か。',
        },
        win_reason: {
          label: '受注理由',
          description: '成立した商談の受注理由。成立としてクローズするときに記録されます。未完了・不成立の商談にはありません。',
        },
      },
      measures: {
        avg_amount: {
          label: '平均商談金額',
          description: '商談1件あたりの平均金額。未完了・成立・不成立のすべてのステージを含みます。金額未入力の商談は平均から除かれます。',
        },
        avg_probability: {
          label: '平均確度',
          description: '対象商談の確度 (%) の平均。確度はステージに従うため、商談の進み具合を示すもので、加重パイプライン金額ではありません。',
        },
        decided_count: {
          label: '決着した商談',
          description: '結果が出た商談（成立または不成立）の件数。未完了の商談は数えません。Win Rate の分母です。',
        },
        lost_amount: {
          label: '失注金額',
          description: '不成立ステージにある商談の金額の合計。未完了・成立の商談は含みません。',
        },
        lost_count: {
          label: '失注件数',
          description: '不成立ステージにある商談の件数。未完了・成立の商談は数えません。',
        },
        opp_count: {
          label: '商談数',
          description: '商談の件数。未完了・成立・不成立のすべてのステージを含みます。成立のみは Won Deals です。',
        },
        total_amount: {
          label: '合計金額',
          description: 'すべてのステージの商談の金額の合計。未完了・成立・不成立を含むため、ステージで絞り込むまではパイプラインでも受注額でもありません。',
        },
        win_rate: {
          label: '受注率',
          description: 'Won Deals を Settled Deals で割ったもの。金額ではなく件数で数えます。未完了の商談は除くため、パイプラインが多くても下がりません。',
        },
        won_amount: {
          label: '受注金額',
          description: '成立ステージにある商談の金額の合計（受注額）。未完了・不成立の商談は含まず、取引先の年間売上やプロジェクトの予定売上でもありません。',
        },
        won_count: {
          label: '受注件数',
          description: '成立ステージにある商談の件数。未完了・不成立の商談は数えません。',
        },
      },
    },
    task_metrics: {
      label: 'タスク指標',
      description: 'タスクの作業量と完了状況を集計するセマンティックレイヤー',
      dimensions: {
        due_date: {
          label: '期限',
          description: 'ToDo の期限日。期限のない ToDo は別のグループになります。',
        },
        is_completed: {
          label: '完了済み',
          description: 'ToDo が完了ステータスかどうか。それ以外のステータスはすべて未完了です。',
        },
        is_overdue: {
          label: '期限超過',
          description: '最後に保存した時点で、期限を過ぎていて未完了だったかどうか。',
        },
        priority: {
          label: '優先度',
          description: 'ToDo に設定された優先度：低、通常、高、緊急。',
        },
        priority_rank: {
          label: '緊急度',
          description: '並べ替え用の優先度の数値。低が 1、緊急が 4、優先度なしは 0 です。',
        },
        status: {
          label: 'ステータス',
          description: 'ToDo の状況：未着手、進行中、待機中、完了、保留。',
        },
        type: {
          label: '種別',
          description: 'ToDo の種類：電話、メール、会議、フォローアップ、デモ、その他。',
        },
      },
      measures: {
        avg_progress: {
          label: '平均進捗',
          description: '対象 ToDo の進捗（%）の平均。完了した ToDo も含みます。進捗を設定していない ToDo は 0% として数えます。',
        },
        task_count: {
          label: 'タスク数',
          description: 'ToDo の件数。完了・保留を含むすべてのステータスを数えます。未完了の作業のみは完了済みで分けてください。',
        },
      },
    },
  },
  pages: {
    // The contract's two record pages (#2317): its working page and its print page.
    contract_detail_page: {
      label: '契約詳細',
      description: '契約のレコードページ：システムが生成するレイアウトで、スロットは上書きしません。',
    },
    contract_print_page: {
      label: '契約書類',
      description: '印刷用の契約書：当事者、期間、金額、請求、条件、署名欄。',
    },
    account_workbench: {
      label: '取引先ワークベンチ',
      description: '営業チーム向けに厳選した取引先リスト。クイックフィルターのみで、ビュー管理は行いません。',
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
  flows: {
    // Draft Contract on an order (#2558). The drafted contract's provenance
    // sentence is TEXT in the organization's language (#2535), one per
    // variant of the draft (`../../flows/_contract-draft.ts`).
    sales_order_draft_contract: {
      label: '注文から契約を作成',
      refusals: {
        refuse_missing: { message: 'この注文は存在しないか、開く権限がありません。契約は作成されませんでした。' },
        refuse_cancelled: { message: 'この注文はキャンセルされています。契約は作成されませんでした。' },
        refuse_has_contract: { message: 'この注文にはすでに契約が紐づいています。契約は作成されませんでした。' },
        refuse_no_contact: { message: '契約には主担当者が必要です。先に注文に担当者を入力してください。契約は作成されませんでした。' },
      },
      screens: {
        result: {
          title: '契約を作成しました',
          description: '注文 {{ orderRecord.order_number }} から契約の下書きを作成し、この注文に紐づけました。開いて期間・日付・種別を入力してください。',
          fields: { contractLink: { label: '契約' } },
        },
      },
    },
    sales_order_draft_contract_write: {
      label: '注文から契約を作成（書き込み）',
      records: Object.fromEntries(CONTRACT_DRAFT_NODE_IDS.map((node) => [node, {
        fields: { description: '注文{{ order }}から作成' },
      }])),
    },
    // What the sweeps store in a record (#2522, #2535), at
    // `flows.<flow>.records.<node>.fields.<field>`, holes as the source spells them.
    contract_renewal: {
      records: {
        create_renewal_task: { fields: { subject: '更新期限：契約{{ currentContract.contract_number }}' } },
        create_renewal_opp: { fields: { name: '更新 — {{ currentContract.contract_number }}', next_step: '顧客と更新条件を確認する' } },
      },
    },
    opportunity_stagnation: {
      records: {
        create_followup_task: { fields: { subject: '停滞している商談を進める：{{ currentOpp.name | truncate:200 }}' } },
        create_private_followup_task: { fields: { subject: '停滞している商談を進める（非公開の商談）' } },
      },
    },
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
    lead_conversion: {
      label: 'リード変換プロセス',
      screens: {
        screen_1: {
          title: '変換詳細',
          // Three notices, every word translated here: the duplicate note
          // (#2571; its hole holds a space on a clean lead, so `default:`
          // prints the note only on a suspected one), then the account and
          // the contact (#2073 item 8, #2572). In each two-hole pair exactly
          // one hole holds a name and each `default:` is the OTHER branch's
          // words. Keep every hole, in this order, with a `default:` each
          // (see `screen_1` in `lead-conversion.flow.ts`).
          description: '{{ duplicateWarning | default:"重複の可能性：登録時に、このリードが同じメールアドレスの既存レコードと重複していると判定されました。続ける前に、リードのページでリンク先のレコードと比べてください。" }} {{ existingAccountName | default:"このリードの会社名に一致する、あなたが閲覧できる取引先はありません。変換すると、次の名前で新しい取引先が作成されます：" }}{{ newAccountName | default:" は、このリードが加わる既存の取引先です" }}。{{ existingContactName | default:"このリードのメールアドレスを持つ、あなたが閲覧できる取引先責任者はいません。変換すると、次の名前で新しい取引先責任者が作成されます：" }}{{ newContactName | default:" は、このリードのメールアドレスを持つ既存の取引先責任者です。変換するとこのリードはその取引先責任者に統合され、空欄の「電話」「携帯電話」「役職」だけが補完されます" }}。',
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
        confirm_contact: {
          title: '取引先責任者の確認',
          description: 'このリードは {{ leadPersonName }} ですが、同じメールアドレスの取引先責任者は {{ existingContactName }} です。取引先責任者のメールアドレスは重複できないため、変換するとこのリードはその取引先責任者に統合されます。空欄の「電話」「携帯電話」「役職」だけを補完し、ほかは変更しません。別人の場合はキャンセルし、先にリードのメールアドレスを変更してください。',
          fields: {
            matchedContactLink: { label: '既存の取引先責任者' },
            reuseContactConfirmed: { label: 'このリードをこの取引先責任者に変換する' },
          },
        },
        result: {
          title: 'リードを変換しました',
          description: '{{ pendingApprovalAccountName | default:"リードは次の取引先に変換されました：" }}{{ noApprovalAccountName | default:" は、営業マネージャーによる取引先承認を待っています" }}。',
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
        refuse_contact_not_confirmed: {
          message:
            '変換していません：このリードを同じメールアドレスの既存の取引先責任者に統合することが確認されませんでした。何も作成されていません。別人の場合は、リードのメールアドレスを変更してから再度変換してください。',
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
      // Joined-report block headings (translatable since @objectstack/spec 18.3.0).
      blocks: {
        csm_flagged_accounts: {
          label: 'CSM がフラグを付けた取引先',
          description: 'CSM が手動でリスクありまたは解約進行中とフラグを付けた取引先（種別ごと）— 人の判断に基づき、活動の時計とは無関係です。',
        },
        at_risk_accounts: {
          label: 'リスクのある取引先',
          description: '60 日以上活動のないアクティブな取引先（業種ごと）。',
        },
        silent_high_value: {
          label: '沈黙している高価値取引先',
          description: '90 日以上動きのない戦略顧客・エンタープライズの取引先（種別ごと）。',
        },
        recently_closed_lost: {
          label: '最近失注した商談',
          description: '過去 30 日以内に失注した商談 — 顧客が完全に離れる前に原因を調べてください。',
        },
      },
    },
    lead_inflow_by_month_source: {
      label: '月別リード対応',
      description: '月ごとのコンタクト済みリード数を獲得チャネル別に表示',
    },
    opportunities_by_stage: {
      label: 'ステージ別商談',
      description: 'ステージ別に集計した商談のサマリー',
    },
    opportunity_funnel_owner_stage: {
      label: '担当者別商談ファネル',
      description: '営業担当者ごとのステージ別パイプラインファネル',
    },
    pipeline_coverage_by_quarter: {
      label: '四半期別パイプラインカバレッジ',
      description: '進行中のパイプライン金額をフォーキャスト区分別に、完了予定の四半期ごとに集計',
    },
    won_opportunities_by_owner: {
      label: '担当者別成立商談',
      description: '所有者別にまとめた成立済み商談',
    },
  },
  // Setup → Position Holders (`src/sales/sharing/positions.ts`).
  positions: {
    crm_executive: {
      label: 'エグゼクティブ',
      description: '経営層：営業マネージャーが閲覧できるものをすべて閲覧し（所有権は各チームに残ります）、作成・編集できるのは自分の商談だけです。',
    },
    crm_sales_director: {
      label: '営業ディレクター',
      description: '営業組織を率い、最大規模の商談の最終承認を行い、営業マネージャーが閲覧できるものをすべて閲覧し、編集できるのは自分の商談だけです。',
    },
    crm_sales_manager: {
      label: '営業マネージャー',
      description: '営業チームを率い、新規取引先・リード変換・大型商談を承認し、有効な取引先をすべて編集します。',
    },
    crm_sales_rep: {
      label: '営業担当者',
      description: 'リードと商談を日々担当し、リード受付キューから新しいリードを受け取ります。',
    },
    crm_service_director: {
      label: 'サービスディレクター',
      description: 'カスタマーサービスを統括し、サービスマネージャーが対応中の未解決の重大ケースをすべて閲覧します。',
    },
    crm_service_manager: {
      label: 'サービスマネージャー',
      description: 'エスカレーション窓口を担当します。エスカレーションされたケースはこの役職に引き渡され、未解決の重大ケースをすべて編集できます。',
    },
    crm_service_agent: {
      label: 'サービス担当者',
      description: '顧客のケースに対応し、サポート受付キューから新しいケースを受け取り、キューで待っているケースを担当します。',
    },
    crm_marketing_director: {
      label: 'マーケティングディレクター',
      description: 'マーケティングを率い、所有者にかかわらず実施中のキャンペーンをすべて編集します。',
    },
    crm_marketing_manager: {
      label: 'マーケティングマネージャー',
      description: 'キャンペーンを管理し、所有者にかかわらず実施中のキャンペーンをすべて編集します。',
    },
    crm_marketing_user: {
      label: 'マーケティングユーザー',
      description: 'キャンペーンとそのメンバーを日々企画・運用します。',
    },
    crm_ar_accountant: {
      label: '売掛金担当',
      description: '経理：営業が各契約で見る請求書と入金を入力・インポートします。',
    },
    crm_project_director: {
      label: 'プロジェクトディレクター',
      description: 'プロジェクト納品を統括します。プロジェクトを運営し、すべてのプロジェクト、タイムシート、経費とそのコスト・粗利を閲覧します。',
    },
    crm_pmo: {
      label: 'PMO',
      description: 'プロジェクトマネジメントオフィス。すべてのプロジェクトのコストと粗利を閲覧し、単価表を管理し、プロジェクトを運営します。',
    },
    crm_project_manager: {
      label: 'プロジェクトマネージャー',
      description: 'プロジェクトを立ち上げて運営し、単価表に沿って要員をアサインし、チームのタイムシートと経費を承認します。',
    },
    crm_project_member: {
      label: 'プロジェクトメンバー',
      description: 'プロジェクトにアサインされたコンサルタント。担当プロジェクトの工数と経費を登録します。',
    },
    crm_finance_controller: {
      label: '財務コントローラー',
      description: '財務。プロジェクトのコストと粗利を監視し、予算を設定し、単価表を管理します。',
    },
    crm_na_sales_team: {
      label: '北米営業チーム',
      description: '北米テリトリーのチーム：北米テリトリーの取引先をすべて編集します。',
    },
    crm_eu_sales_team: {
      label: '欧州営業チーム',
      description: '欧州テリトリーのチーム：欧州（EMEA）テリトリーの取引先をすべて編集します。',
    },
  },
  // Studio → All Metadata Types → Permission Set (`src/sales/profiles/*.profile.ts`).
  permissions: {
    finance_controller: {
      label: '財務コントローラー',
      description: '財務。すべてのプロジェクトとその要員、工数、経費を閲覧し、プロジェクト予算を編集し、単価表を管理します。',
    },
    project_manager: {
      label: 'プロジェクトマネージャー',
      description: 'デリバリー。プロジェクトを立ち上げて運営し、単価表に沿ってアサインし、工数と経費を登録し、すべての取引先・商談・契約を閲覧します。',
    },
    project_member: {
      label: 'プロジェクトメンバー',
      description: 'デリバリー。担当プロジェクトを閲覧し、自分のタイムシートと経費を登録します。コスト単価は表示されません。',
    },
    ar_accountant: {
      label: '売掛金担当',
      description: '経理：すべての契約の請求書と入金を入力・インポートし、その背後の契約、取引先、回収計画を参照します。',
    },
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
    sales_leadership: {
      label: '営業リーダーシップ',
      description: '経営層と営業ディレクター：営業マネージャーが閲覧できるレコードをすべて閲覧し、自分が所有しないレコードは変更せず、自分の商談は金額を含めて作成・編集できます。',
    },
    service_director: {
      label: 'サービスディレクター',
      description: 'サービス部門の管理職（閲覧のみ）：サービスディレクターに共有されたエスカレーション中のケースと、その背後の取引先・取引先責任者を閲覧します。',
    },
    system_admin: {
      label: 'システム管理者',
      description: '単一組織インストールの運用者：すべての業務レコードを完全に管理し、ユーザー・セキュリティモデル・設定を管理します。',
    },
  },
  // Doc book titles and group headings (translatable since @objectstack/spec 18.3.0).
  books: {
    crm_manual: {
      label: 'HotCRM ユーザーマニュアル',
      description: '営業で HotCRM がどう動くか：画面の背後にあるルール。',
      groups: {
        start: { label: 'はじめに' },
        sales: { label: '営業' },
        analytics: { label: '分析' },
      },
    },
    crm_admin_manual: {
      label: 'HotCRM 管理者マニュアル',
      description: '本番稼働、アクセス権、すべての自動化しきい値とデータインポート — 管理者向け。',
      groups: {
        admin: { label: '管理' },
      },
    },
  },
  // An import mapping's label, as the import wizard offers it (a key
  // since 18.6.0; before it the wizard showed the English text in every locale).
  mappings: {
    crm_account_import: { label: '取引先インポート (CSV)' },
    crm_contact_import: { label: '取引先責任者インポート (CSV)' },
    crm_lead_import: { label: 'リードインポート (CSV)' },
  },
};
