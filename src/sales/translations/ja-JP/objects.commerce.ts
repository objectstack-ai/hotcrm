// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — `objects` translations for the COMMERCE family:
 * what gets sold and on what paper — quotes, contracts, products.
 *
 * Roster: `crm_quote`, `crm_quote_line_item`, `crm_contract`, `crm_sales_order`,
 * `crm_sales_order_line`, `crm_product`,
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
      // The countersigned copy (#2317).
      signed_copy: {
        label: '署名済みコピー',
        help: 'お客様が署名した契約書。契約を有効にするには必須です。アップロード時に署名日が空であれば当日の日付が入ります。',
      },
      document_url: { label: '契約書類' },
      special_terms: { label: '特約事項' },
      description: { label: '説明' },
      automation_key: { label: '自動化キー', help: 'この契約を起草した自動化。その自動化が書き込みます。編集しないでください。' },
      billing_address: { label: '請求先住所' },
    },
    // Print Contract (#2317).
    _actions: {
      print_contract: { label: '契約書を印刷', successMessage: '契約書の PDF を添付しました。' },
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
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order: {
    // Draft Contract (#2558).
    _actions: {
      draft_contract: { label: '契約を作成' },
    },
    _validations: {
      shipped_after_order: { message: '出荷日を注文日より前にすることはできません' },
      sales_order_status_progression: { message: 'このステータス変更はできません。注文は 下書き → 確定 → 完了 と進みます。確定は下書きに戻せ、下書きまたは確定はキャンセルにできます。完了とキャンセルは最終状態です。' },
    },
    label: '注文',
    pluralLabel: '注文',
    description: '顧客が今回注文した内容、明細と合計、出荷の進み具合',
    fields: {
      owner_id: { label: '注文担当者' },
      order_number: { label: '注文番号' },
      name: { label: '注文名' },
      crm_account: { label: '取引先' },
      crm_contact: { label: '取引先責任者' },
      crm_opportunity: { label: '商談' },
      order_date: { label: '注文日' },
      crm_contract: { label: '契約' },
      customer_po_number: { label: '顧客発注番号', help: '顧客自身の発注書の番号。顧客が引用するとおりに入力します。' },
      description: { label: '説明' },
      subtotal: { label: '小計' },
      discount: { label: '割引率(%)' },
      discount_amount: { label: '割引額' },
      tax: { label: '税額' },
      shipping_handling: { label: '配送・手数料' },
      total_price: { label: '合計金額' },
      payment_terms: { label: '支払条件' },
      shipped_date: { label: '出荷日' },
      billing_address: { label: '請求先住所' },
      shipping_address: { label: '配送先住所' },
      external_ref: { label: '外部参照番号', help: '他のシステムでのこの注文の番号。同じ番号の行をインポートすると、この注文が更新されます。' },
      status: { label: 'ステータス', options: { draft: '下書き', confirmed: '確定', completed: '完了', cancelled: 'キャンセル' } },
      fulfillment_status: { label: '出荷状況', options: { not_shipped: '未出荷', partially_shipped: '一部出荷', shipped: '出荷済み' } },
    },
    _views: {
      all_sales_orders: { label: 'すべての注文' },
      order_board: { label: '注文ボード' },
      orders_to_ship: { label: '出荷待ち' },
    },
    _sections: {
      basic: { label: '注文情報' },
      pricing: { label: '価格' },
      delivery: { label: '出荷' },
      address: { label: '住所' },
      system: { label: 'システム' },
    },
  },
  // The order and its lines (REQ-0010, hotcrm#2555).
  crm_sales_order_line: {
    _validations: {
      unit_price_positive: { message: '販売価格を負の値にすることはできません' },
      product_or_title: { message: '製品を選ぶか、製品タイトルを入力してください' },
    },
    label: '注文明細',
    pluralLabel: '注文明細',
    description: '注文の明細行',
    fields: {
      crm_sales_order: { label: '注文' },
      crm_product: { label: '製品' },
      product_title: { label: '製品タイトル', help: 'この明細で販売するもの。製品を選ぶと製品名が入り、製品がなければ入力します。' },
      description: { label: '説明' },
      quantity: { label: '数量' },
      list_price: { label: '定価', help: 'この明細に置いた時点の製品の定価です。' },
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
};
