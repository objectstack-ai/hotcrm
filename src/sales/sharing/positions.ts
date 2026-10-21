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
 *
 * ### The binding is written here, never inferred from a name (#2200)
 *
 * A position names the permission sets it distributes in its own
 * `permissionSets` (ADR-0131 D3/D4): every holder holds every set listed, and
 * Setup shows the binding on the position's page and the holders on each set's
 * Assigned Users panel. Five positions distribute a set. Until #2200 they
 * declared none and reached their sets only through the platform's undeclared
 * fold of a held position's name onto a same-named set, which logs
 * `position_name_fold_grant` on every boot and which the platform has ruled to
 * retire (objectstack#13419, ruling B). A position added here that should grant
 * capability declares its sets the same way.
 */
export const CrmPositions = [
  { name: 'executive',          label: 'Executive' },
  { name: 'sales_director',     label: 'Sales Director' },
  { name: 'sales_manager',      label: 'Sales Manager',        permissionSets: ['sales_manager'] },
  { name: 'sales_rep',          label: 'Sales Representative', permissionSets: ['sales_rep'] },
  { name: 'service_director',   label: 'Service Director' },
  // The escalation pool works tickets with the agent's own grants: the #1779
  // ruling (director seat, decision batch #92, 2026-09-08) bound the EXISTING
  // `service_agent` set to this position, and refused both a manager-specific
  // set (no puller for a manager-only grant) and rerouting the pool. Until
  // #2200 that binding was a renamed copy of the set, `service_manager`, which
  // the name fold picked up; it is declared here instead and the copy is gone.
  // A manager grant that DIFFERS from an agent's comes back as a product card
  // with its puller named, and only then as a set of its own.
  { name: 'service_manager',    label: 'Service Manager',      permissionSets: ['service_agent'] },
  { name: 'service_agent',      label: 'Service Agent',        permissionSets: ['service_agent'] },
  { name: 'marketing_director', label: 'Marketing Director' },
  { name: 'marketing_manager',  label: 'Marketing Manager' },
  { name: 'marketing_user',     label: 'Marketing User',       permissionSets: ['marketing_user'] },
  // Territory groupings referenced by the account sharing rules.
  { name: 'na_sales_team',      label: 'NA Sales Team' },
  { name: 'eu_sales_team',      label: 'EU Sales Team' },
];
