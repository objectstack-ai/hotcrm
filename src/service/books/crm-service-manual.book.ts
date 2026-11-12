// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineBook } from '@objectstack/spec';

/**
 * The Service Manual (#2415) — the service module's own pages, from
 * `src/service/docs/`, opened from *Help* (the entry is contributed in
 * `src/service/index.ts`).
 *
 * These pages were the *Service* group of the app's User Manual, reached
 * through `package: 'app.objectstack.hotcrm.service'`. A group rule matches its
 * own book's package unless it names another, and naming one ties the group to
 * a package IDENTITY: the hosted marketplace publishes the four packages
 * flattened into one (cloud#3636), every doc there belongs to
 * `app.objectstack.hotcrm`, and the group matched nothing — the three pages
 * fell under UNCATEGORIZED and the group showed empty.
 *
 * A book of the package that owns the pages, with no `package` on its group,
 * matches in both shapes: unflattened, the book and its pages are both the
 * service package's; flattened, both are the app package's. The revenue and
 * marketing manuals are written the same way and already display on hosted.
 */
export const CrmServiceManual = defineBook({
  name: 'crm_service_manual',
  label: 'HotCRM Service Manual',
  description: 'Cases and SLAs, the knowledge base, and how incoming cases are triaged.',
  icon: 'headset',
  order: 5,
  groups: [
    { key: 'service', label: 'Service', order: 1, include: 'crm_service_*' },
  ],
});
