// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 简体中文（zh-CN）— 项目交付的通知模板（`project_budget_alert`、`expense_report_project_approval`）。 */
export const zhCN: EmailTemplatePack = {
  'crm.project_budget_warning': {
    label: '项目预算预警',
    subject: '预算预警：{{name}}',
    bodyHtml: '<p>项目 {{name}} 的支出已达到批准预算的 80% 或以上。请查看剩余预算。如果不应再提交工时和费用，请在项目上勾选「锁定工时与费用」。</p>',
  },
  'crm.project_budget_exceeded': {
    label: '项目预算超支',
    subject: '预算超支：{{name}}',
    bodyHtml: '<p>项目 {{name}} 已用完全部批准预算。如需停止继续提交工时和费用，请在项目上勾选「锁定工时与费用」，再商定新的预算。</p>',
  },
  'crm.expense_report_project_over': {
    label: '关闭项目上的报销单',
    subject: '报销单已退回：{{name}}',
    bodyHtml: '<p>你的报销单 {{name}} 提交在项目 {{project}} 上，但该项目已关闭或已取消，不再接受费用。报销单已退回草稿：请删除这张报销单，把其中的费用改挂到进行中的项目，再重新提交。</p>',
  },
  'crm.expense_report_project_locked': {
    label: '锁定项目上的报销单',
    subject: '报销单已退回：{{name}}',
    bodyHtml: '<p>你的报销单 {{name}} 提交在项目 {{project}} 上，但该项目已锁定工时与费用。报销单已退回草稿：请在项目经理取消勾选“锁定工时与费用”后再次提交。</p>',
  },
};
