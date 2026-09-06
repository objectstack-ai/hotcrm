// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions, salutationOptions, industryOptions, leadSourceOptions } from './_shared';

/**
 * 日本語 (ja-JP) — `objects` translations for the CUSTOMER family:
 * the customer record itself — accounts and the people at them.
 *
 * Roster: `crm_account`, `crm_contact`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/ja-JP.ts`.
 */
export const customer: Record<string, ObjectTranslationData> = {
  crm_account: {
    label: '取引先',
    pluralLabel: '取引先',
    description: '当社と取引のある企業・組織',
    fields: {
      account_number: { label: '取引先番号' },
      name: { label: '取引先名', help: '会社または組織の正式名称' },
      name_normalized: {
        label: '取引先名（正規化）',
        help: 'リード変換の照合キー。取引先名を小文字化し、前後の空白を除去して、内部の連続する空白を 1 つにまとめたもの。account_protection フックが自動で維持します — 直接編集しないでください。',
      },
      display_title: { label: '表示名' },
      type: {
        label: 'タイプ',
        options: { prospect: '見込み客', customer: '顧客', partner: 'パートナー', former: '過去の取引先' },
      },
      industry: {
        label: '業種',
        options: { ...industryOptions },
      },
      annual_revenue: { label: '年間売上' },
      child_account_revenue: { label: '子会社年間売上合計', help: '直属の子取引先の年間売上の合計。' },
      number_of_employees: { label: '従業員数' },
      phone: { label: '電話番号' },
      website: { label: 'Webサイト' },
      billing_address: { label: '請求先住所' },
      billing_country: {
        label: '請求先国',
        help: '請求先住所から導出 — 入力された国名をそのまま、前後の空白を除去し大文字化した値。',
      },
      territory: {
        label: 'テリトリー',
        help: '請求先住所から導出 — テリトリー共有ルールが照合する営業テリトリー。担当チームのないテリトリーの取引先は「その他」。',
        options: { na: '北米', emea: 'EMEA', other: 'その他' },
      },
      office_location: { label: 'オフィス所在地' },
      owner_id: { label: '取引先所有者' },
      parent_account: { label: '親取引先', help: '階層構造における親会社' },
      description: { label: '説明' },
      is_active: { label: '有効' },
      last_activity_date: { label: '最終活動日' },
      brand_color: { label: 'ブランドカラー' },
      logo: { label: '会社ロゴ' },
      tier: {
        label: '顧客ランク',
        options: {
          strategic: '戦略顧客', enterprise: 'エンタープライズ',
          mid_market: 'ミッドマーケット', smb: '中小企業',
        },
      },
      segment: {
        label: '顧客セグメント',
        options: { net_new: '新規獲得', growth: '成長', at_risk: 'リスクあり', stable: '安定' },
      },
      health_score: {
        label: 'ヘルススコア',
        help: 'カスタマーサクセス担当（CSM）が管理する健全性の指標',
        options: { healthy: '良好', watching: '要観察', at_risk: 'リスクあり', churning: '解約進行中' },
      },
    },
    _views: {
      all_accounts: {
        label: '全取引先', description: '売上と業種を含む取引先の一覧',
        bulkActions: {
          delete: {
            label: '削除',
            confirmLabel: '削除',
            confirmText: '{{count}} 件の取引先を完全に削除しますか？この操作は取り消せません。',
          },
          transfer_owner: {
            label: '所有者の変更',
            confirmText: '{{count}} 件の取引先の所有者を変更しますか？',
            params: {
              owner_id: {
                label: '新しい所有者',
              },
            },
          },
          update_tier: {
            label: '顧客ランクの更新',
            confirmText: '{{count}} 件の取引先の顧客ランクを {{tier}} に更新しますか？',
            params: {
              tier: {
                label: '顧客ランク',
              },
            },
          },
        },
      },
      account_gallery: { label: '取引先カード', description: 'ブランドカラー付きのカードビュー' },
      account_map: { label: '取引先マップ', description: '取引先の地理的分布' },
      enterprise_accounts: { label: 'エンタープライズ取引先', description: '年商最上位の主要顧客' },
      my_accounts: { label: '私の取引先', description: '自分が所有する取引先' },
      at_risk_accounts: { label: '⚠️ リスクのある取引先' },
    },
    _sections: {
      basic: { label: '基本情報' },
      financials: { label: '財務情報' },
      contact_info: { label: '連絡先情報' },
      ownership: { label: '所有者・ステータス' },
      branding: { label: 'ブランディング' },
      system: { label: 'システム' },
      // account.view.ts のフォームセクション名 (#1100)
      profile: { label: 'プロフィール' },
      customer_success: { label: 'カスタマーサクセス' },
      locations: { label: '所在地' },
      description: { label: '説明' },
    },
    _actions: { ...activityActions },
  },
  crm_contact: {
    label: '取引先責任者',
    pluralLabel: '取引先責任者',
    description: '取引先に所属する担当者',
    fields: {
      salutation: { label: '敬称', options: { ...salutationOptions } },
      first_name: { label: '名' },
      last_name: { label: '姓' },
      full_name: { label: '氏名' },
      crm_account: { label: '取引先' },
      email: { label: 'メール' },
      phone: { label: '電話' },
      mobile: { label: '携帯電話' },
      title: { label: '役職' },
      department: {
        label: '部門',
        options: {
          executive: '経営層', sales: '営業部', marketing: 'マーケティング部',
          engineering: 'エンジニアリング部', support: 'サポート部', finance: '経理部',
          hr: '人事部', operations: 'オペレーション部',
        },
      },
      owner_id: { label: '取引先責任者の所有者' },
      description: { label: '説明' },
      is_primary: { label: '主担当者', help: 'この取引先の主担当者かどうか' },
      avatar: { label: 'プロフィール画像' },
      mailing_street: { label: '郵送先 番地' },
      mailing_city: { label: '郵送先 市区町村' },
      mailing_state: { label: '郵送先 都道府県' },
      mailing_postal_code: { label: '郵便番号' },
      mailing_country: { label: '郵送先 国' },
      lead_source: { label: 'リードソース', options: { ...leadSourceOptions } },
      do_not_call: { label: '電話拒否' },
      email_opt_out: { label: 'メール配信停止' },
      last_contacted_date: { label: '最終接触日時' },
    },
    _views: {
      all_contacts: { label: '全取引先責任者' },
      contact_directory: { label: '責任者ディレクトリ' },
      primary_contacts: { label: '主担当者' },
    },
    _sections: {
      identity: { label: '基本情報' },
      account_info: { label: '取引先・役職' },
      contact_info: { label: '連絡先情報' },
      mailing_address: { label: '郵送先住所' },
      additional: { label: 'その他の情報' },
      preferences: { label: 'コミュニケーション設定' },
      // contact.view.ts のフォームセクション名 (#1100)
      contact_details: { label: '連絡先情報' },
      comm_preferences: { label: '設定' },
    },
    _actions: {
      ...activityActions,
      mark_primary: {
        label: '主担当者に設定',
        confirmText: 'この責任者を取引先の主担当者に設定しますか？',
        successMessage: '主担当者に設定しました！',
      },
      send_email: {
        label: 'メール送信',
        params: {
          subject: { label: '件名' },
          body: { label: '本文' },
        },
      },
      add_contact_to_campaign: {
        label: 'キャンペーンに追加',
        successMessage: '取引先責任者をキャンペーンに追加しました！',
        params: {
          crm_campaign: { label: 'キャンペーン' },
        },
      },
    },
  },
};
