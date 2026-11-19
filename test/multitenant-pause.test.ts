// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import vitestConfig from '../vitest.config';
import {
  MULTITENANT_PAUSE, MULTITENANT_PAUSE_CARD, MULTITENANT_PAUSED_FILES, type MultitenantPauseEntry,
} from './helpers/multitenant-pause';

/**
 * The single-database multi-tenant pause (#2700) is visible and cannot grow
 * quietly.
 *
 * `test/helpers/multitenant-pause.ts` holds the one list of what the pause
 * holds. A paused whole file is excluded by `vitest.config.ts`, so it is absent
 * from the run's output; each entry below is therefore its own case, titled
 * with the card and the file, so the run names every one of them. The roster is
 * pinned here as well: adding an entry is an edit to this file too, in review.
 *
 * Restart condition: the maintainer resumes single-database multi-tenant work
 * for HotCRM. Then the list is emptied, and this guard is deleted with it.
 */

const label = (e: MultitenantPauseEntry): string => (e.case === undefined ? e.file : `${e.file} › ${e.case}`);

/** What #2700 classified as paused — the PR's classification table, row for row. */
const ROSTER = [
  'test/saas-composition.test.ts › HOTCRM_COMPOSITION=saas',
  'test/saas-composition.test.ts › tenant_admin is an ORG admin, judged by the platform capability registry',
  'test/seed-locale-twins.test.ts › the SaaS shape registers the catalogue in both languages, each scoped',
  'test/seed-dates-relative.test.ts › the SaaS tenant composition (SaasTenantSeedData)',
  'test/permission-set-descriptions.test.ts › tenant_admin has a one-sentence business description',
  "test/o2c-receivables.test.ts › the SaaS composition's administrator",
  'test/hook-org-inheritance.test.ts',
  'test/account-name-tenant-scope.test.ts › the physical index set is tenant-scoped',
  'test/account-name-tenant-scope.test.ts › two organizations can each have an "Acme Corp" (real SQLite)',
  'test/case-number-tenant-scope.test.ts › the physical index set is tenant-scoped',
  'test/case-number-tenant-scope.test.ts › case numbers collide per organization, never across (real SQLite)',
  'test/case-number-tenant-scope.test.ts › the OLD table-composite spelling, re-measured',
  'test/contact-email-tenant-scope.test.ts › several organizations in one database (the org-bound boot)',
  'test/flow-scheduled-org-partition.test.ts › the declared organization_id actually resolves (#700)',
  'test/flow-scheduled-org-partition.test.ts › forecast_snapshot sums only the target row’s organization (#1372)',
  'test/case-assignment.test.ts › stays inside the escalating case’s organization (AGENTS.md rule 10)',
  'test/hooks-runtime.test.ts › the assignment rule and the duplicate scan stay inside the new lead’s organization (AGENTS.md rule 10)',
  'test/forecast-owner-title.test.ts › a forecast in an organization the user is not a member of keeps its name',
];

const source = (file: string): string => readFileSync(join(REPO_ROOT, file), 'utf8');

const GATE_IMPORT = /import \{ pauseGate \} from '\.\/helpers\/multitenant-pause-gate'/;

/** Every single- or double-quoted string literal in a source text (no escapes inside). */
const stringLiterals = (text: string): string[] =>
  [...text.matchAll(/(['"])((?:(?!\1)[^\\\n])*)\1/g)].map((m) => m[2]!);

/** The literal titles a file hands the gate: `pause.describe('…'`, `pause.it("…"`. */
const gatedLiteralTitles = (text: string): string[] =>
  [...text.matchAll(/\bpause\.(?:describe|it)\(\s*(['"])((?:(?!\1).)*)\1/g)].map((m) => m[2]!);

describe(`the single-database multi-tenant pause (${MULTITENANT_PAUSE_CARD})`, () => {
  it(`is still in force — restart when the maintainer resumes single-database multi-tenant work (${MULTITENANT_PAUSE_CARD})`, () => {
    expect(
      MULTITENANT_PAUSE.length,
      `the pause list is empty: ${MULTITENANT_PAUSE_CARD}'s restart condition is met — delete this guard and the gate with it`,
    ).toBeGreaterThan(0);
  });

  it('holds exactly the classified roster, so it cannot grow quietly', () => {
    expect(MULTITENANT_PAUSE.map(label)).toEqual(ROSTER);
  });

  it('every entry names the card and a reason', () => {
    for (const e of MULTITENANT_PAUSE) {
      expect(e.card, label(e)).toBe(MULTITENANT_PAUSE_CARD);
      expect(e.reason.trim().length, label(e)).toBeGreaterThan(0);
    }
  });

  it('excludes exactly the paused whole files from the run', () => {
    const exclude = (vitestConfig as { test?: { exclude?: string[] } }).test?.exclude ?? [];
    expect(exclude).toEqual(expect.arrayContaining([...MULTITENANT_PAUSED_FILES]));
    expect(exclude.filter((p) => p.startsWith('test/'))).toEqual([...MULTITENANT_PAUSED_FILES]);
  });

  it.each(MULTITENANT_PAUSE.map((e) => [label(e), e] as const))(`paused (${MULTITENANT_PAUSE_CARD}): %s`, (_label, e) => {
    expect(existsSync(join(REPO_ROOT, e.file)), `${e.file} does not exist`).toBe(true);
    const text = source(e.file);
    if (e.case === undefined) {
      // Excluded whole, so a gate inside it would hold nothing.
      expect(text, `${e.file} is paused whole and routes nothing through the gate`).not.toMatch(GATE_IMPORT);
      return;
    }
    // A case entry bites only if its file calls the gate and spells that exact title.
    expect(text, `${e.file} does not call the pause gate`).toMatch(GATE_IMPORT);
    expect(text).toContain('pauseGate(import.meta.url)');
    expect(stringLiterals(text), `${e.file} spells no "${e.case}"`).toContain(e.case);
  });

  it('every file that calls the gate is on the list, with every title it gates', () => {
    // A gated title missing from the list runs as usual, so nothing is wrong
    // with it at run time; it is still a pause someone meant and did not list.
    const listed = new Map<string, string[]>();
    for (const e of MULTITENANT_PAUSE) if (e.case !== undefined) listed.set(e.file, [...(listed.get(e.file) ?? []), e.case]);
    const callers = readdirSync(join(REPO_ROOT, 'test'))
      .filter((f) => f.endsWith('.test.ts'))
      .map((f) => `test/${f}`)
      .filter((f) => GATE_IMPORT.test(source(f)));
    expect(callers.sort()).toEqual([...listed.keys()].sort());
    for (const file of callers) {
      for (const title of gatedLiteralTitles(source(file))) expect(listed.get(file), file).toContain(title);
    }
  });
});
