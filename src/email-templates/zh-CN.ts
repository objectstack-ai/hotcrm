// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplateDefinition } from '@objectstack/spec/system';

/**
 * 简体中文 (`zh-CN`) — notification bundles for the `notify` flow nodes.
 *
 * Row-for-row with `en-US.ts`: same `name`, same `{{key}}` placeholders, same
 * order. A row here exists only to say the SAME thing in this language — ⛔ do
 * not add, drop or re-scope a notification from a locale file.
 *
 * Object nouns follow the zh-CN language pack (`src/translations/zh-CN/`) so a
 * notification names a record the same way the list view the reader clicks
 * through to does.
 */
export const zhCN: EmailTemplateDefinition[] = [
  {
    name: 'crm_case_escalated', label: '案例已升级', category: 'notification', locale: 'zh-CN',
    subject: '案例已升级：{{case_number}}',
    bodyHtml: '<p>案例 {{case_number}}（{{priority}}）因紧急优先级已自动升级。所有权将转给当前负荷最轻的服务经理；在无人担任该职位期间，案例仍归您所有。请打开案例查看当前负责人。</p>',
  },
  {
    name: 'crm_case_sla_breach', label: '案例已违反 SLA', category: 'notification', locale: 'zh-CN',
    subject: 'SLA 已违约：案例 {{case_number}}',
    bodyHtml: '<p>案例 {{case_number}}（{{priority}}）已超过 SLA 到期日，并已自动升级。</p>',
  },
  {
    name: 'crm_contact_welcome', label: '新联系人待欢迎', category: 'notification', locale: 'zh-CN',
    subject: '新联系人：{{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} 已添加为联系人。请主动联系并表示欢迎。</p>',
  },
  {
    name: 'crm_contract_expired', label: '合同已到期', category: 'notification', locale: 'zh-CN',
    subject: '合同已到期：{{contract_number}}',
    bodyHtml: '<p>合同 {{contract_number}} 已到达结束日期，并已标记为已到期。</p>',
  },
  {
    name: 'crm_contract_renewal', label: '合同续约到期', category: 'notification', locale: 'zh-CN',
    subject: '合同续约到期：{{contract_number}}',
    bodyHtml: '<p>合同 {{contract_number}} 将于 {{end_date}} 结束。请立即启动续约洽谈。</p>',
  },
  {
    name: 'crm_lead_hot', label: '热门线索已分配', category: 'notification', locale: 'zh-CN',
    subject: '热门线索 —— 请在 24 小时内分配：{{first_name}} {{last_name}}',
    bodyHtml: '<p>来自 {{company}} 的 {{first_name}} {{last_name}}（评级 {{rating}}）今天就需要一位负责人。</p>',
  },
  {
    name: 'crm_lead_new', label: '新线索待分配', category: 'notification', locale: 'zh-CN',
    subject: '新线索待分配：{{first_name}} {{last_name}}',
    bodyHtml: '<p>来自 {{company}} 的 {{first_name}} {{last_name}} 正在等待分配。</p>',
  },
  {
    name: 'crm_lead_converted', label: '线索已转换', category: 'notification', locale: 'zh-CN',
    subject: '线索已转换：{{first_name}} {{last_name}}',
    bodyHtml: '<p>线索 {{first_name}} {{last_name}} 已转换为客户和联系人。</p>',
  },
  {
    name: 'crm_opportunity_approved', label: '商机已批准', category: 'notification', locale: 'zh-CN',
    subject: '商机已批准：{{name}}',
    bodyHtml: '<p>您的商机 {{name}} 已获批准。</p>',
  },
  {
    name: 'crm_opportunity_rejected', label: '商机已驳回', category: 'notification', locale: 'zh-CN',
    subject: '商机已驳回：{{name}}',
    bodyHtml: '<p>您的商机 {{name}} 未获批准。请审阅并修改后再次提交。</p>',
  },
  {
    name: 'crm_deal_stalled', label: '商机停滞', category: 'notification', locale: 'zh-CN',
    subject: '停滞的商机：{{name}}',
    bodyHtml: '<p>商机 {{name}} 已在 {{stage}} 阶段停留 {{days_in_stage}} 天。请推进或重新评估资格。</p>',
  },
  {
    name: 'crm_large_deal_won', label: '大额商机已赢单', category: 'notification', locale: 'zh-CN',
    subject: '大额商机已赢单：{{name}}',
    bodyHtml: '<p>{{name}} 以 {{amount}} 成交。恭喜整个团队。</p>',
  },
  {
    name: 'crm_quote_created', label: '报价单已创建', category: 'notification', locale: 'zh-CN',
    subject: '报价单已创建：{{quote_name}}',
    bodyHtml: '<p>您的报价单 {{quote_name}} 已根据此商机创建。</p>',
  },
  {
    name: 'crm_task_reminder', label: '任务提醒', category: 'notification', locale: 'zh-CN',
    subject: '任务提醒：{{subject}}',
    bodyHtml: '<p>您的任务“{{subject}}”已到期（提醒时间为 {{reminder_date}}）。</p>',
  },
  {
    name: 'crm_urgent_task', label: '紧急任务已分配', category: 'notification', locale: 'zh-CN',
    subject: '紧急任务：{{subject}}',
    bodyHtml: '<p>一项紧急任务“{{subject}}”已分配给您，需要立即处理。</p>',
  },
];
