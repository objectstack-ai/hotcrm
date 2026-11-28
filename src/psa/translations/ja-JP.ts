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
    project_status_guard: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'このプロジェクトの変更はできません。',
          reasons: {
            starts_as_draft: { message: '新しいプロジェクトは下書きから始まります。保存してから、ステータスを「承認中」にして承認に回してください。' },
            budget_required: { message: '承認に回す前に、プロジェクトの予算（版 1 とその明細）を追加してください。承認の対象はその予算です。' },
            budget_no_lines: { message: '予算はまだ承認に回せません：明細がありません。 完成させてから、プロジェクトを承認に回してください。' },
            budget_labor_no_rate_card: { message: '予算はまだ承認に回せません：人件費の明細「{{line}}」に単価表が指定されていません。 完成させてから、プロジェクトを承認に回してください。' },
            budget_labor_no_hours: { message: '予算はまだ承認に回せません：人件費の明細「{{line}}」に時間が入力されていません。 完成させてから、プロジェクトを承認に回してください。' },
            budget_line_no_quantity: { message: '予算はまだ承認に回せません：明細「{{line}}」に数量が入力されていません。 完成させてから、プロジェクトを承認に回してください。' },
            budget_total_zero: { message: '予算はまだ承認に回せません：合計がゼロです。 完成させてから、プロジェクトを承認に回してください。' },
          },
        },
        FORBIDDEN: {
          message: 'このプロジェクトの変更はできません。',
          reasons: {
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
    project_budget_rules: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'この予算の変更はできません。',
          reasons: {
            open_version: { message: '{{project}}には未確定の予算版（版 {{version}}）がすでにあります。新しい版を作る前に、それを承認に回すか削除してください。' },
            starts_as_draft: { message: '新しい予算の版は下書きから始まります。保存して明細を追加してから、承認に回してください。' },
            with_project: { message: '版 1 はプロジェクトと一緒に承認されます。プロジェクトを承認に回すと、予算も一緒に回ります。' },
            reason_required: { message: '承認に回す前に、追加予算が必要な理由を「理由」に記入してください。' },
            budget_no_lines: { message: '予算はまだ承認に回せません：明細がありません。 完成させてから承認に回してください。' },
            budget_labor_no_rate_card: { message: '予算はまだ承認に回せません：人件費の明細「{{line}}」に単価表が指定されていません。 完成させてから承認に回してください。' },
            budget_labor_no_hours: { message: '予算はまだ承認に回せません：人件費の明細「{{line}}」に時間が入力されていません。 完成させてから承認に回してください。' },
            budget_line_no_quantity: { message: '予算はまだ承認に回せません：明細「{{line}}」に数量が入力されていません。 完成させてから承認に回してください。' },
            budget_total_zero: { message: '予算はまだ承認に回せません：合計がゼロです。 完成させてから承認に回してください。' },
          },
        },
        FORBIDDEN: { message: '予算の版は、承認に回された後、承認者が受信トレイで承認または却下します。' },
        RECORD_LOCKED: { message: '削除できるのは未確定の予算版（下書きまたは却下）だけです。承認済みの版はプロジェクトの履歴です。' },
      },
    },
    project_budget_line_amount: {
      refusals: {
        RECORD_LOCKED: { message: 'この予算の版は承認に回されたため、明細は変更できません。変更を計画するには新しい版を作成してください。' },
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
            task: { message: 'タスクはこのタイムシートのプロジェクトのタスクにしてください。' },
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
        crm_sales_order: {
          label: '注文',
          help: 'このプロジェクトが納品する販売注文。',
        },
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
          help: 'ベースラインの予算版の合計で、このプロジェクトが使えるコストです。新しい版が承認されると変わり、直接入力はできません。',
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
          help: 'チェックが入っている間、このプロジェクトのタイムシートと経費は提出できません。下書きは引き続き作成できます。',
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
          help: 'このタスクの進み具合。完了にすると 100 になり、完了から他のステータスに戻すと 0 に戻ります。',
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
    // Budget versions and their lines (hotcrm#2547).
    crm_project_budget: {
      label: 'プロジェクト予算',
      pluralLabel: 'プロジェクト予算',
      description: 'プロジェクト予算の 1 つの版です。明細、合計、承認を持ち、承認済みの版がベースラインです。',
      fields: {
        crm_project: { label: 'プロジェクト' },
        name: { label: '予算' },
        version: { label: '版', help: '作成順に 1、2、3… と番号が付きます。' },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き',
            in_approval: '承認中',
            approved: '承認済み',
            rejected: '却下',
            superseded: '置き換え済み',
          },
        },
        is_baseline: { label: 'ベースライン', help: 'プロジェクトの承認済み予算の元になる承認済みの版です。プロジェクトに 1 つだけで、後から承認された版が引き継ぎます。' },
        with_initiation: { label: 'プロジェクトと一緒に承認', help: '追加予算ではなく最初の予算として、プロジェクト自体と一緒に承認に回された版です。' },
        reason: { label: '理由', help: 'この版が必要な理由です。追加予算（版 2 以降）を承認に回すときは必須です。' },
        total_cost: { label: '総コスト' },
        labor_cost: { label: '人件費' },
        labor_hours: { label: '工数（時間）' },
        notes: { label: 'メモ' },
      },
      _views: {
        all_project_budgets: { label: 'すべての予算版' },
        baseline_budgets: { label: 'ベースライン' },
        open_budgets: { label: '未確定の版' },
      },
      _sections: {
        basic: { label: '予算の版' },
        lines: { label: '予算明細' },
        totals: { label: '合計' },
      },
      _validations: {
        project_budget_status_progression: { message: 'このステータス変更はできません。予算の版は 下書き → 承認中 → 承認済み または 却下 と進みます。却下された版は下書きに戻り、承認済みの版は後の版が承認されると置き換え済みになります。' },
      },
    },
    crm_project_budget_line: {
      label: '予算明細',
      pluralLabel: '予算明細',
      description: '予算の版の計画コスト 1 件：区分、月、数量、単価',
      fields: {
        crm_project_budget: { label: '予算' },
        category: {
          label: '区分',
          options: {
            labor: '人件費',
            subcontract_service: '外注サービス',
            third_party_goods: '他社製品',
            expense: '経費',
            other: 'その他',
          },
        },
        description: { label: '説明' },
        period: { label: '月', help: 'コストが発生する月です。その月の 1 日として保存されます。' },
        rate_card: { label: '単価表', help: '人件費の明細：工数を計画するレベルです。単価を入力しなければ、そのコスト単価が使われます。' },
        hours: { label: '時間', help: '人件費の明細：計画する時間です。' },
        quantity: { label: '数量', help: 'その他の明細：単位の数です。' },
        unit_cost: { label: '単価', help: '人件費は 1 時間あたり、その他は 1 単位あたりです。' },
        amount: { label: '金額', help: '人件費は時間 × 単価、その他は数量 × 単価です。' },
      },
      _views: {
        all_project_budget_lines: { label: 'すべての予算明細' },
      },
      _sections: {
        basic: { label: '予算明細' },
      },
    },
    crm_project_member: {
      label: 'プロジェクトメンバー',
      pluralLabel: 'プロジェクトメンバー',
      description: 'プロジェクトにアサインされた人。担当と単価表を含みます',
      fields: {
        crm_project: { label: 'プロジェクト' },
        person: { label: '担当者' },
        person_name: { label: '担当者名', help: '担当者の名前。ユーザーレコードと同期します。このアサインの名前になります。' },
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
    // The Project field it contributes to the expense module's objects (hotcrm#2556, hotcrm#2581).
    crm_expense: {
      fields: {
        crm_project: { label: 'プロジェクト' },
      },
    },
    crm_expense_report: {
      fields: {
        crm_project: { label: 'プロジェクト' },
      },
    },
    crm_expense_request: {
      fields: {
        crm_project: { label: 'プロジェクト' },
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
    project_budget_approval: {
      label: '追加予算承認',
      approvals: {
        leadership_review: { label: 'プロジェクトディレクター審査' },
        finance_review: { label: '財務コントローラー審査' },
      },
    },
    timesheet_approval: {
      label: 'タイムシート承認',
      approvals: { approver_review: { label: 'プロジェクトマネージャー審査' } },
    },
    timesheet_approval_on_create: {
      label: 'タイムシート承認（作成時）',
      approvals: { approver_review: { label: 'プロジェクトマネージャー審査' } },
    },
    project_budget_alert: { label: 'プロジェクト予算アラート' },
    expense_report_project_approval: {
      label: 'プロジェクト経費精算書承認',
      approvals: {
        approver_review: { label: 'プロジェクトマネージャー審査' },
        finance_review: { label: '財務コントローラー審査' },
      },
    },
    expense_request_project_approval: {
      label: 'プロジェクト出張申請の承認',
      approvals: {
        approver_review: { label: 'プロジェクトマネージャー審査' },
      },
    },
    expense_request_project_approval_on_create: {
      label: 'プロジェクト出張申請の承認（作成時）',
      approvals: {
        approver_review: { label: 'プロジェクトマネージャー審査' },
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
        nav_project_budgets: { label: '予算' },
        nav_project_plan: { label: 'プロジェクト計画' },
        nav_my_project_tasks: { label: '自分のプロジェクトタスク' },
        group_time_expenses: { label: '工数と経費' },
        nav_my_week: { label: '今週の工数' },
        nav_my_week_timesheets: { label: '今週分を提出' },
        nav_my_timesheets: { label: '自分のタイムシート' },
        nav_timesheets_to_approve: { label: '承認待ちのタイムシート' },
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
        project: { label: 'プロジェクト', description: 'プロジェクト（名前で表示）。' },
        status: { label: 'ステータス', description: 'プロジェクトの状況。下書き・承認中から進行中・保留中を経て、完了・クローズ・却下・キャンセルまで。' },
        kind: { label: '種類', description: 'プロジェクトがプリセールス、顧客へのデリバリー、社内作業のどれか。' },
        billing_type: { label: '請求方式', description: '顧客が作業に支払う方式：固定報酬、タイム・アンド・マテリアル、リテイナー、請求なし。' },
        budget_status: { label: '予算ステータス', description: 'プロジェクトが承認済み予算をどれだけ使ったか。80% 未満は順調、80% 以上は警告、100% 以上は超過。' },
        project_manager: { label: 'プロジェクトマネージャー', description: 'プロジェクトにプロジェクトマネージャーとして配置された人。' },
        planned_start: { label: '開始予定', description: 'プロジェクトの開始予定月。開始予定日のないプロジェクトは別のグループになります。' },
      },
      measures: {
        project_count: { label: 'プロジェクト数', description: 'プロジェクトの件数。下書き・却下・キャンセルを含むすべてのステータスを数えます。' },
        approved_budget_sum: { label: '承認済み予算', description: '各プロジェクトの承認済み予算（ベースライン予算版の合計）の合計。未承認のプロジェクトは加算されません。' },
        planned_revenue_sum: { label: '計画収益', description: '予定売上の合計（顧客がプロジェクトに支払う額）。計画値であり、請求済みの売上や受注額ではありません。' },
        labor_cost_sum: { label: '人件費', description: '承認済みタイムシートの時間のコスト。下書き・提出済み・却下の時間は含みません。' },
        expense_cost_sum: { label: '経費', description: 'プロジェクトに計上された承認済み経費の額。未承認の経費は含みません。' },
        actual_cost_sum: { label: '実コスト', description: 'Labor Cost と Expense Cost の和。承認済みのコストだけで、プロジェクトレコードの表示と同じです。' },
        gross_margin_sum: { label: '粗利', description: 'Planned Revenue から Actual Cost を引いたもの（計画対実績の粗利）。請求済みの利益ではなく、未承認のコストは差し引きません。' },
        budget_used: { label: '予算消化率', description: 'Actual Cost を Approved Budget で割ったもの。合計してから割るため、各プロジェクトの割合の平均ではなくポートフォリオ全体の数字です。' },
        billable_labor_sum: { label: '請求可能な工数額', description: '承認済みタイムシートの時間の請求可能額。下書き・提出済み・却下の時間は含みません。' },
        billable_expense_sum: { label: '請求可能な経費', description: '顧客に請求可能とされた承認済み経費の額。請求対象外や未承認の経費は含みません。' },
        approved_to_bill_sum: { label: '承認済み未請求', description: 'Billable Labor と Billable Expenses の和。承認済みの請求可能な作業と経費で、請求書自体は Order to Cash で発行します。' },
      },
    },
    time_utilization: {
      label: '工数稼働率',
      description: '担当者・プロジェクト・週ごとの工数と請求可能な割合',
      dimensions: {
        period_week: { label: '週', description: '時間を実際に作業した週。各工数明細の日付で決まり、タイムシートの開始週ではありません。' },
        period_month: { label: '月', description: '時間を実際に作業した月。各工数明細の日付で決まります。' },
        person: { label: '担当者', description: '時間を登録した人（タイムシートの所有者）。' },
        project: { label: 'プロジェクト', description: 'タイムシートの対象プロジェクト。' },
        status: { label: 'タイムシートステータス', description: '時間が載っているタイムシートの承認ステータス：下書き、提出済み、承認済み、却下。コストに入るのは承認済みの時間だけです。' },
      },
      measures: {
        total_hours: { label: '工数', description: '工数明細に登録された時間。下書き・却下を含むすべてのステータスのタイムシートを含みます。コストに入る時間は承認済みで絞り込みます。' },
        billable_hours: { label: '請求可能工数', description: '請求対象とされた工数明細の時間。すべてのステータスのタイムシートを含み、請求対象外の時間は含みません。' },
        utilization: { label: '請求可能割合', description: 'Billable Hours を Hours で割ったもの。登録時間のうち請求可能な割合で、稼働可能時間に対する割合ではありません。' },
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
        hours_by_week: { title: '週別の承認済み工数', description: '承認済みタイムシートの工数と、そのうち請求可能な分' },
        billable_share_by_person: { title: '担当者別の請求可能割合', description: '担当者ごとの承認済み工数と顧客に請求する割合' },
      },
    },
  },
};
