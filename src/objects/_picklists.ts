// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { SelectOption } from '@objectstack/spec/data';

/**
 * Canonical picklist value sets shared across objects, flows, and actions.
 *
 * Several fields carry the same business vocabulary on more than one object
 * (`lead_source` on Lead/Contact/Opportunity, `industry` on Lead/Account,
 * `salutation` on Lead/Contact, `payment_terms` on Quote/Contract), and a few
 * flows/actions re-declare an object's own options inline (Task `type` in the
 * schedule_followup screen, Opportunity `stage` in mass_update_stage). Each
 * copy drifted independently (#490): the lead_conversion flow copies
 * `leadRecord.industry` / `leadRecord.lead_source` verbatim onto the created
 * Account/Opportunity, so any Lead-only value (`logistics`, `webinar`, …)
 * became an illegal enum value on the target object.
 *
 * Declaring the set ONCE here and spreading it into every declaration keeps
 * the vocabularies identical by construction. Cross-object copies (flows,
 * conversion mappings) are then always legal.
 *
 * NOTE: spread (`[...X]`) at every use site so each ObjectSchema gets its own
 * array instance — schemas must not alias one another's metadata.
 */

/** Salutation — Lead + Contact. Superset (incl. `prof`, formerly Contact-only). */
export const SALUTATION_OPTIONS: SelectOption[] = [
  { label: 'Mr.', value: 'mr' },
  { label: 'Ms.', value: 'ms' },
  { label: 'Mrs.', value: 'mrs' },
  { label: 'Dr.', value: 'dr' },
  { label: 'Prof.', value: 'prof' },
];

/**
 * Industry — Lead + Account. Superset (formerly 15 on Lead, 6 on Account);
 * lead_conversion copies `leadRecord.industry` onto the created Account, so
 * Account MUST accept every Lead value.
 */
export const INDUSTRY_OPTIONS: SelectOption[] = [
  { label: 'Technology',          value: 'technology' },
  { label: 'Software / SaaS',     value: 'software' },
  { label: 'Finance',             value: 'finance' },
  { label: 'Healthcare',          value: 'healthcare' },
  { label: 'Retail',              value: 'retail' },
  { label: 'Manufacturing',       value: 'manufacturing' },
  { label: 'Education',           value: 'education' },
  { label: 'Real Estate',         value: 'real_estate' },
  { label: 'Media & Entertainment', value: 'media' },
  { label: 'Logistics',           value: 'logistics' },
  { label: 'Hospitality',         value: 'hospitality' },
  { label: 'Energy & Utilities',  value: 'energy' },
  { label: 'Government',          value: 'government' },
  { label: 'Non-profit',          value: 'nonprofit' },
  { label: 'Other',               value: 'other' },
];

/**
 * Lead Source — Lead + Contact + Opportunity. Superset (formerly 12/5/6);
 * lead_conversion copies `leadRecord.lead_source` onto the created
 * Opportunity, so Opportunity MUST accept every Lead value.
 */
export const LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { label: 'Web',             value: 'web' },
  { label: 'Referral',        value: 'referral' },
  { label: 'Event / Trade Show', value: 'event' },
  { label: 'Webinar',         value: 'webinar' },
  { label: 'Partner',         value: 'partner' },
  { label: 'Advertisement',   value: 'advertisement' },
  { label: 'Paid Search',     value: 'paid_search' },
  { label: 'Social Media',    value: 'social' },
  { label: 'Content / Blog',  value: 'content' },
  { label: 'Cold Call',       value: 'cold_call' },
  { label: 'Email Campaign',  value: 'email_campaign' },
  { label: 'Other',           value: 'other' },
];

/**
 * Payment Terms — Quote + Contract. Superset (incl. `due_on_receipt`,
 * formerly Quote-only): an accepted quote's terms carry over to the contract,
 * so the contract vocabulary must cover every quote value.
 */
export const PAYMENT_TERMS_OPTIONS: SelectOption[] = [
  { label: 'Net 15', value: 'net_15' },
  { label: 'Net 30', value: 'net_30', default: true },
  { label: 'Net 60', value: 'net_60' },
  { label: 'Net 90', value: 'net_90' },
  { label: 'Due on Receipt', value: 'due_on_receipt' },
];

/**
 * Task Type — crm_task.type, also re-rendered as the `activityType` select in
 * the schedule_followup screen flow (which had drifted to a 5-value copy
 * missing `other`).
 */
export const TASK_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Follow-up', value: 'follow_up' },
  { label: 'Demo', value: 'demo' },
  { label: 'Other', value: 'other' },
];

/**
 * Opportunity Stage — crm_opportunity.stage, also re-rendered as the `stage`
 * param of the mass_update_stage action. Colors/default only matter on the
 * object schema; use {@link plainOptions} where a screen/param select wants
 * bare label/value pairs.
 */
export const OPPORTUNITY_STAGE_OPTIONS: SelectOption[] = [
  { label: 'Prospecting', value: 'prospecting', color: '#808080', default: true },
  { label: 'Qualification', value: 'qualification', color: '#FFA500' },
  { label: 'Needs Analysis', value: 'needs_analysis', color: '#FFD700' },
  { label: 'Proposal', value: 'proposal', color: '#4169E1' },
  { label: 'Negotiation', value: 'negotiation', color: '#9370DB' },
  { label: 'Closed Won', value: 'closed_won', color: '#00AA00' },
  { label: 'Closed Lost', value: 'closed_lost', color: '#FF0000' },
];

/** Project a canonical set down to bare `{ label, value }` pairs for flow
 * screens and action params, which don't understand color/default keys. */
export const plainOptions = (options: SelectOption[]): { label: string; value: string }[] =>
  options.map(({ label, value }) => ({ label, value }));
