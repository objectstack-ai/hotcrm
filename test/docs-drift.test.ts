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
 *
 * A doc states the tree in TWO forms, and that check — the first one below —
 * reads only one of them (#984: `getting-started/for-developers.mdx` kept
 * drawing `agents/` right through the deletion, under a guard whose own comment
 * names `src/agents/` as the defect it exists to catch):
 *
 *   inline — `src/skills/index.ts` written into a sentence. `inlineSrcDirs()`.
 *   drawn  — an ASCII tree, whose entries under the `src/` node carry no
 *            `src/` prefix at all (`├── agents/`). `treeSrcDirs()`.
 *
 * Both forms are checked below, on both doc sets: the maintainer docs keep
 * their inline check unchanged, the product pages get the same inline check,
 * and every doc that DRAWS a tree — maintainer or product — gets the drawn one.
 */

/** `src/<dir>/` written inline in a sentence. */
const inlineSrcDirs = (text: string): string[] =>
  [...text.matchAll(/\bsrc\/([a-z][a-z0-9_]*)\//g)].map((m) => m[1]);

/**
 * The entries an ASCII tree draws directly under its `src/` node.
 *
 * A tree makes the same claim as the inline form, with the prefix stripped by
 * the drawing itself — both roots occur here, the maintainer docs at `hotcrm/`
 * and the product docs at `src/`:
 *
 *     hotcrm/                    src/
 *     ├── src/                   ├── objects/
 *     │   ├── objects/           └── data/
 *     │   └── data/
 *
 * so `src/objects/` never appears as a literal anywhere on the page and the
 * inline regex sees nothing at all.
 *
 * Only the DIRECT children of `src/` are returned: a deeper level claims
 * `src/<dir>/<sub>/`, which no tree in this repo draws, and resolving it would
 * need the parent's name threaded through. One line may draw several entries
 * (`apps/, views/, pages/` — comma- or space-separated), and a trailing `#`
 * comment is not part of any of them.
 */
const treeSrcDirs = (text: string): string[] => {
  const BRANCH = /^([\s│]*)(?:├──|└──)\s?(.*)$/;
  const dirs: string[] = [];
  /** Indent width of the `src/` node itself; -1 when the tree is rooted at it. */
  let srcIndent: number | null = null;
  /** Indent width of its direct children — the first child line sets it. */
  let childIndent: number | null = null;

  for (const line of text.split('\n')) {
    const branch = BRANCH.exec(line);
    if (!branch) {
      // A tree ROOTED at `src/` writes that one line without a branch glyph.
      // Every other non-branch line (prose, the closing fence) ends the tree.
      srcIndent = /^src\/\s*$/.test(line) ? -1 : null;
      childIndent = null;
      continue;
    }
    const indent = branch[1].length;
    const entry = branch[2].replace(/#.*$/, '').trim();
    if (srcIndent !== null && indent <= srcIndent) {
      // Back out to a sibling of `src/` (`├── apps/docs/`, `└── content/docs/`).
      srcIndent = null;
      childIndent = null;
    }
    if (srcIndent === null) {
      if (entry === 'src/') srcIndent = indent;
      continue;
    }
    if (childIndent === null) childIndent = indent;
    if (indent !== childIndent) continue;
    for (const token of entry.split(/[\s,]+/)) {
      const dir = /^([a-z][a-z0-9_]*)\/$/.exec(token);
      if (dir) dirs.push(dir[1]);
    }
  }
  return dirs;
};

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
      const named = new Set(inlineSrcDirs(text));
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
 * The product pages that point readers at `src/` — the file axis of #984.
 *
 * Deliberately a LIST, not a walk of `content/docs`: a product page may name a
 * directory in the negative and be right to. `customization/ai-skills.mdx`
 * says "there is no `src/agents/` directory", which is the current truth and
 * would be a false positive under "named ⇒ exists". Whether every `src/` path
 * on a page is a pointer is an editorial fact about that page, so pages opt in
 * here one at a time.
 *
 * `customization/index.{mdx,zh-Hans,zh-Hant}` drew the same tree with the same
 * retired `agents/` entry and `*.agent.ts` row; #988 redrew all three and they
 * joined here, as the note left above by #984 anticipated.
 *
 * Membership costs a page something, and the customization page had to pay it:
 * the inline check below refuses to pass vacuously, and that page named no
 * `src/<dir>/` inline at all — its one candidate, the golden rule "export from
 * the relevant `src/**\/index.ts`", is a glob and matches nothing. What made it
 * eligible is the barrel sentence #988 added under the tree, which names
 * `src/skills/index.ts` outright. A page that only DRAWS a tree belongs in
 * TREE_DIAGRAM_DOCS; being here additionally asserts it points into `src/` in
 * prose.
 */
const PRODUCT_TREE_DOCS = [
  'content/docs/getting-started/for-developers.mdx',
  'content/docs/getting-started/for-developers.zh-Hans.mdx',
  'content/docs/getting-started/for-developers.zh-Hant.mdx',
  'content/docs/customization/index.mdx',
  'content/docs/customization/index.zh-Hans.mdx',
  'content/docs/customization/index.zh-Hant.mdx',
];

/** Every doc that DRAWS a `src/` tree — the form axis, maintainer and product alike. */
const TREE_DIAGRAM_DOCS = ['README.md', 'AGENTS.md', 'docs/README.md', ...PRODUCT_TREE_DOCS];

describe('product docs do not point at directories that no longer exist', () => {
  for (const docFile of PRODUCT_TREE_DOCS) {
    it(`${docFile}: every src/<dir>/ it names exists`, () => {
      const text = readFileSync(join(REPO_ROOT, docFile), 'utf8');
      const named = [...new Set(inlineSrcDirs(text))];
      expect(
        named.length,
        `${docFile} names no src/<dir>/ at all — this guard has gone vacuous over it. ` +
          'A page listed here is one that points readers into the tree; if this one stopped ' +
          'doing that, drop it from PRODUCT_TREE_DOCS instead of leaving it green over nothing.',
      ).toBeGreaterThan(0);
      const missing = named.filter((dir) => !existsSync(join(REPO_ROOT, 'src', dir)));
      expect(
        missing,
        `${docFile} advertises src/ directories that do not exist: ${missing.join(', ')}. ` +
          'Delete the reference (or restore the directory) — a path in prose is still a promise.',
      ).toEqual([]);
    });
  }
});

describe('docs that draw the src/ tree only draw directories that exist', () => {
  for (const docFile of TREE_DIAGRAM_DOCS) {
    it(`${docFile}: every directory under its src/ node exists`, () => {
      const text = readFileSync(join(REPO_ROOT, docFile), 'utf8');
      const drawn = [...new Set(treeSrcDirs(text))];
      expect(
        drawn.length,
        `${docFile} is listed as drawing a src/ tree, but no entry was parsed under a src/ node. ` +
          'Either the diagram was reformatted (teach treeSrcDirs() the new shape) or the page no ' +
          'longer draws one (drop it from TREE_DIAGRAM_DOCS) — a parser that matches nothing ' +
          'passes by asserting nothing, which is the state that let #984 through.',
      ).toBeGreaterThan(0);
      const missing = drawn.filter((dir) => !existsSync(join(REPO_ROOT, 'src', dir)));
      expect(
        missing,
        `${docFile} draws src/ directories that do not exist: ${missing.join(', ')}. ` +
          'Delete the branch (or restore the directory) — a directory in a tree diagram is ' +
          'the same promise as one in a sentence.',
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
 * Locale note (#685): `dashboards.zh-Hans.mdx` / `.zh-Hant.mdx` were retranslated
 * against the current English page and now sit in `DOC_PAGES` alongside it. The
 * extraction is locale-agnostic on purpose — the section headings carry each
 * dashboard's own English `label` and the bold tile names are left in English in
 * every locale, so the same two extractions resolve all three files. That is what
 * makes the section-coverage rule bite per locale: registering a sixth dashboard
 * now fails until all three pages document it, which is the shape #592 needed.
 *
 * The one asymmetry that survived #685 is gone as of #725: the `**Name** tile`
 * prose rule keyed on the English word "tile", so it fired on the English page
 * only, while the zh pages say `**Quiet 90+ Days** 磁贴 / 磁貼`. Their tile LISTS
 * were checked; a stray tile name in their running prose was not. The noun now
 * comes from `TILE_WORDS`, so the rule reads all three pages — 2 references
 * before, 6 after, and the English hit set is unchanged (same two names, same
 * page). No page had to move a word: every tile the zh prose names was already a
 * real widget, which is why this was filed as a dormant coverage gap rather than
 * a live defect.
 */
describe('the dashboards docs page lists tiles that exist', () => {
  type AnyRec = Record<string, any>;
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

  const DOC_PAGES = [
    'content/docs/analytics/dashboards.mdx',
    'content/docs/analytics/dashboards.zh-Hans.mdx',
    'content/docs/analytics/dashboards.zh-Hant.mdx',
  ];

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

  /**
   * The noun each locale's page uses for "tile". The tile NAMES stay English in
   * every locale (see the Locale note above), so this one word is the whole
   * locale surface of the prose rule — which is why it is a table rather than
   * three regexes or three per-page rules.
   *
   * Entries are plain words: they are joined into an alternation verbatim, so
   * anything carrying regex punctuation would not mean what it reads as.
   */
  const TILE_WORDS = ['tiles', 'tile', '磁贴', '磁貼'];

  /**
   * `the **Quiet 90+ Days** tile` / `**Quiet 90+ Days** 磁贴` — anywhere in the
   * prose, in any locale the page ships (#725).
   *
   * Two details are load-bearing rather than style:
   *
   * - the separator is `\s*`, not `\s+`. Chinese typography does not put a space
   *   before the noun, so `\s+` would leave `**Quiet 90+ Days**磁贴` unchecked —
   *   the same hole this rule just closed, in the spelling the next translator
   *   is most likely to reach for.
   * - the tail guard is a lookahead, not `\b`. A JS word boundary is defined
   *   against `[A-Za-z0-9_]` on BOTH sides, so there is no boundary between the
   *   last character of 磁贴 and the full stop after it, and `磁贴\b` would never
   *   match anything the zh pages actually write. The lookahead accepts exactly
   *   the strings `tiles?\b` accepted, so the English half is untouched, and
   *   lets the CJK half end on punctuation.
   */
  const TILE_REFERENCE = new RegExp(
    String.raw`\*\*([^*\n]+)\*\*\s*(?:${TILE_WORDS.join('|')})(?![A-Za-z0-9_])`,
    'g',
  );

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

  it('the tile reference extraction reads every locale the page ships (#725)', () => {
    // The standing form of #725's red/green check, and the reason it is not
    // enough to lean on the vacuity guard below: that one counts the UNION over
    // the three pages, so deleting a locale from TILE_WORDS keeps it green on
    // the English hits alone — silently reopening the gap this closed. Probe
    // each word directly, spaced and unspaced, with a CJK full stop as the tail
    // (the character `\b` cannot follow — see TILE_REFERENCE).
    const reads = (probe: string): string[] =>
      [...probe.matchAll(TILE_REFERENCE)].map((m) => m[1].trim());
    const unread = TILE_WORDS.flatMap((word) =>
      [' ', ''].map((gap) => `每周都处理一次 **Open Deals**${gap}${word}。`),
    ).filter((probe) => reads(probe)[0] !== 'Open Deals');
    // Collected rather than asserted per probe, so a narrowed regex names every
    // spelling it stopped reading in one run instead of only the first.
    expect(
      unread,
      `TILE_REFERENCE no longer reads:\n  ${unread.join('\n  ')}\n` +
        'A locale whose word for "tile" this regex cannot see is a page whose running prose ' +
        'nobody checks — which is exactly the state the zh pages were in between #685 and #725.',
    ).toEqual([]);
  });

  it('every "**Name** tile" / "**Name** 磁贴" reference names a real tile', () => {
    const refs = PAGES.flatMap(({ file, text }) =>
      [...text.matchAll(TILE_REFERENCE)].map((m) => ({ file, name: m[1].trim() })),
    );
    // Vacuity guard #3. If the prose legitimately stops naming tiles outside the
    // lists, delete this check rather than leaving it green over nothing.
    expect(
      refs.length,
      `no \`**Name** ${TILE_WORDS.join(' / ')}\` reference found in the dashboards docs — ` +
        'this check has gone vacuous.',
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

/**
 * Translated pages keep every callout the English page has (#736).
 *
 * A callout — `> **Always scope a roll-up to one period.** …` — is where a docs
 * page puts the thing that bites: the trap someone already fell into, written
 * up so the next reader does not. `content/docs/sales/forecasting.mdx` gained
 * exactly such a box after #614 (a roll-up that added a quarter's quota to a
 * month's), and neither zh page ever grew a counterpart. The whole warning was
 * missing for the half of this product's audience that reads those pages, and
 * nothing noticed for four releases: `docs-object-coverage.test.ts` checks that
 * a translated page EXISTS and is navigable, deliberately holding the zh pages
 * to nothing about their contents (see its "Locale asymmetry" note), and the
 * dashboards rules above key on tile lists this page does not have.
 *
 * So this is the locale check that was missing, in the one shape that is honest
 * across languages: a blockquote is STRUCTURE, not vocabulary. Counting them
 * says nothing about how the warning is worded, only that the translation still
 * has one — which is the defect that actually shipped (a whole box dropped),
 * not a wording drift.
 *
 * ## Blocks, not lines — the measurement that changed the design
 *
 * Counting `^> ` LINES reports 7 English pages as drifted, and all but
 * forecasting are false positives: CJK text wraps at different widths, so a
 * three-line English callout is a two-line Chinese one. `sharing-and-security`
 * "loses" 14 of 17 callouts that way while having every single one. Counting
 * consecutive-`>` RUNS instead — one count per box — leaves exactly two
 * mismatches in the whole tree, and both are the real defect. A guard whose
 * metric is noisy gets muted; this one is quiet enough to be believed.
 *
 * ## Equality, not "at least as many"
 *
 * An extra callout in a translation is also worth a look: it means a translator
 * added a warning the English page does not give, so one of the two audiences
 * is being told something the other is not. Empirically the right invariant —
 * 130 of 132 locale pages already satisfied equality before #736.
 *
 * ## Reverse verification (#736)
 *
 * Predicted direction: **red before the content fix, green after**. Measured on
 * the pre-fix tree: 2 mismatches out of 132 locale pages, both
 * `sales/forecasting.zh-Han*.mdx` at `1 vs 0` — the missing #614 box, and
 * nothing else. After the retranslation: 0. The rule is not vacuous either —
 * 18 English pages carry at least one callout, so it is comparing real boxes,
 * not zeros against zeros.
 */
describe('translated docs pages keep the English page callouts', () => {
  const LOCALE_SUFFIXES = ['.zh-Hans', '.zh-Hant'] as const;

  /** Depth-first walk of `content/docs`, REPO_ROOT-relative (see note above). */
  const walkDocs = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkDocs(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  /**
   * Number of blockquote BLOCKS: each run of consecutive `>` lines counts once,
   * however many lines it wraps to. That is the whole point — see the header.
   */
  const calloutCount = (text: string): number => {
    let count = 0;
    let inside = false;
    for (const line of text.split('\n')) {
      const quoted = /^>/.test(line);
      if (quoted && !inside) count += 1;
      inside = quoted;
    }
    return count;
  };

  const ENGLISH_PAGES = walkDocs('content/docs').filter(
    (f) => !LOCALE_SUFFIXES.some((l) => f.endsWith(`${l}.mdx`)),
  );

  /** English page → the translations that exist for it. */
  const PAIRS = ENGLISH_PAGES.flatMap((en) =>
    LOCALE_SUFFIXES.map((locale) => ({
      en,
      translated: en.replace(/\.mdx$/, `${locale}.mdx`),
    })).filter((p) => existsSync(join(REPO_ROOT, p.translated))),
  );

  it('finds real page pairs, and real callouts to compare', () => {
    // Vacuity guard, both halves. A walk that returned nothing would pass the
    // parity test by asserting nothing; so would a tree where no English page
    // has a callout at all, since every comparison would be 0 === 0.
    expect(
      PAIRS.length,
      'no English/translated page pairs found under content/docs — this guard has gone vacuous',
    ).toBeGreaterThan(50);
    const withCallouts = ENGLISH_PAGES.filter(
      (f) => calloutCount(readFileSync(join(REPO_ROOT, f), 'utf8')) > 0,
    );
    expect(
      withCallouts.length,
      'no English docs page carries a `> …` callout — this guard is comparing zeros. ' +
        'If callouts genuinely left the docs, delete this check rather than leaving it green over nothing.',
    ).toBeGreaterThan(5);
  });

  it('every translated page has the same number of callouts as its English page', () => {
    const drifted = PAIRS.map(({ en, translated }) => {
      const enCount = calloutCount(readFileSync(join(REPO_ROOT, en), 'utf8'));
      const zhCount = calloutCount(readFileSync(join(REPO_ROOT, translated), 'utf8'));
      return enCount === zhCount ? null : `${translated}: ${zhCount} callout(s), but ${en} has ${enCount}`;
    }).filter((x): x is string => x !== null);

    expect(
      drifted,
      `translated pages whose callouts do not match the English page:\n  ${drifted.join('\n  ')}\n` +
        'A `> …` box is where a page puts the trap someone already fell into. Translate the ' +
        'missing one (or, if the translation added a box the English page lacks, decide which ' +
        'audience is right and make both pages agree) — do not delete the English callout to ' +
        'get green.',
    ).toEqual([]);
  });
});

/**
 * The developer example must teach the DELIVERABLE selection key (#813).
 *
 * `docs/developers/code_examples.md` is the copy-paste surface for the next
 * author of an action — human or AI — and its "Add An Action" example was a
 * bulk enrolment body reading `input.selectedIds`. That key cannot arrive by
 * any route: a top-level `selectedIds` is never merged into the params bag, and
 * a `params.selectedIds` is refused by the strict params gate (ADR-0104) as
 * undeclared. The only multi-select channel is the built-in `_selectedIds`,
 * with a LEADING UNDERSCORE (`ACTION_PARAM_BUILTIN_KEYS` in `@objectstack/spec`
 * `ui/action-params.zod.ts`), injected by an `execution: 'aggregate'` bulk def.
 *
 * This is not a style pin. #508 spent two release candidates concluding the
 * platform had no multi-select channel, because every probe spelled the key the
 * way this example spells it, and both refusals looked like proof. The example
 * is where that conclusion gets re-manufactured, so it is where the guard goes.
 *
 * Pinned as text, deliberately: the example is prose to `os validate`, `pnpm
 * lint` and every metadata assertion in this repo — nothing else in the gate
 * chain reads a fenced code block at all.
 */
describe('the action example teaches a selection key the platform can deliver (#813)', () => {
  const EXAMPLES = 'docs/developers/code_examples.md';
  const text = () => readFileSync(join(REPO_ROOT, EXAMPLES), 'utf8');

  it('reads the built-in `input._selectedIds`, never the undeliverable spelling', () => {
    const src = text();
    expect(
      src.includes('input._selectedIds'),
      `${EXAMPLES} no longer shows \`input._selectedIds\` — that built-in key is the only route a `
        + 'multi-row selection has to an action body, so an example that omits it teaches the gap '
        + 'that cost #508 two release candidates',
    ).toBe(true);

    // Boundary-matched so `input._selectedIds` itself does not trip it — the
    // same guard `test/bulk-action-dispatch.test.ts` applies to the shipped
    // opportunity body, applied here to the teaching copy of it.
    const noUnderscore = [...src.matchAll(/(?<![\w$])input\.selectedIds\b/g)];
    expect(
      noUnderscore.length,
      `${EXAMPLES} still teaches \`input.selectedIds\` (no underscore) in ${noUnderscore.length} `
        + 'place(s). Nothing can deliver that key: top-level it is never merged into the params '
        + 'bag, and under `params.` the strict gate answers 400 `Unknown action param '
        + '"selectedIds"`. Both refusals read as "the platform has no bulk channel" — which is '
        + 'exactly the wrong lesson (#813).',
    ).toBe(0);
  });

  it('shows the view-side declaration that injects the key, and names the underscore trap', () => {
    const src = text();
    // Half a contract teaches a dead body. A handler reading `_selectedIds`
    // with no aggregate def in the view is injected nothing and is just as
    // inert as the misspelling — which is precisely how #508's button looked
    // dead while the channel worked (#588 had removed the declaration).
    for (const required of ['bulkActionDefs', "execution: 'aggregate'", 'bulkActions']) {
      expect(
        src.includes(required),
        `${EXAMPLES} does not show \`${required}\`. The action body is only half the bulk `
          + 'contract: the LIST VIEW chooses whether the action is dispatched once per row '
          + '(bare-string `bulkActions`) or once for the whole selection (an aggregate '
          + '`bulkActionDefs` entry, which is what injects `_selectedIds`).',
      ).toBe(true);
    }

    // The trap itself, in a `> …` callout — the shape this repo's docs use for
    // "someone already fell into this". Prose that merely uses the right key
    // teaches the spelling; the callout is what stops the next reader
    // re-deriving "there is no bulk channel" from two correct 400s.
    const callout = src
      .split('\n')
      .filter((l) => /^>/.test(l))
      .join('\n');
    expect(
      callout.includes('Unknown action param'),
      `${EXAMPLES} has no callout naming the \`Unknown action param "selectedIds"\` refusal. That `
        + '400 and the silent top-level drop are the two pieces of evidence #508 misread as '
        + 'proof the capability did not exist; the example is where that misreading is prevented.',
    ).toBe(true);
  });
});
