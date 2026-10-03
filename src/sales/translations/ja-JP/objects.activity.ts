// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — `objects` translations for the ACTIVITY family:
 * the interaction log — tasks, events, and who attended.
 *
 * Roster: `crm_task`, `crm_event`, `crm_event_attendee`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/ja-JP.ts`.
 */
const relatedToTypeOptions = {
  crm_account: '取引先', crm_contact: '取引先責任者', crm_opportunity: '商談',
  crm_lead: 'リード', crm_case: 'ケース',
};

export const activity: Record<string, ObjectTranslationData> = {
  crm_task: {
    _validations: {
      completed_date_required: {
        message: 'ステータスが「完了」の場合は完了日が必要です',
      },
      recurrence_fields_required: {
        message: '繰り返しタスクには繰り返し種別が必要です',
      },
      related_to_required: {
        message: '関連レコードを少なくとも 1 件選択してください',
      },
    },
    label: 'タスク',
    pluralLabel: 'タスク',
    description: '活動と ToDo',
    fields: {
      subject: { label: '件名' },
      description: { label: '説明' },
      status: {
        label: 'ステータス',
        options: {
          not_started: '未着手', in_progress: '進行中', waiting: '待機中',
          completed: '完了', deferred: '保留',
        },
      },
      priority: {
        label: '優先度',
        options: { low: '低', normal: '通常', high: '高', urgent: '緊急' },
      },
      priority_rank: { label: '優先度ランク' },
      type: {
        label: 'タスク種別',
        options: {
          call: '電話', email: 'メール', meeting: '会議',
          follow_up: 'フォローアップ', demo: 'デモ', other: 'その他',
        },
      },
      due_date: { label: '期限' },
      reminder_date: { label: 'リマインダー日時' },
      reminder_sent: { label: 'リマインダー送信済み' },
      completed_date: { label: '完了日' },
      owner_id: { label: '担当者' },
      related_to_type: {
        label: '関連オブジェクト種別',
        options: { ...relatedToTypeOptions },
      },
      related_to_account: { label: '関連取引先' },
      related_to_contact: { label: '関連取引先責任者' },
      related_to_opportunity: { label: '関連商談' },
      related_to_lead: { label: '関連リード' },
      related_to_case: { label: '関連ケース' },
      is_recurring: { label: '繰り返しタスク' },
      recurrence_type: {
        label: '繰り返し種別',
        options: { daily: '毎日', weekly: '毎週', monthly: '毎月', yearly: '毎年' },
      },
      recurrence_interval: { label: '繰り返し間隔' },
      recurrence_end_date: { label: '繰り返し終了日' },
      is_completed: { label: '完了済' },
      is_overdue: { label: '期限超過' },
      progress_percent: { label: '進捗（%）' },
    },
    _views: {
      all_tasks: { label: '全タスク' },
      task_board: { label: 'タスクボード' },
      task_calendar: { label: 'タスクカレンダー' },
      task_gantt: { label: '実行計画' },
      task_timeline: { label: '工数タイムライン' },
      my_open_tasks: { label: '私のオープンタスク' },
      todays_tasks: { label: '📅 私の優先タスク' },
      overdue_tasks: { label: '⏰ オープンタスク · 期限超過が長い順' },
    },
    _sections: {
      basic: { label: 'タスク情報' },
      scheduling: { label: 'スケジュール' },
      related: { label: '関連レコード' },
      recurrence: { label: '繰り返し' },
      effort: { label: '進捗・工数' },
      system: { label: 'システム' },
      // task.view.ts のフォームセクション名 (#1100)
      task: { label: 'タスク' },
      related_records: { label: '関連レコード' },
      recurrence_and_effort: { label: '繰り返しと工数' },
    },
  },
  crm_event: {
    _validations: {
      end_after_start: {
        message: '終了時刻は開始時刻より後である必要があります',
      },
      related_to_required: {
        message: '関連レコードを少なくとも 1 件選択してください',
      },
    },
    label: 'イベント',
    pluralLabel: 'イベント',
    description: '顧客との会議・電話などの予定された対話',
    fields: {
      subject: { label: '件名' },
      description: { label: '説明' },
      type: {
        label: 'イベント種別',
        options: {
          meeting: '会議', call: '電話', demo: 'デモ',
          webinar: 'ウェビナー', onsite_visit: '訪問', other: 'その他',
        },
      },
      status: {
        label: 'ステータス',
        options: {
          planned: '予定', held: '実施済み', cancelled: 'キャンセル', no_show: '無断欠席',
        },
      },
      owner_id: { label: '担当者' },
      start_datetime: { label: '開始' },
      end_datetime: { label: '終了' },
      all_day: { label: '終日イベント' },
      duration_minutes: { label: '所要時間（分）' },
      location: { label: '場所', help: '会議室・住所・会議リンク' },
      related_to_type: {
        label: '関連レコード種別',
        options: { ...relatedToTypeOptions },
      },
      related_to_account: { label: '関連取引先' },
      related_to_contact: { label: '関連取引先責任者' },
      related_to_opportunity: { label: '関連商談' },
      related_to_lead: { label: '関連リード' },
      related_to_case: { label: '関連ケース' },
      outcome_notes: { label: '結果メモ', help: '合意事項と次のアクション' },
    },
    _views: {
      all_events: { label: 'すべてのイベント' },
      event_calendar: { label: 'イベントカレンダー' },
      event_timeline: { label: 'チームスケジュール' },
      my_events: { label: 'マイカレンダー' },
      upcoming_events: { label: '📅 開催予定 · 直近順' },
      held_events: { label: '✅ 対話履歴' },
    },
    _sections: {
      basic: { label: 'イベント情報' },
      schedule: { label: 'スケジュール' },
      related: { label: '関連レコード' },
      outcome: { label: '実施結果' },
      // event.view.ts のフォームセクション名 (#1100)
      event: { label: 'イベント' },
      related_records: { label: '関連レコード' },
    },
  },
  crm_event_attendee: {
    _validations: {
      attendee_resolves: {
        message: '参加者は参加者種別が示す相手を指定する必要があります。取引先責任者の場合は取引先責任者を、社外の場合は社外参加者名を入力してください',
      },
      attendee_type_exclusive: {
        message: '参加者が指定できる相手は 1 つだけです。参加者種別が示さない項目はすべて空にしてください',
      },
    },
    label: 'イベント参加者',
    pluralLabel: 'イベント参加者',
    description: 'イベントに招待された、または出席した人',
    fields: {
      attendee_number: { label: '参加者番号' },
      crm_event: { label: 'イベント' },
      attendee_type: {
        label: '参加者種別',
        options: { contact: '取引先責任者', lead: 'リード', user: '社内ユーザー', external: '社外ゲスト' },
      },
      crm_contact: { label: '取引先責任者', help: '参加者が既存の取引先責任者である場合に設定します' },
      crm_lead: { label: 'リード', help: '参加者がまだ変換されていないリードである場合に設定します' },
      sys_user: { label: '社内ユーザー', help: '参加者が社内の同僚である場合に設定します' },
      external_name: { label: '社外参加者', help: 'CRM のどのオブジェクトにも存在しない参加者の氏名 — 参加者種別が「社外ゲスト」のときに設定します' },
      response: {
        label: '回答',
        options: {
          no_response: '未回答', accepted: '承諾',
          declined: '辞退', tentative: '仮承諾',
        },
      },
      is_organizer: { label: '主催者' },
      invited_date: { label: '招待日時' },
    },
    _views: {
      all_event_attendees: { label: 'イベント参加者' },
    },
    _sections: {
      basic: { label: '参加者' },
      response: { label: '招待' },
      // event_attendee.view.ts のフォームセクション名 (#1100)
      attendee: { label: '参加者' },
      invitation: { label: '招待' },
    },
  },
};
