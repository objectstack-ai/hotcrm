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
    ],
    sort: [{ field: 'close_date', order: 'asc' }],
    rowColor: {
      field: 'stage',
      colors: {
        prospecting: '#94a3b8',
        qualification: '#60a5fa',
        // Teal sits between the cool qualification blue and the warm proposal
        // amber, keeping the cool→warm funnel ramp readable. NOT the
        // `#FFD700` this option carries in `_picklists.ts`: this map is a
        // Tailwind palette, and gold is one hue step from proposal's
        // `#f59e0b` — the two adjacent stages would tint rows the same.
        needs_analysis: '#14b8a6',
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
    // own `locations: ['list_item']`. Built-in `exportOptions` covers CSV
    // export.
    //
    // `mass_update_stage` is wired as an AGGREGATE bulk def, not as a bare
    // `bulkActions: ['mass_update_stage']` string (#508). The two forms are
    // different dispatch contracts, and only this one moves a whole selection:
    //
    //   - bare string  → per-record fan-out: the action is dispatched ONCE PER
    //     selected row with `recordId` set. N requests, N stage moves.
    //   - aggregate def → ONE dispatch for the whole selection, carrying every
    //     id in the builtin `params._selectedIds` and no `recordId`. One
    //     request, N stage moves, one audit entry.
    //
    // Aggregate is the right shape here because the body already loops over the
    // selection itself, and because the run is all-or-nothing: a partial result
    // rejects instead of leaving the bar reporting per-row success it cannot
    // honour (see the body in `src/actions/opportunity.actions.ts`).
    //
    // `execution: 'aggregate'` is REQUIRED on an `operation: 'custom'` def and
    // is not boilerplate: a custom def without it has no dispatcher, so the
    // button ticks green once per row and does nothing at all. The spec refuses
    // that shape at parse time (#4457) — which is also what makes this
    // declaration safe to trust rather than merely present.
    //
    // History: this list carried the bare-string form until #588 removed it as
    // a silent no-op, and the removal was read as "the platform cannot deliver
    // a selection" for two release candidates. It could: the channel is
    // `params._selectedIds`, the underscore is load-bearing, and nothing was
    // injecting it precisely BECAUSE this declaration was gone
    // (objectstack-ai/objectstack#5568, closed works-as-declared).
    //
    // The def deliberately carries only the three keys that choose the dispatch
    // contract. Label, icon, params (the New Stage picker) and `visible` are
    // promoted from the action itself by the renderer, so the dialog and the
    // toolbar button cannot drift apart — and the label stays i18n-resolved,
    // which an inline `label:` here would not be.
    bulkActionDefs: [
      { name: 'mass_update_stage', operation: 'custom', execution: 'aggregate' },
    ],
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
        { field: 'owner_id', width: 150 },
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
      columns: ['name', 'crm_account', 'amount', 'close_date', 'owner_id'],
      kanban: {
        groupByField: 'stage',
        summarizeField: 'amount',
        columns: ['name', 'crm_account', 'amount', 'close_date'],
      },
      // The board is the active working pipeline. Closed business remains in
      // the full book and the dashboard, while excluding it here keeps all
      // five active stages visible at a presentation-friendly width.
      filter: [{ field: 'stage', operator: 'not_in', value: ['closed_won', 'closed_lost'] }],
      sort: [{ field: 'close_date', order: 'asc' }],
      navigation: { mode: 'drawer', width: '640px' },
    },

    /** Close-date forecasting calendar */
    close_date_calendar: {
      name: 'close_date_calendar',
      type: 'calendar',
      label: 'Forecast Calendar',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'amount', 'stage', 'owner_id'],
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
        groupByField: 'owner_id',
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
        visibleFields: ['crm_account', 'amount', 'stage', 'probability', 'close_date', 'owner_id'],
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
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
        { field: 'stage', operator: 'not_in', value: ['closed_won', 'closed_lost'] },
      ],
      sort: [{ field: 'close_date', order: 'asc' }],
    },

    /** Stale Opportunities — still-open deals, longest-parked first */
    stale_opportunities: {
      name: 'stale_opportunities',
      type: 'grid',
      // Honest label: this view does not apply the 14-day cut its automation
      // twin (`opportunity_stagnation`, STALE_THRESHOLD_DAYS = 14) uses, and
      // does not claim to. Two independent reasons were recorded for that; one
      // still holds and one has expired, so they are separated here.
      //
      // STILL TRUE — `days_in_stage` is a FORMULA (#489), evaluated in JS after
      // the query, so the data engine can neither filter nor sort on it. Any
      // filter phrased in terms of `days_in_stage` remains impossible.
      //
      // EXPIRED (#744) — the second reason said the list data path resolves no
      // date macros, so `stage_entry_date < {14_days_ago}` would ship the token
      // as a literal and invert the comparison lexicographically ('2026-…' sorts
      // below '{', so every row matched). That was measured on @objectstack
      // 16.1.0 and stopped being true at 17.0.0-rc.0, when `resolveFilterTokens()`
      // was wired into the ObjectQL read path (objectql #3582). `{14_days_ago}`
      // is a first-class vocabulary member — it matches the parameterised
      // grammar `DATE_MACRO_PARAM_RE`, `{N_(minutes|hours|days|weeks|months|
      // years)_(ago|from_now)}` — and on the pinned 17.0.0-rc.2 it reaches the
      // driver already substituted for an ISO date. It is the same seam
      // `closing_this_quarter` — the very next view in this file — relies on,
      // pinned against a real engine in
      // `test/forecast-current-quarter-view.test.ts`.
      //
      // Correcting that half of the comment does not decide anything about the
      // filter, and is deliberately not a licence to change it: expressing the
      // cut as `stage_entry_date <= {14_days_ago}` would drop `days_in_stage`
      // from the question entirely and change which rows this view returns —
      // hiding today's 13-day-old deals from a manager's queue. That is a
      // BEHAVIOUR change with its own issue (#770), where the open question is
      // whether this queue should be a cut or a ranking at all — this label
      // promises a ranking and honours it. `stale_articles` in
      // `src/views/knowledge_article.view.ts` carried the same expired premise
      // and was corrected in the same pass; its label does promise a window, so
      // it has a defect this view does not (#769). Nothing below was touched.
      //
      // As shipped: operator-only filter, ordered by the stored
      // `stage_entry_date` ascending — longest-parked on top, which is the
      // queue a manager works. The `days_in_stage` column puts the
      // `opportunity_stagnation` threshold in plain sight on every row.
      label: '⚠️ Stale Opportunities · Longest in Stage First',
      data: { provider: 'object', object: 'crm_opportunity' },
      columns: ['name', 'crm_account', 'stage', 'amount', 'stage_entry_date', 'days_in_stage', 'close_date', 'owner_id'],
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
      columns: ['name', 'crm_account', 'amount', 'forecast_category', 'probability', 'close_date', 'owner_id'],
      // The `close_date` window is what makes the label true (#743). Without
      // it this view returned EVERY open commit/best-case deal whenever it
      // closed — a deal slated for next March sat under a heading that said
      // "Closing This Quarter", and summing the Amount column gave a number
      // that was not this quarter's commit.
      //
      // Both bounds are date macros resolved server-side: `resolveFilterTokens()`
      // was wired into the ObjectQL read path in 17.0.0-rc.0 (objectql #3582,
      // covering find/findOne/count/aggregate ahead of the middleware chain),
      // so a saved-view filter value reaches the driver already substituted.
      // Measured on the pinned 17.0.0-rc.2, not inferred — see the runtime
      // block in `test/forecast-current-quarter-view.test.ts`.
      //
      // The upper bound is INCLUSIVE against `{current_quarter_end}` rather
      // than half-open against `{next_quarter_start}`, and that choice is
      // deliberate: a `*_end` token resolves to the period's last calendar DAY
      // (2026-09-30), which on a `datetime` column would stop at midnight and
      // silently drop that day's rows — the spec says to use the half-open
      // form there. `close_date` is `Field.date()`, stored as `YYYY-MM-DD`
      // TEXT on both sides of the comparison, so the inclusive bound is exact.
      // That is the same field-type property `metadata-references.test.ts`
      // relies on for why the CRM/Sales/Executive dashboards may window
      // `close_date` at all (#460). Both forms were measured to return the
      // identical row set here; the inclusive one reads as what it means.
      filter: [
        { field: 'forecast_category', operator: 'in', value: ['commit', 'best_case'] },
        { field: 'stage', operator: 'not_in', value: ['closed_won', 'closed_lost'] },
        { field: 'close_date', operator: 'greater_than_or_equal', value: '{current_quarter_start}' },
        { field: 'close_date', operator: 'less_than_or_equal', value: '{current_quarter_end}' },
      ],
      sort: [{ field: 'close_date', order: 'asc' }],
      // Scoping the list makes "empty" a state a real user meets, so it needs
      // copy. Unlike the forecast view's (#745, where the sweep owns the
      // window and a fresh install is ALWAYS empty until it runs), the seeds
      // here do produce rows for most of a quarter — six seeded deals qualify
      // on forecast_category + stage, at `daysFromNow` offsets 11/14/24/30/38/45.
      // But every one of those offsets is relative to the INSTALL day, so once
      // fewer than 11 days remain in the quarter all six land in the next one
      // and a freshly seeded demo opens this tab on nothing. A real org meets
      // the same state whenever a quarter's commit slips out. Empty is
      // legitimate here; unexplained, it reads as broken.
      emptyState: {
        title: 'No Deals Closing This Quarter',
        message: 'This tab lists open commit and best-case deals with a close date inside the current quarter. Nothing matches right now — deals closing later are on the Open Deals tab.',
        icon: 'calendar-check',
      },
    },
  },

  form: {
    type: 'tabbed',
    sections: [
      {
        name: 'overview',
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
          'owner_id',
        ],
      },
      {
        name: 'forecast',
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
        name: 'sales_strategy',
        label: 'Sales Strategy',
        columns: 1,
        // `competitors` sat here until #1061 retired it — this form section was
        // the field's ONLY surface anywhere in the app (nothing read it back).
        fields: ['next_step'],
      },
      {
        // Win/loss capture at close time. The fields existed on the object for
        // reporting but no form offered them, so every closed deal lost its
        // why-we-won / why-we-lost data.
        name: 'win_loss',
        label: 'Win / Loss',
        collapsible: true,
        collapsed: true,
        columns: 2,
        fields: ['win_reason', 'loss_reason', { field: 'loss_details', colSpan: 2 }],
      },
    ],
  },
});
