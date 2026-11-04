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
};
