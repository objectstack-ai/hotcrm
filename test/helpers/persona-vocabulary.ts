// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The retired-copilot-persona vocabulary, shared by the two rules that read it.
 *
 * #512 removed the two app-authored agents and ADR-0063 §2 made the surface
 * skills-only. Two guards now enforce that on text, on two different surfaces:
 *
 *   `test/docs-drift.test.ts`   product prose under `content/docs`   (#612)
 *   `test/persona-copy.test.ts` authored metadata under `src/`       (#1003)
 *
 * They live in one module because the alternative was measured and rejected:
 * a second, hand-written copy would drift from the first, and the two would
 * then disagree silently — each reporting a clean surface in the vocabulary
 * the other had already widened. One definition, two readers.
 *
 * Two things about the matching are load-bearing rather than style, and both
 * travel with the code rather than with either caller:
 *
 * - **Soft wraps are normalised first.** `content/docs/index.mdx` wrote "the
 *   Sales\n> Copilot" across a blockquote line break, and `whats-new.mdx`
 *   wrote "ask the Sales\nCopilot" across a plain one. A line-oriented grep —
 *   the obvious way to write this — reads neither.
 * - **CJK wraps are tightened after that.** `ai-copilot/index.zh-Hant.mdx`
 *   breaks 「服務 Copilot」 between 服 and 務, which no amount of space-joining
 *   repairs — join the lines with a space and the phrase reads 服 務 Copilot.
 *   Whitespace between two CJK characters is a typesetting artifact, never a
 *   word boundary, so it is removed before matching.
 *
 * What is NOT here, deliberately: the bare word "Copilot". The docs keep
 * *AI Copilot* as a section name (#611), while `src/` UI copy does not get to
 * name it at all (#1002). That line differs by surface, so each caller adds
 * its own surface terms on top of this shared base.
 */

/** Soft wraps and blockquote continuation markers collapse to one space. */
const unwrap = (text: string): string => text.replace(/[ \t]*\n[ \t]*>?[ \t]*/g, ' ');

/**
 * Whitespace BETWEEN two CJK characters is typesetting, not a word boundary
 * (see the header) — `服 務` is one word that a line break split.
 */
const CJK = '\\u4e00-\\u9fff';
const tighten = (text: string): string =>
  text.replace(new RegExp(`([${CJK}])[ \\t]+(?=[${CJK}])`, 'g'), '$1');

export const normalise = (text: string): string => tighten(unwrap(text));

/**
 * The persona spellings, one regex each so the failure names the spelling it
 * found. The separator is an OPTIONAL single space: after `normalise()` a
 * wrapped phrase is space-joined, and Chinese typography writes 「服务Copilot」
 * with no space at all.
 */
export const PERSONAS: { label: string; re: RegExp }[] = [
  { label: 'Sales Copilot', re: /Sales ?Copilot/ },
  { label: 'Service Copilot', re: /Service ?Copilot/ },
  { label: '销售 Copilot', re: /销售 ?Copilot/ },
  { label: '服务 Copilot', re: /服务 ?Copilot/ },
  { label: '銷售 Copilot', re: /銷售 ?Copilot/ },
  { label: '服務 Copilot', re: /服務 ?Copilot/ },
];
