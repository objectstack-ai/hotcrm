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
     * The predicate for "no longer live work" is `status not_in ['resolved',
     * 'closed']`, NOT `is_closed == false`. `is_closed` is derived by
     * `case_sla_defaults` as `effStatus === 'closed'`, so it never flips on
     * `resolved` — and a resolved ownerless case satisfied both of this view's
     * old filters and sat here forever, which is neither "arrives with no
     * owner" nor "work waiting for a human". `not_in` lowers to the `$nin` the
     * load-balancing hooks and `case_sla_monitor` already use for the same
     * concept, so the four consumers now state one predicate; the roster that
     * holds them together by NAME is `test/live-work-predicate-parity.test.ts`.
     * `closed` stays excluded for the reason it always was: history, not
     * backlog.
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
        { field: 'status', operator: 'not_in', value: ['resolved', 'closed'] },
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
      data: { provider: 'object', object: 'crm_case' },
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
   * The record form — and, because the platform has ONE, the CREATE form too.
   *
   * ## ⚠️ This object's `form` IS the create dialog (#1214 item 3)
   *
   * Measured against the console this app ships (`@objectstack/console`
   * 17.1.0, `dist/assets/`), BOTH entry points that open a case form resolve
   * it the same way and neither takes a create/edit argument:
   *
   *   RecordFormPage (`/{object}/new`, `/{object}/record/{id}/edit`)
   *       view.form ?? view.formViews?.default
   *   useActionModal (the `+ New` modal off a list view)
   *       view.form ?? view.formViews?.default
   *
   * ⇒ There is no create-only form to author. `ListViewSchema.addRecord`
   * carries a `formView` key in `@objectstack/spec`, but NO console code path
   * reads it (the string appears only in the view designer's own i18n table),
   * so pointing it at a second form view would ship an ADR-0049
   * declared-but-unenforced shape and change nothing on screen.
   *
   * ⇒ Therefore the create-safe field set has to BE this form's field set.
   * That is why the SLA and Resolution sections are gone rather than gated.
   *
   * ## ⛔ Why the tab strip was not the object's `fieldGroups`
   *
   * `crm_case.fieldGroups` declares SIX groups (Case Information / Origin &
   * Routing / SLA & Priority / Resolution / Escalation / System) and the
   * dialog showed THREE tabs — these sections. The renderer only reaches for
   * `fieldGroups` on its AUTO-DERIVED path, taken when a form authors no
   * `sections` at all; an authored `sections` array wins outright. So
   * `src/objects/case.object.ts` is not part of this surface.
   *
   * ## ⚠️ Authoring `sections` OPTS OUT of the create-mode field strip
   *
   * That auto-derived path also runs two filters the authored path never sees
   * (`plugin-form`: `Qe` → `qe` drops `readonly`/`hidden` fields, and on
   * `mode === 'create'` `Je` additionally drops formula / summary / autonumber
   * fields). An authored section renders its list VERBATIM. That is the whole
   * mechanism behind this defect: the platform would have hidden
   * `created_date`, `closed_date`, `resolution_time_hours` and `is_closed`
   * from a creator by itself, and naming them in a section put them back.
   *
   * ## ⛔ Why not gate the old sections on a predicate instead
   *
   * A section-level `visibleWhen` is parsed by `FormSectionSchema` and read by
   * NOTHING in the form renderer (only FIELD-level `visibleWhen` is
   * evaluated), so it would hide nothing. And field-level predicate evaluation
   * FAILS OPEN — an unevaluable predicate renders the field visible, with no
   * diagnostic (the house rule at the top of `lead.view.ts`, upstream
   * objectstack-ai/objectstack#5149). A gate that fails open is not a gate for
   * a data-integrity control, which is what this one is.
   *
   * ## What a creator may author here, and why the rest left
   *
   * Everything below is a fact the person raising the case HAS at intake.
   * `case_number` stays because it is `readonly: true` on the object, so the
   * renderer disables it — it is shown, never authored.
   *
   * The removed fields are all written by the lifecycle, and every one of them
   * still has the surface it belongs on (pinned in
   * `test/case-create-form-narrowing.test.ts`, both directions):
   *
   *   created_date, closed_date        readonly; `case_timeline` start/end
   *   sla_due_date                     `case.hook.ts` stamps it from the
   *                                    priority × tier matrix; list column,
   *                                    sort key, `sla_calendar.startDateField`,
   *                                    detail-page highlights
   *   first_response_date              `event.hook.ts` is its SINGLE writer
   *   resolution_time_hours            readonly; derived at close; detail page
   *   is_sla_violated                  list column + detail-page highlights
   *   is_escalated, escalation_reason  written by `case_escalation` /
   *                                    `case_sla_monitor` / `escalate_case`;
   *                                    detail page's Status & SLA section
   *   resolution                       detail page's Description section
   *                                    (the `resolution_required_on_close`
   *                                    validation still has its surface)
   *   is_closed                        readonly; derived from `status`
   *
   * ⚠️ `internal_notes`, `customer_rating` and `customer_feedback` left with
   * the Resolution section and had NO other authoring surface at all. #1428
   * closed HALF of that, on the record page rather than here:
   *
   *   internal_notes                   `case_detail.page.ts`'s Description
   *                                    section, authored by inline edit —
   *                                    staff prose an agent writes while
   *                                    WORKING a case, which is why it did not
   *                                    come back to this form. The guest
   *                                    branch of `case.hook.ts` nulls the
   *                                    column on anonymous intake, so an
   *                                    intake surface for it would be a
   *                                    surface for a value the app discards.
   *
   * ⛔ `customer_rating` and `customer_feedback` still have NO authoring
   * surface anywhere in this app, and that is HELD, not forgotten. Whether a
   * person should type a customer's satisfaction score on the customer's
   * behalf is a product question — the alternative is a survey the customer
   * answers — and adding two inputs anywhere would settle it by accident.
   * #1428 carries the question. Two consequences are recorded there rather
   * than hidden: `case_csat_followup` already notifies the case owner to "log
   * their satisfaction rating" against a record with nowhere to put it, and
   * unlike `internal_notes` neither field is named in ANY profile's `fields`
   * map — which in this platform means unrestricted, not restricted.
   *
   * `type: 'simple'`, not `'tabbed'`: one section is not a tab strip.
   */
  form: {
    type: 'simple',
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
