// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Product-doc code examples query through `ctx.api` with `where` (#1026).
 *
 * ## What is actually true
 *
 * `AGENTS.md` §Tech Stack 2 fixes both halves of the shape:
 *
 *  - **There is no `broker`.** "Data access MUST use ObjectQL, reached through
 *    the `ctx.api` surface. There is **no `broker`** in this repo — the
 *    identifier has zero occurrences in `src/`." The real shape is
 *    `ctx.api.object('crm_opportunity').find({ where: … })`; inside a `*.hook.ts`
 *    the surface is cast once to `HookApi` (`src/objects/_hook-api.ts`) and then
 *    called as `api.object(...)`.
 *  - **The predicate key is `where`, and only `where`.** `filter` (canonical)
 *    and `filters` (deprecated alias) are *HTTP query-param* spellings carrying a
 *    JSON string. Passed in process they fail **silently**: `findOne` spreads the
 *    query into the AST without aliasing and returns the object's **first row**,
 *    `count` reads `query.where` only and counts the **whole object**. Neither
 *    throws. This repo has already paid for that once —
 *    `.changeset/hook-query-where-not-filter.md` — and `HookQuery` deliberately
 *    omits the alias so the mistake is a compile error in a hook.
 *
 * ## What the docs said instead
 *
 * `reference/glossary`, in all three locales, defined ObjectQL with the one
 * copyable example on the page: `broker.find('crm_opportunity', { filters: [...] })`
 * — both halves wrong in eleven words. A glossary is where a reader goes when a
 * word is unfamiliar, and AI-authored code copies example SHAPES above all else.
 * The compile-time defence covers `*.hook.ts` only, so the same snippet pasted
 * into an action script body, or into another repo, lands on the path that
 * returns wrong data without erroring.
 *
 * ## Why the rule is scoped to an in-process CALL, not to the word `filter`
 *
 * `filter:` is the correct, current spelling on two other surfaces, and this rule
 * must not touch them: a `*.flow.ts` node `config` takes `filter:` (44
 * occurrences across 17 of the 21 flow files), and a page component config takes
 * `filter:` in the AST-array form (`src/pages/lead_detail.page.ts:217`).
 * `AGENTS.md` says it outright — *"Do not 'fix' one surface's spelling into
 * another's"* — and an HTTP request body may legitimately carry `"filters"`
 * (`customization/api-reference`'s JSON block). So the alias rule fires only
 * inside a code unit that also performs an **in-process query call**
 * (`ctx.api…`, `api.object(…)`, `broker…`, `rt.query.…`). Probe group B below
 * pins that non-overreach with the real shapes from all three surfaces.
 *
 * The unit of judgement is one code fence or one inline span. Two shapes that
 * must not be judged together therefore belong in two fences — which is how the
 * docs are written anyway.
 *
 * ## Scope: `content/docs` only
 *
 * `AGENTS.md` itself writes `broker` and `filters` on purpose — it is the page
 * that BANS them, and a rule that cannot quote what it forbids is unwritable.
 * The scanned surface is the product docs site, where every code block is
 * something a reader is invited to copy.
 *
 * ## Reverse verification (#1026)
 *
 * Predicted direction, decided before running: **red before the rewrite, green
 * after** — an ordinary forbidden-shape rule over pages that plainly contained
 * the shape. Measured by restoring `content/docs` from `origin/main` and
 * re-running: **3 offending pages** — `reference/glossary` in all three locales,
 * each reporting BOTH labels (`broker` AND the alias key) from the same eleven
 * words — plus all three failing the entry pin below. After the rewrite: 0
 * offenders, pin green.
 *
 * A second run on that same pre-fix tree with `QUARANTINE` emptied reports **6**
 * pages: the three above and the three `testing-and-ci` locales, both labels
 * each. That difference is what the quarantine is holding, measured rather than
 * asserted — and it is the reason #1032 exists.
 *
 * ## The quarantine, and why it is not an exemption
 *
 * `customization/testing-and-ci` (three locales) teaches a `broker` mock as a
 * hook-handler argument and one `rt.query.task({ filters: … })` call. That is the
 * same defect on a different page and a bigger fix — the whole hook-test example
 * has to be rewritten against the real `HookApi` shape — so it is filed as
 * **#1032** and NOT touched here (scope). The entries below excuse those exact
 * tokens, with the issue number as the reason. Two properties keep this from
 * decaying into a licence: each form must still match something (the entry dies
 * loudly once #1032 lands, and deleting it is that issue's last step), and the
 * forms are token-tight, so any OTHER wrong shape planted on those pages is
 * still reported — probe group C pins exactly that.
 */
describe('product-doc examples query through ctx.api with where (#1026)', () => {
  /**
   * Occurrences allowed to survive, each with the reason.
   *
   * Keyed by file, then by FORM: the matched text is deleted before the page is
   * scanned, so an excusal covers the snippet it names and nothing else on the
   * page around it.
   */
  const QUARANTINE: Record<string, { form: RegExp; reason: string }[]> = Object.fromEntries(
    ['', '.zh-Hans', '.zh-Hant'].map((locale) => [
      `content/docs/customization/testing-and-ci${locale}.mdx`,
      [
        {
          form: /const broker = \{/g,
          reason: 'the hook-test example mocks a `broker` argument — tracked defect, #1032',
        },
        {
          form: /broker\.findOne/g,
          reason: 'the same mock, called — tracked defect, #1032',
        },
        {
          form: /\{ record, broker, context: \{\} \}/g,
          reason: 'the same mock, passed to the handler — tracked defect, #1032',
        },
        {
          form: /rt\.query\.task\(\{ filters: /g,
          reason: 'the flow-test example queries the harness with the alias key — tracked defect, #1032',
        },
      ],
    ]),
  );

  /** In-process query calls. A code unit containing one is judged on `where`. */
  const IN_PROCESS_CALL: { label: string; re: RegExp }[] = [
    { label: 'ctx.api', re: /\bctx\.api\b/ },
    { label: 'api.object(', re: /\bapi\.object\s*\(/ },
    { label: 'broker', re: /\bbroker\b/ },
    { label: 'rt.query.', re: /\brt\.query\./ },
  ];

  /**
   * `filter:` / `filters:` written as an OBJECT KEY. The lookbehind keeps the
   * JSON spelling (`"filters":`) out — that one is a legitimate HTTP body, and
   * the call-site requirement above already excludes it a second time.
   */
  const ALIAS_KEY = /(?<!["'\w])filters?\s*:/;

  /** The identifier that does not exist in this repo, used as a receiver. */
  const BROKER_TOKEN = /\bbroker\b/;
  const BROKER_CALL_IN_PROSE = /\bbroker\s*\./;

  const LABEL_BROKER = 'broker (no such identifier — use ctx.api)';
  const LABEL_ALIAS = 'filter/filters as an in-process predicate key (use where)';

  /**
   * Code units of a page: fenced blocks first, then inline spans in what is
   * left, so a backtick inside a fence is never mistaken for a span delimiter.
   */
  const codeUnits = (raw: string): string[] => {
    const units: string[] = [];
    const withoutFences = raw.replace(/```[\s\S]*?```/g, (m) => {
      units.push(m);
      return '\n';
    });
    for (const m of withoutFences.matchAll(/`[^`\n]+`/g)) units.push(m[0]);
    return units;
  };

  /** The prose of a page: everything that is not a code unit. */
  const prose = (raw: string): string =>
    raw.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]+`/g, ' ');

  /** Depth-first walk of a docs tree, REPO_ROOT-relative. */
  const walkPages = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkPages(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  const SCANNED = walkPages('content/docs');

  /** The page text with its quarantined forms removed. */
  const scannable = (file: string, raw: string): string =>
    (QUARANTINE[file] ?? []).reduce((text, entry) => text.replace(entry.form, ' '), raw);

  /** Every wrong shape `text` still teaches. */
  const offences = (text: string): string[] => {
    const found = new Set<string>();
    for (const unit of codeUnits(text)) {
      if (BROKER_TOKEN.test(unit)) found.add(LABEL_BROKER);
      const calls = IN_PROCESS_CALL.some((c) => c.re.test(unit));
      if (calls && ALIAS_KEY.test(unit)) found.add(LABEL_ALIAS);
    }
    if (BROKER_CALL_IN_PROSE.test(prose(text))) found.add(LABEL_BROKER);
    return [...found];
  };

  const PAGES = SCANNED.map((file) => {
    const raw = readFileSync(join(REPO_ROOT, file), 'utf8');
    return { file, raw, scannable: scannable(file, raw) };
  });

  it('the scan reads a real docs tree, with real code in it', () => {
    // Vacuity guard #1, both halves: a walk that returned nothing would certify
    // a clean tree, and so would a tree the code-unit splitter could not read.
    expect(
      PAGES.length,
      'no pages found under content/docs — this guard has gone vacuous',
    ).toBeGreaterThan(50);
    const withCode = PAGES.filter((p) => codeUnits(p.raw).length > 0);
    expect(
      withCode.length,
      'no page yielded a single code unit — the fence/span splitter has stopped reading MDX',
    ).toBeGreaterThan(20);
  });

  it('the detector reads every wrong shape it is meant to catch (group A)', () => {
    // Vacuity guard #2, the one that actually protects this rule: every check
    // below reports "nothing found" both when the docs are clean AND when the
    // detector has stopped matching. Only positive probes tell them apart. The
    // first three are the exact lines this PR removed.
    const probes: { text: string; expected: string }[] = [
      {
        text: "**ObjectQL** — HotCRM's query language. `broker.find('crm_opportunity', { filters: [...] })`.",
        expected: LABEL_BROKER,
      },
      {
        text: "**ObjectQL** — HotCRM's query language. `broker.find('crm_opportunity', { filters: [...] })`.",
        expected: LABEL_ALIAS,
      },
      {
        text: '**ObjectQL** —— HotCRM 的查询语言。`broker.find(\'crm_opportunity\', { filters: [...] })`。',
        expected: LABEL_BROKER,
      },
      // the alias on the real surface, both spellings, singular and plural
      {
        text: "```ts\nawait ctx.api.object('crm_case').findOne({ filter: { id: caseId } });\n```",
        expected: LABEL_ALIAS,
      },
      {
        text: "```ts\nconst n = await api.object('crm_lead').count({ filters: { status: 'new' } });\n```",
        expected: LABEL_ALIAS,
      },
      // a hook cast, wrapped across lines the way a real example is written
      {
        text:
          "```ts\nconst api = ctx.api as HookApi | undefined;\nconst rows = await api?.object('crm_quote').find({\n  filters: { opportunity_id: id },\n});\n```",
        expected: LABEL_ALIAS,
      },
      // broker as a bare receiver in prose, outside any code span
      { text: 'Call broker.find() to read opportunities.', expected: LABEL_BROKER },
    ];
    const unread = probes
      .filter((p) => !offences(p.text).includes(p.expected))
      .map((p) => `${JSON.stringify(p.text)} → expected ${p.expected}, read ${JSON.stringify(offences(p.text))}`);
    // Collected rather than asserted per probe, so a narrowed detector names
    // every shape it stopped reading in one run instead of only the first.
    expect(
      unread,
      `the ObjectQL-shape detector no longer reads:\n  ${unread.join('\n  ')}\n` +
        'A shape this scan cannot see is an example nobody is checking — and the rule below would go ' +
        'green over it, which is indistinguishable from the docs being right.',
    ).toEqual([]);
  });

  it('the detector leaves the other surfaces alone (group B)', () => {
    // Vacuity guard #3, the overreach half. `filter:` is CORRECT on a flow node
    // config and on a page component config, and `"filters"` is correct in an
    // HTTP body. A rule that reddened those would be teaching authors to break
    // working metadata — AGENTS.md: "Do not 'fix' one surface's spelling into
    // another's". Each probe is the real shape, copied from the surface it
    // belongs to.
    const allowed: { what: string; text: string }[] = [
      {
        what: 'a flow node config (src/flows/opportunity-approval.flow.ts)',
        text:
          "```ts\n{\n  type: 'get_record',\n  config: { objectName: 'crm_opportunity', filter: { id: '{record.id}' }, outputVariable: 'oppRecord' },\n}\n```",
      },
      {
        what: 'a page component config in the AST-array form (src/pages/lead_detail.page.ts:217)',
        text:
          "```ts\n{\n  component: 'record:related_list',\n  config: { objectName: 'crm_task', filter: [['status', '!=', 'completed']] },\n}\n```",
      },
      {
        what: 'an HTTP request body (customization/api-reference)',
        text:
          '```json\n{\n  "filters": [\n    ["stage", "in", ["proposal"]],\n    ["amount", ">", 100000]\n  ],\n  "limit": 50\n}\n```',
      },
      {
        what: 'the corrected in-process example itself',
        text:
          "`ctx.api.object('crm_opportunity').find({ where: { amount: { $gt: 50000 } } })`",
      },
      {
        what: 'prose using the ordinary English word',
        text: 'The view filters on Published, so drafts never reach the agent.',
      },
    ];
    const overreach = allowed
      .filter((a) => offences(a.text).length > 0)
      .map((a) => `${a.what}: reported ${JSON.stringify(offences(a.text))}`);
    expect(
      overreach,
      `the rule reddened a legitimate spelling:\n  ${overreach.join('\n  ')}\n` +
        'These surfaces are governed by their own spelling and are not this rule\'s business. Narrow the ' +
        'call-site requirement rather than the docs.',
    ).toEqual([]);
  });

  it('every quarantine form still covers a real occurrence, so none is dead', () => {
    // Vacuity guard #4: a quarantine entry that no longer excuses anything is a
    // standing licence for the next author, granted by nobody. When #1032 lands
    // this test is what tells that PR to delete the entries.
    const dead = Object.entries(QUARANTINE).flatMap(([file, entries]) => {
      const page = PAGES.find((p) => p.file === file);
      if (!page) return [`${file}: page not found`];
      return entries
        .filter((entry) => [...page.raw.matchAll(entry.form)].length === 0)
        .map((entry) => `${file}: /${entry.form.source}/ (granted for: ${entry.reason})`);
    });
    expect(
      dead,
      `quarantine forms that no longer cover anything:\n  ${dead.join('\n  ')}\n` +
        'Delete the entry — the defect it was holding open has been fixed (that is #1032\'s last step), ' +
        'or the text moved and the excusal is now aimed at nothing.',
    ).toEqual([]);
  });

  it('a quarantine excuses its own tokens, not the page around it (group C)', () => {
    // Vacuity guard #5, and the reason the forms are token-tight rather than
    // file-wide: plant a DIFFERENT wrong shape on each quarantined page and
    // require it to be reported. A file-level exemption passes every check above
    // and fails this one.
    const notExcused = Object.keys(QUARANTINE)
      .map((file) => {
        const page = PAGES.find((p) => p.file === file);
        if (!page) return `${file}: page not found`;
        const planted = `${page.raw}\n\n\`\`\`ts\nawait ctx.api.object('crm_case').findOne({ filter: { id: '1' } });\n\`\`\`\n`;
        return offences(scannable(file, planted)).includes(LABEL_ALIAS)
          ? ''
          : `${file}: a planted \`filter:\` predicate was excused along with the quarantined tokens`;
      })
      .filter(Boolean);
    expect(
      notExcused,
      `a quarantine widened from its tokens to the page:\n  ${notExcused.join('\n  ')}\n` +
        'Keep each `form` pinned to the snippet it names. A page-level excusal is how a tracked defect ' +
        'turns into a blank cheque.',
    ).toEqual([]);
  });

  it('no product page teaches broker, or an alias predicate key on an in-process call', () => {
    const offenders = PAGES.map((p) => ({ file: p.file, found: offences(p.scannable) }))
      .filter((p) => p.found.length > 0)
      .map((p) => `${p.file}: ${p.found.join('; ')}`);
    expect(
      offenders,
      `pages teaching a query shape this repo does not have:\n  ${offenders.join('\n  ')}\n` +
        "Write `ctx.api.object('crm_x').find({ where: … })` (AGENTS.md §Tech Stack 2). There is no " +
        '`broker` — the identifier has zero occurrences in `src/` — and on `ctx.api` the predicate key ' +
        'is `where`: `filter` / `filters` are the HTTP query-param spellings and fail SILENTLY in ' +
        'process (`findOne` returns the first row, `count` counts the whole object, neither throws). ' +
        'A flow node config, a page component config and an HTTP body keep their own `filter` spelling ' +
        'and are not what this rule is about.',
    ).toEqual([]);
  });

  it('the glossary teaches the real shape, in every locale', () => {
    // The absence rule above is satisfied by deleting the entry. This is the
    // other half: the one copyable ObjectQL example on the reference page has to
    // still be there, and has to be the shape AGENTS.md fixes.
    const wrong = ['', '.zh-Hans', '.zh-Hant']
      .map((locale) => {
        const file = `content/docs/reference/glossary${locale}.mdx`;
        const page = PAGES.find((p) => p.file === file);
        if (!page) return `${file}: page not found`;
        const entry = page.raw.split('\n').find((line) => line.startsWith('**ObjectQL**'));
        if (!entry) return `${file}: the ObjectQL glossary entry is gone`;
        const missing = [
          entry.includes("ctx.api.object('crm_opportunity')") ? '' : 'the ctx.api call',
          /where:/.test(entry) ? '' : 'the `where` predicate key',
        ].filter(Boolean);
        return missing.length > 0 ? `${file}: entry no longer shows ${missing.join(' and ')}` : '';
      })
      .filter(Boolean);
    expect(
      wrong,
      `the ObjectQL glossary entry stopped teaching the real shape:\n  ${wrong.join('\n  ')}\n` +
        'This entry is the first ObjectQL example most readers meet. Keep it as ' +
        "`ctx.api.object('crm_opportunity').find({ where: … })` — the same shape AGENTS.md §Tech Stack 2 " +
        'gives, so the two never drift apart.',
    ).toEqual([]);
  });
});
