// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

import { activityActions } from './_shared';

/**
 * English (en) — `objects` translations for the CUSTOMER family:
 * the customer record itself — accounts and the people at them.
 *
 * Roster: `crm_account`, `crm_contact`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/en.ts`.
 */
export const customer: Record<string, ObjectTranslationData> = {
  crm_account: {
    label: 'Account',
    pluralLabel: 'Accounts',
    fields: {
      account_number: { label: 'Account Number' },
      registration_number: {
        label: 'Registration Number',
        help: "The counterparty's registered identity as issued by its own government registry. Not the Account Number, which we issue.",
      },
      commercial_capability: {
        label: 'Commercial Capability',
        help: 'Whether new business may be opened against this account. Settlement Only accounts stay usable for billing and payment, but no new opportunity may be linked to them.',
        options: { full: 'Full', settlement_only: 'Settlement Only' },
      },
      incumbent_vendor: { label: 'Incumbent Vendor', help: 'The supplier currently holding this account for the spend we are chasing.' },
      annual_purchasing_budget: { label: 'Annual Purchasing Budget', help: 'What this account expects to spend with vendors this year — not its own revenue.' },
      payment_cycle: {
        label: 'Payment Cycle',
        options: { prepaid: 'Prepaid', net_30: 'Net 30', net_60: 'Net 60', net_90: 'Net 90' },
      },
      approval_status: {
        label: 'Approval Status',
        help: 'Where this account stands in its sign-off. A new account starts Pending and is decided in the approval inbox.',
        options: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
      },
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
      child_account_revenue: { label: 'Child Account Revenue', help: 'Sum of the annual revenue of the direct children of this account.' },
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
      at_risk_accounts: { label: '⚠️ At-Risk Accounts' },
    },
    _sections: {
      basic: { label: 'Basic Information' },
      financials: { label: 'Financials' },
      business_profile: { label: 'Business Profile' },
      contact_info: { label: 'Contact Information' },
      ownership: { label: 'Ownership & Status' },
      branding: { label: 'Branding' },
      system: { label: 'System' },
      // Form section names on account.view.ts (#1100)
      profile: { label: 'Profile' },
      customer_success: { label: 'Customer Success' },
      locations: { label: 'Locations' },
      description: { label: 'Description' },
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
      // Buying centre (REQ-0004) — the decision map. English is the source
      // wording for the option VALUES; every other pack translates these.
      buying_function: {
        label: 'Buying Function',
        options: {
          decision_maker: 'Decision Maker', economic_buyer: 'Economic Buyer',
          technical_evaluator: 'Technical Evaluator', user: 'User',
          influencer: 'Influencer', gatekeeper: 'Gatekeeper',
        },
      },
      attitude: {
        label: 'Attitude to Us',
        options: {
          champion: 'Champion', supportive: 'Supportive', neutral: 'Neutral',
          skeptical: 'Skeptical', blocker: 'Blocker',
        },
      },
      relationship_strength: {
        label: 'Relationship Strength',
        options: {
          distant: 'Distant', acquaintance: 'Acquaintance', working: 'Working Relationship',
          strong: 'Strong', trusted_advisor: 'Trusted Advisor',
        },
      },
      owner_id: { label: 'Contact Owner' },
      description: { label: 'Description' },
      is_primary: { label: 'Primary Contact', help: 'Is this the main contact for the account?' },
      avatar: { label: 'Profile Picture' },
      mailing_street: { label: 'Mailing Street' },
      mailing_city: { label: 'Mailing City' },
      mailing_state: { label: 'Mailing State/Province' },
      mailing_postal_code: { label: 'Mailing Postal Code' },
      mailing_country: { label: 'Mailing Country' },
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
      buying_centre: { label: 'Buying Centre' },
      contact_info: { label: 'Contact Information' },
      mailing_address: { label: 'Mailing Address' },
      additional: { label: 'Additional Info' },
      preferences: { label: 'Communication Preferences' },
      // Form section names on contact.view.ts (#1100). `contact_details` /
      // `comm_preferences`, not `contact_info` / `preferences` — those are
      // already fieldGroup keys with their own (longer) wording above.
      contact_details: { label: 'Contact Info' },
      comm_preferences: { label: 'Preferences' },
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
};
