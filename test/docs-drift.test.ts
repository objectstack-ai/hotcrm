// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AgentSchema } from '@objectstack/spec/ai';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

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
    // Anchored on the lowercase `record.` scope, which is what distinguishes
    // the START condition's entry gate from the director tier's
    // `oppRecord.amount > 500000` (the match is case-sensitive, so
    // `oppRecord.amount` cannot satisfy `record\.amount`). It used to lean on
    // the neighbouring `&& (record.approval_status` clause instead, which
    // broke the moment #633 inserted the `has(...)` / `!= null` totality
    // guards between the two — a drift detector should key on the value's own
    // scope, not on whatever happens to sit next to it.
    extract: () => cap('opportunity-approval.flow.ts', /record\.amount > (\d+)/),
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
      // Anchored on REPO_ROOT for the same reason as FLOWS/DOC above: a
      // cwd-relative read turns this guard into an ENOENT the moment vitest is
      // launched from anywhere but the repo root.
      const text = readFileSync(join(REPO_ROOT, docFile), 'utf8');
      const named = new Set([...text.matchAll(/\bsrc\/([a-z][a-z0-9_]*)\//g)].map((m) => m[1]));
      const missing = [...named].filter((dir) => !existsSync(join(REPO_ROOT, 'src', dir)));
      expect(
        missing,
        `${docFile} advertises src/ directories that do not exist: ${missing.join(', ')}. ` +
          'Delete the reference (or restore the directory) — a path in prose is still a promise.',
      ).toEqual([]);
    });
  }
});

/**
 * Agent-name drift — a copy-pasteable sample must not name an agent that the
 * runtime refuses to load.
 *
 * `sales_copilot` was retired in #512 (app-authored agents removed; the surface
 * is skills-only per ADR-0063 §2) and #586 cleared the two `src/` references,
 * but the flagship "Wow #1 — live schema" demo kept POSTing it as the `agent`
 * of `/api/v1/ai/chat` in four places: the runnable script and all three locale
 * docs (#606). Nothing was checking, because an agent name in a fenced curl is
 * just prose to every gate this repo runs — `os validate` and `pnpm lint` walk
 * authored metadata, and there is no authored agent left for them to walk. The
 * symptom only appears at demo time: `loadAgent()` refuses the non-platform
 * name, and the script (`curl -fsS`) aborts at step 2.
 *
 * So the check has to live where the name lives — in the text. This walks every
 * doc's code fences plus the demo scripts (a shell script is code end to end),
 * pulls each `agent:` / `defaultAgent:` value, and requires it to be a PLATFORM
 * agent. Architecture ruling (2026-08-04): AI capability is implemented by
 * agents in objectstack-ai/cloud; app projects define skills only, so no
 * self-named agent may reappear here — in metadata OR in a sample a reader is
 * invited to paste into a terminal.
 *
 * The platform set is READ FROM THE SPEC (`AgentSchema.shape.surface`), the
 * same derivation `metadata-references.test.ts` uses for `App.defaultAgent` —
 * these two guards cover the same contract on its two surfaces (authored
 * binding / documented sample) and should never disagree about the set.
 */
describe('documented agent names resolve to a platform agent', () => {
  /** `['ask', 'build']` — straight off the spec's own surface enum. */
  const PLATFORM_AGENTS: string[] = (() => {
    const surface = (AgentSchema as unknown as { shape: Record<string, any> }).shape.surface;
    const enumSchema = typeof surface.removeDefault === 'function' ? surface.removeDefault() : surface;
    return enumSchema.options as string[];
  })();

  /** Files whose whole body is code — no fence to unwrap. */
  const SCRIPT_DIRS = ['scripts'];
  /** Prose files: only the fenced blocks are samples someone will run. */
  const DOC_DIRS = ['content/docs', 'src/docs'];

  /**
   * Depth-first walk returning REPO_ROOT-relative paths. Hand-rolled rather
   * than `readdirSync(..., { recursive: true })`: the repo's @types/node has no
   * such overload, so the recursive form typechecks red under `pnpm typecheck`.
   */
  const walk = (dir: string, exts: string[]): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) return walk(rel, exts);
      return exts.some((e) => entry.name.endsWith(e)) ? [rel] : [];
    });
  };

  /** ```lang\n ... ``` — the body only. */
  const fences = (text: string): string[] =>
    [...text.matchAll(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g)].map((m) => m[1]);

  /**
   * `"agent": "x"`, `agent: 'x'`, `defaultAgent: "x"`. The leading `\b` is what
   * keeps the `agent` alternative from matching inside `defaultAgent` (the
   * preceding `t` is a word char, so there is no boundary there).
   */
  const AGENT_KEY = /\b(defaultAgent|agent)"?\s*:\s*["']([A-Za-z][A-Za-z0-9_]*)["']/g;

  const cited = (source: string, blocks: string[]): { file: string; name: string }[] =>
    blocks.flatMap((body) => [...body.matchAll(AGENT_KEY)].map((m) => ({ file: source, name: m[2] })));

  const SAMPLES: { file: string; name: string }[] = [
    ...walk(SCRIPT_DIRS[0], ['.sh', '.mjs', '.ts']).flatMap((f) =>
      cited(f, [readFileSync(join(REPO_ROOT, f), 'utf8')]),
    ),
    ...DOC_DIRS.flatMap((d) => walk(d, ['.md', '.mdx'])).flatMap((f) =>
      cited(f, fences(readFileSync(join(REPO_ROOT, f), 'utf8'))),
    ),
  ];

  it('the spec still exposes a non-empty platform agent set', () => {
    // Guard the guard, twice over. An introspection that silently returned []
    // would fail every sample for the wrong reason; a scan that found nothing
    // would pass by asserting nothing — which is exactly the state the repo was
    // in before #606, and the reason the four sites went unnoticed for months.
    expect(PLATFORM_AGENTS).toContain('ask');
    expect(
      SAMPLES.length,
      'no `agent:` value found in any doc fence or script — this guard has gone vacuous. ' +
        'If the demos legitimately dropped the key (`ask` is the implicit default, ADR-0063 §1), ' +
        'delete this guard rather than leaving it green over nothing.',
    ).toBeGreaterThan(0);
  });

  it('every documented agent name is a platform agent', () => {
    const bad = SAMPLES.filter((s) => !PLATFORM_AGENTS.includes(s.name)).map(
      (s) =>
        `${s.file}: agent "${s.name}" is not a platform agent (${PLATFORM_AGENTS.join(' | ')}) — ` +
        'loadAgent() refuses it, so this sample errors at chat time',
    );
    expect(
      bad,
      `documented agent names that will not resolve:\n  ${bad.join('\n  ')}\n` +
        'Apps author skills, not agents (ADR-0063 §2). Name a platform agent, or omit the key.',
    ).toEqual([]);
  });
});

/**
 * Dashboard-tile drift — the docs page must not list tiles the app does not ship.
 *
 * `content/docs/analytics/dashboards.mdx` names the tiles of each dashboard, and
 * before #610 almost none of them existed: CRM Overview and Executive overlapped
 * the real metadata on ZERO tiles, the page advertised measures no dataset
 * defines ("Net New ARR", "Customer Acquisition Cost", "Forecast vs Quota"), and
 * it asserted a click statistic ("the most-clicked widget on this dashboard")
 * about a tile that does not exist, from telemetry this repo does not collect.
 * The page also still said "four dashboards" after #592/PR #670 registered a
 * fifth (`sales_activity_dashboard`) — an undocumented dashboard is the same
 * defect seen from the other side.
 *
 * Nothing checked, because a tile name in prose is just prose: `os validate` and
 * `pnpm lint` walk authored metadata and never open `content/docs`. So the check
 * has to live where the claim lives — in the text.
 *
 * The rule: inside the `##` section of a dashboard, every bullet that OPENS with
 * a bolded name (`- **Total Revenue** — …`) must resolve to a widget `title` on
 * THAT dashboard, and every `**X** tile` reference anywhere on the page must
 * resolve to a widget title on SOME dashboard (which is what "use the **Slipping
 * Deals** tile every Friday" in the Tips section failed).
 *
 * Direction is deliberate, per the ruling on #610: listed ⇒ exists. The reverse
 * (every widget must be listed) is NOT enforced here — the defect class is a doc
 * that promises what the product lacks. Section coverage below is what keeps the
 * page from silently omitting a whole dashboard, which is the case that actually
 * bit.
 *
 * Locale note: `dashboards.zh-Hans.mdx` / `.zh-Hant.mdx` carry the same tile
 * lists — the bold names are left in English there — so they can join `DOC_PAGES`
 * unchanged once their prose is retranslated against the current dashboards.
 * They are out of this rule's scope only because they still hold the old text.
 */
describe('the dashboards docs page lists tiles that exist', () => {
  type AnyRec = Record<string, any>;
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

  const DOC_PAGES = ['content/docs/analytics/dashboards.mdx'];

  /** `## 🏠 CRM Overview` → heading text + everything up to the next `## `. */
  const sectionsOf = (text: string): { heading: string; body: string }[] => {
    const out: { heading: string; body: string[] }[] = [];
    for (const line of text.split('\n')) {
      const m = /^## +(.*)$/.exec(line);
      if (m) out.push({ heading: m[1].trim(), body: [] });
      else if (out.length) out[out.length - 1].body.push(line);
    }
    return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
  };

  /** Drop the leading emoji so `## 🎧 Customer Service` matches the label. */
  const headingLabel = (h: string): string => h.replace(/^[^A-Za-z]+/, '').trim();

  /** `- **Total Revenue** — …` → `Total Revenue`. Opening bold only. */
  const listedTiles = (body: string): string[] =>
    [...body.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].trim());

  /** `the **Quiet 90+ Days** tile` / `… tiles` — anywhere in the prose. */
  const TILE_REFERENCE = /\*\*([^*\n]+)\*\*\s+tiles?\b/g;

  const titlesOf = (d: AnyRec): Set<string> =>
    new Set((d.widgets ?? []).map((w: AnyRec) => w.title).filter(Boolean));

  const ALL_TITLES = new Set(dashboards.flatMap((d) => [...titlesOf(d)]));

  const PAGES = DOC_PAGES.map((file) => ({
    file,
    text: readFileSync(join(REPO_ROOT, file), 'utf8'),
  }));

  it('every registered dashboard has a section on the page', () => {
    // Vacuity guard #1, and the case #592 walked into: a dashboard shipped with
    // no section here reads to a user as a dashboard that does not exist, and
    // leaves the per-section rules below with nothing to check for it.
    expect(dashboards.length, 'no dashboards registered — this whole guard is vacuous').toBeGreaterThan(0);
    for (const { file, text } of PAGES) {
      const headings = new Set(sectionsOf(text).map((s) => headingLabel(s.heading)));
      const undocumented = dashboards.map((d) => d.label).filter((l: string) => !headings.has(l));
      expect(
        undocumented,
        `${file} has no section for: ${undocumented.join(', ')}. ` +
          'Add a `## <label>` section listing its tiles (the heading must carry the ' +
          "dashboard's own `label`, emoji prefix aside) — a dashboard nobody documents " +
          'is one nobody finds.',
      ).toEqual([]);
    }
  });

  for (const d of dashboards) {
    it(`${d.label}: every tile the page lists is a widget on this dashboard`, () => {
      const titles = titlesOf(d);
      for (const { file, text } of PAGES) {
        const section = sectionsOf(text).find((s) => headingLabel(s.heading) === d.label);
        if (!section) continue; // reported by the coverage test above
        const listed = listedTiles(section.body);
        // Vacuity guard #2: a section whose bullets stopped parsing would pass
        // this test by asserting nothing at all — exactly the state the page was
        // in before #610, where nobody was checking anything.
        expect(
          listed.length,
          `${file}: the "${d.label}" section lists no tiles. Either the tile bullets ` +
            '(`- **Name** — …`) were removed, or the extraction no longer matches them; ' +
            'a guard over zero input is worse than none.',
        ).toBeGreaterThan(0);
        const shipped = [...titles].join(' | ');
        const bad = listed
          .filter((name) => !titles.has(name))
          .map(
            (name) =>
              `${file}: "${d.label}" lists a tile "${name}" that ${d.name} does not ship ` +
              `(widgets: ${shipped})`,
          );
        expect(
          bad,
          `documented tiles that do not exist:\n  ${bad.join('\n  ')}\n` +
            'Trim the docs to the widgets the dashboard actually declares — do not add ' +
            'the widget to satisfy the doc unless that is a product decision someone made.',
        ).toEqual([]);
      }
    });
  }

  it('every "**Name** tile" reference names a real tile', () => {
    const refs = PAGES.flatMap(({ file, text }) =>
      [...text.matchAll(TILE_REFERENCE)].map((m) => ({ file, name: m[1].trim() })),
    );
    // Vacuity guard #3. If the prose legitimately stops naming tiles outside the
    // lists, delete this check rather than leaving it green over nothing.
    expect(
      refs.length,
      'no `**Name** tile` reference found in the dashboards docs — this check has gone vacuous.',
    ).toBeGreaterThan(0);
    const bad = refs
      .filter((r) => !ALL_TITLES.has(r.name))
      .map((r) => `${r.file}: prose points at a "${r.name}" tile, which no dashboard ships`);
    expect(
      bad,
      `tile references that do not resolve:\n  ${bad.join('\n  ')}\n` +
        'Name a tile that exists, or drop the advice — a workflow built on a tile ' +
        'nobody can open is worse than no advice.',
    ).toEqual([]);
  });
});
