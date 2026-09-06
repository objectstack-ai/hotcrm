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
            breadcrumb: true,
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
                      // (#6946 / ADR-0087 D2) — see the same note on
                      // opportunity_detail.page.ts.
                      columns: '2',
                      // Same rule as the opportunity page (#1211): a section lists
                      // only what it is responsible for. `record:details` drops
                      // every field the mounted `record:highlights` registered
                      // (`status`, `priority`, `sla_due_date`, `is_sla_violated`,
                      // `owner_id`, `crm_account`) plus the title candidate
                      // `subject` (the page H1 is `{case_number} · {subject}`), and
                      // a section left holding only empty fields renders nothing.
                      // Listing those names here therefore promised fields the tab
                      // never showed.
                      sections: [
                        {
                          name: 'info',
                          label: 'Case Information',
                          fields: [
                            'case_number',
                            'crm_contact',
                            'type',
                            'origin',
                          ],
                        },
                        {
                          name: 'status',
                          label: 'Status & SLA',
                          fields: [
                            'is_escalated',
                            'escalation_reason',
                            'resolution_time_hours',
                          ],
                        },
                        {
                          // `internal_notes` lives HERE, in the prose section
                          // that always renders, and NOT in an "Internal
                          // Notes" section of its own (#1428). A section is not
                          // a container an author can rely on: measured in the
                          // shipped console (`@objectstack/console` 17.2.0,
                          // `dist/assets/plugins-views-*.js` -> `DetailSection`),
                          // a section whose fields are ALL empty returns
                          // `null` — no heading, no shell, no toggle. A section
                          // holding only `internal_notes` would therefore
                          // render nothing until the field is non-empty, and
                          // the only way to make it non-empty is to author it
                          // in that section. That circle is the whole reason
                          // this field had no surface to begin with, and a
                          // dedicated section would have re-created it while
                          // looking like a fix.
                          //
                          // This section escapes it because `description` is
                          // REQUIRED on the object, so it is never empty and
                          // the section always renders. An unwritten
                          // `internal_notes` is then reachable the same way
                          // every other empty field on this page is: the
                          // section's own "Show N empty fields" toggle
                          // (rendered whenever `hideEmpty` — default true —
                          // hid at least one field), and inline edit
                          // (`inlineEdit` defaults true where the profile
                          // grants update) authors it in place.
                          //
                          // ⛔ Inline edit is the surface on purpose; the
                          // header's Edit button is not an alternative. Both
                          // `/new` and edit resolve `view.form`, so the record
                          // form IS the create form (`src/views/case.view.ts`),
                          // and #1427 narrowed it to what a creator legitimately
                          // authors at intake. Putting `internal_notes` back on
                          // that form would hand it to the intake path, where
                          // `case.hook.ts` nulls the column for anonymous
                          // web-to-case submissions anyway.
                          //
                          // ⛔ `customer_rating` / `customer_feedback` are NOT
                          // added alongside it, and their absence is a decision
                          // rather than an oversight: whether staff should type
                          // a customer's satisfaction score on the customer's
                          // behalf is a product question (#1428), open. Do not
                          // "complete the set" here without that ruling.
                          //
                          // Field-level security is untouched by any of this —
                          // `crm_case.internal_notes` stays editable for
                          // `service_agent`, read-only for `sales_manager` and
                          // unreadable for `sales_rep` (`src/profiles/`).
                          name: 'description',
                          label: 'Description',
                          columns: 1,
                          collapsible: true,
                          fields: ['description', 'resolution', 'internal_notes'],
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
  assignedProfiles: ['service_agent', 'system_admin'],

  aria: {
    ariaLabel: 'Case Detail Page',
    ariaDescribedBy: 'Service-agent case detail view with SLA path, details, related items and activity timeline.',
  },
};
