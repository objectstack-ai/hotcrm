// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Opportunity Views
 *
 * Sales pipeline benefits from multiple visualisations:
 *   • grid     — full pipeline browsing & inline edits
 *   • kanban   — drag-and-drop pipeline stage management (group by stage)
 *   • calendar — close-date forecasting on a monthly view
 *   • timeline — chronological deal flow grouped by owner
 *   • gallery  — pinboard / executive review cards
 */
export const OpportunityViews = defineView({
  // The landing view is OPEN deals, not every deal ever recorded.
  //
  // Sorted by close_date ascending and unfiltered, "All Opportunities" opened
  // on settled history: the first screen was 7 closed-won and 4 closed-lost
  // records, and a rep had to scroll past months of finished business to reach
  // anything they could still act on. The full unfiltered list is still one
  // click away on the "All Opportunities" tab.
  list: {
    type: 'grid',
    name: 'open_opportunities',
    label: 'Open Deals',
    data: { provider: 'object', object: 'crm_opportunity' },
    filter: [
      { field: 'stage', operator: 'not_in', value: ['closed_won', 'closed_lost'] },
    ],
    columns: [
      { field: 'name', width: 220, sortable: true, link: true },
      { field: 'crm_account', label: 'Account', width: 180 },
      { field: 'stage', width: 140, sortable: true },
      { field: 'amount', width: 140, align: 'right', sortable: true, summary: 'sum' },
      { field: 'probability', width: 110, align: 'right' },
      { field: 'expected_revenue', width: 160, align: 'right', summary: 'sum' },
      { field: 'close_date', width: 140, sortable: true },
      { field: 'owner', width: 150 },
    ],
    sort: [{ field: 'close_date', order: 'asc' }],
    grouping: { fields: [{ field: 'stage', order: 'asc', collapsed: false }] },
    rowColor: {
      field: 'stage',
      colors: {
        prospecting: '#94a3b8',
        qualification: '#60a5fa',
        proposal: '#f59e0b',
        negotiation: '#a855f7',
        closed_won: '#16a34a',
        closed_lost: '#dc2626',
      },
    },
    pagination: { pageSize: 25, pageSizeOptions: [25, 50, 100] },
    selection: { type: 'multiple' },
    showRecordCount: true,
    exportOptions: ['csv', 'xlsx'],
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'kanban', 'calendar', 'timeline', 'gallery'],
    },
    tabs: [
      { name: 'open', label: 'Open Deals', icon: 'target', view: 'open_opportunities', isDefault: true, pinned: true },
      { name: 'mine', label: 'My Deals', icon: 'user', view: 'my_open_deals' },
      { name: 'pipeline', label: 'Pipeline', icon: 'columns-3', view: 'pipeline_kanban' },
      { name: 'all', label: 'All Opportunities', view: 'all_opportunities' },
      { name: 'crm_forecast', label: 'Forecast', icon: 'calendar', view: 'close_date_calendar' },
      { name: 'timeline', label: 'Timeline', icon: 'git-commit-horizontal', view: 'deal_timeline' },
      { name: 'cards', label: 'Cards', icon: 'gallery-thumbnails', view: 'deal_gallery' },
      { name: 'stale', label: 'Stale', icon: 'triangle-alert', view: 'stale_opportunities' },
      { name: 'closing', label: 'Closing Soon', icon: 'calendar-check', view: 'closing_this_quarter' },
    ],
    // List-level entry points: generate_quote reaches the row menu via its
    // own `locations: ['list_item']` — repeating it here as a string would go
    // through the legacy rowActions path and render a duplicate, dead item
    // (objectstack-ai/objectui#2960). mass_update_stage stays wired even
    // though console 16.1.0 cannot deliver bulk selections yet (tracked in
    // issue #508 — see the note in opportunity.actions.ts). Built-in
    // `exportOptions` covers CSV export.
    rowActions: ['edit'],
    bulkActions: ['mass_update_stage'],
  },

  listViews: {
    /**
     * All Opportunities — the unfiltered book, including closed business.
     *
     * Demoted from the landing view (see the note on `list` above) but kept
     * whole: reporting, audits and win/loss reviews all need the closed rows,
     * and a manager reaches this in one click.
     */
    all_opportunities: {
      name: 'all_opportunities',
      type: 'grid',
      label: 'All Opportunities',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: [
        { field: 'name', width: 220, sortable: true, link: true },
        { field: 'crm_account', label: 'Account', width: 180 },
        { field: 'stage', width: 140, sortable: true },
        { field: 'amount', width: 140, align: 'right', sortable: true, summary: 'sum' },
        { field: 'probability', width: 110, align: 'right' },
        { field: 'expected_revenue', width: 160, align: 'right', summary: 'sum' },
        { field: 'close_date', width: 140, sortable: true },
        { field: 'owner', width: 150 },
      ],
      sort: [{ field: 'close_date', order: 'desc' }],
      showRecordCount: true,
    },

    /** Drag-and-drop sales pipeline */
    pipeline_kanban: {
      name: 'pipeline_kanban',
      type: 'kanban',
      label: 'Sales Pipeline',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'crm_account', 'amount', 'close_date', 'owner'],
      kanban: {
        groupByField: 'stage',
        summarizeField: 'amount',
        columns: ['name', 'crm_account', 'amount', 'close_date'],
      },
      filter: [{ field: 'stage', operator: 'not_equals', value: 'closed_lost' }],
      navigation: { mode: 'drawer', width: '640px' },
    },

    /** Close-date forecasting calendar */
    close_date_calendar: {
      name: 'close_date_calendar',
      type: 'calendar',
      label: 'Forecast Calendar',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'amount', 'stage', 'owner'],
      calendar: {
        startDateField: 'close_date',
        titleField: 'name',
        colorField: 'stage',
      },
    },

    /** Chronological deal flow */
    deal_timeline: {
      name: 'deal_timeline',
      type: 'timeline',
      label: 'Deal Timeline',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'crm_account', 'amount'],
      timeline: {
        // `created_at`, the platform's own creation stamp — the object's
        // duplicate `created_date` was removed in #575 B2 because nothing ever
        // wrote it, so this timeline started every bar at null. Same spelling
        // as the lead activity calendar.
        startDateField: 'created_at',
        endDateField: 'close_date',
        titleField: 'name',
        groupByField: 'owner',
        colorField: 'stage',
        scale: 'month',
      },
    },

    /** Executive review cards */
    deal_gallery: {
      name: 'deal_gallery',
      type: 'gallery',
      label: 'Deal Cards',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'crm_account', 'amount', 'stage', 'close_date'],
      gallery: {
        cardSize: 'medium',
        titleField: 'name',
        visibleFields: ['crm_account', 'amount', 'stage', 'probability', 'close_date', 'owner'],
      },
    },

    /** Personal pipeline */
    my_open_deals: {
      name: 'my_open_deals',
      type: 'grid',
      label: 'My Open Deals',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'crm_account', 'stage', 'amount', 'close_date'],
      // "Open" has to exclude BOTH closed stages. Excluding only closed_won
      // meant a rep's own queue opened on their lost deals, sorted to the top
      // by close_date — the least actionable rows in the system.
      filter: [
        { field: 'owner', operator: 'equals', value: '{current_user_id}' },
        { field: 'stage', operator: 'not_in', value: ['closed_won', 'closed_lost'] },
      ],
      sort: [{ field: 'close_date', order: 'asc' }],
    },

    /** Stale Opportunities — still-open deals, longest-parked first */
    stale_opportunities: {
      name: 'stale_opportunities',
      type: 'grid',
      // Honest label: the view cannot express the 14-day cut its automation
      // twin uses, for two independent reasons. `days_in_stage` is a FORMULA
      // (#489) — evaluated after the query, so the data engine can neither
      // filter nor sort on it — and the list data path resolves no date
      // macros, so `stage_entry_date < {14_days_ago}` would ship the literal
      // token and invert the comparison (same trap as `stale_articles`).
      // So: operator-only filter, ordered by the stored `stage_entry_date`
      // ascending — longest-parked on top, which is the queue a manager works.
      // The `days_in_stage` column puts the `opportunity_stagnation` threshold
      // (STALE_THRESHOLD_DAYS = 14) in plain sight on every row.
      label: '⚠️ Stale Opportunities · Longest in Stage First',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'crm_account', 'stage', 'amount', 'stage_entry_date', 'days_in_stage', 'close_date', 'owner'],
      filter: [
        { field: 'stage', operator: 'not_in', value: ['closed_won', 'closed_lost'] },
      ],
      sort: [{ field: 'stage_entry_date', order: 'asc' }, { field: 'close_date', order: 'asc' }],
    },

    /** Closing this quarter (commit + best_case) — sales-manager forecast */
    closing_this_quarter: {
      name: 'closing_this_quarter',
      type: 'grid',
      label: 'Closing This Quarter',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'crm_account', 'amount', 'forecast_category', 'probability', 'close_date', 'owner'],
      filter: [
        { field: 'forecast_category', operator: 'in', value: ['commit', 'best_case'] },
        { field: 'stage', operator: 'not_in', value: ['closed_won', 'closed_lost'] },
      ],
      sort: [{ field: 'close_date', order: 'asc' }],
    },
  },

  form: {
    type: 'tabbed',
    sections: [
      {
        label: 'Overview',
        columns: 2,
        fields: [
          { field: 'name', required: true, colSpan: 2 },
          { field: 'crm_account', required: true },
          'primary_contact',
          { field: 'stage', required: true },
          { field: 'amount', required: true },
          'probability',
          'close_date',
          'owner',
        ],
      },
      {
        label: 'Forecast',
        columns: 2,
        fields: [
          'expected_revenue',
          'forecast_category',
          'type',
          'lead_source',
          'crm_campaign',
          'stage_entry_date',
          'days_in_stage',
          'is_private',
        ],
      },
      {
        label: 'Sales Strategy',
        columns: 1,
        fields: ['next_step', 'competitors'],
      },
      {
        // Win/loss capture at close time. The fields existed on the object for
        // reporting but no form offered them, so every closed deal lost its
        // why-we-won / why-we-lost data.
        label: 'Win / Loss',
        collapsible: true,
        collapsed: true,
        columns: 2,
        fields: ['win_reason', 'loss_reason', { field: 'loss_details', colSpan: 2 }],
      },
    ],
  },
});
