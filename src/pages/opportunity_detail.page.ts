// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page } from '@objectstack/spec/ui';

/**
 * Opportunity Detail Record Page
 *
 * Salesforce Lightning-style record page for the `crm_opportunity` object.
 * Mirrors the lead_detail blueprint: single-column full-width layout with
 * a Lightning-style header chip, primary action, key highlights strip and
 * status path, then a tab strip below. No sidebar — secondary widgets such
 * as the AI assistant live in the floating console chat instead.
 */
export const OpportunityDetailPage: Page = {
  name: 'opportunity_detail_page',
  label: 'Opportunity Detail',
  description: 'Comprehensive opportunity detail page with path, highlights, details, and related lists',

  type: 'record',
  object: 'crm_opportunity',

  template: 'full-width',
  kind: 'full',
  variables: [
    { name: 'activeTab', type: 'string', defaultValue: 'details' },
  ],

  regions: [
    {
      name: 'header',
      width: 'full',
      components: [
        {
          type: 'page:header',
          id: 'opp_header',
          label: 'Opportunity Information',
          properties: {
            title: '{name}',
            // The lookup field is `crm_account` — `{account}` matched nothing
            // and the subtitle rendered blank.
            subtitle: '{crm_account}',
            // `icon` removed from `page:header` in @objectstack/spec 17.0.0
            // (#6946, ADR-0087 D2) — deleted, not renamed. See the full note on
            // `account_detail.page.ts`; nothing ever drew it.
            breadcrumb: true,
            // generate_quote is the CPQ entry point (opportunity → quote); a
            // custom record page replaces the default header, so the action
            // must be listed here explicitly or it is unreachable. The same
            // sentence is why the three activity actions are named here (#592):
            // without them a rep can log a call on the deal only from the list
            // row's ⋮ menu, never from the deal itself.
            //
            // Action IDs, not `ActionDef` objects: `PageHeaderProps.actions` is
            // `z.array(z.string())` ("Action IDs to show in header") in
            // @objectstack/spec 17.3.0, and this repo authors against the
            // protocol (#1653). Each id is the `name` of a
            // crm_opportunity-scoped action — `generate_quote` /
            // `clone_opportunity` in `src/actions/opportunity.actions.ts`, the
            // activity trio in `src/actions/global.actions.ts`.
            actions: [
              'generate_quote',
              'clone_opportunity',
              'log_call',
              'log_meeting',
              'schedule_meeting',
            ],
          },
        },
        {
          type: 'record:highlights',
          id: 'opp_highlights',
          label: 'Key Information',
          properties: {
            fields: ['amount', 'close_date', 'probability', 'expected_revenue', 'owner_id', 'crm_account'],
          },
        },
        {
          type: 'record:path',
          id: 'opp_stage_path',
          label: 'Opportunity Stage Path',
          properties: {
            statusField: 'stage',
            // Every canonical value of `stage` must appear here, in funnel
            // order — the path is the only place a rep reads "where is this
            // deal". `needs_analysis` was missing, so a deal sitting in that
            // stage lit up NO step at all and the strip read as if the deal
            // had skipped from Qualification to Proposal. The two terminal
            // stages stay last (won before lost), matching lead_detail's
            // converted/unqualified tail.
            stages: [
              { value: 'prospecting', label: 'Prospecting' },
              { value: 'qualification', label: 'Qualification' },
              { value: 'needs_analysis', label: 'Needs Analysis' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'negotiation', label: 'Negotiation' },
              { value: 'closed_won', label: 'Closed Won' },
              { value: 'closed_lost', label: 'Closed Lost' },
            ],
          },
        },
      ],
    },
    {
      name: 'main',
      width: 'large',
      components: [
        {
          type: 'page:tabs',
          id: 'opp_main_tabs',
          properties: {
            // `type` → `tabStyle` (@objectstack/spec 17.0.0, #6776, ADR-0087
            // D2). Same three values; see the full note on `home.page.ts`.
            tabStyle: 'line',
            position: 'top',
            items: [
              {
                // Tab item `key` → `value` (#1269): `value` is the stable
                // `?tab=` URL token the renderer reads, `key` is read by
                // nothing. See the full note on `case_detail.page.ts`.
                value: 'details',
                label: 'Details',
                children: [
                  {
                    type: 'record:details',
                    id: 'opp_details',
                    label: 'Opportunity Details',
                    properties: {
                      // `columns` is a STRING enum ('1'|'2'|'3'|'4') in
                      // @objectstack/spec 17; the number form was rejected by the
                      // props schema and only survived because `properties` is an
                      // open bag. `layout` is gone entirely (removed in spec
                      // 17.0.0, #6946 / ADR-0087 D2) — the body is chosen by what
                      // you author, so the key selected nothing.
                      columns: '2',
                      // A section lists only the fields it is ACTUALLY responsible
                      // for — never one the highlights strip above already shows,
                      // and never the record's title field (#1211).
                      //
                      // Measured in the shipped console (17.1.0,
                      // plugins-views bundle → objectui `RecordDetailsRenderer`):
                      // a mounted `record:highlights` registers its field names in
                      // HighlightFieldsContext, and `record:details` drops every
                      // registered name from its sections; it then drops the first
                      // non-empty title candidate (primaryField → name → full_name
                      // → title → subject → …) because the page H1 already shows
                      // it. `DetailSection` renders NOTHING at all when every field
                      // it is left with is empty, so a section built only from
                      // duplicates disappears silently — which is how this tab came
                      // to author fourteen fields and render two.
                      //
                      // So `name` / `crm_account` / `owner_id` (header + strip) and
                      // `amount` / `close_date` / `probability` / `expected_revenue`
                      // (strip) are NOT repeated here. Object-level
                      // `highlightFields` is a different list and is not consulted
                      // by this component — `stage` sits in it and still renders.
                      sections: [
                        {
                          name: 'info',
                          label: 'Opportunity Information',
                          fields: ['type', 'lead_source', 'crm_campaign'],
                        },
                        {
                          name: 'crm_forecast',
                          label: 'Stage & Forecast',
                          fields: ['stage', 'forecast_category'],
                        },
                        {
                          name: 'description',
                          label: 'Description',
                          columns: 1,
                          collapsible: true,
                          fields: ['description', 'next_step'],
                        },
                      ],
                    },
                  },
                ],
              },
              {
                value: 'related',
                label: 'Related',
                children: [
                  {
                    type: 'page:accordion',
                    id: 'opp_related_accordion',
                    properties: {
                      items: [
                        {
                          // Accordion item `key` is DELETED, not renamed to
                          // `value` — the opposite verdict to the tab items
                          // above, because this renderer overwrites `value` with
                          // `panel-<index>`. See the full note on
                          // `case_detail.page.ts`.
                          label: 'Quotes',
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'opp_quotes',
                              properties: {
                                objectName: 'crm_quote',
                                relationshipField: 'crm_opportunity',
                                columns: ['quote_number', 'name', 'status', 'total_price', 'expiration_date'],
                                limit: 10,
                              },
                            },
                          ],
                        },
                        {
                          label: 'Products',
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'opp_products',
                              properties: {
                                objectName: 'crm_opportunity_line_item',
                                relationshipField: 'crm_opportunity',
                                columns: ['crm_product', 'quantity', 'unit_price', 'total_price'],
                                limit: 10,
                              },
                            },
                          ],
                        },
                        {
                          label: 'Open Tasks',
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'opp_tasks',
                              properties: {
                                objectName: 'crm_task',
                                relationshipField: 'related_to_opportunity',
                                columns: ['subject', 'status', 'priority', 'due_date', 'owner_id'],
                                filter: [{ field: 'status', operator: 'not_equals', value: 'completed' }],
                                limit: 10,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
              {
                value: 'activity',
                label: 'Activity',
                children: [
                  {
                    type: 'record:activity',
                    id: 'opp_activity',
                    /**
                     * `filters` is deleted with nothing put in its place, and
                     * that is the whole finding (#1269).
                     *
                     * It used to read `['all', 'tasks', 'meetings', 'calls',
                     * 'emails']` — a vocabulary that exists nowhere in the
                     * contract. `RecordActivityProps` has exactly two filter
                     * channels and neither takes that list:
                     *
                     *   `types`      — an array of FEED ITEM KINDS
                     *                  (`comment` | `field_change` | `task` |
                     *                  `event` | `email` | `call` | …). Not
                     *                  these values: `all` is not a kind and
                     *                  `meetings` is not one either (the kind
                     *                  is `event`), and all five are plural
                     *                  where the enum is singular.
                     *   `filterMode` — ONE default for the panel's dropdown,
                     *                  from `all` | `comments_only` |
                     *                  `changes_only` | `tasks_only`. The
                     *                  dropdown's option list is the renderer's,
                     *                  not authorable.
                     *
                     * So the list was reaching for a third thing — "offer these
                     * filter chips" — that the component does not expose. What
                     * it wanted is already delivered: `showFilterToggle`
                     * defaults on, so the panel renders its filter dropdown, and
                     * `filterMode` defaults to `all`, so it opens unfiltered.
                     * Neither is restated here, because materializing a default
                     * turns "the author said nothing" into "the author asked for
                     * the default" — a different fact, and the one a later
                     * liveness audit reads.
                     *
                     * Mapping it onto `types` instead was considered and
                     * rejected: #1209 corrected exactly that mistake one page
                     * over (the lead timeline's `types: ['crm_task']`), and the
                     * renderer sanitises out-of-enum members then reads the
                     * EMPTY remainder as "no filter authored" — so a bad `types`
                     * is indistinguishable from no `types` on screen while
                     * claiming otherwise in source. A `types` here would also
                     * be a NEW restriction nobody asked for: it would drop
                     * comments and field changes from a timeline that shows them
                     * today.
                     */
                    properties: {
                      limit: 25,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      name: 'aside',
      width: 'small',
      components: [
        {
          type: 'record:reference_rail',
          id: 'opp_reference_rail',
          properties: {
            /**
             * No entry declares a `title` — deliberately (#972).
             *
             * The rail resolves a card's heading as
             * `entry.title || i18n.objectLabel({ name: objectName, … })`, so a
             * literal `title` does not merely provide a default: it WINS, and
             * the locale bundle is never consulted. The three literals that
             * used to sit here (`Quotes` / `Products` / `Open Tasks`) therefore
             * printed English into every one of the four locales this app
             * ships, on top of `objects.<name>.label` already being translated
             * in all of them. Dropping them hands the heading back to the
             * translation bundle — the single source of truth for what an
             * object is called — so a locale added later is covered for free.
             *
             * A translated literal is not available as an alternative: unlike
             * `record:alert`, whose `title` is run through the inline
             * translation-map resolver, the rail renders `entry.title` as a
             * raw React child. An `{ en, 'zh-CN' }` map here would not be
             * resolved — it would be handed to React as an object.
             *
             * The third card losing the word "Open" is a correction, not a
             * casualty. A rail entry has no filter at all — the rail queries
             * `{ $filter: { [relationshipField]: parentId }, $top: limit }` and
             * reads nothing else — so that card always counted and listed this
             * deal's tasks whatever their status. The heading claimed a filter
             * the component cannot apply. The genuinely filtered view is the
             * `opp_tasks` related list on the *Related* tab above, which does
             * carry `status neq completed`.
             *
             * Pinned by `test/metadata-references.test.ts` (entries resolve,
             * no literal titles) and `test/i18n-references.test.ts` (every
             * rail object has a `label` in every locale, so the fallback
             * lands on a translation rather than on a humanized object name).
             */
            entries: [
              {
                objectName: 'crm_quote',
                relationshipField: 'crm_opportunity',
                limit: 3,
              },
              {
                objectName: 'crm_opportunity_line_item',
                relationshipField: 'crm_opportunity',
                limit: 3,
              },
              {
                objectName: 'crm_task',
                relationshipField: 'related_to_opportunity',
                limit: 3,
              },
            ],
          },
        },
      ],
    },
  ],

  isDefault: true,
  assignedProfiles: ['sales_rep', 'sales_manager', 'system_admin'],

  aria: {
    ariaLabel: 'Opportunity Detail Page',
    ariaDescribedBy: 'Detailed view of opportunity information with related records and activity',
  },
};
