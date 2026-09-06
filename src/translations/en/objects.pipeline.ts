// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * English (en) — `objects` translations for the PIPELINE family:
 * demand and the deals it becomes, plus the roll-up that forecasts them.
 *
 * Roster: `crm_lead`, `crm_opportunity`, `crm_opportunity_line_item`, `crm_forecast`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/en.ts`.
 */
export const pipeline: Record<string, ObjectTranslationData> = {
  crm_lead: {
    label: 'Lead',
    pluralLabel: 'Leads',
    fields: {
      first_name: { label: 'First Name' },
      last_name: { label: 'Last Name' },
      company: { label: 'Company' },
      title: { label: 'Title' },
      email: { label: 'Email' },
      phone: { label: 'Phone' },
      status: {
        label: 'Status',
        options: {
          new: 'New', contacted: 'Contacted', qualified: 'Qualified',
          unqualified: 'Unqualified', converted: 'Converted',
        },
      },
      lead_source: {
        label: 'Lead Source',
        options: {
          web: 'Web', referral: 'Referral', event: 'Event / Trade Show',
          webinar: 'Webinar', partner: 'Partner', advertisement: 'Advertisement',
          paid_search: 'Paid Search', social: 'Social Media', content: 'Content / Blog',
          cold_call: 'Cold Call', email_campaign: 'Email Campaign', other: 'Other',
        },
      },
      owner_id: { label: 'Lead Owner' },
      is_converted: { label: 'Converted' },
      description: { label: 'Description' },
      salutation: {
        label: 'Salutation',
        options: { mr: 'Mr.', ms: 'Ms.', mrs: 'Mrs.', dr: 'Dr.', prof: 'Prof.' },
      },
      full_name: { label: 'Full Name' },
      industry: {
        label: 'Industry',
        options: {
          technology: 'Technology', software: 'Software / SaaS', finance: 'Finance',
          healthcare: 'Healthcare', retail: 'Retail', manufacturing: 'Manufacturing',
          education: 'Education', real_estate: 'Real Estate', media: 'Media & Entertainment',
          logistics: 'Logistics', hospitality: 'Hospitality', energy: 'Energy & Utilities',
          government: 'Government', nonprofit: 'Non-profit', other: 'Other',
        },
      },
      mobile: { label: 'Mobile' },
      website: { label: 'Website' },
      rating: { label: 'Lead Score', help: 'Lead quality score (1-5 stars)' },
      converted_account: { label: 'Converted Account' },
      converted_contact: { label: 'Converted Contact' },
      converted_opportunity: { label: 'Converted Opportunity' },
      converted_date: { label: 'Converted Date' },
      address: { label: 'Address' },
      annual_revenue: { label: 'Annual Revenue' },
      number_of_employees: { label: 'Number of Employees' },
      notes: { label: 'Notes', help: 'Working notes on this lead — supports formatting.' },
      do_not_call: { label: 'Do Not Call' },
      email_opt_out: { label: 'Email Opt Out' },
      disqualification_reason: {
        label: 'Disqualification Reason',
        help: 'Required when status is Unqualified',
        options: {
          not_a_fit: 'Not a Fit', no_budget: 'No Budget', wrong_persona: 'Wrong Persona',
          unreachable: 'Unreachable', duplicate: 'Duplicate', competitor: 'Competitor',
          other: 'Other',
        },
      },
      duplicate_of_type: {
        label: 'Duplicate Of',
        help: 'Which object holds the surviving record this lead repeats.',
        // `erased` is a tombstone, not a choice: the form does not offer it
        // (see `src/views/lead.view.ts`), but a lead whose survivor was
        // deleted carries it, so it needs a label wherever the record is
        // READ — detail page, list column, export. Untranslated it would
        // render as the raw `erased`.
        options: { crm_lead: 'Lead', crm_contact: 'Contact', erased: 'Erased Record' },
      },
      duplicate_of_lead: { label: 'Duplicate Of Lead' },
      duplicate_of_contact: { label: 'Duplicate Of Contact' },
      duplicate_status: {
        label: 'Duplicate Status',
        help: 'Suspected = flagged automatically at intake. Confirmed = a human verified the match.',
        options: { suspected: 'Suspected', confirmed: 'Confirmed' },
      },
      display_title: { label: 'Display Title' },
      company_normalized: {
        label: 'Company (Normalized)',
        help: 'Match key for lead conversion: Company lower-cased, trimmed, with internal whitespace collapsed. Maintained by the lead_duplicate_check hook — never edit directly.',
      },
      next_followup_date: { label: 'Next Follow-up Date' },
      last_contacted_date: { label: 'Last Contacted' },
    },
    _views: {
      all_leads: {
        label: 'All Leads',
        emptyState: { title: 'No Leads Yet', message: 'Get started by creating your first lead' },
      },
      kanban_by_status: { label: 'Lead Pipeline' },
      calendar_by_created: { label: 'Lead Calendar' },
      gallery_view: { label: 'Lead Cards' },
      my_leads: { label: 'My Leads' },
      high_priority: { label: 'High Priority' },
      hot_leads: { label: '🔥 Hot Leads' },
      suspected_duplicates: {
        label: 'Suspected Duplicates',
        emptyState: {
          title: 'No Suspected Duplicates',
          message: 'Nothing to review — every re-captured email has been checked.',
        },
      },
    },
    _sections: {
      identity: { label: 'Identity' },
      company_info: { label: 'Company Information' },
      contact_info: { label: 'Contact Information' },
      qualification: { label: 'Qualification' },
      assignment: { label: 'Assignment' },
      address: { label: 'Address' },
      additional: { label: 'Additional Info' },
      preferences: { label: 'Communication Preferences' },
      conversion: { label: 'Conversion' },
      duplicates: { label: 'Duplicate Management' },
      // Detail-page sections (src/pages/lead_detail.page.ts)
      info: { label: 'Lead Information' },
      crm_contact: { label: 'Contact' },
      detail: { label: 'Lead Detail' },
      description: { label: 'Description' },
      // Form section names on lead.view.ts (#1100) — the default form and
      // its six named formViews. `address` / `qualification` above are
      // reused (identical fieldGroup wording); every other name here is new.
      contact_information: { label: 'Contact Information' },
      lead_classification: { label: 'Lead Classification' },
      company_information: { label: 'Company Information' },
      additional_information: { label: 'Additional Information' },
      privacy: { label: 'Privacy' },
      lead_details: { label: 'Lead Details' },
      general: { label: 'General' },
      details: { label: 'Details' },
      step_1_contact_details: { label: 'Step 1: Contact Details' },
      step_2_company_information: { label: 'Step 2: Company Information' },
      step_3_qualification: { label: 'Step 3: Qualification' },
      step_4_review_and_convert: { label: 'Step 4: Review & Convert' },
      primary_information: { label: 'Primary Information' },
      extended_details: { label: 'Extended Details' },
      quick_edit: { label: 'Quick Edit' },
      update_lead_status: { label: 'Update Lead Status' },
      tell_us_about_yourself: { label: 'Tell us about yourself' },
      about_your_company: { label: 'About your company' },
      how_can_we_help: { label: 'How can we help?' },
      lead_information: { label: 'Lead Information' },
      address_information: { label: 'Address Information' },
      privacy_preferences: { label: 'Privacy Preferences' },
    },
    _actions: {
      ...activityActions,
      convert_lead: {
        label: 'Convert Lead',
        successMessage: 'Lead converted successfully!',
      },
      create_campaign: {
        label: 'Add to Campaign',
        successMessage: 'Leads added to campaign!',
        params: {
          crm_campaign: { label: 'Campaign' },
        },
      },
      schedule_followup: {
        label: 'Schedule Follow-up',
        successMessage: 'Follow-up scheduled.',
      },
    },
  },
  crm_opportunity: {
    label: 'Opportunity',
    pluralLabel: 'Opportunities',
    fields: {
      name: { label: 'Opportunity Name' },
      crm_account: { label: 'Account' },
      primary_contact: { label: 'Primary Contact' },
      owner_id: { label: 'Opportunity Owner' },
      amount: { label: 'Amount' },
      expected_revenue: { label: 'Expected Revenue' },
      stage: {
        label: 'Stage',
        options: {
          prospecting: 'Prospecting', qualification: 'Qualification',
          needs_analysis: 'Needs Analysis', proposal: 'Proposal',
          negotiation: 'Negotiation', closed_won: 'Closed Won', closed_lost: 'Closed Lost',
        },
      },
      probability: { label: 'Probability (%)' },
      close_date: { label: 'Close Date' },
      type: {
        label: 'Type',
        options: {
          new_business: 'New Business',
          existing_upgrade: 'Existing Customer - Upgrade',
          existing_renewal: 'Existing Customer - Renewal',
          existing_expansion: 'Existing Customer - Expansion',
        },
      },
      forecast_category: {
        label: 'Forecast Category',
        options: {
          pipeline: 'Pipeline', best_case: 'Best Case',
          commit: 'Commit', omitted: 'Omitted', closed: 'Closed',
        },
      },
      description: { label: 'Description' },
      next_step: { label: 'Next Step' },
      lead_source: {
        label: 'Lead Source',
        options: {
          web: 'Web', referral: 'Referral', event: 'Event / Trade Show',
          webinar: 'Webinar', partner: 'Partner', advertisement: 'Advertisement',
          paid_search: 'Paid Search', social: 'Social Media', content: 'Content / Blog',
          cold_call: 'Cold Call', email_campaign: 'Email Campaign', other: 'Other',
        },
      },
      crm_campaign: { label: 'Campaign', help: 'Marketing campaign that generated this opportunity' },
      days_in_stage: { label: 'Days in Current Stage' },
      stage_entry_date: {
        label: 'Stage Entry Date',
        help: 'Date this opportunity entered its current stage.',
      },
      is_private: { label: 'Private' },
      approval_status: {
        label: 'Approval Status',
        options: { not_required: 'Not Required', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
      },
      approved_date: { label: 'Approved Date' },
      win_reason: {
        label: 'Win Reason',
        help: 'Why this deal was won. Required to close an opportunity as Won.',
        options: {
          better_product: 'Better Product', better_price: 'Better Price', relationship: 'Existing Relationship',
          better_support: 'Better Support', best_fit: 'Best Fit / Features',
          quote_accepted: 'Quote Accepted', other: 'Other',
        },
      },
      loss_reason: {
        label: 'Loss Reason',
        help: 'Why this deal was lost. Required to close an opportunity as Lost.',
        options: {
          price: 'Price Too High', competitor: 'Lost to Competitor', no_budget: 'No Budget',
          no_decision: 'No Decision', timing: 'Bad Timing', features: 'Missing Features', other: 'Other',
        },
      },
      loss_details: {
        label: 'Loss/Win Details',
        help: 'Free-text context behind the win or loss reason.',
      },
    },
    _views: {
      open_opportunities: { label: 'Open Deals' },
      all_opportunities: { label: 'All Opportunities' },
      pipeline_kanban: { label: 'Sales Pipeline' },
      close_date_calendar: { label: 'Forecast Calendar' },
      deal_timeline: { label: 'Deal Timeline' },
      deal_gallery: { label: 'Deal Cards' },
      my_open_deals: { label: 'My Open Deals' },
      stale_opportunities: { label: '⚠️ Stale Opportunities · Longest in Stage First' },
      closing_this_quarter: {
        label: 'Closing This Quarter',
        emptyState: {
          title: 'No Deals Closing This Quarter',
          message: 'This tab lists open commit and best-case deals with a close date inside the current quarter. Nothing matches right now — deals closing later are on the Open Deals tab.',
        },
      },
    },
    _sections: {
      basic: { label: 'Basic Information' },
      financials: { label: 'Financials' },
      sales_process: { label: 'Sales Process' },
      classification: { label: 'Classification' },
      campaign: { label: 'Campaigns' },
      notes: { label: 'Notes & Next Steps' },
      crm_forecast: { label: 'Forecast & Metrics' },
      // Detail-page sections (src/pages/opportunity_detail.page.ts)
      info: { label: 'Opportunity Information' },
      description: { label: 'Description' },
      // Form section names on opportunity.view.ts (#1100)
      overview: { label: 'Overview' },
      forecast: { label: 'Forecast' },
      sales_strategy: { label: 'Sales Strategy' },
      win_loss: { label: 'Win / Loss' },
    },
    _actions: {
      ...activityActions,
      clone_opportunity: {
        label: 'Clone Opportunity',
        successMessage: 'Opportunity cloned successfully!',
      },
      mass_update_stage: {
        label: 'Update Stage',
        successMessage: 'Opportunities updated successfully!',
        params: {
          stage: { label: 'New Stage' },
        },
      },
      generate_quote: {
        label: 'Generate Quote',
        successMessage: 'Quote created from opportunity!',
      },
    },
  },
  crm_opportunity_line_item: {
    label: 'Opportunity Line Item',
    pluralLabel: 'Opportunity Line Items',
    description: 'Per-product pricing lines under an opportunity',
    fields: {
      crm_opportunity: { label: 'Opportunity' },
      crm_product: { label: 'Product' },
      description: { label: 'Description' },
      quantity: { label: 'Quantity' },
      list_price: { label: 'List Price', help: "Auto-populated from the product's List Price." },
      unit_price: {
        label: 'Sales Price',
        help: 'Negotiated unit price (may differ from list price)',
      },
      discount: { label: 'Discount %' },
      total_price: { label: 'Total' },
      line_number: { label: 'Line #' },
    },
    _sections: {
      basic: { label: 'Line Item' },
      pricing: { label: 'Pricing' },
    },
  },
  crm_forecast: {
    label: 'Forecast',
    pluralLabel: 'Forecasts',
    description: 'Periodic pipeline snapshot by owner used for revenue forecasting',
    fields: {
      owner_id: { label: 'Owner' },
      period: { label: 'Period', options: { month: 'Month', quarter: 'Quarter' } },
      period_start: {
        label: 'Period Start',
        help: 'Must be the first day of the period — e.g. 2026-08-01 for Aug 2026. A quarterly forecast must additionally start on a quarter boundary: January 1, April 1, July 1 or October 1.',
      },
      period_end: {
        label: 'Period End',
        help: 'Normally derived automatically from Period and Period Start. If set by hand, it must be the last day of that period — e.g. 2026-09-30 for a quarter starting 2026-07-01, or 2026-08-31 for Aug 2026.',
      },
      period_label: { label: 'Period', help: 'Human-friendly label, e.g. "Q3 2026" or "Aug 2026".' },
      snapshot_date: { label: 'Snapshot Date', help: 'The day this snapshot was captured.' },
      source: {
        label: 'Source',
        options: { scheduled: 'Scheduled snapshot', ai: 'AI skill', manual: 'Manual entry' },
      },
      quota: { label: 'Quota' },
      pipeline_amount: {
        label: 'Pipeline',
        help: 'Sum of all open opportunities closing in this period (any stage).',
      },
      best_case_amount: {
        label: 'Best Case',
        help: 'Open opportunities in the Best Case or Commit forecast category.',
      },
      commit_amount: {
        label: 'Commit',
        help: 'Open opportunities in the Commit forecast category (owner-committed).',
      },
      closed_amount: { label: 'Closed Won', help: 'Already-closed-won amount in this period.' },
      expected_amount: {
        label: 'Expected',
        help: 'Closed Won + Commit — what the owner reasonably expects to land.',
      },
      attainment_pct: { label: 'Attainment %', help: 'Closed Won ÷ Quota × 100. Reads 0% until a positive quota is set.' },
      coverage_ratio: {
        label: 'Coverage',
        help: 'Pipeline ÷ (Quota − Closed Won) — whether enough pipeline remains to cover the gap. Reads 0 once the quota is already met.',
      },
      notes: { label: 'Notes' },
      display_title: { label: 'Display Title' },
      seed_key: {
        label: 'Seed Key',
        help: 'Demo-fixture identity. Written only by the seed loader; empty on every real snapshot.',
      },
    },
    _views: {
      all_forecasts: { label: 'All Forecasts' },
      this_quarter_forecasts: {
        label: 'This Quarter',
        emptyState: {
          title: 'This Quarter Has No Snapshots Yet',
          message: 'Quarterly snapshots are written by the nightly forecast sweep. Until it has run once for the current quarter this view is empty — settled quarters are on the All tab.',
        },
      },
      my_forecast: { label: 'My Forecast' },
    },
    _sections: {
      basic: { label: 'Snapshot' },
      amounts: { label: 'Amounts' },
      meta: { label: 'Source' },
      // Form section names on forecast.view.ts (#1100). `basic`'s label
      // matches "Snapshot" but its key does not, so this form section
      // needs its own entry; `notes` has no fieldGroup counterpart at all.
      snapshot: { label: 'Snapshot' },
      notes: { label: 'Notes' },
    },
  },
};
