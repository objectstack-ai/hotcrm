// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * CRM Positions (ADR-0090 D3 — formerly the role hierarchy).
 *
 * Positions are deliberately FLAT: no parent, no hierarchy. The v1 role
 * tree's reporting lines belong on the business-unit tree / manager chain,
 * which this app does not model — so the old `parentRole` links were
 * dropped rather than translated.
 *
 * Flat also means visibility does NOT roll up: every rung that needs access to
 * a record carries its own sharing rule. That is why each leadership rung has
 * an explicit companion rule (`opportunity_executive_sharing`,
 * `case_director_sharing`, `campaign_leadership_*`) rather than inheriting the
 * manager's — a position that no sharing rule and no permission-set binding
 * names grants nothing at all (#488).
 */
export const CrmPositions = [
  { name: 'executive',          label: 'Executive' },
  { name: 'sales_director',     label: 'Sales Director' },
  { name: 'sales_manager',      label: 'Sales Manager' },
  { name: 'sales_rep',          label: 'Sales Representative' },
  { name: 'service_director',   label: 'Service Director' },
  { name: 'service_manager',    label: 'Service Manager' },
  { name: 'service_agent',      label: 'Service Agent' },
  { name: 'marketing_director', label: 'Marketing Director' },
  { name: 'marketing_manager',  label: 'Marketing Manager' },
  { name: 'marketing_user',     label: 'Marketing User' },
  // Territory groupings referenced by the account sharing rules.
  { name: 'na_sales_team',      label: 'NA Sales Team' },
  { name: 'eu_sales_team',      label: 'EU Sales Team' },
];
