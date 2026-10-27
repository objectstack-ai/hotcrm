// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_product`,
 * `crm_price_book`, `crm_price_book_entry`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/sales/translations/ja-JP.ts`.
 */
export const commerce: Record<string, ObjectTranslationData> = {
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
  crm_contract: {
    _validations: {
      end_after_start: {
        message: '終了日は開始日より後である必要があります',
      },
      contract_status_progression: {
        message: 'このステータス変更はできません。契約は 下書き → 承認中 → 有効 → 期限切れ の順に進みます。承認中は下書きに戻すことができ、下書き・承認中・有効の契約は解約にできます。期限切れと解約は最終状態です。更新は新しい契約になります。',
      },
    },
    label: '契約',
    pluralLabel: '契約',
    description: '顧客と締結した法的な契約・合意',
    fields: {
      contract_number: { label: '契約番号' },
      crm_account: { label: '取引先' },
      crm_contact: { label: '主担当者' },
      crm_opportunity: { label: '関連商談' },
      owner_id: { label: '契約担当者' },
      status: {
        label: 'ステータス',
        options: {
          draft: '下書き', in_approval: '承認中', activated: '有効',
          expired: '期限切れ', terminated: '解約',
        },
      },
      contract_term_months: { label: '契約期間（月）' },
      start_date: { label: '開始日' },
      end_date: { label: '終了日' },
      contract_value: { label: '契約金額' },
      billing_frequency: {
        label: '請求頻度',
        options: { monthly: '月次', quarterly: '四半期', annually: '年次', one_time: '一括' },
      },
      payment_terms: { label: '支払条件' },
      auto_renewal: { label: '自動更新' },
      renewal_notice_days: { label: '更新通知（日）' },
      contract_type: {
        label: '契約種別',
        options: {
          subscription: 'サブスクリプション契約', service: 'サービス契約',
          license: 'ライセンス契約', partnership: 'パートナーシップ契約',
          nda: '秘密保持契約 (NDA)', msa: '基本契約 (MSA)',
        },
      },
      signed_date: { label: '署名日' },
      signed_by: { label: '署名者' },
      document_url: { label: '契約書類' },
      special_terms: { label: '特約事項' },
      description: { label: '説明' },
      billing_address: { label: '請求先住所' },
    },
    _views: {
      all_contracts: { label: '全契約' },
      renewal_calendar: { label: '更新カレンダー' },
      contract_gantt: { label: '契約期間' },
      contract_timeline: { label: '契約タイムライン' },
    },
    _sections: {
      basic: { label: '契約情報' },
      parties: { label: '契約当事者' },
      terms: { label: '契約条件・期間' },
      value: { label: '契約金額' },
      status: { label: 'ステータス・承認' },
      renewal: { label: '更新' },
      // contract.view.ts のフォームセクション名 (#1100)
      contract_terms: { label: '契約条件' },
      signing_and_documents: { label: '署名と書類' },
      notes: { label: '備考' },
    },
  },
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
};
