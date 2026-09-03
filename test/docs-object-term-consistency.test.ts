// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { packFor } from './helpers/metadata-fixtures';
import { stripComments } from '../scripts/check-source-token-ratchet.mjs';

/**
 * Chinese product term = the language-pack label (#837).
 *
 * Maintainer ruling, 2026-08-31 (verbatim, kept untranslated):
 *
 *   「crm_case  统一叫工单。」
 *
 * The ruling had three parts. Two were content: the pack's `crm_case` label
 * became 工单, and every Chinese page followed. This file is the third — the
 * durable half, and an explicit component of the ruled option, not a nicety.
 *
 * ## The failure this exists to catch
 *
 * Before it, `crm_case` answered to FIVE Chinese names at once, and every one
 * of them was inside something already green:
 *
 *   | surface                                      | spelling |
 *   | -------------------------------------------- | -------- |
 *   | `src/translations/zh-CN.ts` (the product UI)  | 服务案例  |
 *   | 29 zh-Hans pages / 27 zh-Hant pages           | 工单/工單 |
 *   | 14 zh-Hans pages / 15 zh-Hant pages           | 案例      |
 *   | `sharing-coverage.test.ts` ROW_LABEL, zh-Hant | 案件      |
 *   | `whats-new.zh-Hans.mdx`                       | 个案      |
 *
 * `sharing-coverage.test.ts` pinned the sharing tables, `automation-docs-
 * coverage.test.ts` pinned the automation page, `status-state-machines.test.ts`
 * pinned the state-machine roster — three guarded ledgers naming ONE object
 * three different ways, each one green, because each checked only that its own
 * page matched its own ledger. Nothing in the repo compared a ledger to the
 * pack, or one ledger to another. A reader following the docs searched the
 * console for a word the console does not use.
 *
 * ## What is derived and what is authored
 *
 * The zh-Hans term is DERIVED — read off `objects.<name>.label` in the zh-CN
 * pack through the same stack the app resolves it from. Change the pack and
 * the expectation here moves with it; that is the whole point, and it is why
 * this file can never disagree with the product UI.
 *
 * {@link Term.hant} is authored, for a stated reason: the app ships four
 * locales and none of them is Traditional (the console falls back to
 * Simplified — AGENTS.md, Documentation discipline rule 6), so there is no
 * pack field to read a Traditional form from. It is the script conversion of
 * the derived term, and the vacuity rules below check it is actually a
 * DIFFERENT string that actually appears on the Traditional pages.
 *
 * {@link Term.retired} is authored too, and is the ledger of spellings this
 * object has answered to. Retiring a word is a decision; only its enforcement
 * is mechanical.
 *
 * ## Two mechanics worth knowing before you edit this file
 *
 * 1. The retired spellings are written as `\u` escapes. This file is inside
 *    its own scan surface, and a literal here would make the guard fail on
 *    itself. Escapes keep the ledger honest without an exemption — the same
 *    reason `docs-analytics-vocabulary.test.ts` escapes its CJK range. The
 *    comment beside each one carries the readable form; comments are stripped
 *    before the scan, so they cost nothing.
 * 2. `.ts` files are scanned COMMENT-STRIPPED, via the token ratchet's own
 *    scanner. That is not a convenience: the three ledgers above now explain
 *    in prose which spelling they used to carry, and those sentences name the
 *    retired words. What ships to a user is the string literal, so the string
 *    literal is what is judged.
 *
 * ## Adding an object
 *
 * One entry in {@link TERMS}. The rules are written per object, so a second
 * entry costs nothing but its own ledger row — and this stays a pin on THIS
 * repo's business facts rather than a gate farm (AGENTS.md, Scope rule 3).
 */

type Term = {
  /**
   * Traditional-script form of the pack's label. Authored — see the header.
   */
  hant: string;
  /** Spellings the object used to answer to. None may reach a Chinese surface. */
  retired: readonly string[];
};

const TERMS: Record<string, Term> = {
  crm_case: {
    hant: '工單',
    retired: [
      '\u670d\u52a1\u6848\u4f8b', // 服务案例 — the pack's own label until #837
      '\u670d\u52d9\u6848\u4f8b', // 服務案例 — its Traditional twin, on two pages
      '\u6848\u4f8b', // 案例 — 14 zh-Hans + 15 zh-Hant pages, and three ledgers
      '\u6848\u4ef6', // 案件 — sharing-coverage's zh-Hant row + three zh-Hant pages
      '\u4e2a\u6848', // 个案 — whats-new.zh-Hans, a fifth spelling nothing tracked
      '\u500b\u6848', // 個案 — its Traditional twin (never shipped; banned anyway)
    ],
  },
};

/**
 * Hits that are NOT this object — deliberately empty, and deliberately present.
 *
 * 案例 is also ordinary Chinese for "case study", and 案件 is an ordinary
 * Japanese word: `ja-JP.ts` uses it in `crm_opportunity`'s description
 * (「商談・案件」), which is why the Japanese pack is outside the scan surface
 * rather than exempted here. Every one of the 92 Chinese hits #837 swept WAS
 * `crm_case`, so nothing needed an exception. If a real one appears, add
 * `file:line` here with the sentence that makes it unrelated — do not widen
 * the scan surface, and do not delete the rule.
 */
const ALLOWED: readonly string[] = [];

/* ------------------------------------------------------------- surfaces */

const DOCS_ROOT = join(REPO_ROOT, 'content/docs');
const TEST_ROOT = join(REPO_ROOT, 'test');
const PACK_FILE = 'src/translations/zh-CN.ts';

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });

const rel = (f: string): string => relative(REPO_ROOT, f);
const read = (f: string): string => readFileSync(join(REPO_ROOT, f), 'utf8');

const HANS_PAGES = walk(DOCS_ROOT).filter((f) => f.endsWith('.zh-Hans.mdx')).map(rel);
const HANT_PAGES = walk(DOCS_ROOT).filter((f) => f.endsWith('.zh-Hant.mdx')).map(rel);
const TEST_FILES = walk(TEST_ROOT).filter((f) => f.endsWith('.test.ts')).map(rel);

/** MDX ships whole; TypeScript ships only its string literals. */
const scannable = (file: string): string =>
  file.endsWith('.ts') ? stripComments(read(file)) : read(file);

/** Every `file:line: spelling` in `files` carrying one of `spellings`. */
const offenders = (files: readonly string[], spellings: readonly string[]): string[] =>
  files.flatMap((file) =>
    scannable(file)
      .split('\n')
      .flatMap((line, i) =>
        spellings
          .filter((s) => line.includes(s))
          .map((s) => `${file}:${i + 1}: ${s}`)
          .filter((hit) => !ALLOWED.includes(hit.split(': ')[0])),
      ),
  );

const carrying = (files: readonly string[], term: string): string[] =>
  files.filter((f) => scannable(f).includes(term));

/* ---------------------------------------------------------------- rules */

describe.each(Object.entries(TERMS))('%s is one Chinese word everywhere (#837)', (name, term) => {
  const pack = packFor('zh-CN');
  const hans = (pack?.objects?.[name]?.label ?? '') as string;

  describe('the ledger and the scan surface are real', () => {
    it('the object has a zh-CN label to derive from', () => {
      expect(pack, 'no zh-CN pack in the stack — every rule below would be vacuous').toBeTruthy();
      expect(hans, `objects.${name}.label is missing from the zh-CN pack`).not.toEqual('');
      expect(
        (pack?.objects?.[name]?.pluralLabel ?? hans) as string,
        `objects.${name}.pluralLabel disagrees with its label — Chinese has no plural form`,
      ).toEqual(hans);
    });

    it('the derived term is not itself a retired spelling', () => {
      // Renaming the object TO a retired word would otherwise turn every rule
      // below green by making the banned word canonical.
      expect(
        term.retired.filter((s) => hans.includes(s)),
        `objects.${name}.label is ${hans}, which contains a spelling this ledger retires`,
      ).toEqual([]);
    });

    it('the Traditional form is a different string from the Simplified one', () => {
      expect(term.hant, 'no Traditional form authored').not.toEqual('');
      expect(
        term.hant,
        'the Traditional form equals the Simplified one — either the word needs no conversion ' +
          '(then say so here) or the ledger was filled in from the wrong column',
      ).not.toEqual(hans);
    });

    it('has pages and ledgers to scan', () => {
      expect(HANS_PAGES.length, 'no zh-Hans pages found').toBeGreaterThan(50);
      expect(HANT_PAGES.length, 'no zh-Hant pages found').toBeGreaterThan(50);
      expect(TEST_FILES.length, 'no test files found').toBeGreaterThan(100);
    });

    it('comment stripping leaves the code it is meant to judge', () => {
      // If the stripper ever returned '' the ledger scan would pass by reading
      // nothing — the exact vacuity this file is supposed to be immune to.
      const stripped = scannable('test/sharing-coverage.test.ts');
      expect(stripped.length, 'stripComments returned almost nothing').toBeGreaterThan(2000);
      expect(stripped, 'the ROW_LABEL ledger was stripped away with the comments').toContain(
        'ROW_LABEL',
      );
    });
  });

  describe('the retired spellings are gone', () => {
    it('from every zh-Hans page', () => {
      const bad = offenders(HANS_PAGES, term.retired);
      expect(
        bad,
        `zh-Hans page(s) naming ${name} by a retired word instead of ${hans}:\n  ` +
          bad.join('\n  '),
      ).toEqual([]);
    });

    it('from every zh-Hant page', () => {
      const bad = offenders(HANT_PAGES, term.retired);
      expect(
        bad,
        `zh-Hant page(s) naming ${name} by a retired word instead of ${term.hant}:\n  ` +
          bad.join('\n  '),
      ).toEqual([]);
    });

    it('from the language pack itself', () => {
      const bad = offenders([PACK_FILE], term.retired);
      expect(
        bad,
        `${PACK_FILE} still labels something with a retired spelling — the pack IS the product ` +
          `UI, so a field or nav label left behind puts the old word back on screen:\n  ` +
          bad.join('\n  '),
      ).toEqual([]);
    });

    it('from every authored ledger under test/', () => {
      const bad = offenders(TEST_FILES, term.retired);
      expect(
        bad,
        'test ledger(s) pinning a retired spelling. This is the drift the guard exists for: a ' +
          'ledger and its page agree with each other and contradict the pack, and both stay ' +
          `green.\n  ${bad.join('\n  ')}`,
      ).toEqual([]);
    });
  });

  describe('the surviving term is actually there', () => {
    // Deleting the word everywhere would satisfy every rule above. These are
    // what stop a sweep from passing by emptying the docs.
    it('the derived term is on the zh-Hans pages', () => {
      const pages = carrying(HANS_PAGES, hans);
      expect(
        pages.length,
        `only ${pages.length} zh-Hans page(s) name ${name} as ${hans} — the term was removed, ` +
          'not unified',
      ).toBeGreaterThan(25);
    });

    it('the Traditional form is on the zh-Hant pages', () => {
      const pages = carrying(HANT_PAGES, term.hant);
      expect(
        pages.length,
        `only ${pages.length} zh-Hant page(s) name ${name} as ${term.hant}`,
      ).toBeGreaterThan(25);
    });

    it('the ledgers that pin a row for this object still carry one', () => {
      // Named on purpose: a ledger may drop the row instead of fixing it, and
      // an absence rule cannot see that.
      const LEDGERS = [
        'test/sharing-coverage.test.ts',
        'test/status-state-machines.test.ts',
        'test/automation-docs-coverage.test.ts',
      ];
      const missing = LEDGERS.filter((f) => !scannable(f).includes(hans));
      expect(
        missing,
        `ledger(s) that no longer name ${name} in Simplified at all: ${missing.join(', ')}`,
      ).toEqual([]);
      expect(
        scannable('test/sharing-coverage.test.ts'),
        `sharing-coverage's ROW_LABEL lost its Traditional cell for ${name}`,
      ).toContain(term.hant);
    });
  });
});
