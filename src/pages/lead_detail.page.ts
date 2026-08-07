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
            icon: 'user-plus',
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
            type: 'line',
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
                      layout: 'auto',
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
                                filter: [['status', '!=', 'completed']],
                                showViewAll: true,
                                actions: ['new_task', 'edit', 'complete'],
                              },
                            },
                          ],
                        },
                        {
                          // #1034. A rep logs a call from this very page (the
                          // three activity actions sit in the header, #592) and
                          // the interaction was then invisible on the record it
                          // came from — the crm_event row was written with
                          // `related_to_lead` pointing straight back here, but
                          // nothing on the page read it, so the only way to find
                          // the call was My Calendar.
                          //
                          // This is the same shape the ACCOUNT detail page shows.
                          // That page is `kind: 'slotted'` (regions: []), so its
                          // Related tab is SYNTHESIZED — the default layout emits
                          // one related list per incoming lookup, `crm_event`'s
                          // `related_to_account` included. A `kind: 'full'` page
                          // like this one authors every component itself and gets
                          // no synthesis at all, which is exactly why lead fell
                          // behind account while account needed no metadata.
                          // So the panel is written out here in the page's own
                          // idiom (the Tasks list above, opportunity's Quotes /
                          // Products) rather than by converting the page to
                          // slotted, which would discard the authored header,
                          // highlights, path and Details grid.
                          //
                          // Scope: `related_to_lead`, the one crm_event lookup
                          // that points at crm_lead. The object carries five
                          // `related_to_*` lookups and picking any other one
                          // would list somebody else's interactions here.
                          label: 'Events',
                          icon: 'calendar-days',
                          collapsed: false,
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'related_events',
                              label: 'Events',
                              properties: {
                                objectName: 'crm_event',
                                relationshipField: 'related_to_lead',
                                // crm_event.highlightFields, which is also what
                                // the synthesized account panel derives its
                                // columns from.
                                columns: ['subject', 'type', 'status', 'start_datetime', 'owner_id'],
                                // Newest interaction first. NOT filtered by
                                // `status`: a booked meeting and the call that
                                // already happened are both "what is going on
                                // with this lead", and the Planned/Held split is
                                // already a column.
                                sort: [
                                  { field: 'start_datetime', order: 'desc' }
                                ],
                                limit: 10,
                                showViewAll: true,
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
                      // #1034. This tab used to show ONLY the audit feed
                      // (Created/Updated) — a call logged a second earlier was
                      // missing. Measured against the renderer, both keys that
                      // used to sit here were at fault, in different ways:
                      //
                      // · `showCompleted: false` was the cause. The timeline
                      //   reads `sys_activity` rows for this record and maps
                      //   `type` onto a feed type: created/updated/deleted/
                      //   assigned/shared → `field_change`, system → `system`,
                      //   completed → `task`. `log_call` / `log_meeting` write
                      //   `sys_activity.type: 'completed'` (global.actions.ts),
                      //   so a held interaction arrives as `task` — and the
                      //   renderer drops every `task` item unless showCompleted
                      //   is exactly `true`. Only the `field_change` rows
                      //   survived, which is precisely the audit-only feed that
                      //   was reported. A record's past activity is the point of
                      //   this tab, so it is `true` here.
                      //
                      // · `types` is gone, not corrected. It takes `FeedItemType`
                      //   (comment | field_change | task | event | email | call |
                      //   note | file | record_create | record_delete | approval |
                      //   sharing | system) — FEED item types, never object
                      //   names. `['crm_task']` matched none of them, so the
                      //   renderer's sanitizer discarded the whole array and the
                      //   key was inert: it neither filtered nor broke anything,
                      //   and its comment ("only crm_task exists in this app")
                      //   described a mechanism the component does not have.
                      //   Leaving `types` unset is the honest spelling and what
                      //   case_detail / opportunity_detail already do — the
                      //   timeline shows every kind of item it can render, and a
                      //   feed type the platform adds later is not silently
                      //   excluded by a list frozen today.
                      limit: 20,
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
