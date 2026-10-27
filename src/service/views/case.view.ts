// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
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
     * Unassigned — triage (#596). The second half of the queue substitute.
     *
     * `case_auto_assign` (`src/service/objects/_case-assignment.ts`) is a NO-OP whenever
     * the `service_agent` pool is empty, and an empty pool is the FIRST-INSTALL
     * NORM rather than an edge case: `sys_user_position` membership is runtime
     * data, so on a fresh org — and any time every agent has been unassigned
     * from the position — an inbound web-to-case lands ownerless. Best-effort
     * assignment also stands down when its pool read fails.
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
     *     rules (`src/service/sharing/case.sharing.ts`).
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
      userActions: { editInline: true },
      data,
      // `supplied_name` / `supplied_email` beside the contact (#2190): a
      // web-to-case submission, the usual row here, carries no contact.
      columns: ['case_number', 'subject', 'crm_account', 'crm_contact', 'supplied_name', 'supplied_email', 'priority', 'status', 'origin', 'sla_due_date'],
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
      // Same exception tint as the main queue: a breached case turns red.
      // On 18.0.0-next.1 it painted nothing here: the console fetched only the
      // columns and `is_sla_violated` is not one (objectui#12376, reported from
      // #2107; ⛔ no column was added to dodge it). The 18.0.0-next.2 console's
      // fetch for this view selects `is_sla_violated` (measured).
      rowColor: { field: 'is_sla_violated', colors: { true: 'red' } },
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
   * The record form — and, because the platform has ONE, the CREATE form too.
   *
   * ## ⚠️ This object's `form` IS the create dialog (#1214 item 3)
   *
   * Measured against the console this app shipped at that taking
   * (`@objectstack/console` 17.1.0, `dist/assets/`; this bundle read was ⛔ NOT
   * re-taken on any later pin), BOTH
   * entry points that open a case form resolve
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
   * One field came back, gated (#2338 item 2): `resolution`, see below.
   *
   * ## ⛔ Why the tab strip was not the object's `fieldGroups`
   *
   * `crm_case.fieldGroups` declares SIX groups (Case Information / Origin &
   * Routing / SLA & Priority / Resolution / Escalation / System) and the
   * dialog showed THREE tabs — these sections. The renderer only reaches for
   * `fieldGroups` on its AUTO-DERIVED path, taken when a form authors no
   * `sections` at all; an authored `sections` array wins outright. So
   * `src/service/objects/case.object.ts` is not part of this surface.
   *
   * ## ⚠️ Authoring `sections` OPTS OUT of the create-mode field strip
   *
   * That auto-derived path also runs two filters the authored path never sees
   * (`plugin-form`: `Qe` → `qe` drops `readonly`/`hidden` fields, and on
   * `mode === 'create'` `Je` additionally drops formula / summary / autonumber
   * fields). An authored section renders its list VERBATIM. That is the whole
   * mechanism behind this defect: the platform would have hidden
   * `created_date` (retired in #1992), `closed_date`, `resolution_time_hours`
   * and `is_closed` from a creator by itself, and naming them in a section put
   * them back.
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
   *   closed_date                      readonly; `case_timeline` end
   *                                    (its start is the platform's
   *                                    `created_at`; `created_date` was
   *                                    retired in #1992)
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
   *   resolution                       detail page's Description section,
   *                                    and back on this form behind a status
   *                                    gate since #2338 item 2 (below)
   *   is_closed                        readonly; derived from `status`
   *
   * ⚠️ `internal_notes`, `customer_rating` and `customer_feedback` left with
   * the Resolution section and had NO other authoring surface at all. #1428
   * settled both halves of that, and neither answer was "put them back here":
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
   *   customer_rating,                 RETIRED under ADR-0049 enforce-or-remove
   *   customer_feedback                (maintainer ruling, decision batch #21,
   *                                    2026-09-03). Neither column exists on
   *                                    `crm_case` any more, so there is nothing
   *                                    here to omit and nothing anywhere to
   *                                    author.
   *
   * ⛔ Do not re-introduce either field, here or elsewhere. The ruling was not
   * "no room on this form": a satisfaction score typed by the person being
   * scored is not the same fact as one the customer gave, and neither field was
   * named in ANY profile's `fields` map — which on this platform means
   * unrestricted, not restricted. `case_csat_followup`, whose only purpose was
   * to notify the case owner to log a rating, was retired in the same change.
   * A customer-answered survey is a feature and would arrive as its own card,
   * not as two inputs added back here.
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
          { field: 'subject', required: true, span: 'full' },
          // Offered, ⛔ not `required` (#2060 item 4): `crm_case.crm_account`
          // is optional on the object and a web-to-case submission carries
          // none. This form is also the one an agent claims such a case
          // through (a move to In Progress), so `required` here refused that
          // save client-side ("Please check the highlighted fields: Account")
          // while the server took it. A case with no account takes the `smb`
          // SLA column, and the escalation task and resolution bump skip it.
          'crm_account',
          'crm_contact',
          // Beside the contact, as on the record page (#2190): what a web
          // submitter typed, editable here and never required — a staff case
          // links a contact instead, and needs neither.
          'supplied_name',
          'supplied_email',
          { field: 'status', required: true },
          // Offered once the status says the case is being resolved (#2338
          // item 2). This is the edit form, and it offers Status "Closed",
          // which `resolution_required_for_closed` on `crm_case` refuses
          // without a resolution. With the field off this form that save was a
          // dead end ("Resolution is required when closing a case", nothing to
          // fill in, the record page hiding its Resolution section while
          // empty), so the only way out was Cancel, then Close Case. Gated,
          // not always on, because this form is also the create dialog, and a
          // new case is `new`. The predicate is TOTAL (`has()` first): an
          // unevaluable one fails OPEN in the console (the house rule at the
          // top of `lead.view.ts`), which would only show the field. Not
          // `required` here: the object's rule asks for it on `closed` only,
          // and a client-side `required` would also demand it on `resolved`.
          {
            field: 'resolution',
            span: 'full',
            visibleWhen: P`has(record.status) && (record.status == "resolved" || record.status == "closed")`,
          },
          'priority',
          'origin',
          'owner_id',
          // Required on the object with no default — a form without it could
          // never save a new case.
          { field: 'description', required: true, span: 'full' },
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
   * owner_id, SLA) are stamped by `case.hook.ts` after a guest submission.
   * `priority` is NOT one of them: this form asks the guest for it, and an
   * unset one is filled by the `low` option `crm_case.priority` declares
   * `default: true`. Field defaults are applied before `beforeInsert`, so the
   * hook only ever reads `priority` (to derive `priority_rank`).
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
          columns: 1,
          fields: [
            // Who to answer (#2190): a web case carries no contact, so this
            // is the only reply address the agent gets. The email is required
            // here, like web-to-lead's — the door refuses a submission
            // without it — and optional on the object, so a staff-created
            // case needs neither.
            'supplied_name',
            { field: 'supplied_email', required: true },
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
