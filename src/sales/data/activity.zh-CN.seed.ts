// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the activity families — tasks, events, their
 * attendees and the lead timeline pointers (#2411). How a twin is built:
 * `./_locale.ts`.
 *
 * Product and place names a Chinese rep types as-is (Zoom, Google Meet, a
 * webinar URL) stay as the English record has them; a street address is said
 * in Chinese, as on the account it belongs to.
 */
import {
  tasks, events, eventAttendeesFromContacts, eventAttendeesFromLeads, leadInteractionPointers,
} from './activity.seed';
import { zhCNTwin, zhKey } from './_locale';
import {
  zhAccountName, zhContactEmail, zhLeadEmail, zhOpportunityName, zhCaseSubject,
} from './sales.zh-CN.seed';

// ─── Tasks ────────────────────────────────────────────────────────────

const TASKS_ZH: Record<string, Record<string, unknown>> = {
  'Follow up with Acme on proposal': {
    subject: '跟进艾克美集团的方案',
    description: '把修订后的企业版方案发给彭嘉华，并约 30 分钟一起过一遍 AI 治理部分。',
  },
  'Acme — schedule AI governance workshop': {
    subject: '艾克美集团：安排 AI 治理研讨会',
    description: '和艾克美的合规团队约一场 90 分钟的联合研讨会，讲清楚 HotCRM 智能体如何处理数据范围、'
      + '基于角色的访问控制、审计追踪和人工审核。会前阅读：ADR-0007 和治理演示幻灯片。',
  },
  'Acme — close out login-issues ticket before SLA': {
    subject: '艾克美集团：在 SLA 到期前关闭登录问题工单',
    description: '确认工程团队已备好欧洲中东非洲区单点登录时钟偏差的补丁，部署到艾克美的租户，'
      + '再给林丽发一份面向客户的故障复盘报告。',
  },
  'Schedule demo for Globex team': { subject: '为环球工业团队安排产品演示' },
  'Prepare contract for Wayne Enterprises': { subject: '为韦恩企业准备合同' },
  'Send welcome package to Stark Medical': { subject: '给斯塔克医疗寄送欢迎礼包' },
  'Update CRM pipeline report': { subject: '更新 CRM 管道报表' },
};

export const tasksZhCN = zhCNTwin(tasks, {
  key: (r) => String(r.subject),
  words: TASKS_ZH,
  text: ['subject', 'description'],
  refs: {
    related_to_account: zhAccountName,
    related_to_opportunity: zhOpportunityName,
    related_to_case: zhCaseSubject,
  },
});

// ─── Events ───────────────────────────────────────────────────────────

const EVENTS_ZH: Record<string, Record<string, unknown>> = {
  'Acme — Enterprise edition walkthrough': {
    subject: '艾克美集团：企业版功能讲解',
    outcome_notes: '给运营团队讲了智能体治理和分析席位，本周内发出修订后的方案。',
  },
  'Acme — proposal follow-up call': {
    subject: '艾克美集团：方案跟进电话',
    outcome_notes: '采购希望签 18 个月。治理研讨会之前要重新核算报价。',
  },
  'Acme — AI governance scoping session': {
    subject: '艾克美集团：AI 治理范围沟通会',
    outcome_notes: '确定了研讨会议程：数据范围、基于角色的访问控制、审计追踪、人工审核。',
  },
  'Acme — login incident status call': {
    subject: '艾克美集团：登录故障进展电话',
    outcome_notes: '确认了欧洲中东非洲区单点登录时钟偏差的推测，工程团队正在预发环境复现。',
  },
  'Acme — renewal signature review': {
    subject: '艾克美集团：续约签署复核',
    outcome_notes: '比续约日提前两周签署。多年期方案等升级决策之后再谈。',
  },
  'Acme — San Francisco HQ business review': {
    subject: '艾克美集团：旧金山总部业务回顾',
    location: '旧金山霍华德街 500 号 400 室',
    outcome_notes: '与首席技术官团队的季度回顾。下一步确定为扩展到欧洲中东非洲团队。',
  },
  'Wayne — enterprise license negotiation': {
    subject: '韦恩企业：企业级许可谈判',
    outcome_notes: '批量档位定在 20 个租户。安全附录是最后一个未决事项。',
  },
  'Wayne — security addendum walkthrough': {
    subject: '韦恩企业：安全附录讲解',
    outcome_notes: '法务会在一周内返回修订意见。',
  },
  'Wayne — platform governance webinar': {
    subject: '韦恩企业：平台治理网络研讨会',
    outcome_notes: '四个事业部参加，其中两个要求单独制定上线计划。',
  },
  'Wayne — bulk import rollout check-in': {
    subject: '韦恩企业：批量导入上线回访',
    outcome_notes: 'CSV 导入已上线并配好文档，客户在电话里确认关闭了这个需求。',
  },
  'Vertex — rollout phasing and data residency': {
    subject: '维特分析：分阶段上线与数据驻留',
    outcome_notes: '第一阶段限定在四个区域。数据驻留控制待和对方安全团队确认。',
  },
  'Vertex — revenue analytics demo': {
    subject: '维特分析：营收分析演示',
    outcome_notes: '销售、市场和服务负责人都想要自己的工作区，扩展的理由已经很充分。',
  },
  'Vertex — expansion buying committee call': {
    subject: '维特分析：扩展项目采购委员会电话',
    outcome_notes: '预算归首席营收官，数据团队继续做技术发起人。',
  },
  'Vertex — developer platform retrospective': {
    subject: '维特分析：开发者平台复盘',
    outcome_notes: '三个产品团队已在开发者平台上线，下一个需求是使用情况分析。',
  },
  'Stark Medical — Toronto clinical operations visit': {
    subject: '斯塔克医疗：多伦多临床运营拜访',
    location: '多伦多湾街 181 号 2200 室',
    outcome_notes: '两条临床服务线已在试点中上线。设备维修的扩展因预算暂缓。',
  },
  'CloudFirst — qualification call with Lisa Thompson': {
    subject: '云先科技：与唐莉的资格确认电话',
    outcome_notes: '预算已确认，双方同意开展技术评估，线索合格。',
  },
  'EduTech Labs — discovery call with David Kim': {
    subject: '智学科技实验室：与金志远的需求调研电话',
    outcome_notes: '要替换招生部门的电子表格。转介绍来源已确认。',
  },
  'CloudFirst — follow-up meeting after the Cloud Summit booth': {
    subject: '云先科技：云峰会展位后的跟进会议',
    outcome_notes: '讲了管道和预测功能。对方希望约财务一起做资格确认电话。',
  },
  'EduTech Labs — referral intro call with David Kim': {
    subject: '智学科技实验室：与金志远的转介绍引荐电话',
    outcome_notes: '合作伙伴热情引荐，已约好正式的需求调研电话。',
  },
  'Acme — AI agent governance workshop': {
    subject: '艾克美集团：AI 智能体治理研讨会',
    description: '与艾克美合规团队的联合研讨会：数据范围、基于角色的访问控制、审计追踪、人工审核。',
  },
  'Wayne — procurement signature call': {
    subject: '韦恩企业：采购签字电话',
    description: '安全附录关闭后，确认签字日期。',
  },
  'Globex — manufacturing suite demo': {
    subject: '环球工业：制造套件演示',
    description: '在资格评审之前，为六个工厂的推广做一次工厂运营演示。',
  },
  'Lattice — renewal proposal review': {
    subject: '格致教育：续约方案评审',
    description: '在与高管发起人开会之前，带采购过一遍两年期方案。',
  },
  'Initech — re-engagement call before renewal': {
    subject: '英泰科技：续约前的重新接洽电话',
    description: '已经十周没人和英泰科技沟通了，距离续约只剩 75 天。要把关系重新建立起来。',
  },
  'Northwind — grid modernization discovery workshop': {
    subject: '北风能源：电网现代化需求调研研讨会',
    location: '慕尼黑利奥波德大街 21 号',
    description: '确认需求调研的参与人员，并就运营数据评估的范围达成一致。',
  },
  'Apex Logistics — data hub re-engagement call': {
    subject: '顶点物流：数据中台重新接洽电话',
    description: '数据中台的评估已经沉寂了一个季度，要重新找到商务方面的发起人。',
  },
  'NextGen Retail — first discovery call with Alice Martinez': {
    subject: '新世代零售：与马丽华的首次需求调研电话',
    description: '官网咨询进来的线索，约在她定的跟进日。',
  },
  'Globex — line expansion review': {
    subject: '环球工业：产线扩展评审',
    description: '客户取消了会议：现有 MES 供应商已经把两条产线打包进去了。',
  },
  'Initech — SSO configuration check-in': {
    subject: '英泰科技：单点登录配置回访',
    description: '客户没有参加。这是英泰科技失联之前我们最后一次尝试联系。',
  },
};

/** The Chinese subject of the event an English row names. */
const zhEventSubject = zhKey('event', EVENTS_ZH, 'subject');

export const eventsZhCN = zhCNTwin(events, {
  key: (r) => String(r.subject),
  words: EVENTS_ZH,
  text: ['subject', 'outcome_notes', 'description'],
  refs: {
    related_to_account: zhAccountName,
    related_to_opportunity: zhOpportunityName,
    related_to_contact: zhContactEmail,
    related_to_lead: zhLeadEmail,
    related_to_case: zhCaseSubject,
  },
});

export const eventAttendeesFromContactsZhCN = zhCNTwin(eventAttendeesFromContacts, {
  refs: { crm_event: zhEventSubject, crm_contact: zhContactEmail },
});

export const eventAttendeesFromLeadsZhCN = zhCNTwin(eventAttendeesFromLeads, {
  refs: { crm_event: zhEventSubject, crm_lead: zhLeadEmail },
});

// ─── Lead timeline pointers ───────────────────────────────────────────
//
// Each pointer mirrors what `log_call` / `log_meeting` would have written for
// its event (see `leadInteractionPointers`). The writer's own summary prefix
// and `min` unit are fixed English in the action (`activity-actions.ts`), so
// the twin keeps them and swaps only the event subject and its notes: it
// mirrors the writer, it is not a second one.
export const leadInteractionPointersZhCN = zhCNTwin(leadInteractionPointers, {
  refs: { source_id: zhEventSubject, record_id: zhLeadEmail },
  map: (twin, english) => {
    const subject = String(english.source_id);
    const words = EVENTS_ZH[subject]!;
    const metadata = JSON.parse(String(english.metadata)) as Record<string, unknown>;
    return {
      ...twin,
      summary: String(english.summary).replace(subject, String(words.subject)),
      metadata: JSON.stringify({ ...metadata, notes: words.outcome_notes ?? '' }),
    };
  },
});
