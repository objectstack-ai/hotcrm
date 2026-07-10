// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * CRM Positions (ADR-0090 D3 — formerly the role hierarchy).
 *
 * Positions are deliberately FLAT: no parent, no hierarchy. The v1 role
 * tree's reporting lines belong on the business-unit tree / manager chain,
 * which this app does not model — so the old `parentRole` links were
 * dropped rather than translated.
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
