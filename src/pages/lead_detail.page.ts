// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page } from '@objectstack/spec/ui';
import { ConvertLeadAction, ScheduleFollowUpAction } from '../actions/lead.actions';
import {
  LeadLogCallAction,
  LeadLogMeetingAction,
  LeadScheduleMeetingAction,
} from '../actions/global.actions';

/**
 * Lead Detail Record Page
 *
 * Demonstrates a comprehensive record page layout similar to Salesforce Lightning Record Page.
 *
 * Features:
 * - Template-based layout with named regions
 * - Rich component composition (details, highlights, related lists)
 * - Component visibility rules
 * - Profile-based page assignment
 */
export const LeadDetailPage: Page = {
  name: 'lead_detail_page',
  label: 'Lead Detail',
  description: 'Comprehensive lead detail page with highlights, details, and related information',

  type: 'record',
  object: 'crm_lead',

  // Template defines the overall layout structure. We use `full-width`
  // (single column) because the previous `header-sidebar-main` layout
  // sandwiched the highlights strip into a cramped sidebar with no other
  // meaningful sidebar content — Salesforce Lightning record pages
  // similarly default to a stacked column for medium-density objects.
  template: 'full-width',
  kind: 'full',
  // Page-level state variables
  variables: [
    {
      name: 'showHistory',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'activeTab',
      type: 'string',
      defaultValue: 'details',
    },
  ],

  // Regions correspond to slots in the template
  regions: [
    {
      name: 'header',
      width: 'full',
      components: [
        // Title + subtitle + icon, with record-level actions rendered
        // inline in the header's action slot via the first-class
        // `actions` property (no sibling node, no visual offset hack).
        {
          type: 'page:header',
          id: 'lead_header',
          label: 'Lead Information',
          properties: {
            title: '{first_name} {last_name}',
            subtitle: '{company}',
            // `icon` removed from `page:header` in @objectstack/spec 17.0.0
            // (#6946, ADR-0087 D2) — deleted, not renamed. See the full note on
            // `account_detail.page.ts`; nothing ever drew it.
            breadcrumb: true,
            // Convert is the outcome; scheduling the next touch is the daily
            // act. Both belong in the header — the follow-up used to be four
            // clicks deep in the Related tab.
            //
            // The three activity actions are listed EXPLICITLY (#592): a custom
            // record page replaces the synthesized header, so an object-scoped
            // action that is not named here is unreachable from the record —
            // only the list-row ⋮ menu can fire it. Logging the call you just
            // made is the single most frequent thing a rep does on a lead, and
            // it was two navigations away.
            actions: [
              ConvertLeadAction,
              ScheduleFollowUpAction,
              LeadLogCallAction,
              LeadLogMeetingAction,
              LeadScheduleMeetingAction,
            ],
          },
        },
        // Salesforce-style Highlights Panel: a horizontal strip of the
        // most-important key facts directly under the header. Pulled out
        // of the sidebar so it can use the full page width.
        {
          type: 'record:highlights',
          id: 'lead_highlights',
          label: 'Key Information',
          properties: {
            fields: ['status', 'rating', 'lead_source', 'owner_id', 'email', 'phone'],
          },
        },
        {
          type: 'record:path',
          id: 'lead_path',
          label: 'Lead Status Path',
          properties: {
            statusField: 'status',
            // `converted` is the terminal WIN state and must be on the path —
            // without it the strip reads as if "Unqualified" were the goal, and
            // a converted lead had no stage to light up at all.
            stages: [
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'qualified', label: 'Qualified' },
              { value: 'converted', label: 'Converted' },
              { value: 'unqualified', label: 'Unqualified' },
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
          id: 'main_tabs',
          label: 'Lead Information Tabs',
          properties: {
            // `type` → `tabStyle` (@objectstack/spec 17.0.0, #6776, ADR-0087
            // D2). Same three values; see the full note on `home.page.ts`.
            tabStyle: 'line',
            position: 'top',
            items: [
              {
                label: 'Details',
                icon: 'info-circle',
                children: [
                  {
                    type: 'record:details',
                    id: 'lead_details',
                    label: 'Lead Details',
                    properties: {
                      columns: '2',
                      // `layout` was REMOVED from `record:details` in
                      // @objectstack/spec 17.0.0 (#6946, ADR-0087 D2) and is
                      // deleted with no successor: its declared `auto` |
                      // `custom` semantics were never implemented. objectui's
                      // `RecordDetailsRenderer` tests `layout` only against
                      // `inline` | `compact` — two values the enum never
                      // permitted — so both legal values took the same branch
                      // and the key selected nothing. The body is chosen by what
                      // is authored: the `sections` below render the explicit
                      // groups (the old `custom`), and omitting them would fall
                      // back to the object's `highlightFields` (the old `auto`).
                      // This page authors sections, so `auto` was already
                      // contradicted by the line under it.
                      // Salesforce-style grouped sections so the Details
                      // tab actually presents a structured field grid
                      // instead of falling back to the bare auto-detected
                      // header chip. Field names map to lead.object.ts.
                      sections: [
                        {
                          name: 'info',
                          label: 'Lead Information',
                          fields: ['salutation', 'first_name', 'last_name', 'title', 'company', 'industry'],
                        },
                        {
                          name: 'crm_contact',
                          label: 'Contact',
                          fields: ['email', 'phone', 'mobile', 'website'],
                        },
                        {
                          name: 'detail',
                          label: 'Lead Detail',
                          // `disqualification_reason` is mandatory on an
                          // Unqualified lead (see the validation on
                          // crm_lead) — the detail page has to show the
                          // recorded reason, not just the red status chip.
                          fields: ['status', 'disqualification_reason', 'rating', 'lead_source', 'owner_id', 'annual_revenue', 'number_of_employees'],
                        },
                        {
                          name: 'address',
                          label: 'Address',
                          fields: ['address'],
                        },
                        {
                          name: 'description',
                          label: 'Description',
                          fields: ['description'],
                          columns: 1,
                        },
                      ],
                    },
                  },
                ],
              },
              {
                label: 'Related',
                icon: 'link',
                children: [
                  {
                    type: 'page:accordion',
                    id: 'related_accordion',
                    label: 'Related Records',
                    properties: {
                      allowMultiple: true,
                      items: [
                        {
                          label: 'Tasks',
                          icon: 'list-checks',
                          collapsed: false,
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'related_tasks',
                              label: 'Tasks',
                              properties: {
                                objectName: 'crm_task',
                                // crm_task links back through the polymorphic
                                // `related_to_lead` lookup; there is no `lead_id`
                                // column, so the old binding matched nothing and
                                // this list read "0" no matter how many follow-ups
                                // the rep had filed.
                                relationshipField: 'related_to_lead',
                                columns: ['subject', 'status', 'priority', 'due_date', 'owner_id'],
                                sort: [
                                  { field: 'due_date', order: 'asc' }
                                ],
                                limit: 10,
                                title: 'Open Tasks',
                                filter: [{ field: 'status', operator: 'not_equals', value: 'completed' }],
                                showViewAll: true,
                                actions: ['new_task', 'edit', 'complete'],
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
                label: 'Activity',
                icon: 'clock',
                children: [
                  {
                    type: 'record:activity',
                    id: 'lead_activity',
                    label: 'Activity Timeline',
                    properties: {
                      // `types` is keyed on FEED ITEM KIND, never on object name
                      // (#1209). The old `['crm_task']` was not one of the kinds
                      // the prop accepts, and nothing anywhere enforced that: the
                      // page schema's `properties` is an open bag
                      // (`z.record(z.string(), z.unknown())`) so the value was
                      // stored verbatim, and the renderer's own sanitiser drops
                      // members it does not recognise and then reads the EMPTY
                      // remainder as "no filter authored" — measured on the
                      // shipped bundle, `types: ['crm_task']`, `types: []` and
                      // omitting `types` all render the same unfiltered stream.
                      // That is why the tab showed `Created Lead` / `Updated
                      // Lead` audit rows, which the History tab already covers.
                      //
                      // What this component can actually show is `sys_activity`
                      // scoped to the record, through the renderer's own
                      // type map — measured, not inferred:
                      //
                      //   sys_activity.type      feed kind      written by
                      //   created/updated/…      field_change   platform audit
                      //   system                 system         platform
                      //   completed              task           log_call /
                      //                                         log_meeting /
                      //                                         send_email
                      //   scheduled              (dropped)      schedule_meeting
                      //
                      // So `task` is the kind that carries a rep's logged
                      // interactions, and it is the only reachable one worth
                      // filtering to. `event` is NOT added: it is a legal kind
                      // the prop accepts but no `sys_activity.type` maps to it,
                      // so it would be a declared value enforced by nothing.
                      // `scheduled` rows fall out of the map upstream — a
                      // platform gap, not something to work around here.
                      types: ['task'],
                      limit: 20,
                      // Load-bearing, not cosmetic: the renderer strips every
                      // `task` item BEFORE the `types` filter runs unless this is
                      // true, and `task` items are exactly the `completed` rows.
                      // `types: ['task']` with the old `showCompleted: false`
                      // renders an empty tab.
                      showCompleted: true,
                    },
                  },
                ],
              },
              {
                label: 'History',
                icon: 'history',
                children: [
                  {
                    // `record:history` is the platform's own audit feed over the
                    // fields marked `trackHistory` (status / rating). Ownership
                    // moved to the platform's `owner_id` in #548, which carries no
                    // `trackHistory` flag — transfers land in the compliance audit
                    // log, not on this feed.
                    // The hand-rolled version queried an object named
                    // `field_history`, which this app does not define, so the
                    // tab could only ever render empty.
                    type: 'record:history',
                    id: 'lead_history',
                    label: 'Field History',
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
  ],

  // Make this the default page for leads
  isDefault: true,

  // Assign to specific profiles. These must match the profile `name`s declared
  // in src/profiles — `sales_user` / `system_administrator` never existed, so
  // the assignment silently matched nobody.
  assignedProfiles: ['sales_rep', 'sales_manager', 'system_admin'],

  // ARIA accessibility
  aria: {
    ariaLabel: 'Lead Detail Page',
    ariaDescribedBy: 'Detailed view of lead information with related records and activity',
  },
};
