// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * 日本語 (ja-JP) — the PSA module's own translations: every row whose target
 * this package registers. Why they live here and not in the app package's
 * pack: `./index.ts`.
 */
export const jaJP: TranslationData = {
  apps: {
    // This package's own app (#2316).
    crm_psa: {
      label: 'プロジェクト納品',
      description: 'プロジェクト、アサインされたメンバー、工数と経費、そしてその結果の粗利',
      navigation: {
        group_customers: { label: '取引先と契約' },
        group_work: { label: 'マイワーク' },
        nav_approval_requests: { label: '受信トレイ' },
      },
    },
  },
};
