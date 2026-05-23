// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';
import {
  EscalateCaseAction,
  CloseCaseAction,
} from '../actions/case.actions';
import { LogCallAction } from '../actions/global.actions';

/**
 * Case Detail Record Page
 *
 * Service-agent record page for the `crm_case` object. Mirrors the
 * opportunity_detail layout: highlights strip, status path, then a tab
 * strip with **Details / Related / Activity**.
 *
 * The Activity tab uses `record:activity`, which pulls the unified
 * timeline from `sys_comment`, `sys_activity`, `feed_item` and the field
 * history (enabled via `trackHistory: true` on `case.object.ts`). That is
 * how case comments and call logs surface here without a custom feed.
 */
export const CaseDetailPage: Page = {
  name: 'case_detail_page',
  label: 'Case Detail',
  description:
    'Service-agent case record: highlights, SLA path, details and activity timeline.',

  type: 'record',
  object: 'crm_case',

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
          id: 'case_header',
          label: 'Case Information',
          properties: {
            title: '{case_number} · {subject}',
            subtitle: '{account}',
            icon: 'life-buoy',
            breadcrumb: true,
            actions: [EscalateCaseAction, CloseCaseAction, LogCallAction],
          },
        },
        {
          type: 'record:highlights',
          id: 'case_highlights',
          label: 'Key Information',
          properties: {
            fields: [
              'status',
              'priority',
              'sla_response_due',
              'sla_resolution_due',
              'owner',
              'crm_account',
            ],
          },
        },
        {
          type: 'record:path',
          id: 'case_status_path',
          label: 'Case Status Path',
          properties: {
            statusField: 'status',
            stages: [
              { value: 'new', label: 'New' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'waiting_on_customer', label: 'Waiting on Customer' },
              { value: 'escalated', label: 'Escalated' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
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
          id: 'case_main_tabs',
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
                    id: 'case_details',
                    label: 'Case Details',
                    properties: {
                      columns: 2,
                      layout: 'auto',
                      sections: [
                        {
                          name: 'info',
                          label: 'Case Information',
                          fields: [
                            'case_number',
                            'subject',
                            'crm_account',
                            'crm_contact',
                            'type',
                            'origin',
                          ],
                        },
                        {
                          name: 'status',
                          label: 'Status & SLA',
                          fields: [
                            'status',
                            'priority',
                            'owner',
                            'is_escalated',
                            'sla_response_due',
                            'sla_resolution_due',
                          ],
                        },
                        {
                          name: 'description',
                          label: 'Description',
                          columns: 1,
                          collapsible: true,
                          fields: ['description', 'resolution'],
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
                    id: 'case_related_accordion',
                    properties: {
                      items: [
                        {
                          key: 'tasks',
                          label: 'Open Tasks',
                          children: [
                            {
                              type: 'record:related_list',
                              id: 'case_tasks',
                              properties: {
                                objectName: 'crm_task',
                                relationshipField: 'related_to_case',
                                columns: [
                                  'subject',
                                  'status',
                                  'priority',
                                  'due_date',
                                  'owner',
                                ],
                                filter: [
                                  { field: 'status', op: 'neq', value: 'completed' },
                                ],
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
                    id: 'case_activity',
                    properties: {
                      filterMode: 'all',
                      showFilterToggle: true,
                      limit: 25,
                      unifiedTimeline: true,
                      showCommentInput: true,
                      enableMentions: true,
                      enableReactions: true,
                      enableThreading: true,
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

  isDefault: true,
  assignedProfiles: ['service_agent', 'service_manager', 'system_administrator'],

  aria: {
    ariaLabel: 'Case Detail Page',
    ariaDescribedBy: 'Service-agent case detail view with SLA path, details, related items and activity timeline.',
  },
};
