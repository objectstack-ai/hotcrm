// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
 *   docs-src-tree-paths.test.ts     `src/<dir>/` paths a doc names or draws, and the
 *                                   layout the `.github/instructions/` agent briefs
 *                                   name (#1233)
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
 *
 * Since #1135 it also pins the two `content/docs/**` pages that quote a CEL
 * condition VERBATIM — see the second `describe` at the bottom of this file.
 * Same subject (a value read out of a flow), same extractor, a different
 * publication surface.
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

/*
 * ─── THE `content/docs/**` THRESHOLD CELL (#1135) ────────────────────────────
 *
 * The rules above pin `src/docs/*.md`. That is one of two documentation
 * surfaces stating the large-deal operator, and until now the only guarded one:
 * #1128 flipped the gate from `>` to `>=`, the extractor above stopped matching
 * and threw, and `src/docs` was corrected in the same PR — while the 21
 * `content/docs/**` product pages shipped the old operator for about two hours
 * until #1127 was dispatched by hand. `automation-docs-coverage.test.ts` does
 * read those pages, but keys on each flow's row label and trigger cell and
 * never on the threshold cell.
 *
 * Two assertions, both keyed on the SAME compiled condition the rules above
 * read — no phrase table, no locale judgement, no prose (a per-locale phrase
 * table over prose is #1018's subject: Chinese carries no word-for-word "or
 * more", `超过` being strictly exclusive against `及以上` / `达到`, so such a
 * table is not a transliteration of the English one and getting its strictness
 * right is its own design).
 *
 *   1. The two pages that quote the condition VERBATIM — `sales/opportunities`
 *      and `sales/pipeline-management`, three locales each, six lines — quote
 *      the condition the compiled stack actually carries. String equality
 *      against the artefact.
 *
 *   2. The reverse direction, which is the check #1127 used by hand: no page
 *      under `content/docs/**` states the threshold EXCLUSIVELY. Cheap to keep,
 *      and it covers the prose pages that do not quote the CEL at all.
 *
 * ## Loud by construction, in both directions
 *
 * Every extraction goes through `capCel`, so a pattern that stops matching
 * throws `drift test out of date` instead of quietly asserting nothing —
 * deliberately, and it is what makes the exclusive-phrasing scan honest:
 * banning "over $100K" is only correct while the compiled gate is inclusive.
 * Flip the flow back to `>` and this block does not go on banning the now-
 * correct wording, it throws and demands a rewrite. ⛔ Never turn any of it
 * into "skip if not found" — that is the false green this repo keeps paying
 * for.
 *
 * The `$100K` abbreviation the pages use is DERIVED from the compiled amount
 * rather than written here, so a value change moves the scan with it; an amount
 * that has no such abbreviation throws rather than silently scanning for a
 * phrasing no page could contain.
 */
describe('published docs pages do not drift from the large-deal condition', () => {
  /** Depth-first walk of `content/docs`, REPO_ROOT-relative. */
  const walkDocs = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkDocs(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  const PAGES = walkDocs('content/docs');
  const PAGE = (rel: string) => readFileSync(join(REPO_ROOT, rel), 'utf8');

  /**
   * The pages that present the condition as the authoritative "where is this
   * configured?" answer — the copy-paste surface that motivated #1127.
   */
  const VERBATIM_PAGES = [
    'content/docs/sales/opportunities.mdx',
    'content/docs/sales/opportunities.zh-Hans.mdx',
    'content/docs/sales/opportunities.zh-Hant.mdx',
    'content/docs/sales/pipeline-management.mdx',
    'content/docs/sales/pipeline-management.zh-Hans.mdx',
    'content/docs/sales/pipeline-management.zh-Hant.mdx',
  ];

  /**
   * The whole expression, captured out of the compiled stack — operator
   * included, which is the half `#1128` moved. The digits stay a `\d+` so a
   * VALUE change is caught as a failing assertion naming the page, while an
   * OPERATOR change misses the pattern and throws.
   */
  const condition = () => capCel('opportunity_won_alert', /(record\.amount >= \d+)/);
  const amount = () => capCel('opportunity_won_alert', /record\.amount >= (\d+)/);

  /** `100000` → the money spellings the pages actually use: `$100,000`, `$100K`. */
  const moneyForms = (raw: string): string[] => {
    const n = Number(raw);
    const forms = [`$${n.toLocaleString('en-US')}`];
    if (n % 1000 !== 0) {
      throw new Error(
        `drift test out of date: large-deal amount ${raw} is not a whole number of thousands, ` +
          `so the "$100K"-style abbreviation the docs pages use cannot be derived from it. ` +
          `Teach moneyForms the new spelling rather than dropping the scan.`,
      );
    }
    forms.push(`$${n / 1000}K`);
    if (n % 1_000_000 === 0) forms.push(`$${n / 1_000_000}M`);
    return forms;
  };

  /**
   * Ways of saying "strictly greater than", in the three locales the docs ship.
   *
   * The scan is anchored on the large-deal AMOUNT, which is what keeps it from
   * flagging the director tier: `HIGH_VALUE_DEAL_AMOUNT` is deliberately
   * exclusive, so `> $500K` is correct prose on a dozen pages. The one case
   * that collides is the two thresholds becoming the same number — measured
   * while proving this guard can fail, and it reports 27 pages. If that day
   * comes the collision is the defect, not the prose.
   */
  const EXCLUSIVE_LEAD_INS = [
    'over ',
    'above ',
    'more than ',
    'greater than ',
    'exceeds ',
    'exceeding ',
    '超过',
    '超过 ',
    '超過',
    '超過 ',
    '高于',
    '高于 ',
    '高於',
    '高於 ',
    '大于',
    '大于 ',
    '大於',
    '大於 ',
    '>',
    '> ',
  ];

  const exclusivePhrasings = (raw: string): string[] => [
    ...moneyForms(raw).flatMap((m) => EXCLUSIVE_LEAD_INS.map((lead) => `${lead}${m}`)),
    // The raw CEL an author could paste back in — the exact shape #1128 left behind.
    `record.amount > ${raw}`,
  ];

  it('reads the real published pages, and the pages it names still exist', () => {
    // Vacuity guard. A walk that returned nothing would pass both assertions
    // below by scanning nothing at all.
    expect(
      PAGES.length,
      'no `.mdx` pages found under content/docs — this guard has gone vacuous',
    ).toBeGreaterThan(100);

    const missing = VERBATIM_PAGES.filter((p) => !existsSync(join(REPO_ROOT, p)));
    if (missing.length > 0) {
      throw new Error(
        `drift test out of date: these pages no longer exist: ${missing.join(', ')}. ` +
          `They were guarded because they quote the large-deal CEL condition verbatim — ` +
          `point this list at wherever that quote moved to, do not delete the entry.`,
      );
    }
  });

  it('the pages quoting the CEL condition verbatim quote the compiled one', () => {
    const expected = condition();
    for (const page of VERBATIM_PAGES) {
      expect(
        PAGE(page).includes(expected),
        `${page} should quote the large-deal condition exactly as the compiled stack ` +
          `carries it — \`${expected}\`. The published page presents this string as the ` +
          `authoritative answer to "where is this configured?", so a reader copies it. ` +
          `Update the page (all three locales quote the same condition).`,
      ).toBe(true);
    }
  });

  it('no content/docs page states the large-deal threshold exclusively', () => {
    const phrasings = exclusivePhrasings(amount());
    const hits = PAGES.flatMap((page) => {
      const text = PAGE(page).toLowerCase();
      return phrasings
        .filter((p) => text.includes(p.toLowerCase()))
        .map((p) => `${page}: "${p}"`);
    });

    expect(
      hits,
      `these pages state the large-deal threshold as strictly greater-than, but the compiled ` +
        `gate is \`${condition()}\` — inclusive:\n  ${hits.join('\n  ')}\n` +
        `A deal at exactly the threshold DOES route and DOES alert (#1087). Reword the page ` +
        `inclusively ("or more", "及以上" / "以上", "≥") — do not relax this scan.`,
    ).toEqual([]);
  });
});
