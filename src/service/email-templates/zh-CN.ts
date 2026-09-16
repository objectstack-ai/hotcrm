// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { EmailTemplatePack } from '../../sales/email-templates/_bundle';

/** 简体中文 (zh-CN) — the service package's notification templates. See `en.ts`. */
export const zhCN: EmailTemplatePack = {
  'crm.case_escalated': {
    label: '工单已升级',
    subject: '工单已升级：{{case_number}}',
    bodyHtml: '<p>工单 {{case_number}}（{{priority}}）因严重级别已自动升级。所有权将转交给当前负荷最轻的服务经理；若该职位暂无人担任，工单仍归您所有。请打开工单查看当前负责人。</p>',
  },
  'crm.case_sla_breach': {
    label: '工单 SLA 超时',
    subject: 'SLA 超时：工单 {{case_number}}',
    bodyHtml: '<p>工单 {{case_number}}（{{priority}}）已超过 SLA 到期时间，并已自动升级。</p>',
  },
};
