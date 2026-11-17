// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 简体中文（zh-CN）— 项目交付的通知模板（`project_budget_alert`）。 */
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
};
