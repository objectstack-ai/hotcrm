// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/*
 * Metadata counts in the product docs, read off the registered stack (#729).
 *
 * Split out of `test/docs-drift.test.ts` whole (#1196); see the SPLIT BY
 * FAMILY table there for the other families. The maintainer-side counterpart —
 * the `pnpm validate` transcript on `docs/STATUS.md` (#1011) — lives in
 * `test/docs-declared-versions.test.ts`, because it reads the same registered
 * stack through a machine transcript rather than through prose.
 */

/*
 * ─── Product docs count the metadata the stack registers (#729) ──────────────
 *
 * The README banner, the "What you get" section, the fork guide and the docs
 * overview all state how many objects / flows / dashboards / datasets HotCRM
 * ships. Every one of those numbers was written by hand and then left behind:
 * #592 added `crm_event` and `crm_event_attendee` plus a fifth dashboard, and
 * the docs still advertised 15 objects / 23 flows / 4 dashboards two releases
 * later. The README banner is the first thing a reader sees, and the fork guide
 * is what a customer follows — being told the wrong inventory there is a product
 * defect, not a typo.
 *
 * The expected values are read from `objectstack.config.ts` at test time and are
 * deliberately NOT written down here. A hard-coded expectation is just the same
 * hand-maintained number moved into the test file: it would go stale on the very
 * next object and take the guard with it.
 *
 * `actions` was deliberately absent while the calibre was undecided: the docs
 * said 13, the registered stack said 26, and the two count different things — an
 * action bound to five objects registers five times (#729's closing note).
 * #1012 settled it — the count a reader is told is the REGISTRATION count, for
 * the two reasons that decided it: every other figure in the same README
 * sentence is already a registration count, and it is the only calibre this rule
 * can re-derive instead of asserting a hand-maintained number back at itself
 * (a "family" is not a countable entity anywhere in `src/`). So `actions` now
 * reads off the stack like every other kind here.
 *
 * Its CLAIMS pattern is bold-scoped (`**26 actions**`) where the others are not,
 * and that is not decoration: `actions` is the one noun on this list that is
 * also an ordinary English word in these pages. `content/docs/whats-new.mdx`
 * quotes a Copilot prompt — "What are the next 3 actions I should take?" — in
 * all three locales, and a bare `(\d+) actions` reads that sentence as an
 * inventory claim and demands it say 26. The inventory sentence bolds every
 * figure it states, so the bold is what separates a claim about the app from a
 * sentence that merely contains a number. (Those quotes sit under the v1.0
 * heading HISTORICAL exempts, so today they would be excused anyway — that is an
 * accident of where the example lives, not a reason to write a pattern that
 * matches the wrong sentence.)
 *
 * Reverse verification: predicted and measured **red before, green after**. On
 * the pre-fix tree the rule listed nine drifted claims across seven files
 * (README ×5, fork-hotcrm ×3 locales, index ×3 locales, introduction ×3
 * locales); after the fix the only surviving `15` is the exempt v1.0 record.
 */
describe('product docs state the metadata counts the stack registers (#729)', () => {
  const registered = stack as unknown as Record<string, unknown[]>;

  /** Read from the registered stack — never hard-coded. */
  const REGISTERED: Record<string, number> = {
    objects: (registered.objects ?? []).length,
    flows: (registered.flows ?? []).length,
    dashboards: (registered.dashboards ?? []).length,
    datasets: (registered.datasets ?? []).length,
    // #1012: the registration count, the calibre that issue settled on. Read
    // here exactly like the others — the number this rule enforces moves when
    // an action is bound to one more object, which is the whole point.
    actions: (registered.actions ?? []).length,
    // #1014: `getting-started/introduction` sold "a 10-role hierarchy" on the
    // page a new reader opens first. Both halves were wrong — `CrmPositions`
    // holds 12, and ADR-0090 D3 removed the hierarchy itself (positions are
    // flat capability-distribution groups; the parent links went with the
    // business-unit tree this app does not model). The wording is prose and
    // this rule cannot judge it, but the number is a count like any other.
    positions: (registered.positions ?? []).length,
  };

  /**
   * Every way the docs spell a count, one pattern per spelling so a failure
   * names the sentence it read. Three locale faces ship for each page, and the
   * translated ones spell the noun in Chinese — a rule that only reads English
   * guards one third of the surface (#725 taught this file the same lesson about
   * dashboard tiles).
   */
  const CLAIMS: { kind: keyof typeof REGISTERED; re: RegExp }[] = [
    { kind: 'objects', re: /(\d+) business objects/g },
    { kind: 'objects', re: /(\d+) objects across/g },
    { kind: 'objects', re: /(\d+) objects,/g },
    { kind: 'objects', re: /data model \((\d+) objects\)/g },
    { kind: 'objects', re: /(\d+) 个业务对象/g },
    { kind: 'objects', re: /(\d+) 個業務物件/g },
    { kind: 'objects', re: /(\d+) 个对象/g },
    { kind: 'objects', re: /(\d+) 個物件/g },
    { kind: 'flows', re: /(\d+) flows/g },
    { kind: 'flows', re: /visual flows \((\d+)\)/g },
    { kind: 'dashboards', re: /(\d+) dashboards/g },
    { kind: 'dashboards', re: /(\d+) 个仪表盘/g },
    { kind: 'dashboards', re: /(\d+) 個儀表板/g },
    { kind: 'datasets', re: /(\d+) datasets/g },
    { kind: 'datasets', re: /semantic layer \((\d+)\)/g },
    // Bold-scoped on purpose — see the note above this describe (#1012).
    { kind: 'actions', re: /\*\*(\d+) actions\*\*/g },
    // The README's repository-layout block states the same figure a second time,
    // in the shape the other three kinds are already matched in here
    // (`data model (17 objects)`, `visual flows (24)`, `semantic layer (9)`).
    // It said 13 while the banner said 13 and stayed wrong on every calibre —
    // the directory it annotates holds 6 files. One claim per spelling, so a
    // failure names the sentence it read.
    { kind: 'actions', re: /server actions \+ AI tools \((\d+)\)/g },
    // Positions, in the three spellings the pages settled on (#1014). The zh
    // nouns are the ones `administration/sharing-and-security` already uses —
    // 「岗位」 in zh-Hans, 「職位」 in zh-Hant — so the vocabulary is one word
    // per locale across the docs, not one per page.
    { kind: 'positions', re: /(\d+) positions/g },
    { kind: 'positions', re: /(\d+) 个岗位/g },
    { kind: 'positions', re: /(\d+) 個職位/g },
  ];

  /**
   * SECTIONS allowed to state a count that is not today's, each with the reason.
   * A map rather than a list, for the reason the persona rule gives in
   * `docs-retired-personas.test.ts`: an exemption with no stated reason is how
   * a targeted whitelist becomes a blanket one. All three entries are the same page in its three locales, and
   * the reason is the same one that exempts it from the persona rule — it is a
   * dated release record describing what v1.0 shipped, not a claim about today.
   *
   * ## Why the key is a SECTION and not a file (#1015)
   *
   * It was a file. `content/docs/whats-new.mdx` carries the v1.0 record AND a
   * "Latest release" section, which is a claim about TODAY — and a page-wide
   * exemption granted for the first covered the second. Under it that section
   * advertised `v5.0` / "Upgraded to ObjectStack 5.0" for however long it took
   * someone to read the page: neither number was ever an app version (the
   * manifest says 2.2.2) or the installed platform (17.0.0-rc.3), and the one
   * rule that would have noticed had been told not to look. The exemption was
   * right about the v1.0 section and wrong about the page.
   *
   * A claim is now exempt only when the `## ` section it sits under matches the
   * pattern here. The v1.0 heading opens with `v1.0` in all three locales, so
   * one pattern covers them; anything else on the page is checked like any
   * other product page.
   */
  const HISTORICAL: Record<string, { section: RegExp; reason: string }> = {
    'content/docs/whats-new.mdx': {
      section: /^v1\.0\b/,
      reason: 'the v1.0 release record — the inventory that release shipped',
    },
    'content/docs/whats-new.zh-Hans.mdx': {
      section: /^v1\.0\b/,
      reason: 'the v1.0 release record (zh-Hans)',
    },
    'content/docs/whats-new.zh-Hant.mdx': {
      section: /^v1\.0\b/,
      reason: 'the v1.0 release record (zh-Hant)',
    },
  };

  /** Depth-first walk of a docs tree, REPO_ROOT-relative. */
  const walkMdx = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkMdx(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  /**
   * The product surface #729 scoped this rule to: the README banner and the
   * docs site. `docs/` is a different audience and a different claim shape —
   * `docs/STATUS.md` states its counts as a transcript of what `pnpm validate`
   * prints (`Data: 17 Objects  344 Fields`), which none of the prose spellings
   * in CLAIMS matches. Adding the file here would widen the scan by one path
   * and check nothing on it; the transcript is pinned by its own rule in
   * `docs-declared-versions.test.ts` (#1011), against the same registered stack.
   */
  const COUNT_DOCS = ['README.md', ...walkMdx('content/docs')];

  type Claim = {
    file: string;
    line: number;
    /** The `## ` heading this claim sits under — '' before the first one. */
    section: string;
    kind: string;
    text: string;
    stated: number;
  };

  /**
   * The `## ` heading governing each 1-based line number.
   *
   * `### ` and deeper are deliberately not headings here: the v1.0 record files
   * its inventory under `### What's in v1.0`, and a reader attributes that to
   * the `## v1.0 …` section it is drawn inside.
   */
  const sectionByLine = (text: string): string[] => {
    const out: string[] = ['']; // index 0 is unused — line numbers are 1-based
    let current = '';
    for (const line of text.split('\n')) {
      const heading = /^## +(.*)$/.exec(line);
      if (heading) current = heading[1].trim();
      out.push(current);
    }
    return out;
  };

  const claimsIn = (file: string): Claim[] => {
    const text = readFileSync(join(REPO_ROOT, file), 'utf8');
    const sections = sectionByLine(text);
    return CLAIMS.flatMap(({ kind, re }) =>
      [...text.matchAll(re)].map((m) => {
        const line = text.slice(0, m.index ?? 0).split('\n').length;
        return { file, line, section: sections[line] ?? '', kind, text: m[0], stated: Number(m[1]) };
      }),
    );
  };

  const ALL_CLAIMS = COUNT_DOCS.flatMap(claimsIn);

  /** A claim excused by HISTORICAL — file AND section must both match. */
  const isHistorical = (c: Claim): boolean => {
    const entry = HISTORICAL[c.file];
    return entry !== undefined && entry.section.test(c.section);
  };

  it('the stack registers a count for every kind this rule guards', () => {
    // Vacuity guard #1: a config whose shape moved would leave every REGISTERED
    // entry at 0, and the rule would then demand the docs say "0" — loud, but
    // for the wrong reason. Fail here, where the message is true.
    const empty = Object.entries(REGISTERED)
      .filter(([, count]) => count === 0)
      .map(([kind]) => kind);
    expect(
      empty,
      `objectstack.config.ts registers nothing for: ${empty.join(', ')}. Either the stack ` +
        'shape moved (point REGISTERED at the new field) or the metadata is gone (drop the ' +
        'kind rather than leaving the rule green over an empty set).',
    ).toEqual([]);
  });

  it('the scan finds a claim of every kind it guards', () => {
    // Vacuity guard #2: a reworded sentence stops matching, and a rule that
    // matches nothing agrees with everything. Per-kind, so rewording one noun
    // cannot hide behind the other three still matching.
    const unclaimed = Object.keys(REGISTERED).filter(
      (kind) => !ALL_CLAIMS.some((c) => c.kind === kind),
    );
    expect(
      unclaimed,
      `no doc states a count for: ${unclaimed.join(', ')} — the docs were reworded and this ` +
        'rule now guards nothing for those kinds. Teach CLAIMS the new spelling, or drop the ' +
        'kind deliberately.',
    ).toEqual([]);
  });

  it('every exempt section still states a count, so no exemption is dead', () => {
    // Same discipline as the persona rule: an exemption that outlives the text it
    // excused silently widens the next time that page is edited. Section-scoped
    // since #1015, so this also fails if the v1.0 record is renamed or its
    // inventory moves out from under the heading the exemption names — either
    // way the licence would otherwise go on standing over a heading nobody
    // writes any more.
    const dead = Object.entries(HISTORICAL)
      .filter(([file]) => !ALL_CLAIMS.some((c) => c.file === file && isHistorical(c)))
      .map(([file, entry]) => `${file} (section matching ${entry.section})`);
    expect(
      dead,
      `HISTORICAL exempts sections that no longer state any count:\n  ${dead.join('\n  ')}\n` +
        'Drop the exemption — it now only serves to hide the next drift on that page.',
    ).toEqual([]);
  });

  it('every count a doc states is the count the stack registers', () => {
    const drifted = ALL_CLAIMS.filter(
      (c) => !isHistorical(c) && c.stated !== REGISTERED[c.kind],
    ).map(
      (c) => `${c.file}:${c.line} says "${c.text}", the stack registers ${REGISTERED[c.kind]} ${c.kind}`,
    );
    expect(
      drifted,
      `doc counts that no longer match objectstack.config.ts:\n  ${drifted.join('\n  ')}\n` +
        'Update the doc — the registered stack is the source of truth, and the README banner ' +
        'plus the fork guide are the two pages a prospective customer reads first.',
    ).toEqual([]);
  });
});
