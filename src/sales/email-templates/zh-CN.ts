// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from './_bundle';

/** 简体中文 (zh-CN) — the sales package's notification templates. See `en.ts`. */
export const zhCN: EmailTemplatePack = {
  'crm.account_approved': {
    label: '客户审批通过',
    subject: '客户已审批通过：{{name}}',
    bodyHtml: '<p>该客户已审批通过，现为正式数据。</p>',
  },
  'crm.account_rejected': {
    label: '客户审批未通过',
    subject: '客户未通过审批：{{name}}',
    bodyHtml: '<p>该客户未通过审批。请修正其信息后再次提交审核。</p>',
  },
  'crm.contact_welcome': {
    label: '新联系人',
    subject: '新联系人：{{first_name}} {{last_name}}',
    bodyHtml: '<p>{{first_name}} {{last_name}} 已添加为联系人。请主动联系并表示欢迎。</p>',
  },
  'crm.contract_expired': {
    label: '合同已到期',
    subject: '合同已到期：{{contract_number}}',
    bodyHtml: '<p>合同 {{contract_number}} 已到达结束日期，并已标记为到期。</p>',
  },
  'crm.contract_renewal': {
    label: '合同续约提醒',
    subject: '合同待续约：{{contract_number}}',
    bodyHtml: '<p>合同 {{contract_number}} 将于 {{end_date}} 结束。请立即启动续约沟通。</p>',
  },
  'crm.deal_stalled': {
    label: '商机停滞',
    subject: '停滞商机：{{name}}',
    bodyHtml: '<p>商机 {{name}} 已在“{{stage}}”阶段停留 {{days_in_stage}} 天。请推进或重新评估。</p>',
  },
  'crm.large_deal_won': {
    label: '大额商机赢单',
    subject: '大额商机赢单：{{name}}',
    bodyHtml: '<p>{{name}} 以 {{amount | number:2}} 成交。恭喜团队。</p>',
  },
  'crm.lead_conversion_approved': {
    label: '线索转换已批准',
    subject: '线索转换已批准：{{first_name}} {{last_name}}',
    bodyHtml: '<p>该线索已审批通过。您可以将其转换为客户、联系人和商机。</p>',
  },
  'crm.lead_conversion_rejected': {
    label: '线索转换未批准',
    subject: '线索未通过审批：{{first_name}} {{last_name}}',
    bodyHtml: '<p>该线索的转换未获批准。请继续跟进，或注明原因将其取消资格。</p>',
  },
  'crm.lead_converted': {
    label: '线索已转换',
    subject: '线索已转换：{{first_name}} {{last_name}}',
    bodyHtml: '<p>线索 {{first_name}} {{last_name}} 已转换为客户和联系人。</p>',
  },
  'crm.lead_routing_hot': {
    label: '热门线索分配',
    subject: '热门线索 — 请在 24 小时内跟进：{{first_name}} {{last_name}}',
    bodyHtml: '<p>来自 {{company}} 的 {{first_name}} {{last_name}}（评分 {{rating}}）由您负责，请最迟明天跟进。</p>',
  },
  'crm.lead_routing_new': {
    label: '新线索分配',
    subject: '新线索已分配给您：{{first_name}} {{last_name}}',
    bodyHtml: '<p>来自 {{company}} 的 {{first_name}} {{last_name}} 现已分配给您，请在三天内跟进。</p>',
  },
  'crm.opportunity_approved': {
    label: '商机审批通过',
    subject: '商机已批准：{{name}}',
    bodyHtml: '<p>您的商机 {{name}} 已获批准。</p>',
  },
  'crm.opportunity_rejected': {
    label: '商机审批未通过',
    subject: '商机未批准：{{name}}',
    bodyHtml: '<p>您的商机 {{name}} 未获批准。请检查并修改后重新提交。</p>',
  },
  'crm.task_reminder': {
    label: '任务提醒',
    subject: '任务提醒：{{subject}}',
    bodyHtml: '<p>您的任务“{{subject}}”已到期（提醒时间 {{reminder_date}}）。</p>',
  },
  'crm.urgent_task': {
    label: '紧急任务',
    subject: '紧急任务：{{subject}}',
    bodyHtml: '<p>一项紧急任务“{{subject}}”已分配给您，需要尽快处理。</p>',
  },
  // Sent by `contract_drafted_notice` when accepting a quote drafts its
  // contract (#2371 row 6).
  'crm.contract_drafted': {
    label: '合同已起草',
    subject: '合同已起草：{{contract_number}}',
    bodyHtml: '<p>接受报价单后已起草合同 {{contract_number}}。其中的期限和合同类型只是初始值，激活前请先核对。</p>',
  },
};
