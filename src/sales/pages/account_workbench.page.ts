// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page } from '@objectstack/spec/ui';

/**
 * Account Workbench — ADR-0047 interface page (Airtable Interfaces parity).
 *
 * The author-curated counterpart to the Accounts object nav entry. Where
 * the object entry (data mode) shows every list view as switcher tabs and
 * offers the full toolbar, this page is deliberately closed:
 *
 *   • it REFERENCES the account default view (`sourceView`) — columns,
 *     base filter and sort are inherited, never restated (the iron rule);
 *   • end users get exactly three quick filters: industry (with record
 *     counts), customer type, and owner_id (the platform ownership lookup —
 *     renders as a
 *     record-picker dropdown);
 *   • the visualization is locked to grid (single-entry whitelist);
 *   • advanced filtering / view management are not offered.
 *
 * Filter selections persist as `uf_*` URL params — reload-safe, shareable.
 *
 * NOTE: `interfaceConfig.userFilters` requires @objectstack/spec > 9.2.0
 * (ADR-0047). On older specs defineStack strips the unknown keys and the
 * page renders without the filter bar — a harmless no-op until the
 * dependency bump activates it.
 */
export const AccountWorkbenchPage: Page = {
  name: 'account_workbench',
  label: 'Account Workbench',
  description: 'Curated account list for the sales team: quick filters only, no view management.',
  type: 'list',
  object: 'crm_account',
  kind: 'full',
  template: 'default',
  isDefault: false,
  // Interface pages carry no regions — the list surface is generated from
  // `interfaceConfig` (ADR-0047), not composed from components.
  regions: [],
  interfaceConfig: {
    source: 'crm_account',
    sourceView: 'all_accounts',

    ...({
      userFilters: {
        element: 'dropdown',
        fields: [
          { field: 'industry', showCount: true },
          { field: 'type' },
          { field: 'owner_id' },
        ],
      },
      // typed via spread-as-any until @objectstack/spec ships ADR-0047
      // (UserFiltersSchema is in framework main, > 9.2.0)
    } as any),

    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid'],
    },

    userActions: {
      sort: true,
      search: true,
      filter: false,
      rowHeight: false,
      addRecordForm: false,
    },

    showRecordCount: true,
  },
};
