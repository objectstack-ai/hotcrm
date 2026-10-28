// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

// The discount ceiling is interpolated, never retyped: the number lives in
// `_thresholds.ts` alone (#1711).
import { QUOTE_DISCOUNT_CEILING } from '../../sales/objects/_thresholds';

/**
 * 日本語 (ja-JP) — the revenue module's own translations: every row whose
 * target this package registers. Why they live here and not in the app
 * package's pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  objects: {
    crm_product: {
      _validations: {
        cost_less_than_price: {
          message: '原価は定価より低くしてください',
        },
        price_positive: {
          message: '定価は正の値である必要があります',
        },
      },
      label: '製品',
      pluralLabel: '製品',
      description: '自社が提供する製品・サービス',
      fields: {
        product_code: { label: '製品コード' },
        name: { label: '製品名' },
        display_title: { label: '表示名' },
        description: { label: '説明' },
        category: {
          label: 'カテゴリ',
          options: {
            software: 'ソフトウェア', hardware: 'ハードウェア', service: 'サービス',
            subscription: 'サブスクリプション', support: 'サポート',
          },
        },
        family: {
          label: '製品ファミリ',
          options: {
            enterprise: 'エンタープライズ向けソリューション', smb: '中小企業向けソリューション',
            services: 'プロフェッショナルサービス', cloud: 'クラウドサービス',
          },
        },
        list_price: { label: '定価' },
        cost: { label: 'コスト' },
        sku: { label: 'SKU' },
        is_active: { label: '有効' },
        product_manager: { label: 'プロダクトマネージャー' },
        image: { label: '製品画像' },
        datasheet: { label: 'データシート' },
      },
      _views: {
        all_products: { label: '全製品' },
        product_catalog: { label: '製品カタログ' },
      },
      _sections: {
        basic: { label: '製品情報' },
        pricing: { label: '価格' },
        metadata: { label: '関連資料' },
        // product.view.ts のフォームセクション名 (#1100)
        product_info: { label: '製品情報' },
        pricing_info: { label: '価格' },
        media: { label: 'メディア' },
      },
    },
    crm_price_book: {
      _validations: {
        valid_to_after_valid_from: {
          message: '有効期間（終了）は有効期間（開始）以降の日付にしてください',
        },
      },
      label: '価格表',
      pluralLabel: '価格表',
      description: '名前付きの製品価格の一覧：標準価格、パートナー・地域別価格、またはプロモーション価格',
      fields: {
        owner_id: { label: '価格表担当者' },
        name: { label: '価格表名' },
        description: { label: '説明' },
        is_active: { label: '有効' },
        is_standard: { label: '標準' },
        valid_from: { label: '有効期間（開始）' },
        valid_to: { label: '有効期間（終了）' },
      },
      _sections: {
        basic: { label: '価格表情報' },
        validity: { label: '有効期間' },
      },
    },
    crm_price_book_entry: {
      _validations: {
        price_not_negative: {
          message: '定価にマイナスの値は指定できません',
        },
      },
      label: '価格表エントリ',
      pluralLabel: '価格表エントリ',
      description: '1つの価格表における1つの製品の価格',
      fields: {
        entry_number: { label: 'エントリ番号' },
        crm_price_book: { label: '価格表' },
        crm_product: { label: '製品' },
        list_price: { label: '定価' },
        is_active: { label: '有効' },
      },
      _sections: {
        basic: { label: 'エントリ情報' },
      },
    },
    crm_quote: {
      _validations: {
        discount_within_ceiling: {
          message: '割引率は 60% を超えられません',
        },
        expiration_after_quote: {
          message: '有効期限は見積日より後である必要があります',
        },
        quote_status_progression: {
          message: '無効な見積ステータス遷移です',
        },
      },
      label: '見積',
      pluralLabel: '見積',
      description: '顧客に提示する価格見積',
      fields: {
        quote_number: { label: '見積番号' },
        name: { label: '見積名' },
        display_title: { label: '表示名' },
        crm_account: { label: '取引先' },
        crm_contact: {
          label: '取引先責任者',
          help: '見積が「提示済み」または「承認済み」になった時点で必須です。作成される契約の主担当者はここから引き継がれます。',
        },
        crm_opportunity: { label: '商談' },
        owner_id: { label: '見積担当者' },
        status: {
          label: 'ステータス',
          options: {
            draft: '下書き', in_review: 'レビュー中', presented: '提示済み',
            accepted: '承認済み', rejected: '却下', expired: '期限切れ',
          },
        },
        quote_date: { label: '見積日' },
        expiration_date: { label: '有効期限' },
        subtotal: { label: '小計' },
        discount: { label: '割引率(%)' },
        discount_amount: { label: '割引額' },
        tax: { label: '税額' },
        shipping_handling: { label: '配送・手数料' },
        total_price: { label: '合計金額' },
        payment_terms: { label: '支払条件' },
        shipping_terms: { label: '配送条件' },
        billing_address: { label: '請求先住所' },
        shipping_address: { label: '配送先住所' },
        description: { label: '説明' },
        internal_notes: { label: '内部メモ' },
      },
      _views: {
        all_quotes: { label: '全見積' },
        quote_pipeline: { label: '見積パイプライン' },
        quote_calendar: { label: '見積カレンダー' },
      },
      _sections: {
        basic: { label: '見積情報' },
        pricing: { label: '価格' },
        terms: { label: '条件・有効期限' },
        address: { label: '住所' },
        system: { label: 'システム' },
        // quote.view.ts のフォームセクション名 (#1100)
        quote: { label: '見積書' },
        totals: { label: '合計' },
        quote_terms: { label: '契約条件' },
        addresses_and_notes: { label: '住所と備考' },
      },
    },
    crm_opportunity_line_item: {
      _validations: {
        unit_price_positive: {
          message: '販売価格を負の値にすることはできません',
        },
      },
      label: '商談商品明細',
      pluralLabel: '商談商品明細',
      description: '商談配下の製品別価格明細行',
      fields: {
        crm_opportunity: { label: '商談' },
        crm_product: { label: '製品' },
        description: { label: '説明' },
        product_title: { label: '製品タイトル', help: '製品のタイトル。製品と同期して更新され、この明細行の名前になります。' },
        quantity: { label: '数量' },
        list_price: { label: '定価', help: '製品のカタログ価格から自動入力されます' },
        unit_price: { label: '販売価格', help: '交渉後の単価（定価と異なる場合があります）' },
        discount: { label: '割引率（%）' },
        total_price: { label: '合計' },
        line_number: { label: '行番号' },
      },
      _sections: {
        basic: { label: '明細行' },
        pricing: { label: '価格' },
      },
    },
    crm_quote_line_item: {
      _validations: {
        discount_within_ceiling: {
          message: '明細の割引率は 60% を超えられません',
        },
        unit_price_positive: {
          message: '販売価格を負の値にすることはできません',
        },
      },
      label: '見積明細',
      pluralLabel: '見積明細',
      description: '見積配下の製品別価格明細行',
      fields: {
        crm_quote: { label: '見積' },
        crm_product: { label: '製品' },
        description: { label: '説明' },
        product_title: { label: '製品タイトル', help: '製品のタイトル。製品と同期して更新され、この明細行の名前になります。' },
        quantity: { label: '数量' },
        list_price: { label: '定価' },
        unit_price: { label: '販売価格' },
        discount: { label: '割引率（%）' },
        subtotal: { label: '小計' },
        total_price: { label: '合計' },
        line_number: { label: '行番号' },
      },
      _sections: {
        basic: { label: '明細行' },
        pricing: { label: '価格' },
      },
    },
  },
  apps: {
    crm_enterprise: {
      navigation: {
        nav_quote: { label: '見積' },
        nav_product: { label: '製品' },
        nav_price_book: { label: '価格表' },
      },
    },
  },
  datasets: {
    product_metrics: {
      label: '製品指標',
      description: '製品カタログの件数と定価を集計するセマンティックレイヤー',
      dimensions: {
        category: {
          label: 'カテゴリ',
        },
      },
      measures: {
        list_price_sum: {
          label: '定価合計',
        },
        product_count: {
          label: '製品数',
        },
      },
    },
  },
  flows: {
    quote_generation: {
      label: '商談から見積を作成',
      refusals: { refuse_held: { message: '先に案件化承認が必要です。「案件化承認を申請」にチェックを入れてください。何も作成されていません。' } },
      screens: {
        screen_1: {
          title: '見積詳細',
          fields: {
            quoteName: { label: '見積名' },
            expirationDays: { label: '有効期間（日）' },
            discount: { label: `割引率 % (≤ ${QUOTE_DISCOUNT_CEILING})`, placeholder: `0-${QUOTE_DISCOUNT_CEILING}` },
          },
        },
      },
    },
  },
};
