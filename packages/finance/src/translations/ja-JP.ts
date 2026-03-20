import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — Finance Cloud Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
export const jaJP: TranslationData = {
  objects: {
    contract: {
      label: '契約',
      pluralLabel: '契約',
      fields: {
        contract_number: { label: '契約番号' },
        account: { label: '取引先' },
        opportunity: { label: '商談' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', 'In Approval': '承認中', Activated: '有効',
            'On Hold': '保留中', Completed: '完了', Terminated: '解約済み',
          },
        },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        contract_term: { label: '契約期間（月）', help: '契約の期間（月単位）' },
        contract_value: { label: '契約金額' },
      },
    },

    invoice: {
      label: '請求書',
      pluralLabel: '請求書',
      fields: {
        invoice_number: { label: '請求書番号' },
        account: { label: '取引先' },
        contract: { label: '契約' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Posted: '転記済み', Paid: '入金済み', Void: '無効' },
        },
        total_amount: { label: '合計金額' },
        due_date: { label: '支払期日' },
        payment_terms: {
          label: '支払条件',
          options: {
            'Due on Receipt': '受領後即時', 'Net 15': '15日以内',
            'Net 30': '30日以内', 'Net 60': '60日以内',
          },
        },
        line_item_count: { label: '明細数', help: 'この請求書の明細行数' },
        calculated_subtotal: { label: '小計' },
      },
    },

    invoice_line: {
      label: '請求明細',
      pluralLabel: '請求明細',
      fields: {
        invoice: { label: '請求書' },
        product: { label: '商品' },
        description: { label: '説明' },
        quantity: { label: '数量' },
        unit_price: { label: '単価' },
        amount: { label: '金額' },
      },
    },

    payment: {
      label: '入金',
      pluralLabel: '入金',
      fields: {
        payment_number: { label: '入金番号' },
        name: { label: '入金名' },
        type: {
          label: 'タイプ',
          options: {
            'Down Payment': '前払金', 'Milestone Payment': 'マイルストーン支払',
            'Delivery Payment': '納品時支払', 'Acceptance Payment': '検収時支払',
            'Final Payment': '最終支払', 'Recurring Payment': '定期支払',
            'Maintenance Fee': '保守料', Other: 'その他',
          },
        },
        status: {
          label: 'ステータス',
          options: {
            Planned: '予定', Invoiced: '請求済み', Received: '入金済み',
            Overdue: '延滞', 'Written Off': '償却済み', Cancelled: 'キャンセル',
          },
        },
        account: { label: '取引先' },
        opportunity: { label: '関連商談' },
        contract: { label: '関連契約' },
        quote: { label: '関連見積' },
        planned_amount: { label: '予定金額' },
        received_amount: { label: '入金済金額' },
        planned_date: { label: '予定日' },
        actual_date: { label: '実績日' },
        payment_method: {
          label: '支払方法',
          options: {
            'Bank Transfer': '銀行振込', Check: '小切手', Cash: '現金',
            'Credit Card': 'クレジットカード', Alipay: 'Alipay',
            'WeChat Pay': 'WeChat Pay', Other: 'その他',
          },
        },
        invoice_number: { label: '請求書番号' },
      },
    },

    credit_note: {
      label: 'クレジットノート',
      pluralLabel: 'クレジットノート',
      fields: {
        credit_note_number: { label: 'クレジットノート番号' },
        invoice_id: { label: '元請求書' },
        account_id: { label: '取引先' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き', Issued: '発行済み', Applied: '適用済み', Void: '無効' },
        },
        credit_date: { label: '発行日' },
        amount: { label: 'クレジット金額' },
        tax_amount: { label: '税額' },
        total_amount: { label: '合計金額' },
        reason: {
          label: '理由',
          options: {
            'Billing Error': '請求エラー', 'Product Return': '商品返品',
            'Service Issue': 'サービス問題', 'Price Adjustment': '価格調整',
            'Duplicate Payment': '二重支払', 'Contract Cancellation': '契約キャンセル',
            Other: 'その他',
          },
        },
        notes: { label: '備考' },
        applied_to_invoice_id: { label: '適用先請求書' },
        remaining_balance: { label: '残高' },
        approved_by_id: { label: '承認者' },
        approved_date: { label: '承認日' },
      },
    },

    billing_schedule: {
      label: '請求スケジュール',
      pluralLabel: '請求スケジュール',
      fields: {
        name: { label: 'スケジュール名' },
        contract_id: { label: '契約' },
        account_id: { label: '取引先' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', Active: '有効', Paused: '一時停止',
            Completed: '完了', Cancelled: 'キャンセル',
          },
        },
        frequency: {
          label: '請求頻度',
          options: {
            Weekly: '毎週', Monthly: '毎月', Quarterly: '四半期',
            'Semi-Annually': '半年', Annually: '年次', Custom: 'カスタム',
          },
        },
        billing_day: { label: '請求日', help: '毎月の請求書生成日' },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        next_billing_date: { label: '次回請求日' },
        amount: { label: '請求金額' },
        tax_rate: { label: '税率' },
        total_billed: { label: '累計請求額' },
        total_remaining: { label: '残額' },
        invoices_generated: { label: '生成済み請求書数', help: 'このスケジュールで作成された請求書の総数' },
        auto_generate_invoice: { label: '請求書自動生成' },
        payment_terms: {
          label: '支払条件',
          options: {
            'Due on Receipt': '受領後即時', 'Net 15': '15日以内',
            'Net 30': '30日以内', 'Net 45': '45日以内',
            'Net 60': '60日以内', 'Net 90': '90日以内',
          },
        },
        last_invoice_date: { label: '前回請求日' },
        owner_id: { label: '所有者' },
      },
    },

    revenue_schedule: {
      label: '収益認識スケジュール',
      pluralLabel: '収益認識スケジュール',
      fields: {
        name: { label: 'スケジュール名' },
        contract_id: { label: '契約' },
        invoice_id: { label: '請求書' },
        recognition_rule_id: { label: '認識ルール' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き', Active: '有効', Completed: '完了',
            Suspended: '一時停止', Cancelled: 'キャンセル',
          },
        },
        total_amount: { label: '合計金額' },
        recognized_amount: { label: '認識済み金額' },
        deferred_amount: { label: '繰延金額' },
        recognition_start_date: { label: '認識開始日' },
        recognition_end_date: { label: '認識終了日' },
        recognition_method: {
          label: '認識方法',
          options: {
            'Straight Line': '定額法', Milestone: 'マイルストーン法',
            'Percentage of Completion': '進捗度法',
            'Point in Time': '一時点認識', 'As Invoiced': '請求時認識',
          },
        },
        frequency: {
          label: '認識頻度',
          options: { Monthly: '毎月', Quarterly: '四半期', Annually: '年次' },
        },
        periods_total: { label: '総期間数' },
        periods_recognized: { label: '認識済み期間数' },
        amount_per_period: { label: '期間あたり金額' },
        next_recognition_date: { label: '次回認識日' },
        last_recognition_date: { label: '前回認識日' },
        currency_code: { label: '通貨' },
        notes: { label: '備考' },
        owner_id: { label: '所有者' },
      },
    },

    revenue_recognition_rule: {
      label: '収益認識ルール',
      pluralLabel: '収益認識ルール',
      fields: {
        name: { label: 'ルール名' },
        description: { label: '説明' },
        rule_type: {
          label: 'ルールタイプ',
          options: {
            'Product-Based': '製品ベース', 'Service-Based': 'サービスベース',
            Subscription: 'サブスクリプション', License: 'ライセンス',
            Milestone: 'マイルストーン', Custom: 'カスタム',
          },
        },
        recognition_method: {
          label: 'デフォルト方法',
          options: {
            'Straight Line': '定額法', Milestone: 'マイルストーン法',
            'Percentage of Completion': '進捗度法',
            'Point in Time': '一時点認識', 'As Invoiced': '請求時認識',
          },
        },
        applicable_products: { label: '対象製品' },
        performance_obligation: { label: '履行義務' },
        recognition_trigger: {
          label: '認識トリガー',
          options: {
            'Contract Start': '契約開始', 'Service Delivery': 'サービス提供',
            'Customer Acceptance': '顧客検収', 'Milestone Completion': 'マイルストーン達成',
            'Invoice Date': '請求日',
          },
        },
        is_active: { label: '有効' },
        effective_date: { label: '有効開始日' },
        expiration_date: { label: '有効終了日' },
        compliance_standard: {
          label: '準拠基準',
          options: { 'ASC 606': 'ASC 606', 'IFRS 15': 'IFRS 15', Both: '両方' },
        },
        auto_create_schedule: { label: 'スケジュール自動作成' },
        priority: { label: '優先度', help: '数値が小さいほど優先度が高い' },
        owner_id: { label: '所有者' },
      },
    },

    payment_method: {
      label: '支払方法',
      pluralLabel: '支払方法',
      fields: {
        account_id: { label: '取引先' },
        type: {
          label: '支払タイプ',
          options: {
            'Credit Card': 'クレジットカード', 'Bank Transfer (ACH)': '銀行振込 (ACH)',
            'Wire Transfer': '電信送金', Check: '小切手',
            PayPal: 'PayPal', 'Direct Debit': '口座振替',
          },
        },
        status: {
          label: 'ステータス',
          options: {
            Active: '有効', Expired: '期限切れ',
            Inactive: '無効', 'Verification Pending': '確認待ち',
          },
        },
        is_default: { label: 'デフォルト支払方法' },
        card_last_four: { label: 'カード下4桁' },
        card_brand: {
          label: 'カードブランド',
          options: { Visa: 'Visa', Mastercard: 'Mastercard', Amex: 'Amex', Discover: 'Discover' },
        },
        expiration_month: { label: '有効期限（月）' },
        expiration_year: { label: '有効期限（年）' },
        bank_name: { label: '銀行名' },
        bank_account_last_four: { label: '口座番号下4桁' },
        billing_address: { label: '請求先住所' },
        nickname: { label: 'ニックネーム' },
        payment_gateway: { label: '決済ゲートウェイ' },
        gateway_token: { label: 'ゲートウェイトークン' },
        last_used_date: { label: '最終利用日' },
        verified: { label: '確認済み' },
        owner_id: { label: '所有者' },
      },
    },
  },

  apps: {
    finance: {
      label: '財務',
      description: '契約・請求書・入金・収益認識を管理するレベニュークラウド',
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
    'common.import': 'インポート',
    'common.back': '戻る',
    'common.confirm': '確認',
    'common.refresh': '更新',
    'nav.finance': '財務',
    'nav.revenue_recognition': '収益認識',
    'nav.views_dashboards': 'ビュー＆ダッシュボード',
    'nav.finance_dashboard': '財務ダッシュボード',
    'success.saved': 'レコードを保存しました',
    'success.deleted': 'レコードを削除しました',
    'success.invoice_posted': '請求書を転記しました',
    'success.payment_received': '入金を記録しました',
    'success.contract_activated': '契約を有効化しました',
    'success.credit_note_issued': 'クレジットノートを発行しました',
    'success.revenue_recognized': '収益を認識しました',
    'confirm.delete': 'このレコードを削除してもよろしいですか？',
    'confirm.post_invoice': 'この請求書を転記しますか？この操作は取り消せません。',
    'confirm.void_invoice': 'この請求書を無効にしますか？関連するすべてのエントリが取り消されます。',
    'confirm.activate_contract': 'この契約を有効化しますか？',
    'error.required': 'この項目は必須です',
    'error.load_failed': 'データの読み込みに失敗しました',
    'error.save_failed': 'レコードの保存に失敗しました',
    'error.payment_failed': '決済処理に失敗しました',
    'error.invoice_generation_failed': '請求書の生成に失敗しました',
  },

  validationMessages: {
    contract_dates_invalid: '契約終了日は開始日より後の日付にしてください',
    invoice_amount_required: '請求金額はゼロより大きい値にしてください',
    payment_exceeds_invoice: '入金金額が請求書の合計を超えています',
    credit_note_exceeds_invoice: 'クレジットノートの金額は元の請求書の合計を超えることはできません',
    billing_schedule_dates_invalid: '請求スケジュールの終了日は開始日より後の日付にしてください',
    revenue_amount_mismatch: '認識済み金額は合計金額を超えることはできません',
    payment_method_expired: 'この支払方法は期限切れです',
    duplicate_invoice_number: 'この請求書番号はすでに存在します',
  },
};
