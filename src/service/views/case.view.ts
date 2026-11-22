// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * The one data provider every view below reads — the default list, the seven
 * named list views and the web-to-case form all list or write `crm_case` —
 * written once and passed by shorthand (`data,`) rather than spelled out nine
 * times.
 */
const data = { provider: 'object', object: 'crm_case' } as const;

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
    userActions: { editInline: true },
    data,
    // Eight columns in the order a support queue is scanned, sized to fit a
    // 1440 px screen with the sidebar open (#2292). Contact, the web
    // submitter's `supplied_name` / `supplied_email` (#2190) and origin stay
    // on `unassigned_triage`, where a web case lands, and on the record page;
    // the escalation flag is what `escalated_cases` filters on. Here they
    // pushed priority, status and SLA off the right edge.
    columns: [
      { field: 'case_number', width: 130, sortable: true, link: true, pinned: 'left' },
      { field: 'subject', width: 200, sortable: true },
      { field: 'crm_account', width: 170 },
      { field: 'priority', width: 100, sortable: true },
      { field: 'status', width: 110, sortable: true },
      { field: 'sla_due_date', width: 180, sortable: true },
      { field: 'is_sla_violated', width: 100, align: 'center' },
      { field: 'owner_id', width: 110 },
    ],
    // Sort on the materialised ordinal, not the select itself: `priority desc`
    // compares raw strings and lands medium > low > high > critical, burying
    // every critical case at the bottom of the queue.
    sort: [
      { field: 'priority_rank', order: 'desc' },
      { field: 'sla_due_date', order: 'asc' },
    ],
    // Only the exception row is tinted: a case whose SLA is breached turns
    // red and every other row stays plain. A colour per priority painted every
    // row the priority column's own badge already marks, so it flagged none.
    rowColor: { field: 'is_sla_violated', colors: { true: 'red' } },
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
    // Binds the 'calendar' entry above: the switcher opens the same deadlines
    // the dedicated `sla_calendar` view shows, on the field this list already
    // sorts by. `sla_due_date` is optional — a case the SLA monitor has not
    // stamped carries no date at all, which is the truthful answer; the
    // alternative the platform refuses is a guessed field putting every such
    // case on today.
    calendar: {
      startDateField: 'sla_due_date',
      titleField: 'subject',
      colorField: 'priority',
    },
    // Escalate straight from the queue: escalate_case's own
    // `locations: ['list_item']` auto-injects the row-menu item.
  },

  listViews: {
    /** Service workflow board */
    case_workflow: {
      name: 'case_workflow',
      type: 'kanban',
      label: 'Service Workflow',
      data,
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
      data,
      columns: ['case_number', 'subject', 'priority'],
      // Live cases only (#2367 row 3), the same cut as My Open Cases and SLA at
      // Risk: a resolved or closed case keeps its `sla_due_date`, and the
      // calendar drew those beside the live ones, so an agent planning the day
      // read deadlines that no longer bind anyone. `is_closed` alone would keep
      // the resolved ones (it is derived from `closed` only).
      filter: [{ field: 'status', operator: 'not_in', value: ['resolved', 'closed'] }],
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
      data,
      columns: ['case_number', 'subject'],
      timeline: {
        // `created_at`, the platform's own creation stamp — the object's
        // duplicate `created_date` was removed in #1992 because nothing wrote
        // it on a real case, so every user-created case started its bar at
        // null. Same spelling as `crm_lead`'s activity calendar.
        startDateField: 'created_at',
        endDateField: 'closed_date',
        titleField: 'subject',
        groupByField: 'owner_id',
        colorField: 'status',
        scale: 'day',
      },
    },

    /**
     * The agent's personal queue: the cases themselves, one row each. Its
     * aggregate counterpart is service_dashboard's "My Open Cases by
     * Priority" (#510) — a dashboard widget counts, it cannot list.
     */
    my_open_cases: {
      name: 'my_open_cases',
      type: 'grid',
      label: 'My Open Cases',
      userActions: { editInline: true },
      data,
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'status', 'sla_due_date'],
      // ⚠️ `status not_in CLOSED_CASE_STATUSES`, NOT `is_closed == false`: the
      // flag is derived as `effStatus === 'closed'` and never flips on
      // `resolved`, so the flag spelling listed every RESOLVED case under a tab
      // labelled "My Open Cases" — measured on the seeded demo population, the
      // flag returned 30 of 38 cases and 7 of those 30 were resolved. A resolved
      // case is finished work awaiting closure, not an open queue, and the
      // mainstream service-cloud reading of "open" excludes it (Zendesk's open
      // set omits Solved; ServiceNow's OOTB Open filter is
      // `state not in (Resolved, Closed, Cancelled)`). Ruled 2026-08-31; pinned by
      // `test/live-work-predicate-parity.test.ts` (#1145), whose consumer roster
      // this view joined in the same change.
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
        { field: 'status', operator: 'not_in', value: ['resolved', 'closed'] },
      ],
      sort: [
        { field: 'priority_rank', order: 'desc' },
        { field: 'sla_due_date', order: 'asc' },
      ],
    },

    /**
     * Unassigned — triage: the cases waiting in the Support Intake queue.
     *
     * Since @objectstack 18.3.0 a case nobody owns SITS in a queue (ADR-0142
     * D3): `case_intake_assignment` routes every ownerless new case into
     * `case_intake`, and with nobody holding `crm_service_agent` — the
     * FIRST-INSTALL NORM, since position membership is runtime data — the case
     * parks there instead of being handed to an agent. This tab is that queue's
     * standing view: its row count IS the intake backlog. An agent opens a row
     * and presses the console's **Claim**; the case then has an owner and
     * leaves the tab.
     *
     * The filter is the platform's own meaning of "sits in": `owner_id` empty
     * AND `queue` names the queue (ADR-0142 D8 re-pointed it here). `is_null`
     * on `owner_id`, not `equals: null`: the ownerless shape is an ABSENT column
     * on driver-memory as well as a NULL one on SQL, and only the operator form
     * answers the same way for both. A case that was ownerless before the
     * upgrade has no `queue` until `scripts/backfill-intake-queue.ts` sets it.
     *
     * The predicate for "no longer live work" is `status not_in ['resolved',
     * 'closed']`, NOT `is_closed == false`. `is_closed` is derived by
     * `case_sla_defaults` as `effStatus === 'closed'`, so it never flips on
     * `resolved`. The queue's read path shows its members EVERY case sitting in
     * it, resolved and closed ones included (ADR-0142 D8: the deleted triage
     * sharing rule hid those, the platform path does not), so this filter is
     * what keeps the tab meaning "work waiting for a human". `not_in` lowers to
     * the `$nin` `case_intake_assignment`'s `load` and `case_sla_monitor` use for
     * the same concept; the roster that holds them together by NAME is
     * `test/live-work-predicate-parity.test.ts`.
     *
     * WHO SEES ROWS HERE is decided by record-level access, not by this view.
     * A view tab carries no role scoping, so it is pinned for everyone who can
     * open Cases, while the rows resolve per person:
     *
     *   - a holder of `crm_service_agent` — a member of `case_intake`, so every
     *     case sitting in it, through `current_user.queues`;
     *   - `system_admin` and `sales_manager` — `viewAllRecords`;
     *   - a service manager / director — not a queue member (the queue names
     *     the `crm_service_agent` position), so the critical, open slice only,
     *     through `case_escalation_sharing` / `case_director_sharing`
     *     (`src/service/sharing/case.sharing.ts`).
     */
    unassigned_triage: {
      name: 'unassigned_triage',
      type: 'grid',
      label: 'Unassigned — triage',
      userActions: { editInline: true },
      data,
      // `supplied_name` / `supplied_email` beside the contact (#2190): a
      // web-to-case submission, the usual row here, carries no contact.
      columns: ['case_number', 'subject', 'crm_account', 'crm_contact', 'supplied_name', 'supplied_email', 'priority', 'status', 'origin', 'sla_due_date'],
      filter: [
        { field: 'owner_id', operator: 'is_null' },
        { field: 'queue', operator: 'equals', value: 'case_intake' },
        { field: 'status', operator: 'not_in', value: ['resolved', 'closed'] },
      ],
      // Same ordering as the main queue: urgency first (on the materialised
      // ordinal, never the raw select), then soonest deadline.
      sort: [
        { field: 'priority_rank', order: 'desc' },
        { field: 'sla_due_date', order: 'asc' },
      ],
      // Same exception tint as the main queue: a breached case turns red.
      // On 18.0.0-next.1 it painted nothing here: the console fetched only the
      // columns and `is_sla_violated` is not one (objectui#12376, reported from
      // #2107; ⛔ no column was added to dodge it). The 18.0.0-next.2 console's
      // fetch for this view selects `is_sla_violated` (measured).
      rowColor: { field: 'is_sla_violated', colors: { true: 'red' } },
      // The empty state carries the operational instruction, because "no rows"
      // here is ambiguous on its own: it means either "the assignment rule
      // placed everything" (good) or "no case has arrived yet" (also fine) —
      // and the reader most likely to be looking is someone who just found the
      // tab full and needs to know why.
      emptyState: {
        title: 'Nothing waiting for triage',
        message: 'Every case has an owner. A case waits here in the Support Intake queue when it arrives while nobody holds the Service Agent position. Open it and press Claim to take it.',
        icon: 'inbox',
      },
    },

    escalated_cases: {
      name: 'escalated_cases',
      type: 'grid',
      label: 'Escalated Cases',
      userActions: { editInline: true },
      data,
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'sla_due_date', 'owner_id'],
      // The manager's escalation QUEUE, so it lists escalated cases that are
      // still live work (#2245). `is_escalated` alone is a stamp that never
      // clears, so a resolved or closed escalation stayed on the tab forever.
      //
      // ⚠️ Same spelling as `sla_at_risk` below — `status not_in` the closed
      // statuses, NOT `is_closed == false` (the flag never flips on
      // `resolved`). Pinned by `test/live-work-predicate-parity.test.ts`.
      filter: [
        { field: 'is_escalated', operator: 'equals', value: true },
        { field: 'status', operator: 'not_in', value: ['resolved', 'closed'] },
      ],
      sort: [{ field: 'priority_rank', order: 'desc' }],
    },

    /**
     * SLA-at-risk: open cases at High or Critical priority needing attention.
     *
     * ⚠️ Names what the filter below actually selects. This read
     * "high/urgent" until #1333 — but `crm_case.priority` is
     * low/medium/high/critical (`case.object.ts:138-142`) and has NO `urgent`;
     * that value belongs to `crm_task`. The mirror-image crossing already
     * shipped a real defect once (`task.view.ts:35` — Case colour keys on the
     * task view left every urgent and normal row uncoloured), and the
     * direction that cost something was the one where the comment was
     * believed. Two overlapping-but-unequal vocabularies: keep them apart.
     */
    sla_at_risk: {
      name: 'sla_at_risk',
      type: 'grid',
      label: '⏰ SLA at Risk',
      userActions: { editInline: true },
      data,
      columns: ['case_number', 'subject', 'crm_account', 'priority', 'sla_due_date', 'owner_id'],
      // Operator-only filter — sort by SLA due date ascending so the soonest
      // surface first. (The view runtime does not interpolate `{NOW() + 4h}`.)
      //
      // ⚠️ `status not_in CLOSED_CASE_STATUSES`, NOT `is_closed == false`: the
      // flag is derived as `effStatus === 'closed'` and never flips on
      // `resolved`, so the flag spelling listed resolved cases as at risk while
      // `case_sla_monitor` — the automation that OWNS SLA — had already
      // excluded them (`status: { $nin: ['resolved', 'closed'] }`). The tab a
      // human reads and the sweep that acts must answer this one question the
      // same way. Pinned by `test/live-work-predicate-parity.test.ts` (#1145).
      filter: [
        { field: 'status', operator: 'not_in', value: ['resolved', 'closed'] },
        { field: 'priority', operator: 'in', value: ['high', 'critical'] },
      ],
      sort: [{ field: 'sla_due_date', order: 'asc' }],
    },
  },

  /**
   * Additional named form views.
   *
   * `web_to_case` is a PUBLIC / ANONYMOUS support form (Salesforce
   * Web-to-Case equivalent). Hosted at `/forms/support` and embeddable in
   * a help center. Guests can ONLY submit — the `guest_portal` profile
   * denies read/edit/delete on `crm_case`. Internal fields (status, origin,
   * owner_id, SLA) are stamped by `case.hook.ts` after a guest submission.
   * `priority` is not on the form (#2368): a web case takes the `low` option
   * `crm_case.priority` declares `default: true`, and staff re-triage it.
   * Field defaults are applied before `beforeInsert`, so the hook reads
   * `priority` to derive `priority_rank`, and caps a guest's `critical` at
   * `high`.
   */
  formViews: {
    web_to_case: {
      type: 'simple',
      // The heading a visitor reads (#2284), translated under
      // `objects.crm_case._views.web_to_case.title` — see `web_to_lead`.
      title: 'Contact Support',
      data,
      sections: [
        {
          name: 'how_can_we_help',
          label: 'How can we help?',
          // The hotline hint stands where every visitor reads it (#2368):
          // the form has no priority field to hang it on any more.
          description: 'For an urgent outage, call the service hotline.',
          columns: 1,
          fields: [
            // Who to answer (#2190): a web case carries no contact, so this
            // is the only reply address the agent gets. The email is required
            // here, like web-to-lead's — the door refuses a submission
            // without it — and optional on the object, so a staff-created
            // case needs neither.
            //
            // The labels are the visitor's (#2368): the object calls these
            // columns "Supplied Name" / "Supplied Email" because that is what
            // an agent reads on the case, while the person filling the form in
            // is the one supplying them.
            { field: 'supplied_name', label: 'Your name' },
            { field: 'supplied_email', required: true, label: 'Your email' },
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
            // ⛔ No `priority` here (#2368, maintainer ruling: a guest picks at
            // most High). Critical escalates on insert and notifies the service
            // manager. 18.2.0 offers no per-form option subset: a form row's
            // `options` list parses and is served by `GET /forms/support`, but
            // the public renderer still lists all four object options, and the
            // door validates a posted value against the object, not the row.
            // So the ruling's fallback holds: the field is off the form, the
            // door's allow-list drops a posted `priority`, and the case takes
            // the object default (`low`). The guest branch of
            // `case_sla_defaults` also caps `critical` at `high`, for the day
            // this list moves.
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
