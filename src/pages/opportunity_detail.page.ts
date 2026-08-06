// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page } from '@objectstack/spec/ui';
import { CloneOpportunityAction, GenerateQuoteAction } from '../actions/opportunity.actions';
import {
  OpportunityLogCallAction,
  OpportunityLogMeetingAction,
  OpportunityScheduleMeetingAction,
} from '../actions/global.actions';

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
            icon: 'briefcase',
            breadcrumb: true,
            // generate_quote is the CPQ entry point (opportunity → quote); a
            // custom record page replaces the default header, so the action
            // must be listed here explicitly or it is unreachable. The same
            // sentence is why the three activity actions are named here (#592):
            // without them a rep can log a call on the deal only from the list
            // row's ⋮ menu, never from the deal itself.
            actions: [
              GenerateQuoteAction,
              CloneOpportunityAction,
              OpportunityLogCallAction,
              OpportunityLogMeetingAction,
              OpportunityScheduleMeetingAction,
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
            type: 'line',
            position: 'top',
            items: [
              {
                key: 'details',
                label: 'Details',
                children: [
                  {
                    type: 'record:details',
                    id: 'opp_details',
                    label: 'Opportunity Details',
                    properties: {
                      columns: 2,
                      layout: 'auto',
                      sections: [
                        {
                          name: 'info',
                          label: 'Opportunity Information',
                          fields: ['name', 'crm_account', 'owner_id', 'type', 'lead_source', 'crm_campaign'],
                        },
                        {
                          name: 'crm_forecast',
                          label: 'Stage & Forecast',
                          fields: ['stage', 'probability', 'amount', 'expected_revenue', 'close_date', 'forecast_category'],
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
                key: 'related',
                label: 'Related',
                children: [
                  {
                    type: 'page:accordion',
                    id: 'opp_related_accordion',
                    properties: {
                      items: [
                        {
                          key: 'quotes',
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
                          key: 'products',
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
                          key: 'tasks',
                          label: 'Open Tasks',
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'opp_tasks',
                              properties: {
                                objectName: 'crm_task',
                                relationshipField: 'related_to_opportunity',
                                columns: ['subject', 'status', 'priority', 'due_date', 'owner_id'],
                                filter: [{ field: 'status', op: 'neq', value: 'completed' }],
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
                key: 'activity',
                label: 'Activity',
                children: [
                  {
                    type: 'record:activity',
                    id: 'opp_activity',
                    properties: {
                      filters: ['all', 'tasks', 'meetings', 'calls', 'emails'],
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
