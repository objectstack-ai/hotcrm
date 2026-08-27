// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import {
  auditAnchors,
  headingIds,
  readDocsPages,
  type DocsPage,
} from './helpers/docs-anchors';

/**
 * Every anchored link inside `content/docs` points at a heading that exists.
 *
 * ## Why a guard, and why now
 *
 * Anchored links rot in four unrelated ways, and each one arrived on its own
 * PR cycle rather than as a batch anybody could review out:
 *
 *  - a link copied from another page, path edited, anchor left behind (#749);
 *  - a translated heading with an untranslated anchor (#764, #866 group C) —
 *    `## 路线图` answers to `#路线图`, never to `#roadmap`;
 *  - a heading that opens with an emoji, whose slug carries a leading hyphen
 *    (`### 🚦 Case Triage` → `-case-triage`, #866 group A);
 *  - a heading that was renamed or grew a qualifier after the link was written
 *    (#866 group B).
 *
 * Nothing was watching. `test/docs-object-coverage.test.ts` checks that pages
 * exist and are registered, never that an anchor resolves. `next build` does
 * not resolve markdown link targets. And `.github/workflows/link-check.yml` —
 * the one job whose name says it would — is configured `file-extension: '.md'`
 * while `content/docs` is 100% `.mdx`, so it opens **zero** product doc pages.
 * That workflow is deliberately left alone; the reason is recorded in the
 * workflow itself, and it is not "we forgot".
 *
 * ## What this guard will not do
 *
 * It answers *"does this anchor resolve"* and never *"should this anchor be
 * here"*. Whether a localized page ought to carry anchors at all is an
 * editorial call with its own decision to make (#866 group C rests on it), and
 * a guard that took a side on it would be enforcing a rule nobody wrote.
 *
 * The ids come from fumadocs' own `remarkHeading`, never from a slug rule
 * written here — see the header of `test/helpers/docs-anchors.ts` for the four
 * measured ways a hand-rolled slugger disagrees with the page a reader loads.
 */
describe('content/docs anchored links', () => {
  const pages = readDocsPages();

  /**
   * Audited once, asserted twice.
   *
   * Running the pipeline over 201 pages costs ~3 s on an idle machine, and the
   * first version of this file paid it per test. That was fine in isolation and
   * flaky in `pnpm verify`: sharing the box with the rest of the suite pushed
   * each call past vitest's 5 s default and the guard failed on a tree it had
   * just passed. A guard that goes red on correct docs when the machine is busy
   * is the muted-guard failure mode arriving by a different road, so the work
   * is hoisted into one hook with a timeout that describes the work rather than
   * the default.
   */
  let audit: Awaited<ReturnType<typeof auditAnchors>>;
  beforeAll(async () => {
    audit = await auditAnchors(pages);
  }, 120_000);

  it('every page parses as MDX', () => {
    // A page that does not parse cannot ship: `{#id}` — the wrong spelling of
    // an explicit heading id — reaches acorn as a JSX expression and takes the
    // whole page's build down. Reading the ids through the real MDX pipeline is
    // what turns that into a test failure instead of a red deploy.
    expect(audit.parseFailures).toEqual([]);
  });

  it('resolves every anchor against the heading ids fumadocs emits', () => {
    const { issues, anchoredLinks } = audit;
    expect(
      issues.map((i) => `content/docs/${i.file}:${i.line} ${i.href} — ${i.reason}`),
    ).toEqual([]);
    // Guard the guard: an audit that silently stopped finding links would
    // report clean forever.
    expect(anchoredLinks).toBeGreaterThan(20);
  });

  /**
   * The two headings a naive slugger reports as false red, pinned on the real
   * tree rather than only in fixtures.
   *
   * Both carry an explicit `[#id]`, which fumadocs strips from the rendered
   * text and uses verbatim as the id. A guard that only called `github-slugger`
   * would compute `-case-triage-case-triage` for the first and fail a link that
   * works — and a guard that fails on correct docs gets muted, which costs both
   * directions at once. These assertions exist so that the demonstration cannot
   * quietly become vacuous if the headings are reworded.
   */
  it('reads explicit [#id] headings the way fumadocs does', async () => {
    const skills = pages.find((p) => p.file === 'ai-copilot/skills.mdx');
    const exports_ = pages.find((p) => p.file === 'guides/import-and-export.mdx');
    expect(skills?.source).toContain('### 🚦 Case Triage [#case-triage]');
    expect(exports_?.source).toContain(
      '### Scheduled export to a warehouse (not shipped yet) [#scheduled-export]',
    );

    const skillIds = await headingIds(skills!.source);
    expect(skillIds).toContain('case-triage');
    expect(skillIds).not.toContain('-case-triage');
    expect(await headingIds(exports_!.source)).toContain('scheduled-export');

    // …and the links that depend on them are really in the audited set.
    expect(
      pages.find((p) => p.file === 'service/sla-and-escalation.mdx')?.source,
    ).toContain('(/docs/ai-copilot/skills#case-triage)');
    expect(
      pages.find((p) => p.file === 'reference/performance-and-limits.mdx')?.source,
    ).toContain('(/docs/guides/import-and-export#scheduled-export)');
  }, 60_000);

  /**
   * "The renderer's own rule" is only true while there is one renderer.
   *
   * `apps/docs` is not a workspace member — it carries its own lockfile and its
   * own `fumadocs-core` — so the copy this suite imports and the copy that
   * builds the site are two independent pins. Let them drift and this guard
   * keeps passing while measuring a slug rule the site no longer uses, which is
   * the false-green case the whole design exists to avoid.
   */
  it('pins fumadocs-core to the version apps/docs renders with', () => {
    const read = (p: string) => JSON.parse(readFileSync(join(REPO_ROOT, p), 'utf8'));
    const here = read('package.json').devDependencies['fumadocs-core'];
    const site = read('apps/docs/package.json').dependencies['fumadocs-core'];
    expect(here).toBe(site);
    // Exact, not a range: a caret here would let an install move the slug rule.
    expect(here).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

/**
 * The audit's own behaviour, on fixtures rather than on the repo.
 *
 * The repo-level tests above can only ever show one direction — green. These
 * show the other: each rule is fed input it must reject, so a rule that stopped
 * working could not hide behind a clean tree.
 */
describe('the anchor audit itself', () => {
  const page = (file: string, source: string): DocsPage => ({ file, source });
  const audit = async (...pages: DocsPage[]) => auditAnchors(pages);

  it('fails on an anchor no heading answers to', async () => {
    const { issues } = await audit(
      page('service/index.mdx', '# Service Cloud\n\n## Where to find things\n'),
      page('service/kb.mdx', '# KB\n\nSee [it](/docs/service/#service-overview).\n'),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].file).toBe('service/kb.mdx');
    expect(issues[0].reason).toBe('service/index.mdx has no heading with id "service-overview"');
  });

  it('fails on a same-page anchor no heading answers to', async () => {
    const { issues } = await audit(page('a.mdx', '# A\n\n## 加入流程\n\nSee [x](#enrollment).\n'));
    expect(issues).toHaveLength(1);
    expect(issues[0].reason).toBe('a.mdx has no heading with id "enrollment"');
  });

  it('accepts the emoji heading only at the leading-hyphen slug it really has', async () => {
    const emoji = '# Skills\n\n### 🚦 Case Triage\n';
    expect(await headingIds(emoji)).toEqual(['skills', '-case-triage']);

    const { issues } = await audit(page('s.mdx', `${emoji}\nSee [t](#case-triage).\n`));
    expect(issues[0]?.reason).toBe('s.mdx has no heading with id "case-triage"');
  });

  it('accepts an explicit [#id] over the computed slug — both false-red headings', async () => {
    const source = [
      '# Skills',
      '',
      '### 🚦 Case Triage [#case-triage]',
      '',
      '### Scheduled export to a warehouse (not shipped yet) [#scheduled-export]',
      '',
      'See [a](#case-triage) and [b](#scheduled-export).',
      '',
    ].join('\n');
    expect(await headingIds(source)).toEqual(['skills', 'case-triage', 'scheduled-export']);
    expect((await audit(page('s.mdx', source))).issues).toEqual([]);
  });

  it('keeps CJK, drops full-width parentheses, doubles the hyphen at &', async () => {
    // Three slugs no "lowercase and hyphenate" rule produces, all of them the
    // renderer's real answer.
    expect(
      await headingIds('## 路线图\n\n## 流程（多步骤）\n\n## Standard dashboards & reports\n'),
    ).toEqual(['路线图', '流程多步骤', 'standard-dashboards--reports']);

    const zh = '# 路线图页\n\n## 路线图\n\nSee [a](#路线图) and [b](#roadmap).\n';
    const { issues } = await audit(page('w.zh-Hans.mdx', zh));
    expect(issues.map((i) => i.href)).toEqual(['#roadmap']);
  });

  it('follows github-slugger when two headings share a title', async () => {
    const source = '# T\n\n## Notes\n\n## Notes\n\nSee [a](#notes-1) and [b](#notes-2).\n';
    const { issues } = await audit(page('d.mdx', source));
    expect(issues.map((i) => i.href)).toEqual(['#notes-2']);
  });

  it('reads an href off a JSX element, not only a markdown link', async () => {
    const source = '# T\n\n<Card href="/docs/t#nope" title="x" />\n';
    const { issues } = await audit(page('t.mdx', source));
    expect(issues.map((i) => i.reason)).toEqual(['t.mdx has no heading with id "nope"']);
  });

  it('reads a link nested inside a Callout', async () => {
    const source = '# T\n\n<Callout type="info">\n  See [x](#nope).\n</Callout>\n';
    expect((await audit(page('t.mdx', source))).issues).toHaveLength(1);
  });

  it('resolves a localized page and honours the en fallback', async () => {
    const en = page('g/p.mdx', '# P\n\n## Scheduled export\n');
    const zh = page('g/p.zh-Hans.mdx', '# P\n\n## 定时导出\n');
    const link = (href: string) => `# X\n\nSee [a](${href}).\n`;

    // zh page → zh target: the zh ids are what renders.
    expect(
      (await audit(en, zh, page('x.zh-Hans.mdx', link('/zh-Hans/docs/g/p#定时导出')))).issues,
    ).toEqual([]);
    expect(
      (await audit(en, zh, page('x.zh-Hans.mdx', link('/zh-Hans/docs/g/p#scheduled-export'))))
        .issues,
    ).toHaveLength(1);
    // zh-Hant has no page here, so fumadocs renders the English one — and the
    // English ids are what the reader gets.
    expect(
      (await audit(en, page('x.zh-Hant.mdx', link('/zh-Hant/docs/g/p#scheduled-export')))).issues,
    ).toEqual([]);
  });

  it('rejects a link whose language prefix is not the page it sits on', async () => {
    const en = page('g/p.mdx', '# P\n\n## Anchor\n');
    const { issues } = await audit(
      en,
      page('x.zh-Hans.mdx', '# X\n\nSee [a](/docs/g/p#anchor).\n'),
    );
    expect(issues.map((i) => i.reason)).toEqual([
      'language prefix is en, but the page is zh-Hans',
    ]);
  });

  it('rejects an anchored link to a page that does not exist', async () => {
    const { issues } = await audit(page('x.mdx', '# X\n\nSee [a](/docs/nowhere#anchor).\n'));
    expect(issues.map((i) => i.reason)).toEqual(['no page answers /nowhere']);
  });

  it('percent-decodes an anchor before comparing it', async () => {
    const source = `# T\n\n## 字段级安全\n\nSee [a](#${encodeURIComponent('字段级安全')}).\n`;
    expect((await audit(page('t.mdx', source))).issues).toEqual([]);
  });

  it('reports the {#id} spelling as an unparseable page, not as missing ids', async () => {
    const { parseFailures, issues } = await audit(
      page('bad.mdx', '# T\n\n### 🚦 Case Triage {#case-triage}\n'),
    );
    expect(parseFailures.map((f) => f.file)).toEqual(['bad.mdx']);
    expect(parseFailures[0].error).toMatch(/acorn/);
    // The page is excluded from link auditing rather than treated as a page
    // with no headings, which would blame every link pointing at it.
    expect(issues).toEqual([]);
  });

  it('leaves links it does not own alone', async () => {
    const source = [
      '# T',
      '',
      '## Anchor',
      '',
      'See [a](https://example.com/x#frag), [b](mailto:x@example.com), [c](/blog/p#frag)',
      'and [d](/docs/t#anchor).',
      '',
      '```md',
      'See [e](/docs/t#not-a-heading) — a code sample, not a link.',
      '```',
      '',
    ].join('\n');
    const { issues, anchoredLinks } = await audit(page('t.mdx', source));
    expect(issues).toEqual([]);
    expect(anchoredLinks).toBe(1);
  });
});
