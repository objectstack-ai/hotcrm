// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — the PSA module's own translations: every row whose target this
 * package registers. Why they live here and not in the app package's pack:
 * `./index.ts`.
 */
export const en: TranslationData = {
  apps: {
    // This package's own app (#2316). The contributed entries' labels are the
    // app package's, which contributes them.
    crm_psa: {
      label: 'Project Delivery',
      description: 'Projects, the people staffed on them, their time and expenses, and the margin that results',
      navigation: {
        group_customers: { label: 'Customers and Contracts' },
        group_work: { label: 'My Work' },
        nav_approval_requests: { label: 'Inbox' },
      },
    },
  },
};
