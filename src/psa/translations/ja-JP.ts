// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the PSA module's own translations: every row whose target
 * this package registers. Why they live here and not in the app package's
 * pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  hooks: {
    timesheet_stamps: {
      refusals: {
        RECORD_LOCKED: {
          message: 'このプロジェクトのタイムシートは、現在この変更ができません。',
          reasons: {
            project_locked: { message: '{{project}}は工数と経費がロックされているため、このタイムシートは提出できません。下書きのままにするか、プロジェクトマネージャーにプロジェクトの「工数と経費をロック」を外すよう依頼してください。' },
            closed_takes_no_new: { message: '{{project}}はクローズ済みのため、新しいタイムシートは受け付けません。工数は進行中のプロジェクトに記録してください。' },
            cancelled_takes_no_new: { message: '{{project}}はキャンセル済みのため、新しいタイムシートは受け付けません。工数は進行中のプロジェクトに記録してください。' },
            closed_no_submit: { message: '{{project}}はクローズ済みのため、このタイムシートは提出できません。下書きのままにするか、進行中のプロジェクトに移してください。' },
            cancelled_no_submit: { message: '{{project}}はキャンセル済みのため、このタイムシートは提出できません。下書きのままにするか、進行中のプロジェクトに移してください。' },
          },
        },
        FORBIDDEN: { message: 'タイムシートは提出後、承認者が受信トレイから承認または却下します。' },
        DUPLICATE_VALUE: {
          message: 'このプロジェクトと期間のタイムシートはすでにあります。工数はそちらに追加してください。',
          reasons: {
            named: { message: 'このプロジェクトと期間のタイムシートはすでにあります：{{timesheet}}。工数はそちらに追加してください。' },
          },
        },
      },
    },
    expense_approver: {
      refusals: {
        RECORD_LOCKED: {
          message: 'このプロジェクトの経費は、現在この変更ができません。',
          reasons: {
            project_locked: { message: '{{project}}は工数と経費がロックされているため、この経費は提出できません。下書きのままにするか、プロジェクトマネージャーにプロジェクトの「工数と経費をロック」を外すよう依頼してください。' },
            closed_takes_no_new: { message: '{{project}}はクローズ済みのため、新しい経費は受け付けません。経費は進行中のプロジェクトに記録してください。' },
            cancelled_takes_no_new: { message: '{{project}}はキャンセル済みのため、新しい経費は受け付けません。経費は進行中のプロジェクトに記録してください。' },
            closed_no_submit: { message: '{{project}}はクローズ済みのため、この経費は提出できません。下書きのままにするか、進行中のプロジェクトに移してください。' },
            cancelled_no_submit: { message: '{{project}}はキャンセル済みのため、この経費は提出できません。下書きのままにするか、進行中のプロジェクトに移してください。' },
          },
        },
        FORBIDDEN: { message: '経費は提出後、承認者が受信トレイから承認または却下します。' },
      },
    },
    project_status_guard: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'このプロジェクトの変更はできません。',
          reasons: {
            starts_as_draft: { message: '新しいプロジェクトは下書きから始まります。保存してから、ステータスを「承認中」にして承認に回してください。' },
            budget_required: { message: '承認に回す前に承認済み予算を入力してください。承認の対象はその金額です。' },
          },
        },
        FORBIDDEN: {
          message: 'このプロジェクトの変更はできません。',
          reasons: {
            budget_finance_only: { message: '{{project}}は承認済み予算で承認されたため、変更できるのは財務コントローラーだけです。新しい予算の設定は財務に依頼してください。' },
            decided_by_approver: { message: 'プロジェクトは承認者が受信トレイから承認または却下します。ステータスを「承認中」にして承認に回してください。' },
          },
        },
      },
    },
    project_member_unique: {
      refusals: {
        DUPLICATE_VALUE: { message: 'この人はすでにこのプロジェクトにアサインされています。行を追加せず、既存のアサイン行を変更してください。' },
      },
    },
    project_task_rules: {
      refusals: {
        VALIDATION_FAILED: {
          message: '親タスクは同じプロジェクトの別のタスクにしてください。',
          reasons: {
            loop: { message: 'この親タスクはこのタスク自身のサブタスクです。このタスクの配下にないタスクを選んでください。' },
            predecessor: { message: '先行タスクは同じプロジェクトの別のタスクにしてください。' },
          },
        },
      },
    },
    time_entry_timesheet: {
      refusals: {
        VALIDATION_FAILED: { message: '工数のプロジェクトを選んでください。' },
        FORBIDDEN: {
          message: '工数を記録できるのは、プロジェクトにアサインされた人だけです。プロジェクトマネージャーに追加を依頼してください。',
          reasons: {
            named: { message: '工数を記録できるのは、プロジェクト「{{project}}」にアサインされた人だけです。プロジェクトマネージャーに追加を依頼してください。' },
          },
        },
      },
    },
    time_entry_costing: {
      refusals: {
        RECORD_LOCKED: { message: 'このタイムシートは提出済みのため、工数は変更できません。修正するには下書きに戻してください。' },
        VALIDATION_FAILED: {
          message: '日付 {{day}} はこのタイムシートの期間（{{from}} – {{to}}）外です。',
          reasons: {
            task: { message: 'タスクはこの工数表のプロジェクトのタスクにしてください。' },
            project: { message: 'プロジェクトはこのタイムシートのプロジェクトにしてください。' },
          },
        },
        FORBIDDEN: {
          message: '工数を記録できるのは、プロジェクトにアサインされた人だけです。プロジェクトマネージャーに追加を依頼してください。',
          reasons: {
            named: { message: '工数を記録できるのは、プロジェクト「{{project}}」にアサインされた人だけです。プロジェクトマネージャーに追加を依頼してください。' },
          },
        },
      },
    },
  },
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
        percent_complete: {
          label: '進捗率',
          help: 'プロジェクトのタスクから計画工数で重み付けして計算されます。サブタスクを持つタスクはサブタスクを通じて計上されます。',
        },
        planned_revenue: {
          label: '予定売上',
          help: '顧客がこのプロジェクトに支払う金額です。粗利はこれを基準に計算します。',
        },
        approved_budget: {
          label: '承認済み予算',
          help: 'このプロジェクトで使えるコストです。承認に回す前に設定します。その後は財務コントローラーだけが変更できます。',
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
        budget_status: {
          label: '予算ステータス',
          help: '承認済み予算の 80% 未満は順調、80% 以上は警告、100% 以上は超過です。',
          options: {
            on_track: '順調',
            warning: '警告',
            exceeded: '超過',
          },
        },
        time_entry_locked: {
          label: '工数と経費をロック',
          help: 'チェックが入っている間、このプロジェクトの工数表と経費は提出できません。下書きは引き続き作成できます。',
        },
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
    crm_project_task: {
      label: 'プロジェクトタスク',
      pluralLabel: 'プロジェクトタスク',
      description: 'プロジェクト計画の作業項目（日程、計画工数、担当者、進捗）',
      fields: {
        crm_project: { label: 'プロジェクト' },
        name: { label: 'タスク名' },
        parent_task: {
          label: '親タスク',
          help: 'このタスクが属するタスク。サブタスクを持つタスクはサマリーで、進捗はサブタスクから計算されます。',
        },
        task_owner: {
          label: 'タスク担当者',
          help: 'このタスクを実施する、または責任を持つ人。',
        },
        status: {
          label: 'ステータス',
          options: {
            not_started: '未着手',
            in_progress: '進行中',
            on_hold: '保留',
            completed: '完了',
            cancelled: '取消',
          },
        },
        is_milestone: {
          label: 'マイルストーン',
          help: '作業ではなくチェックポイント。ガントチャートではひし形で表示され、通常は計画工数がありません。',
        },
        description: { label: '説明' },
        planned_start: { label: '開始予定日' },
        planned_end: { label: '終了予定日' },
        predecessors: {
          label: '先行タスク',
          help: 'このタスクの開始前に完了している必要があるタスク。',
        },
        schedule_type: { label: 'スケジュール種別' },
        planned_hours: {
          label: '計画工数',
          help: 'このタスクに計画した工数。プロジェクトの進捗率は各タスクをこれで重み付けします。',
        },
        percent_complete: {
          label: '進捗率',
          help: 'このタスクの進み具合。完了にすると 100 になります。',
        },
        actual_hours: { label: '実績工数' },
      },
      _views: {
        all_project_tasks: { label: 'すべてのプロジェクトタスク' },
        project_plan: { label: 'プロジェクト計画' },
        project_task_tree: { label: 'タスクツリー' },
        my_project_tasks: { label: '自分のプロジェクトタスク' },
      },
      _sections: {
        basic: { label: 'タスク' },
        schedule: { label: 'スケジュール' },
        effort: { label: '工数' },
      },
      _validations: {
        project_task_planned_dates: { message: '終了予定日は開始予定日以降にしてください。' },
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
        billable_hours: { label: '請求可能工数' },
        total_cost: { label: '合計コスト' },
        total_bill_amount: { label: '請求額' },
        notes: { label: 'メモ' },
      },
      _views: {
        all_timesheets: { label: 'すべてのタイムシート' },
        my_timesheets: { label: '自分のタイムシート' },
        my_week_timesheets: {
          label: '今週のタイムシート',
          bulkActions: {
            submit_week: { label: '提出', confirmText: '{{count}} 件のタイムシートを承認に提出しますか？それぞれのプロジェクトマネージャーに送られます。' },
          },
        },
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
      _actions: {
        submit_timesheet: { label: '提出', successMessage: 'タイムシート {{ record.name }} を承認に提出しました。' },
      },
    },
    crm_time_entry: {
      label: '工数明細',
      pluralLabel: '工数明細',
      description: 'タイムシート内の 1 日分の工数と、そのコスト',
      fields: {
        crm_project: {
          label: 'プロジェクト',
          help: 'この工数のプロジェクト。新しい行では、このプロジェクトとその週のタイムシートが自動で見つかるか作成されます。',
        },
        crm_timesheet: {
          label: 'タイムシート',
          help: 'プロジェクトと日付から自動で入ります。別の期間のタイムシートに記録するときだけ選んでください。',
        },
        entry_date: {
          label: '日付',
          help: '作業した日です。',
        },
        hours: { label: '時間' },
        is_billable: { label: '請求対象' },
        crm_project_task: {
          label: 'タスク',
          help: 'この工数を使ったこのプロジェクトのタスク。',
        },
        notes: { label: 'メモ' },
        cost_rate: { label: 'コスト単価（時間あたり）' },
        cost_amount: { label: 'コスト' },
        bill_rate: { label: '請求単価（時間あたり）' },
        bill_amount: { label: '請求額' },
      },
      _views: {
        all_time_entries: { label: 'すべての工数明細' },
        my_week_time: { label: '今週の工数' },
        my_time_entries: { label: '自分の工数' },
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
  // Step names the approval request shows the submitter and the approvers (#2316 phase 1b).
  flows: {
    project_initiation_approval: {
      label: 'プロジェクト立ち上げ承認',
      approvals: {
        leadership_review: { label: 'プロジェクトディレクター審査' },
        finance_review: { label: '財務コントローラー審査' },
      },
    },
    timesheet_approval: {
      label: '工数表承認',
      approvals: { approver_review: { label: 'プロジェクトマネージャー審査' } },
    },
    timesheet_approval_on_create: {
      label: '工数表承認（作成時）',
      approvals: { approver_review: { label: 'プロジェクトマネージャー審査' } },
    },
    expense_approval: {
      label: '経費承認',
      approvals: {
        approver_review: { label: 'プロジェクトマネージャー審査' },
        finance_review: { label: '財務コントローラー審査' },
      },
    },
    expense_approval_on_create: {
      label: '経費承認（作成時）',
      approvals: {
        approver_review: { label: 'プロジェクトマネージャー審査' },
        finance_review: { label: '財務コントローラー審査' },
      },
    },
    project_budget_alert: { label: 'プロジェクト予算アラート' },
  },
  pages: {
    // The project's record page (#2545).
    project_detail_page: {
      label: 'プロジェクト詳細',
      description: 'プロジェクトのレコードページ：システムが生成するレイアウトに、概要タブでタスク計画のガントチャートを加えたもの。',
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
        nav_project_plan: { label: 'プロジェクト計画' },
        nav_my_project_tasks: { label: '自分のプロジェクトタスク' },
        group_time_expenses: { label: '工数と経費' },
        nav_my_week: { label: '今週の工数' },
        nav_my_week_timesheets: { label: '今週分を提出' },
        nav_my_timesheets: { label: '自分のタイムシート' },
        nav_my_expenses: { label: '自分の経費' },
        nav_timesheets_to_approve: { label: '承認待ちのタイムシート' },
        nav_expenses_to_approve: { label: '承認待ちの経費' },
        group_rates: { label: '単価' },
        nav_rate_cards: { label: '単価表' },
        group_customers: { label: '取引先と契約' },
        group_work: { label: 'マイワーク' },
        nav_approval_requests: { label: '受信トレイ' },
        nav_projects_overview: { label: 'プロジェクト概要' },
        group_help: { label: 'ヘルプ' },
        nav_help_psa: { label: 'プロジェクト提供マニュアル' },
      },
    },
  },
  // Phase 1c: the module's datasets, its manual and its dashboard.
  datasets: {
    project_financials: {
      label: 'プロジェクト財務',
      description: 'プロジェクトごとの承認済み予算、計画収益、コスト、粗利',
      dimensions: {
        project: { label: 'プロジェクト' },
        status: { label: 'ステータス' },
        kind: { label: '種類' },
        billing_type: { label: '請求方式' },
        budget_status: { label: '予算ステータス' },
        project_manager: { label: 'プロジェクトマネージャー' },
        planned_start: { label: '開始予定' },
      },
      measures: {
        project_count: { label: 'プロジェクト数' },
        approved_budget_sum: { label: '承認済み予算' },
        planned_revenue_sum: { label: '計画収益' },
        labor_cost_sum: { label: '人件費' },
        expense_cost_sum: { label: '経費' },
        actual_cost_sum: { label: '実コスト' },
        gross_margin_sum: { label: '粗利' },
        budget_used: { label: '予算消化率' },
        billable_labor_sum: { label: '請求可能な工数額' },
        billable_expense_sum: { label: '請求可能な経費' },
        approved_to_bill_sum: { label: '承認済み未請求' },
      },
    },
    time_utilization: {
      label: '工数稼働率',
      description: '担当者・プロジェクト・週ごとの工数と請求可能な割合',
      dimensions: {
        period_week: { label: '週' },
        period_month: { label: '月' },
        person: { label: '担当者' },
        project: { label: 'プロジェクト' },
        status: { label: '工数表ステータス' },
      },
      measures: {
        total_hours: { label: '工数' },
        billable_hours: { label: '請求可能工数' },
        utilization: { label: '請求可能割合' },
      },
    },
  },
  books: {
    crm_psa_manual: {
      label: 'HotCRM プロジェクト提供マニュアル',
      description: 'プロジェクト、要員、コスト、承認、予算ロック：各数値が何を数え、誰が決めるか。',
      groups: {
        psa: { label: 'プロジェクト提供' },
      },
    },
  },
  dashboards: {
    projects_overview: {
      label: 'プロジェクト概要',
      description: '提供中のプロジェクト全体の予算、コスト、粗利、承認済み工数',
      widgets: {
        delivering_projects: { title: '提供中のプロジェクト', description: '進行中・保留・完了のプロジェクト' },
        delivering_budget: { title: '承認済み予算', description: '提供中のプロジェクトの承認済み予算' },
        delivering_cost: { title: '実コスト', description: '提供中のプロジェクトの承認済み人件費と経費' },
        delivering_budget_used: { title: '予算消化率', description: '提供中のプロジェクト全体の実コスト÷承認済み予算' },
        budget_vs_cost: { title: 'プロジェクト別の予算とコスト', description: '提供中の各プロジェクトの承認済み予算と実コスト' },
        budget_status_mix: { title: '予算ステータス別プロジェクト', description: '順調、警告（80% から）、超過（100% から）。予算のあるプロジェクトのみ' },
        project_margin: { title: 'プロジェクト別粗利', description: '提供中の各プロジェクトの計画収益、実コスト、粗利、予算消化率' },
        projects_by_status: { title: 'ステータス別プロジェクト', description: '下書きからクローズまでのすべてのプロジェクト' },
        hours_by_week: { title: '週別の承認済み工数', description: '承認済み工数表の工数と、そのうち請求可能な分' },
        billable_share_by_person: { title: '担当者別の請求可能割合', description: '担当者ごとの承認済み工数と顧客に請求する割合' },
      },
    },
  },
};
