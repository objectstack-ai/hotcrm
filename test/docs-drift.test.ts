// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/*
 * ─── SPLIT BY FAMILY (#1196) ─────────────────────────────────────────────────
 *
 * This file held thirteen independent `describe` families and had grown to
 * 99,746 bytes against the 102,400-byte ceiling in
 * `scripts/check-source-hygiene.mjs` — 97.4% full, with room for no rule at
 * all. That was not hypothetical: #1187 appended one, took the file to 107KB,
 * and shipped its rule as a sibling instead.
 *
 * The families moved out along the seams they already had — each `describe`
 * whole, header comment included, not one assertion rewritten. What stayed is
 * the family this file is named for and was written for: the published
 * business-rule values, EXTRACTED from the flow source and asserted against
 * the package docs.
 *
 * Where the others went. Add a new rule to the file whose subject it shares —
 * this one only if it reads a value out of a flow:
 *
 *   docs-src-tree-paths.test.ts     `src/<dir>/` paths a doc names or draws
 *   docs-runnable-samples.test.ts   samples a reader runs: documented agent
 *                                   names (#606), the action example (#813)
 *   docs-dashboard-tiles.test.ts    the dashboards page lists tiles that exist,
 *                                   and no docs page names one that does not (#949)
 *   docs-locale-callouts.test.ts    translated pages keep the English callouts
 *   docs-retired-personas.test.ts   product prose does not re-personify the
 *                                   retired copilots (#612)
 *   docs-metadata-counts.test.ts    docs state the counts the stack registers
 *   docs-declared-versions.test.ts  app version (#612), protocol (#728) and the
 *                                   `docs/STATUS.md` transcript (#1011)
 *
 * #814 split `test/metadata-references.test.ts` the same way and left a table
 * like this one, which was right — and left four comments elsewhere still
 * pointing at families that had moved, which became #931. So the pointers into
 * this file were swept and updated in the same PR as this split.
 */

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
type AnyRec = Record<string, any>;

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

/**
 * The same capture, taken from the COMPILED flow instead of the file text.
 *
 * The approval and won-alert amounts stopped being source literals in #599 —
 * they are interpolated from `src/objects/_thresholds.ts`, so the file now
 * reads `record.amount >= ${LARGE_DEAL_AMOUNT}` and a regex over the text finds
 * no digits to capture. Reading the compiled condition is not a workaround for
 * that, it is strictly better: `P` interpolates at build time, so this sees the
 * number the deployed flow actually cuts at, whatever spelling produced it —
 * a literal, a constant, or an arithmetic expression a text regex would have
 * silently mis-parsed.
 *
 * Every condition on the flow is searched (start-node configs and edges alike),
 * which is why the patterns below stay anchored on their own scope: `record.`
 * for the entry gate, `oppRecord.` for the director tier.
 */
const FLOWS_COMPILED: AnyRec[] = ((stack as AnyRec).flows ?? []) as AnyRec[];

/** `P` compiles to `{ dialect: 'cel', source }`; older conditions may be raw strings. */
const celSource = (condition: unknown): string =>
  typeof condition === 'string' ? condition : String((condition as AnyRec)?.source ?? '');

const conditionsOf = (flowName: string): string => {
  const flow = FLOWS_COMPILED.find((f) => f?.name === flowName);
  if (!flow) {
    throw new Error(`drift test out of date: no flow named "${flowName}" in the compiled stack`);
  }
  return [
    ...(((flow.nodes ?? []) as AnyRec[]).map((n) => celSource(n?.config?.condition))),
    ...(((flow.edges ?? []) as AnyRec[]).map((e) => celSource(e?.condition))),
  ].join('\n');
};

const capCel = (flowName: string, re: RegExp): string => {
  const m = conditionsOf(flowName).match(re);
  if (!m) throw new Error(`drift test out of date: pattern ${re} not found in the conditions of "${flowName}"`);
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
    // Anchored on the lowercase `record.` scope, which is what distinguishes
    // the START condition's entry gate from the director tier's
    // `oppRecord.amount > 500000` (the match is case-sensitive, so
    // `oppRecord.amount` cannot satisfy `record\.amount`). It used to lean on
    // the neighbouring `&& (record.approval_status` clause instead, which
    // broke the moment #633 inserted the `has(...)` / `!= null` totality
    // guards between the two — a drift detector should key on the value's own
    // scope, not on whatever happens to sit next to it.
    //
    // The OPERATOR is spelled out (`>=` since #1087) rather than made optional.
    // A `>=?` would keep matching through an operator flip and quietly publish
    // the same number under a changed meaning; as written, flipping the gate
    // fails here as "pattern not found in the conditions of …", which is the
    // right kind of loud — the published table in `crm_sales.md` / `crm_admin.md`
    // states the operator as well as the value, and both have to move together.
    extract: () => capCel('opportunity_approval', /record\.amount >= (\d+)/),
    display: money,
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'director approval threshold',
    extract: () => capCel('opportunity_approval', /oppRecord\.amount > (\d+)/),
    display: money,
    docs: ['crm_sales.md', 'crm_admin.md'],
  },
  {
    label: 'won-deal alert threshold',
    // `>=` since #1087, for the reason spelled out on the manager rule above.
    extract: () => capCel('opportunity_won_alert', /record\.amount >= (\d+)/),
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
