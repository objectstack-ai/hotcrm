// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Product docs do not teach a role hierarchy that drives visibility (#1019).
 *
 * ## What is actually true
 *
 * ADR-0090 D3 removed the parent links between positions. `src/sharing/positions.ts`
 * states the consequence in its own header: positions are FLAT, and **visibility
 * does not roll up** — every rung that needs a record carries its own sharing
 * rule, which is why `opportunity_executive_sharing`, `case_director_sharing` and
 * `campaign_leadership_*` exist as companions to the manager-rung rules rather
 * than being inherited from them (#488). `objectstack.config.ts` repeats it at
 * the registration site, and `administration/sharing-and-security` says it to
 * the reader: *"Positions are **flat by design** — there is no hierarchy and
 * **nothing rolls up**."*
 *
 * ## What the docs said instead
 *
 * Ten other pages, in all three locales, taught the opposite — `glossary`
 * defined *Hierarchy* as "the org chart that drives visibility",
 * `reference/security-and-compliance` listed a **Role hierarchy** authorisation
 * layer whose job was "managers see their team's records", and `sales/accounts`,
 * `sales/opportunities`, `service/cases` and `sales/forecasting` each promised
 * that people above the owner can see the owner's records.
 *
 * That is not stale naming, it is a **false permission promise**, and the way it
 * fails is silent: an admin who puts someone in `sales_manager` expecting them to
 * pick up their reps' accounts gets no error and no records — the UI simply shows
 * an empty list. #549 is the runtime shape of the same family.
 *
 * ## Why a wording rule, and why a FORBIDDEN TERM rather than a classifier
 *
 * The #729 count guard next door compares NUMBERS, and #1014 measured that it
 * stays green when `introduction` is reverted to "**A 10-role hierarchy**" —
 * there is no counted claim in that sentence for it to read. Wording needs its
 * own rule.
 *
 * The rule bans the term outright instead of trying to tell a "mechanism
 * description" from a "mere mention", because after ADR-0090 D3 there is no
 * sentence about THIS app that can correctly contain it: the term names a thing
 * the app does not have. The one legitimate occurrence in the tree is not a
 * sentence at all — it is a platform list-view filter OPERATOR quoted verbatim
 * (`in role hierarchy`) in `guides/search-and-navigation`, and that is what the
 * exemption below is scoped to: the backticked token, not the page.
 *
 * ## Two term groups, because the promise survives its own vocabulary
 *
 * Group A is the term (`role hierarchy` and its three CJK spellings — the tree
 * really did carry 角色层级, 角色層級 AND 角色階層). Group B is the same promise
 * written without it: "all service managers and **their subordinates**"
 * (`service/cases`, `service/sla-and-escalation`), "everyone **below them in the
 * hierarchy**" (`sales/opportunities`), 「角色层级中位于其之上的人」. A group-A-only
 * rule certifies those as clean — they were the occurrences the issue's own grep
 * for `role hierarchy` could not see. Bare `hierarchy` / 层级 / 層級 is NOT banned
 * and must not be: **account hierarchy** is a real feature (`sales/accounts`), and
 * in Chinese 層級 is the ordinary word inside 欄位層級安全 and 記錄層級.
 *
 * ## Why this rule lives here and not in `docs-drift.test.ts`
 *
 * #1019 asked for it in `test/docs-drift.test.ts`, next to the #729 count guard
 * it complements. It does not fit: that file was already 95,692 bytes, and
 * appending this rule took it to 111,860 — over the 100KB ceiling
 * `scripts/check-source-hygiene.mjs` enforces, whose own advice is "split the
 * file". A dedicated `docs-*.test.ts` per docs rule family is this repo's
 * standing shape anyway (`docs-object-coverage`, `docs-analytics-vocabulary`,
 * `docs-search-navigation-views`, …), so the rule is here and `docs-drift.test.ts`
 * is byte-for-byte unchanged.
 *
 * ## Reverse verification (#1019)
 *
 * Predicted direction, decided before running, and three-way rather than one:
 *
 *  1. **Red before the rewrite, green after** on the mechanism pages — an
 *     ordinary forbidden-term rule over pages that plainly contained the terms.
 *     Measured by restoring `content/docs`, `README.md`, `docs/README.md` and
 *     `AGENTS.md` from `origin/main` and re-running: **33 offending pages, 44
 *     spelling-hits**. After: 0. Eleven of those pages report TWO labels, and
 *     they are the interesting ones — `sales/accounts`, `sales/opportunities`
 *     and `service/cases` in all three locales each tripped a group-A term AND a
 *     group-B one, while `service/sla-and-escalation` tripped ONLY group B. That
 *     last page is the measurement that settled the scope question: the issue's
 *     own inventory was a grep for `role hierarchy`, so it never saw that page,
 *     and a group-A-only rule would have shipped green over three locales still
 *     promising the rollup.
 *  2. **Green in BOTH directions** on the exempt page. `search-and-navigation`
 *     is untouched by this PR and appears in NEITHER run's offender list, so the
 *     exemption is excusing the operator token rather than papering over an edit
 *     — a rule that went red there would be reporting its own failure, not a
 *     docs defect.
 *  3. **The exemption does not widen to the page** — probe #4 below appends a
 *     prose claim to the exempt page's real text and requires it to be reported.
 *     A file-level exemption passes 1 and 2 and fails this one, which is the
 *     whole reason the excusal is written as a text substitution of the token.
 */
describe('product docs do not teach a role hierarchy that drives visibility (#1019)', () => {
  /**
   * Occurrences allowed to survive, each with the reason.
   *
   * A map rather than a list, for the reason the persona rule above gives. What
   * is exempt here is a FORM, not a file: `form` is deleted from the page text
   * before the scan, so any OTHER occurrence on the same page is still reported.
   * `guides/search-and-navigation` may quote the platform's filter operator; it
   * may not start explaining what the operator does to this app's records.
   */
  const PLATFORM_VOCABULARY: Record<string, { form: RegExp; reason: string }> = {
    'content/docs/guides/search-and-navigation.mdx': {
      form: /`in role hierarchy`/g,
      reason:
        "the platform list-view filter operator, quoted as a token in the operator list — platform vocabulary, not a claim about this app's model",
    },
    'content/docs/guides/search-and-navigation.zh-Hans.mdx': {
      form: /`in role hierarchy`/g,
      reason: 'the same operator token, quoted untranslated (zh-Hans)',
    },
    'content/docs/guides/search-and-navigation.zh-Hant.mdx': {
      form: /`in role hierarchy`/g,
      reason: 'the same operator token, quoted untranslated (zh-Hant)',
    },
  };

  /**
   * The forbidden spellings, one regex each so a failure names what it found.
   * Group A is the term; group B is the rollup promise written without it — see
   * the header for why both are needed and why bare `hierarchy` is not here.
   */
  const TERMS: { label: string; group: 'A' | 'B'; re: RegExp }[] = [
    { label: 'role hierarchy', group: 'A', re: /role ?hierarchy/i },
    { label: '角色层级', group: 'A', re: /角色层级/ },
    { label: '角色層級', group: 'A', re: /角色層級/ },
    { label: '角色阶层', group: 'A', re: /角色阶层/ },
    { label: '角色階層', group: 'A', re: /角色階層/ },
    { label: 'subordinate(s)', group: 'B', re: /subordinates?\b/i },
    { label: '下属', group: 'B', re: /下属/ },
    { label: '下屬', group: 'B', re: /下屬/ },
    {
      label: 'above/below … in the hierarchy',
      group: 'B',
      re: /(?:above|below) (?:them|him|her)[^.\n]{0,24}?in the (?:role )?hierarchy/i,
    },
    { label: '层级中位于其之上/下', group: 'B', re: /层级中位于其之[上下]/ },
    { label: '層級中位於其之上/下', group: 'B', re: /層級中位於其之[上下]/ },
  ];

  /** Soft wraps and blockquote continuation markers collapse to one space. */
  const unwrap = (text: string): string => text.replace(/[ \t]*\n[ \t]*>?[ \t]*/g, ' ');

  /**
   * Whitespace BETWEEN two CJK characters is typesetting, not a word boundary —
   * the persona rule above pays for this lesson in full; 角色 層級 is one word a
   * line break split.
   */
  const CJK = '\\u4e00-\\u9fff';
  const tighten = (text: string): string =>
    text.replace(new RegExp(`([${CJK}])[ \\t]+(?=[${CJK}])`, 'g'), '$1');

  const normalise = (text: string): string => tighten(unwrap(text));

  /** Depth-first walk of a docs tree, REPO_ROOT-relative. */
  const walkPages = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkPages(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  /**
   * The scanned surface: the docs site plus the three tree/banner files that
   * named the retired concept in passing.
   *
   * `CHANGELOG.md`, `.changeset/*` and `docs/archive/` are deliberately OUT.
   * They are historical records, and a historical record is allowed to describe
   * a repo that no longer exists — the same reason the tree-diagram rule above
   * exempts the archive. (`docs/archive/2026-02/BUSINESS_DOMAIN_AI_ANALYSIS.md`
   * also uses "subordinate" in its statistical sense, which is the other half of
   * why the scan is a named list and not a walk of `docs/`.)
   */
  const SCANNED = ['README.md', 'docs/README.md', 'AGENTS.md', ...walkPages('content/docs')];

  /** The page text with its exempt form removed, so only unexcused text is scanned. */
  const scannable = (file: string, raw: string): string => {
    const entry = PLATFORM_VOCABULARY[file];
    return normalise(entry ? raw.replace(entry.form, ' ') : raw);
  };

  const PAGES = SCANNED.map((file) => {
    const raw = readFileSync(join(REPO_ROOT, file), 'utf8');
    return { file, raw, scannable: scannable(file, raw) };
  });

  /** The forbidden spellings `text` still writes. */
  const termsIn = (text: string): string[] =>
    TERMS.filter((t) => t.re.test(text)).map((t) => t.label);

  it('the scan reads a real docs tree', () => {
    // Vacuity guard #1: a walk that returned nothing would report a clean tree.
    expect(
      PAGES.length,
      'no pages found to scan — this guard has gone vacuous',
    ).toBeGreaterThan(50);
  });

  it('the detector reads every forbidden spelling, wrapped and unwrapped', () => {
    // Vacuity guard #2, and the one that actually protects this rule: every
    // check below reports "nothing found" both when the tree is clean AND when
    // the regexes have stopped matching. Only a positive probe tells them apart.
    // Each probe is a real sentence this PR removed, or its wrapped form.
    const probes: { text: string; expected: string }[] = [
      { text: 'only the owner and people above them in the role hierarchy', expected: 'role hierarchy' },
      { text: "| **Role hierarchy** | Managers see their team's records |", expected: 'role hierarchy' },
      { text: '只有负责人以及角色层级中位于其之上的人才能看到', expected: '角色层级' },
      { text: '只有負責人以及角色層級中位於其之上的人才能看到', expected: '角色層級' },
      { text: '組織範圍預設值、角色階層、共用規則、FLS', expected: '角色階層' },
      { text: '确认默认角色阶层与你的组织相符', expected: '角色阶层' },
      { text: 'shared with all service managers and their subordinates', expected: 'subordinate(s)' },
      { text: '自动共享给所有服务经理及其下属', expected: '下属' },
      { text: '自動共享給所有服務經理及其下屬', expected: '下屬' },
      {
        text: 'shared read-only with the Sales Director and everyone below them in the hierarchy',
        expected: 'above/below … in the hierarchy',
      },
      { text: '与销售总监及层级中位于其之下的所有人共享', expected: '层级中位于其之上/下' },
      { text: '與銷售總監及層級中位於其之下的所有人共享', expected: '層級中位於其之上/下' },
      // plain soft wrap — the shape that defeats a line-oriented grep
      { text: 'managers see their team via the role\nhierarchy', expected: 'role hierarchy' },
      // blockquote continuation
      { text: '> people above them in the role\n> hierarchy can see them', expected: 'role hierarchy' },
      // CJK word split mid-token, which no amount of space-joining repairs
      { text: '驱动可见性的角色\n层级', expected: '角色层级' },
    ];
    const unread = probes
      .filter((p) => !termsIn(normalise(p.text)).includes(p.expected))
      .map((p) => `${JSON.stringify(p.text)} → expected ${p.expected}, read ${JSON.stringify(termsIn(normalise(p.text)))}`);
    // Collected rather than asserted per probe, so a narrowed detector names
    // every spelling it stopped reading in one run instead of only the first.
    expect(
      unread,
      `the role-hierarchy detector no longer reads:\n  ${unread.join('\n  ')}\n` +
        'A spelling this scan cannot see is a page nobody is checking — and the rule below would ' +
        'go green over it, which is indistinguishable from the tree being clean.',
    ).toEqual([]);
  });

  it('every exemption still covers a real occurrence, so no exemption is dead', () => {
    // Vacuity guard #3: an exemption that no longer excuses anything is a
    // standing licence for the next author to write the term on that page,
    // granted by nobody and reviewed by nobody. #1010/#1020 made the count
    // guard's exemptions section-scoped for the same reason.
    const dead = Object.entries(PLATFORM_VOCABULARY)
      .filter(([file, entry]) => {
        const page = PAGES.find((p) => p.file === file);
        return !page || [...page.raw.matchAll(entry.form)].length === 0;
      })
      .map(([file, entry]) => `${file} (granted for: ${entry.reason})`);
    expect(
      dead,
      `exemptions that no longer cover anything (the text moved, or the page is gone):\n  ${dead.join('\n  ')}\n` +
        'Delete the entry. An exemption is granted to a specific piece of quoted platform vocabulary, ' +
        'not to a filename in perpetuity.',
    ).toEqual([]);
  });

  it('an exemption excuses its token, not the page around it', () => {
    // Vacuity guard #4, and the one the ruling asked for by name: the rule has
    // to catch a MECHANISM DESCRIPTION without tripping over the legitimate
    // occurrence on the same page. Take the exempt page's real text and append
    // the prose claim — the claim must still be reported.
    const notExcused = Object.keys(PLATFORM_VOCABULARY)
      .map((file) => {
        const page = PAGES.find((p) => p.file === file);
        if (!page) return `${file}: page not found`;
        const planted = `${page.raw}\n\nManagers see their team's records via the role hierarchy.\n`;
        return termsIn(scannable(file, planted)).includes('role hierarchy')
          ? ''
          : `${file}: a planted prose claim was excused along with the operator token`;
      })
      .filter(Boolean);
    expect(
      notExcused,
      `the exemption widened from the token to the page:\n  ${notExcused.join('\n  ')}\n` +
        'Scope `form` to the quoted operator. A page-level exemption is how a targeted whitelist ' +
        'turns into a blanket one.',
    ).toEqual([]);
  });

  it('no product page teaches a role hierarchy, or the rollup it promised', () => {
    const offenders = PAGES.map((p) => ({ file: p.file, found: termsIn(p.scannable) }))
      .filter((p) => p.found.length > 0)
      .map((p) => `${p.file}: ${p.found.join(', ')}`);
    expect(
      offenders,
      `pages teaching a role hierarchy or its rollup:\n  ${offenders.join('\n  ')}\n` +
        'Positions are FLAT and nothing rolls up (ADR-0090 D3, src/sharing/positions.ts): no one sees a ' +
        'record by sitting above its owner, and every rung that needs one is named by its own sharing ' +
        'rule (#488). Say "position" (zh-Hans 「岗位」, zh-Hant 「職位」) and keep the sentence\'s ' +
        'functional meaning — and where the sentence WAS the mechanism, write the mechanism ' +
        'administration/sharing-and-security describes instead of renaming the old one. Quoting a ' +
        'platform filter operator verbatim belongs in PLATFORM_VOCABULARY, with its reason.',
    ).toEqual([]);
  });
});
