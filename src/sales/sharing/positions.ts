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
 * Assigned Users panel. Seven positions distribute a set: five since #2200,
 * and the two marketing rungs since #2338. Until #2200 those five declared
 * none and reached their sets only through the platform's undeclared
 * fold of a held position's name onto a same-named set, which logs
 * `position_name_fold_grant` on every boot and which the platform has ruled to
 * retire (objectstack#13419, ruling B). A position added here that should grant
 * capability declares its sets the same way.
 *
 * ### Every position says what it is for (#2249)
 *
 * Each position carries a one-sentence business `description`, served with
 * the position's metadata (`GET /meta/position`) so Setup → Positions can tell
 * an admin who belongs in it before anyone is assigned. Measured on 18.1.0:
 * the list there shows Name, Label, Holders and Permission sets
 * (objectstack#25333) and no Description column yet. It names the business
 * job, not the rule wiring: the grants themselves are the sharing rules and
 * `permissionSets`, and a description that restated those would drift.
 * `test/position-descriptions.test.ts` pins that every position has one.
 *
 * The descriptions, like the labels, are English only: the platform's
 * translation bundle has no namespace for positions, so the four locale packs
 * translate neither (the same holds for the labels today).
 */
export const CrmPositions = [
  {
    name: 'executive',
    label: 'Executive',
    description: 'Company leadership: reads every large open deal across the pipeline, while the deal team keeps ownership.',
  },
  {
    name: 'sales_director',
    label: 'Sales Director',
    description: 'Leads the sales organization, gives the final sign-off on the largest deals and reads every large open opportunity.',
  },
  {
    name: 'sales_manager',
    label: 'Sales Manager',
    description: 'Runs a sales team: approves new accounts, lead conversions and large deals, and edits every active customer account.',
    permissionSets: ['sales_manager'],
  },
  {
    name: 'sales_rep',
    label: 'Sales Representative',
    description: 'Works leads and opportunities day to day and receives new leads by round-robin assignment.',
    permissionSets: ['sales_rep'],
  },
  {
    name: 'service_director',
    label: 'Service Director',
    description: 'Oversees customer service and reads every open critical case while a service manager handles it.',
  },
  // The escalation pool works tickets with the agent's own grants: the #1779
  // ruling (director seat, decision batch #92, 2026-09-08) bound the EXISTING
  // `service_agent` set to this position, and refused both a manager-specific
  // set (no puller for a manager-only grant) and rerouting the pool. Until
  // #2200 that binding was a renamed copy of the set, `service_manager`, which
  // the name fold picked up; it is declared here instead and the copy is gone.
  // A manager grant that DIFFERS from an agent's comes back as a product card
  // with its puller named, and only then as a set of its own.
  {
    name: 'service_manager',
    label: 'Service Manager',
    description: 'Works the escalation pool: escalated cases are handed to this position, which edits every open critical case.',
    permissionSets: ['service_agent'],
  },
  {
    name: 'service_agent',
    label: 'Service Agent',
    description: 'Handles customer cases, receives new cases by round-robin assignment and pulls unassigned cases from triage.',
    permissionSets: ['service_agent'],
  },
  // The two marketing rungs hold the marketing staff set (#2338 item 3). They
  // declared none, so a holder carried `crm_user` alone, whose campaign grant
  // is read-only: the object-level gate refused every campaign update with
  // 403 before the `campaign_leadership_*` edit share
  // (`src/marketing/sharing/campaign.sharing.ts`) was ever consulted, and the
  // campaign record offered no Edit and no Enroll. A rung that leads the
  // marketers does the marketers' work, enrolling members and tracking
  // responses included, so the existing set is bound rather than a new one
  // made. Measured on 18.2.0: that set alone writes every campaign (live and
  // completed alike), so for these two rungs the leadership share now grants
  // nothing beyond it.
  {
    name: 'marketing_director',
    label: 'Marketing Director',
    description: 'Leads marketing and edits every live campaign, whoever owns it.',
    permissionSets: ['marketing_user'],
  },
  {
    name: 'marketing_manager',
    label: 'Marketing Manager',
    description: 'Manages marketing campaigns and edits every live campaign, whoever owns it.',
    permissionSets: ['marketing_user'],
  },
  {
    name: 'marketing_user',
    label: 'Marketing User',
    description: 'Plans and runs marketing campaigns and their members day to day.',
    permissionSets: ['marketing_user'],
  },
  // Territory groupings referenced by the account sharing rules.
  {
    name: 'na_sales_team',
    label: 'NA Sales Team',
    description: 'Territory team for North America: edits every account in the North America territory.',
  },
  {
    name: 'eu_sales_team',
    label: 'EU Sales Team',
    description: 'Territory team for Europe: edits every account in the Europe (EMEA) territory.',
  },
];
