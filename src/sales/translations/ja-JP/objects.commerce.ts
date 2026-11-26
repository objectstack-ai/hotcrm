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
      name: { label: '契約名' },
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
      // The contract's form, an order contract's amount and Change (#2804).
      contract_form: {
        label: '契約形態',
        help: '受注契約：受注から作成され、金額は受注金額です。基本契約：金額は手入力で、複数の受注を紐付けられます。その他：NDA など金額のない契約です。',
        options: { order: '受注契約', framework: '基本契約', other: 'その他' },
      },
      crm_sales_order: { label: '元の受注', help: 'この契約の作成元となった受注です。' },
      order_amount: { label: '受注金額', help: '受注の税込合計です。' },
      order_amount_differs: { label: '受注金額と不一致', help: '契約金額が受注金額と一致しなくなっています。「変更」で「受注から更新」を選ぶと受注金額を取り込みます。' },
      change_reason: { label: '変更理由', help: '契約を最後に変更した理由です。「変更」が書き込みます。' },
      change_amendment: { label: '署名済み変更契約書', help: '最後の変更について顧客が署名した変更契約書です。「変更」が書き込みます。' },
      change_new_value: { label: '新しい契約金額', help: '空欄のままにすると契約金額は変わりません。' },
      change_new_end_date: { label: '新しい終了日', help: '空欄のままにすると終了日は変わりません。' },
      change_new_payment_terms: { label: '新しい支払条件', help: '空欄のままにすると支払条件は変わりません。' },
      change_from_order: { label: '受注から更新', help: '受注の現在の金額を契約金額にします。' },
    },
    // Print Contract (#2317).
    _actions: {
      print_contract: { label: '契約書を印刷', successMessage: '契約書の PDF を添付しました。' },
      // Change (#2804): one action per kind of contract.
      change_contract: { label: '変更', description: '有効化済みのこの契約の金額、終了日、支払条件を変更します。空欄の項目は変わりません。', successMessage: '契約 {{ record.name }} を変更しました。' },
      change_order_contract: { label: '変更', description: '有効化済みのこの受注契約の終了日や支払条件を変更するか、受注の現在の金額を取り込みます。空欄の項目は変わりません。', successMessage: '契約 {{ record.name }} を変更しました。' },
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
      change: { label: '直近の変更' },
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
      // Confirm / Complete / Cancel Order (#2716).
      confirm_sales_order: {
        label: '注文を確定',
        confirmText: 'この注文を確定しますか？確定すると明細はロックされます。変更するには、注文を下書きに戻す必要があります。',
        successMessage: '注文 {{ record.name }} を確定しました。',
      },
      complete_sales_order: {
        label: '注文を完了',
        confirmText: 'この注文を完了しますか？完了した注文は最終状態です。ステータスと明細は変更できなくなります。',
        successMessage: '注文 {{ record.name }} を完了しました。',
      },
      cancel_sales_order: {
        label: '注文をキャンセル',
        confirmText: 'この注文をキャンセルしますか？キャンセルした注文は最終状態です。再開できず、明細も変更できなくなります。',
        successMessage: '注文 {{ record.name }} をキャンセルしました。',
      },
    },
    _validations: {
      shipped_after_order: { message: '出荷日を注文日より前にすることはできません' },
      sales_order_status_progression: { message: 'このステータス変更はできません。注文は 下書き → 確定 → 完了 と進みます。確定は下書きに戻せ、下書きまたは確定はキャンセルにできます。完了とキャンセルは最終状態です。' },
      contract_same_account: { message: '契約はこの注文の取引先のものである必要があります。' },
      contract_same_account_check: { message: 'この契約は別の取引先のものです。注文には自身の取引先の契約しか設定できません。この取引先の契約を選択するか、契約を空にしてください。' },
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
