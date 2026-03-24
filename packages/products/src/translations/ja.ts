import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja) — Products & Pricing Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 */
export const ja: TranslationData = {
  objects: {
    product: {
      label: '商品',
      pluralLabel: '商品',
      fields: {
        name: { label: '商品名' },
        product_code: { label: '商品コード' },
        description: { label: '説明' },
        family: {
          label: '商品ファミリー',
          options: {
            Hardware: 'ハードウェア', Software: 'ソフトウェア', Service: 'サービス',
            Subscription: 'サブスクリプション', Consulting: 'コンサルティング', Training: 'トレーニング',
            Support: 'サポート', License: 'ライセンス', Other: 'その他',
          },
        },
        is_active: { label: '有効' },
        unit_price: { label: '単価' },
        cost: { label: '原価' },
        quantity_in_stock: { label: '在庫数量' },
      },
    },

    pricebook: {
      label: '価格表',
      pluralLabel: '価格表',
      fields: {
        name: { label: '価格表名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        is_standard: { label: '標準価格表', help: 'デフォルトの価格表として指定します' },
        currency_code: { label: '通貨' },
        effective_date: { label: '有効開始日' },
        expiration_date: { label: '有効終了日' },
      },
    },

    quote: {
      label: '見積',
      pluralLabel: '見積',
      fields: {
        quote_number: { label: '見積番号' },
        name: { label: '見積名' },
        opportunity_id: { label: '商談' },
        account_id: { label: '取引先' },
        contact_id: { label: '取引先責任者' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き 📝', 'Needs Review': 'レビュー待ち 🔍', 'In Review': 'レビュー中 🔎',
            Approved: '承認済み ✅', Rejected: '却下 ❌', Presented: '提示済み 📊',
            Accepted: '受諾済み 🤝',
          },
        },
        expiration_date: { label: '有効期限' },
        subtotal: { label: '小計' },
        discount: { label: '値引き' },
        total_price: { label: '合計金額' },
        tax: { label: '税額' },
        grand_total: { label: '総計' },
        pricebook_id: { label: '価格表' },
        description: { label: '説明' },
        billing_name: { label: '請求先名' },
        billing_street: { label: '請求先住所（番地）' },
        billing_city: { label: '請求先住所（市区町村）' },
        billing_state: { label: '請求先住所（都道府県）' },
        billing_postal_code: { label: '請求先郵便番号' },
        billing_country: { label: '請求先国' },
        shipping_name: { label: '納品先名' },
        shipping_street: { label: '納品先住所（番地）' },
        shipping_city: { label: '納品先住所（市区町村）' },
        shipping_state: { label: '納品先住所（都道府県）' },
        shipping_postal_code: { label: '納品先郵便番号' },
        shipping_country: { label: '納品先国' },
        line_item_count: { label: '明細数', help: 'この見積の明細行数' },
        owner_id: { label: '所有者' },
      },
    },

    quote_line_item: {
      label: '見積明細',
      pluralLabel: '見積明細',
      fields: {
        quote_id: { label: '見積' },
        product_id: { label: '商品' },
        quantity: { label: '数量' },
        unit_price: { label: '単価' },
        discount: { label: '割引 (%)' },
        total_price: { label: '合計金額' },
        sort_order: { label: '表示順' },
        description: { label: '説明' },
        service_date: { label: 'サービス日' },
      },
    },

    product_bundle: {
      label: '商品バンドル',
      pluralLabel: '商品バンドル',
      fields: {
        name: { label: 'バンドル名' },
        description: { label: '説明' },
        status: {
          label: 'ステータス',
          options: { Draft: '下書き 📝', Active: '有効 ✅', Retired: '廃止 🚫' },
        },
        bundle_price: { label: 'バンドル価格' },
        component_count: { label: 'コンポーネント数', help: 'このバンドルに含まれる商品の数' },
        discount_type: {
          label: '割引タイプ',
          options: { Percentage: 'パーセント', 'Fixed Amount': '固定金額', None: 'なし' },
        },
        discount_value: { label: '割引値' },
        is_configurable: { label: '構成可能', help: '購入者がバンドル内容をカスタマイズ可能にする' },
        valid_from: { label: '有効開始日' },
        valid_to: { label: '有効終了日' },
        min_quantity: { label: '最小数量' },
        max_quantity: { label: '最大数量' },
        owner_id: { label: '所有者' },
      },
    },

    product_bundle_component: {
      label: 'バンドルコンポーネント',
      pluralLabel: 'バンドルコンポーネント',
      fields: {
        bundle_id: { label: 'バンドル' },
        product_id: { label: '商品' },
        quantity: { label: '数量' },
        is_required: { label: '必須' },
        is_default: { label: 'デフォルト選択' },
        sort_order: { label: '表示順' },
        min_quantity: { label: '最小数量' },
        max_quantity: { label: '最大数量' },
        discount_override: { label: '割引オーバーライド', help: 'このコンポーネントのバンドルレベル割引を上書き' },
      },
    },

    price_rule: {
      label: '価格ルール',
      pluralLabel: '価格ルール',
      fields: {
        name: { label: 'ルール名' },
        description: { label: '説明' },
        type: {
          label: 'ルールタイプ',
          options: {
            Discount: '割引', Surcharge: '追加料金', Override: 'オーバーライド',
            Tiered: '段階制', Volume: 'ボリューム', Bundle: 'バンドル',
          },
        },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き 📝', Active: '有効 ✅',
            Inactive: '無効 ⏸️', Expired: '期限切れ ⏰',
          },
        },
        priority: { label: '優先度', help: '数値が小さいほど優先度が高い' },
        target_object: { label: '対象オブジェクト' },
        condition: { label: '条件' },
        discount_type: {
          label: '割引タイプ',
          options: { Percentage: 'パーセント', 'Fixed Amount': '固定金額' },
        },
        discount_value: { label: '割引値' },
        effective_date: { label: '有効開始日' },
        expiration_date: { label: '有効終了日' },
        owner_id: { label: '所有者' },
      },
    },

    approval_request: {
      label: '承認申請',
      pluralLabel: '承認申請',
      fields: {
        name: { label: '申請名' },
        related_object_type: { label: '関連オブジェクト' },
        related_record_id: { label: '関連レコード' },
        status: {
          label: 'ステータス',
          options: {
            Pending: '承認待ち ⏳', Approved: '承認済み ✅', Rejected: '却下 ❌',
            Recalled: '取り消し 🔄', Escalated: 'エスカレーション 🔺',
          },
        },
        submitted_by_id: { label: '申請者' },
        submitted_date: { label: '申請日' },
        approver_id: { label: '承認者' },
        approved_date: { label: '承認/却下日' },
        comments: { label: 'コメント' },
        approval_chain: { label: '承認チェーン', help: '承認ステップの順序リスト' },
        current_step: { label: '現在のステップ' },
        total_steps: { label: '合計ステップ数' },
        priority: {
          label: '優先度',
          options: { Low: '低', Medium: '中', High: '高 ⚡', Critical: '緊急 🔥' },
        },
        due_date: { label: '期限' },
      },
    },

    discount_schedule: {
      label: '割引スケジュール',
      pluralLabel: '割引スケジュール',
      fields: {
        name: { label: 'スケジュール名' },
        description: { label: '説明' },
        type: {
          label: 'スケジュールタイプ',
          options: { Volume: 'ボリューム', Tiered: '段階制', Slab: 'スラブ' },
        },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き 📝', Active: '有効 ✅',
            Inactive: '無効 ⏸️', Expired: '期限切れ ⏰',
          },
        },
        pricebook_id: { label: '価格表' },
        product_id: { label: '商品' },
        effective_date: { label: '有効開始日' },
        expiration_date: { label: '有効終了日' },
        discount_unit: {
          label: '割引単位',
          options: { Percentage: 'パーセント', 'Fixed Amount': '固定金額' },
        },
        tiers: { label: '割引ティア', help: '数量ベースの割引ティア定義' },
        owner_id: { label: '所有者' },
      },
    },

    order: {
      label: '注文',
      pluralLabel: '注文',
      fields: {
        order_number: { label: '注文番号' },
        account_id: { label: '取引先' },
        contract_id: { label: '契約' },
        quote_id: { label: '見積' },
        opportunity_id: { label: '商談' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き 📝', Activated: '有効化済み 🚀',
            Fulfilled: '完了 ✅', Cancelled: 'キャンセル ❌',
          },
        },
        order_date: { label: '注文日' },
        effective_date: { label: '有効開始日' },
        total_amount: { label: '合計金額' },
        billing_street: { label: '請求先住所（番地）' },
        billing_city: { label: '請求先住所（市区町村）' },
        billing_state: { label: '請求先住所（都道府県）' },
        billing_postal_code: { label: '請求先郵便番号' },
        billing_country: { label: '請求先国' },
        shipping_street: { label: '納品先住所（番地）' },
        shipping_city: { label: '納品先住所（市区町村）' },
        shipping_state: { label: '納品先住所（都道府県）' },
        shipping_postal_code: { label: '納品先郵便番号' },
        shipping_country: { label: '納品先国' },
        description: { label: '説明' },
        owner_id: { label: '所有者' },
      },
    },

    order_item: {
      label: '注文明細',
      pluralLabel: '注文明細',
      fields: {
        order_id: { label: '注文' },
        product_id: { label: '商品' },
        quantity: { label: '数量' },
        unit_price: { label: '単価' },
        total_price: { label: '合計金額' },
        description: { label: '説明' },
        service_date: { label: 'サービス日' },
      },
    },

    subscription: {
      label: 'サブスクリプション',
      pluralLabel: 'サブスクリプション',
      fields: {
        name: { label: 'サブスクリプション名' },
        account_id: { label: '取引先' },
        product_id: { label: '商品' },
        quote_id: { label: '見積' },
        status: {
          label: 'ステータス',
          options: {
            Draft: '下書き 📝', Active: '有効 ✅', Suspended: '一時停止 ⏸️',
            Cancelled: 'キャンセル ❌', Expired: '期限切れ ⏰',
          },
        },
        start_date: { label: '開始日' },
        end_date: { label: '終了日' },
        billing_frequency: {
          label: '請求頻度',
          options: {
            Monthly: '月次', Quarterly: '四半期',
            'Semi-Annually': '半期', Annually: '年次',
          },
        },
        unit_price: { label: '単価' },
        quantity: { label: '数量' },
        total_contract_value: { label: '契約総額', help: 'サブスクリプション期間の総額' },
        auto_renew: { label: '自動更新' },
        renewal_term: { label: '更新期間（月）' },
        cancellation_date: { label: 'キャンセル日' },
        cancellation_reason: { label: 'キャンセル理由' },
        next_billing_date: { label: '次回請求日' },
        owner_id: { label: '所有者' },
      },
    },

    product_option: {
      label: '商品オプション',
      pluralLabel: '商品オプション',
      fields: {
        product_id: { label: '商品' },
        name: { label: 'オプション名' },
        type: {
          label: 'オプションタイプ',
          options: {
            Color: 'カラー', Size: 'サイズ', Configuration: '構成',
            'Add-On': 'アドオン', Upgrade: 'アップグレード',
          },
        },
        values: { label: '選択可能な値' },
        default_value: { label: 'デフォルト値' },
        is_required: { label: '必須' },
        price_adjustment: { label: '価格調整' },
        adjustment_type: {
          label: '調整タイプ',
          options: { Fixed: '固定', Percentage: 'パーセント' },
        },
        sort_order: { label: '表示順' },
      },
    },
  },

  apps: {
    products: {
      label: '製品と価格',
      description: '製品カタログ、価格ルール、CPQ機能',
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
    'nav.products_pricing': '製品と価格',
    'nav.subscriptions': 'サブスクリプション',
    'nav.views_dashboards': 'ビュー＆ダッシュボード',
    'nav.quote_approval_timeline': '見積承認タイムライン',
    'nav.cpq_dashboard': 'CPQダッシュボード',
    'success.saved': 'レコードを保存しました',
    'success.deleted': 'レコードを削除しました',
    'success.quote_approved': '見積が承認されました',
    'success.quote_accepted': '見積が顧客に受諾されました',
    'success.order_activated': '注文が有効化されました',
    'success.subscription_activated': 'サブスクリプションが有効化されました',
    'success.bundle_configured': 'バンドルが構成されました',
    'success.price_rule_applied': '価格ルールが適用されました',
    'success.approval_submitted': '承認申請が提出されました',
    'confirm.delete': 'このレコードを削除してもよろしいですか？',
    'confirm.approve_quote': 'この見積を承認しますか？',
    'confirm.reject_quote': 'この見積を却下しますか？理由を入力してください。',
    'confirm.activate_order': 'この注文を有効化しますか？この操作は元に戻せません。',
    'confirm.cancel_subscription': 'このサブスクリプションをキャンセルしますか？現在の請求期間の終了時に有効になります。',
    'error.required': 'この項目は必須です',
    'error.load_failed': 'データの読み込みに失敗しました',
    'error.save_failed': 'レコードの保存に失敗しました',
    'error.pricing_calculation_failed': '価格計算に失敗しました',
    'error.approval_failed': '承認申請の処理に失敗しました',
  },

  validationMessages: {
    discount_exceeds_limit: '割引が許容上限を超えています',
    quantity_must_be_positive: '数量はゼロより大きい値を指定してください',
    quote_expired: 'この見積は有効期限を過ぎています',
    bundle_incomplete: '必須のバンドルコンポーネントをすべて選択してください',
    unit_price_required: 'すべての明細に単価が必要です',
    effective_date_required: '有効開始日は必須です',
    expiration_before_effective: '有効終了日は有効開始日より後の日付にしてください',
    subscription_dates_invalid: 'サブスクリプションの終了日は開始日より後の日付にしてください',
    max_quantity_exceeded: '数量が許容上限を超えています',
    min_quantity_not_met: '数量が最低要件を満たしていません',
    duplicate_product_in_bundle: 'この商品は既にバンドルに含まれています',
    order_total_mismatch: '注文合計が明細の合計と一致しません',
    approval_chain_required: '承認者を少なくとも1人指定してください',
  },
};
