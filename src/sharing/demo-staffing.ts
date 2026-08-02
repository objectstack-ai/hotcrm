// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Demo-org staffing — WHO HOLDS THE POSITIONS `positions.ts` DECLARES (#640).
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
 * ### Why exactly these three people
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
 *
 * The other seven positions (`sales_director`, `executive`, `service_manager`,
 * `service_director`, `marketing_manager`, `marketing_director`,
 * `marketing_user`) stay UNSTAFFED on purpose: a real deployment staffs its own
 * people, and an empty bench is the honest depiction of that. The approval
 * nodes that route to them declare `onEmptyApprovers: 'admin_rescue'`, so an
 * empty bench holds for admin takeover instead of stranding the record.
 *
 * ### Why a rep holds TWO positions
 *
 * `na_sales_team` / `eu_sales_team` are territory groupings — no permission set
 * is bound to them, so on their own they widen WHICH RECORDS a user sees
 * without saying what a user may DO. Measured on a fresh install: a user
 * holding only `eu_sales_team` still reads the 2 EU accounts, because the
 * platform's additive baseline (ADR-0090 D5) gives every org member
 * `member_default` — i.e. the demo would show a generic member who happens to
 * see two accounts, not a sales rep. Pairing the territory with the functional
 * `sales_rep` position (which name-binds this app's `SalesRepProfile`) is what
 * makes the persona real: their own book, plus the territory.
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
];
