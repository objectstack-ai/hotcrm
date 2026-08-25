// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';
import { PERSONAS, normalise } from './helpers/persona-vocabulary';

/**
 * Retired personas must not reach a screen from `src/` (#1003).
 *
 * #612 / PR #1001 guarded the PROSE side: `test/docs-retired-personas.test.ts`
 * reads every `.mdx` under `content/docs` and fails a page that names a retired
 * copilot.
 * The other side had no gate at all. Three rules looked like they covered it
 * and none did — `os validate` and `pnpm lint` walk authored metadata but treat
 * a card's `title` as free text; the "documented agent names resolve" rule and
 * `test/metadata-references.test.ts`'s AI-binding rule both read `agent:` /
 * `defaultAgent:` KEYS. All three watch keys, and a persona in live UI copy is
 * a sentence. One lived in `src/pages/home.page.ts` for months with six gates
 * green (#1002), and the pin #1002 added covers exactly one card: change a
 * different card, a view's `emptyState`, or a skill's `description`, and the
 * same wording walks back in.
 *
 * ## What this reads, and why it reads all of it
 *
 * The scan walks the RESOLVED stack — `objectstack.config.ts` after every
 * `src/` module is imported and registered — not the source text. That choice
 * is load-bearing twice over:
 *
 * - **Comments are structurally excluded.** They are the one legitimate place
 *   in `src/` to name a retired persona, and they exist today:
 *   `src/pages/home.page.ts` carries two, explaining why the card must NOT name
 *   `sales_copilot` and pointing at `content/docs/ai-copilot/index.mdx`. A
 *   source-text grep would flag both and need a `HISTORICAL`-style whitelist to
 *   excuse them. Reading the resolved stack means there is nothing to excuse,
 *   which is why this rule ships with no exemption map — an exemption list with
 *   no members is a standing licence granted to nobody and reviewed by nobody.
 * - **It reaches what is really registered**, including all four locale packs.
 *   The CJK spellings only ever appear in `src/translations/*`, so a scan that
 *   missed them would report those four spellings clean forever.
 *
 * Every string is checked, not a list of "user-visible" keys. The measurement
 * behind that: the card-named four (`title` / `label` / `description` / `help`)
 * cover 6,292 of the stack's 20,578 strings, and miss 510 more that also reach
 * a screen — `successMessage` (161), `pluralLabel` (90), `subject` (77),
 * `subtitle` (26), `helpText` (15) and others. A key allow-list is therefore a
 * hole that grows every time someone authors a new component prop, and the hole
 * is invisible: the rule stays green. Checking every string costs nothing here
 * (the vocabulary is six proper nouns) and cannot develop that hole.
 *
 * ## Reverse verification (#1003)
 *
 * Predicted direction: **green from the start**, unlike the docs rule, which
 * was red on 29 pages before #612's rewrite. Measured on `origin/main`
 * @ `903079a5` before this rule existed: 0 hits across all 20,578 authored
 * strings, and 0 across all 166 `src/**\/*.ts` files by source-text grep too —
 * #1002 had already removed the last one. A rule that is green on the day it
 * lands is the reason it is safe to land: it is a ratchet, not a backlog.
 *
 * Because "0 found" and "the detector stopped matching" read identically, the
 * two probes below are what actually protect this rule — the same reason
 * `docs-retired-personas.test.ts` carries its own.
 */
describe('authored metadata does not name a retired copilot persona (#1003)', () => {
  /**
   * `src/`-only vocabulary, on top of the shared personas.
   *
   * The bare word is a UI term and NOT a docs term. #611 deliberately keeps
   * *AI Copilot* as a documentation section name, while PR #1002 neutralised
   * the bare word in interface copy, because "Copilot" alone reads as an
   * app-owned assistant on a card. Encoding that split is the whole reason the
   * shared vocabulary stops at the persona pairs.
   */
  const UI_ONLY = ['Copilot'];

  type Str = { path: string; value: string };

  /** Every string in the resolved stack, with the path that reaches it. */
  const collect = (): Str[] => {
    const out: Str[] = [];
    const seen = new WeakSet<object>();
    const walk = (node: unknown, path: string): void => {
      if (typeof node === 'string') {
        out.push({ path, value: node });
        return;
      }
      if (!node || typeof node !== 'object') return;
      // Metadata is a DAG — shared widgets are registered under several
      // surfaces. Without this the walk revisits them; with it, each string is
      // reported once, at the first path that reaches it.
      if (seen.has(node as object)) return;
      seen.add(node as object);
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
      }
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, path ? `${path}.${k}` : k);
      }
    };
    walk(stack, '');
    return out;
  };

  const STRINGS = collect();

  /** Retired spellings `text` writes, after the shared normalisation. */
  const found = (text: string): string[] => {
    const n = normalise(text);
    return [
      ...PERSONAS.filter((p) => p.re.test(n)).map((p) => p.label),
      ...UI_ONLY.filter((w) => n.includes(w)),
    ];
  };

  it('the scan reads a real stack', () => {
    // Vacuity guard #1: a stack that failed to register would report clean.
    expect(
      STRINGS.length,
      'almost no strings found in the resolved stack — this guard has gone vacuous',
    ).toBeGreaterThan(5000);
  });

  it('the scan reaches the locale packs, where the CJK spellings live', () => {
    // Vacuity guard #2. 销售/服务/銷售/服務 are authored ONLY in the translation
    // bundles; if the walk stopped reaching them, four of the seven spellings
    // would be unenforced and every run would still say "clean".
    const locales = STRINGS.filter((s) => s.path.startsWith('translations'));
    expect(locales.length, 'walk never reached stack.translations').toBeGreaterThan(1000);
  });

  it('the detector reads every spelling it claims to', () => {
    // Vacuity guard #3, and the one that matters: every assertion here reports
    // "nothing found" when the tree is clean AND when the regexes have stopped
    // matching. Only a positive probe tells those two apart.
    const probes: { text: string; expected: string }[] = [
      { text: 'Ask the Sales Copilot for a briefing', expected: 'Sales Copilot' },
      { text: 'The Service Copilot triages this case', expected: 'Service Copilot' },
      { text: '让销售 Copilot 替你判定', expected: '销售 Copilot' },
      { text: '由服务Copilot 分流', expected: '服务 Copilot' },
      { text: '銷售 Copilot 摘要', expected: '銷售 Copilot' },
      { text: '服務 Copilot 分流', expected: '服務 Copilot' },
      // the bare word, which is what #1002 actually had to remove
      { text: 'Your Copilot summarises today', expected: 'Copilot' },
    ];
    const unread = probes
      .filter((p) => !found(p.text).includes(p.expected))
      .map((p) => `${p.text} → expected ${p.expected}, read ${JSON.stringify(found(p.text))}`);
    // Collected rather than asserted per probe, so a narrowed detector names
    // every spelling it stopped reading in one run instead of only the first.
    expect(
      unread,
      `the persona detector no longer reads:\n  ${unread.join('\n  ')}\n` +
        'A spelling this scan cannot see is copy nobody is checking — and the rule below ' +
        'would go green over it, which is indistinguishable from the app being clean.',
    ).toEqual([]);
  });

  it('no authored string names a retired persona', () => {
    const offenders = STRINGS.map((s) => ({ path: s.path, hit: found(s.value) }))
      .filter((s) => s.hit.length > 0)
      .map((s) => `${s.path}: ${s.hit.join(', ')}`);
    expect(
      offenders,
      `authored metadata naming a retired copilot persona:\n  ${offenders.join('\n  ')}\n` +
        'Say "AI assistant" (zh: 「AI 助手」) instead, and keep the sentence\'s functional ' +
        'meaning — only the name changes. HotCRM ships SKILLS; the assistant they attach to ' +
        'is the platform\'s (`ask`), implemented by an agent in objectstack-ai/cloud. Naming ' +
        'an app-owned persona describes an entity this app does not contain (#512, ' +
        'ADR-0063 §2). Retirement HISTORY belongs in a code comment, which this scan does ' +
        'not read — see the header.',
    ).toEqual([]);
  });
});
