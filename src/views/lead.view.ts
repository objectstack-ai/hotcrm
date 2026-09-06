// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import { defineView } from '@objectstack/spec/ui';
import { DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS } from '../objects/_picklists';

/**
 * ═══ HOUSE RULE: form predicates are `record.`-bound AND TOTAL ═════════════
 *
 * Every `visibleOn` / `visibleWhen` below is a CEL predicate the *renderer*
 * evaluates, and it must satisfy two properties. `test/view-predicate-dialect.test.ts`
 * enforces both against the compiled stack, so you do not have to remember them.
 *
 * 1. **`record.`-bound.** The evaluation context binds field values under the
 *    `record` namespace (`buildScope` in `@objectstack/formula` binds exactly
 *    `record` / `previous` / `input` / `user` / `current_user` / `ctx` / `os`).
 *    A bare field name is an unbound identifier, so it never evaluates:
 *
 *        evaluate('status == "unqualified"',        { record: { status: 'new' } })
 *          → ok:false  type  "Unknown variable: status"       ← for EVERY record
 *        evaluate('record.status == "unqualified"', { record: { status: 'new' } })
 *          → ok:true   false
 *
 * 2. **TOTAL** — the same `has(record.x)` rule AGENTS.md states for
 *    `validations[].condition` / `requiredWhen` / `readonlyWhen` / `visibleWhen`
 *    (#630). Prefixing alone is not enough: on a *brand-new* record the key is
 *    absent, and strict CEL aborts on the read:
 *
 *        evaluate('record.duplicate_of_type == "crm_lead"',                { record: {} })
 *          → ok:false  "No such key: duplicate_of_type"
 *        evaluate('has(record.duplicate_of_type) && record.duplicate_of_type == "crm_lead"',
 *                                                                          { record: {} })
 *          → ok:true   false
 *
 * Why both matter here and not only in theory (#688): the console's predicate
 * evaluation **fails OPEN** — an unevaluable `visibleWhen` defaults the field to
 * *visible*, with no diagnostic — and a visible field carries its `required: true`
 * into client-side submit validation. So a predicate that cannot answer does not
 * degrade to "shown but optional"; it makes the form unsatisfiable. On `crm_lead`
 * this rendered all five conditional disqualification fields at once and demanded
 * a new lead be a duplicate of *both* a lead and a contact — mutually exclusive by
 * design — so no lead could be created through the UI at all. The fail-open half
 * is tracked upstream at objectstack-ai/objectstack#5149; these predicates are the
 * half this repo owns, and they must be able to answer.
 *
 * Numeric comparisons carry `!= null` on top of `has(...)`, matching the object
 * files: `has(record.rating) && record.rating != null && record.rating >= 4`.
 * Strict CEL aborts on `dyn<null> < int`, which `has()` alone does not prevent.
 */

/**
 * The duplicate-link block (#598), spread into every form that offers
 * `disqualification_reason`.
 *
 * `duplicate_disqualification_requires_survivor` on `crm_lead` rejects a lead
 * closed as "Duplicate" that does not name the record it duplicates and confirm
 * the match. So the same rule the `disqualification_reason` field itself follows
 * applies one level down: a form that lets a user PICK "Duplicate" must also let
 * them satisfy it, or the save fails with an error the form gives no way to
 * clear. Declared once and reused rather than retyped eight times — the copies
 * would drift, and a form that quietly lost the block is exactly the failure
 * this shape is meant to make impossible.
 *
 * The two lookups mirror the object's `requiredWhen` predicates: each appears
 * only when `duplicate_of_type` names its object — and now says so in the same
 * words, character for character as the `requiredWhen` on those two fields in
 * `lead.object.ts`, so the form shows a lookup exactly when the server will
 * demand it. `test/view-predicate-dialect.test.ts` pins the two together.
 */
const DUPLICATE_LINK_FIELDS = [
  {
    field: 'duplicate_of_type',
    required: true,
    // The picker offers the AUTHORABLE half of the vocabulary only (#1164).
    // `crm_lead.duplicate_of_type` also accepts `erased`, a tombstone
    // `lead_duplicate_check` stamps when the engine's reference cleanup nulls
    // the pointer — "confirmed duplicate of a record that has since been
    // erased". Nobody authors that: it is an observation about a deletion that
    // already happened, and offering it would let a reviewer close a lead as a
    // duplicate of nothing while satisfying every rule that exists to stop
    // exactly that. Narrowing here rather than deleting the value is the point
    // — the record can still SAY it, and the field keeps its label in all four
    // locales, so a tombstoned lead reads as "Erased Record" on the detail page
    // instead of as a raw enum nobody can explain.
    //
    // Spread from `_picklists.ts` rather than retyped: the authorable set is
    // the source both lists derive from, so a future object type added there
    // reaches this picker automatically and the tombstone never can.
    options: [...DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS],
    visibleOn: P`has(record.disqualification_reason) && record.disqualification_reason == "duplicate"`,
  },
  {
    field: 'duplicate_of_lead',
    required: true,
    visibleOn: P`has(record.duplicate_of_type) && record.duplicate_of_type == "crm_lead"`,
  },
  {
    field: 'duplicate_of_contact',
    required: true,
    visibleOn: P`has(record.duplicate_of_type) && record.duplicate_of_type == "crm_contact"`,
  },
  {
    field: 'duplicate_status',
    required: true,
    visibleOn: P`has(record.disqualification_reason) && record.disqualification_reason == "duplicate"`,
    helpText: 'Confirmed means a human checked the two records and they are the same person.',
  },
];

/**
 * Lead Views - Comprehensive UI Showcase
 * 
 * This file demonstrates:
 * 1. All 6 FormView layout types (simple, tabbed, wizard, split, drawer, modal)
 * 2. Section features (collapsible, 1-4 column layouts)
 * 3. Field-level controls (readonly, required, hidden, span, visibleOn, dependsOn, custom widget)
 * 4. Multiple named formViews for different scenarios
 * 5. Various list view types
 */
export const LeadViews = defineView({
  /**
   * Default List View - Grid with Advanced Features
   */
  list: {
    type: 'grid',
    name: 'all_leads',
    label: 'All Leads',
    data: {
      provider: 'object',
      object: 'crm_lead',
    },
    
    // Column Configuration with Enhanced Features
    columns: [
      {
        // One name column, not two. Splitting first/last spent 300px to say
        // what "Alice Martinez" says in one, and hung the record link off the
        // given name alone — so opening a person meant aiming at their first
        // name specifically.
        field: 'full_name',
        label: 'Name',
        width: 200,
        sortable: true,
        link: true, // Primary navigation link
      },
      {
        field: 'company',
        label: 'Company',
        width: 200,
        sortable: true,
      },
      {
        field: 'email',
        label: 'Email',
        width: 200,
      },
      {
        field: 'status',
        label: 'Status',
        width: 120,
        sortable: true,
      },
      {
        field: 'rating',
        label: 'Score',
        width: 100,
        align: 'center',
      },
      {
        field: 'lead_source',
        label: 'Source',
        width: 120,
      },
      {
        field: 'owner_id',
        label: 'Owner',
        width: 150,
      },
    ],
    
    sort: [
      { field: 'created_at', order: 'desc' }
    ],
    
    // Navigation to Form
    navigation: {
      mode: 'page',
      view: 'detail_form', // Use named form view
    },
    
    // `convert_lead` / `schedule_followup` declare `locations: ['list_item']`
    // and are auto-injected into the menu. Do not add strings here: the legacy
    // rowActions surface only dispatches defined stack actions.
    // Built-in `exportOptions` covers CSV export; no export action needed.
    bulkActions: ['create_campaign'],
    
    // Features
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
    rowHeight: 'medium',
    exportOptions: { formats: ['csv', 'xlsx'] },
    
    // Empty State
    emptyState: {
      title: 'No Leads Yet',
      message: 'Get started by creating your first lead',
      icon: 'user-plus',
    },
  },
  
  /**
   * Default Form View - SIMPLE Layout
   * Basic sectioned form with collapsible sections and column layouts
   */
  form: {
    type: 'simple',
    
    sections: [
      {
        name: 'contact_information',
        label: 'Contact Information',
        collapsible: true,
        collapsed: false,
        columns: 2, // 2-column layout
        fields: [
          {
            field: 'salutation',
          },
          {
            field: 'first_name',
            required: true,
          },
          {
            field: 'last_name',
            required: true,
            span: 'full',
          },
          'company',
          'title',
          'email',
          'phone',
          'mobile',
          'website',
        ],
      },
      {
        name: 'lead_classification',
        label: 'Lead Classification',
        collapsible: true,
        collapsed: false,
        columns: 3, // 3-column layout
        fields: [
          {
            field: 'status',
            required: true,
          },
          {
            field: 'rating',
            widget: 'star_rating', // Custom widget
          },
          'lead_source',
          'industry',
          {
            field: 'owner_id',
            required: true,
          },
          // `disqualification_reason` is enforced by the
          // `disqualification_reason_required` validation on crm_lead, so every
          // form that lets a user pick "Unqualified" must also offer the reason
          // — otherwise the save fails with an error the form gives you no way
          // to clear. Hidden until it applies.
          {
            field: 'disqualification_reason',
            required: true,
            visibleOn: P`has(record.status) && record.status == "unqualified"`,
          },
          ...DUPLICATE_LINK_FIELDS,
        ],
      },
      {
        name: 'company_information',
        label: 'Company Information',
        collapsible: true,
        collapsed: true, // Collapsed by default
        columns: 2,
        fields: [
          'annual_revenue',
          'number_of_employees',
        ],
      },
      {
        name: 'address',
        label: 'Address',
        collapsible: true,
        collapsed: true,
        columns: 2,
        // `crm_lead` stores the location in one composite `Field.address`;
        // the discrete street/city/state/postal_code/country columns this
        // section used to list do not exist on the object, so the whole
        // section rendered blank.
        fields: [
          {
            field: 'address',
            span: 'full',
          },
        ],
      },
      {
        name: 'additional_information',
        label: 'Additional Information',
        collapsible: true,
        collapsed: true,
        columns: 1, // Single column for text areas
        fields: [
          'description',
          'notes',
        ],
      },
      {
        name: 'privacy',
        label: 'Privacy',
        collapsible: true,
        collapsed: true,
        columns: 2,
        fields: [
          'do_not_call',
          'email_opt_out',
        ],
      },
    ],
  },
  
  /**
   * Additional Named List Views
   */
  listViews: {
    // Declaration order IS tab order in the console. These three working
    // queues used to sit AFTER the kanban / calendar / gallery views, which
    // pushed all of them into the "3 more" overflow menu — so the one screen
    // a rep opens this list for was the one they had to go hunting for, while
    // three presentation modes held the front row.

    /**
     * My Leads — a rep's own queue, hottest first.
     */
    my_leads: {
      name: 'my_leads',
      type: 'grid',
      label: 'My Leads',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      columns: ['full_name', 'company', 'email', 'status', 'rating'],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [
        { field: 'rating', order: 'desc' },
        { field: 'created_at', order: 'desc' }
      ],
    },

    /**
     * Hot Leads — the working queue for the leads routing declared HOT.
     *
     * "Hot" is defined in exactly ONE place: the `lead_assignment` flow's
     * `check_hot` decision (edge `e2`, `record.rating >= 4`). Crossing that
     * line is what stamps the 1-day follow-up SLA and fires the "Hot lead —
     * assign within 24h" alert at the owner, so this queue must hold precisely
     * the leads that alert is about. (An earlier comment here credited a
     * flagging workflow that has never existed in this repo — dead name
     * removed, the routing flow is the producer.)
     *
     * The cut was `rating >= 4.5` (#766). `rating` is a WHOLE-star field —
     * `lead.hook.ts` rounds its computed score ("round to WHOLE stars"), the
     * `star_rating` widget offers nothing finer, and the one seeded 4.5 was
     * deleted for the same reason (#591) — so `>= 4.5` meant `== 5` on every
     * row that can actually exist. A 4-star lead was routed hot, alerted on,
     * and then missing from the queue its owner was sent to.
     *
     * Sharing the population with "High Priority" is the deliberate cost of
     * having one definition of hot, not an oversight: both views now show
     * rating >= 4, still New or Contacted. What differs is what they are FOR.
     * Hot Leads is the work order — sorted by next-follow-up (the SLA that
     * routing just stamped), with phone, email and owner on the row so it can
     * be dialled top to bottom. High Priority is the scan list — score-tinted
     * rows and lead source, no SLA column, no time ordering. A 5-star-only
     * queue, if it is ever a real need, gets its own view under its own name
     * instead of squatting on "Hot".
     *
     * `test/hot-lead-threshold-parity.test.ts` derives this threshold and the
     * flow's from the metadata and fails if they drift apart again.
     */
    hot_leads: {
      name: 'hot_leads',
      type: 'grid',
      label: '🔥 Hot Leads',
      data: { provider: 'object', object: 'crm_lead' },
      columns: ['full_name', 'company', 'phone', 'email', 'rating', 'next_followup_date', 'owner_id'],
      // Same rating cut as the `lead_assignment` hot branch, scoped to the
      // statuses still worth working. (Operator-only filters; the view runtime
      // does not resolve date template strings.)
      filter: [
        { field: 'rating', operator: 'greater_than_or_equal', value: 4 },
        { field: 'status', operator: 'in', value: ['new', 'contacted'] },
      ],
      sort: [{ field: 'next_followup_date', order: 'asc' }],
    },

    /**
     * High Priority Leads
     */
    high_priority: {
      name: 'high_priority',
      type: 'grid',
      label: 'High Priority',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      columns: ['full_name', 'company', 'email', 'status', 'rating', 'lead_source'],
      filter: [
        { field: 'rating', operator: 'greater_than_or_equal', value: 4 },
        { field: 'status', operator: 'in', value: ['new', 'contacted'] },
      ],
      rowColor: {
        field: 'rating',
        colors: {
          '5': '#00AA00',
          '4': '#FFA500',
        },
      },
    },

    /**
     * Suspected Duplicates — the review queue behind the intake flag (#598).
     *
     * `lead_duplicate_check` marks a re-captured email `suspected` and links it
     * to the record it repeats. Without a place to SEE that set, the flag would
     * be a column nobody reads: the reviewer opens this queue, compares the two
     * records, and either clears the flag or disqualifies the lead as a
     * confirmed duplicate. `confirmed` rows drop out of the queue, so it drains.
     */
    suspected_duplicates: {
      name: 'suspected_duplicates',
      type: 'grid',
      label: 'Suspected Duplicates',
      data: { provider: 'object', object: 'crm_lead' },
      columns: [
        'full_name', 'company', 'email',
        'duplicate_of_type', 'duplicate_of_lead', 'duplicate_of_contact',
        'status', 'owner_id',
      ],
      filter: [
        { field: 'duplicate_status', operator: 'equals', value: 'suspected' },
      ],
      // Oldest suspicion first: an unreviewed duplicate is a second rep working
      // the same person, so the queue is worked front to back.
      sort: [{ field: 'created_at', order: 'asc' }],
      emptyState: {
        title: 'No Suspected Duplicates',
        message: 'Nothing to review — every re-captured email has been checked.',
        icon: 'copy',
      },
    },

    /**
     * Kanban Board View
     */
    kanban_by_status: {
      name: 'kanban_by_status',
      type: 'kanban',
      label: 'Lead Pipeline',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      columns: ['first_name', 'last_name', 'company', 'email'],
      kanban: {
        groupByField: 'status',
        summarizeField: 'annual_revenue',
        columns: ['first_name', 'last_name', 'company', 'rating'],
      },
      navigation: {
        mode: 'drawer', // Open in drawer instead of new page
        width: '600px',
      },
    },
    
    /**
     * Calendar View
     */
    calendar_by_created: {
      name: 'calendar_by_created',
      type: 'calendar',
      label: 'Lead Calendar',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      columns: ['first_name', 'last_name', 'company'],
      calendar: {
        startDateField: 'created_at',
        titleField: 'company',
        colorField: 'status',
      },
    },
    
    /**
     * Gallery/Card View
     */
    gallery_view: {
      name: 'gallery_view',
      type: 'gallery',
      label: 'Lead Cards',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      columns: ['first_name', 'last_name', 'company', 'email', 'status'],
      gallery: {
        cardSize: 'medium',
        titleField: 'company',
        visibleFields: ['first_name', 'last_name', 'email', 'phone', 'status', 'rating'],
      },
    },
    
  },

  /**
   * Additional Named Form Views - Demonstrating All 6 Layout Types
   *
   * One example per layout type. The SIMPLE one is the default `form`
   * above, so this block carries the other five, plus the public and the
   * conditional-visibility examples. Every layout is demonstrated exactly
   * once across the file: each entry below is the only example of its own.
   */
  formViews: {
    /**
     * 2. TABBED Layout
     * Organize complex forms with tabs
     */
    detail_form: {
      type: 'tabbed',
      sections: [
        {
          name: 'general',
          label: 'General',
          columns: 2,
          fields: [
            'salutation',
            'first_name',
            'last_name',
            'company',
            'title',
            'email',
            'phone',
            'mobile',
          ],
        },
        {
          name: 'qualification',
          label: 'Qualification',
          columns: 2,
          fields: [
            { field: 'status', required: true },
            { field: 'rating', widget: 'star_rating' },
            'lead_source',
            'industry',
            'annual_revenue',
            'number_of_employees',
            // See the default form: `unqualified` requires a reason.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: P`has(record.status) && record.status == "unqualified"`,
            },
            ...DUPLICATE_LINK_FIELDS,
          ],
        },
        {
          name: 'address',
          label: 'Address',
          columns: 2,
          // Single composite `Field.address` — see the note on the default
          // form's Address section.
          fields: [
            { field: 'address', span: 'full' },
          ],
        },
        {
          name: 'details',
          label: 'Details',
          columns: 1,
          fields: [
            'description',
            'notes',
            'do_not_call',
            'email_opt_out',
          ],
        },
      ],
    },
    
    /**
     * 3. WIZARD Layout
     * Step-by-step guided process
     */
    lead_conversion_wizard: {
      type: 'wizard',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      sections: [
        {
          name: 'step_1_contact_details',
          label: 'Step 1: Contact Details',
          columns: 2,
          fields: [
            { field: 'first_name', required: true, readonly: true },
            { field: 'last_name', required: true, readonly: true },
            { field: 'email', readonly: true, span: 'full' },
            'phone',
            'mobile',
          ],
        },
        {
          name: 'step_2_company_information',
          label: 'Step 2: Company Information',
          columns: 2,
          fields: [
            { field: 'company', required: true, readonly: true },
            'title',
            'industry',
            'annual_revenue',
            'number_of_employees',
            'website',
          ],
        },
        {
          name: 'step_3_qualification',
          label: 'Step 3: Qualification',
          columns: 2,
          fields: [
            { field: 'status', required: true },
            // See the default form: `unqualified` requires a reason. The status
            // is editable in this step, so the wizard can land there too.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: P`has(record.status) && record.status == "unqualified"`,
            },
            ...DUPLICATE_LINK_FIELDS,
            { field: 'rating', widget: 'star_rating' },
            'lead_source',
            {
              field: 'owner_id',
              // Conditional visibility. `!= null` on top of `has(...)`: strict
              // CEL aborts on `dyn<null> < int`, which `has()` alone allows.
              visibleOn: P`has(record.rating) && record.rating != null && record.rating >= 4`,
            },
          ],
        },
        {
          name: 'step_4_review_and_convert',
          label: 'Step 4: Review & Convert',
          columns: 1,
          fields: [
            {
              field: 'description',
              helpText: 'Review all information before converting to Account and Contact',
            },
          ],
        },
      ],
    },
    
    /**
     * 4. SPLIT Layout
     * Master-detail split view
     */
    split_edit: {
      type: 'split',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      sections: [
        {
          name: 'primary_information',
          label: 'Primary Information',
          columns: 1,
          fields: [
            'first_name',
            'last_name',
            'company',
            'email',
            { field: 'status', required: true },
            'owner_id',
            // See the default form: `unqualified` requires a reason.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: P`has(record.status) && record.status == "unqualified"`,
            },
            ...DUPLICATE_LINK_FIELDS,
          ],
        },
        {
          name: 'extended_details',
          label: 'Extended Details',
          columns: 2,
          fields: [
            'phone',
            'mobile',
            'title',
            'industry',
            'lead_source',
            { field: 'rating', widget: 'star_rating' },
            'annual_revenue',
            'number_of_employees',
          ],
        },
      ],
    },
    
    /**
     * 5. DRAWER Layout
     * Side panel form (typically opened from list view)
     */
    quick_edit_drawer: {
      type: 'drawer',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      sections: [
        {
          name: 'quick_edit',
          label: 'Quick Edit',
          columns: 1, // Drawers typically use single column
          fields: [
            { field: 'first_name', required: true },
            { field: 'last_name', required: true },
            'company',
            'email',
            'phone',
            { field: 'status', required: true },
            { field: 'rating', widget: 'star_rating' },
            'lead_source',
            {
              field: 'owner_id',
              // Only show owner after initial contact. A record with no status
              // yet has not been contacted, so `!isBlank` keeps the blank case
              // on the "hidden" side rather than letting `null != "new"` show it.
              visibleOn: P`has(record.status) && !isBlank(record.status) && record.status != "new"`,
            },
            // See the default form: `unqualified` requires a reason.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: P`has(record.status) && record.status == "unqualified"`,
            },
            ...DUPLICATE_LINK_FIELDS,
          ],
        },
      ],
    },
    
    /**
     * 6. MODAL Layout
     * Dialog-based form for quick actions
     */
    status_update_modal: {
      type: 'modal',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      sections: [
        {
          name: 'update_lead_status',
          label: 'Update Lead Status',
          columns: 1,
          fields: [
            { field: 'first_name', readonly: true },
            { field: 'last_name', readonly: true },
            { field: 'company', readonly: true },
            { 
              field: 'status', 
              required: true,
              helpText: 'Select the new status for this lead',
            },
            {
              field: 'rating',
              widget: 'star_rating',
              // Only show rating for qualified leads
              visibleOn: P`has(record.status) && record.status == "qualified"`,
            },
            // The reason picklist, not just free-text notes: it is what the
            // `disqualification_reason_required` validation checks, and this
            // modal is the main place a rep flips a lead to Unqualified.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: P`has(record.status) && record.status == "unqualified"`,
            },
            ...DUPLICATE_LINK_FIELDS,
            {
              field: 'notes',
              placeholder: 'Add notes about this status change',
              // Free-text context alongside the reason
              visibleOn: P`has(record.status) && record.status == "unqualified"`,
            },
          ],
        },
      ],
    },
    
    /**
     * 7. PUBLIC / ANONYMOUS — "Web-to-Lead"
     *
     * Airtable-style public form hosted at `/forms/contact-us`. Embeddable
     * via iframe on a marketing site. Guests can ONLY submit (insert) — the
     * `guest_portal` profile denies read/edit/delete on `crm_lead`.
     *
     * Fields not on the form (status, lead_source, owner_id, rating) are stamped
     * by the `lead_automation` hook in `lead.hook.ts` after a guest submission.
     */
    web_to_lead: {
      type: 'simple',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      sections: [
        {
          name: 'tell_us_about_yourself',
          label: 'Tell us about yourself',
          columns: 2,
          fields: [
            { field: 'first_name', required: true },
            { field: 'last_name',  required: true },
            { field: 'email',      required: true, span: 'full' },
            'phone',
            'title',
          ],
        },
        {
          name: 'about_your_company',
          label: 'About your company',
          columns: 2,
          fields: [
            { field: 'company', required: true, span: 'full' },
            'website',
            'industry',
            'number_of_employees',
            'annual_revenue',
          ],
        },
        {
          name: 'how_can_we_help',
          label: 'How can we help?',
          columns: 1,
          fields: [
            {
              field: 'description',
              required: true,
              placeholder: 'Briefly describe what you are looking for...',
              helpText: 'A sales representative will get back to you within one business day.',
            },
          ],
        },
      ],
      sharing: {
        enabled: true,
        allowAnonymous: true,
        publicLink: '/forms/contact-us',
      },
    },

    /**
     * Advanced Example: Conditional Field Visibility & Dependencies
     */
    advanced_conditional: {
      type: 'simple',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      sections: [
        {
          name: 'lead_information',
          label: 'Lead Information',
          columns: 2,
          fields: [
            'first_name',
            'last_name',
            'company',
            'email',
            'status',
            'lead_source',
            {
              field: 'rating',
              widget: 'star_rating',
              // Only show after first contact — see the drawer form's note on
              // why blank stays on the "hidden" side.
              visibleOn: P`has(record.status) && !isBlank(record.status) && record.status != "new"`,
            },
            {
              field: 'industry',
              dependsOn: 'company', // Industry options depend on company
            },
            {
              field: 'annual_revenue',
              // Only for qualified leads
              visibleOn: P`has(record.rating) && record.rating != null && record.rating >= 3`,
            },
            {
              field: 'number_of_employees',
              visibleOn: P`has(record.rating) && record.rating != null && record.rating >= 3`,
            },
            {
              field: 'owner_id',
              required: true,
              visibleOn: P`has(record.status) && (record.status == "contacted" || record.status == "qualified")`,
            },
            // See the default form: `unqualified` requires a reason.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: P`has(record.status) && record.status == "unqualified"`,
            },
            ...DUPLICATE_LINK_FIELDS,
            {
              field: 'notes',
              span: 'full',
              required: true,
              // Require explanation for unqualified
              visibleOn: P`has(record.status) && record.status == "unqualified"`,
            },
          ],
        },
        {
          name: 'address_information',
          label: 'Address Information',
          collapsible: true,
          collapsed: true,
          columns: 2,
          // Single composite `Field.address` — the discrete street/city/state/
          // postal_code/country columns do not exist on crm_lead.
          fields: [
            { field: 'address', span: 'full' },
          ],
        },
        {
          name: 'privacy_preferences',
          label: 'Privacy Preferences',
          collapsible: true,
          collapsed: true,
          columns: 2,
          fields: [
            {
              field: 'do_not_call',
              helpText: 'Check if this lead has requested not to be called',
            },
            {
              field: 'email_opt_out',
              helpText: 'Check if this lead has opted out of email communications',
            },
          ],
        },
      ],
    },
  },
});
