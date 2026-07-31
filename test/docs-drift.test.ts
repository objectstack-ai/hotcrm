// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Docs ↔ source drift guard (the AI-era safety net).
 *
 * The package docs under `src/docs/*.md` deliberately state the business-rule
 * thresholds that live in the flows (approval amounts, the stale-deal window,
 * sweep schedules, …). That is their whole value — and their whole risk: if a
 * flow changes and the prose doesn't, the doc silently starts lying.
 *
 * This test pins both halves. Each rule's value is EXTRACTED from the flow
 * source (single source of truth), turned into the string the doc is expected
 * to show, and every listed doc is asserted to contain it. Change a flow value
 * without updating the doc → this test goes red at PR time. It catches a human
 * editor AND an AI regeneration that drifted.
 *
 * It is intentionally low-tech (regex over source text, substring over the
 * markdown) so it stays readable and has no runtime/server dependency.
 */

// Resolved from this file's own location, not `process.cwd()`. The previous
// `join('src/flows', f)` only worked when vitest happened to be launched from
// the repo root — from a subdirectory, or an editor runner with a different
// working directory, this drift guard died with ENOENT instead of checking
// anything.
const FLOWS = (f: string) => readFileSync(join(REPO_ROOT, 'src/flows', f), 'utf8');
const DOC = (f: string) => readFileSync(join(REPO_ROOT, 'src/docs', f), 'utf8');

/** cron → the human label the docs use. Unknown cron ⇒ deliberate failure. */
const CRON_LABEL: Record<string, string> = {
  '30 7 * * *': '07:30',
  '0 1 * * *': '01:00',
  '0 * * * *': 'hourly',
  '0 8 * * *': '08:00',
  '0 0 * * *': '00:00',
};

type Rule = {
  label: string;
  /** Pull the raw value out of the flow source (capture group 1). */
  extract: () => string;
  /** Strings the doc may use to render that value — at least one must match. */
  display: (raw: string) => string[];
  /** Doc files that must each surface the value. */
  docs: string[];
};

const cap = (file: string, re: RegExp): string => {
  const m = FLOWS(file).match(re);
  if (!m) throw new Error(`drift test out of date: pattern ${re} not found in ${file}`);
  return m[1];
};

const money = (raw: string) => [`$${Number(raw).toLocaleString('en-US')}`, Number(raw).toLocaleString('en-US')];
const cronDisplay = (raw: string) => {
  const label = CRON_LABEL[raw];
  if (!label) throw new Error(`schedule '${raw}' changed — add it to CRON_LABEL and update the docs`);
  return [label];
};

const RULES: Rule[] = [
  {
    label: 'manager approval threshold',
    extract: () => cap('opportunity-approval.flow.ts', /record\.amount > (\d+) && \(?record\.approval_status/),
    display: money,
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'director approval threshold',
    extract: () => cap('opportunity-approval.flow.ts', /oppRecord\.amount > (\d+)/),
    display: money,
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'won-deal alert threshold',
    extract: () => cap('opportunity-won-alert.flow.ts', /record\.amount > (\d+)/),
    display: money,
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'stalled-deal window (days)',
    extract: () => cap('opportunity-stagnation.flow.ts', /STALE_THRESHOLD_DAYS = (\d+)/),
    display: (v) => [`${v} days`, `${v}-day`],
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'quote default validity (days)',
    extract: () => cap('quote-generation.flow.ts', /expirationDays'[\s\S]*?defaultValue: (\d+)/),
    display: (v) => [`**${v}**`, `${v} days`],
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'hot-lead score threshold',
    extract: () => cap('lead-assignment.flow.ts', /record\.rating >= (\d+)/),
    display: (v) => [`${v}★`, `${v} of 5`],
    docs: ['crm_sales.md'],
  },
  {
    label: 'stalled-deal sweep schedule',
    extract: () => cap('opportunity-stagnation.flow.ts', /schedule: '([^']+)'/),
    display: cronDisplay,
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'quote-expiration sweep schedule',
    extract: () => cap('quote-expiration.flow.ts', /schedule: '([^']+)'/),
    display: cronDisplay,
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'case SLA sweep schedule',
    extract: () => cap('case-sla-monitor.flow.ts', /schedule: '([^']+)'/),
    display: cronDisplay,
    docs: ['crm_service.md', 'crm_admin.md'],
  },
  {
    label: 'contract renewal sweep schedule',
    extract: () => cap('contract-renewal.flow.ts', /schedule: '([^']+)'/),
    display: cronDisplay,
    docs: ['crm_admin.md'],
  },
  {
    label: 'contract expiration sweep schedule',
    extract: () => cap('contract-expiration.flow.ts', /schedule: '([^']+)'/),
    display: cronDisplay,
    docs: ['crm_admin.md'],
  },
];

describe('package docs do not drift from the flows they document', () => {
  for (const rule of RULES) {
    it(`${rule.label}: docs match the flow source`, () => {
      const raw = rule.extract();
      const candidates = rule.display(raw);
      for (const docFile of rule.docs) {
        const text = DOC(docFile);
        const hit = candidates.some((c) => text.includes(c));
        expect(
          hit,
          `${docFile} should state the ${rule.label} (one of ${JSON.stringify(candidates)}) ` +
            `— the flow source now says "${raw}". Update the doc (or run the doc-sync agent).`,
        ).toBe(true);
      }
    });
  }
});

/**
 * Repo-tree drift — a doc must not advertise a directory that is gone.
 *
 * `src/agents/` outlived its deletion by three PRs. #512 removed the two
 * copilots and the whole directory, but seven maintainer docs kept printing
 * `src/agents/*.agent.ts` in their tree diagrams and registration tables, so
 * the next reader (human or agent) was told to put a file somewhere that does
 * not exist. `src/cubes/` had the same shape: dropped in favour of datasets
 * (ADR-0021, see the note in objectstack.config.ts), still drawn in two trees.
 *
 * Nothing checked, because a path in prose is just prose. This walks the
 * maintainer docs, pulls every `src/<dir>/` they mention, and resolves it
 * against the real tree. `docs/archive/` is deliberately excluded — it is a
 * historical record and is allowed to describe a repo that no longer exists.
 */
const TREE_DOCS = [
  'README.md',
  'AGENTS.md',
  'docs/README.md',
  'docs/STATUS.md',
  'docs/ARCHITECTURE.md',
  'docs/MAINTENANCE.md',
  'docs/DEPLOYMENT.md',
  'docs/developers/code_examples.md',
  'docs/developers/api_reference.md',
];

describe('maintainer docs do not point at directories that no longer exist', () => {
  for (const docFile of TREE_DOCS) {
    it(`${docFile}: every src/<dir>/ it names exists`, () => {
      const text = readFileSync(join(docFile), 'utf8');
      const named = new Set([...text.matchAll(/\bsrc\/([a-z][a-z0-9_]*)\//g)].map((m) => m[1]));
      const missing = [...named].filter((dir) => !existsSync(join('src', dir)));
      expect(
        missing,
        `${docFile} advertises src/ directories that do not exist: ${missing.join(', ')}. ` +
          'Delete the reference (or restore the directory) — a path in prose is still a promise.',
      ).toEqual([]);
    });
  }
});
