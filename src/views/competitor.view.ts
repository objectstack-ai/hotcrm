// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Competitor Views
 *
 *   • grid       — full competitor catalog with threat levels
 *   • high_threat — the deals-at-risk shortlist
 */
export const CompetitorViews = defineView({
  list: {
    type: 'grid',
    name: 'all_competitors',
    label: 'All Competitors',
    data: { provider: 'object', object: 'crm_competitor' },
    columns: [
      { field: 'name', width: 220, sortable: true, link: true, pinned: 'left' },
      { field: 'threat_level', width: 120, sortable: true, align: 'center' },
      { field: 'main_products', width: 320 },
      { field: 'website', width: 200 },
      { field: 'owner', width: 150 },
      { field: 'is_active', width: 100, align: 'center' },
    ],
    // NOTE: sorting on `threat_level` orders by the stored option VALUE
    // (alphabetical: high < low < medium), not by option position — so a
    // "threat desc" sort renders 中/低/高 in a random-looking order. Sort by
    // name instead; the threat filter chips cover the triage use case.
    sort: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 25 },
    selection: { type: 'multiple' },
    userFilters: {
      element: 'dropdown',
      fields: [{ field: 'threat_level' }, { field: 'is_active' }],
    },
  },

  listViews: {
    /** High-threat shortlist */
    high_threat: {
      name: 'high_threat',
      type: 'grid',
      label: 'High Threat',
      data: { provider: 'object', object: 'crm_competitor' },
      columns: ['name', 'main_products', 'our_disadvantages', 'owner'],
      filter: [{ field: 'threat_level', operator: 'equals', value: 'high' }],
      sort: [{ field: 'name', order: 'asc' }],
    },
  },

  form: {
    type: 'simple',
    data: { provider: 'object', object: 'crm_competitor' },
    sections: [
      {
        label: 'Basic Information',
        columns: 2,
        fields: [
          { field: 'name', required: true },
          'threat_level',
          'website',
          'owner',
          { field: 'main_products', colSpan: 2 },
          'is_active',
        ],
      },
      {
        label: 'Battlecard',
        columns: 1,
        fields: ['our_advantages', 'our_disadvantages', 'notes'],
      },
    ],
  },
});
