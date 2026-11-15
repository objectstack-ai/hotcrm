// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 简体中文 (zh-CN) — the PSA module's own translations: every row whose target
 * this package registers. Why they live here and not in the app package's
 * pack: `./index.ts`.
 */
export const zhCN: TranslationData = {
  apps: {
    // This package's own app (#2316); the name is the maintainer's (2026-11-15).
    crm_psa: {
      label: '项目交付',
      description: '项目、项目成员、工时与费用，以及由此得出的毛利',
      navigation: {
        group_customers: { label: '客户与合同' },
        group_work: { label: '我的工作' },
        nav_approval_requests: { label: '待我审批' },
      },
    },
  },
};
