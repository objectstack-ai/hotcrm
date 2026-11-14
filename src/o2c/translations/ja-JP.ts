// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the Order to Cash module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  objects: {
    crm_billing_milestone: {
      label: '請求マイルストーン',
      pluralLabel: '請求マイルストーン',
      description: '契約の回収計画の 1 ステップ：いつ、いくら回収するか、そのうち請求済・入金済の金額',
      fields: {
        name: {
          label: 'マイルストーン',
          help: '契約上のこのステップの呼び名。例：「前払い 30%」「稼働開始」「2 年目」。',
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
        invoiced_amount: {
          label: '請求済',
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
          label: 'すべての請求マイルストーン',
        },
        planned_this_month: {
          label: '今月の入金予定',
        },
      },
      _sections: {
        basic: {
          label: 'マイルストーン',
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
      description: '経理が契約に対して発行した請求書と、その入金済の金額',
      fields: {
        invoice_number: {
          label: '請求書番号',
          help: '経理が発行した請求書の番号。',
        },
        crm_contract: {
          label: '契約',
        },
        crm_billing_milestone: {
          label: '請求マイルストーン',
        },
        crm_account: {
          label: '取引先',
        },
        issue_date: {
          label: '発行日',
        },
        due_date: {
          label: '支払期日',
          help: '空欄の場合、発行日に契約の支払条件を加えた日。',
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
        overdue_invoices: {
          label: '期日超過の請求書',
        },
      },
      _sections: {
        basic: {
          label: '請求書',
        },
        amounts: {
          label: '金額',
        },
        source: {
          label: 'ソース',
        },
      },
    },
    crm_payment: {
      label: '入金',
      pluralLabel: '入金',
      description: '契約、請求書または請求マイルストーンに対して受け取った入金',
      fields: {
        payment_number: {
          label: '入金番号',
        },
        crm_contract: {
          label: '契約',
        },
        crm_invoice: {
          label: '請求書',
        },
        crm_billing_milestone: {
          label: '請求マイルストーン',
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
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_billing_milestones: {
          label: '請求マイルストーン',
        },
        nav_invoices: {
          label: '請求書',
        },
        nav_payments: {
          label: '入金',
        },
        nav_help_o2c: {
          label: '受注から入金マニュアル',
        },
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
};
