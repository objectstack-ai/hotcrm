// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import {
  RELEASE_NOTES_CAP,
  ReleaseNotesError,
  customerText,
  describeReleaseNotes,
  releaseNotesFromChangelog,
} from '../scripts/lib/marketplace-release-notes.mjs';

/**
 * The marketplace release notes span every version since the last published
 * one (#2501).
 *
 * 6.4.0's section opens "First published release since 6.2.0: the 6.3.0 and
 * 6.2.1 entries below also apply to a 6.2.0 install", and the listing carried
 * 6.4.0's section alone. These cases pin a single-version release (as before),
 * the span the declaration asks for (on the real CHANGELOG.md), the cap, and
 * the refusal of a declaration that cannot be read.
 *
 * The notes are what a customer reads on the listing (#2461): no changeset
 * gate lines, no commit prefixes, no card or framework references. The last
 * block pins that on fixture text and on every real 6.x section.
 */

const CHANGELOG = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');

/** The real section for `version`, without its heading, trimmed. */
function sectionBody(md: string, version: string): string {
  const headings = [...md.matchAll(/^## ([^\s]+)[^\S\n]*$/gm)];
  const i = headings.findIndex((h) => h[1] === version);
  const end = i + 1 < headings.length ? headings[i + 1].index : md.length;
  return md.slice(headings[i].index!, end).replace(/^## .*$/m, '').trim();
}

/** The `- ` entries of a section body, each as written. */
function entriesOf(body: string): string[] {
  return body.split(/^(?=- |### )/m).filter((b) => b.startsWith('- ')).map((b) => b.trimEnd());
}

function refusal(fn: () => unknown): Error {
  try {
    fn();
  } catch (err) {
    return err as Error;
  }
  throw new Error('expected a refusal, but the call returned');
}

const entry = (id: string, headline: string, filler = 0) =>
  `- ${id}: **${headline}.** ${'Words of detail. '.repeat(filler)}`.trimEnd();

/** A changelog of sections, newest first: `[version, intro, entries[]]`. */
function changelog(...sections: Array<[string, string, string[]]>): string {
  const parts = sections.map(([v, intro, entries]) =>
    [`## ${v}`, intro, entries.length ? `### Patch Changes\n\n${entries.join('\n')}` : '']
      .filter(Boolean)
      .join('\n\n'),
  );
  return `# Changelog\n\n${parts.join('\n\n')}\n`;
}

describe('a single-version release', () => {
  it('sends the section alone when it declares no span (6.3.0, real CHANGELOG)', () => {
    const notes = releaseNotesFromChangelog(CHANGELOG, '6.3.0')!;
    expect(notes.text).toBe(`## 6.3.0\n\n${customerText(sectionBody(CHANGELOG, '6.3.0'))}`);
    expect(notes.span).toEqual(['6.3.0']);
    expect(notes.omitted).toBe(0);
  });

  it('prefers the Major Changes, read to the end of the section even past a capital Z', () => {
    const md = '# Changelog\n\n## 2.0.0\n\n### Major Changes\n\n- abc1234: **Zones replace regions.** Zebra.\n\n## 1.0.0\n\n- x\n';
    expect(releaseNotesFromChangelog(md, '2.0.0')!.text).toBe(
      '## 2.0.0\n\n- **Zones replace regions.** Zebra.',
    );
  });

  it('answers undefined for a version the changelog does not carry', () => {
    expect(releaseNotesFromChangelog(CHANGELOG, '0.0.1')).toBeUndefined();
  });
});

describe('the span since the last published version', () => {
  it('carries every section from 6.4.0 down to 6.2.0, within the cap (real CHANGELOG)', () => {
    const notes = releaseNotesFromChangelog(CHANGELOG, '6.4.0')!;
    expect(notes.span).toEqual(['6.4.0', '6.3.0', '6.2.1']);
    expect(notes.text.length).toBeLessThanOrEqual(RELEASE_NOTES_CAP);
    expect(notes.text.startsWith(`## 6.4.0\n\n${customerText(sectionBody(CHANGELOG, '6.4.0'))}\n\n## 6.3.0\n\n`)).toBe(true);
    expect(notes.text).not.toContain('## 6.2.0');

    // Every entry of the three sections is either in the text whole, or
    // accounted for in the truncation notice (by headline when that list fits,
    // counted per version otherwise) — none is cut or lost.
    const [shown, notice = ''] = notes.text.split('\n\n…truncated');
    const byHeadline = notice.includes('Not shown above');
    const perVersion = new Map<string, number>();
    let omitted = 0;
    for (const v of notes.span) {
      for (const e of entriesOf(customerText(sectionBody(CHANGELOG, v)))) {
        if (shown.includes(e)) continue;
        omitted++;
        perVersion.set(v, (perVersion.get(v) ?? 0) + 1);
        const headline = e.match(/\*\*([\s\S]*?)\*\*/)![1].replace(/\s+/g, ' ').trim();
        if (byHeadline) expect(notice, `${v}: ${headline}`).toContain(`- ${v}: **${headline}**`);
      }
    }
    expect(omitted).toBe(notes.omitted);
    if (omitted) expect(notice).toContain('CHANGELOG.md');
    if (omitted && !byHeadline) {
      for (const [v, n] of perVersion) expect(notice).toContain(`${n} from ${v}`);
    }
  });

  it('joins the whole sections when they fit, and stops above the named version', () => {
    const md = changelog(
      ['3.0.0', 'First published release since 1.0.0: the 2.0.0 entry below also applies.', [entry('c3', 'Three')]],
      ['2.0.0', '', [entry('b2', 'Two')]],
      ['1.0.0', '', [entry('a1', 'One')]],
    );
    const notes = releaseNotesFromChangelog(md, '3.0.0')!;
    expect(notes.text).toBe(
      '## 3.0.0\n\nFirst published release since 1.0.0: the 2.0.0 entry below also applies.\n\n' +
        '### Patch Changes\n\n- c3: **Three.**\n\n## 2.0.0\n\n### Patch Changes\n\n- b2: **Two.**',
    );
    expect(describeReleaseNotes(notes)).toBe(`release notes: ${notes.text.length} chars · sections 3.0.0, 2.0.0`);
  });

  it('refuses a declaration it cannot read, or one naming no section below', () => {
    const nearMiss = changelog(['3.0.0', 'First published version since 1.0.0.', [entry('c3', 'Three')]], ['1.0.0', '', []]);
    const notFirst = changelog(['3.0.0', 'Hello.\n\nFirst published release since 1.0.0: x.', []], ['1.0.0', '', []]);
    const missing = changelog(['3.0.0', 'First published release since 0.9.0: x.', [entry('c3', 'Three')]], ['1.0.0', '', []]);
    const above = changelog(['3.0.0', '', []], ['2.0.0', 'First published release since 3.0.0: x.', []]);
    for (const [md, v] of [[nearMiss, '3.0.0'], [notFirst, '3.0.0'], [missing, '3.0.0'], [above, '2.0.0']] as const) {
      expect(refusal(() => releaseNotesFromChangelog(md, v))).toBeInstanceOf(ReleaseNotesError);
    }
  });
});

describe('the cap', () => {
  const md = changelog(
    ['3.0.0', 'First published release since 1.0.0: x.', [entry('c1', 'Alpha', 20), entry('c2', 'Bravo', 20)]],
    ['2.0.0', '', [entry('b1', 'Charlie', 20), entry('b2', 'Delta', 20)]],
    ['1.0.0', '', []],
  );

  it('drops whole entries from the end and names each one in the notice', () => {
    const cap = 1000;
    const notes = releaseNotesFromChangelog(md, '3.0.0', { cap })!;
    expect(notes.text.length).toBeLessThanOrEqual(cap);
    expect(notes.omitted).toBeGreaterThan(0);
    const [shown, notice] = notes.text.split('\n\n…truncated');
    expect(notice).toContain('CHANGELOG.md');
    for (const [v, id, h] of [['3.0.0', 'c1', 'Alpha'], ['3.0.0', 'c2', 'Bravo'], ['2.0.0', 'b1', 'Charlie'], ['2.0.0', 'b2', 'Delta']]) {
      const whole = entry(id, h, 20);
      // Whole in the text, or absent from it and named in the notice; never part of it.
      if (shown.includes(`- ${id}:`)) expect(shown).toContain(whole);
      else expect(notice).toContain(`- ${v}: **${h}.**`);
    }
    expect(describeReleaseNotes(notes)).toContain(`truncated, ${notes.omitted}`);
  });

  it('counts the omitted entries per version when their headlines do not fit', () => {
    const notes = releaseNotesFromChangelog(md, '3.0.0', { cap: 600 })!;
    expect(notes.text.length).toBeLessThanOrEqual(600);
    expect(notes.text).toMatch(/\d+ more entr(y|ies) \(.*from 2\.0\.0\) are in CHANGELOG\.md/);
    expect(notes.text).toContain('- c1:');
    expect(notes.text).not.toContain('**Delta');
  });
});

describe('what a customer reads (#2461)', () => {
  const raw = [
    '## 7.0.0',
    '',
    'Runs on ObjectStack 19.0.0. Demo data waits on objectstack#34336 (objectstack#34336).',
    '',
    '### Minor Changes',
    '',
    '- cdba71a: Clause-②: no',
    '  Metadata-protocol: none',
    '  Skills-docs: none',
    '  ',
    '  **Order to Cash is an app of its own (#2465).** Finance works there (REQ-0007, #2315).',
    '  ',
    '  Until a platform release lands (objectstack-ai/objectstack#30184, in 18.5.0), an administrator enters invoices.',
    '- 2b664f6, 35df8e9: **Totals equal their lines (#2316, phase 0),** even back to back. Totals arrive with #2416.',
    '- 41d301a: Clause-②: yes (narrowing)',
    '  Metadata-protocol: none',
    '- a75b28d: Docs guard: the test no longer asserts a locale (hotcrm#2463).',
  ].join('\n');

  it('drops the gate lines, the commit prefixes and every parenthetical reference', () => {
    expect(customerText(raw)).toBe(
      [
        '## 7.0.0',
        '',
        'Runs on ObjectStack 19.0.0. Demo data waits on a platform change.',
        '',
        '### Minor Changes',
        '',
        '- **Order to Cash is an app of its own.** Finance works there.',
        '  ',
        '  Until a platform release lands, an administrator enters invoices.',
        '- **Totals equal their lines,** even back to back. Totals arrive with #2416.',
        '- Docs guard: the test no longer asserts a locale.',
      ].join('\n'),
    );
  });

  it('keeps a HotCRM card number in running prose, and names it in the publish log', () => {
    const md = `# Changelog\n\n${raw}\n\n## 6.9.0\n\n- x\n`;
    const notes = releaseNotesFromChangelog(md, '7.0.0')!;
    expect(notes.residualRefs).toEqual(['#2416']);
    expect(describeReleaseNotes(notes)).toContain('1 card reference left in prose, for the release PR to reword: #2416');
  });

  it('applies the cap to the filtered text', () => {
    const gated = (id: string, h: string) =>
      `- ${id}: Clause-②: no\n  Metadata-protocol: none\n  \n  **${h}.** ${'Words. '.repeat(10)}`.trimEnd();
    const md = changelog(['2.0.0', '', [gated('aaaaaa1', 'One'), gated('bbbbbb2', 'Two')]], ['1.0.0', '', []]);
    const filtered = releaseNotesFromChangelog(md, '2.0.0')!;
    const cap = filtered.text.length;
    expect(md.length).toBeGreaterThan(cap);
    const notes = releaseNotesFromChangelog(md, '2.0.0', { cap })!;
    expect(notes.omitted).toBe(0);
    expect(notes.text).toBe(filtered.text);
  });

  const sixes = [...CHANGELOG.matchAll(/^## (6\.\d+\.\d+)\s*$/gm)].map((m) => m[1]);

  it.each(sixes)('%s, real CHANGELOG: no gate line, commit prefix or framework reference, every headline kept', (v) => {
    const notes = releaseNotesFromChangelog(CHANGELOG, v)!;
    for (const marker of ['Clause-②', 'Metadata-protocol', 'Skills-docs', 'objectstack#', 'objectui#']) {
      expect(notes.text, marker).not.toContain(marker);
    }
    expect(notes.text).not.toMatch(/^- [0-9a-f]{7,40}(?:, [0-9a-f]{7,40})*: /m);
    // Every parenthetical reference is gone; what is left is at most a HotCRM
    // card number in running prose, and the log names each one.
    expect(notes.text).not.toMatch(/\([^()\n]*#\d+[^()\n]*\)/);
    for (const ref of notes.text.match(/(?<![\w&#/])(?:[\w.-]+\/)?(?:[A-Za-z][\w.-]*)?#\d+\b/g) ?? []) {
      expect(notes.residualRefs).toContain(ref);
    }
    // The prose stays: each entry the text shows keeps its headline, minus its references.
    const [shown] = notes.text.split('\n\n…truncated');
    const bodies = notes.span.map((s) => sectionBody(CHANGELOG, s)).join('\n');
    expect(entriesOf(shown.replace(/^## .*$/gm, '')).length).toBeGreaterThan(0);
    const headlines = [...shown.matchAll(/^- \*\*([^*\n]+)/gm)].map((m) => m[1].split(/[.,:;(]/)[0].trim());
    for (const h of headlines) expect(bodies, h).toContain(h);
  });
});
