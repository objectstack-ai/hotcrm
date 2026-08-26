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

  form: {
    type: 'tabbed',
    sections: [
      {
        // Every form section here carries a `name` matching the object's
        // fieldGroup key, so the heading resolves through
        // `objects.crm_campaign._sections.<name>.label` in all four packs. A
        // nameless section has no key a bundle can carry and renders its
        // English label in every locale — the platform warns about exactly this
        // during `objectstack validate`, and this form was carrying four of
        // those warnings before the #597 restructure gave it a reason to move.
        name: 'basic',
        label: 'Campaign Information',
        columns: 2,
        fields: [
          { field: 'name', required: true, colSpan: 2 },
          'campaign_code',
          'type',
          'channel',
          { field: 'status', required: true },
          'owner_id',
          'is_active',
          'landing_page_url',
        ],
      },
      {
        name: 'schedule',
        label: 'Schedule',
        columns: 2,
        fields: ['start_date', 'end_date'],
      },
      {
        /**
         * Budget & ROI — a SECTION OF ITS OWN, deliberately (#597).
         *
         * `budgeted_cost` and `actual_cost` are the only two campaign numbers
         * that are manual-entry by design: nothing on the platform knows what a
         * trade-show booth cost. They used to sit seventh and eighth in a
         * seven-field "Schedule & Budget" row, below the dates and beside two
         * revenue figures one of which the metric hooks own — so the two fields
         * a marketer must type were the least visible things on the form, and
         * `actual_cost` in particular went untyped.
         *
         * That is not a cosmetic complaint: `roi` divides by `actual_cost`, and
         * its formula answers a flat `0.0` for any campaign where that field is
         * blank. An empty cost field renders as 0% ROI on every campaign — the
         * one number the whole Performance section exists to produce, reading
         * as a real measurement rather than as missing input.
         *
         * So the costs get their own heading, and `roi` is displayed HERE with
         * them rather than at the bottom of Performance, where its dependency
         * on two fields three sections away was invisible. The heading matches
         * the object's `budget` fieldGroup, so the form and the detail page
         * agree on what this group is called.
         */
        name: 'budget',
        label: 'Budget & ROI',
        columns: 2,
        fields: ['budgeted_cost', 'actual_cost', 'expected_revenue', 'actual_revenue', 'roi'],
      },
      {
        name: 'metrics',
        label: 'Performance',
        columns: 2,
        fields: [
          'target_size',
          'num_sent',
          'num_responses',
          'num_leads',
          'num_converted_leads',
          'num_opportunities',
          'num_won_opportunities',
          'response_rate',
        ],
      },
    ],
  },
});
