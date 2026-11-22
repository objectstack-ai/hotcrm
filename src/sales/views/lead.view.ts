// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Lead Views
 *
 * The default list and its named list views, and the public Web-to-Lead
 * form. There is no internal record form: the New and Edit dialogs draw the
 * object's `fieldGroups` (#2739).
 */
export const LeadViews = defineView({
  /**
   * Default List View - Grid with Advanced Features
   */
  list: {
    type: 'grid',
    name: 'all_leads',
    label: 'All Leads',
    userActions: { editInline: true, hideFields: true },
    data: {
      provider: 'object',
      object: 'crm_lead',
    },
    
    // Column Configuration with Enhanced Features.
    //
    // No column carries its own `label:`. Without one the header is the
    // field's label, which all four locale packs translate. With one, the
    // string is served verbatim in every locale: the translation schema has no
    // per-column key, so it left this whole header row English in zh-CN
    // (#2094). A wording the field label cannot carry is a platform gap.
    columns: [
      {
        // One name column, not two. Splitting first/last spent 300px to say
        // what "Alice Martinez" says in one, and hung the record link off the
        // given name alone — so opening a person meant aiming at their first
        // name specifically.
        field: 'full_name',
        width: 200,
        sortable: true,
        link: true, // Primary navigation link
      },
      {
        field: 'company',
        width: 200,
        sortable: true,
      },
      {
        field: 'email',
        width: 200,
      },
      {
        field: 'status',
        width: 120,
        sortable: true,
      },
      {
        field: 'rating',
        width: 100,
        align: 'center',
      },
      {
        field: 'lead_source',
        width: 120,
      },
      // REQ-0005 acceptance 1: what the prospect wants and what it is worth,
      // on the roster a rep opens every morning. Columns are also what the
      // list's own filter and grouping controls offer, which is what makes the
      // two FILTERABLE and GROUPABLE here rather than only readable — the same
      // reading `contact.view.ts` records for the buying-centre columns.
      // `need_type` is single-valued for exactly that reason (see the field in
      // `lead.object.ts`): a grouped list answers with one aggregate per raw
      // stored value, so a multi-valued column would group by the combination.
      {
        field: 'need_type',
        width: 160,
        sortable: true,
      },
      {
        field: 'estimated_amount',
        width: 130,
        align: 'right',
        sortable: true,
      },
      {
        field: 'owner_id',
        width: 150,
      },
    ],
    
    sort: [
      { field: 'created_at', order: 'desc' }
    ],
    
    // A row click opens the record page. There is deliberately no
    // `navigation.view` here: measured in the browser on console 17.3.0
    // (#1716), the key is not resolved as a form-view name. The navigation
    // hook reads it into the SECOND argument of `onNavigate` — the slot that
    // otherwise carries the literal mode string, `r(t, d ?? 'view')` — so it
    // named nothing and selected nothing. The record page here is rendered by
    // `lead_detail_page` (`src/sales/pages/lead_detail.page.ts`), not by a named
    // form view, and clicking a row behaved identically with the key present,
    // with it absent, and on a list that never declared it.
    navigation: {
      mode: 'page',
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
      userActions: { editInline: true, hideFields: true },
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
     * follow up within 24h" alert at the owner, so this queue must hold precisely
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
     * be dialled top to bottom. High Priority is the scan list — rating and
     * lead source on the row, no SLA column, no time ordering. A 5-star-only
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
      userActions: { editInline: true, hideFields: true },
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
      userActions: { editInline: true, hideFields: true },
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      columns: ['full_name', 'company', 'email', 'status', 'rating', 'lead_source'],
      filter: [
        { field: 'rating', operator: 'greater_than_or_equal', value: 4 },
        { field: 'status', operator: 'in', value: ['new', 'contacted'] },
      ],
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
      userActions: { editInline: true, hideFields: true },
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
     * Kanban Board View — a card is titled by the person (`full_name`) and
     * carries the business fields below it. Name fragments stay off the card
     * body: without a `titleField` the first card field became the title and
     * the name was printed twice, split over two lines (#2122).
     */
    kanban_by_status: {
      name: 'kanban_by_status',
      type: 'kanban',
      label: 'Lead Pipeline',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      columns: ['full_name', 'company', 'email'],
      kanban: {
        groupByField: 'status',
        summarizeField: 'annual_revenue',
        titleField: 'full_name',
        columns: ['company', 'email', 'rating'],
      },
      navigation: {
        mode: 'drawer', // Open in drawer instead of new page
        width: '600px',
      },
    },
    
    /**
     * Calendar View — leads on the day of their next follow-up, the date a
     * seller plans by. Keyed on `created_at` it put every seeded lead on the
     * day of the boot (#2122). The name keeps its `_by_created` spelling: it
     * is the key the four locale packs and any saved reference address, and
     * the label a user reads names no date.
     */
    calendar_by_created: {
      name: 'calendar_by_created',
      type: 'calendar',
      label: 'Lead Calendar',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      // The name as one field (#2685), as every other lead list writes it.
      columns: ['full_name', 'company'],
      calendar: {
        startDateField: 'next_followup_date',
        titleField: 'company',
        colorField: 'status',
      },
    },
    
    /**
     * Gallery/Card View — one card per person: titled by `full_name`, the
     * company first beneath it (#2122).
     */
    gallery_view: {
      name: 'gallery_view',
      type: 'gallery',
      label: 'Lead Cards',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      columns: ['full_name', 'company', 'email', 'status'],
      gallery: {
        cardSize: 'medium',
        titleField: 'full_name',
        visibleFields: ['company', 'title', 'email', 'phone', 'status', 'rating'],
      },
    },
    
  },

  /**
   * Named form views: the public Web-to-Lead form only.
   *
   * The record dialogs (New and Edit) open no authored form (#2739): the
   * console resolves `formViews['crm_lead.create']` in create mode, then
   * `form`, then `formViews.default`, and finding none it draws the object's
   * `fieldGroups`. A named entry under any other key reaches no record dialog;
   * `web_to_lead` stays because its `sharing.publicLink` serves it.
   */
  formViews: {
    /**
     * PUBLIC / ANONYMOUS — "Web-to-Lead"
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
      // The heading a visitor reads (#2284). Translated under
      // `objects.crm_lead._views.web_to_lead.title`, which `GET /forms/:slug`
      // serves in the visitor's language; a form with no authored title has
      // nothing to translate, so it showed English or the object name.
      title: 'Contact Us',
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
  },
});
