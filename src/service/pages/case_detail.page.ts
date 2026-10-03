// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';

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
            // The lookup field is `crm_account` — `{account}` matched nothing
            // and the subtitle rendered blank.
            subtitle: '{crm_account}',
            // `icon` removed from `page:header` in @objectstack/spec 17.0.0
            // (#6946, ADR-0087 D2) — deleted, not renamed. See the full note on
            // `account_detail.page.ts`; nothing ever drew it.
            // `breadcrumb` retired from `page:header` in @objectstack/spec 17.6.0
            // (#20785, `page-header-breadcrumb-removed`) — deleted: no renderer
            // ever drew a trail for it; the app shell's own trail is unchanged.
            // Action IDs, not `ActionDef` objects: `PageHeaderProps.actions` is
            // `z.array(z.string())` ("Action IDs to show in header") in
            // @objectstack/spec 17.3.0, and this repo authors against the
            // protocol (#1653). Each id is the `name` of a crm_case-scoped
            // action — `escalate_case` / `close_case` in
            // `src/actions/case.actions.ts`, `log_call` in
            // `src/actions/global.actions.ts`.
            actions: ['escalate_case', 'close_case', 'log_call'],
          },
        },
        {
          type: 'record:highlights',
          id: 'case_highlights',
          label: 'Key Information',
          properties: {
            // crm_case carries a single `sla_due_date` plus the derived
            // `is_sla_violated` flag — the split response/resolution deadlines
            // named here do not exist, so the agent's most time-critical fact
            // was missing from the strip entirely.
            fields: [
              'status',
              'priority',
              'sla_due_date',
              'is_sla_violated',
              'owner_id',
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
              // The status option is `waiting_customer`; the longer spelling
              // matched no option, so this stage never lit up and rendered
              // untranslated next to its neighbours.
              { value: 'waiting_customer', label: 'Waiting on Customer' },
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
            // `type` → `tabStyle` (@objectstack/spec 17.0.0, #6776, ADR-0087
            // D2). Same concept, same three values (`line` | `card` | `pill`);
            // the rename exists because a props key called `type` collides with
            // the component node's own dispatch key and is unauthorable in the
            // flat and JSX carriers. See the full note on `home.page.ts`.
            tabStyle: 'line',
            position: 'top',
            items: [
              {
                // Tab item `key` → `value` (#1269). `value` is the stable
                // `?tab=` URL token the renderer reads (`it.value`, falling back
                // to an index-derived `tab-<i>`); `key` is read by nothing, so
                // these tabs were addressable only as `tab-0`/`tab-1`/`tab-2`,
                // which point at different tabs the moment the item list
                // changes. `PageTabsProps`' own alias table answers `key` with
                // `value` for exactly this reason.
                value: 'details',
                label: 'Details',
                children: [
                  {
                    type: 'record:details',
                    id: 'case_details',
                    label: 'Case Details',
                    properties: {
                      // `columns` is a STRING enum ('1'|'2'|'3'|'4') in
                      // @objectstack/spec 17, and `layout` was removed there
                      // (#6946 / ADR-0087 D2).
                      columns: '2',
                      // Every section references one of crm_case's `fieldGroups`
                      // (#970, the #806 class ruling C): the renderer derives
                      // members, label, icon and collapse state from the object,
                      // so this page curates only the order. The full note —
                      // what a group section does on 17.6.0 and what may not sit
                      // beside `group` — is on `lead_detail.page.ts`.
                      //
                      // The highlights strip still wins (#1211): the renderer
                      // drops what `record:highlights` registered (`status`,
                      // `priority`, `sla_due_date`, `is_sla_violated`,
                      // `owner_id`, `crm_account`) and the title candidate
                      // `subject` from the derived members.
                      //
                      // `escalated_date` — written by three flows and shown
                      // nowhere until now (#970) — arrives with the `escalation`
                      // group, beside `is_escalated` and `escalation_reason`.
                      //
                      // `internal_notes` (#1428) is in the `system` group with
                      // `is_closed`. A group whose members are ALL empty renders
                      // nothing, but a boolean always holds a value, so `system`
                      // renders on every case and an unwritten `internal_notes`
                      // stays reachable the way every empty field here is: the
                      // section's "Show N empty fields" toggle, then inline edit.
                      // ⛔ Not the create form — `/new` and edit both resolve
                      // `view.form`, and `case.hook.ts` nulls the column for
                      // anonymous web-to-case submissions.
                      //
                      // `resolution` / `resolved_by_article` render once the case
                      // carries one; `close_case` is the flow that collects the
                      // resolution.
                      sections: [
                        { group: 'basic' },
                        { group: 'origin' },
                        { group: 'sla' },
                        { group: 'escalation' },
                        { group: 'resolution' },
                        { group: 'system' },
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
                    id: 'case_related_accordion',
                    properties: {
                      items: [
                        {
                          // An accordion item `key` is DELETED, not renamed to
                          // `value` — the opposite verdict to the tab items
                          // above, and the difference is a read point (#1269).
                          // `PageAccordionProps`' item shape is
                          // `{ label, icon?, collapsed?, children }` and it
                          // prescribes AGAINST `value` by name: the renderer
                          // maps every item to `{ ...it, value: `panel-<idx>` }`
                          // before rendering, so an authored value is
                          // overwritten. `page:tabs` really does read `it.value`;
                          // `page:accordion` does not. Nothing addresses these
                          // panels, so the identifier has nowhere to land.
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
                                  'owner_id',
                                ],
                                filter: [
                                  { field: 'status', operator: 'not_equals', value: 'completed' },
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
                value: 'activity',
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

  aria: {
    ariaLabel: 'Case Detail Page',
    ariaDescribedBy: 'Service-agent case detail view with SLA path, details, related items and activity timeline.',
  },
};
