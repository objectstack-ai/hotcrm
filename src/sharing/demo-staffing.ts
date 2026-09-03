// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Demo-org staffing — WHO HOLDS THE POSITIONS `positions.ts` DECLARES (#640).
 *
 * ### ⛔ A row exists to make a MECHANISM visible. This is NOT an org chart.
 *
 * Every person below is the minimum needed to turn one dark mechanism on. A
 * position with no mechanism behind it stays EMPTY however tidy filling it in
 * would look, and `test/demo-staffing.test.ts` fails the build when one is
 * filled without a decision behind it. #640's principle, unchanged and quoted
 * verbatim where that guard enforces it: staffing a position is **a decision,
 * not a tidy-up**.
 *
 * Exactly two rows have ever crossed that fence — `service_agent` and
 * `service_manager`, on the maintainer ruling of 2026-08-31 — and the bar they
 * cleared is the only one that opens it: a shipped hook PICKS AN OWNER out of
 * that pool, so an empty pool is not a bench nobody sits on but a code path
 * that never runs on a demo box at all. "It looks unstaffed" is not the bar.
 * The other six leadership positions do not clear it and are still empty.
 *
 * ### The gap this table closes
 *
 * The app ships three layers of position-based access and, until now, only two
 * of them were real on a fresh install:
 *
 *   1. the rules install  — #621 (`sys_sharing_rule`: 9 seeded, 0 skipped)
 *   2. records match them — #638 (`crm_account.billing_country`: NA 6 / EU 2 / neither 1)
 *   3. someone holds the position — **nobody did** (`sys_user_position`: 0 rows)
 *
 * With layer 3 empty, a matching account materialises no grant: measured on a
 * fresh 17.0.0-rc.1 install, `sys_record_share` had 0 rows and every
 * position-based rule this app ships granted nobody anything. The same hole ran
 * through `opportunity_approval` — its `manager_review` node routes to the
 * `sales_manager` position, so submitting a deal opened a request with an empty
 * approver slate while `lockRecord: true` held the record hostage.
 *
 * ### Why this is a TABLE and not code
 *
 * Adding a person to the demo org is adding a ROW here. Nothing else changes:
 * `scripts/demo-staff.ts` walks this array, and `test/demo-staffing.test.ts`
 * checks each row against the declared positions, the sharing rules and the
 * approval nodes. A row that names a position no rule and no permission set
 * mentions is a row that grants nothing (#488) — the test says so by name.
 *
 * ### Why this file is NOT metadata, and MUST NOT become metadata
 *
 * It is deliberately not exported from `./index.ts` and not registered in
 * `objectstack.config.ts`, so it is not in the published artifact. That is the
 * hard constraint of #640, not a stylistic choice: **a real deployment must
 * install none of these people.** Shipping synthetic users into a customer org
 * would be worse than shipping no staffing at all, and the only way to make
 * that impossible rather than unlikely is for the artifact to contain no
 * mechanism that can create a user. `test/demo-staffing.test.ts` pins exactly
 * that: no seed dataset and no flow node in this app targets `sys_user`,
 * `sys_member`, `sys_user_position` or `sys_record_share`.
 *
 * Staffing therefore happens on the demo path only — `pnpm demo:staff`, run by
 * a developer against their own local dev server, through the platform's own
 * admin surfaces (`/api/v1/auth/admin/create-user`, the `sys_user_position`
 * data API, `POST /api/v1/sharing/rules/:id/evaluate`). Those users are REAL,
 * loginable accounts created by better-auth, not raw `sys_user` rows: identity
 * tables are `managedBy: 'better-auth'` and direct data-API inserts are refused
 * by the ADR-0092 write guard, which is also why a seed cannot do this and why
 * the note at the foot of `src/data/index.ts` says a seed can never name a user.
 *
 * ### Why exactly these five people
 *
 * Not an org chart — the smallest set that makes each dark mechanism visible:
 *
 *   - the two reps make TERRITORY SHARING observable for the first time. They
 *     must be users who do NOT own the accounts: `crm_account` is `private`, so
 *     the OWD baseline already admits a record's owner and a share to the owner
 *     proves nothing. `demo_bootstrap` claims every seeded record for the first
 *     user (the dev admin, #622) and staffing deliberately does not touch that —
 *     the reps stay non-owners, which is the whole point.
 *   - the sales manager makes `opportunity_approval`'s `manager_review` resolve
 *     to a non-empty slate for the first time.
 *   - the service AGENT is the case INTAKE POOL. `case_auto_assign`
 *     (`src/objects/_case-assignment.ts`) round-robins an ownerless case — a
 *     web-to-case submission, an email import — to the least-loaded holder of
 *     `service_agent`. With nobody holding it the hook took its no-op path on
 *     every demo box and the `unassigned_triage` tab was the entire story. The
 *     same row gives `case_unassigned_triage_sharing` its first recipient.
 *   - the service MANAGER is the ESCALATION POOL. `case_escalation_reassign`
 *     hands a case being escalated to the least-loaded `service_manager`, and
 *     `case_escalation_sharing` grants that position edit on open critical
 *     cases. Both had zero holders, so escalating a case moved nothing and
 *     granted nobody anything.
 *
 * ⚠️ Measured, and written down because the card that authorised those two
 * rows over-counted: staffing them does NOT light `case_director_sharing`. That
 * rule's recipient is `service_director`, which the same ruling leaves empty.
 * The fourth mechanism these two rows actually reach is
 * `case_unassigned_triage_sharing`, not the director rule.
 *
 * The other six positions (`sales_director`, `executive`, `service_director`,
 * `marketing_manager`, `marketing_director`, `marketing_user`) stay UNSTAFFED
 * on purpose: a real deployment staffs its own people, and an empty bench is
 * the honest depiction of that. None of them is an assignment POOL — each only
 * RECEIVES a share or an approval, a mechanism the staffed reps and sales
 * manager already demonstrate — and the approval nodes that route to them
 * declare `onEmptyApprovers: 'admin_rescue'`, so an empty bench holds for admin
 * takeover instead of stranding the record.
 *
 * ### Why a rep holds TWO positions — and what actually bounds the territory
 *
 * `na_sales_team` / `eu_sales_team` are territory groupings: no permission set
 * is bound to either, so holding one says nothing about what a user may DO.
 * Measured on a fresh install, a user holding ONLY `eu_sales_team` already
 * reads the 2 EU accounts — `POST /api/v1/security/explain` for that user:
 *
 *     principal        positions [org_member, eu_sales_team, everyone]
 *                      → permission set(s) [member_default]
 *     object_crud      grants — read on 'crm_account' is granted by [member_default]
 *     owd_baseline     narrows — Record baseline (OWD) is private: rows are
 *                      owner-visible only; sharing can only WIDEN from here.
 *     depth            Effective read depth: 'own' (ADR-0057 D1 — widest
 *                      across granting sets)
 *
 * Read that layer stack carefully, because it says which layer is doing which
 * job — and the answer is NOT "the profile narrows them to their territory":
 *
 *   - the OBJECT-LEVEL door on `crm_account` is opened by `member_default`, the
 *     platform's additive baseline that every org member gets (ADR-0090 D5).
 *     It is open with or without `sales_rep`.
 *   - the ROW SET is decided one layer down and is the whole ballgame:
 *     `crm_account` is `sharingModel: 'private'`, so the OWD baseline admits
 *     only rows the caller OWNS, and `sys_record_share` can only widen it. The
 *     reps own nothing (`demo_bootstrap` claimed every seeded record for the
 *     dev admin), so their row set is exactly the grants their territory rule
 *     materialised — 6 for NA, 2 for EU, and the SG account for nobody.
 *
 * So adding `sales_rep` widens no rows at all: its `crm_account` grant is
 * `viewAllRecords: false, readScope: 'own'`, the same depth `member_default`
 * already computes ("widest across granting sets" — an equal depth changes
 * nothing). What it adds is what the persona may DO — create/edit, the
 * `health_score` / `annual_revenue` field grants, export — i.e. it turns a
 * generic org member who happens to see two records into a sales rep.
 *
 * The falsifiable part, and the reason `test/demo-staffing.test.ts` pins it: a
 * set bound to a position a territory rep holds MUST NOT grant `viewAllRecords`
 * on `crm_account`. That would widen the depth to all-rows and the rep would
 * read all nine accounts, so the territory grant would stop proving anything
 * while still looking staffed. This is not hypothetical — it is exactly what
 * the sales manager does: `SalesManagerProfile` declares `viewAllRecords: true`
 * and she reads all 9 (measured), which is correct for a manager and would be
 * silent death for a territory demo.
 */

/** One person in the demo org. Add a person = add a row. */
export type DemoStaffMember = {
  /** Stable key used in logs and test failures. Never stored. */
  readonly key: string;
  /** Display name on the account. */
  readonly name: string;
  /** Login. `@objectos.ai` matches the platform's own dev-admin convention. */
  readonly email: string;
  /**
   * Dev-only password. Same class of secret as the platform's `admin123`
   * dev-admin seed: it only ever reaches a local demo box, because nothing in
   * the published artifact reads this file. Minimum 8 chars (better-auth's
   * `minPasswordLength`).
   */
  readonly password: string;
  /**
   * Positions this person holds, by machine name. Every entry must exist in
   * `CrmPositions` — a position the app does not declare grants nothing and
   * cannot be granted anything.
   */
  readonly positions: readonly string[];
  /** What staffing this person makes observable. Asserted to be non-empty. */
  readonly demonstrates: string;
};

export const DemoOrgStaffing: readonly DemoStaffMember[] = [
  {
    key: 'na_rep',
    name: 'Nina Reyes',
    email: 'na.rep@objectos.ai',
    password: 'demo1234',
    positions: ['sales_rep', 'na_sales_team'],
    demonstrates:
      'north_america_territory: reads the 6 US/CA/MX accounts she does not own, and neither ' +
      'the 2 EU accounts nor the 1 account in no territory.',
  },
  {
    key: 'eu_rep',
    name: 'Emil Roth',
    email: 'eu.rep@objectos.ai',
    password: 'demo1234',
    positions: ['sales_rep', 'eu_sales_team'],
    demonstrates:
      'europe_territory: reads the 2 UK/DE accounts he does not own, and neither the 6 NA ' +
      'accounts nor the 1 account in no territory.',
  },
  {
    key: 'sales_manager',
    name: 'Marta Quinn',
    email: 'sales.manager@objectos.ai',
    password: 'demo1234',
    positions: ['sales_manager'],
    demonstrates:
      "opportunity_approval's manager_review node resolves to a non-empty approver slate, and " +
      'account_team_sharing hands her the active customer accounts.',
  },
  {
    key: 'service_agent',
    name: 'Priya Raman',
    email: 'service.agent@objectos.ai',
    password: 'demo1234',
    positions: ['service_agent'],
    demonstrates:
      'case_auto_assign: an ownerless case round-robins onto her as the least-loaded holder of ' +
      'the service_agent pool, and case_unassigned_triage_sharing gives her edit on the open ' +
      'cases nobody owns.',
  },
  {
    key: 'service_manager',
    name: 'Tomas Okafor',
    email: 'service.manager@objectos.ai',
    password: 'demo1234',
    positions: ['service_manager'],
    demonstrates:
      'case_escalation_reassign: a case moves to him on the escalation transition as the ' +
      'least-loaded holder of the service_manager pool, and case_escalation_sharing grants him ' +
      'edit on the open critical cases he does not own.',
  },
];
