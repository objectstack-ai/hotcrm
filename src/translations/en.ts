// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — CRM App Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 */
/**
 * The activity family (#592) — `log_call`, `log_meeting` and
 * `schedule_meeting` are registered once PER OBJECT (lead, contact, account,
 * opportunity, case), because a body action with no `objectName` lands under a
 * dispatcher key nothing probes (#509). The labels are identical on every one
 * of them, so they are declared once here and spread into each object's
 * `_actions` — fifteen hand-copied blocks per locale is how a translation set
 * drifts.
 */
const activityActions = {
  log_call: {
    label: 'Log a Call',
    successMessage: 'Call logged successfully!',
    params: {
      subject: { label: 'Call Subject' },
      duration: { label: 'Duration (minutes)' },
      attendee_contacts: { label: 'Contact Attendees' },
      attendee_users: { label: 'Internal Attendees' },
      notes: { label: 'Call Notes' },
    },
  },
  log_meeting: {
    label: 'Log a Meeting',
    successMessage: 'Meeting logged successfully!',
    params: {
      subject: { label: 'Meeting Subject' },
      duration: { label: 'Duration (minutes)' },
      attendee_contacts: { label: 'Contact Attendees' },
      attendee_users: { label: 'Internal Attendees' },
      notes: { label: 'Meeting Notes' },
    },
  },
  schedule_meeting: {
    label: 'Schedule a Meeting',
    successMessage: 'Meeting scheduled!',
    params: {
      subject: { label: 'Meeting Subject' },
      start_date: { label: 'Start Date (UTC)' },
      start_time: { label: 'Start Time (UTC)' },
      location: { label: 'Location' },
      duration: { label: 'Duration (minutes)' },
      attendee_contacts: { label: 'Contact Attendees' },
      attendee_users: { label: 'Internal Attendees' },
      notes: { label: 'Agenda' },
    },
  },
};

export const en: TranslationData = {
  objects: {
    crm_account: {
      label: 'Account',
      pluralLabel: 'Accounts',
      fields: {
        account_number: { label: 'Account Number' },
        name: { label: 'Account Name', help: 'Legal name of the company or organization' },
        type: {
          label: 'Type',
          options: { prospect: 'Prospect', customer: 'Customer', partner: 'Partner', former: 'Former Customer' },
        },
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
        annual_revenue: { label: 'Annual Revenue' },
        number_of_employees: { label: 'Number of Employees' },
        phone: { label: 'Phone' },
        website: { label: 'Website' },
        billing_address: { label: 'Billing Address' },
        billing_country: {
          label: 'Billing Country',
          help: 'Derived from Billing Address — the country exactly as entered, trimmed and upper-cased.',
        },
        territory: {
          label: 'Territory',
          help: 'Derived from Billing Address — the sales territory the sharing rules match on. Accounts outside the staffed territories are Other.',
          options: { na: 'North America', emea: 'EMEA', other: 'Other' },
        },
        office_location: { label: 'Office Location' },
        owner_id: { label: 'Account Owner' },
        parent_account: { label: 'Parent Account', help: 'Parent company in hierarchy' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        last_activity_date: { label: 'Last Activity Date' },
        brand_color: { label: 'Brand Color' },
        logo: { label: 'Company Logo' },
        tier: {
          label: 'Customer Tier',
          options: { strategic: 'Strategic', enterprise: 'Enterprise', mid_market: 'Mid-Market', smb: 'SMB' },
        },
        segment: {
          label: 'Segment',
          options: { net_new: 'Net New', growth: 'Growth', at_risk: 'At Risk', stable: 'Stable' },
        },
        health_score: {
          label: 'Health Score',
          help: 'CSM-maintained health indicator',
          options: { healthy: 'Healthy', watching: 'Watching', at_risk: 'At Risk', churning: 'Churning' },
        },
        renewal_owner: { label: 'Renewal Owner (CSM)' },
        next_renewal_date: { label: 'Next Renewal Date' },
        name_normalized: {
          label: 'Account Name (Normalized)',
          help: 'Match key for lead conversion: Account Name lower-cased, trimmed, with internal whitespace collapsed. Maintained by the account_protection hook — never edit directly.',
        },
        display_title: { label: 'Display Title' },
      },
      _views: {
        all_accounts: { label: 'All Accounts', description: 'Primary account list with revenue & industry summaries' },
        account_gallery: { label: 'Account Cards', description: 'Branded account cards with brand-color highlights' },
        account_map: { label: 'Accounts by Location', description: 'Geospatial distribution of accounts' },
        enterprise_accounts: { label: 'Enterprise Accounts', description: 'Accounts with the highest annual revenue' },
        my_accounts: { label: 'My Accounts', description: 'Accounts owned by the current user' },
        renewals_due: { label: '🔄 Upcoming Renewals' },
        at_risk_accounts: { label: '⚠️ At-Risk Accounts' },
      },
      _sections: {
        basic: { label: 'Basic Information' },
        financials: { label: 'Financials' },
        contact_info: { label: 'Contact Information' },
        ownership: { label: 'Ownership & Status' },
        branding: { label: 'Branding' },
        system: { label: 'System' },
      },
      _actions: { ...activityActions },
    },

    crm_contact: {
      label: 'Contact',
      pluralLabel: 'Contacts',
      fields: {
        salutation: {
          label: 'Salutation',
          options: { mr: 'Mr.', ms: 'Ms.', mrs: 'Mrs.', dr: 'Dr.', prof: 'Prof.' },
        },
        first_name: { label: 'First Name' },
        last_name: { label: 'Last Name' },
        full_name: { label: 'Full Name' },
        crm_account: { label: 'Account' },
        email: { label: 'Email' },
        phone: { label: 'Phone' },
        mobile: { label: 'Mobile' },
        title: { label: 'Title' },
        department: {
          label: 'Department',
          options: {
            executive: 'Executive', sales: 'Sales', marketing: 'Marketing',
            engineering: 'Engineering', support: 'Support', finance: 'Finance',
            hr: 'Human Resources', operations: 'Operations',
          },
        },
        owner_id: { label: 'Contact Owner' },
        description: { label: 'Description' },
        is_primary: { label: 'Primary Contact', help: 'Is this the main contact for the account?' },
        avatar: { label: 'Profile Picture' },
        reports_to: { label: 'Reports To', help: 'Direct manager/supervisor' },
        mailing_street: { label: 'Mailing Street' },
        mailing_city: { label: 'Mailing City' },
        mailing_state: { label: 'Mailing State/Province' },
        mailing_postal_code: { label: 'Mailing Postal Code' },
        mailing_country: { label: 'Mailing Country' },
        birthdate: { label: 'Birthdate' },
        lead_source: {
          label: 'Lead Source',
          options: {
            web: 'Web', referral: 'Referral', event: 'Event / Trade Show',
            webinar: 'Webinar', partner: 'Partner', advertisement: 'Advertisement',
            paid_search: 'Paid Search', social: 'Social Media', content: 'Content / Blog',
            cold_call: 'Cold Call', email_campaign: 'Email Campaign', other: 'Other',
          },
        },
        do_not_call: { label: 'Do Not Call' },
        email_opt_out: { label: 'Email Opt Out' },
        last_contacted_date: { label: 'Last Contacted' },
      },
      _views: {
        all_contacts: { label: 'All Contacts' },
        contact_directory: { label: 'People Directory' },
        primary_contacts: { label: 'Primary Contacts' },
      },
      _sections: {
        identity: { label: 'Identity' },
        account_info: { label: 'Account & Role' },
        contact_info: { label: 'Contact Information' },
        mailing_address: { label: 'Mailing Address' },
        additional: { label: 'Additional Info' },
        preferences: { label: 'Communication Preferences' },
      },
      _actions: {
        ...activityActions,
        mark_primary: {
          label: 'Mark as Primary Contact',
          confirmText: 'Mark this contact as the primary contact for the account?',
          successMessage: 'Contact marked as primary!',
        },
        send_email: {
          label: 'Send Email',
          params: {
            subject: { label: 'Subject' },
            body: { label: 'Body' },
          },
        },
        add_contact_to_campaign: {
          label: 'Add to Campaign',
          successMessage: 'Contacts added to campaign!',
          params: {
            crm_campaign: { label: 'Campaign' },
          },
        },
      },
    },

    crm_knowledge_article: {
      label: 'Knowledge Article',
      pluralLabel: 'Knowledge Base',
      description: 'Reusable answers and how-to guides for customers and agents',
      fields: {
        article_number: { label: 'Article #' },
        title: { label: 'Title' },
        summary: { label: 'Summary', help: 'One-paragraph TL;DR shown in search results and AI citations.' },
        body: { label: 'Body', help: 'Full article content (Markdown).' },
        category: {
          label: 'Category',
          options: {
            getting_started: 'Getting Started', how_to: 'How-To',
            troubleshooting: 'Troubleshooting', billing: 'Billing & Pricing', api: 'API & Integrations',
            release_notes: 'Release Notes', policy: 'Policy',
          },
        },
        tags: {
          label: 'Tags',
          options: {
            auth: 'Auth', sso: 'SSO', mobile: 'Mobile', email: 'Email',
            reports: 'Reports', performance: 'Performance', data_import: 'Data Import',
            webhooks: 'Webhooks',
          },
        },
        status: {
          label: 'Status',
          options: { draft: 'Draft', in_review: 'In Review', published: 'Published', archived: 'Archived' },
        },
        audience: {
          label: 'Audience',
          help: 'Public articles are visible in the customer portal; internal articles are agent-only.',
          options: { public: 'Public', internal: 'Internal' },
        },
        language: {
          label: 'Language',
          options: { en: 'English', zh_cn: 'Simplified Chinese', es_es: 'Spanish', ja_jp: 'Japanese' },
        },
        owner_id: { label: 'Owner' },
        related_to_case: { label: 'Source Case', help: 'Case this article was authored from (optional).' },
        published_at: { label: 'Published At' },
        last_reviewed_at: { label: 'Last Reviewed' },
        helpful_count: { label: 'Helpful', help: 'Recounted from crm_article_feedback — never typed in.' },
        not_helpful_count: { label: 'Not Helpful', help: 'Recounted from crm_article_feedback — never typed in.' },
        display_title: { label: 'Display Title' },
      },
      _views: {
        all_articles: { label: 'All Articles' },
        published_articles: { label: 'Published' },
        my_drafts: { label: 'My Drafts' },
        stale_articles: { label: 'Review Queue · Oldest First' },
      },
      _sections: {
        basic: { label: 'Article Information' },
        content: { label: 'Content' },
        taxonomy: { label: 'Categorization' },
        metrics: { label: 'Engagement' },
        engagement: { label: 'Engagement' },
      },
      _actions: {
        mark_article_helpful: {
          label: 'Helpful',
          successMessage: 'Thanks — recorded as helpful.',
        },
        mark_article_not_helpful: {
          label: 'Not Helpful',
          successMessage: 'Thanks — recorded as not helpful.',
        },
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
          help: 'Normally derived automatically from Period and Period Start. If set by hand, it must be after Period Start.',
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
      },
    },

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
          options: { crm_lead: 'Lead', crm_contact: 'Contact' },
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
      },
      _actions: {
        ...activityActions,
        convert_lead: {
          label: 'Convert Lead',
          confirmText: 'Are you sure you want to convert this lead?',
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

    crm_case: {
      label: 'Case',
      pluralLabel: 'Cases',
      fields: {
        case_number: { label: 'Case Number' },
        subject: { label: 'Subject' },
        description: { label: 'Description' },
        crm_account: { label: 'Account' },
        crm_contact: { label: 'Contact' },
        status: {
          label: 'Status',
          options: {
            new: 'New', in_progress: 'In Progress', waiting_customer: 'Waiting on Customer',
            waiting_support: 'Waiting on Support', escalated: 'Escalated',
            resolved: 'Resolved', closed: 'Closed',
          },
        },
        priority: {
          label: 'Priority',
          options: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' },
        },
        type: {
          label: 'Case Type',
          options: {
            question: 'Question', problem: 'Problem',
            feature_request: 'Feature Request', bug: 'Bug',
          },
        },
        origin: {
          label: 'Case Origin',
          options: { email: 'Email', phone: 'Phone', web: 'Web', chat: 'Chat', social_media: 'Social Media' },
        },
        owner_id: { label: 'Case Owner' },
        created_date: { label: 'Created Date' },
        closed_date: { label: 'Closed Date' },
        first_response_date: { label: 'First Response Date' },
        resolution_time_hours: { label: 'Resolution Time (Hours)' },
        sla_due_date: { label: 'SLA Due Date' },
        is_sla_violated: { label: 'SLA Violated' },
        is_escalated: { label: 'Escalated' },
        escalation_reason: { label: 'Escalation Reason' },
        parent_case: { label: 'Parent Case', help: 'Related parent case' },
        resolution: { label: 'Resolution' },
        resolved_by_article: { label: 'Resolved by Article', help: 'Knowledge article that resolved this case — the deflection signal.' },
        customer_rating: {
          label: 'Customer Satisfaction',
          help: 'Customer satisfaction rating (1-5 stars)',
        },
        customer_feedback: { label: 'Customer Feedback' },
        customer_signature: {
          label: 'Customer Signature',
          help: 'Digital signature acknowledging case resolution',
        },
        internal_notes: { label: 'Internal Notes', help: 'Internal notes; not visible to the customer.' },
        is_closed: { label: 'Is Closed' },
        display_title: { label: 'Display Title' },
        priority_rank: { label: 'Priority Rank' },
        escalated_date: { label: 'Escalated Date' },
      },
      _views: {
        all_cases: { label: 'All Cases' },
        case_workflow: { label: 'Service Workflow' },
        sla_calendar: { label: 'SLA Calendar' },
        case_timeline: { label: 'Case Timeline' },
        unassigned_triage: {
          label: 'Unassigned — triage',
          emptyState: {
            title: 'Nothing waiting for triage',
            message: 'Every case has an owner. Cases appear here when they arrive with no owner — typically a web-to-case submission that arrived while nobody held the Service Agent position.',
          },
        },
        escalated_cases: { label: 'Escalated Cases' },
        my_open_cases: { label: 'My Open Cases' },
        sla_at_risk: { label: '⏰ SLA at Risk' },
      },
      _sections: {
        basic: { label: 'Case Information' },
        origin: { label: 'Origin & Routing' },
        sla: { label: 'SLA & Priority' },
        resolution: { label: 'Resolution' },
        escalation: { label: 'Escalation' },
        system: { label: 'System' },
        // Detail-page sections (src/pages/case_detail.page.ts)
        info: { label: 'Case Information' },
        status: { label: 'Status & SLA' },
        description: { label: 'Description' },
      },
      _actions: {
        ...activityActions,
        escalate_case: {
          label: 'Escalate Case',
          confirmText: 'This will escalate the case to the escalation team. Continue?',
          successMessage: 'Case escalated successfully!',
        },
        close_case: {
          label: 'Close Case',
          confirmText: 'Are you sure you want to close this case?',
          successMessage: 'Case closed successfully!',
        },
      },
    },

    crm_contract: {
      label: 'Contract',
      pluralLabel: 'Contracts',
      fields: {
        contract_number: { label: 'Contract Number' },
        crm_account: { label: 'Account' },
        crm_contact: { label: 'Primary Contact' },
        crm_opportunity: { label: 'Related Opportunity' },
        owner_id: { label: 'Contract Owner' },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft', in_approval: 'In Approval', activated: 'Activated',
            expired: 'Expired', terminated: 'Terminated',
          },
        },
        contract_term_months: { label: 'Contract Term (Months)' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        contract_value: { label: 'Contract Value' },
        billing_frequency: {
          label: 'Billing Frequency',
          options: {
            monthly: 'Monthly', quarterly: 'Quarterly',
            annually: 'Annually', one_time: 'One-time',
          },
        },
        payment_terms: {
          label: 'Payment Terms',
          options: {
            net_15: 'Net 15', net_30: 'Net 30', net_60: 'Net 60',
            net_90: 'Net 90', due_on_receipt: 'Due on Receipt',
          },
        },
        auto_renewal: { label: 'Auto Renewal' },
        renewal_notice_days: { label: 'Renewal Notice (Days)' },
        contract_type: {
          label: 'Contract Type',
          options: {
            subscription: 'Subscription', service: 'Service Agreement', license: 'License',
            partnership: 'Partnership', nda: 'NDA', msa: 'MSA',
          },
        },
        signed_date: { label: 'Signed Date' },
        signed_by: { label: 'Signed By' },
        document_url: { label: 'Contract Document' },
        special_terms: { label: 'Special Terms' },
        description: { label: 'Description' },
        billing_address: { label: 'Billing Address' },
      },
      _views: {
        all_contracts: { label: 'All Contracts' },
        renewal_calendar: { label: 'Renewal Calendar' },
        contract_gantt: { label: 'Contract Terms' },
        contract_timeline: { label: 'Contract Timeline' },
      },
      _sections: {
        basic: { label: 'Contract Information' },
        parties: { label: 'Parties' },
        terms: { label: 'Terms & Dates' },
        value: { label: 'Contract Value' },
        status: { label: 'Status & Approval' },
        renewal: { label: 'Renewal' },
      },
    },

    crm_product: {
      label: 'Product',
      pluralLabel: 'Products',
      fields: {
        product_code: { label: 'Product Code' },
        name: { label: 'Product Name' },
        description: { label: 'Description' },
        category: {
          label: 'Category',
          options: {
            software: 'Software', hardware: 'Hardware', service: 'Service',
            subscription: 'Subscription', support: 'Support',
          },
        },
        family: {
          label: 'Product Family',
          options: {
            enterprise: 'Enterprise Solutions', smb: 'SMB Solutions',
            services: 'Professional Services', cloud: 'Cloud Services',
          },
        },
        list_price: { label: 'List Price' },
        cost: { label: 'Cost' },
        billing_type: {
          label: 'Billing Type',
          options: {
            one_time: 'One-Time', monthly: 'Monthly', quarterly: 'Quarterly',
            annual: 'Annual', usage: 'Usage',
          },
        },
        unit_of_measure: {
          label: 'Unit of Measure',
          options: {
            each: 'Each', license: 'License', seat: 'Seat',
            hour: 'Hour', day: 'Day', month: 'Month',
          },
        },
        sku: { label: 'SKU' },
        quantity_on_hand: { label: 'Quantity on Hand' },
        reorder_point: { label: 'Reorder Point' },
        is_active: { label: 'Active' },
        is_taxable: { label: 'Taxable' },
        product_manager: { label: 'Product Manager' },
        image: { label: 'Product Image' },
        datasheet: { label: 'Datasheet' },
        display_title: { label: 'Display Title' },
        tax_rate: { label: 'Default Tax Rate %' },
      },
      _views: {
        all_products: { label: 'All Products' },
        product_catalog: { label: 'Product Catalog' },
        low_stock: { label: 'Low Stock' },
      },
      _sections: {
        basic: { label: 'Product Information' },
        pricing: { label: 'Pricing & Billing' },
        metadata: { label: 'Resources' },
      },
    },

    crm_quote: {
      label: 'Quote',
      pluralLabel: 'Quotes',
      fields: {
        quote_number: { label: 'Quote Number' },
        name: { label: 'Quote Name' },
        crm_account: { label: 'Account' },
        crm_contact: {
          label: 'Contact',
          help: 'Required once the quote is Presented or Accepted — the drafted contract takes its Primary Contact from here.',
        },
        crm_opportunity: { label: 'Opportunity' },
        owner_id: { label: 'Quote Owner' },
        status: {
          label: 'Status',
          options: {
            draft: 'Draft', in_review: 'In Review', presented: 'Presented',
            accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired',
          },
        },
        quote_date: { label: 'Quote Date' },
        expiration_date: { label: 'Expiration Date' },
        subtotal: { label: 'Subtotal' },
        discount: { label: 'Discount %' },
        discount_amount: { label: 'Discount Amount' },
        tax: { label: 'Tax' },
        shipping_handling: { label: 'Shipping & Handling' },
        total_price: { label: 'Total Price' },
        payment_terms: {
          label: 'Payment Terms',
          options: {
            net_15: 'Net 15', net_30: 'Net 30', net_60: 'Net 60',
            net_90: 'Net 90', due_on_receipt: 'Due on Receipt',
          },
        },
        shipping_terms: { label: 'Shipping Terms' },
        billing_address: { label: 'Billing Address' },
        shipping_address: { label: 'Shipping Address' },
        description: { label: 'Description' },
        internal_notes: { label: 'Internal Notes' },
        display_title: { label: 'Display Title' },
      },
      _views: {
        all_quotes: { label: 'All Quotes' },
        quote_pipeline: { label: 'Quote Pipeline' },
        quote_calendar: { label: 'Quote Calendar' },
      },
      _sections: {
        basic: { label: 'Quote Information' },
        pricing: { label: 'Pricing' },
        terms: { label: 'Terms & Validity' },
        address: { label: 'Addresses' },
        system: { label: 'System' },
      },
    },

    crm_task: {
      label: 'Task',
      pluralLabel: 'Tasks',
      fields: {
        subject: { label: 'Subject' },
        description: { label: 'Description' },
        status: {
          label: 'Status',
          options: {
            not_started: 'Not Started', in_progress: 'In Progress', waiting: 'Waiting',
            completed: 'Completed', deferred: 'Deferred',
          },
        },
        priority: {
          label: 'Priority',
          options: { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' },
        },
        type: {
          label: 'Task Type',
          options: {
            call: 'Call', email: 'Email', meeting: 'Meeting',
            follow_up: 'Follow-up', demo: 'Demo', other: 'Other',
          },
        },
        due_date: { label: 'Due Date' },
        reminder_date: { label: 'Reminder Date/Time' },
        completed_date: { label: 'Completed Date' },
        owner_id: { label: 'Assigned To' },
        related_to_type: {
          label: 'Related To Type',
          options: {
            crm_account: 'Account', crm_contact: 'Contact', crm_opportunity: 'Opportunity',
            crm_lead: 'Lead', crm_case: 'Case',
          },
        },
        related_to_account: { label: 'Related Account' },
        related_to_contact: { label: 'Related Contact' },
        related_to_opportunity: { label: 'Related Opportunity' },
        related_to_lead: { label: 'Related Lead' },
        related_to_case: { label: 'Related Case' },
        is_recurring: { label: 'Recurring Task' },
        recurrence_type: {
          label: 'Recurrence Type',
          options: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' },
        },
        recurrence_interval: { label: 'Recurrence Interval' },
        recurrence_end_date: { label: 'Recurrence End Date' },
        is_completed: { label: 'Is Completed' },
        is_overdue: { label: 'Is Overdue' },
        progress_percent: { label: 'Progress (%)' },
        estimated_hours: { label: 'Estimated Hours' },
        actual_hours: { label: 'Actual Hours' },
        priority_rank: { label: 'Priority Rank' },
        reminder_sent: { label: 'Reminder Sent' },
      },
      _views: {
        all_tasks: { label: 'All Tasks' },
        task_board: { label: 'Task Board' },
        task_calendar: { label: 'Task Schedule' },
        task_gantt: { label: 'Execution Plan' },
        task_timeline: { label: 'Worklog Timeline' },
        my_open_tasks: { label: 'My Open Tasks' },
        todays_tasks: { label: '📅 My Priority Tasks' },
        overdue_tasks: { label: '⏰ Open Tasks · Most Overdue First' },
      },
      _sections: {
        basic: { label: 'Task Information' },
        scheduling: { label: 'Scheduling' },
        related: { label: 'Related Records' },
        recurrence: { label: 'Recurrence' },
        effort: { label: 'Progress & Effort' },
        system: { label: 'System' },
      },
    },

    crm_campaign: {
      label: 'Campaign',
      pluralLabel: 'Campaigns',
      fields: {
        campaign_code: { label: 'Campaign Code' },
        name: { label: 'Campaign Name' },
        description: { label: 'Description' },
        type: {
          label: 'Campaign Type',
          options: {
            email: 'Email', webinar: 'Webinar', trade_show: 'Trade Show',
            conference: 'Conference', direct_mail: 'Direct Mail', social_media: 'Social Media',
            content: 'Content Marketing', partner: 'Partner Marketing',
          },
        },
        channel: {
          label: 'Primary Channel',
          options: {
            digital: 'Digital', social: 'Social', email: 'Email',
            events: 'Events', partner: 'Partner',
          },
        },
        status: {
          label: 'Status',
          options: {
            planning: 'Planning', in_progress: 'In Progress',
            completed: 'Completed', aborted: 'Aborted',
          },
        },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        budgeted_cost: { label: 'Budgeted Cost' },
        actual_cost: { label: 'Actual Cost' },
        expected_revenue: { label: 'Expected Revenue' },
        actual_revenue: { label: 'Actual Revenue' },
        target_size: { label: 'Target Size', help: 'Target number of leads/contacts' },
        num_sent: { label: 'Number Sent' },
        num_responses: { label: 'Number of Responses' },
        num_leads: { label: 'Number of Leads' },
        num_converted_leads: { label: 'Converted Leads' },
        num_opportunities: { label: 'Opportunities Created' },
        num_won_opportunities: { label: 'Won Opportunities' },
        response_rate: { label: 'Response Rate %' },
        roi: { label: 'ROI %' },
        parent_campaign: { label: 'Parent Campaign', help: 'Parent campaign in hierarchy' },
        owner_id: { label: 'Campaign Owner' },
        landing_page_url: { label: 'Landing Page' },
        is_active: { label: 'Active' },
        display_title: { label: 'Display Title' },
      },
      _views: {
        all_campaigns: { label: 'All Campaigns' },
        campaign_gantt: { label: 'Campaign Schedule' },
        campaign_calendar: { label: 'Launch Calendar' },
        campaign_timeline: { label: 'Marketing Timeline' },
      },
      _sections: {
        basic: { label: 'Campaign Information' },
        schedule: { label: 'Schedule' },
        budget: { label: 'Budget & ROI' },
        metrics: { label: 'Performance' },
        assignment: { label: 'Ownership' },
        assets: { label: 'Campaign Assets' },
      },
      _actions: {
        enroll_leads: {
          label: 'Enroll Members',
          successMessage: 'Eligible members enrolled in campaign.',
        },
      },
    },

    crm_event: {
      label: 'Event',
      pluralLabel: 'Events',
      description: 'Meetings, calls and other scheduled interactions with customers',
      fields: {
        subject: { label: 'Subject' },
        description: { label: 'Description' },
        type: {
          label: 'Event Type',
          options: {
            meeting: 'Meeting', call: 'Call', demo: 'Demo',
            webinar: 'Webinar', onsite_visit: 'Onsite Visit', other: 'Other',
          },
        },
        status: {
          label: 'Status',
          options: {
            planned: 'Planned', held: 'Held', cancelled: 'Cancelled', no_show: 'No Show',
          },
        },
        owner_id: { label: 'Assigned To' },
        start_datetime: { label: 'Start' },
        end_datetime: { label: 'End' },
        all_day: { label: 'All Day Event' },
        duration_minutes: { label: 'Duration (minutes)' },
        location: { label: 'Location', help: 'Room, address, or meeting link' },
        related_to_type: {
          label: 'Related To Type',
          options: {
            crm_account: 'Account', crm_contact: 'Contact', crm_opportunity: 'Opportunity',
            crm_lead: 'Lead', crm_case: 'Case',
          },
        },
        related_to_account: { label: 'Related Account' },
        related_to_contact: { label: 'Related Contact' },
        related_to_opportunity: { label: 'Related Opportunity' },
        related_to_lead: { label: 'Related Lead' },
        related_to_case: { label: 'Related Case' },
        outcome_notes: { label: 'Outcome Notes', help: 'What was agreed, and what happens next' },
      },
      _views: {
        all_events: { label: 'All Events' },
        event_calendar: { label: 'Event Calendar' },
        event_timeline: { label: 'Team Schedule' },
        my_events: { label: 'My Calendar' },
        upcoming_events: { label: '📅 Upcoming · Soonest First' },
        held_events: { label: '✅ Interaction History' },
      },
      _sections: {
        basic: { label: 'Event Information' },
        schedule: { label: 'Schedule' },
        related: { label: 'Related Records' },
        outcome: { label: 'Outcome' },
      },
    },

    crm_event_attendee: {
      label: 'Event Attendee',
      pluralLabel: 'Event Attendees',
      description: 'A person invited to or present at an event',
      fields: {
        attendee_number: { label: 'Attendee Number' },
        crm_event: { label: 'Event' },
        attendee_type: {
          label: 'Attendee Type',
          options: { contact: 'Contact', lead: 'Lead', user: 'User', external: 'External' },
        },
        crm_contact: { label: 'Contact', help: 'Set when the attendee is an existing customer contact' },
        crm_lead: { label: 'Lead', help: 'Set when the attendee is still an unconverted lead' },
        sys_user: { label: 'User', help: 'Set when the attendee is a colleague' },
        external_name: {
          label: 'External Attendee',
          help: 'Name of an attendee who is in no CRM object — set when Attendee Type is External',
        },
        response: {
          label: 'Response',
          options: {
            no_response: 'No Response', accepted: 'Accepted',
            declined: 'Declined', tentative: 'Tentative',
          },
        },
        is_organizer: { label: 'Organizer' },
        invited_date: { label: 'Invited' },
      },
      _views: {
        all_event_attendees: { label: 'Event Attendees' },
      },
      _sections: {
        basic: { label: 'Attendee' },
        response: { label: 'Invitation' },
      },
    },

    crm_article_feedback: {
      label: 'Article Feedback',
      pluralLabel: 'Article Feedback',
      description: 'One reader’s helpful / not-helpful verdict on a knowledge article',
      fields: {
        feedback_number: { label: 'Feedback #' },
        owner_id: { label: 'Reader' },
        crm_knowledge_article: { label: 'Article', help: 'Knowledge article this feedback is about.' },
        verdict: {
          label: 'Verdict',
          options: { helpful: 'Helpful', not_helpful: 'Not Helpful' },
        },
        comment: { label: 'Comment', help: 'Optional note explaining the verdict — read by the article’s author.' },
      },
      _sections: {
        basic: { label: 'Feedback' },
      },
    },

    crm_campaign_member: {
      label: 'Campaign Member',
      pluralLabel: 'Campaign Members',
      description: 'Leads and contacts touched by a campaign, with response status',
      fields: {
        member_number: { label: 'Member Number' },
        crm_campaign: { label: 'Campaign' },
        crm_lead: { label: 'Lead', help: 'Set when the member was a Lead at enrollment time' },
        crm_contact: { label: 'Contact', help: 'Set when the member is an existing Contact' },
        status: {
          label: 'Status',
          options: {
            sent: 'Sent', responded: 'Responded',
            converted: 'Converted', unsubscribed: 'Unsubscribed',
          },
        },
        added_date: { label: 'Added Date' },
        response_date: { label: 'Response Date' },
        has_responded: { label: 'Has Responded' },
      },
      _sections: {
        basic: { label: 'Basic Information' },
        response: { label: 'Response Tracking' },
      },
      _actions: {
        mark_responded: {
          label: 'Mark Responded',
          successMessage: 'Response recorded on this campaign member.',
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
    },

    crm_quote_line_item: {
      label: 'Quote Line Item',
      pluralLabel: 'Quote Line Items',
      description: 'Per-product pricing lines under a quote',
      fields: {
        crm_quote: { label: 'Quote' },
        crm_product: { label: 'Product' },
        description: { label: 'Description' },
        quantity: { label: 'Quantity' },
        list_price: { label: 'List Price' },
        unit_price: { label: 'Sales Price' },
        discount: { label: 'Discount %' },
        subtotal: { label: 'Subtotal' },
        tax_rate: { label: 'Tax Rate %' },
        total_price: { label: 'Total' },
        line_number: { label: 'Line #' },
      },
    },
  },

  apps: {
    crm_enterprise: {
      label: 'HotCRM',
      description: 'Customer relationship management for sales, service, and marketing',
      navigation: {
        group_activity: { label: 'Activity' },
        group_sales: { label: 'Sales' },
        group_service: { label: 'Service' },
        group_marketing: { label: 'Marketing' },
      },
    },
  },

  messages: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'nav.sales': 'Sales',
    'nav.service': 'Service',
    'nav.marketing': 'Marketing',
    'nav.products': 'Products',
    'nav.analytics': 'Analytics',
    'success.saved': 'Record saved successfully',
    'success.converted': 'Lead converted successfully',
    'confirm.delete': 'Are you sure you want to delete this record?',
    'confirm.convert_lead': 'Convert this lead to account, contact, and opportunity?',
    'error.required': 'This field is required',
    'error.load_failed': 'Failed to load data',
  },


  dashboards: {
    sales_activity_dashboard: {
      label: 'Sales Activity',
      description: 'Who is talking to customers, how often, and which accounts have gone quiet',
      widgets: {
        interactions_held: { title: 'Interactions Logged', description: 'Calls and meetings that actually happened' },
        meetings_booked: { title: 'Meetings Booked', description: 'Meetings on the calendar that have not happened yet' },
        customer_minutes: { title: 'Customer Minutes', description: 'Total time spent in front of customers' },
        tasks_completed: { title: 'Tasks Completed', description: 'Follow-ups closed out — the other half of activity' },
        activity_by_rep: { title: 'Activity by Rep', description: 'Logged interactions per owner' },
        activity_by_week: { title: 'Activity Volume by Week', description: 'Interactions per week' },
        activity_mix: { title: 'Activity Mix', description: 'Calls vs meetings vs demos' },
        activity_by_record_type: { title: 'Where the Activity Lands', description: 'Which part of the funnel is getting attention' },
        deal_activity: { title: 'Interactions on Deals', description: 'Logged interactions linked to an opportunity' },
        open_deals_for_activity: { title: 'Open Deals', description: 'Opportunities still in play' },
        quiet_accounts_30: { title: 'Quiet 30+ Days', description: 'Active accounts with no logged interaction in a month' },
        quiet_accounts_60: { title: 'Quiet 60+ Days', description: 'Two months of silence — the at-risk threshold' },
        quiet_accounts_90: { title: 'Quiet 90+ Days', description: 'A quarter with no contact' },
      },
    },
    crm_overview_dashboard: {
      label: 'CRM Overview',
      description: 'Revenue metrics, pipeline analytics, and deal insights',
      widgets: {
        total_revenue: { title: 'Total Revenue', description: 'Closed-won revenue this period' },
        active_deals: { title: 'Active Deals', description: 'Open opportunities in the pipeline' },
        won_deals: { title: 'Won Deals', description: 'Closed-won deals this period' },
        avg_deal_size: { title: 'Avg Deal Size', description: 'Average value of closed-won deals' },
        revenue_trends: { title: 'Revenue Trends', description: 'Closed-won revenue over the last 12 months' },
        lead_source: { title: 'Lead Source', description: 'Pipeline value by acquisition channel' },
        pipeline_by_stage: { title: 'Pipeline by Stage', description: 'Open opportunity value at each sales stage' },
        top_products: { title: 'Top Products', description: 'Total list-price revenue by product category' },
        pipeline_by_owner: { title: 'Pipeline by Owner', description: 'Open pipeline value and deal count per sales rep' },
      },
    },
    executive_dashboard: {
      label: 'Executive Overview',
      description: 'High-level revenue, customer, and pipeline KPIs for leadership',
      widgets: {
        total_revenue_ytd: { title: 'Total Revenue (YTD)', description: 'Closed-won revenue this year' },
        total_accounts: { title: 'Active Accounts', description: 'Customers with at least one active relationship' },
        total_contacts: { title: 'Total Contacts', description: 'People in our address book' },
        open_leads: { title: 'Open Leads', description: 'Unconverted leads in the funnel' },
        revenue_trend: { title: 'Revenue Trend', description: 'Closed-won revenue over the last 12 months' },
        revenue_by_industry: { title: 'Revenue by Industry', description: 'YTD closed-won revenue split by customer industry' },
        pipeline_by_stage: { title: 'Pipeline by Stage', description: 'Open opportunity value by sales stage' },
        new_accounts_by_month: { title: 'New Accounts', description: 'Account creation cadence — last 6 months' },
        accounts_by_industry: { title: 'Accounts by Industry', description: 'Total annual revenue and account count per industry' },
      },
    },
    sales_dashboard: {
      label: 'Sales Performance',
      description: 'Pipeline analytics, win rate trends, and rep performance',
      widgets: {
        total_pipeline_value: { title: 'Total Pipeline', description: 'Sum of open opportunity value' },
        closed_won_qtd: { title: 'Closed Won (QTD)', description: 'Revenue closed this quarter' },
        open_opportunities: { title: 'Open Opportunities', description: 'Active deals in flight' },
        avg_deal_size: { title: 'Avg Deal Size', description: 'Average value of closed-won deals this quarter' },
        pipeline_by_stage: { title: 'Pipeline by Stage', description: 'Open opportunity value at each sales stage' },
        monthly_revenue_trend: { title: 'Monthly Revenue Trend', description: 'Closed-won revenue, last 12 months' },
        pipeline_by_forecast_category: { title: 'Pipeline by Forecast Category', description: 'Open pipeline grouped by sales forecast category' },
        lead_source_breakdown: { title: 'Lead Source', description: 'Where our pipeline is coming from' },
        open_pipeline_by_owner: { title: 'Open Pipeline by Owner', description: 'In-flight pipeline value, deal count and avg win probability per rep' },
        quota_attainment_by_rep: { title: 'Quota Attainment by Rep', description: 'Current-quarter quota, closed revenue and attainment per rep, from forecast snapshots' },
        pipeline_stage_by_source: { title: 'Pipeline by Stage × Lead Source', description: 'Cross-tab of open opportunity amount by stage and source' },
        win_rate_12m: { title: 'Win Rate (12M)', description: 'Deals won as a share of all deals settled in the last 12 months' },
        won_deals_12m: { title: 'Deals Won (12M)', description: 'The numerator of the win rate' },
        lost_deals_12m: { title: 'Deals Lost (12M)', description: 'The other half of the win-rate denominator' },
        win_rate_by_owner: { title: 'Win / Loss by Rep', description: 'Deals won, deals lost and win rate per rep — last 12 months' },
        win_rate_by_lead_source: { title: 'Win / Loss by Lead Source', description: 'Which sources produce deals that actually close — last 12 months' },
        loss_reason_breakdown: { title: 'Why We Lose', description: 'Lost deals by reason — last 12 months' },
      },
    },
    service_dashboard: {
      label: 'Customer Service',
      description: 'Case load, SLA health, and resolution performance',
      widgets: {
        open_cases: { title: 'Open Cases', description: 'Cases that are not yet closed' },
        critical_cases: { title: 'Critical Cases', description: 'Open cases marked as critical priority' },
        avg_resolution_time: { title: 'Avg Resolution Time', description: 'Mean time to close, in hours' },
        sla_violations: { title: 'SLA Violations', description: 'Cases that breached their SLA' },
        cases_by_status: { title: 'Cases by Status', description: 'Workload distribution across the pipeline' },
        cases_by_priority: { title: 'Cases by Priority', description: 'Open case mix by urgency' },
        cases_by_origin: { title: 'Cases by Origin', description: 'Where our cases are coming from' },
        daily_case_volume: { title: 'Daily Case Volume', description: 'New cases created over the last 30 days' },
        sla_compliance_gauge: { title: 'SLA Compliance', description: 'Percent of cases resolved within SLA this period' },
        kb_deflection_rate: { title: 'KB Deflection Rate', description: 'Share of closed cases resolved with a knowledge article' },
        kb_resolved_cases: { title: 'Resolved by KB', description: 'Closed cases pointing at the article that resolved them' },
        closed_cases_total: { title: 'Closed Cases', description: 'The denominator behind the deflection rate' },
        top_resolving_articles: { title: 'Top Resolving Articles', description: 'Knowledge articles ranked by the closed cases they resolved' },
        open_cases_by_priority: { title: 'Open Cases by Priority', description: 'Open cases and their SLA-violation rate, broken down by priority' },
      },
    },
  },

  pages: {
    account_detail_page: {
      label: 'Account Detail',
      description: 'Slotted account record page — custom header + persistent discussion feed.',
    },
    account_workbench: {
      label: 'Account Workbench',
      description: 'Curated account list for the sales team: quick filters only, no view management.',
    },
    app_launcher_page: {
      label: 'App Launcher',
      description: 'Central hub for accessing all applications',
      subtitle: 'Select an app to get started',
    },
    case_detail_page: {
      label: 'Case Detail',
      description: 'Service-agent case record: highlights, SLA path, details and activity timeline.',
      title: '{case_number} · {subject}',
      subtitle: '{crm_account}',
    },
    lead_detail_page: {
      label: 'Lead Detail',
      description: 'Comprehensive lead detail page with highlights, details, and related information',
      title: '{first_name} {last_name}',
      subtitle: '{company}',
    },
    opportunity_detail_page: {
      label: 'Opportunity Detail',
      description:
        'Comprehensive opportunity detail page with path, highlights, details, and related lists',
      title: '{name}',
      subtitle: '{crm_account}',
    },
    sales_home_page: {
      label: 'Sales Home',
      description: 'Sales team home page with key metrics and quick actions',
      title: 'Sales Dashboard',
      subtitle: 'Welcome back, {current_user.first_name}',
    },
    utility_bar_page: {
      label: 'Utility Bar',
      description: 'Quick access utility bar with floating tools',
    },
  },
};
