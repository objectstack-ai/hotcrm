// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * 简体中文 (zh-CN) — values shared by more than one part of this bundle.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/zh-CN.ts`.
 *
 * Every constant here is spread into object rows that live in MORE THAN ONE
 * family file, so it cannot sit in any one of them. A value used by exactly
 * one family lives in that family's file instead — that split is mechanical,
 * not a judgement call.
 */

/**
 * 活动动作族（#592）：`log_call` / `log_meeting` / `schedule_meeting` 在
 * 线索、联系人、客户、商机、工单上各注册一次（无 `objectName` 的脚本动作会落到
 * 调度器从不探测的键上——见 #509）。五个对象的文案完全相同，因此在此声明一次并
 * 展开到各对象的 `_actions`：每个语言手抄十五份正是译文走样的开端。
 */
export const activityActions = {
  log_call: {
    label: '记录通话',
    successMessage: '通话记录成功！',
    params: {
      subject: { label: '通话主题' },
      duration: { label: '时长（分钟）' },
      attendee_contacts: { label: '联系人参与者' },
      attendee_users: { label: '内部参与者' },
      notes: { label: '通话记录' },
    },
  },
  log_meeting: {
    label: '记录会议',
    successMessage: '会议记录成功！',
    params: {
      subject: { label: '会议主题' },
      duration: { label: '时长（分钟）' },
      attendee_contacts: { label: '联系人参会人' },
      attendee_users: { label: '内部参会人' },
      notes: { label: '会议纪要' },
    },
  },
  schedule_meeting: {
    label: '安排会议',
    successMessage: '会议已安排！',
    params: {
      subject: { label: '会议主题' },
      start_date: { label: '开始日期（UTC）' },
      start_time: { label: '开始时间（UTC）' },
      location: { label: '地点' },
      duration: { label: '时长（分钟）' },
      attendee_contacts: { label: '联系人参会人' },
      attendee_users: { label: '内部参会人' },
      notes: { label: '会议议程' },
    },
  },
};
