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
  },
  apps: {
    crm_expenses: {
      label: '経費精算',
      description: '会社のために支払った経費とその領収書、そしてあなたの承認を待つ経費',
      navigation: {
        group_expenses: { label: '経費' },
        nav_my_expenses: { label: '自分の経費' },
        nav_expenses_to_approve: { label: '承認待ちの経費' },
        nav_all_expenses: { label: 'すべての経費' },
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
      description: '領収書付きの経費の記録、承認者、そしてプロジェクトに計上されるもの。',
      groups: { expense: { label: '経費精算' } },
    },
  },
};
