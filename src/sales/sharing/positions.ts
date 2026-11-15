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
 * Assigned Users panel. Eight positions distribute a set: five since #2200,
 * the two marketing rungs since #2338, and `crm_ar_accountant` since #2315. Until #2200 those five declared
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
 *
 * ### Every position names the name it had before 6.2.0 (#2458)
 *
 * All twelve took the `crm_` prefix in 6.2.0 (#2437): from ObjectStack 18.4.0 a
 * position is one slot per name in the whole environment (ADR-0150 D7), so
 * `os lint --strict` asks every position to carry its package's prefix. An
 * assignment (`sys_user_position`) stores the position's NAME, so after that
 * upgrade every holder of an old name held a position that no longer exists,
 * and lost every permission set and sharing rule it gave them, silently.
 *
 * Each position therefore declares its earlier name in `renamedFrom`
 * (`PositionSchema`, 18.4.0). At every boot the platform moves each holder row
 * of an old name to the new one, in every organization, as the system; once
 * moved, nothing is left to move, so the next boot writes nothing. It moves
 * holders only: a sharing rule, queue member or record share an administrator
 * added in Setup under an old name keeps it, and the boot log names each one.
 * It runs at boot, so an install that upgrades without restarting moves the
 * holders at its next start. `test/position-holder-move.test.ts` pins the
 * twelve declarations and measures the move over a database file.
 *
 * ⛔ Keep an entry once it ships: an organization that skips a version still
 * has its holders under the old name. A position renamed again lists both
 * earlier names.
 */
export const CrmPositions = [
  {
    name: 'crm_executive',
    renamedFrom: ['executive'],
    label: 'Executive',
    description: 'Company leadership, read only: reads every account, deal, quote, contract, forecast and case a sales manager reads, while the teams keep ownership.',
    // Read only (#2492, ruled A). Before it the position held no set: the
    // large-deal shares, which stay, were all a holder could read.
    permissionSets: ['sales_leadership'],
  },
  {
    name: 'crm_sales_director',
    renamedFrom: ['sales_director'],
    label: 'Sales Director',
    description: 'Leads the sales organization, gives the final sign-off on the largest deals and reads everything a sales manager reads, read only.',
    permissionSets: ['sales_leadership'],
  },
  {
    name: 'crm_sales_manager',
    renamedFrom: ['sales_manager'],
    label: 'Sales Manager',
    description: 'Runs a sales team: approves new accounts, lead conversions and large deals, and edits every active customer account.',
    permissionSets: ['sales_manager'],
  },
  {
    name: 'crm_sales_rep',
    renamedFrom: ['sales_rep'],
    label: 'Sales Representative',
    description: 'Works leads and opportunities day to day and receives new leads from the Lead Intake queue.',
    permissionSets: ['sales_rep'],
  },
  {
    name: 'crm_service_director',
    renamedFrom: ['service_director'],
    label: 'Service Director',
    description: 'Oversees customer service and reads every open critical case while a service manager handles it.',
    // Read only (#2490, ruled A): the set reads cases with no View All, so
    // `case_director_sharing` is the reach. Before it the position held no
    // set, and the share widened nothing.
    permissionSets: ['service_director'],
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
    name: 'crm_service_manager',
    renamedFrom: ['service_manager'],
    label: 'Service Manager',
    description: 'Works the escalation pool: escalated cases are handed to this position, which edits every open critical case.',
    permissionSets: ['service_agent'],
  },
  {
    name: 'crm_service_agent',
    renamedFrom: ['service_agent'],
    label: 'Service Agent',
    description: 'Handles customer cases, receives new cases from the Support Intake queue and claims the ones still waiting there.',
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
    name: 'crm_marketing_director',
    renamedFrom: ['marketing_director'],
    label: 'Marketing Director',
    description: 'Leads marketing and edits every live campaign, whoever owns it.',
    permissionSets: ['marketing_user'],
  },
  {
    name: 'crm_marketing_manager',
    renamedFrom: ['marketing_manager'],
    label: 'Marketing Manager',
    description: 'Manages marketing campaigns and edits every live campaign, whoever owns it.',
    permissionSets: ['marketing_user'],
  },
  {
    name: 'crm_marketing_user',
    renamedFrom: ['marketing_user'],
    label: 'Marketing User',
    description: 'Plans and runs marketing campaigns and their members day to day.',
    permissionSets: ['marketing_user'],
  },
  // Finance's position for the Order to Cash module (#2315): it distributes
  // the `ar_accountant` set, which writes invoices and payments.
  {
    name: 'crm_ar_accountant',
    label: 'Accounts Receivable',
    description: 'Finance: enters and imports the invoices and payments that sales sees on each contract.',
    permissionSets: ['ar_accountant'],
  },
  // Project Delivery (#2316 phase 1, `docs/architecture/psa-module-plan.md`,
  // *Permissions, positions, sharing*). Approvals route to these positions or
  // to a stamped approver field, never to a named person. The director and
  // the PMO run delivery AND watch its money, so they hold both sets.
  {
    name: 'crm_project_director',
    label: 'Project Director',
    description: 'Leads project delivery: runs projects and reads every project, timesheet and expense with its cost and margin.',
    permissionSets: ['project_manager', 'finance_controller'],
  },
  {
    name: 'crm_pmo',
    label: 'PMO',
    description: 'The project management office: reads every project with its cost and margin, keeps the rate cards and runs projects.',
    permissionSets: ['project_manager', 'finance_controller'],
  },
  {
    name: 'crm_project_manager',
    label: 'Project Manager',
    description: 'Opens and runs projects, staffs them at a rate card and approves the team\'s timesheets and expenses.',
    permissionSets: ['project_manager'],
  },
  {
    name: 'crm_project_member',
    label: 'Project Team Member',
    description: 'A consultant staffed on projects: books time and expenses on the projects they are staffed on.',
    permissionSets: ['project_member'],
  },
  {
    name: 'crm_finance_controller',
    label: 'Finance Controller',
    description: 'Finance: watches project cost and margin, sets project budgets and keeps the rate cards.',
    permissionSets: ['finance_controller'],
  },
  // Territory groupings referenced by the account sharing rules.
  {
    name: 'crm_na_sales_team',
    renamedFrom: ['na_sales_team'],
    label: 'NA Sales Team',
    description: 'Territory team for North America: edits every account in the North America territory.',
  },
  {
    name: 'crm_eu_sales_team',
    renamedFrom: ['eu_sales_team'],
    label: 'EU Sales Team',
    description: 'Territory team for Europe: edits every account in the Europe (EMEA) territory.',
  },
];
