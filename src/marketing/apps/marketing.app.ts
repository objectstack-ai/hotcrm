// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { App } from '@objectstack/spec/ui';
import { HOTCRM_ICON } from '../../sales/apps/crm.app';

/**
 * the Marketing app (#2417) — the marketing team's app, declared by the
 * marketing package (an app package may declare one app only, ADR-0019 D3).
 * Disabling the module takes the whole app off the launcher (measured on
 * 18.3.0), which is the "Marketing when enabled" of the split.
 *
 * Campaigns are this package's, so the app opens on them. The leads, contacts
 * and accounts a campaign targets, the member's own tasks and the lead report
 * belong to the app package; an app's own `navigation` may not name another
 * package's object (ADR-0130), so the groups below are ANCHORS that
 * `src/sales/index.ts` fills through `navigationContributions`.
 */
export const MarketingApp = App.create({
  name: 'crm_marketing',
  label: 'Marketing',
  description: 'Campaigns and the leads, contacts and accounts they reach',
  icon: 'megaphone',
  defaultAgent: 'ask',
  branding: {
    primaryColor: '#EA580C',
    logo: HOTCRM_ICON,
    favicon: HOTCRM_ICON,
  },

  navigation: [
    { id: 'nav_campaign', type: 'object', objectName: 'crm_campaign', label: 'Campaigns', icon: 'megaphone' },

    // ANCHOR — Leads, Contacts and Accounts, contributed by the app package.
    { id: 'group_audience', type: 'group', label: 'Audience', icon: 'users', expanded: true, children: [] },

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

    // ANCHOR — Lead Engagement by Month, contributed by the app package.
    { id: 'group_reports', type: 'group', label: 'Reports', icon: 'file-chart-column', expanded: false, children: [] },

    {
      id: 'group_help',
      type: 'group',
      label: 'Help',
      icon: 'circle-help',
      expanded: false,
      children: [
        { id: 'nav_help_marketing', type: 'doc', book: 'crm_marketing_manual', label: 'Marketing Manual', icon: 'megaphone' },
      ],
    },
  ],
});
