// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — `objects` translations for the ACTIVITY family:
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
 * `src/translations/zh-CN.ts`.
 */
export const activity: Record<string, ObjectTranslationData> = {
  crm_task: {
    _validations: {
      completed_date_required: {
        message: '状态为已完成时必须填写完成日期',
      },
      recurrence_fields_required: {
        message: '重复任务必须填写重复类型',
      },
      related_to_required: {
        message: '至少需要选择一条关联记录',
      },
    },
    label: '任务',
    pluralLabel: '任务',
    description: '活动与待办事项',
    fields: {
      subject: { label: '主题' },
      description: { label: '描述' },
      status: {
        label: '状态',
        options: {
          not_started: '未开始', in_progress: '进行中', waiting: '等待中',
          completed: '已完成', deferred: '已推迟',
        },
      },
      priority: {
        label: '优先级',
        options: { low: '低', normal: '普通', high: '高', urgent: '紧急' },
      },
      due_date: { label: '截止日期' },
      type: {
        label: '任务类型',
        options: {
          call: '电话', email: '邮件', meeting: '会议',
          follow_up: '跟进', demo: '演示', other: '其他',
        },
      },
      reminder_date: { label: '提醒时间' },
      completed_date: { label: '完成日期' },
      owner_id: { label: '负责人' },
      related_to_type: {
        label: '关联对象类型',
        options: {
          crm_account: '客户', crm_contact: '联系人', crm_opportunity: '商机',
          crm_lead: '线索', crm_case: '工单',
        },
      },
      related_to_account: { label: '关联客户' },
      related_to_contact: { label: '关联联系人' },
      related_to_opportunity: { label: '关联商机' },
      related_to_lead: { label: '关联线索' },
      related_to_case: { label: '关联工单' },
      is_recurring: { label: '重复任务' },
      recurrence_type: {
        label: '重复类型',
        options: { daily: '每日', weekly: '每周', monthly: '每月', yearly: '每年' },
      },
      recurrence_interval: { label: '重复间隔' },
      recurrence_end_date: { label: '重复结束日期' },
      is_completed: { label: '是否完成' },
      is_overdue: { label: '是否逾期' },
      progress_percent: { label: '进度（%）' },
      priority_rank: { label: '优先级排序' },
      reminder_sent: { label: '提醒已发送' },
    },
    _sections: {
      basic: { label: '任务信息' },
      scheduling: { label: '日程安排' },
      related: { label: '关联记录' },
      recurrence: { label: '重复规则' },
      system: { label: '系统' },
      effort: { label: '进度与工时' },
      // task.view.ts 表单区块名称 (#1100)
      task: { label: '任务' },
      related_records: { label: '关联记录' },
      recurrence_and_effort: { label: '重复与工时' },
    },
    _views: {
      all_tasks: { label: '全部任务' },
      task_board: { label: '任务看板' },
      task_calendar: { label: '任务日程' },
      task_gantt: { label: '执行计划' },
      task_timeline: { label: '工时时间线' },
      my_open_tasks: { label: '我的待办任务' },
      todays_tasks: { label: '📅 我的优先任务' },
      overdue_tasks: { label: '⏰ 待办任务 · 按逾期时长排序' },
    },
  },
  crm_event: {
    _validations: {
      end_after_start: {
        message: '结束时间必须晚于开始时间',
      },
      related_to_required: {
        message: '至少需要选择一条关联记录',
      },
    },
    label: '活动',
    pluralLabel: '活动',
    description: '与客户的会议、通话及其他已安排的互动',
    fields: {
      subject: { label: '主题' },
      description: { label: '描述' },
      type: {
        label: '活动类型',
        options: {
          meeting: '会议', call: '电话', demo: '演示',
          webinar: '线上研讨会', onsite_visit: '上门拜访', other: '其他',
        },
      },
      status: {
        label: '状态',
        options: {
          planned: '已计划', held: '已举行', cancelled: '已取消', no_show: '客户未到',
        },
      },
      owner_id: { label: '负责人' },
      start_datetime: { label: '开始时间' },
      end_datetime: { label: '结束时间' },
      all_day: { label: '全天活动' },
      duration_minutes: { label: '时长（分钟）' },
      location: { label: '地点', help: '会议室、地址或会议链接' },
      related_to_type: {
        label: '关联对象类型',
        options: {
          crm_account: '客户', crm_contact: '联系人', crm_opportunity: '商机',
          crm_lead: '线索', crm_case: '工单',
        },
      },
      related_to_account: { label: '关联客户' },
      related_to_contact: { label: '关联联系人' },
      related_to_opportunity: { label: '关联商机' },
      related_to_lead: { label: '关联线索' },
      related_to_case: { label: '关联工单' },
      outcome_notes: { label: '会后纪要', help: '达成了什么共识，下一步做什么' },
    },
    _sections: {
      basic: { label: '活动信息' },
      schedule: { label: '日程安排' },
      related: { label: '关联记录' },
      outcome: { label: '结果' },
      // event.view.ts 表单区块名称 (#1100)
      event: { label: '活动' },
      related_records: { label: '关联记录' },
    },
    _views: {
      all_events: { label: '全部活动' },
      event_calendar: { label: '活动日历' },
      event_timeline: { label: '团队日程' },
      my_events: { label: '我的日历' },
      upcoming_events: { label: '📅 即将开始 · 按时间升序' },
      held_events: { label: '✅ 互动历史' },
    },
  },
  crm_event_attendee: {
    _validations: {
      attendee_resolves: {
        message: '参与者必须填写其参与者类型所指的一方——联系人类型需要填写联系人，外部类型需要填写外部参与者姓名',
      },
      attendee_type_exclusive: {
        message: '参与者只能指定一方——请清空其参与者类型未指明的所有字段',
      },
    },
    label: '活动参与者',
    pluralLabel: '活动参与者',
    description: '受邀参加或实际出席活动的人员',
    fields: {
      attendee_number: { label: '参与者编号' },
      crm_event: { label: '活动' },
      attendee_type: {
        label: '参与者类型',
        options: { contact: '联系人', lead: '线索', user: '内部用户', external: '外部来宾' },
      },
      crm_contact: { label: '联系人', help: '参与者是已有客户联系人时填写' },
      crm_lead: { label: '线索', help: '参与者仍是未转化线索时填写' },
      sys_user: { label: '内部用户', help: '参与者是同事时填写' },
      external_name: { label: '外部参与者', help: '不在任何 CRM 对象中的参与者姓名——参与者类型为「外部来宾」时填写' },
      response: {
        label: '回复',
        options: {
          no_response: '未回复', accepted: '已接受',
          declined: '已拒绝', tentative: '待定',
        },
      },
      is_organizer: { label: '组织者' },
      invited_date: { label: '邀请时间' },
    },
    _sections: {
      basic: { label: '参与者' },
      response: { label: '邀请' },
      // event_attendee.view.ts 表单区块名称 (#1100)
      attendee: { label: '参与者' },
      invitation: { label: '邀请' },
    },
    _views: {
      all_event_attendees: { label: '活动参与者' },
    },
  },
};
