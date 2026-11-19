// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The single-database multi-tenant pause (#2700) — the ONE list of the tests it
 * holds, and the only door through which any of them is held.
 *
 * Maintainer's order, 2026-11-19 (verbatim): 「本项目暂停考虑 单库多租户的兼容性问题」,
 * then 「立 p1 卡。清理相关任务，暂停相关测试」. HotCRM stops considering several
 * organizations sharing one database: the SaaS composition
 * (`HOTCRM_COMPOSITION=saas`, `tenant_admin`, `SaasTenantSeedData`),
 * cross-organization isolation, and per-organization uniqueness and ownership.
 * The code stays; the community (single-organization) app and every test of
 * its behaviour run as before.
 *
 * An entry holds either a whole FILE (no `case`) — `vitest.config.ts` excludes
 * it, so nothing in it is even imported — or one `describe` / `it` of a file
 * that is otherwise kept (`case` = its exact title), which that file routes
 * through `pauseGate` (`./multitenant-pause-gate.ts`), and which then reports
 * as skipped. A test is held here only when it was green on `main` the day it
 * was paused; nothing red hides behind this list. This file imports nothing,
 * because `vitest.config.ts` imports it.
 *
 * `test/multitenant-pause.test.ts` names every entry in the run's output and
 * pins the roster, so the list cannot grow quietly.
 *
 * RESTART (the maintainer resumes single-database multi-tenant work): delete
 * every entry below, then that guard, which goes red on an empty list to say
 * so. With no entry, the gate is the plain `describe` / `it` everywhere.
 */
export const MULTITENANT_PAUSE_CARD = '#2700';

export interface MultitenantPauseEntry {
  /** Repo-relative path of the test file. */
  readonly file: string;
  /** The exact title of the paused `describe` / `it`; absent = the whole file. */
  readonly case?: string;
  /** Why it is held: what it asserts about several organizations in one database. */
  readonly reason: string;
  readonly card: typeof MULTITENANT_PAUSE_CARD;
}

const card = MULTITENANT_PAUSE_CARD;

export const MULTITENANT_PAUSE: readonly MultitenantPauseEntry[] = [
  // ── the SaaS composition ─────────────────────────────────────────────────
  {
    file: 'test/saas-composition.test.ts', case: 'HOTCRM_COMPOSITION=saas', card,
    reason: 'the SaaS shape: its seed families, its admin set and its Admin Manual audience',
  },
  {
    file: 'test/saas-composition.test.ts', case: 'tenant_admin is an ORG admin, judged by the platform capability registry', card,
    reason: 'tenant_admin, the admin set only the SaaS shape registers',
  },
  {
    file: 'test/seed-locale-twins.test.ts', case: 'the SaaS shape registers the catalogue in both languages, each scoped', card,
    reason: 'SaasTenantSeedData, the seed only the SaaS shape registers',
  },
  {
    file: 'test/seed-dates-relative.test.ts', case: 'the SaaS tenant composition (SaasTenantSeedData)', card,
    reason: 'SaasTenantSeedData, the seed only the SaaS shape registers',
  },
  {
    file: 'test/permission-set-descriptions.test.ts', case: 'tenant_admin has a one-sentence business description', card,
    reason: 'tenant_admin, the admin set only the SaaS shape registers',
  },
  {
    file: 'test/o2c-receivables.test.ts', case: "the SaaS composition's administrator", card,
    reason: 'boots HOTCRM_COMPOSITION=saas to read the totals as tenant_admin',
  },
  // ── several organizations in one database ───────────────────────────────
  {
    file: 'test/hook-org-inheritance.test.ts', card,
    reason: 'boots the isolated (walled) posture with two tenants; every case is about the wall between them',
  },
  {
    file: 'test/account-name-tenant-scope.test.ts', case: 'the physical index set is tenant-scoped', card,
    reason: 'the per-organization (organization_id, name) unique index',
  },
  {
    file: 'test/account-name-tenant-scope.test.ts', case: 'two organizations can each have an "Acme Corp" (real SQLite)', card,
    reason: 'the same account name in two organizations of one database',
  },
  {
    file: 'test/case-number-tenant-scope.test.ts', case: 'the physical index set is tenant-scoped', card,
    reason: 'the per-organization (organization_id, case_number) unique index',
  },
  {
    file: 'test/case-number-tenant-scope.test.ts', case: 'case numbers collide per organization, never across (real SQLite)', card,
    reason: 'the same case number in two organizations of one database',
  },
  {
    file: 'test/case-number-tenant-scope.test.ts', case: 'the OLD table-composite spelling, re-measured', card,
    reason: 'an untenanted row escaping the per-organization composite index',
  },
  {
    file: 'test/contact-email-tenant-scope.test.ts', case: 'several organizations in one database (the org-bound boot)', card,
    reason: 'the contact dedupe scoped per organization, on rows of three organizations in one database',
  },
  {
    file: 'test/flow-scheduled-org-partition.test.ts', case: 'the declared organization_id actually resolves (#700)', card,
    reason: 'scheduled sweeps stamping the organization of rows seeded into a second organization',
  },
  {
    file: 'test/flow-scheduled-org-partition.test.ts', case: 'forecast_snapshot sums only the target row’s organization (#1372)', card,
    reason: 'one owner with deals in two organizations of one database',
  },
  {
    file: 'test/case-assignment.test.ts', case: 'stays inside the escalating case’s organization (AGENTS.md rule 10)', card,
    reason: 'a boot holding two organizations, proving the escalation pool does not cross between them',
  },
  {
    file: 'test/hooks-runtime.test.ts', case: 'the assignment rule and the duplicate scan stay inside the new lead’s organization (AGENTS.md rule 10)', card,
    reason: 'a boot holding two organizations, proving the lead routing and dedupe do not cross between them',
  },
  {
    file: 'test/forecast-owner-title.test.ts', case: 'a forecast in an organization the user is not a member of keeps its name', card,
    reason: 'a second organization in the shared boot, proving the rename does not reach it',
  },
];

/** The whole files the pause holds — `vitest.config.ts` excludes exactly these. */
export const MULTITENANT_PAUSED_FILES: readonly string[] = MULTITENANT_PAUSE
  .filter((e) => e.case === undefined)
  .map((e) => e.file);
