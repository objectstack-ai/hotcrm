// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { Page } from '@objectstack/spec/ui';
import { ConvertLeadAction } from '../actions/lead.actions';

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
  object: 'lead',

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
            actions: [ConvertLeadAction],
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
            fields: ['status', 'rating', 'lead_source', 'owner', 'email', 'phone'],
          },
        },
        {
          type: 'record:path',
          id: 'lead_path',
          label: 'Lead Status Path',
          properties: {
            statusField: 'status',
            stages: [
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'qualified', label: 'Qualified' },
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
                          name: 'contact',
                          label: 'Contact',
                          fields: ['email', 'phone', 'mobile', 'website'],
                        },
                        {
                          name: 'detail',
                          label: 'Lead Detail',
                          fields: ['status', 'rating', 'lead_source', 'owner', 'annual_revenue', 'number_of_employees'],
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
                                objectName: 'task',
                                relationshipField: 'lead_id',
                                columns: ['subject', 'status', 'priority', 'due_date', 'assigned_to'],
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
                          label: 'Events',
                          icon: 'calendar',
                          collapsed: true,
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'related_events',
                              label: 'Events',
                              properties: {
                                objectName: 'event',
                                relationshipField: 'lead_id',
                                columns: ['subject', 'start_date', 'end_date', 'location'],
                                sort: [
                                  { field: 'start_date', order: 'desc' }
                                ],
                                limit: 5,
                                showViewAll: true,
                                actions: ['new_event'],
                              },
                            },
                          ],
                        },
                        {
                          label: 'Notes & Attachments',
                          icon: 'paperclip',
                          collapsed: true,
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'related_files',
                              label: 'Files',
                              properties: {
                                objectName: 'file',
                                relationshipField: 'parent_id',
                                columns: ['title', 'file_type', 'size', 'created_by', 'created_date'],
                                sort: [
                                  { field: 'created_date', order: 'desc' }
                                ],
                                limit: 5,
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
                      types: ['task', 'event', 'email', 'call', 'note'],
                      limit: 20,
                      showCompleted: false,
                    },
                  },
                ],
              },
              {
                label: 'History',
                icon: 'history',
                children: [
                  {
                    type: 'record:related_list',
                    id: 'field_history',
                    label: 'Field History',
                    properties: {
                      objectName: 'field_history',
                      relationshipField: 'record_id',
                      columns: ['field', 'old_value', 'new_value', 'changed_by', 'changed_date'],
                      sort: [
                        { field: 'changed_date', order: 'desc' }
                      ],
                      limit: 25,
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
  ],

  // Make this the default page for leads
  isDefault: true,

  // Assign to specific profiles
  assignedProfiles: ['sales_user', 'sales_manager', 'system_administrator'],

  // ARIA accessibility
  aria: {
    ariaLabel: 'Lead Detail Page',
    ariaDescribedBy: 'Detailed view of lead information with related records and activity',
  },
};
