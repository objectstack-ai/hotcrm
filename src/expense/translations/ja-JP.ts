// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the expense module's own translations (hotcrm#2556): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const jaJP: TranslationData = {
  hooks: {
    expense_decision_guard: {
      refusals: {
        FORBIDDEN: { message: '経費は提出後、承認者が受信トレイから承認または却下します。' },
      },
    },
    expense_request_decision_guard: {
      refusals: {
        FORBIDDEN: { message: '出張申請は提出後、承認者が受信トレイから承認または却下します。' },
      },
    },
    expense_request_line_lock: {
      refusals: {
        RECORD_LOCKED: {
          message: '出張申請 {{request}} は提出済みのため、行程はロックされています。記入できるのは予約番号だけです。変更するには下書きに取り消してください。',
          reasons: {
            approved: { message: '出張申請 {{request}} は承認済みのため、行程は確定しています。記入できるのは予約番号だけです。計画を変えるには出張を取り消し、新しい申請を出してください。' },
            cancelled: { message: '出張申請 {{request}} は取り消し済みのため、行程は確定しています。記入できるのは予約番号だけです。' },
            closed: { message: '出張申請 {{request}} は完了済みのため、行程は確定しています。記入できるのは予約番号だけです。' },
          },
        },
      },
    },
  },
  objects: {
    crm_expense: {
      label: '経費',
      pluralLabel: '経費',
      description: '従業員が会社のために支払った費用（領収書付き）',
      fields: {
        owner_id: { label: '支出者' },
        name: { label: '説明' },
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
        paid_by: {
          label: '支払者',
          help: '立て替えた従業員（精算対象）、または会社。',
          options: {
            employee: '従業員',
            company: '会社',
          },
        },
        merchant: { label: '支払先' },
        receipt_number: { label: '領収書番号' },
        source: {
          label: '登録元',
          help: '手入力、エージェントによる登録、またはインポート。',
          options: {
            manual: '手入力',
            agent: 'エージェント',
            import: 'インポート',
          },
        },
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
    // The travel request (hotcrm#2578).
    crm_expense_request: {
      label: '出張申請',
      pluralLabel: '出張申請',
      description: '出張前の申請：行き先、日程、目的、おおよその費用',
      fields: {
        owner_id: { label: '出張者' },
        request_number: { label: '申請番号' },
        name: { label: '出張目的' },
        destination: { label: '行き先' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        days: { label: '日数' },
        crm_account: { label: '取引先' },
        estimated_amount: { label: '見積金額', help: '出張全体の合計額（支払者を問わず）。' },
        itinerary: { label: '行程' },
        notes: { label: 'メモ' },
        source: {
          label: '登録元',
          help: '手入力、エージェントによる登録、またはインポート。',
          options: {
            manual: '手入力',
            agent: 'エージェント',
            import: 'インポート',
          },
        },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き',
            submitted: '提出済み',
            approved: '承認済み',
            rejected: '却下',
            cancelled: 'キャンセル',
            closed: '完了',
          },
        },
        approver: { label: '承認者' },
        review_notes: { label: '確認メモ', help: 'アシスタントやルールが見つけた点。承認者向け。' },
      },
      _views: {
        all_travel_requests: { label: 'すべての出張申請' },
        my_travel_requests: { label: '自分の出張申請' },
        travel_requests_to_approve: { label: '承認待ちの出張申請' },
      },
      _sections: {
        trip: { label: '出張' },
        review: { label: '承認' },
      },
      _validations: {
        expense_request_dates: { message: '終了日は開始日以降にしてください。' },
        expense_request_status_progression: { message: 'このステータス変更はできません。出張申請は 下書き → 提出済み → 承認済み または 却下 と進みます。却下された申請は下書きに戻して修正し、承認済みの申請は出張前にキャンセル、出張後に完了にします。' },
      },
      _actions: {
        submit_expense_request: { label: '提出', successMessage: '出張申請 {{ record.name }} を承認に提出しました。' },
        cancel_expense_request: { label: '出張をキャンセル', confirmText: 'この出張をキャンセルしますか？キャンセルした申請は再開できません。新しい計画は新たに申請してください。', successMessage: '出張申請 {{ record.name }} をキャンセルしました。' },
        close_expense_request: { label: '完了', successMessage: '出張申請 {{ record.name }} を完了にしました。' },
      },
    },
    crm_expense_request_line: {
      label: '行程明細',
      pluralLabel: '行程明細',
      description: '出張の1区間：何を予約するか、どこからどこへ、いつ',
      fields: {
        crm_expense_request: { label: '出張申請' },
        line_number: { label: '行番号' },
        kind: {
          label: '種別',
          options: {
            flight: '航空便',
            train: '列車',
            car: '車',
            hotel: 'ホテル',
            other: 'その他',
          },
        },
        origin: { label: '出発地' },
        destination: { label: '到着地', help: 'この区間の行き先、またはホテルの所在地。' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日', help: 'ホテルはチェックアウト日。日帰りの区間は空欄で構いません。' },
        details: { label: '要望', help: '座席、ホテルなどの要望。' },
        booking_reference: { label: '予約番号', help: '予約後に出張者、アシスタント、または手配した人が記入する確認番号。' },
      },
      _views: {
        all_itinerary_lines: { label: 'すべての行程明細' },
      },
      _sections: {
        leg: { label: '区間' },
        booking: { label: '予約' },
      },
      _validations: {
        expense_request_line_dates: { message: '終了日は開始日以降にしてください。' },
      },
    },
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_approval: {
      label: '経費承認',
      approvals: {
        approver_review: { label: '上長レビュー' },
        finance_review: { label: '財務管理者レビュー' },
      },
    },
    expense_approval_on_create: {
      label: '経費承認（作成時）',
      approvals: {
        approver_review: { label: '上長レビュー' },
        finance_review: { label: '財務管理者レビュー' },
      },
    },
    expense_project_approval: {
      label: 'プロジェクト経費承認',
      approvals: {
        approver_review: { label: 'プロジェクトマネージャー審査' },
        finance_review: { label: '財務コントローラー審査' },
      },
    },
    expense_project_approval_on_create: {
      label: 'プロジェクト経費承認（作成時）',
      approvals: {
        approver_review: { label: 'プロジェクトマネージャー審査' },
        finance_review: { label: '財務コントローラー審査' },
      },
    },
    expense_request_approval: {
      label: '出張申請の承認',
      approvals: {
        approver_review: { label: '上長レビュー' },
      },
    },
    expense_request_approval_on_create: {
      label: '出張申請の承認（作成時）',
      approvals: {
        approver_review: { label: '上長レビュー' },
      },
    },
  },
  apps: {
    crm_expenses: {
      label: '経費精算',
      description: '会社のために支払った経費と領収書、事前に申請する出張、そしてあなたの承認を待つもの',
      navigation: {
        group_expenses: { label: '経費' },
        nav_my_expenses: { label: '自分の経費' },
        nav_expenses_to_approve: { label: '承認待ちの経費' },
        nav_all_expenses: { label: 'すべての経費' },
        group_travel_requests: { label: '出張申請' },
        nav_my_travel_requests: { label: '自分の出張申請' },
        nav_travel_requests_to_approve: { label: '承認待ちの出張申請' },
        nav_all_travel_requests: { label: 'すべての出張申請' },
        group_work: { label: 'マイワーク' },
        nav_approval_requests: { label: '受信トレイ' },
        group_help: { label: 'ヘルプ' },
        nav_help_expense: { label: '経費精算マニュアル' },
      },
    },
    // My Expenses and Expenses to Approve, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: '自分の経費' },
        nav_expenses_to_approve: { label: '承認待ちの経費' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'HotCRM 経費精算マニュアル',
      description: '領収書付きの経費の登録、出張前の申請、承認者、プロジェクトに計上されるもの。',
      groups: { expense: { label: '経費精算' } },
    },
  },
};
