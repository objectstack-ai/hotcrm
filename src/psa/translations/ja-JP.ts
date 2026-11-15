// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the PSA module's own translations: every row whose target
 * this package registers. Why they live here and not in the app package's
 * pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  objects: {
    crm_project: {
      label: 'プロジェクト',
      pluralLabel: 'プロジェクト',
      description: 'デリバリーチームが顧客のために実施する案件。要員、工数、経費、コスト、粗利を含みます',
      fields: {
        owner_id: { label: 'プロジェクト所有者' },
        project_number: { label: 'プロジェクト番号' },
        name: { label: 'プロジェクト名' },
        kind: {
          label: '種別',
          options: {
            presales: 'プリセールス',
            delivery: 'デリバリー',
            internal: '社内',
          },
        },
        billing_type: {
          label: '請求方式',
          help: '顧客がこの作業に支払う方法です。請求書の発行は「受注から入金まで」で行います。',
          options: {
            fixed_fee: '固定報酬',
            time_and_materials: 'タイム・アンド・マテリアル',
            retainer: 'リテイナー',
            non_billable: '請求なし',
          },
        },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き',
            in_approval: '承認中',
            approved: '承認済み',
            rejected: '却下',
            active: '進行中',
            on_hold: '保留中',
            completed: '完了',
            closed: 'クローズ',
            cancelled: 'キャンセル',
          },
        },
        description: { label: '説明' },
        crm_account: { label: '取引先' },
        crm_opportunity: { label: '商談' },
        crm_contract: { label: '契約' },
        source_project: {
          label: '受注元',
          help: 'デリバリープロジェクトの場合、受注元のプリセールスプロジェクトです。',
        },
        planned_start: { label: '開始予定日' },
        planned_end: { label: '終了予定日' },
        actual_start: { label: '実際の開始日' },
        actual_end: { label: '実際の終了日' },
        percent_complete: { label: '進捗率' },
        planned_revenue: {
          label: '予定売上',
          help: '顧客がこのプロジェクトに支払う金額です。粗利はこれを基準に計算します。',
        },
        approved_budget: {
          label: '承認済み予算',
          help: 'このプロジェクトで使えるコストです。承認に回す前に設定します。',
        },
        actual_labor_cost: { label: '人件費' },
        actual_expense_cost: { label: '経費' },
        billable_labor_amount: { label: '請求対象の工数' },
        billable_expense_amount: { label: '請求対象の経費' },
        billable_amount: {
          label: '請求承認済み',
          help: '承認済みの請求対象工数を請求単価で計算し、承認済みの請求対象経費を加えた額です。「受注から入金まで」で請求します。',
        },
        actual_cost: { label: '実績コスト' },
        cost_variance: { label: '予算残' },
        budget_consumed_percent: { label: '予算消化率' },
        gross_margin: { label: '粗利' },
        gross_margin_percent: { label: '粗利率' },
        project_manager: {
          label: 'プロジェクトマネージャー',
          help: 'このプロジェクトでプロジェクトマネージャーを担当する人です。',
        },
        team_members: { label: 'チーム' },
      },
      _views: {
        all_projects: { label: 'すべてのプロジェクト' },
        my_projects: { label: '自分のプロジェクト' },
        active_projects: { label: '進行中のプロジェクト' },
      },
      _sections: {
        identity: { label: 'プロジェクト' },
        provenance: { label: '顧客' },
        plan: { label: '計画' },
        financials: { label: '財務' },
        team: { label: 'チーム' },
      },
      _validations: {
        project_planned_dates: { message: '終了予定日は開始予定日以降にしてください。' },
        project_status_progression: { message: 'このステータス変更はできません。プロジェクトは 下書き → 承認中 → 承認済み → 進行中 → 完了 → クローズ と進みます。進行中と保留中は行き来でき、却下されたプロジェクトは下書きに戻り、未完了のプロジェクトはキャンセルできます。' },
      },
    },
    crm_project_member: {
      label: 'プロジェクトメンバー',
      pluralLabel: 'プロジェクトメンバー',
      description: 'プロジェクトにアサインされた人。担当と単価表を含みます',
      fields: {
        crm_project: { label: 'プロジェクト' },
        person: { label: '担当者' },
        responsibility: {
          label: '担当',
          options: {
            project_manager: 'プロジェクトマネージャー',
            project_director: 'プロジェクトディレクター',
            account_manager: 'アカウントマネージャー',
            architect: 'アーキテクト',
            consultant: 'コンサルタント',
            quality_assurance: '品質保証',
            finance_partner: '財務パートナー',
            subcontractor: '協力会社',
          },
        },
        rate_card: {
          label: '単価表',
          help: 'この人のこのプロジェクトでの工数を計算するコスト単価と請求単価です。',
        },
        allocation_percent: { label: 'アサイン率' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        is_billable: {
          label: '請求対象',
          help: 'この人のこのプロジェクトでの工数を顧客に請求するかどうかです。',
        },
      },
      _views: {
        all_project_members: { label: 'すべてのプロジェクトメンバー' },
      },
      _sections: {
        basic: { label: 'アサイン' },
      },
      _validations: {
        project_member_dates: { message: '終了日は開始日以降にしてください。' },
      },
    },
    crm_rate_card: {
      label: '単価表',
      pluralLabel: '単価表',
      description: 'ある職位レベルのコスト単価と請求単価',
      fields: {
        owner_id: { label: '所有者' },
        name: {
          label: '名前',
          help: '例：「シニアコンサルタント」。',
        },
        seniority: {
          label: '職位レベル',
          options: {
            junior: 'ジュニア',
            intermediate: '中級',
            senior: 'シニア',
            lead: 'リード',
            principal: 'プリンシパル',
          },
        },
        unit: {
          label: '単位',
          help: '日単価は 8 時間として計算します。',
          options: {
            hour: '時間単位',
            day: '日単位',
          },
        },
        cost_rate: {
          label: 'コスト単価',
          help: 'この職位の 1 単位あたりの社内コストです。',
        },
        bill_rate: {
          label: '請求単価',
          help: 'この職位の 1 単位あたりの顧客への請求額です。',
        },
        is_internal: {
          label: '社内',
          help: '社内用の単価表は、コストを下回る請求や請求なしも可能です。',
        },
        effective_from: { label: '適用開始日' },
        effective_to: { label: '適用終了日' },
      },
      _views: {
        all_rate_cards: { label: 'すべての単価表' },
      },
      _sections: {
        basic: { label: '単価表' },
        rates: { label: '単価' },
      },
      _validations: {
        rate_card_bill_not_below_cost: { message: '社内用でない限り、請求単価をコスト単価より低くすることはできません。' },
        rate_card_dates: { message: '適用終了日は適用開始日以降にしてください。' },
      },
    },
    crm_timesheet: {
      label: 'タイムシート',
      pluralLabel: 'タイムシート',
      description: 'ある人の、あるプロジェクトでの一定期間の工数。まとめて承認します',
      fields: {
        owner_id: { label: '担当者' },
        name: { label: 'タイムシート' },
        crm_project: { label: 'プロジェクト' },
        period_start: { label: '期間開始日' },
        period_end: { label: '期間終了日' },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き',
            submitted: '提出済み',
            approved: '承認済み',
            rejected: '却下',
          },
        },
        approver: { label: '承認者' },
        total_hours: { label: '合計時間' },
        total_cost: { label: '合計コスト' },
        total_bill_amount: { label: '請求額' },
        notes: { label: 'メモ' },
      },
      _views: {
        all_timesheets: { label: 'すべてのタイムシート' },
        my_timesheets: { label: '自分のタイムシート' },
        timesheets_to_approve: { label: '承認待ちのタイムシート' },
      },
      _sections: {
        basic: { label: 'タイムシート' },
        totals: { label: '合計' },
      },
      _validations: {
        timesheet_period: { message: '期間終了日は期間開始日以降にしてください。1 枚のタイムシートは最長 31 日です。' },
        timesheet_status_progression: { message: 'このステータス変更はできません。タイムシートは 下書き → 提出済み → 承認済みまたは却下 と進みます。却下されたタイムシートは下書きに戻して修正します。' },
      },
    },
    crm_time_entry: {
      label: '工数明細',
      pluralLabel: '工数明細',
      description: 'タイムシート内の 1 日分の工数と、そのコスト',
      fields: {
        crm_timesheet: { label: 'タイムシート' },
        entry_date: {
          label: '日付',
          help: 'タイムシートの期間内の日付です。',
        },
        hours: { label: '時間' },
        is_billable: { label: '請求対象' },
        notes: { label: 'メモ' },
        cost_rate: { label: 'コスト単価（時間あたり）' },
        cost_amount: { label: 'コスト' },
        bill_rate: { label: '請求単価（時間あたり）' },
        bill_amount: { label: '請求額' },
      },
      _views: {
        all_time_entries: { label: 'すべての工数明細' },
      },
      _sections: {
        basic: { label: '工数明細' },
        rates: { label: 'コストと請求' },
      },
    },
    crm_expense: {
      label: '経費',
      pluralLabel: '経費',
      description: 'プロジェクトで発生した経費。領収書を添付します',
      fields: {
        owner_id: { label: '支出者' },
        name: { label: '説明' },
        crm_project: { label: 'プロジェクト' },
        expense_date: { label: '日付' },
        category: {
          label: 'カテゴリ',
          options: {
            travel: '交通',
            lodging: '宿泊',
            meals: '食事',
            equipment: '機器',
            other: 'その他',
          },
        },
        amount: { label: '金額' },
        is_billable: {
          label: '請求対象',
          help: 'この経費を顧客に請求するかどうかです。',
        },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き',
            submitted: '提出済み',
            approved: '承認済み',
            rejected: '却下',
          },
        },
        approver: { label: '承認者' },
        notes: { label: 'メモ' },
      },
      _views: {
        all_expenses: { label: 'すべての経費' },
        my_expenses: { label: '自分の経費' },
        expenses_to_approve: { label: '承認待ちの経費' },
      },
      _sections: {
        basic: { label: '経費' },
      },
      _validations: {
        expense_status_progression: { message: 'このステータス変更はできません。経費は 下書き → 提出済み → 承認済みまたは却下 と進みます。却下された経費は下書きに戻して修正します。' },
      },
    },
  },
  apps: {
    // This package's own app (#2316).
    crm_psa: {
      label: 'プロジェクト納品',
      description: 'プロジェクト、アサインされたメンバー、工数と経費、そしてその結果の粗利',
      navigation: {
        group_projects: { label: 'プロジェクト' },
        nav_projects: { label: 'すべてのプロジェクト' },
        nav_my_projects: { label: '自分のプロジェクト' },
        nav_project_members: { label: 'アサイン' },
        group_time_expenses: { label: '工数と経費' },
        nav_my_timesheets: { label: '自分のタイムシート' },
        nav_my_expenses: { label: '自分の経費' },
        nav_timesheets_to_approve: { label: '承認待ちのタイムシート' },
        nav_expenses_to_approve: { label: '承認待ちの経費' },
        group_rates: { label: '単価' },
        nav_rate_cards: { label: '単価表' },
        group_customers: { label: '取引先と契約' },
        group_work: { label: 'マイワーク' },
        nav_approval_requests: { label: '受信トレイ' },
      },
    },
  },
};
