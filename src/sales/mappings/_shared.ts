// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Shared value maps for the import mappings.
 *
 * The import path already matches a picklist cell against the field's option
 * LABELS and VALUES, case-insensitively (`import-coerce.ts` → `matchOption`),
 * so "Technology" / "technology" both land without any help from us. These
 * maps exist only for the vocabulary a *foreign* spreadsheet uses — the words
 * a Salesforce/HubSpot/Excel export writes that HotCRM has no option for
 * ("SaaS", "Trade Show", "Client"). Anything not listed here falls through
 * untouched and is matched normally; an unknown value fails its row with
 * `invalid_option` rather than being silently dropped.
 *
 * Keep these lists small and defensible. They are a translation table for
 * known synonyms, NOT a "make any spreadsheet work" fallback — every entry
 * here is a value a real export produces, and the row-level error is the
 * intended outcome for everything else.
 */

/** Foreign spellings → `INDUSTRY_OPTIONS` values (`src/objects/_picklists.ts`). */
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

/** Foreign spellings → `LEAD_SOURCE_OPTIONS` values. */
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
