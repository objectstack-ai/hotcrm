// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the Order to Cash module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  hooks: {
    payment_plan_step_stamp: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'この請求書は別の取引先のものです。この入金の取引先の請求書を選んでください。',
          reasons: {
            named: { message: '{{invoice}}は別の取引先のものです。この入金の取引先の請求書を選んでください。' },
          },
        },
      },
    },
    billing_milestone_row_stamp: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'この契約は別の取引先のものです。この取引先の契約を選ぶか、取引先を空欄にして契約から設定してください。',
          reasons: {
            named: { message: '{{contract}}は別の取引先のものです。この取引先の契約を選ぶか、取引先を空欄にして契約から設定してください。' },
          order_named: { message: '{{order}}は別の取引先のものです。この取引先の注文を選ぶか、取引先を空欄にして注文から設定してください。' },
          order_contract: { message: '{{order}}は別の契約に属しています。契約を空欄にして注文から設定するか、注文自身の契約を選んでください。' },
          apart: { message: '{{order}}と{{contract}}は別の取引先のものです。同じ取引先の注文と契約を選んでください。' },
          },
        },
      },
    },
    invoice_row_stamp: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'この契約は別の取引先のものです。この取引先の契約を選ぶか、取引先を空欄にして契約から設定してください。',
          reasons: {
            named: { message: '{{contract}}は別の取引先のものです。この取引先の契約を選ぶか、取引先を空欄にして契約から設定してください。' },
          order_named: { message: '{{order}}は別の取引先のものです。この取引先の注文を選ぶか、取引先を空欄にして注文から設定してください。' },
          order_contract: { message: '{{order}}は別の契約に属しています。契約を空欄にして注文から設定するか、注文自身の契約を選んでください。' },
          apart: { message: '{{order}}と{{contract}}は別の取引先のものです。同じ取引先の注文と契約を選んでください。' },
          },
        },
      },
    },
    invoice_plan_step_guard: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'この入金計画は別の取引先のものです。この請求書の取引先の入金計画を選んでください。',
          reasons: {
            milestone_named: { message: '{{milestone}}は別の取引先のものです。この請求書の取引先の入金計画を選んでください。' },
          },
        },
      },
    },
    payment_row_stamp: {
      refusals: {
        VALIDATION_FAILED: {
          message: 'この契約は別の取引先のものです。この取引先の契約を選ぶか、取引先を空欄にして契約から設定してください。',
          reasons: {
            named: { message: '{{contract}}は別の取引先のものです。この取引先の契約を選ぶか、取引先を空欄にして契約から設定してください。' },
          order_named: { message: '{{order}}は別の取引先のものです。この取引先の注文を選ぶか、取引先を空欄にして注文から設定してください。' },
          order_contract: { message: '{{order}}は別の契約に属しています。契約を空欄にして注文から設定するか、注文自身の契約を選んでください。' },
          apart: { message: '{{order}}と{{contract}}は別の取引先のものです。同じ取引先の注文と契約を選んでください。' },
          },
        },
      },
    },
  },
  objects: {
    crm_billing_milestone: {
      label: '入金計画',
      pluralLabel: '入金計画',
      description: '受注または契約から立てた、取引先の入金計画の 1 ステップ：いつ、いくら入金予定で、そのうちいくら入金済か',
      _validations: {
        billing_milestone_source: { message: 'このステップが属する注文または契約を選択してください。' },
      },
      fields: {
        name: {
          label: 'マイルストーン',
          help: '契約上のこのステップの呼び名。例：「前払い 30%」「稼働開始」「2 年目」。',
        },
        crm_sales_order: {
          label: '注文',
        },
        crm_contract: {
          label: '契約',
        },
        crm_account: {
          label: '取引先',
        },
        planned_amount: {
          label: '予定金額',
        },
        planned_date: {
          label: '予定日',
        },
        accepted_date: {
          label: '検収日',
          help: '検収時払いのステップ：顧客が検収した日。',
        },
        received_amount: {
          label: '入金済',
        },
        open_amount: {
          label: '未入金',
        },
        description: {
          label: 'メモ',
        },
      },
      _views: {
        all_billing_milestones: {
          label: 'すべての入金計画',
        },
        planned_this_month: {
          label: '今月の入金予定',
        },
        overdue_billing_milestones: {
          label: '期日超過の入金計画',
        },
      },
      _sections: {
        basic: {
          label: '入金計画',
        },
        plan: {
          label: '計画',
        },
        figures: {
          label: '回収状況',
        },
      },
    },
    crm_invoice: {
      label: '請求書',
      pluralLabel: '請求書',
      description: '経理が取引先に発行した請求書（受注または契約にひも付く）',
      fields: {
        invoice_number: {
          label: '請求書番号',
          help: '経理が発行した請求書の番号。',
        },
        crm_sales_order: {
          label: '注文',
        },
        crm_contract: {
          label: '契約',
        },
        crm_billing_milestone: {
          label: '入金計画',
        },
        crm_account: {
          label: '取引先',
        },
        issue_date: {
          label: '発行日',
        },
        due_date: {
          label: '支払期日',
          help: '空欄の場合、発行日に契約の支払条件、契約にない場合は注文の支払条件を加えた日。どちらもない場合は入力してください。',
        },
        status: {
          label: 'ステータス',
          options: {
            issued: '発行済',
            cancelled: '取消',
          },
        },
        amount: {
          label: '金額',
          help: '発行額（税込）。',
        },
        paid_amount: {
          label: '入金済',
        },
        open_amount: {
          label: '未入金',
        },
        overpaid_amount: {
          label: '過入金',
          help: '請求額を超えて入金された額です。請求書は全額入金済みとして扱われ、超過分は他の請求書に充当されません。',
        },
        invoice_file: {
          label: '請求書ファイル',
        },
        source: {
          label: 'ソース',
          help: 'インポートには、スプレッドシート、会計ソフトのエクスポート、同じキーで書き込む ERP が含まれます。',
          options: {
            manual: '手入力',
            import: 'インポート',
          },
        },
        erp_ref: {
          label: 'ERP 参照番号',
          help: '経理システムでのこの請求書のキー。同じ参照番号の行をインポートすると、この請求書が更新されます。',
        },
        synced_at: {
          label: '同期日時',
        },
      },
      _views: {
        all_invoices: {
          label: 'すべての請求書',
        },
      },
      _sections: {
        basic: {
          label: '請求書',
        },
        source: {
          label: 'ソース',
        },
      },
    },
    crm_payment: {
      label: '入金',
      pluralLabel: '入金',
      description: '取引先からの入金：入金計画、受注、契約に対応するもの、またはまだどれにも対応しないもの',
      fields: {
        payment_number: {
          label: '入金番号',
        },
        crm_sales_order: {
          label: '注文',
        },
        crm_contract: {
          label: '契約',
        },
        crm_invoice: {
          label: '請求書',
        },
        crm_billing_milestone: {
          label: '入金計画',
        },
        crm_account: {
          label: '取引先',
        },
        payment_date: {
          label: '入金日',
        },
        amount: {
          label: '金額',
        },
        method: {
          label: '方法',
          options: {
            bank_transfer: '銀行振込',
            other: 'その他',
          },
        },
        source: {
          label: 'ソース',
          options: {
            manual: '手入力',
            import: 'インポート',
          },
        },
        erp_ref: {
          label: 'ERP 参照番号',
          help: '経理システムでのこの入金のキー。同じ参照番号の行をインポートすると、この入金が更新されます。',
        },
        synced_at: {
          label: '同期日時',
        },
      },
      _views: {
        all_payments: {
          label: 'すべての入金',
        },
      },
      _sections: {
        basic: {
          label: '入金',
        },
        source: {
          label: 'ソース',
        },
      },
    },
    // The order's figures, added by this package through `objectExtensions`
    // (hotcrm#2560).
    crm_sales_order: {
      // The rules this package adds to the order (hotcrm#2827).
      _validations: {
        reconfirm_total_below_received: { message: 'この受注の合計金額が、すでに入金された額（入金済）を下回っています。過入金または請求書を先に処理してから確定してください。' },
        reconfirm_total_below_invoiced: { message: 'この受注の合計金額が、すでに請求された額（請求済）を下回っています。請求書を先に取消または修正してから確定してください。' },
      },
      fields: {
        planned_amount: {
          label: '回収予定',
          help: '回収計画の各ステップの予定金額の合計。',
        },
        invoiced_amount: {
          label: '請求済',
          help: '発行済み請求書の金額の合計。取消済みの請求書は含みません。',
        },
        received_amount: {
          label: '入金済',
          help: '受領した入金の合計。',
        },
        unpaid_amount: {
          label: '未入金',
          help: '金額から入金済を差し引いた額（0 未満にはなりません）。',
        },
        uninvoiced_amount: {
          label: '未請求',
          help: '金額から請求済（発行済の請求書）を差し引いた額（0 未満にはなりません）。',
        },
        plan_differs: {
          label: '入金計画が受注金額と不一致',
          help: '入金計画の合計が受注の合計金額と一致しません。計画を編集・分割・追加して、受注金額と合うようにしてください。',
        },
      },
    },
    // The contract's and the account's receivables figures, added by this
    // package through `objectExtensions` (#2416).
    crm_contract: {
      fields: {
        planned_amount: {
          label: '回収予定',
          help: '回収計画の各ステップの予定金額の合計。',
        },
        invoiced_amount: {
          label: '請求済',
          help: '発行済み請求書の金額の合計。取消済みの請求書は含みません。',
        },
        received_amount: {
          label: '入金済',
          help: '受領した入金の合計。',
        },
        unpaid_amount: {
          label: '未入金',
          help: '契約に受注がある場合は受注金額、ない場合は契約金額から、入金済を差し引いた額（0 未満にはなりません）。',
        },
        uninvoiced_amount: {
          label: '未請求',
          help: '契約に受注がある場合は受注金額、ない場合は契約金額から、請求済（発行済の請求書）を差し引いた額（0 未満にはなりません）。',
        },
        order_count: {
          label: '受注数',
        },
      },
    },
    crm_account: {
      fields: {
        invoiced_amount: {
          label: '請求済',
          help: '発行済み請求書の金額の合計。取消済みの請求書は含みません。',
        },
        received_amount: {
          label: '入金済',
          help: '受領した入金の合計。',
        },
        unpaid_amount: {
          label: '未入金',
          help: '取引先の確定済・完了済の受注と、受注のない締結済の契約が、それぞれまだ入金されていない額（各金額から入金済を差し引き、0 未満にはしない）の合計。',
        },
        uninvoiced_amount: {
          label: '未請求',
          help: '取引先の確定済・完了済の受注と、受注のない締結済の契約が、それぞれまだ請求していない額（各金額から発行済の請求書を差し引き、0 未満にはしない）の合計。',
        },
        unpaid_on_orders: {
          label: '受注の未入金',
        },
        unpaid_on_contracts: {
          label: '契約の未入金',
        },
        uninvoiced_on_orders: {
          label: '受注の未請求',
        },
        uninvoiced_on_contracts: {
          label: '契約の未請求',
        },
      },
    },
  },
  apps: {
    // The ids this package contributes into the Sales app: the collection
    // plan the reps write, and the manual (#2465).
    crm_enterprise: {
      navigation: {
        nav_billing_milestones: {
          label: '入金計画',
        },
        nav_help_o2c: {
          label: '受注から入金マニュアル',
        },
      },
    },
    // This package's own app, finance's (#2465).
    crm_o2c: {
      label: '受注から入金',
      description: '請求書・入金・回収計画と、それらが属する契約と取引先',
      navigation: {
        group_receivables: { label: '売掛金' },
        group_follow_up: { label: 'フォローアップ' },
        group_customers: { label: '注文・契約・取引先' },
        group_work: { label: 'マイワーク' },
        group_help: { label: 'ヘルプ' },
        nav_invoices: { label: '請求書' },
        nav_payments: { label: '入金' },
        nav_billing_milestones: { label: '入金計画' },
        nav_overdue_billing_milestones: { label: '期日超過の入金計画' },
        nav_planned_this_month: { label: '今月の入金予定' },
        nav_approval_requests: { label: '受信トレイ' },
        nav_help_o2c: { label: '受注から入金マニュアル' },
      },
    },
  },
  books: {
    crm_o2c_manual: {
      label: 'HotCRM 受注から入金マニュアル',
      description: '回収計画、請求書、入金：各数値が何を数え、誰が入力するか。',
      groups: {
        o2c: {
          label: '受注から入金',
        },
      },
    },
  },
  // An import mapping's label, as the import wizard offers it (a key
  // since 18.6.0; before it the wizard showed the English text in every locale).
  mappings: {
    crm_invoice_import: { label: '請求書インポート (CSV)' },
    crm_payment_import: { label: '入金インポート (CSV)' },
  },
};
