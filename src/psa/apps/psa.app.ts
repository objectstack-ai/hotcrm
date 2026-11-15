// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { App } from '@objectstack/spec/ui';
import { HOTCRM_ICON } from '../../sales/apps/crm.app';

/**
 * the Project Delivery app (「项目交付」, hotcrm#2316) — the delivery team's
 * app, declared by the PSA module as the Service, Marketing and Order to Cash
 * apps are declared by theirs (an app package may declare one app only,
 * ADR-0019 D3). The maintainer ruled the shape on 2026-11-15 (option A,
 * `docs/architecture/psa-module-plan.md`, *Recorded 2026-11-15*): a suite
 * module with its own app. Disabling the module takes the whole app off the
 * launcher, as it does for the Order to Cash app.
 *
 * Phase 0 is the SKELETON: the module owns no object yet, so every entry here
 * is the app package's, reaching the app through ANCHOR groups that
 * `src/sales/index.ts` fills with `navigationContributions` — an app's own
 * `navigation` may not name another package's object (ADR-0130). Phase 1 adds
 * the projects, members, rate cards, timesheets and expenses as this app's own
 * groups, ahead of the anchors.
 *
 * Who sees it is the app package's permission sets (`tabPermissions`). While
 * the app carries nothing of its own, every business set hides it. A member
 * who holds none of those sets is still offered it, as every app is offered
 * to them: the administrators, and the executive and director positions,
 * which carry no set of their own (measured on 18.4.0, #2316). Phase 1 opens
 * it to the delivery roles.
 */
export const PsaApp = App.create({
  name: 'crm_psa',
  label: 'Project Delivery',
  description: 'Projects, the people staffed on them, their time and expenses, and the margin that results',
  icon: 'briefcase',
  defaultAgent: 'ask',
  branding: {
    primaryColor: '#0D9488',
    logo: HOTCRM_ICON,
    favicon: HOTCRM_ICON,
  },

  navigation: [
    // ANCHOR — Accounts, Opportunities and Contracts, contributed by the app package.
    { id: 'group_customers', type: 'group', label: 'Customers and Contracts', icon: 'building', expanded: true, children: [] },

    {
      id: 'group_work',
      type: 'group',
      label: 'My Work',
      icon: 'list-checks',
      expanded: true,
      // My Tasks is contributed by the app package and lands after the Inbox.
      children: [
        { id: 'nav_approval_requests', type: 'component', componentRef: 'approvals:inbox', label: 'Inbox', icon: 'inbox', requiresObject: 'sys_approval_request' },
      ],
    },
  ],
});
