// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 简体中文（zh-CN）— 费用模块的通知模板（`expense_report_project_approval`）。 */
export const zhCN: EmailTemplatePack = {
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
