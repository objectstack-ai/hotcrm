// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — `objects` translations for the MARKETING family:
 * demand generation — campaigns and their membership.
 *
 * Roster: `crm_campaign`, `crm_campaign_member`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/zh-CN.ts`.
 */
export const marketing: Record<string, ObjectTranslationData> = {
  crm_campaign: {
    _validations: {
      end_after_start: {
        message: '结束日期必须晚于开始日期',
      },
      actual_cost_within_budget: {
        message: '实际成本超出预算成本',
      },
    },
    label: '营销活动',
    pluralLabel: '营销活动',
    description: '市场营销活动与推广',
    fields: {
      campaign_code: { label: '活动代码' },
      name: { label: '活动名称' },
      type: {
        label: '类型',
        options: {
          email: '邮件营销', webinar: '线上研讨会', trade_show: '展会',
          conference: '行业会议', direct_mail: '直邮', social_media: '社交媒体',
          content: '内容营销', partner: '伙伴联合营销',
        },
      },
      status: {
        label: '状态',
        options: {
          planning: '规划中', in_progress: '进行中',
          completed: '已完成', aborted: '已中止',
        },
      },
      start_date: { label: '开始日期' },
      end_date: { label: '结束日期' },
      expected_revenue: { label: '预期收入' },
      description: { label: '描述' },
      channel: {
        label: '主要渠道',
        options: { digital: '数字渠道', social: '社交媒体', email: '邮件', events: '线下活动', partner: '合作伙伴' },
      },
      budgeted_cost: { label: '预算成本' },
      actual_cost: { label: '实际成本' },
      actual_revenue: { label: '实际收入' },
      target_size: { label: '目标人数', help: '目标线索/联系人数量' },
      num_sent: { label: '发送数量' },
      num_responses: { label: '响应数量' },
      num_leads: { label: '线索数量' },
      num_converted_leads: { label: '已转化线索数' },
      num_opportunities: { label: '已创建商机数' },
      num_won_opportunities: { label: '已赢得商机' },
      response_rate: { label: '响应率（%）' },
      roi: { label: '投资回报率（%）' },
      owner_id: { label: '活动负责人' },
      landing_page_url: { label: '着陆页' },
      is_active: { label: '是否启用' },
      display_title: { label: '显示名称' },
    },
    _sections: {
      basic: { label: '活动信息' },
      schedule: { label: '日程安排' },
      budget: { label: '预算与投资回报' },
      metrics: { label: '效果数据' },
      assignment: { label: '归属' },
      assets: { label: '活动素材' },
    },
    _views: {
      all_campaigns: { label: '全部营销活动' },
      campaign_gantt: { label: '活动排期' },
      campaign_calendar: { label: '活动日历' },
      campaign_timeline: { label: '营销时间线' },
    },
    _actions: {
      enroll_leads: {
        label: '批量加入成员',
        successMessage: '符合条件的成员已加入营销活动。',
      },
    },
  },
  crm_campaign_member: {
    _validations: {
      lead_or_contact_required: {
        message: '营销活动成员必须关联线索或联系人之一',
      },
    },
    // 「营销活动成员」, not 「活动成员」: this object's master is `crm_campaign`
    // (营销活动), while 「活动」 is already this pack's label for `crm_event` and
    // 「活动参与者」 its child `crm_event_attendee`. Dropping 「营销」 put a
    // marketing object inside the calendar family's name space (#810).
    label: '营销活动成员',
    pluralLabel: '营销活动成员',
    description: '营销活动所触达的线索与联系人及其响应状态',
    fields: {
      member_number: { label: '成员编号' },
      crm_campaign: { label: '营销活动' },
      crm_lead: { label: '线索', help: '成员加入时身份为线索的，记录在此' },
      crm_contact: { label: '联系人', help: '成员为已有联系人的，记录在此' },
      status: {
        label: '状态',
        options: {
          sent: '已发送', responded: '已响应',
          converted: '已转化', unsubscribed: '已退订',
        },
      },
      added_date: { label: '加入时间' },
      response_date: { label: '响应时间' },
      has_responded: { label: '已响应' },
    },
    _sections: {
      basic: { label: '基本信息' },
      response: { label: '响应跟踪' },
    },
    _actions: {
      mark_responded: {
        label: '标记为已响应',
        successMessage: '已记录该营销活动成员的响应。',
      },
    },
  },
};
