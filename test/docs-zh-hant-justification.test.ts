// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/*
 * The zh-Hant navigation convention states the reason AGENTS.md sanctions (#1553).
 *
 * ## The failure this closes
 *
 * #1368 corrected the REASON zh-Hant pages name platform navigation in English —
 * the console falls back to Simplified, so a Traditional page labels navigation
 * in English rather than ship mixed Simplified/Traditional script — and the
 * correction was written into `AGENTS.md`, the bullet this file parses. Reaching
 * the reader-facing copies then took four PRs across two rounds (#1537, #1546,
 * #1549, #1554) and the sentence ended up corrected in NINE places. Nothing went
 * red at any point across those three days, because nothing in CI reads prose.
 *
 * The defect is therefore not duplication. It is that a correction landed in the
 * rulebook and no check noticed the copies disagreeing with it. Fewer copies
 * would not have closed that; a gate does, and this is the "declared = enforced"
 * shape `docs-setup-navigation-names`, `docs-view-rosters` and
 * `docs-object-term-consistency` already use.
 *
 * ## The rule, and why it is shaped as a CLAIM rather than a string
 *
 * The register genuinely differs per site — #1540 measured three variants and
 * they are all still on the tree: a mid-sentence aside with the full stop
 * OUTSIDE the parens (3 sites), a standalone note with it INSIDE (3 sites), and
 * a short form on `reference/glossary.zh-Hant.mdx` that drops the trailing
 * clause altogether. A rule demanding one canonical string reds on the glossary,
 * so this one pins the claim: a passage that states the CONVENTION must also
 * state the SANCTIONED REASON — the console falls back to Simplified — and both
 * markers are matched wrap-insensitively over de-commented, emphasis-stripped
 * text. Punctuation, wrapping and `**bold**` are all invisible to it.
 *
 * ## Reverse verification: replayed over the four correction PRs
 *
 * The rule was run over `content/docs` + `src` + `test` + `docs` at each commit
 * of the drift's real history. It is red for the whole window the drift was
 * invisible and green only once #1554 landed:
 *
 *   commit                blocks  RED
 *   05f867e1^ (pre-#1537)      7    7
 *   05f867e1  (#1537)          7    7
 *   30f2500e  (#1546)          8    7
 *   1efcaaa5^ (pre-#1549)      8    7
 *   1efcaaa5  (#1549)          9    1
 *   18f523fb^ (pre-#1554)      9    1
 *   18f523fb  (#1554)          9    0
 *   f4068c4d  (this branch)    9    0
 *
 * The last red is the one that matters most: at `18f523fb^` the ONLY violation
 * left was the navigation guard's own file header, the site that survived three
 * days precisely because that file exempts itself from its own scan.
 *
 * ## Why this rule cannot inherit that SELF blind spot
 *
 * `docs-setup-navigation-names.test.ts` scans `test/` but filters out `SELF`,
 * because its rule 1 bans retired VOCABULARY and would otherwise fire on its own
 * ledger. That exemption is why the stale reason could be written back into it
 * with no gate noticing. This file takes NO exemption of any kind — it scans
 * itself, and stays green structurally rather than by permission:
 *
 *  1. The convention rule matches an ASSERTION, not a vocabulary: a passage is
 *     only judged when it states the convention, and it passes by stating the
 *     sanctioned reason. A passage that quotes the retired form in order to
 *     FORBID it is either not a convention statement at all, or is one that
 *     states the sanctioned reason too — so it passes on its merits. The
 *     deliberate negation at `docs-setup-navigation-names.test.ts` ("it is NOT
 *     that a zh-Hant reader sees an English console", written by #1546) sits in
 *     a comment block that also carries "so the console falls back to
 *     Simplified", and is read and passed by this rule, not skipped by it.
 *  2. The retired-reason ledger below follows this repo's existing use/mention
 *     convention — `docs-object-term-consistency.test.ts` writes live spellings
 *     literally and RETIRED ones as `\u` escapes — so the CHINESE half, the half
 *     that is actually written on the pages and actually grepped, is never
 *     literally spelt here. Stated exactly rather than generously: the four
 *     ENGLISH entries ARE literal, because ASCII has no readable escape, and
 *     this file carries the English retired vocabulary five times over
 *     (four ledger rows, plus one quotation of #1546's negation above). Rule 3
 *     never reads them — its surface is `content/docs/**` — and rule 2 does
 *     read them and passes, which is the property being claimed, measured
 *     rather than asserted.
 *
 * Measured during authoring, which is why the paragraph above is a finding and
 * not an argument: the FIRST run of this rule went red on THIS FILE, twice — a
 * header paragraph and a bare marker declaration each named the convention with
 * no reason beside it. Both were rewritten rather than exempted. That is the
 * whole difference between this file and the SELF filter it exists downstream of.
 *
 * ⚠️ Declared limit, so it is not mistaken for coverage: the retired-reason
 * sweep reads `content/docs/**` only, which is the surface where a hand-written
 * new page is the hazard and where nothing ever quotes-to-forbid. Prose outside
 * that tree is covered by the convention rule instead — the shape the drift
 * actually took at every one of the nine sites. A retired assertion written into
 * `test/` with no convention statement anywhere near it is not caught by either
 * half; widening the sweep would need a negation discriminator, which is a
 * heuristic this file deliberately does not carry.
 *
 * ## What is derived and what is pinned
 *
 * The ENGLISH half is derived: `rulebookReason()` parses the `AGENTS.md` bullet
 * and the first test asserts the English markers below are substrings of it, so
 * the rulebook and this file cannot disagree silently — the next correction to
 * that bullet goes red HERE, which is the exact event that produced this card.
 * The CHINESE half cannot be derived: `AGENTS.md` is English and carries no
 * Traditional rendering of the sentence, so those markers are pinned constants
 * citing it. That is the weaker form, and it is weaker only in the direction of
 * translation — the claim itself is still tied to the rulebook through the
 * English markers that sit beside them.
 */

/** Trees read by the convention rule, plus the rulebook itself. No exemptions. */
const SCANNED_DIRS = ['content/docs', 'src', 'test', 'docs'];

/** The rulebook. Parsed by `rulebookReason()` and scanned like everything else. */
const RULEBOOK = 'AGENTS.md';

/** The `AGENTS.md` bullet that carries the sanctioned wording (`AGENTS.md:343`). */
const RULEBOOK_BULLET = '- zh-Hant conventions are stated by their';

/** Every scannable file under `dir`, as repo-relative paths. */
const walk = (dir: string): string[] => {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(join(REPO_ROOT, dir));
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = join(dir, entry);
    if (statSync(join(REPO_ROOT, rel)).isDirectory()) out.push(...walk(rel));
    else if (/\.(mdx|md|ts)$/.test(rel)) out.push(rel);
  }
  return out;
};

const read = (file: string): string => readFileSync(join(REPO_ROOT, file), 'utf8');

const FILES: string[] = [...SCANNED_DIRS.flatMap(walk), RULEBOOK];
const DOC_PAGES: string[] = walk('content/docs').filter((f) => f.endsWith('.mdx'));

/*
 * Markers. The convention and the sanctioned reason are LIVE wording and are
 * written literally; the retired reason is escaped, per the use/mention split
 * `docs-object-term-consistency.test.ts` established.
 */

/**
 * The pair the rule is built from, declared adjacently because the rule reads
 * this file too and holds it to exactly what it holds the docs to: a passage
 * naming the convention must state the sanctioned reason in the same passage.
 *
 * `CONVENTION` is wording that STATES the convention — a page naming platform
 * navigation in English. `SANCTIONED_REASON` is what such a passage owes: the
 * console falls back to Simplified, so a Traditional page labels navigation in
 * English rather than ship mixed Simplified/Traditional script (`AGENTS.md:343`).
 * The English markers are asserted against that bullet by the first test; the
 * Traditional ones are the pinned half, because the rulebook carries no Chinese
 * rendering to derive them from.
 */
const CONVENTION = ['以英文標示', 'navigation in english'];
const SANCTIONED_REASON = ['回退為簡體中文', 'falls back to simplified'];

/**
 * The reason #1368 measured FALSE and retired — that a zh-Hant reader is shown
 * an English console. Never assert any of these; the sanctioned reason above is
 * the Simplified fallback. Word-grained on purpose, the same rule
 * `docs-object-term-consistency.test.ts` uses: each entry is a complete claim
 * (subject plus predicate), so legitimate prose sharing a root — an English
 * `label` in source, a name that 顯示為 something in the pack — is not swept in.
 */
const RETIRED_REASON = [
  '\u4ecb\u9762\u986f\u793a\u82f1\u6587', // "the UI displays English", Traditional
  '\u4ecb\u9762\u6703\u986f\u793a\u82f1\u6587', // the same claim with the auxiliary verb
  '\u4ecb\u9762\u70ba\u82f1\u6587', // "the UI is in English", Traditional
  '\u754c\u9762\u663e\u793a\u82f1\u6587', // the Simplified twin of the first
  '\u754c\u9762\u4f1a\u663e\u793a\u82f1\u6587', // the Simplified twin of the second
  '\u754c\u9762\u4e3a\u82f1\u6587', // the Simplified twin of the third
  'sees the english ui',
  'sees an english ui',
  'sees the english console',
  'sees an english console',
];

/**
 * The `content/docs` pages that carry the justification note, declared so the
 * roster is checked in BOTH directions. Seven, measured on `f4068c4d`: five
 * under `administration/`, one guide, one reference page. A page that gains or
 * loses the note reds here by name — confirm the page really should carry it,
 * then move the path.
 *
 * ⚠️ This is not a list of pages that OWE the note. Six further zh-Hant pages
 * spell an English navigation path and carry no note at all (18 paths on
 * `reference/security-and-compliance.zh-Hant.mdx` alone); whether the
 * convention obliges them is a docs question, not this gate's, and filing it is
 * the honest move rather than widening this roster into a claim nobody ruled.
 */
const CONVENTION_SITES = [
  'content/docs/administration/automation.zh-Hant.mdx',
  'content/docs/administration/profiles.zh-Hant.mdx',
  'content/docs/administration/sandbox-and-releases.zh-Hant.mdx',
  'content/docs/administration/setup.zh-Hant.mdx',
  'content/docs/administration/sharing-and-security.zh-Hant.mdx',
  'content/docs/guides/integrations.zh-Hant.mdx',
  'content/docs/reference/glossary.zh-Hant.mdx',
];

/** Convention blocks on the tree when this landed: 7 pages + 2 in the nav guard. */
const MIN_CONVENTION_BLOCKS = 9;

/* --------------------------------------------------------------- the scan */

/** Strip one line down to its prose, whatever comment syntax carries it. */
const decomment = (line: string): string =>
  line
    .trim()
    .replace(/^\/\*\*?/, '')
    .replace(/^\*\//, '')
    .replace(/^\/\/+/, '')
    .replace(/^\*/, '')
    .trim();

/** Drop markdown emphasis and collapse wrapping, so neither can hide a marker. */
const normalise = (text: string): string =>
  text
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A file's prose as BLOCKS — runs of adjacent non-empty lines, joined.
 *
 * The unit is a block rather than a line because the sanctioned reason is
 * routinely split across a wrap: `docs-setup-navigation-names.test.ts` ends one
 * comment line with "so the console falls" and opens the next with "back to
 * Simplified". A line-grained rule reds on that correct passage. It is a block
 * rather than a whole file because a file-grained rule passes a drifted passage
 * on the strength of a correct one somewhere else in the same file — which is
 * exactly the state that tree was in for three days.
 */
const blocks = (text: string): string[] => {
  const out: string[] = [];
  let current: string[] = [];
  for (const line of text.split('\n')) {
    const prose = decomment(line);
    if (prose) {
      current.push(prose);
    } else if (current.length > 0) {
      out.push(normalise(current.join(' ')));
      current = [];
    }
  }
  if (current.length > 0) out.push(normalise(current.join(' ')));
  return out;
};

/** Case-insensitive for ASCII markers; Chinese has no case to fold. */
const carries = (text: string, markers: readonly string[]): boolean => {
  const lower = text.toLowerCase();
  return markers.some((m) => lower.includes(m.toLowerCase()));
};

const conventionBlocks = FILES.flatMap((file) =>
  blocks(read(file))
    .filter((text) => carries(text, CONVENTION))
    .map((text) => ({ file, text })),
);

/** The sanctioned reason clause, read out of the rulebook rather than restated. */
const rulebookReason = (): string => {
  const lines = read(RULEBOOK).split('\n');
  const at = lines.findIndex((line) => line.startsWith(RULEBOOK_BULLET));
  if (at === -1) return '';
  const buffer = [lines[at].replace(/^-\s*/, '')];
  for (let i = at + 1; i < lines.length; i += 1) {
    if (!lines[i].trim() || !/^\s{2,}\S/.test(lines[i]) || /^\s*-\s/.test(lines[i])) break;
    buffer.push(lines[i]);
  }
  const bullet = normalise(buffer.join(' '));
  const colon = bullet.indexOf(': ');
  if (colon === -1) return '';
  return bullet
    .slice(colon + 2)
    .replace(/\s*\(#\d+\)\.?$/, '')
    .trim();
};

describe('the zh-Hant navigation convention carries its sanctioned reason (#1553)', () => {
  it('AGENTS.md still states the reason this file pins', () => {
    const reason = rulebookReason();
    expect(
      reason,
      `AGENTS.md carries no bullet opening "${RULEBOOK_BULLET}" any more. The rulebook is ` +
        'the source for this whole file — re-derive the markers below from wherever the ' +
        'convention now lives, do not delete this test.',
    ).not.toBe('');

    for (const marker of [...CONVENTION, ...SANCTIONED_REASON].filter((m) => /^[\x20-\x7e]+$/.test(m))) {
      expect(
        reason.toLowerCase(),
        `the AGENTS.md bullet no longer contains "${marker}". It now reads:\n  ${reason}\n` +
          'The sanctioned wording has been corrected again — which is the event this gate ' +
          'exists to catch. Update CONVENTION / SANCTIONED_REASON here AND the Chinese ' +
          'copies on the seven pages in CONVENTION_SITES, in the same PR.',
      ).toContain(marker.toLowerCase());
    }

    for (const marker of RETIRED_REASON) {
      expect(
        reason.toLowerCase(),
        `the AGENTS.md bullet has been written back to a reason #1368 retired ("${marker}"). ` +
          'The measured reason is the Simplified fallback, not what the reader is shown.',
      ).not.toContain(marker.toLowerCase());
    }
  });

  it('every statement of the convention states the sanctioned reason', () => {
    const drifted = conventionBlocks
      .filter((block) => !carries(block.text, SANCTIONED_REASON))
      .map(({ file, text }) => `${file} :: ${text.slice(0, 180)}`);

    expect(
      drifted,
      'a passage names platform navigation in English without giving the reason AGENTS.md ' +
        `sanctions — the console falls back to Simplified:\n  ${drifted.join('\n  ')}\n` +
        'State the fallback in the same passage. This is the drift #1537/#1546/#1549/#1554 ' +
        'each fixed one site of, and the reason is measured, not stylistic (#1368).',
    ).toEqual([]);
  });

  it('no page under content/docs asserts the retired reason', () => {
    const hits = DOC_PAGES.flatMap((file) => {
      const text = read(file).toLowerCase();
      return RETIRED_REASON.filter((m) => text.includes(m.toLowerCase())).map(
        (m) => `${file} carries "${m}"`,
      );
    });

    expect(
      hits,
      `a docs page asserts the reason #1368 measured false:\n  ${hits.join('\n  ')}\n` +
        'The console does not show a zh-Hant reader English — it falls back to Simplified, ' +
        'and the page names navigation in English to avoid mixing scripts.',
    ).toEqual([]);
  });

  it('exactly the declared pages carry the justification note', () => {
    const carrying = DOC_PAGES.filter((file) => read(file).includes(CONVENTION[0]));
    const undeclared = carrying.filter((f) => !CONVENTION_SITES.includes(f));
    const missing = CONVENTION_SITES.filter((f) => !carrying.includes(f));

    expect(
      undeclared,
      `a page grew the justification note without joining the roster:\n  ${undeclared.join('\n  ')}\n` +
        'Add it to CONVENTION_SITES so the next correction knows where to reach.',
    ).toEqual([]);
    expect(
      missing,
      `a declared page no longer carries the note:\n  ${missing.join('\n  ')}\n` +
        'Either the page was rewritten and the row should go, or the note was dropped in a ' +
        'edit nobody meant — check which before moving the roster.',
    ).toEqual([]);
  });

  it('the scan is not vacuous', () => {
    expect(FILES.length, 'the scanned trees read no files — SCANNED_DIRS is wrong').toBeGreaterThan(400);
    expect(DOC_PAGES.length, 'content/docs yielded no pages — the docs tree moved').toBeGreaterThan(100);
    expect(
      conventionBlocks.length,
      `only ${conventionBlocks.length} passage(s) state the convention, against ` +
        `${MIN_CONVENTION_BLOCKS} measured when this landed. Either the markers stopped ` +
        'matching how the convention is written — in which case this gate is passing by ' +
        'reading nothing — or sites were deleted. Re-measure before lowering this.',
    ).toBeGreaterThanOrEqual(MIN_CONVENTION_BLOCKS);
  });
});
