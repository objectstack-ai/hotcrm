// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Shared value maps for the import mappings.
 *
 * The import path already matches a picklist cell against the field's option
 * VALUE exactly and its LABEL case-insensitively (`import-coerce.ts` →
 * `matchOption`), so "Technology" (label) and "technology" (value) both land
 * without any help from us — but an upper-cased value does NOT: "HR" is
 * neither the value `hr` nor the label "Human Resources" (#1998). These maps
 * exist only for the vocabulary a spreadsheet uses that matches no option —
 * the words a Salesforce/HubSpot/Excel export writes that HotCRM has no option
 * for ("SaaS", "Trade Show", "Client"), and the abbreviations our own shipped
 * templates write ("HR"). Anything not listed here falls through
 * untouched and is matched normally; an unknown value fails its row with
 * `invalid_option` rather than being silently dropped.
 *
 * Keep these lists small and defensible. They are a translation table for
 * known synonyms, NOT a "make any spreadsheet work" fallback — every entry
 * here is a value a real export produces, and the row-level error is the
 * intended outcome for everything else.
 */

/** Foreign spellings → `industry` picklist values (`src/sales/picklists/industry.picklist.ts`). */
export const INDUSTRY_SYNONYMS: Record<string, string> = {
  'SaaS': 'software',
  'Saas': 'software',
  'IT': 'technology',
  'Tech': 'technology',
  'Information Technology': 'technology',
  'Financial Services': 'finance',
  'Banking': 'finance',
  'Insurance': 'finance',
  'Health Care': 'healthcare',
  'Pharmaceuticals': 'healthcare',
  'E-commerce': 'retail',
  'Ecommerce': 'retail',
  'Consumer Goods': 'retail',
  'Transportation': 'logistics',
  'Utilities': 'energy',
  'Oil & Gas': 'energy',
  'Public Sector': 'government',
  'Non Profit': 'nonprofit',
  'Non-Profit': 'nonprofit',
  'NGO': 'nonprofit',
  'Travel & Hospitality': 'hospitality',
};

/** Foreign spellings → `lead_source` picklist values (`src/sales/picklists/lead_source.picklist.ts`). */
export const LEAD_SOURCE_SYNONYMS: Record<string, string> = {
  'Website': 'web',
  'Web Site': 'web',
  'Inbound': 'web',
  'Word of mouth': 'referral',
  'Customer Referral': 'referral',
  'Trade Show': 'event',
  'Conference': 'event',
  'Seminar': 'webinar',
  'Partner Referral': 'partner',
  'Google Ads': 'paid_search',
  'AdWords': 'paid_search',
  'SEM': 'paid_search',
  'LinkedIn': 'social',
  'Facebook': 'social',
  'X': 'social',
  'Twitter': 'social',
  'Blog': 'content',
  'Whitepaper': 'content',
  'Phone Inquiry': 'cold_call',
  'Outbound': 'cold_call',
  'Email': 'email_campaign',
  'Newsletter': 'email_campaign',
};

/**
 * Spellings → `crm_contact.department` option values. The shipped
 * `assets/import-templates/contacts.csv` writes eight departments; seven are
 * option labels and land unaided, "HR" is the one that matches nothing (#1998).
 * ⛔ The template is a customer-facing contract (#1836) — the fix lives here,
 * not in the file.
 */
export const DEPARTMENT_SYNONYMS: Record<string, string> = {
  'HR': 'hr',
};
