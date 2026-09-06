// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions, salutationOptions, industryOptions, leadSourceOptions } from './_shared';

/**
 * 日本語 (ja-JP) — `objects` translations for the PIPELINE family:
 * demand and the deals it becomes, plus the roll-up that forecasts them.
 *
 * Roster: `crm_lead`, `crm_opportunity`, `crm_opportunity_line_item`, `crm_forecast`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/ja-JP.ts`.
 */
const opportunityStageOptions = {
  prospecting: '見込み調査', qualification: '選定',
  needs_analysis: 'ニーズ分析', proposal: '提案',
  negotiation: '交渉', closed_won: '成立', closed_lost: '不成立',
};

export const pipeline: Record<string, ObjectTranslationData> = {
  crm_lead: {
    _validations: {
      disqualification_reason_required: {
        message: 'リードを「対象外」にする場合は失格理由が必要です',
      },
      duplicate_disqualification_requires_survivor: {
        message: '重複を理由にリードを失格とする場合は、残すレコードを指定し、重複ステータスを「確認済み」にする必要があります',
      },
      email_required: {
        message: 'メールアドレスは必須です',
      },
      lead_status_progression: {
        message: '無効なリードステータス遷移です',
      },
    },
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
    _validations: {
      amount_positive: {
        message: '金額は 0 より大きい必要があります',
      },
      close_date_future: {
        message: '商談がクローズしている場合を除き、完了予定日を過去に設定することはできません',
      },
      opportunity_stage_progression: {
        message: '無効な商談ステージ遷移です',
      },
    },
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
  crm_opportunity_line_item: {
    _validations: {
      unit_price_positive: {
        message: '販売価格を負の値にすることはできません',
      },
    },
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
    _sections: {
      basic: { label: '明細行' },
      pricing: { label: '価格' },
    },
  },
  crm_forecast: {
    _validations: {
      period_end_after_start: {
        message: '期間終了は期間開始より後である必要があります。',
      },
      period_end_matches_calendar_period: {
        message: '期間終了はその期間の最終日である必要があります。例：2026-07-01 開始の四半期なら 2026-09-30、2026 年 8 月なら 2026-08-31。',
      },
      period_start_first_of_period: {
        message: '期間開始はその期間の初日である必要があります。例：2026 年 8 月なら 2026-08-01。',
      },
      quarter_starts_on_quarter_boundary: {
        message: '四半期フォーキャストは四半期の境界（1 月 1 日、4 月 1 日、7 月 1 日、10 月 1 日）から開始する必要があります。',
      },
      snapshot_amounts_non_negative: {
        message: 'スナップショット金額は負の値にできません。',
      },
    },
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
};
