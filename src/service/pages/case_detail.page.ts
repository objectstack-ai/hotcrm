// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Case Detail — the synthesized record page with ONE slot filled: `alerts`
 * (#2382, maintainer ruling 2026-10-29: 「四张页全部退成默认页，只把告警留作单槽覆盖」).
 *
 * Everything else a case's record page draws is the platform's default page,
 * derived from `crm_case`'s own metadata: the header and its record-header
 * actions (Reopen / Escalate / Close, the activity trio; the console's own
 * Claim on a queued case), the highlight strip (`highlightFields`), the status
 * path (the `status` field's options), the Details body (`fieldGroups`), the
 * related column (Tasks scoped to open ones by `relatedListFilter` on
 * `crm_task.related_to_case`) and the one timeline stream, which shows a logged
 * call or meeting (`showCompleted` is the default page's own setting).
 *
 * The page this replaced was a hand-built `kind: 'full'` layout of six
 * blocks; the PR for #2382 records what became of each one.
 */
export const CaseDetailPage: Page = {
  name: 'case_detail_page',
  label: 'Case Detail',
  description: 'The case record page: the synthesized layout, with the SLA-breach banner in the alerts slot.',

  type: 'record',
  object: 'crm_case',
  isDefault: true,

  kind: 'slotted',
  regions: [],
  slots: {
    // Drawn between the header and the highlight strip
    // (`buildDefaultPageSchema`, step 2.5), where it sat on the retired page.
    alerts: [
      {
        // Shown only on a breached case (#2369 row 6), so a case on track
        // shows nothing red. `has()` first: this renderer fails soft to
        // SHOWN on an unevaluable predicate (see `src/sales/pages/lead_detail.page.ts`).
        type: 'record:alert',
        id: 'case_sla_breached',
        label: 'SLA Breached',
        properties: {
          severity: 'error',
          visible: P`has(record.is_sla_violated) && record.is_sla_violated == true`,
          title: {
            en: 'SLA breached',
            'zh-CN': '已违反 SLA',
            'ja-JP': 'SLA違反',
            'es-ES': 'SLA incumplido',
          },
          body: {
            en: 'This case was not resolved by its SLA due date.',
            'zh-CN': '该工单未在 SLA 截止时间前解决。',
            'ja-JP': 'このケースは SLA 期限までに解決されませんでした。',
            'es-ES': 'Este caso no se resolvió antes de su fecha límite de SLA.',
          },
        },
      },
    ],
  },
};
