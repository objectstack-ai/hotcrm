// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { packFor } from './helpers/metadata-fixtures';
import { stripComments } from '../scripts/check-source-token-ratchet.mjs';

/**
 * Chinese product term = the language-pack label (#837), for object names,
 * `status.options.*` values and field `label`s alike (#802).
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
 * The zh-Hans term is DERIVED — read off the zh-CN pack through the same stack
 * the app resolves it from, at `objects.<name>.label` for an object and at the
 * {@link Term.pins} path for a status or a field. Change the pack and the
 * expectation here moves with it; that is the whole point, and it is why this
 * file can never disagree with the product UI.
 *
 * {@link Pin.hant} is authored, for a stated reason: the app ships four
 * locales and none of them is Traditional (the console falls back to
 * Simplified — AGENTS.md, Documentation discipline rule 6), so there is no
 * pack field to read a Traditional form from. It is the script conversion of
 * the derived term, and the vacuity rules below check it is actually a
 * DIFFERENT string that actually appears on the Traditional pages.
 *
 * {@link Pin.retired} is authored too, and is the ledger of spellings this
 * term has answered to. Retiring a word is a decision; only its enforcement
 * is mechanical.
 *
 * ## Statuses and field labels, and why the scan is NOT narrowed (#802)
 *
 * #802 was filed on four defects that human eyes caught and no machine did —
 * `presented` written 已呈现/已呈現 (#765 §3), `expired` written 已到期 on two
 * different pages (#793, #801 甲), `expiration_date` written 过期日期 (#801 乙).
 * It asked one question before any of them could be gated: a status term
 * collides with mechanism prose in a way an object name does not. 到期日期 is
 * a field name and must follow the pack; 每日到期扫描, 自动到期, 报价单到期,
 * 即将到期 and 到期日 are mechanism names and must not be touched. The card
 * proposed narrowing the scan to status-table cells and `**bold**` references,
 * on the reasoning — from #736 — that a gate which cries wolf gets silenced.
 *
 * That narrowing was measured against the three fix commits (`483dbb4d`,
 * `5596c6cc`, `36765f21`) and REJECTED, because it is the weaker criterion on
 * both axes:
 *
 * 1. It is not needed for quiet. The collision is on the ROOT (到期, 呈现),
 *    never on the whole retired spelling. Across the 134 zh pages, 71 lines
 *    carry 到期 and 14 carry 呈现; ZERO carry 已到期, 过期日期 or 已呈现. A
 *    status name and a field label are complete words, so a ledger of complete
 *    words discriminates on its own.
 * 2. It is not safe. Six of the nineteen historical defect sites carried no
 *    markup at all — `不要更改已呈现报价上的定价`, `自動標記為已到期`,
 *    `任何过期日期已过的报价`, `检查有效期（过期日期）`, and the bare field
 *    list in the cell `报价日期、过期日期、付款条款`. Narrowing by markup
 *    position would have dropped a third of the very defects the card exists
 *    for, and #801 甲 is on record that this class is consumed ACROSS pages.
 *
 * So the criterion is ledger granularity, not syntactic position — and it is
 * pinned rather than asserted: {@link SPARED} names the mechanism phrases the
 * `presented` and `expired` sweeps had to spare, requires each to still be in
 * the corpus, and requires no retired spelling to be a substring of any of
 * them. Widen a `retired` entry to a bare root and that rule goes red on the
 * mechanism names immediately, before the gate can start crying wolf.
 *
 * ## Two mechanics worth knowing before you edit this file
 *
 * 1. The retired spellings are written as `\u` escapes. This file is inside
 *    its own scan surface, and a literal here would make the guard fail on
 *    itself. Escapes keep the ledger honest without an exemption — the same
 *    reason `docs-analytics-vocabulary.test.ts` escapes its CJK range. The
 *    comment beside each one carries the readable form; comments are stripped
 *    before the scan, so they cost nothing. {@link SPARED} is written in plain
 *    characters on purpose: a spared phrase that DID contain a retired
 *    spelling has to fail, and self-scanning is one of the two ways it does.
 * 2. `.ts` files are scanned COMMENT-STRIPPED, via the token ratchet's own
 *    scanner. That is not a convenience: the three ledgers above now explain
 *    in prose which spelling they used to carry, and those sentences name the
 *    retired words. What ships to a user is the string literal, so the string
 *    literal is what is judged.
 *
 * ## Adding an object, a status or a field
 *
 * One entry in {@link TERMS} per object; one entry in {@link Term.pins} per
 * status option or field label, keyed by its path inside that object's pack
 * entry. The path is the source-of-truth pointer and is resolved, not trusted
 * — a typo cannot quietly produce a pin that guards nothing. The rules are
 * written per term, so another row costs nothing but its own ledger line, and
 * this stays a pin on THIS repo's business facts rather than a gate farm
 * (AGENTS.md, Scope rule 3).
 */

type Pin = {
  /**
   * Traditional-script form of the derived term, or `null` when the term is
   * the SAME in both scripts (已提交, 到期日期 — every character is shared).
   *
   * `null` is a declaration and it is checked: the Simplified form itself must
   * then be found on the zh-Hant pages. It is also the one value the mistake
   * below cannot produce — filling this in from the wrong column yields a
   * STRING equal to the Simplified term, which the `not.toEqual(hans)` rule
   * rejects. So the two cases stay distinguishable.
   */
  hant: string | null;
  /** Spellings the term used to answer to. None may reach a Chinese surface. */
  retired: readonly string[];
};

type Term = Pin & {
  /**
   * Fewest zh pages, per script, that must still name this object. Measured on
   * `main` @ 9f59f6a: crm_case 39/39, crm_quote 8/8. The floor is what stops a
   * sweep from satisfying every absence rule by deleting the word.
   */
  minPages: number;
  /**
   * `status.options.*` and field `label` terms this object also pins (#802),
   * keyed by the dotted path into `objects.<name>` in the zh-CN pack.
   */
  pins: Readonly<Record<string, Pin>>;
};

const TERMS: Record<string, Term> = {
  crm_case: {
    hant: '工單',
    minPages: 25,
    retired: [
      '\u670d\u52a1\u6848\u4f8b', // 服务案例 — the pack's own label until #837
      '\u670d\u52d9\u6848\u4f8b', // 服務案例 — its Traditional twin, on two pages
      '\u6848\u4f8b', // 案例 — 14 zh-Hans + 15 zh-Hant pages, and three ledgers
      '\u6848\u4ef6', // 案件 — sharing-coverage's zh-Hant row + three zh-Hant pages
      '\u4e2a\u6848', // 个案 — whats-new.zh-Hans, a fifth spelling nothing tracked
      '\u500b\u6848', // 個案 — its Traditional twin (never shipped; banned anyway)
    ],
    pins: {},
  },
  crm_quote: {
    hant: '報價單',
    minPages: 5,
    // The object name itself has never drifted. Its four defects were all one
    // level down, which is why #802 exists as a separate card from #837.
    retired: [],
    pins: {
      'fields.status.options.presented': {
        hant: null, // 已提交 — every character is script-invariant
        retired: [
          '\u5df2\u5448\u73b0', // 已呈现 — quotes.zh-Hans, six sites (#765 §3, fixed by #794)
          '\u5df2\u5448\u73fe', // 已呈現 — its Traditional twin, same six sites
        ],
      },
      'fields.status.options.expired': {
        hant: '已過期',
        retired: [
          '\u5df2\u5230\u671f', // 已到期 — quotes.zh-Hant (#793) and sales/index.zh-Hant (#801 甲); script-invariant, so one entry covers both pages
        ],
      },
      'fields.expiration_date.label': {
        hant: null, // 到期日期 — every character is script-invariant
        retired: [
          '\u8fc7\u671f\u65e5\u671f', // 过期日期 — quotes.zh-Hans, four sites (#801 乙)
          '\u904e\u671f\u65e5\u671f', // 過期日期 — its Traditional twin (never shipped; banned anyway)
        ],
      },
    },
  },
};

/**
 * Hits that are NOT this term — deliberately empty, and deliberately present.
 *
 * 案例 is also ordinary Chinese for "case study", and 案件 is an ordinary
 * Japanese word: `ja-JP.ts` uses it in `crm_opportunity`'s description
 * (「商談・案件」), which is why the Japanese pack is outside the scan surface
 * rather than exempted here. Every one of the 92 Chinese hits #837 swept WAS
 * `crm_case`, so nothing needed an exception.
 *
 * #802 extended the ledger to statuses and field labels and re-measured: still
 * empty. The 71 到期 lines and 14 呈现 lines in the corpus are all mechanism
 * prose, and none of them spells a retired term — see {@link SPARED}, which
 * holds that boundary in place. If a real exception ever appears, add
 * `file:line` here with the sentence that makes it unrelated — do not widen
 * the scan surface, and do not delete the rule.
 */
const ALLOWED: readonly string[] = [];

/**
 * Mechanism prose that shares a ROOT with a retired spelling and must survive.
 *
 * This is #802's question 2, written down as a fact instead of a promise. Each
 * phrase is real prose in the corpus (rule: it is still there), and none of
 * them contains a retired spelling (rule: the ledger stays word-grained). The
 * second rule is what fails the day somebody "fixes" a false negative by
 * retiring a bare 到期 or 呈现 — it goes red here, on legitimate prose, rather
 * than in CI on thirty pages nobody has decided about.
 */
const SPARED: readonly string[] = [
  '每日到期扫描', // quotes.zh-Hant's nightly sweep, and contracts'
  '每日到期掃描',
  '每日过期扫描', // the zh-Hans spelling of the same sweep
  '自动到期', // administration/automation: 合同自动到期
  '自動到期',
  '报价单到期', // getting-started/introduction, the built-in automation list
  '報價單到期',
  '到期扫描', // revenue/contracts: 每日——到期扫描
  '到期掃描',
  '即将到期', // accounts: 要找即将到期的续约
  '即將到期',
  '到期日', // contracts: 到期日就是合同的结束日期 — a DIFFERENT word from 到期日期
  '到期时间', // sla-and-escalation: 超过 SLA 到期时间
  '到期時間',
  '呈现时刻', // quotes: 捕获其呈现时刻的定价 — the verb, spared by #794
  '呈現時刻',
  '以看板呈现', // quotes: 报价流水线以看板呈现 — likewise
  '以看板呈現',
];

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
const ZH_PAGES = [...HANS_PAGES, ...HANT_PAGES];

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

/** `fields.status.options.presented` against this object's pack entry. */
const resolve = (entry: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], entry);

/* ---------------------------------------------------------------- rules */

describe.each(Object.entries(TERMS))('%s is one Chinese word everywhere (#837)', (name, term) => {
  const pack = packFor('zh-CN');
  const entry = pack?.objects?.[name];
  const hans = (entry?.label ?? '') as string;
  const pins = Object.entries(term.pins);
  /** The object's own term plus every pinned one, as `[label, Pin, derived]`. */
  const allTerms: [string, Pin, string][] = [
    [`objects.${name}.label`, term, hans],
    ...pins.map(
      ([path, pin]) =>
        [`objects.${name}.${path}`, pin, String(resolve(entry, path) ?? '')] as [string, Pin, string],
    ),
  ];
  const allRetired = allTerms.flatMap(([, pin]) => pin.retired);

  describe('the ledger and the scan surface are real', () => {
    it('the object has a zh-CN label to derive from', () => {
      expect(pack, 'no zh-CN pack in the stack — every rule below would be vacuous').toBeTruthy();
      expect(hans, `objects.${name}.label is missing from the zh-CN pack`).not.toEqual('');
      expect(
        (entry?.pluralLabel ?? hans) as string,
        `objects.${name}.pluralLabel disagrees with its label — Chinese has no plural form`,
      ).toEqual(hans);
    });

    it('every pinned path resolves to a term in the pack', () => {
      // A mistyped path would otherwise derive '' and quietly guard nothing —
      // the pin would look like coverage and assert nothing at all.
      const dead = allTerms.filter(([, , derived]) => derived === '').map(([label]) => label);
      expect(
        dead,
        `pinned path(s) that resolve to nothing in the zh-CN pack: ${dead.join(', ')}. ` +
          'A pin names the field it derives from; if the field moved, move the pin.',
      ).toEqual([]);
    });

    it('the ledger retires at least one spelling for this object', () => {
      // An entry with nothing retired anywhere is a decorative row: every
      // absence rule below would pass by having no spelling to look for.
      expect(
        allRetired.length,
        `TERMS.${name} retires no spelling, on itself or on any pin — the absence rules ` +
          'would all pass vacuously. Retire the word that drifted, or drop the row.',
      ).toBeGreaterThan(0);
    });

    it('no derived term is itself a retired spelling', () => {
      // Renaming a term TO a retired word would otherwise turn every rule
      // below green by making the banned word canonical.
      const clashes = allTerms
        .filter(([, , derived]) => allRetired.some((s) => derived.includes(s)))
        .map(([label, , derived]) => `${label} = ${derived}`);
      expect(
        clashes,
        `derived term(s) containing a spelling this ledger retires: ${clashes.join(', ')}`,
      ).toEqual([]);
    });

    it('each Traditional form is a different string, or is declared identical', () => {
      const wrongColumn = allTerms
        .filter(([, pin, derived]) => pin.hant !== null && pin.hant === derived)
        .map(([label]) => label);
      expect(
        wrongColumn,
        `Traditional form equals the Simplified one for: ${wrongColumn.join(', ')}. ` +
          'Either the word needs no conversion — then write `hant: null`, which the ' +
          'zh-Hant presence rule below verifies — or the ledger was filled in from the ' +
          'wrong column.',
      ).toEqual([]);
      const empty = allTerms.filter(([, pin]) => pin.hant === '').map(([label]) => label);
      expect(empty, `no Traditional form authored for: ${empty.join(', ')}`).toEqual([]);
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
      const bad = offenders(HANS_PAGES, allRetired);
      expect(
        bad,
        `zh-Hans page(s) naming ${name} or one of its statuses/fields by a retired word:\n  ` +
          bad.join('\n  '),
      ).toEqual([]);
    });

    it('from every zh-Hant page', () => {
      const bad = offenders(HANT_PAGES, allRetired);
      expect(
        bad,
        `zh-Hant page(s) naming ${name} or one of its statuses/fields by a retired word:\n  ` +
          bad.join('\n  '),
      ).toEqual([]);
    });

    it('from the language pack itself', () => {
      const bad = offenders([PACK_FILE], allRetired);
      expect(
        bad,
        `${PACK_FILE} still spells something with a retired word — the pack IS the product ` +
          'UI, so a label, an option or a `help` sentence left behind puts the old word back ' +
          `on screen and sends the reader looking for a status that does not exist:\n  ` +
          bad.join('\n  '),
      ).toEqual([]);
    });

    it('from every authored ledger under test/', () => {
      const bad = offenders(TEST_FILES, allRetired);
      expect(
        bad,
        'test ledger(s) pinning a retired spelling. This is the drift the guard exists for: a ' +
          'ledger and its page agree with each other and contradict the pack, and both stay ' +
          `green.\n  ${bad.join('\n  ')}`,
      ).toEqual([]);
    });
  });

  describe('the surviving terms are actually there', () => {
    // Deleting the words everywhere would satisfy every rule above. These are
    // what stop a sweep from passing by emptying the docs.
    it('the derived object term is on the zh-Hans pages', () => {
      const pages = carrying(HANS_PAGES, hans);
      expect(
        pages.length,
        `only ${pages.length} zh-Hans page(s) name ${name} as ${hans} — the term was removed, ` +
          'not unified',
      ).toBeGreaterThanOrEqual(term.minPages);
    });

    it('the Traditional object term is on the zh-Hant pages', () => {
      const pages = carrying(HANT_PAGES, term.hant ?? hans);
      expect(
        pages.length,
        `only ${pages.length} zh-Hant page(s) name ${name} as ${term.hant ?? hans}`,
      ).toBeGreaterThanOrEqual(term.minPages);
    });

    it('every pinned status and field label survives in both scripts', () => {
      // Also the proof of a `hant: null` declaration: an invariant term has to
      // turn up on the Traditional pages spelled exactly as the pack spells it.
      const gone = pins.flatMap(([path, pin]) => {
        const derived = String(resolve(entry, path) ?? '');
        const traditional = pin.hant ?? derived;
        return [
          ...(carrying(HANS_PAGES, derived).length === 0
            ? [`${path}: no zh-Hans page says ${derived}`]
            : []),
          ...(carrying(HANT_PAGES, traditional).length === 0
            ? [
                `${path}: no zh-Hant page says ${traditional}` +
                  (pin.hant === null ? ' (declared script-invariant — the claim is false)' : ''),
              ]
            : []),
        ];
      });
      expect(
        gone,
        `pinned term(s) that no page names any more — removed rather than corrected:\n  ` +
          gone.join('\n  '),
      ).toEqual([]);
    });

    it('the ledgers that pin a row for this object still carry one', () => {
      // Named on purpose: a ledger may drop the row instead of fixing it, and
      // an absence rule cannot see that.
      // crm_quote's list is EMPTY because it was measured, not assumed: on
      // 9f59f6a no `test/**` ledger writes 报价单 at all (the quote suites pin
      // English status keys). An object must still appear here, so adding a
      // TERMS row forces that look rather than inheriting someone else's list.
      const LEDGERS: Record<string, readonly string[]> = {
        crm_case: [
          'test/sharing-coverage.test.ts',
          'test/status-state-machines.test.ts',
          'test/automation-docs-coverage.test.ts',
        ],
        crm_quote: [],
      };
      expect(
        Object.keys(LEDGERS),
        `no ledger list recorded for ${name} — write one, or write [] once you have checked`,
      ).toContain(name);
      const files = LEDGERS[name] ?? [];
      const missing = files.filter((f) => !scannable(f).includes(hans));
      expect(
        missing,
        `ledger(s) that no longer name ${name} in Simplified at all: ${missing.join(', ')}`,
      ).toEqual([]);
      if (name === 'crm_case') {
        expect(
          scannable('test/sharing-coverage.test.ts'),
          `sharing-coverage's ROW_LABEL lost its Traditional cell for ${name}`,
        ).toContain(term.hant ?? hans);
      }
    });
  });
});

/* ------------------------------------------------ #802, question 2 pinned */

describe('mechanism prose is spared by word grain, not by markup position (#802)', () => {
  const retiredEverywhere = Object.values(TERMS).flatMap((t) => [
    ...t.retired,
    ...Object.values(t.pins).flatMap((p) => p.retired),
  ]);

  it('every spared phrase is really in the corpus', () => {
    // Without this the rule below would be satisfied by an imaginary ledger:
    // phrases nobody writes cannot demonstrate that anything was spared.
    const absent = SPARED.filter((phrase) => carrying(ZH_PAGES, phrase).length === 0);
    expect(
      absent,
      `SPARED names prose that no zh page carries: ${absent.join(', ')}. Either the page was ` +
        'rewritten and the row should go, or the phrase is misspelt and this ledger has been ' +
        'proving nothing.',
    ).toEqual([]);
  });

  it('no retired spelling is a substring of spared prose', () => {
    // The whole answer to #802 question 2, mechanised. 到期日期 is a field name
    // and follows the pack; 每日到期扫描 is a mechanism name and must not be
    // touched. They are told apart by the ledger holding COMPLETE words — so
    // the day someone retires a bare 到期 or 呈现, this goes red here, on
    // legitimate prose, instead of going red in CI on the whole corpus.
    const collisions = SPARED.flatMap((phrase) =>
      retiredEverywhere.filter((s) => phrase.includes(s)).map((s) => `${phrase} contains ${s}`),
    );
    expect(
      collisions,
      'a retired spelling now matches mechanism prose, so the gate is about to report ' +
        `legitimate text as drift:\n  ${collisions.join('\n  ')}\n` +
        'Retire the complete status name or field label, not the root it shares with a verb.',
    ).toEqual([]);
  });

  it('the corpus really does carry the roots the ledger has to discriminate against', () => {
    // The measurement the criterion rests on: the roots are everywhere, the
    // complete retired words are nowhere. If the first half ever stopped being
    // true, word grain would no longer be doing any work and this file's
    // reasoning would need redoing rather than trusting.
    for (const root of ['到期', '过期', '呈现']) {
      expect(
        carrying(HANS_PAGES, root).length,
        `${root} no longer appears on any zh-Hans page — re-derive #802's criterion`,
      ).toBeGreaterThan(1);
    }
  });
});
