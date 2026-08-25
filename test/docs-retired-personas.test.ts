// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { PERSONAS, normalise } from './helpers/persona-vocabulary';

/*
 * Persona drift in product prose — the docs half of the retired copilots
 * (#612).
 *
 * Split out of `test/docs-drift.test.ts` whole (#1196); see the SPLIT BY
 * FAMILY table there for the other families. The `src/` half of the same
 * vocabulary is `test/persona-copy.test.ts` (#1002/#1003); both read
 * `test/helpers/persona-vocabulary.ts` so neither can widen without the other.
 */

/**
 * Persona drift — the product pages must not re-personify the retired copilots
 * (#612).
 *
 * #512 removed the two app-authored agents and ADR-0063 §2 made the surface
 * skills-only; #589 / PR #611 rewrote `content/docs/ai-copilot/*` accordingly.
 * What #611 could not reach was the rest of the tree. At the time this guard was
 * written the docs carried 79 occurrences of the two names across 39 pages; 14
 * of those, on the 12 pages in HISTORICAL below, are retirement history and
 * belong there. The other 65, on 29 product pages in all three locales, were
 * live prose still calling the assistant "the Sales Copilot" / "the Service
 * Copilot". None asserted a `sales_copilot` agent (the agent-name check in
 * `docs-runnable-samples.test.ts` covers fenced samples), so every gate this
 * repo runs was green: `os validate`
 * and `pnpm lint` walk authored metadata and never open a paragraph.
 *
 * Maintainer ruling (2026-08-04, on #612): the personas are retired as PRODUCT
 * VOCABULARY too. The prose says "AI assistant" (zh: 「AI 助手」), because the
 * architecture it must describe is "AI capability is implemented by agents in
 * objectstack-ai/cloud; HotCRM contributes domain skills" — a page that names an
 * app-owned persona is describing an entity this app does not contain.
 *
 * Two things about the scan are load-bearing rather than style:
 *
 * - **Soft wraps are normalised first.** `content/docs/index.mdx` wrote "the
 *   Sales\n> Copilot" across a blockquote line break, and `whats-new.mdx` wrote
 *   "ask the Sales\nCopilot" across a plain one. A line-oriented grep — the
 *   obvious way to write this, and the way the issue's own inventory was taken —
 *   reads neither. Both were live prose, and the second had already been fixed
 *   in both zh translations ("向助手询问"), so the English page was the only one
 *   still personifying: exactly the drift this rule exists to stop, and exactly
 *   the drift a naive scan would have certified as absent.
 * - **CJK wraps are tightened after that.** `ai-copilot/index.zh-Hant.mdx`
 *   breaks 「服務 Copilot」 between 服 and 務, which no amount of space-joining
 *   repairs — join the lines with a space and the phrase reads 服 務 Copilot.
 *   Whitespace between two CJK characters is a typesetting artifact, never a
 *   word boundary, so it is removed before matching.
 *
 * ## Reverse verification (#612)
 *
 * Predicted direction: **red before the rewrite, green after** — an ordinary
 * forbidden-string rule over pages that plainly contained the string. Measured
 * on the pre-rewrite tree: 29 non-exempt pages reported, 65 occurrences. After:
 * 0 reported, with 14 occurrences surviving inside HISTORICAL. The rule is not
 * vacuous either — see the three guards below, of which the probe test is the
 * one that matters, since a regex that had stopped matching would otherwise
 * report a clean tree and read exactly like success.
 */
describe('product docs do not name a retired copilot persona (#612)', () => {
  /**
   * Pages allowed to write a persona name, each with the reason it may.
   *
   * A map rather than a list: an exemption with no stated reason is how a
   * targeted whitelist turns into a blanket one. Both reasons here are the same
   * kind — the page is talking ABOUT the retirement, in the past tense, which is
   * the one context where naming the thing is the point.
   */
  const HISTORICAL: Record<string, string> = {
    'content/docs/ai-copilot/index.mdx': "#611's \"No app-owned agents\" retirement callout",
    'content/docs/ai-copilot/index.zh-Hans.mdx': "#611's retirement callout (zh-Hans)",
    'content/docs/ai-copilot/index.zh-Hant.mdx': "#611's retirement callout (zh-Hant)",
    'content/docs/ai-copilot/sales-copilot.mdx': "#611's \"Where the personas went\" callout",
    'content/docs/ai-copilot/sales-copilot.zh-Hans.mdx': "#611's persona callout (zh-Hans)",
    'content/docs/ai-copilot/sales-copilot.zh-Hant.mdx': "#611's persona callout (zh-Hant)",
    'content/docs/ai-copilot/service-copilot.mdx': "#611's \"Where the personas went\" callout",
    'content/docs/ai-copilot/service-copilot.zh-Hans.mdx': "#611's persona callout (zh-Hans)",
    'content/docs/ai-copilot/service-copilot.zh-Hant.mdx': "#611's persona callout (zh-Hant)",
    'content/docs/whats-new.mdx': 'the v1.0 release record — what that release actually shipped',
    'content/docs/whats-new.zh-Hans.mdx': 'the v1.0 release record (zh-Hans)',
    'content/docs/whats-new.zh-Hant.mdx': 'the v1.0 release record (zh-Hant)',
  };

  // `PERSONAS` and `normalise` moved to `test/helpers/persona-vocabulary.ts`
  // (#1003), unchanged, so the `src/` rule reads the SAME vocabulary instead of
  // a second hand-written copy that would drift from this one and then report a
  // clean surface in spellings this one had already widened. The two surfaces
  // differ only in what each ADDS on top: the bare word "Copilot" is a `src/`
  // term (#1002), never a docs term — #611 keeps *AI Copilot* as a section name.

  /** Depth-first walk of `content/docs`, REPO_ROOT-relative. */
  const walkDocs = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkDocs(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  const PAGES = walkDocs('content/docs').map((file) => ({
    file,
    normalised: normalise(readFileSync(join(REPO_ROOT, file), 'utf8')),
  }));

  /** The persona spellings `file` still writes, after normalisation. */
  const personasIn = (normalised: string): string[] =>
    PERSONAS.filter((p) => p.re.test(normalised)).map((p) => p.label);

  it('the scan reads a real docs tree', () => {
    // Vacuity guard #1: a walk that returned nothing would report a clean tree.
    expect(
      PAGES.length,
      'no .mdx pages found under content/docs — this guard has gone vacuous',
    ).toBeGreaterThan(50);
  });

  it('the detector reads every persona spelling, wrapped and unwrapped', () => {
    // Vacuity guard #2, and the one that actually protects this rule. Every
    // check below reports "nothing found" when the tree is clean AND when the
    // regexes have stopped matching; only a positive probe tells those apart.
    // The three wrap shapes are the ones that really occur in this tree: a
    // blockquote continuation (`index.mdx`), a plain soft wrap
    // (`whats-new.mdx`), and a CJK word split mid-token
    // (`ai-copilot/index.zh-Hant.mdx`).
    const probes: { text: string; expected: string }[] = [
      { text: 'ask the Sales Copilot about it', expected: 'Sales Copilot' },
      { text: 'the AI Service Copilot reads from', expected: 'Service Copilot' },
      { text: '让销售 Copilot 替你判定', expected: '销售 Copilot' },
      { text: '由服务Copilot 分流', expected: '服务 Copilot' },
      // blockquote continuation — `content/docs/index.mdx` wrote exactly this
      { text: '> Ten seconds later, the Sales\n> Copilot uses it', expected: 'Sales Copilot' },
      // plain soft wrap — `content/docs/whats-new.mdx` wrote exactly this
      { text: 'ten seconds later, ask the Sales\nCopilot a question', expected: 'Sales Copilot' },
      // CJK word split — `ai-copilot/index.zh-Hant.mdx` wraps 服務 this way
      { text: '> 兩個自己的智能體——「銷售 Copilot」和「服\n> 務 Copilot」', expected: '服務 Copilot' },
    ];
    const unread = probes
      .filter((p) => !personasIn(normalise(p.text)).includes(p.expected))
      .map((p) => `${JSON.stringify(p.text)} → expected ${p.expected}, read ${JSON.stringify(personasIn(normalise(p.text)))}`);
    // Collected rather than asserted per probe, so a narrowed detector names
    // every spelling it stopped reading in one run instead of only the first.
    expect(
      unread,
      `the persona detector no longer reads:\n  ${unread.join('\n  ')}\n` +
        'A spelling this scan cannot see is a page nobody is checking — and the rule below ' +
        'would go green over it, which is indistinguishable from the tree being clean.',
    ).toEqual([]);
  });

  it('every exempt page still writes a persona, so no exemption is dead', () => {
    // Vacuity guard #3, pointed the other way: an exemption that no longer
    // covers anything is a standing licence for the next author to re-introduce
    // the persona on that page, granted by nobody, reviewed by nobody.
    const dead = Object.keys(HISTORICAL).filter((file) => {
      const page = PAGES.find((p) => p.file === file);
      return !page || personasIn(page.normalised).length === 0;
    });
    expect(
      dead,
      `HISTORICAL exempts pages that no longer name a persona (or no longer exist):\n  ${dead.join('\n  ')}\n` +
        'Delete the entry. An exemption is granted to a specific piece of retirement history, ' +
        'not to a filename in perpetuity.',
    ).toEqual([]);
  });

  it('no other page names "Sales Copilot" or "Service Copilot"', () => {
    const offenders = PAGES.filter((p) => !(p.file in HISTORICAL))
      .map((p) => ({ file: p.file, found: personasIn(p.normalised) }))
      .filter((p) => p.found.length > 0)
      .map((p) => `${p.file}: ${p.found.join(', ')}`);
    expect(
      offenders,
      `pages naming a retired copilot persona:\n  ${offenders.join('\n  ')}\n` +
        'Say "AI assistant" (zh: 「AI 助手」) instead, and keep the sentence\'s functional ' +
        'meaning — only the name changes. HotCRM ships SKILLS; the assistant they attach to is ' +
        'the platform\'s (`ask`), implemented by an agent in objectstack-ai/cloud. Naming an ' +
        'app-owned persona describes an entity this app does not contain (#512, ADR-0063 §2). ' +
        'A page genuinely writing retirement HISTORY belongs in HISTORICAL, with its reason.',
    ).toEqual([]);
  });
});
