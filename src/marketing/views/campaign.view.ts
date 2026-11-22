// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Campaign Views
 *
 *   • grid     — performance grid with aggregated KPIs
 *   • gantt    — campaign schedule (start_date → end_date)
 *   • calendar — launch calendar
 *   • timeline — multi-campaign chronological view
 */
export const CampaignViews = defineView({
  list: {
    type: 'grid',
    name: 'all_campaigns',
    label: 'All Campaigns',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_campaign' },
    columns: [
      { field: 'name', width: 240, sortable: true, link: true, pinned: 'left' },
      { field: 'channel', width: 130 },
      { field: 'status', width: 130, sortable: true },
      { field: 'start_date', width: 130, sortable: true },
      { field: 'end_date', width: 130, sortable: true },
      { field: 'budgeted_cost', width: 140, align: 'right', summary: 'sum' },
      { field: 'expected_revenue', width: 160, align: 'right', summary: 'sum' },
    ],
    sort: [{ field: 'start_date', order: 'asc' }],
    pagination: { pageSize: 25 },
    selection: { type: 'multiple' },
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'gantt', 'calendar', 'timeline'],
    },
    // Binds the 'calendar' entry above: the switcher opens the same schedule
    // the dedicated `campaign_calendar` view shows. Both dates are required +
    // notNull on crm_campaign, so every campaign spans a truthful range.
    calendar: {
      startDateField: 'start_date',
      endDateField: 'end_date',
      titleField: 'name',
      colorField: 'channel',
    },
  },

  listViews: {
    /** Campaign schedule */
    campaign_gantt: {
      name: 'campaign_gantt',
      type: 'gantt',
      label: 'Campaign Schedule',
      data: { provider: 'object', object: 'crm_campaign' },
      columns: ['name', 'channel'],
      gantt: {
        startDateField: 'start_date',
        endDateField: 'end_date',
        titleField: 'name',
        // Opens at Month (#2367 row 4). Without it the chart opened at Day,
        // a one-week window, and a campaign runs for weeks: every bar ran off
        // both edges. The viewer's own zoom, once saved, still wins over this.
        viewMode: 'month',
      },
    },

    /** Launch calendar */
    campaign_calendar: {
      name: 'campaign_calendar',
      type: 'calendar',
      label: 'Launch Calendar',
      data: { provider: 'object', object: 'crm_campaign' },
      columns: ['name', 'channel', 'status'],
      calendar: {
        startDateField: 'start_date',
        endDateField: 'end_date',
        titleField: 'name',
        colorField: 'channel',
      },
    },

    /** Marketing timeline */
    campaign_timeline: {
      name: 'campaign_timeline',
      type: 'timeline',
      label: 'Marketing Timeline',
      data: { provider: 'object', object: 'crm_campaign' },
      // The list data source projects configured columns. Keep the date
      // fields in that projection so the timeline renderer can bucket and
      // order campaigns from the same schedule data as the calendar/Gantt.
      columns: ['name', 'channel', 'start_date', 'end_date'],
      timeline: {
        startDateField: 'start_date',
        endDateField: 'end_date',
        titleField: 'name',
        groupByField: 'channel',
        colorField: 'status',
        scale: 'month',
      },
    },
  },
});
