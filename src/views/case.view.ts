// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Case (Service) Views
 *
 *   • grid     — support queue with SLA columns
 *   • kanban   — case workflow grouped by status
 *   • timeline — chronological case stream
 *   • calendar — SLA due-date calendar
 */
export const CaseViews = defineView({
  list: {
    type: 'grid',
    name: 'all_cases',
    label: 'All Cases',
    data: { provider: 'object', object: 'crm_case' },
    columns: [
      { field: 'case_number', width: 130, sortable: true, link: true, pinned: 'left' },
      { field: 'subject', width: 280, sortable: true },
      { field: 'crm_account', width: 180 },
      { field: 'crm_contact', width: 160 },
      { field: 'priority', width: 110, sortable: true },
      { field: 'status', width: 130, sortable: true },
      { field: 'origin', width: 120 },
      { field: 'sla_due_date', width: 160, sortable: true },
      { field: 'is_sla_violated', width: 110, align: 'center' },
      { field: 'is_escalated', width: 110, align: 'center' },
      { field: 'owner_id', width: 150 },
    ],
    // Sort on the materialised ordinal, not the select itself: `priority desc`
    // compares raw strings and lands medium > low > high > critical, burying
    // every critical case at the bottom of the queue.
    sort: [
      { field: 'priority_rank', order: 'desc' },
      { field: 'sla_due_date', order: 'asc' },
    ],
    rowColor: {
      field: 'priority',
      colors: { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#94a3b8' },
    },
    selection: { type: 'multiple' },
    pagination: { pageSize: 50 },
    // The UI door for the `allowExport` grant four profiles already hold on
    // `crm_case`. Export runs on ONE server-side route
    // (`GET /api/v1/data/crm_case/export`, gated by `security.canExport`), so
    // this declares which formats the toolbar offers — not a second gate: a
    // profile without the grant gets 403 whether it clicks the button or
    // curls the route. Measured in #798/#816; before this the grant was live
    // but reachable only by `curl`.
    exportOptions: { formats: ['csv', 'xlsx'] },
    appearance: {
      showDescription: true,
      allowedVisualizations: ['grid', 'kanban', 'calendar', 'timeline'],
    },
    tabs: [
      { name: 'all', label: 'All', view: 'all_cases', isDefault: true, pinned: true },
      { name: 'workflow', label: 'Workflow', icon: 'columns-3', view: 'case_workflow' },
      { name: 'sla', label: 'SLA', icon: 'calendar', view: 'sla_calendar' },
      { name: 'timeline', label: 'Timeline', icon: 'git-commit-horizontal', view: 'case_timeline' },
      // Pinned, and second only to All: the triage queue is the first thing a
      // service role must be able to reach, because a case sitting in it is a
      // case nobody owns. See `unassigned_triage` below.
      { name: 'triage', label: 'Unassigned — triage', icon: 'inbox', view: 'unassigned_triage', pinned: true },
      { name: 'escalated', label: 'Escalated', icon: 'triangle-alert', view: 'escalated_cases' },
      { name: 'at_risk', label: 'SLA at Risk', icon: 'clock-alert', view: 'sla_at_risk' },
      { name: 'mine', label: 'My Cases', icon: 'user', view: 'my_open_cases' },
    ],
    // Escalate straight from the queue: escalate_case's own
    // `locations: ['list_item']` auto-injects the row-menu item.
  },

  listViews: {
    /** Service workflow board */
    case_workflow: {
      name: 'case_workflow',
      type: 'kanban',
      label: 'Service Workflow',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'priority', 'sla_due_date'],
      kanban: {
        groupByField: 'status',
        columns: ['case_number', 'subject', 'crm_account', 'priority', 'owner_id'],
      },
      filter: [{ field: 'is_closed', operator: 'equals', value: false }],
      navigation: { mode: 'drawer', width: '640px' },
    },

    /** SLA calendar */
    sla_calendar: {
      name: 'sla_calendar',
      type: 'calendar',
      label: 'SLA Calendar',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'priority'],
      calendar: {
        startDateField: 'sla_due_date',
        titleField: 'subject',
        colorField: 'priority',
      },
    },

    /** Chronological case stream */
    case_timeline: {
      name: 'case_timeline',
      type: 'timeline',
      label: 'Case Timeline',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject'],
      timeline: {
        startDateField: 'created_date',
        endDateField: 'closed_date',
        titleField: 'subject',
        groupByField: 'owner_id',
        colorField: 'status',
        scale: 'day',
      },
    },

    /**
     * The agent's personal queue. This is a LIST view on purpose: the list
     * data path resolves `{current_user_id}` (proven by my_leads /
     * my_open_tasks), while the dashboard/analytics path resolves no user
     * token at all — which is why service_dashboard has no "my" widget
     * (see the note there and the proven record in crm.app.ts).
     */
    my_open_cases: {
      name: 'my_open_cases',
      type: 'grid',
      label: 'My Open Cases',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'status', 'sla_due_date'],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
        { field: 'is_closed', operator: 'equals', value: false },
      ],
      sort: [
        { field: 'priority_rank', order: 'desc' },
        { field: 'sla_due_date', order: 'asc' },
      ],
    },

    /**
     * Unassigned — triage (#596). The second half of the queue substitute.
     *
     * `case_auto_assign` (`src/objects/_case-assignment.ts`) is a NO-OP whenever
     * the `service_agent` pool is empty, and an empty pool is the FIRST-INSTALL
     * NORM rather than an edge case: `sys_user_position` membership is runtime
     * data, so on a fresh org — and any time every agent has been unassigned
     * from the position — an inbound web-to-case lands ownerless. Best-effort
     * assignment also stands down on a permission denial (the anonymous
     * public-form context cannot read `sys_user_position` at all).
     *
     * Those cases used to be invisible: no view filtered on the absence of an
     * owner, so an unowned case appeared in `All Cases` with a blank Owner
     * column and nothing distinguished it from the rest. This view is the
     * standing answer — silence replaced by a pinned tab whose row count IS the
     * intake backlog.
     *
     * `is_null` on `owner_id`, not `equals: null`: the ownerless shape is an
     * ABSENT column on driver-memory (see the totality note in
     * `case-escalation.flow.ts`, where `record.escalated_date == null` aborted
     * with `No such key`) as well as a NULL one on SQL, and only the operator
     * form answers the same way for both.
     *
     * Closed cases are excluded: an ownerless case that has already been closed
     * is history, not backlog, and leaving it here would make the count stop
     * meaning "work waiting for a human".
     *
     * ⚠️ WHO ACTUALLY SEES ROWS HERE is decided by record-level access, not by
     * this view, and the answer today is narrower than the tab suggests. A
     * view tab carries no role scoping — `ViewTabSchema` has `pinned`,
     * `isDefault` and a boolean `visible`, and nothing per-profile — so this is
     * pinned for everyone who can open Cases, while the ROWS resolve per
     * profile:
     *
     *   - `system_admin` — `viewAllRecords`, so the full backlog. This is the
     *     persona the empty-pool state is FOR: an empty `service_agent` pool is
     *     fixed by staffing `sys_user_position`, which only an admin can do.
     *   - `sales_manager` — `viewAllRecords`, read-only.
     *   - a service manager / director — the critical, open slice only, via the
     *     existing `case_escalation_sharing` / `case_director_sharing` criteria
     *     rules (`src/sharing/case.sharing.ts`).
     *   - `service_agent` — `readScope: 'own'` on `crm_case`, and an unowned
     *     row is owned by nobody, so **an agent's triage tab is empty**.
     *
     * The last line is a real gap for the "agent pulls from the queue" story
     * and is deliberately NOT closed here: granting service roles sight of
     * unowned cases is a sharing-model change (a new criteria rule, or a
     * `readScope` widening), which is outside this card's file surface and is
     * exactly the kind of quiet permission widening the #596 ruling rules out.
     * Filed as #1096 for a decision, with the reach table above and the three
     * options priced.
     */
    unassigned_triage: {
      name: 'unassigned_triage',
      type: 'grid',
      label: 'Unassigned — triage',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'crm_account', 'crm_contact', 'priority', 'status', 'origin', 'sla_due_date'],
      filter: [
        { field: 'owner_id', operator: 'is_null' },
        { field: 'is_closed', operator: 'equals', value: false },
      ],
      // Same ordering as the main queue: urgency first (on the materialised
      // ordinal, never the raw select), then soonest deadline.
      sort: [
        { field: 'priority_rank', order: 'desc' },
        { field: 'sla_due_date', order: 'asc' },
      ],
      rowColor: {
        field: 'priority',
        colors: { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#94a3b8' },
      },
      // The empty state carries the operational instruction, because "no rows"
      // here is ambiguous on its own: it means either "the round-robin placed
      // everything" (good) or "no case has arrived yet" (also fine) — and the
      // reader most likely to be looking is someone who just found the tab
      // full and needs to know why.
      emptyState: {
        title: 'Nothing waiting for triage',
        message: 'Every case has an owner. Cases appear here when they arrive with no owner — typically a web-to-case submission that arrived while nobody held the Service Agent position.',
        icon: 'inbox',
      },
    },

    escalated_cases: {
      name: 'escalated_cases',
      type: 'grid',
      label: 'Escalated Cases',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'sla_due_date', 'owner_id'],
      filter: [{ field: 'is_escalated', operator: 'equals', value: true }],
      sort: [{ field: 'priority_rank', order: 'desc' }],
    },

    /** SLA-at-risk: open, high/urgent priority cases needing attention */
    sla_at_risk: {
      name: 'sla_at_risk',
      type: 'grid',
      label: '⏰ SLA at Risk',
      data: { provider: 'object', object: 'crm_case' },
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'sla_due_date', 'owner_id'],
      // Operator-only filter — sort by SLA due date ascending so the soonest
      // surface first. (The view runtime does not interpolate `{NOW() + 4h}`.)
      filter: [
        { field: 'is_closed', operator: 'equals', value: false },
        { field: 'priority', operator: 'in', value: ['high', 'critical'] },
      ],
      sort: [{ field: 'sla_due_date', order: 'asc' }],
    },
  },

  form: {
    type: 'tabbed',
    sections: [
      {
        name: 'case',
        label: 'Case',
        columns: 2,
        fields: [
          'case_number',
          { field: 'subject', required: true, colSpan: 2 },
          { field: 'crm_account', required: true },
          'crm_contact',
          { field: 'status', required: true },
          'priority',
          'origin',
          'owner_id',
          // Required on the object with no default — a form without it could
          // never save a new case.
          { field: 'description', required: true, colSpan: 2 },
        ],
      },
      {
        // Named `sla_overview`, not `sla` — `sla` is already a distinct
        // fieldGroup key on `crm_case` ("SLA & Priority"), and reusing it here
        // would make this section's translated heading follow that group's
        // wording instead of its own "SLA".
        name: 'sla_overview',
        label: 'SLA',
        columns: 2,
        fields: [
          'created_date',
          'first_response_date',
          'sla_due_date',
          'resolution_time_hours',
          'is_sla_violated',
          'is_escalated',
          'escalation_reason',
          'parent_case',
        ],
      },
      {
        name: 'resolution',
        label: 'Resolution',
        columns: 1,
        fields: ['resolution', 'internal_notes', 'customer_rating', 'customer_feedback', 'customer_signature', 'closed_date', 'is_closed'],
      },
    ],
  },

  /**
   * Additional named form views.
   *
   * `web_to_case` is a PUBLIC / ANONYMOUS support form (Salesforce
   * Web-to-Case equivalent). Hosted at `/forms/support` and embeddable in
   * a help center. Guests can ONLY submit — the `guest_portal` profile
   * denies read/edit/delete on `crm_case`. Internal fields (status, origin,
   * priority defaults, owner_id, SLA) are stamped by `case.hook.ts` after a
   * guest submission.
   */
  formViews: {
    web_to_case: {
      type: 'simple',
      data: { provider: 'object', object: 'crm_case' },
      sections: [
        {
          name: 'how_can_we_help',
          label: 'How can we help?',
          columns: 1,
          fields: [
            {
              field: 'subject',
              required: true,
              placeholder: 'Short summary of the issue',
            },
            {
              field: 'description',
              required: true,
              placeholder: 'Steps to reproduce, error messages, screenshots...',
            },
            {
              field: 'type',
              helpText: 'Pick the option that best matches your issue.',
            },
            {
              field: 'priority',
              helpText: 'Critical issues should also be reported via phone.',
            },
          ],
        },
      ],
      sharing: {
        enabled: true,
        allowAnonymous: true,
        publicLink: '/forms/support',
      },
    },
  },
});
