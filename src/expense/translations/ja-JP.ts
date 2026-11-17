// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the expense module's own translations (hotcrm#2556, hotcrm#2559): every
 * row whose target this package registers. The object's rows moved here from
 * Project Delivery with the object; the Project field's label stays in that
 * module's pack, which contributes the field. Why per package: `./index.ts`.
 */
export const jaJP: TranslationData = {
  hooks: {
    expense_line_lock: {
      refusals: {
        RECORD_LOCKED: {
          message: 'この経費は提出済みの経費精算書に含まれているため、変更できません。',
          reasons: {
            in_review: { message: '経費 {{name}} は経費精算書 {{report}} に含まれており、承認待ちです。変更するには精算書を取り消してください。' },
            rejected: { message: '経費 {{name}} は経費精算書 {{report}} に含まれており、却下されました。修正するには精算書を下書きに戻してください。' },
            decided: { message: '経費 {{name}} は経費精算書 {{report}} に含まれており、承認済みのため変更できません。' },
          },
        },
      },
    },
    expense_report_rules: {
      refusals: {
        FORBIDDEN: {
          message: '経費精算書は提出後、承認者が受信トレイから承認または却下します。',
          reasons: {
            decide: { message: '経費精算書は提出後、承認者が受信トレイから承認または却下します。' },
            pay: { message: '経費精算書は承認後、財務が「支払済みにする」で支払済みにします。' },
          },
        },
        VALIDATION_FAILED: {
          message: '提出する前に、この経費精算書に経費を追加してください。',
          reasons: {
            no_expenses: { message: '提出する前に、経費精算書 {{name}} に経費を追加してください。' },
          },
        },
        RECORD_LOCKED: {
          message: 'この経費精算書は変更できません。',
          reasons: {
            approved: { message: '経費精算書 {{name}} は承認済みのため変更できません。財務が支払済みにします。' },
            paid: { message: '経費精算書 {{name}} は支払済みのため変更できません。' },
            delete: { message: '削除できるのは下書きの経費精算書のみです。経費精算書 {{name}} は提出済みです。' },
          },
        },
      },
    },
    expense_request_decision_guard: {
      refusals: {
        FORBIDDEN: { message: '出張申請は提出後、承認者が受信トレイから承認または却下します。' },
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
        crm_expense_report: { label: '経費精算書' },
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
        my_expenses: {
          label: '自分の経費',
          bulkActions: {
            delete: { label: '削除', confirmLabel: '削除', confirmText: '{{count}} 件の経費を完全に削除しますか？この操作は元に戻せません。' },
          },
        },
      },
      _sections: {
        basic: { label: '経費' },
      },
      _validations: {
        expense_status_progression: { message: 'このステータス変更はできません。経費は精算書に従います：下書き → 提出済み → 承認済みまたは却下。精算書が取り消されるか修正に戻されると下書きに戻ります。' },
      },
      _actions: {
        submit_for_reimbursement: { label: '精算を申請', successMessage: '精算を申請しました。「自分の精算書」で進捗を確認できます。' },
      },
    },
    crm_expense_report: {
      label: '経費精算書',
      pluralLabel: '経費精算書',
      description: 'まとめて承認され、従業員に払い戻される経費',
      fields: {
        owner_id: { label: '提出者' },
        report_number: { label: '精算書番号' },
        name: { label: 'タイトル' },
        crm_account: { label: '取引先', help: '支出の対象となった顧客（ある場合）。' },
        total_amount: { label: '合計' },
        reimbursable_amount: { label: '払戻額', help: '従業員が立て替えた経費。' },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き',
            submitted: '提出済み',
            approved: '承認済み',
            paid: '支払済み',
            rejected: '却下',
          },
        },
        approver: { label: '承認者' },
        submitted_date: { label: '提出日時' },
        approved_date: { label: '承認日時' },
        description: { label: '備考' },
        review_notes: { label: 'チェックメモ', help: 'チェックで見つかった点。承認者が読みます。' },
        payment_date: { label: '支払日' },
        payment_reference: { label: '支払参照番号' },
      },
      _views: {
        all_expense_reports: { label: 'すべての経費精算書' },
        my_expense_reports: { label: '自分の精算書' },
        expense_reports_to_approve: { label: '承認待ちの精算書' },
        expense_reports_to_pay: { label: '支払待ちの精算書' },
      },
      _sections: {
        basic: { label: '経費精算書' },
        payment: { label: '支払' },
      },
      _validations: {
        expense_report_status_progression: { message: 'このステータス変更はできません。精算書は 下書き → 提出済み → 承認済み → 支払済み と進みます。提出済みの精算書は下書きに取り消せ、却下された精算書は下書きに戻して修正します。' },
      },
      _actions: {
        submit_expense_report: { label: '提出', successMessage: '経費精算書 {{ record.name }} を承認に提出しました。' },
        reopen_expense_report: { label: '下書きに戻す', successMessage: '経費精算書 {{ record.name }} を下書きに戻しました。' },
        mark_expense_report_paid: {
          label: '支払済みにする',
          successMessage: '経費精算書 {{ record.name }} を支払済みにしました。',
          params: {
            payment_date: { label: '支払日' },
            payment_reference: { label: '支払参照番号' },
          },
        },
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
  },
  // Step names the approval request shows the submitter and the approvers.
  flows: {
    expense_report_approval: {
      label: '経費精算書承認',
      approvals: {
        approver_review: { label: '上長レビュー' },
        finance_review: { label: '財務管理者レビュー' },
      },
    },
    expense_report_project_approval: {
      label: 'プロジェクト経費精算書承認',
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
      description: '会社のために支払った経費と領収書、事前に申請する出張、それを払い戻す精算書、そしてあなたの承認を待つもの',
      navigation: {
        group_expenses: { label: '経費' },
        nav_my_expenses: { label: '自分の経費' },
        nav_my_expense_reports: { label: '自分の精算書' },
        nav_expense_reports_to_approve: { label: '承認待ちの精算書' },
        nav_expense_reports_to_pay: { label: '支払待ちの精算書' },
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
    // My Expenses and Reports to Approve, contributed into the Project Delivery app.
    crm_psa: {
      navigation: {
        nav_my_expenses: { label: '自分の経費' },
        nav_expense_reports_to_approve: { label: '承認待ちの精算書' },
      },
    },
  },
  books: {
    crm_expense_manual: {
      label: 'HotCRM 経費精算マニュアル',
      description: '領収書付きの経費の登録、出張前の申請、精算書での提出、承認者、払い戻し、プロジェクトに計上されるもの。',
      groups: { expense: { label: '経費精算' } },
    },
  },
};
