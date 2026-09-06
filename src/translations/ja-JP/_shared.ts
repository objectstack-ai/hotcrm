// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * 日本語 (ja-JP) — values shared by more than one part of this bundle.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/ja-JP.ts`.
 *
 * Every constant here is spread into object rows that live in MORE THAN ONE
 * family file, so it cannot sit in any one of them. A value used by exactly
 * one family lives in that family's file instead — that split is mechanical,
 * not a judgement call.
 */

/**
 * 活動アクション群（#592）: `log_call` / `log_meeting` / `schedule_meeting` は
 * リード・取引先責任者・取引先・商談・ケースの各オブジェクトごとに登録される
 * （`objectName` を持たないスクリプトアクションはディスパッチャが参照しない
 * キーに登録されるため — #509）。文言は 5 オブジェクトで同一なので、ここで
 * 一度だけ定義して各 `_actions` に展開する。
 */
export const activityActions = {
  log_call: {
    label: '電話を記録',
    successMessage: '電話を記録しました！',
    params: {
      subject: { label: '電話の件名' },
      duration: { label: '所要時間（分）' },
      attendee_contacts: { label: '取引先責任者の参加者' },
      attendee_users: { label: '社内参加者' },
      notes: { label: '通話メモ' },
    },
  },
  log_meeting: {
    label: '会議を記録',
    successMessage: '会議を記録しました！',
    params: {
      subject: { label: '会議の件名' },
      duration: { label: '所要時間（分）' },
      attendee_contacts: { label: '取引先責任者の参加者' },
      attendee_users: { label: '社内参加者' },
      notes: { label: '議事メモ' },
    },
  },
  schedule_meeting: {
    label: '会議を設定',
    successMessage: '会議を設定しました！',
    params: {
      subject: { label: '会議の件名' },
      start_date: { label: '開始日 (UTC)' },
      start_time: { label: '開始時刻 (UTC)' },
      location: { label: '場所' },
      duration: { label: '所要時間（分）' },
      attendee_contacts: { label: '取引先責任者の参加者' },
      attendee_users: { label: '社内参加者' },
      notes: { label: 'アジェンダ' },
    },
  },
};

/**
 * 共有ピックリスト（`_picklists.ts`）は複数オブジェクトで同一の値集合を持つ。
 * 訳語がオブジェクトごとにぶれると、同じピックリストが画面によって別の言葉で
 * 表示される不具合になる（#494）。ここで一度だけ定義して各所に展開する。
 * キーは表示ラベルではなく **保存値** であることに注意（#494 の主因）。
 */
export const salutationOptions = { mr: 'Mr.', ms: 'Ms.', mrs: 'Mrs.', dr: '博士', prof: '教授' };

export const industryOptions = {
  technology: 'テクノロジー', software: 'ソフトウェア / SaaS', finance: '金融',
  healthcare: 'ヘルスケア', retail: '小売', manufacturing: '製造',
  education: '教育', real_estate: '不動産', media: 'メディア・エンタメ',
  logistics: '物流', hospitality: 'ホスピタリティ', energy: 'エネルギー・公益',
  government: '政府・行政', nonprofit: '非営利', other: 'その他',
};

export const leadSourceOptions = {
  web: 'ウェブ', referral: '紹介', event: 'イベント・展示会',
  webinar: 'ウェビナー', partner: 'パートナー', advertisement: '広告',
  paid_search: '有料検索', social: 'ソーシャルメディア', content: 'コンテンツ・ブログ',
  cold_call: 'コールドコール', email_campaign: 'メールキャンペーン', other: 'その他',
};
