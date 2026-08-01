import { P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Lead Views - Comprehensive UI Showcase
 * 
 * This file demonstrates:
 * 1. All 6 FormView layout types (simple, tabbed, wizard, split, drawer, modal)
 * 2. Section features (collapsible, 1-4 column layouts)
 * 3. Field-level controls (readonly, required, hidden, colSpan, visibleOn, dependsOn, custom widget)
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
        field: 'owner',
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
    exportOptions: ['csv', 'xlsx'],
    
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
        label: 'Contact Information',
        collapsible: true,
        collapsed: false,
        columns: 2, // 2-column layout
        fields: [
          {
            field: 'salutation',
            colSpan: 1,
          },
          {
            field: 'first_name',
            required: true,
            colSpan: 1,
          },
          {
            field: 'last_name',
            required: true,
            colSpan: 2, // Span both columns
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
            field: 'owner',
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
            visibleOn: 'status == "unqualified"',
          },
        ],
      },
      {
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
            colSpan: 2,
          },
        ],
      },
      {
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
        { field: 'owner', operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [
        { field: 'rating', order: 'desc' },
        { field: 'created_at', order: 'desc' }
      ],
    },

    /**
     * Hot Leads — Ready for immediate follow-up
     * (Set by the auto_flag_hot_lead workflow)
     */
    hot_leads: {
      name: 'hot_leads',
      type: 'grid',
      label: '🔥 Hot Leads',
      data: { provider: 'object', object: 'crm_lead' },
      columns: ['full_name', 'company', 'phone', 'email', 'rating', 'next_followup_date', 'owner'],
      // The HOTTEST actionable subset (rating >= 4.5) — a tighter cut than the
      // "High Priority" view (rating >= 4) so the two are not duplicates. Hot
      // Leads is what a rep works first; sort by next-follow-up so the most
      // time-sensitive surface on top. (Operator-only filters; the view runtime
      // does not resolve date template strings.)
      filter: [
        { field: 'rating', operator: 'greater_than_or_equal', value: 4.5 },
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
   */
  formViews: {
    /**
     * 1. SIMPLE Layout (already shown as default form above)
     * Basic sectioned form
     */
    quick_create: {
      type: 'simple',
      data: {
        provider: 'object',
        object: 'crm_lead',
      },
      sections: [
        {
          // Neutral label — this form backs BOTH the create and edit dialogs,
          // so "Quick Lead Creation" read wrong when editing.
          label: 'Lead Details',
          columns: 2,
          fields: [
            { field: 'first_name', required: true },
            { field: 'last_name', required: true },
            { field: 'company', required: true, colSpan: 2 },
            { field: 'email', required: true },
            'phone',
            'status',
            // Source at intake — attribution is unrecoverable if not captured
            // when the lead is keyed in.
            'lead_source',
            'owner',
            // See the default form: `unqualified` requires a reason, so the
            // reason must be reachable wherever the status can be set.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: 'status == "unqualified"',
            },
          ],
        },
      ],
    },
    
    /**
     * 2. TABBED Layout
     * Organize complex forms with tabs
     */
    detail_form: {
      type: 'tabbed',
      sections: [
        {
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
              visibleOn: 'status == "unqualified"',
            },
          ],
        },
        {
          label: 'Address',
          columns: 2,
          // Single composite `Field.address` — see the note on the default
          // form's Address section.
          fields: [
            { field: 'address', colSpan: 2 },
          ],
        },
        {
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
          label: 'Step 1: Contact Details',
          columns: 2,
          fields: [
            { field: 'first_name', required: true, readonly: true },
            { field: 'last_name', required: true, readonly: true },
            { field: 'email', readonly: true, colSpan: 2 },
            'phone',
            'mobile',
          ],
        },
        {
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
          label: 'Step 3: Qualification',
          columns: 2,
          fields: [
            { field: 'status', required: true },
            // See the default form: `unqualified` requires a reason. The status
            // is editable in this step, so the wizard can land there too.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: 'status == "unqualified"',
            },
            { field: 'rating', widget: 'star_rating' },
            'lead_source',
            {
              field: 'owner',
              visibleOn: 'rating >= 4', // Conditional visibility
            },
          ],
        },
        {
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
          label: 'Primary Information',
          columns: 1,
          fields: [
            'first_name',
            'last_name',
            'company',
            'email',
            { field: 'status', required: true },
            'owner',
            // See the default form: `unqualified` requires a reason.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: 'status == "unqualified"',
            },
          ],
        },
        {
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
              field: 'owner',
              visibleOn: 'status != "new"', // Only show owner after initial contact
            },
            // See the default form: `unqualified` requires a reason.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: 'status == "unqualified"',
            },
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
              visibleOn: 'status == "qualified"', // Only show rating for qualified leads
            },
            // The reason picklist, not just free-text notes: it is what the
            // `disqualification_reason_required` validation checks, and this
            // modal is the main place a rep flips a lead to Unqualified.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: 'status == "unqualified"',
            },
            {
              field: 'notes',
              placeholder: 'Add notes about this status change',
              visibleOn: 'status == "unqualified"', // Free-text context alongside the reason
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
     * Fields not on the form (status, lead_source, owner, rating) are stamped
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
          label: 'Tell us about yourself',
          columns: 2,
          fields: [
            { field: 'first_name', required: true },
            { field: 'last_name',  required: true },
            { field: 'email',      required: true, colSpan: 2 },
            'phone',
            'title',
          ],
        },
        {
          label: 'About your company',
          columns: 2,
          fields: [
            { field: 'company', required: true, colSpan: 2 },
            'website',
            'industry',
            'number_of_employees',
            'annual_revenue',
          ],
        },
        {
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
              visibleOn: 'status != "new"', // Only show after first contact
            },
            {
              field: 'industry',
              dependsOn: 'company', // Industry options depend on company
            },
            {
              field: 'annual_revenue',
              visibleOn: 'rating >= 3', // Only for qualified leads
            },
            {
              field: 'number_of_employees',
              visibleOn: P`record.rating >= 3`,
            },
            {
              field: 'owner',
              required: true,
              visibleOn: P`record.status == "contacted" || record.status == "qualified"`,
            },
            // See the default form: `unqualified` requires a reason.
            {
              field: 'disqualification_reason',
              required: true,
              visibleOn: 'status == "unqualified"',
            },
            {
              field: 'notes',
              colSpan: 2,
              required: true,
              visibleOn: 'status == "unqualified"', // Require explanation for unqualified
            },
          ],
        },
        {
          label: 'Address Information',
          collapsible: true,
          collapsed: true,
          columns: 2,
          // Single composite `Field.address` — the discrete street/city/state/
          // postal_code/country columns do not exist on crm_lead.
          fields: [
            { field: 'address', colSpan: 2 },
          ],
        },
        {
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
